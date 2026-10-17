import crypto from "crypto";
import jwt from "jsonwebtoken";
import OidcService from "../src/services/OidcService";
import { OidcProviderConfig } from "../src/config/oidc";

const provider: OidcProviderConfig = {
	id: "authelia",
	name: "Authelia",
	issuer: "https://auth.example.com",
	clientId: "fuelstats",
	clientSecret: "s3cret",
	scopes: "openid profile email",
	allowSignup: true,
};

const discovery = {
	issuer: "https://auth.example.com",
	authorization_endpoint: "https://auth.example.com/api/oidc/authorization",
	token_endpoint: "https://auth.example.com/api/oidc/token",
	userinfo_endpoint: "https://auth.example.com/api/oidc/userinfo",
};

const redirectUri = "https://fuel.example.com/api/v1/auth/oidc/authelia/callback";

const jsonResponse = (body: any, status = 200) => ({ ok: status >= 200 && status < 300, status, json: async () => body }) as any;

const idToken = (claims: Record<string, any> = {}) =>
	jwt.sign(
		{
			iss: discovery.issuer,
			aud: provider.clientId,
			sub: "user-sub",
			nonce: "nonce-1",
			email: "john@example.com",
			email_verified: true,
			preferred_username: "john",
			name: "John Doe",
			...claims,
		},
		"irrelevant-signing-key",
		{ expiresIn: 300 },
	);

describe("OidcService", () => {
	let fetchMock: jest.Mock;

	beforeEach(() => {
		OidcService.clearCache();
		fetchMock = jest.fn();
		(global as any).fetch = fetchMock;
	});

	describe("getDiscovery", () => {
		it("fetches and caches the discovery document", async () => {
			fetchMock.mockResolvedValue(jsonResponse(discovery));
			await expect(OidcService.getDiscovery(provider)).resolves.toEqual(discovery);
			await OidcService.getDiscovery(provider);
			expect(fetchMock).toHaveBeenCalledTimes(1);
			expect(fetchMock).toHaveBeenCalledWith("https://auth.example.com/.well-known/openid-configuration", expect.anything());
		});

		it("throws 502 when the provider is unreachable", async () => {
			fetchMock.mockResolvedValue(jsonResponse({}, 500));
			await expect(OidcService.getDiscovery(provider)).rejects.toMatchObject({ status: 502 });
		});

		it("throws 502 when fetch rejects", async () => {
			fetchMock.mockRejectedValue(new Error("ECONNREFUSED"));
			await expect(OidcService.getDiscovery(provider)).rejects.toMatchObject({ status: 502 });
		});
	});

	describe("createAuthRequest", () => {
		it("builds an authorization url with PKCE S256, state and nonce", async () => {
			fetchMock.mockResolvedValue(jsonResponse(discovery));
			const req = await OidcService.createAuthRequest(provider, redirectUri);
			const url = new URL(req.url);

			expect(`${url.origin}${url.pathname}`).toBe(discovery.authorization_endpoint);
			expect(url.searchParams.get("response_type")).toBe("code");
			expect(url.searchParams.get("client_id")).toBe("fuelstats");
			expect(url.searchParams.get("redirect_uri")).toBe(redirectUri);
			expect(url.searchParams.get("scope")).toBe("openid profile email");
			expect(url.searchParams.get("state")).toBe(req.state);
			expect(url.searchParams.get("nonce")).toBe(req.nonce);
			expect(url.searchParams.get("code_challenge_method")).toBe("S256");
			const expectedChallenge = crypto.createHash("sha256").update(req.codeVerifier).digest("base64url");
			expect(url.searchParams.get("code_challenge")).toBe(expectedChallenge);
			expect(req.state.length).toBeGreaterThanOrEqual(32);
			expect(req.codeVerifier.length).toBeGreaterThanOrEqual(43);
		});

		it("generates fresh random values each time", async () => {
			fetchMock.mockResolvedValue(jsonResponse(discovery));
			const a = await OidcService.createAuthRequest(provider, redirectUri);
			const b = await OidcService.createAuthRequest(provider, redirectUri);
			expect(a.state).not.toBe(b.state);
			expect(a.nonce).not.toBe(b.nonce);
			expect(a.codeVerifier).not.toBe(b.codeVerifier);
		});
	});

	describe("exchangeCode", () => {
		const params = { code: "abc", codeVerifier: "verifier", nonce: "nonce-1", redirectUri };

		const mockFlow = (tokenBody: any, userinfo?: any) => {
			fetchMock.mockImplementation(async (url: string) => {
				if (url.endsWith("/.well-known/openid-configuration")) return jsonResponse(discovery);
				if (url === discovery.token_endpoint) return jsonResponse(tokenBody);
				if (url === discovery.userinfo_endpoint) return userinfo ? jsonResponse(userinfo) : jsonResponse({}, 500);
				throw new Error(`unexpected ${url}`);
			});
		};

		it("posts the code with client_secret_basic and returns normalized claims", async () => {
			mockFlow({ id_token: idToken(), access_token: "at" }, { sub: "user-sub", email: "john@example.com", email_verified: true });
			const claims = await OidcService.exchangeCode(provider, params);

			expect(claims).toEqual({
				sub: "user-sub",
				email: "john@example.com",
				email_verified: true,
				preferred_username: "john",
				name: "John Doe",
			});

			const [, init] = fetchMock.mock.calls.find(([u]) => u === discovery.token_endpoint);
			expect(init.method).toBe("POST");
			expect(init.headers.Authorization).toBe(`Basic ${Buffer.from("fuelstats:s3cret").toString("base64")}`);
			const body = new URLSearchParams(init.body);
			expect(body.get("grant_type")).toBe("authorization_code");
			expect(body.get("code")).toBe("abc");
			expect(body.get("code_verifier")).toBe("verifier");
			expect(body.get("redirect_uri")).toBe(redirectUri);
		});

		it("uses client_secret_post when the provider only supports it", async () => {
			OidcService.clearCache();
			fetchMock.mockImplementation(async (url: string) => {
				if (url.endsWith("/.well-known/openid-configuration")) return jsonResponse({ ...discovery, userinfo_endpoint: undefined, token_endpoint_auth_methods_supported: ["client_secret_post"] });
				return jsonResponse({ id_token: idToken() });
			});
			await OidcService.exchangeCode(provider, params);
			const [, init] = fetchMock.mock.calls.find(([u]) => u === discovery.token_endpoint);
			const body = new URLSearchParams(init.body);
			expect(init.headers.Authorization).toBeUndefined();
			expect(body.get("client_id")).toBe("fuelstats");
			expect(body.get("client_secret")).toBe("s3cret");
		});

		it("merges userinfo claims over id token claims", async () => {
			mockFlow({ id_token: idToken({ email: undefined, email_verified: undefined }), access_token: "at" }, { sub: "user-sub", email: "Info@Example.com", email_verified: "true" });
			const claims = await OidcService.exchangeCode(provider, params);
			expect(claims.email).toBe("Info@Example.com");
			expect(claims.email_verified).toBe(true);
		});

		it("ignores userinfo with a different subject", async () => {
			mockFlow({ id_token: idToken(), access_token: "at" }, { sub: "other", email: "evil@example.com" });
			const claims = await OidcService.exchangeCode(provider, params);
			expect(claims.email).toBe("john@example.com");
		});

		it("treats a missing email_verified as false", async () => {
			mockFlow({ id_token: idToken({ email_verified: undefined }) });
			const claims = await OidcService.exchangeCode(provider, params);
			expect(claims.email_verified).toBe(false);
		});

		it("throws 502 when the token endpoint fails", async () => {
			mockFlow({ error: "invalid_grant" });
			fetchMock.mockImplementation(async (url: string) => (url === discovery.token_endpoint ? jsonResponse({ error: "invalid_grant" }, 400) : jsonResponse(discovery)));
			await expect(OidcService.exchangeCode(provider, params)).rejects.toMatchObject({ status: 502 });
		});

		it("throws 401 when no id_token is returned", async () => {
			mockFlow({ access_token: "at" });
			await expect(OidcService.exchangeCode(provider, params)).rejects.toMatchObject({ status: 401 });
		});

		it.each([
			["issuer", { iss: "https://evil.example.com" }],
			["audience", { aud: "someone-else" }],
			["nonce", { nonce: "other" }],
			["expiry", { exp: Math.floor(Date.now() / 1000) - 60 }],
			["subject", { sub: undefined }],
		])("rejects an id token with a wrong %s", async (_label, claims) => {
			const token =
				"exp" in claims
					? jwt.sign({ iss: discovery.issuer, aud: provider.clientId, sub: "s", nonce: "nonce-1", ...claims }, "k")
					: idToken(claims);
			mockFlow({ id_token: token });
			await expect(OidcService.exchangeCode(provider, params)).rejects.toMatchObject({ status: 401 });
		});

		it("accepts an audience array containing the client id with matching azp", async () => {
			mockFlow({ id_token: idToken({ aud: ["fuelstats", "other"], azp: "fuelstats" }) });
			await expect(OidcService.exchangeCode(provider, params)).resolves.toMatchObject({ sub: "user-sub" });
		});

		it("rejects an audience array with a foreign azp", async () => {
			mockFlow({ id_token: idToken({ aud: ["fuelstats", "other"], azp: "other" }) });
			await expect(OidcService.exchangeCode(provider, params)).rejects.toMatchObject({ status: 401 });
		});

		it("tolerates a trailing slash difference in the issuer", async () => {
			mockFlow({ id_token: idToken({ iss: "https://auth.example.com/" }) });
			await expect(OidcService.exchangeCode(provider, params)).resolves.toMatchObject({ sub: "user-sub" });
		});
	});
});
