# Changelog - FuelStats Server

All notable changes to the `fuelstats-server` backend application will be documented in this file.

## [1.0.0] - 2026-07-19

### Features & Updates
* **Service Tracker Engine**: Added Mongoose models `ServiceTask`, `ServiceInterval`, and `ServiceLog` with dynamic service status calculation algorithms (`/api/v1/vehicles/:carId/service-status`).
* **CSV Import/Export Engine**: Added CSV parsing for refuel logs and service records supporting Czech date formats (`DD.MM.YYYY`) and optional cost values.
* **Photo Attachment Storage**: Added filesystem photo uploads for service records.
* **Server Version Endpoint**: Added `GET /api/v1/version` endpoint exposing server version and API metadata.
* **Authentication**: Enhanced JWT authorization with cookie-based session support and refresh token handling.
* **Backward Compatibility**: Maintained REST API structure fully compatible with both v1 Flutter client and v2 Vue.js web app.
