import { Request, Response } from "express";
import jwt from "jsonwebtoken";
import env from "../config/environment";
import { getOidcProvider, listOidcProviders, oidcCallbackUrl } from "../config/oidc";
import AuthService from "../services/AuthService";
import OidcService from "../services/OidcService";
import { Err, Succ } from "../services/globalService";

const STATE_COOKIE = "oidc_state";
const STATE_MAX_AGE = 10 * 60; // seconds
const LINK_TOKEN_MAX_AGE = 2 * 60; // seconds

const isSet = (v: string | null | undefined) => !!v && v !== "undefined" && v !== "null";
const stripSlash = (s: string) => s.replace(/\/+$/, "");

/** Absolute (or same-origin relative) url of a frontend route */
const appUrl = (path: string) => `${isSet(env.APP_HOST) ? stripSlash(env.APP_HOST) : ""}${path}`;

/** Public base url of this API, falling back to the incoming request origin */
const publicBase = (req: Request) => (isSet(env.API_PUBLIC_URL) ? stripSlash(env.API_PUBLIC_URL) : `${req.protocol}://${req.get("host")}`);

const errorCode = (err: any, fallback = "sso_failed") => (typeof err?.code === "string" && /^[a-z_]+$/.test(err.code) ? err.code : fallback);

const stateCookieOptions = (req: Request) => ({
	httpOnly: true,
	sameSite: "lax" as const,
	secure: publicBase(req).startsWith("https://"),
	path: "/api/v1/auth/oidc",
});

class OidcController {
	/**
	 * GET /auth/providers - public list of configured single sign-on providers
	 */
	static providers(_req: Request, res: Response) {
		return res.status(200).json(listOidcProviders().map((p) => ({ id: p.id, name: p.name })));
	}

	/**
	 * GET /auth/oidc/:provider/start - redirect the browser to the provider's login page
	 */
	static async start(req: Request, res: Response) {
		const provider = getOidcProvider(String(req.params.provider));
		if (!provider) {
			new Err(404, `Unknown OIDC provider ${req.params.provider}`);
			return res.redirect(appUrl("/login#error=unknown_provider"));
		}

		let linkUserId: string | undefined;
		if (typeof req.query.link === "string") {
			try {
				const decoded: any = jwt.verify(req.query.link, env.JWT_SECRET);
				if (decoded.purpose !== "oidc-link" || decoded.provider !== provider.id) throw new Error("wrong purpose");
				linkUserId = String(decoded.sub);
			} catch {
				new Err(401, `Invalid link token for ${provider.id}`);
				return res.redirect(appUrl("/settings#error=link_expired"));
			}
		}

		try {
			const authReq = await OidcService.createAuthRequest(provider, oidcCallbackUrl(provider.id, publicBase(req)));
			const state = jwt.sign(
				{ provider: provider.id, state: authReq.state, nonce: authReq.nonce, codeVerifier: authReq.codeVerifier, linkUserId },
				env.JWT_SECRET,
				{ expiresIn: STATE_MAX_AGE },
			);
			res.cookie(STATE_COOKIE, state, { ...stateCookieOptions(req), maxAge: STATE_MAX_AGE * 1000 });
			return res.redirect(authReq.url);
		} catch (err: any) {
			new Err(err.status || 502, err.message);
			return res.redirect(appUrl(`${linkUserId ? "/settings" : "/login"}#error=provider_unavailable`));
		}
	}

	/**
	 * GET /auth/oidc/:provider/callback - provider redirects back here with an authorization code
	 */
	static async callback(req: Request, res: Response) {
		const provider = getOidcProvider(String(req.params.provider));
		if (!provider) {
			new Err(404, `Unknown OIDC provider ${req.params.provider}`);
			return res.redirect(appUrl("/login#error=unknown_provider"));
		}

		const rawState = req.cookies?.[STATE_COOKIE];
		res.clearCookie(STATE_COOKIE, stateCookieOptions(req));

		let saved: any;
		try {
			saved = jwt.verify(String(rawState), env.JWT_SECRET);
			if (saved.provider !== provider.id || saved.state !== req.query.state) throw new Error("state mismatch");
		} catch {
			new Err(400, `Invalid OIDC state for ${provider.id}`);
			return res.redirect(appUrl("/login#error=invalid_state"));
		}

		const target = saved.linkUserId ? "/settings" : "/login";

		if (req.query.error) {
			const code = errorCode({ code: String(req.query.error) });
			new Err(401, `OIDC provider ${provider.id} returned error ${req.query.error}`);
			return res.redirect(appUrl(`${target}#error=${code}`));
		}

		try {
			const claims = await OidcService.exchangeCode(provider, {
				code: String(req.query.code || ""),
				codeVerifier: saved.codeVerifier,
				nonce: saved.nonce,
				redirectUri: oidcCallbackUrl(provider.id, publicBase(req)),
			});
			new Succ(200, `OIDC claims received from ${provider.id}`, claims);

			if (saved.linkUserId) {
				await AuthService.linkIdentity(saved.linkUserId, provider, claims);
				return res.redirect(appUrl(`/settings#linked=${provider.id}`));
			}

			const { token } = await AuthService.loginWithOidc(provider, claims);
			res.cookie("jwt", token, { httpOnly: true, maxAge: AuthService.jwtMaxAge * 1000 });
			res.cookie("auth", true, { httpOnly: false, maxAge: AuthService.jwtMaxAge * 1000 });
			return res.redirect(appUrl(`/auth/callback#token=${encodeURIComponent(token)}`));
		} catch (err: any) {
			new Err(err.status || 500, err.message);
			return res.redirect(appUrl(`${target}#error=${errorCode(err)}`));
		}
	}

	/**
	 * POST /auth/oidc/:provider/link - issue a short-lived token that lets the browser start a link flow
	 */
	static link(req: Request, res: Response) {
		const provider = getOidcProvider(String(req.params.provider));
		if (!provider) {
			new Err(404, `Unknown OIDC provider ${req.params.provider}`);
			return res.status(404).json({ error: "Unknown provider" });
		}
		const userId = (req as any).user.sub as string;
		const linkToken = jwt.sign({ sub: userId, purpose: "oidc-link", provider: provider.id }, env.JWT_SECRET, { expiresIn: LINK_TOKEN_MAX_AGE });
		new Succ(200, `Issued ${provider.id} link token for user ${userId}`);
		return res.status(200).json({ linkToken });
	}
}

export default OidcController;
