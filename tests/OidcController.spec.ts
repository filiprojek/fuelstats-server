import express from "express";
import cookieParser from "cookie-parser";
import request from "supertest";
import jwt from "jsonwebtoken";
import env from "../src/config/environment";
import AuthService from "../src/services/AuthService";
import OidcService from "../src/services/OidcService";

const provider = {
	id: "authelia",
	name: "Authelia",
	issuer: "https://auth.example.com",
	clientId: "fuelstats",
	clientSecret: "secret",
	scopes: "openid profile email",
	allowSignup: true,
};

jest.mock("../src/config/oidc", () => {
	const actual = jest.requireActual("../src/config/oidc");
	return {
		...actual,
		listOidcProviders: () => [provider],
		getOidcProvider: (id: string) => (id === "authelia" ? provider : undefined),
	};
});
jest.mock("../src/services/AuthService");
jest.mock("../src/services/OidcService");

// imported after mocks
import AuthRoutes from "../src/routes/AuthRoutes";

const APP = "https://fuel.example.com";
const app = express();
app.use(cookieParser());
app.use(express.json());
app.use("/api/v1/auth", AuthRoutes);

const stateCookie = (payload: Record<string, any>, secret = env.JWT_SECRET) =>
	`oidc_state=${jwt.sign({ provider: "authelia", state: "st", nonce: "nn", codeVerifier: "cv", ...payload }, secret, { expiresIn: 600 })}`;

const cookiesOf = (res: request.Response): string[] => ([] as string[]).concat((res.headers["set-cookie"] as any) || []);

describe("OidcController", () => {
	const originalAppHost = env.APP_HOST;
	const originalPublic = env.API_PUBLIC_URL;

	beforeEach(() => {
		jest.resetAllMocks();
		(env as any).APP_HOST = APP;
		(env as any).API_PUBLIC_URL = APP;
	});

	afterAll(() => {
		(env as any).APP_HOST = originalAppHost;
		(env as any).API_PUBLIC_URL = originalPublic;
	});

	describe("GET /providers", () => {
		it("lists configured providers without secrets", async () => {
			const res = await request(app).get("/api/v1/auth/providers");
			expect(res.status).toBe(200);
			expect(res.body).toEqual([{ id: "authelia", name: "Authelia" }]);
		});
	});

	describe("GET /oidc/:provider/start", () => {
		it("redirects to the provider and stores a signed state cookie", async () => {
			(OidcService.createAuthRequest as jest.Mock).mockResolvedValue({ url: "https://auth.example.com/authorize?x=1", state: "st", nonce: "nn", codeVerifier: "cv" });

			const res = await request(app).get("/api/v1/auth/oidc/authelia/start");

			expect(res.status).toBe(302);
			expect(res.headers.location).toBe("https://auth.example.com/authorize?x=1");
			expect(OidcService.createAuthRequest).toHaveBeenCalledWith(provider, `${APP}/api/v1/auth/oidc/authelia/callback`);

			const cookie = cookiesOf(res).find((c) => c.startsWith("oidc_state="))!;
			expect(cookie).toMatch(/HttpOnly/);
			expect(cookie).toMatch(/SameSite=Lax/);
			expect(cookie).toMatch(/Path=\/api\/v1\/auth\/oidc/);
			expect(cookie).toMatch(/Secure/);
			const payload: any = jwt.verify(decodeURIComponent(cookie.split(";")[0].split("=")[1]), env.JWT_SECRET);
			expect(payload).toMatchObject({ provider: "authelia", state: "st", nonce: "nn", codeVerifier: "cv" });
			expect(payload.linkUserId).toBeUndefined();
		});

		it("falls back to the request origin when no public url is configured", async () => {
			(env as any).API_PUBLIC_URL = "";
			(OidcService.createAuthRequest as jest.Mock).mockResolvedValue({ url: "https://idp/authorize", state: "s", nonce: "n", codeVerifier: "c" });
			const res = await request(app).get("/api/v1/auth/oidc/authelia/start");
			const [, redirectUri] = (OidcService.createAuthRequest as jest.Mock).mock.calls[0];
			expect(redirectUri).toMatch(/^http:\/\/127\.0\.0\.1:\d+\/api\/v1\/auth\/oidc\/authelia\/callback$/);
			expect(cookiesOf(res).find((c) => c.startsWith("oidc_state="))).not.toMatch(/Secure/);
		});

		it("redirects to login with an error for unknown providers", async () => {
			const res = await request(app).get("/api/v1/auth/oidc/nope/start");
			expect(res.status).toBe(302);
			expect(res.headers.location).toBe(`${APP}/login#error=unknown_provider`);
		});

		it("redirects to login when the provider is unavailable", async () => {
			(OidcService.createAuthRequest as jest.Mock).mockRejectedValue(Object.assign(new Error("down"), { status: 502 }));
			const res = await request(app).get("/api/v1/auth/oidc/authelia/start");
			expect(res.headers.location).toBe(`${APP}/login#error=provider_unavailable`);
		});

		it("carries the user id of a valid link token into the state", async () => {
			(OidcService.createAuthRequest as jest.Mock).mockResolvedValue({ url: "https://idp/authorize", state: "s", nonce: "n", codeVerifier: "c" });
			const link = jwt.sign({ sub: "u1", purpose: "oidc-link", provider: "authelia" }, env.JWT_SECRET, { expiresIn: 60 });

			const res = await request(app).get(`/api/v1/auth/oidc/authelia/start?link=${link}`);

			const cookie = cookiesOf(res).find((c) => c.startsWith("oidc_state="))!;
			const payload: any = jwt.verify(decodeURIComponent(cookie.split(";")[0].split("=")[1]), env.JWT_SECRET);
			expect(payload.linkUserId).toBe("u1");
		});

		it.each([
			["a session token", { sub: "u1", email: "a@b.com" }],
			["a token for another provider", { sub: "u1", purpose: "oidc-link", provider: "other" }],
		])("rejects %s as link token", async (_label, claims) => {
			const link = jwt.sign(claims, env.JWT_SECRET, { expiresIn: 60 });
			const res = await request(app).get(`/api/v1/auth/oidc/authelia/start?link=${link}`);
			expect(res.headers.location).toBe(`${APP}/settings#error=link_expired`);
			expect(OidcService.createAuthRequest).not.toHaveBeenCalled();
		});
	});

	describe("GET /oidc/:provider/callback", () => {
		const claims = { sub: "sub-1", email: "a@b.com", email_verified: true };

		it("logs the user in, sets session cookies and redirects to the app with the token", async () => {
			(OidcService.exchangeCode as jest.Mock).mockResolvedValue(claims);
			(AuthService.loginWithOidc as jest.Mock).mockResolvedValue({ token: "tok", userId: "u1", created: false, linked: true });

			const res = await request(app).get("/api/v1/auth/oidc/authelia/callback?code=abc&state=st").set("Cookie", stateCookie({}));

			expect(OidcService.exchangeCode).toHaveBeenCalledWith(provider, {
				code: "abc",
				codeVerifier: "cv",
				nonce: "nn",
				redirectUri: `${APP}/api/v1/auth/oidc/authelia/callback`,
			});
			expect(AuthService.loginWithOidc).toHaveBeenCalledWith(provider, claims);
			expect(res.status).toBe(302);
			expect(res.headers.location).toBe(`${APP}/auth/callback#token=tok`);
			const cookies = cookiesOf(res);
			expect(cookies.some((c) => c.startsWith("jwt=tok") && /HttpOnly/.test(c))).toBe(true);
			expect(cookies.some((c) => c.startsWith("auth=true"))).toBe(true);
			expect(cookies.some((c) => c.startsWith("oidc_state=;"))).toBe(true);
		});

		it("links the identity when the state belongs to a link request", async () => {
			(OidcService.exchangeCode as jest.Mock).mockResolvedValue(claims);
			(AuthService.linkIdentity as jest.Mock).mockResolvedValue(undefined);

			const res = await request(app).get("/api/v1/auth/oidc/authelia/callback?code=abc&state=st").set("Cookie", stateCookie({ linkUserId: "u1" }));

			expect(AuthService.linkIdentity).toHaveBeenCalledWith("u1", provider, claims);
			expect(AuthService.loginWithOidc).not.toHaveBeenCalled();
			expect(res.headers.location).toBe(`${APP}/settings#linked=authelia`);
		});

		it("reports link errors back to settings", async () => {
			(OidcService.exchangeCode as jest.Mock).mockResolvedValue(claims);
			(AuthService.linkIdentity as jest.Mock).mockRejectedValue(Object.assign(new Error("in use"), { status: 409, code: "identity_in_use" }));
			const res = await request(app).get("/api/v1/auth/oidc/authelia/callback?code=abc&state=st").set("Cookie", stateCookie({ linkUserId: "u1" }));
			expect(res.headers.location).toBe(`${APP}/settings#error=identity_in_use`);
		});

		it("reports login errors back to the login page", async () => {
			(OidcService.exchangeCode as jest.Mock).mockResolvedValue(claims);
			(AuthService.loginWithOidc as jest.Mock).mockRejectedValue(Object.assign(new Error("x"), { status: 409, code: "account_exists_unverified" }));
			const res = await request(app).get("/api/v1/auth/oidc/authelia/callback?code=abc&state=st").set("Cookie", stateCookie({}));
			expect(res.headers.location).toBe(`${APP}/login#error=account_exists_unverified`);
		});

		it("uses a generic error code for unexpected failures", async () => {
			(OidcService.exchangeCode as jest.Mock).mockRejectedValue(new Error("boom"));
			const res = await request(app).get("/api/v1/auth/oidc/authelia/callback?code=abc&state=st").set("Cookie", stateCookie({}));
			expect(res.headers.location).toBe(`${APP}/login#error=sso_failed`);
		});

		it.each([
			["missing state cookie", undefined, "st"],
			["state mismatch", stateCookie({}), "other"],
			["state for another provider", stateCookie({ provider: "other" }), "st"],
			["forged state cookie", stateCookie({}, "not-the-secret"), "st"],
		])("rejects a %s", async (_label, cookie, state) => {
			let req = request(app).get(`/api/v1/auth/oidc/authelia/callback?code=abc&state=${state}`);
			if (cookie) req = req.set("Cookie", cookie);
			const res = await req;
			expect(res.headers.location).toBe(`${APP}/login#error=invalid_state`);
			expect(OidcService.exchangeCode).not.toHaveBeenCalled();
		});

		it("forwards a provider error such as access_denied", async () => {
			const res = await request(app).get("/api/v1/auth/oidc/authelia/callback?error=access_denied&state=st").set("Cookie", stateCookie({}));
			expect(res.headers.location).toBe(`${APP}/login#error=access_denied`);
		});

		it("sanitizes provider error codes", async () => {
			const res = await request(app).get("/api/v1/auth/oidc/authelia/callback?error=%3Cscript%3E&state=st").set("Cookie", stateCookie({}));
			expect(res.headers.location).toBe(`${APP}/login#error=sso_failed`);
		});

		it("redirects relative to the current origin when APP_HOST is not configured", async () => {
			(env as any).APP_HOST = "undefined";
			const res = await request(app).get("/api/v1/auth/oidc/nope/callback");
			expect(res.headers.location).toBe("/login#error=unknown_provider");
		});
	});

	describe("POST /oidc/:provider/link", () => {
		const session = () => jwt.sign({ sub: "u1", email: "a@b.com" }, env.JWT_SECRET, { expiresIn: 60 });

		it("requires authentication", async () => {
			const res = await request(app).post("/api/v1/auth/oidc/authelia/link");
			expect(res.status).toBe(401);
		});

		it("returns a short-lived link token for the current user", async () => {
			const res = await request(app).post("/api/v1/auth/oidc/authelia/link").set("Authorization", `Bearer ${session()}`);
			expect(res.status).toBe(200);
			const decoded: any = jwt.verify(res.body.linkToken, env.JWT_SECRET);
			expect(decoded).toMatchObject({ sub: "u1", purpose: "oidc-link", provider: "authelia" });
			expect(decoded.exp - decoded.iat).toBeLessThanOrEqual(300);
		});

		it("returns 404 for unknown providers", async () => {
			const res = await request(app).post("/api/v1/auth/oidc/nope/link").set("Authorization", `Bearer ${session()}`);
			expect(res.status).toBe(404);
		});
	});
});
