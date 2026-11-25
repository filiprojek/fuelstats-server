# Changelog - FuelStats Server

All notable changes to the `fuelstats-server` backend application will be documented in this file.

## [1.2.0] - 2026-11-25

### Features & Updates
* **Single Sign-On (OpenID Connect)**: Sign in through Authelia or any OIDC provider (`OIDC_PROVIDERS`, `OIDC_<ID>_*`). PKCE code flow, auto-linking by verified email, optional auto-signup, and link/unlink endpoints. Users can set or change a password under sign-in methods.
* **Remember Me Sessions**: Sliding session refresh with a configurable lifetime (`AUTH_REMEMBER_DAYS`, default 30 days).
* **Odometer Start Record**: An odometer record can mark the start of a vehicle's history.
* **CSV Import into a Vehicle**: Import into a chosen vehicle, skipping rows that are already present.
* **Backup Scripts**: `scripts/backup/` adds restic backups, one-off snapshots and a pre-update snapshot in `update-fuelstats.sh`.
* **Server Version Endpoint**: `GET /api/v1/version` now returns version `1.2.0`.

### Fixes
* **SPA Routing**: Client routes (refresh, deep links, the OIDC redirect back to `/login`) now serve `index.html` instead of `E404`.
* Service photos larger than 100 kB are accepted (`BODY_LIMIT`, default `25mb`).
* Ids that are not ObjectIds return 404.
* Service task names are matched literally when finding or creating tasks.

---

## [1.1.1] - 2026-07-20

### Features & Updates
* **Custom Service Task API**: Added support for dynamic creation and resolving of custom service tasks via `POST /api/v1/vehicles/service-tasks` and `saveServiceIntervals`.
* **Server Version Endpoint**: Updated `GET /api/v1/version` endpoint to return version `1.1.1`.

---

## [1.1.0] - 2026-07-19

### Features & Updates
* **Standalone Odometer API**: Added `OdometerRecord` model and CRUD endpoints (`/api/v1/odometer`) for logging vehicle mileage entries.
* **Service Tracker Odometer Aggregation**: Integrated `OdometerRecord` into `ServiceTrackerService.getLatestOdometer` logic to dynamically recalculate maintenance intervals.
* **Server Version Endpoint**: Added `GET /api/v1/version` endpoint returning server metadata `{ name, version: "1.1.0", apiVersion: "v1" }`.
* **Automated Release Script**: Added `npm run release` script supporting SemVer minor/patch version arguments.

---

## [1.0.0] - 2026-07-19

### Features & Updates
* **Service Tracker Engine**: Added Mongoose models `ServiceTask`, `ServiceInterval`, and `ServiceLog` with dynamic service status calculation algorithms (`/api/v1/vehicles/:carId/service-status`).
* **CSV Import/Export Engine**: Added CSV parsing for refuel logs and service records supporting Czech date formats (`DD.MM.YYYY`) and optional cost values.
* **Photo Attachment Storage**: Added filesystem photo uploads for service records.
* **Server Version Endpoint**: Added `GET /api/v1/version` endpoint exposing server version and API metadata.
* **Authentication**: Enhanced JWT authorization with cookie-based session support and refresh token handling.
* **Backward Compatibility**: Maintained REST API structure fully compatible with both v1 Flutter client and v2 Vue.js web app.
