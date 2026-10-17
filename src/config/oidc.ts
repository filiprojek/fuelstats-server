import env from "./environment";

export interface OidcProviderConfig {
	id: string;
	name: string;
	issuer: string;
	clientId: string;
	clientSecret: string;
	scopes: string;
	allowSignup: boolean;
}

type EnvSource = Record<string, string | undefined>;

const ID_PATTERN = /^[a-z0-9][a-z0-9_-]*$/;

const envKey = (id: string) => `OIDC_${id.toUpperCase().replace(/-/g, "_")}`;

const prettyName = (id: string) =>
	id
		.split(/[-_]/)
		.filter(Boolean)
		.map((w) => w.charAt(0).toUpperCase() + w.slice(1))
		.join(" ");

/**
 * Parse OpenID Connect providers from environment variables.
 *
 * OIDC_PROVIDERS=authelia,keycloak
 * OIDC_<ID>_ISSUER, OIDC_<ID>_CLIENT_ID, OIDC_<ID>_CLIENT_SECRET (required)
 * OIDC_<ID>_NAME, OIDC_<ID>_SCOPES, OIDC_<ID>_ALLOW_SIGNUP (optional)
 */
export function loadOidcProviders(source: EnvSource): OidcProviderConfig[] {
	const list = (source.OIDC_PROVIDERS || "")
		.split(",")
		.map((s) => s.trim().toLowerCase())
		.filter(Boolean);

	return list.map((id) => {
		if (!ID_PATTERN.test(id)) {
			throw new Error(`Invalid OIDC provider id "${id}"`);
		}
		const prefix = envKey(id);
		const required = (name: string) => {
			const value = source[`${prefix}_${name}`];
			if (!value || !value.trim()) {
				throw new Error(`Missing ${prefix}_${name} for OIDC provider "${id}"`);
			}
			return value.trim();
		};

		return {
			id,
			name: source[`${prefix}_NAME`]?.trim() || prettyName(id),
			issuer: required("ISSUER").replace(/\/+$/, ""),
			clientId: required("CLIENT_ID"),
			clientSecret: required("CLIENT_SECRET"),
			scopes: source[`${prefix}_SCOPES`]?.trim() || "openid profile email",
			allowSignup: (source[`${prefix}_ALLOW_SIGNUP`] ?? "true").trim().toLowerCase() !== "false",
		};
	});
}

// `env` import guarantees the .env file was loaded before reading process.env
void env;
export const oidcProviders: OidcProviderConfig[] = loadOidcProviders(process.env);

export function listOidcProviders(): OidcProviderConfig[] {
	return oidcProviders;
}

export function getOidcProvider(id: string, providers: OidcProviderConfig[] = oidcProviders): OidcProviderConfig | undefined {
	return providers.find((p) => p.id === id);
}

export function oidcCallbackUrl(providerId: string, baseUrl: string = env.API_PUBLIC_URL): string {
	return `${baseUrl.replace(/\/+$/, "")}/api/v1/auth/oidc/${providerId}/callback`;
}
