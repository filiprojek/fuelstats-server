import { loadOidcProviders, getOidcProvider, oidcCallbackUrl } from "../src/config/oidc";

describe("loadOidcProviders", () => {
	const base = {
		OIDC_PROVIDERS: "authelia",
		OIDC_AUTHELIA_ISSUER: "https://auth.example.com/",
		OIDC_AUTHELIA_CLIENT_ID: "fuelstats",
		OIDC_AUTHELIA_CLIENT_SECRET: "secret",
	};

	it("returns an empty list when OIDC_PROVIDERS is unset or blank", () => {
		expect(loadOidcProviders({})).toEqual([]);
		expect(loadOidcProviders({ OIDC_PROVIDERS: "  " })).toEqual([]);
	});

	it("parses a provider with defaults", () => {
		expect(loadOidcProviders(base)).toEqual([
			{
				id: "authelia",
				name: "Authelia",
				issuer: "https://auth.example.com",
				clientId: "fuelstats",
				clientSecret: "secret",
				scopes: "openid profile email",
				allowSignup: true,
			},
		]);
	});

	it("honours optional name, scopes and allow-signup overrides", () => {
		const [p] = loadOidcProviders({
			...base,
			OIDC_AUTHELIA_NAME: "Home SSO",
			OIDC_AUTHELIA_SCOPES: "openid email",
			OIDC_AUTHELIA_ALLOW_SIGNUP: "false",
		});
		expect(p).toMatchObject({ name: "Home SSO", scopes: "openid email", allowSignup: false });
	});

	it("parses multiple comma separated providers, lower-casing ids", () => {
		const providers = loadOidcProviders({
			...base,
			OIDC_PROVIDERS: "Authelia, pocket-id",
			OIDC_POCKET_ID_ISSUER: "https://id.example.com",
			OIDC_POCKET_ID_CLIENT_ID: "fs",
			OIDC_POCKET_ID_CLIENT_SECRET: "s2",
		});
		expect(providers.map((p) => p.id)).toEqual(["authelia", "pocket-id"]);
		expect(providers[1]).toMatchObject({ name: "Pocket Id", clientId: "fs" });
	});

	it("throws when a listed provider is missing required settings", () => {
		expect(() => loadOidcProviders({ OIDC_PROVIDERS: "authelia", OIDC_AUTHELIA_ISSUER: "https://a" })).toThrow(/OIDC_AUTHELIA_CLIENT_ID/);
	});

	it("throws on invalid provider ids", () => {
		expect(() => loadOidcProviders({ OIDC_PROVIDERS: "bad id!" })).toThrow(/Invalid OIDC provider id/);
	});
});

describe("getOidcProvider", () => {
	it("finds a provider by id", () => {
		const list = [{ id: "a" }, { id: "b" }] as any;
		expect(getOidcProvider("b", list)).toEqual({ id: "b" });
		expect(getOidcProvider("c", list)).toBeUndefined();
	});
});

describe("oidcCallbackUrl", () => {
	it("builds the callback url from the public base url", () => {
		expect(oidcCallbackUrl("authelia", "https://fuel.example.com/")).toBe("https://fuel.example.com/api/v1/auth/oidc/authelia/callback");
	});
});
