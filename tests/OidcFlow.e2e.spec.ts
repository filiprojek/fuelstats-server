import http from "http";
import crypto from "crypto";
import express from "express";
import request from "supertest";
import jwt from "jsonwebtoken";
import type { AddressInfo } from "net";

/**
 * End-to-end OIDC flow against a fake provider over real HTTP:
 * start -> provider authorize -> callback -> token + userinfo -> Fuelstats session.
 */
describe("OIDC sign-in flow (e2e with fake provider)", () => {
	let idp: http.Server;
	let issuer: string;
	let app: express.Express;
	let User: any;
	let env: any;
	const pending = new Map<string, { nonce: string; challenge: string; redirectUri: string }>();
	const tokenRequests: URLSearchParams[] = [];

	beforeAll(async () => {
		const provider = express();
		provider.use(express.urlencoded({ extended: false }));
		provider.get("/.well-known/openid-configuration", (_req, res) => {
			res.json({
				issuer,
				authorization_endpoint: `${issuer}/authorize`,
				token_endpoint: `${issuer}/token`,
				userinfo_endpoint: `${issuer}/userinfo`,
			});
		});
		provider.post("/token", (req, res) => {
			const body = new URLSearchParams(req.body);
			tokenRequests.push(body);
			const auth = Buffer.from(String(req.headers.authorization).replace("Basic ", ""), "base64").toString();
			const entry = pending.get(String(body.get("code")));
			const verifierOk = entry && crypto.createHash("sha256").update(String(body.get("code_verifier"))).digest("base64url") === entry.challenge;
			if (auth !== "fuelstats:s3cret" || !entry || !verifierOk || body.get("redirect_uri") !== entry.redirectUri) {
				return res.status(400).json({ error: "invalid_grant" });
			}
			const idToken = jwt.sign({ iss: issuer, aud: "fuelstats", sub: "alice-sub", nonce: entry.nonce, email: "alice@example.com", email_verified: true, preferred_username: "alice" }, "idp-private", { expiresIn: 60 });
			res.json({ id_token: idToken, access_token: "at-1", token_type: "Bearer" });
		});
		provider.get("/userinfo", (req, res) => {
			if (req.headers.authorization !== "Bearer at-1") return res.status(401).end();
			res.json({ sub: "alice-sub", name: "Alice Doe" });
		});

		idp = provider.listen(0);
		await new Promise((r) => idp.once("listening", r));
		issuer = `http://127.0.0.1:${(idp.address() as AddressInfo).port}`;

		process.env.OIDC_PROVIDERS = "fake";
		process.env.OIDC_FAKE_ISSUER = issuer;
		process.env.OIDC_FAKE_CLIENT_ID = "fuelstats";
		process.env.OIDC_FAKE_CLIENT_SECRET = "s3cret";
		process.env.OIDC_FAKE_NAME = "Fake SSO";

		// load after env is prepared so the provider list picks it up
		jest.isolateModules(() => {
			app = require("../src/app").app;
			User = require("../src/models/User").default;
			env = require("../src/config/environment").default;
		});
		env.APP_HOST = "https://fuel.example.com";
		env.API_PUBLIC_URL = "https://fuel.example.com";
	});

	afterAll(async () => {
		await new Promise((r) => idp.close(r));
		for (const k of ["OIDC_PROVIDERS", "OIDC_FAKE_ISSUER", "OIDC_FAKE_CLIENT_ID", "OIDC_FAKE_CLIENT_SECRET", "OIDC_FAKE_NAME"]) delete process.env[k];
	});

	afterEach(() => jest.restoreAllMocks());

	async function signIn() {
		const start = await request(app).get("/api/v1/auth/oidc/fake/start");
		expect(start.status).toBe(302);
		const authorize = new URL(start.headers.location);
		expect(authorize.origin + authorize.pathname).toBe(`${issuer}/authorize`);

		// the "user" signs in at the provider, which redirects back with a code
		const code = crypto.randomUUID();
		pending.set(code, {
			nonce: authorize.searchParams.get("nonce")!,
			challenge: authorize.searchParams.get("code_challenge")!,
			redirectUri: authorize.searchParams.get("redirect_uri")!,
		});
		const cookie = ([] as string[]).concat(start.headers["set-cookie"] as any).map((c) => c.split(";")[0]).join("; ");
		const callbackPath = new URL(authorize.searchParams.get("redirect_uri")!).pathname;
		return request(app).get(`${callbackPath}?code=${code}&state=${authorize.searchParams.get("state")}`).set("Cookie", cookie);
	}

	it("lists the provider", async () => {
		const res = await request(app).get("/api/v1/auth/providers");
		expect(res.body).toEqual([{ id: "fake", name: "Fake SSO" }]);
	});

	it("auto-links an existing account by verified email and issues a session", async () => {
		const existing = { id: "user-1", email: "alice@example.com", identities: [] as any[], save: jest.fn().mockResolvedValue(true) };
		jest.spyOn(User, "findOne").mockResolvedValueOnce(null).mockResolvedValueOnce(existing);

		const res = await signIn();

		expect(res.status).toBe(302);
		const location = new URL(res.headers.location);
		expect(location.origin + location.pathname).toBe("https://fuel.example.com/auth/callback");
		const token = decodeURIComponent(location.hash.replace("#token=", ""));
		expect((jwt.verify(token, env.JWT_SECRET) as any).sub).toBe("user-1");
		expect(existing.identities).toEqual([expect.objectContaining({ provider: "fake", subject: "alice-sub", email: "alice@example.com" })]);
		expect(tokenRequests[tokenRequests.length - 1]?.get("redirect_uri")).toBe("https://fuel.example.com/api/v1/auth/oidc/fake/callback");
	});

	it("creates a new account named from the provider claims", async () => {
		jest.spyOn(User, "findOne").mockResolvedValue(null);
		const save = jest.spyOn(User.prototype, "save").mockImplementation(function (this: any) {
			return Promise.resolve(this);
		});

		const res = await signIn();

		expect(res.headers.location).toMatch(/^https:\/\/fuel\.example\.com\/auth\/callback#token=/);
		const created: any = save.mock.contexts[0];
		expect(created).toMatchObject({ email: "alice@example.com", username: "alice" });
		expect(created.password).toBeUndefined();
	});

	it("rejects a replayed callback (state cookie is single use)", async () => {
		jest.spyOn(User, "findOne").mockResolvedValue({ id: "user-1", email: "alice@example.com", identities: [{ provider: "fake", subject: "alice-sub" }] });
		const first = await signIn();
		expect(first.headers.location).toContain("#token=");
		const cleared = ([] as string[]).concat(first.headers["set-cookie"] as any).find((c) => c.startsWith("oidc_state="));
		expect(cleared).toMatch(/^oidc_state=;/);
	});
});
