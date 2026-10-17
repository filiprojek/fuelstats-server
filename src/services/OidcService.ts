import crypto from "crypto";
import jwt from "jsonwebtoken";
import { OidcProviderConfig } from "../config/oidc";
import { Err } from "./globalService";

export interface OidcDiscovery {
	issuer: string;
	authorization_endpoint: string;
	token_endpoint: string;
	userinfo_endpoint?: string;
	token_endpoint_auth_methods_supported?: string[];
}

export interface OidcAuthRequest {
	url: string;
	state: string;
	nonce: string;
	codeVerifier: string;
}

export interface OidcClaims {
	sub: string;
	email?: string;
	email_verified: boolean;
	preferred_username?: string;
	name?: string;
}

const fail = (status: number, message: string, data?: any): never => {
	const error: any = new Error(message);
	error.status = status;
	new Err(status, message, data);
	throw error;
};

const randomToken = (bytes = 32) => crypto.randomBytes(bytes).toString("base64url");
const stripSlash = (s: string) => s.replace(/\/+$/, "");
const asBool = (v: unknown) => v === true || v === "true";

/**
 * Minimal OpenID Connect relying party: discovery, authorization code flow with PKCE.
 *
 * The ID token is received directly from the token endpoint over TLS, so per
 * OIDC Core 3.1.3.7 its signature check is replaced by TLS server validation;
 * iss, aud, azp, exp and nonce are still verified.
 */
class OidcService {
	private static discoveryCache = new Map<string, OidcDiscovery>();

	static clearCache() {
		this.discoveryCache.clear();
	}

	static async getDiscovery(provider: OidcProviderConfig): Promise<OidcDiscovery> {
		const cached = this.discoveryCache.get(provider.issuer);
		if (cached) return cached;

		const url = `${provider.issuer}/.well-known/openid-configuration`;
		let res: Response;
		try {
			res = await fetch(url, { headers: { Accept: "application/json" } });
		} catch (err: any) {
			return fail(502, `OIDC provider ${provider.id} is unreachable`, { url, error: err?.message });
		}
		if (!res.ok) {
			return fail(502, `OIDC discovery failed for ${provider.id}`, { url, status: res.status });
		}
		const doc = (await res.json()) as OidcDiscovery;
		this.discoveryCache.set(provider.issuer, doc);
		return doc;
	}

	static async createAuthRequest(provider: OidcProviderConfig, redirectUri: string): Promise<OidcAuthRequest> {
		const discovery = await this.getDiscovery(provider);
		const state = randomToken();
		const nonce = randomToken();
		const codeVerifier = randomToken(48);
		const codeChallenge = crypto.createHash("sha256").update(codeVerifier).digest("base64url");

		const url = new URL(discovery.authorization_endpoint);
		url.searchParams.set("response_type", "code");
		url.searchParams.set("client_id", provider.clientId);
		url.searchParams.set("redirect_uri", redirectUri);
		url.searchParams.set("scope", provider.scopes);
		url.searchParams.set("state", state);
		url.searchParams.set("nonce", nonce);
		url.searchParams.set("code_challenge", codeChallenge);
		url.searchParams.set("code_challenge_method", "S256");

		return { url: url.toString(), state, nonce, codeVerifier };
	}

	static async exchangeCode(
		provider: OidcProviderConfig,
		params: { code: string; codeVerifier: string; nonce: string; redirectUri: string },
	): Promise<OidcClaims> {
		const discovery = await this.getDiscovery(provider);

		const body = new URLSearchParams({
			grant_type: "authorization_code",
			code: params.code,
			redirect_uri: params.redirectUri,
			code_verifier: params.codeVerifier,
		});
		const headers: Record<string, string> = {
			"Content-Type": "application/x-www-form-urlencoded",
			Accept: "application/json",
		};
		const methods = discovery.token_endpoint_auth_methods_supported;
		if (methods && !methods.includes("client_secret_basic") && methods.includes("client_secret_post")) {
			body.set("client_id", provider.clientId);
			body.set("client_secret", provider.clientSecret);
		} else {
			const credentials = `${encodeURIComponent(provider.clientId)}:${encodeURIComponent(provider.clientSecret)}`;
			headers.Authorization = `Basic ${Buffer.from(credentials).toString("base64")}`;
		}

		let tokenRes: Response;
		try {
			tokenRes = await fetch(discovery.token_endpoint, { method: "POST", headers, body: body.toString() });
		} catch (err: any) {
			return fail(502, `OIDC token request failed for ${provider.id}`, { error: err?.message });
		}
		const tokens: any = await tokenRes.json().catch(() => ({}));
		if (!tokenRes.ok) {
			return fail(502, `OIDC token request failed for ${provider.id}`, { status: tokenRes.status, error: tokens?.error });
		}
		if (!tokens.id_token) {
			return fail(401, `OIDC provider ${provider.id} returned no id_token`);
		}

		const idClaims = this.validateIdToken(provider, discovery, tokens.id_token, params.nonce);

		let userinfo: any = {};
		if (discovery.userinfo_endpoint && tokens.access_token) {
			try {
				const res = await fetch(discovery.userinfo_endpoint, {
					headers: { Authorization: `Bearer ${tokens.access_token}`, Accept: "application/json" },
				});
				if (res.ok) {
					const info: any = await res.json();
					if (info?.sub === idClaims.sub) userinfo = info;
				}
			} catch {
				// userinfo is optional; fall back to id token claims
			}
		}

		const merged = { ...idClaims, ...Object.fromEntries(Object.entries(userinfo).filter(([, v]) => v !== undefined && v !== null)) };
		return {
			sub: String(idClaims.sub),
			email: merged.email || undefined,
			email_verified: asBool(merged.email_verified),
			preferred_username: merged.preferred_username || undefined,
			name: merged.name || undefined,
		};
	}

	private static validateIdToken(provider: OidcProviderConfig, discovery: OidcDiscovery, idToken: string, nonce: string): any {
		const claims: any = jwt.decode(idToken);
		const invalid = (reason: string) => fail(401, `Invalid id_token from ${provider.id}: ${reason}`);

		if (!claims || typeof claims !== "object") return invalid("malformed");
		if (stripSlash(String(claims.iss || "")) !== stripSlash(discovery.issuer)) return invalid("issuer mismatch");

		const aud: string[] = Array.isArray(claims.aud) ? claims.aud : [claims.aud];
		if (!aud.includes(provider.clientId)) return invalid("audience mismatch");
		if (claims.azp !== undefined && claims.azp !== provider.clientId) return invalid("azp mismatch");

		if (typeof claims.exp !== "number" || claims.exp * 1000 < Date.now()) return invalid("expired");
		if (claims.nonce !== nonce) return invalid("nonce mismatch");
		if (!claims.sub) return invalid("missing subject");
		return claims;
	}
}

export default OidcService;
