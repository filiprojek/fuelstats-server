# FuelStats Server

A TypeScript backend for Fuel Stats, exposing a RESTful API used by the Android client.

## Features

- Express.js server bootstrap
- Type-safe request/response handling
- MVC-inspired folder structure
- Integrated testing (Jest)
- Biome for formatting & linting
- Email/password accounts plus **single sign-on** through Authelia or any other OpenID Connect provider (same account, both ways)
- Docker Compose setup with MongoDB + Mongo Express
- Runs on **Node.js** (dev) or **Bun** (prod)

## Prerequisites

- [Node.js](https://nodejs.org) (for local development)
- [Bun](https://bun.sh) (optional, used in production hosting)
- Docker & Docker Compose (for containerized setup)
- MongoDB (if running without Docker)

---

## Getting Started

### 1. Clone the repo
```bash
git clone https://github.com/filiprojek/fuelstats-server.git
cd fuelstats-server
````

### 2. Install dependencies

Using **npm** (Node.js):

```bash
npm install
```

Or using **Bun**:

```bash
bun install
```

### 3. Configure environment

* Copy `src/.env.example` → `.env.production` and fill in your settings:

  ```dotenv
  APP_PORT=6060
  APP_HOST=https://fuel.example.com   # public URL of the frontend
  DB_URI=mongodb://username:password@mongodb:27017/fuelstats?authSource=admin
  JWT_SECRET=changeme
  ```
* ⚠️ `.env.production` **must exist before running Docker**. If missing, Docker will create a directory instead of a file.

---

## Running

### Development (Node.js)

```bash
npm run start:dev
```

Server listens on `http://localhost:<PORT>`.

### Build & run (Node.js)

```bash
npm run build
npm start
```

### Build & run (Bun)

```bash
bun run build
bun run start
```

### Run tests

```bash
npm test
```

(or `bun test` if you prefer Bun)

---

## Running with Docker Compose

The repo ships with a `docker-compose.yaml` that sets up:

* **MongoDB** (`mongodb://username:password@mongodb:27017/`)
* **Mongo Express** (accessible at `http://localhost:8091`)
* **FuelStats server** (listens on `http://localhost:6060`)

### Usage

```bash
docker compose up -d --build
```

### Environment

* Secrets like `DB_URI` are injected from `.env.production` (mounted into the container).
* Logs are written to `dist/logs/` — you can mount this to the host if you want persistence.

---

## Authentication & Single Sign-On

Fuelstats always supports **email + password** accounts. In addition, any number of
**OpenID Connect (OIDC)** providers can be enabled – for example
[Authelia](https://www.authelia.com), Authentik, Keycloak, Pocket ID, Zitadel or Google.
When at least one provider is configured, the app shows a *Continue with …* button on the
login and sign-up pages.

### Staying signed in ("Remember me")

The login page has a **Remember me** checkbox (on by default), which also applies to provider
logins:

* **Remember me on** – the session lasts `AUTH_REMEMBER_DAYS` (default **30 days**) and is
  renewed every time the app is opened, so regular users stay signed in indefinitely. Only
  30 days without opening the app require a new login.
* **Remember me off** – a 1 day session that ends when the browser is closed.

Sessions are JWTs signed with `JWT_SECRET`; changing the secret signs everyone out.

### How accounts are matched

A user can sign in with their password **and** with any linked provider – it is always the
same account with the same vehicles and history. When someone signs in through a provider:

1. If that provider account is already linked to a Fuelstats user, they are signed in.
2. Otherwise, if a Fuelstats account with the same email exists **and the provider reports the
   email as verified** (`email_verified: true`), the provider is linked to that account
   automatically and they are signed in. Authelia always reports emails as verified.
3. If the email exists but is *not* verified, sign-in is refused. The user can sign in with
   their password and link the provider manually under **Settings → Sign-in methods**.
4. If no account exists, a new one is created (unless `OIDC_<ID>_ALLOW_SIGNUP=false`).
   Accounts created this way have no password; one can be set later in Settings.

In **Settings → Sign-in methods** users can link/unlink providers and set or change their
password. The last remaining sign-in method can't be removed.

### Configuration

| Variable | Required | Description |
| --- | --- | --- |
| `OIDC_PROVIDERS` | – | Comma separated list of provider ids, e.g. `authelia` or `authelia,google`. Empty = SSO disabled. Ids may contain `a-z`, `0-9`, `-`, `_`. |
| `OIDC_<ID>_ISSUER` | yes | Issuer URL of the provider (its `/.well-known/openid-configuration` must be reachable from the server). |
| `OIDC_<ID>_CLIENT_ID` | yes | Client id registered at the provider. |
| `OIDC_<ID>_CLIENT_SECRET` | yes | Client secret (plain text, not the hash). |
| `OIDC_<ID>_NAME` | no | Button label, defaults to the capitalised id (`Authelia`). |
| `OIDC_<ID>_SCOPES` | no | Defaults to `openid profile email`. |
| `OIDC_<ID>_ALLOW_SIGNUP` | no | `false` to only allow existing accounts. Defaults to `true`. |
| `API_PUBLIC_URL` | no | Public URL the API is reachable at. Defaults to `APP_HOST` (correct when the frontend proxies `/api/v1`, as in the Docker setup). Set it when the API lives on a different origin, e.g. `http://localhost:6060` in development. |
| `APP_HOST` | yes | Public URL of the frontend – users are redirected back there after signing in. |
| `AUTH_REMEMBER_DAYS` | no | Lifetime of a "Remember me" session in days, renewed while the app is used. Defaults to `30`. |

`<ID>` is the provider id in upper case with `-` replaced by `_` (`pocket-id` → `OIDC_POCKET_ID_…`).

The redirect (callback) URL to register at the provider is:

```
<API_PUBLIC_URL>/api/v1/auth/oidc/<id>/callback
```

e.g. `https://fuel.example.com/api/v1/auth/oidc/authelia/callback`.

### Adding Authelia

1. **Generate a client secret** and its hash:

   ```bash
   docker run --rm authelia/authelia:latest authelia crypto hash generate pbkdf2 \
     --variant sha512 --random --random.length 72 --random.charset rfc3986
   ```

   It prints a *Random Password* (goes into Fuelstats) and a *Digest* (goes into Authelia).

2. **Register Fuelstats as a client** in Authelia's `configuration.yml`
   (OIDC must already be enabled, i.e. `identity_providers.oidc.hmac_secret` and `jwks` set):

   ```yaml
   identity_providers:
     oidc:
       clients:
         - client_id: 'fuelstats'
           client_name: 'Fuelstats'
           client_secret: '$pbkdf2-sha512$310000$...'   # the Digest from step 1
           public: false
           authorization_policy: 'two_factor'           # or one_factor
           require_pkce: true
           pkce_challenge_method: 'S256'
           redirect_uris:
             - 'https://fuel.example.com/api/v1/auth/oidc/authelia/callback'
           scopes: ['openid', 'profile', 'email']
           response_types: ['code']
           grant_types: ['authorization_code']
           token_endpoint_auth_method: 'client_secret_basic'
   ```

   Restart Authelia afterwards. Make sure your users have an email set in Authelia
   (`users_database.yml` or the LDAP `mail` attribute) – it is used to match existing accounts.

3. **Configure Fuelstats** (`.env.production` / `.env.fuelstats`):

   ```dotenv
   APP_HOST=https://fuel.example.com
   OIDC_PROVIDERS=authelia
   OIDC_AUTHELIA_ISSUER=https://auth.example.com
   OIDC_AUTHELIA_CLIENT_ID=fuelstats
   OIDC_AUTHELIA_CLIENT_SECRET=<Random Password from step 1>
   # optional
   OIDC_AUTHELIA_NAME=Authelia
   ```

4. Restart the server and open the login page – a **Continue with Authelia** button appears.
   Existing users signing in with Authelia land in their existing account (matched by email).

> If Fuelstats itself sits behind Authelia's forward-auth, exclude `/api/v1/auth/oidc/` from
> the protection (or use the `bypass` policy for it) so the callback can reach the server.

### Adding other OIDC providers

Every OIDC-compliant provider works the same way: create a *confidential* client with the
authorization code flow, register the callback URL above, allow the `openid profile email`
scopes and add the provider to `OIDC_PROVIDERS`. Examples:

```dotenv
OIDC_PROVIDERS=authelia,authentik,google

# Authentik: Applications → Providers → OAuth2/OpenID Provider (issuer = the provider's "OpenID Configuration Issuer")
OIDC_AUTHENTIK_ISSUER=https://authentik.example.com/application/o/fuelstats
OIDC_AUTHENTIK_CLIENT_ID=...
OIDC_AUTHENTIK_CLIENT_SECRET=...

# Keycloak: realm → Clients → Create (Client authentication ON, Standard flow ON)
# OIDC_KEYCLOAK_ISSUER=https://keycloak.example.com/realms/<realm>

# Google: Cloud Console → APIs & Services → Credentials → OAuth client ID (Web application)
OIDC_GOOGLE_ISSUER=https://accounts.google.com
OIDC_GOOGLE_CLIENT_ID=...apps.googleusercontent.com
OIDC_GOOGLE_CLIENT_SECRET=...
OIDC_GOOGLE_NAME=Google
```

Plain OAuth2 services that are not OpenID Connect providers (e.g. GitHub) are not supported.

### Troubleshooting

* The app shows an error message after a failed sign-in; the server log shows details. Received
  claims are logged on every provider sign-in, so you can check `email` / `email_verified`.
* `provider_unavailable` – the server can't reach `<ISSUER>/.well-known/openid-configuration`.
* `invalid_state` – the sign-in took longer than 10 minutes or cookies are blocked; retry.
* `account_exists_unverified` – the provider didn't confirm the email; sign in with your
  password and link the provider in Settings.
* Redirect URI mismatch at the provider – check `API_PUBLIC_URL` / `APP_HOST`.

---
## License

[MIT](LICENSE)
