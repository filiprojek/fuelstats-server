# Fuelstats API Documentation

Base URL: `http://localhost:3000`

All endpoints return JSON. Routes under `/api/v1` (except signup and signin) require an `Authorization: Bearer <token>` header obtained from the signin endpoint.

## Root

### GET /
Retrieve a simple status message.

#### Curl
```bash
curl http://localhost:3000/
```

#### fetch
```javascript
fetch('http://localhost:3000/');
```

## Authentication

### POST /api/v1/auth/signup
Register a new user.

**Body**
```json
{
  "email": "user@example.com",
  "password": "strongpassword",
  "username": "optionalName"
}
```

#### Curl
```bash
curl -X POST http://localhost:3000/api/v1/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"secret","username":"bob"}'
```

#### fetch
```javascript
fetch('http://localhost:3000/api/v1/auth/signup', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'user@example.com',
    password: 'secret',
    username: 'bob'
  })
});
```

### POST /api/v1/auth/signin
Authenticate a user and return a JWT token.

**Body**
```json
{
  "email": "user@example.com",
  "password": "strongpassword",
  "remember": true
}
```

`remember` (optional): `true` issues a token valid for `AUTH_REMEMBER_DAYS` (default 30 days)
with persistent cookies; otherwise the token is valid for 1 day and the cookies end with the
browser session.

**Response**
```json
{ "token": "<JWT>", "remember": true }
```

#### Curl
```bash
curl -X POST http://localhost:3000/api/v1/auth/signin \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"secret"}'
```

#### fetch
```javascript
fetch('http://localhost:3000/api/v1/auth/signin', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'user@example.com',
    password: 'secret'
  })
});
```

### POST /api/v1/auth/signout
Clear the session cookies.

### POST /api/v1/auth/refresh
Requires auth. Returns a fresh token with the same lifetime as the current one (sliding session)
and renews the cookies. Clients should call it periodically, e.g. once a day when the app opens.

**Response**
```json
{ "token": "<JWT>", "remember": true }
```

### GET /api/v1/auth/providers
List configured single sign-on (OpenID Connect) providers. Public.

**Response**
```json
[{ "id": "authelia", "name": "Authelia" }]
```

### GET /api/v1/auth/oidc/{provider}/start
Browser navigation (not XHR). Redirects to the provider's login page and stores a short-lived
signed `oidc_state` cookie. Optional query `link=<linkToken>` (see below) links the provider to
the signed-in account instead of logging in; `remember=1` issues a remembered session (see
signin).

### GET /api/v1/auth/oidc/{provider}/callback
Redirect target registered at the provider. On success it sets the `jwt`/`auth` cookies and
redirects to `<APP_HOST>/auth/callback#token=<JWT>` (with `&remember=1` for remembered sessions); for link requests to
`<APP_HOST>/settings#linked=<provider>`. Errors redirect to `/login#error=<code>` (or
`/settings#error=<code>` for link requests). Error codes: `unknown_provider`,
`provider_unavailable`, `invalid_state`, `access_denied`, `account_exists_unverified`,
`signup_disabled`, `email_missing`, `identity_in_use`, `link_expired`, `sso_failed`.

### POST /api/v1/auth/oidc/{provider}/link
Requires auth. Returns a 2 minute token to start a link flow:
`GET /api/v1/auth/oidc/{provider}/start?link=<linkToken>`.

**Response**
```json
{ "linkToken": "eyJ..." }
```

## User

### GET /api/v1/user/me
Return the current user including sign-in methods.

**Response**
```json
{
  "id": "665f...",
  "email": "user@example.com",
  "username": "bob",
  "hasPassword": true,
  "identities": [{ "provider": "authelia", "email": "user@example.com", "linkedAt": "2026-10-17T10:00:00.000Z" }]
}
```

#### Curl
```bash
curl http://localhost:3000/api/v1/user/me \
  -H "Authorization: Bearer TOKEN"
```

#### fetch
```javascript
fetch('http://localhost:3000/api/v1/user/me', {
  headers: { Authorization: 'Bearer TOKEN' }
});
```

### PUT /api/v1/user/password
Set the first password (accounts created through single sign-on) or change it.
`currentPassword` is required when the account already has a password. Minimum length 8.

**Body**
```json
{ "currentPassword": "old", "newPassword": "newpassword" }
```

Errors: `400 weak_password`, `401 invalid_current_password`.

### DELETE /api/v1/user/identities/{provider}
Unlink a single sign-on provider. Fails with `400 last_sign_in_method` when the account would
be left without a password and without any other provider.

## Vehicles

### GET /api/v1/vehicles
List all vehicles for the current user.

#### Curl
```bash
curl http://localhost:3000/api/v1/vehicles \
  -H "Authorization: Bearer TOKEN"
```

#### fetch
```javascript
fetch('http://localhost:3000/api/v1/vehicles', {
  headers: { Authorization: 'Bearer TOKEN' }
});
```

### POST /api/v1/vehicles
Create a new vehicle.

**Body**
```json
{
  "name": "Family Car",
  "registrationPlate": "ABC123",
  "fuelType": "gasoline",
  "note": "optional",
  "isDefault": true
}
```

#### Curl
```bash
curl -X POST http://localhost:3000/api/v1/vehicles \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Family Car","registrationPlate":"ABC123","fuelType":"gasoline","note":"optional","isDefault":true}'
```

#### fetch
```javascript
fetch('http://localhost:3000/api/v1/vehicles', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    Authorization: 'Bearer TOKEN'
  },
  body: JSON.stringify({
    name: 'Family Car',
    registrationPlate: 'ABC123',
    fuelType: 'gasoline',
    note: 'optional',
    isDefault: true
  })
});
```

### GET /api/v1/vehicles/{id}
Get a vehicle by ID.

#### Curl
```bash
curl http://localhost:3000/api/v1/vehicles/VEHICLE_ID \
  -H "Authorization: Bearer TOKEN"
```

#### fetch
```javascript
fetch(`http://localhost:3000/api/v1/vehicles/${id}`, {
  headers: { Authorization: 'Bearer TOKEN' }
});
```

### PUT /api/v1/vehicles/{id}
Update a vehicle. Same body fields as vehicle creation.

**Body**
```json
{
  "name": "Updated Car",
  "registrationPlate": "XYZ789",
  "fuelType": "diesel",
  "note": "updated",
  "isDefault": false
}
```

#### Curl
```bash
curl -X PUT http://localhost:3000/api/v1/vehicles/VEHICLE_ID \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Updated Car","registrationPlate":"XYZ789","fuelType":"diesel","note":"updated","isDefault":false}'
```

#### fetch
```javascript
fetch(`http://localhost:3000/api/v1/vehicles/${id}`, {
  method: 'PUT',
  headers: {
    'Content-Type': 'application/json',
    Authorization: 'Bearer TOKEN'
  },
  body: JSON.stringify({
    name: 'Updated Car',
    registrationPlate: 'XYZ789',
    fuelType: 'diesel',
    note: 'updated',
    isDefault: false
  })
});
```

### DELETE /api/v1/vehicles/{id}
Delete a vehicle.

#### Curl
```bash
curl -X DELETE http://localhost:3000/api/v1/vehicles/VEHICLE_ID \
  -H "Authorization: Bearer TOKEN"
```

#### fetch
```javascript
fetch(`http://localhost:3000/api/v1/vehicles/${id}`, {
  method: 'DELETE',
  headers: { Authorization: 'Bearer TOKEN' }
});
```

## Refuels

### GET /api/v1/refuels
List refuel records.

#### Curl
```bash
curl http://localhost:3000/api/v1/refuels \
  -H "Authorization: Bearer TOKEN"
```

#### fetch
```javascript
fetch('http://localhost:3000/api/v1/refuels', {
  headers: { Authorization: 'Bearer TOKEN' }
});
```

### POST /api/v1/refuels
Create a refuel record.

**Body**
```json
{
  "vehicleId": "id-of-vehicle",
  "fuelType": "gasoline",
  "note": "optional",
  "liters": 42.3,
  "pricePerLiter": 1.5,
  "totalPrice": 63.45,
  "mileage": 12345
}
```

#### Curl
```bash
curl -X POST http://localhost:3000/api/v1/refuels \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"vehicleId":"id","fuelType":"gasoline","note":"optional","liters":42.3,"pricePerLiter":1.5,"totalPrice":63.45,"mileage":12345}'
```

#### fetch
```javascript
fetch('http://localhost:3000/api/v1/refuels', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    Authorization: 'Bearer TOKEN'
  },
  body: JSON.stringify({
    vehicleId: 'id',
    fuelType: 'gasoline',
    note: 'optional',
    liters: 42.3,
    pricePerLiter: 1.5,
    totalPrice: 63.45,
    mileage: 12345
  })
});
```

### GET /api/v1/refuels/{id}
Get a refuel record by ID.

#### Curl
```bash
curl http://localhost:3000/api/v1/refuels/REFUEL_ID \
  -H "Authorization: Bearer TOKEN"
```

#### fetch
```javascript
fetch(`http://localhost:3000/api/v1/refuels/${id}`, {
  headers: { Authorization: 'Bearer TOKEN' }
});
```

### PUT /api/v1/refuels/{id}
Update a refuel record. Same body fields as refuel creation.

**Body**
```json
{
  "vehicleId": "id-of-vehicle",
  "fuelType": "diesel",
  "note": "updated note",
  "liters": 40,
  "pricePerLiter": 1.6,
  "totalPrice": 64,
  "mileage": 13000
}
```

#### Curl
```bash
curl -X PUT http://localhost:3000/api/v1/refuels/REFUEL_ID \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"vehicleId":"id-of-vehicle","fuelType":"diesel","note":"updated note","liters":40,"pricePerLiter":1.6,"totalPrice":64,"mileage":13000}'
```

#### fetch
```javascript
fetch(`http://localhost:3000/api/v1/refuels/${id}`, {
  method: 'PUT',
  headers: {
    'Content-Type': 'application/json',
    Authorization: 'Bearer TOKEN'
  },
  body: JSON.stringify({
    vehicleId: 'id-of-vehicle',
    fuelType: 'diesel',
    note: 'updated note',
    liters: 40,
    pricePerLiter: 1.6,
    totalPrice: 64,
    mileage: 13000
  })
});
```

### DELETE /api/v1/refuels/{id}
Delete a refuel record.

#### Curl
```bash
curl -X DELETE http://localhost:3000/api/v1/refuels/REFUEL_ID \
  -H "Authorization: Bearer TOKEN"
```

#### fetch
```javascript
fetch(`http://localhost:3000/api/v1/refuels/${id}`, {
  method: 'DELETE',
  headers: { Authorization: 'Bearer TOKEN' }
});
```

### GET /api/v1/refuels/export
Export refuel records as a CSV file. Optional `vehicleId` query parameter filters records by vehicle.

#### Curl
```bash
curl http://localhost:3000/api/v1/refuels/export?vehicleId=VEHICLE_ID \
  -H "Authorization: Bearer TOKEN"
```

### POST /api/v1/refuels/import
Import refuel records from CSV. Optional `vehicleId` query parameter acts as the fallback vehicle if row-level `vehicleId` is omitted. Accepts raw CSV text body or JSON body with a `csv` property.

**Body (Raw CSV)**
```csv
vehicleId,fuelType,note,liters,pricePerLiter,totalPrice,mileage
VEHICLE_ID,gasoline,imported,42.3,1.5,63.45,12345
```

**Body (JSON)**
```json
{
  "csv": "vehicleId,fuelType,note,liters,pricePerLiter,totalPrice,mileage\nVEHICLE_ID,gasoline,imported,42.3,1.5,63.45,12345"
}
```

#### Curl
```bash
curl -X POST http://localhost:3000/api/v1/refuels/import \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: text/csv" \
  --data-binary @refuels.csv
```


### GET /api/v1/services
List service records.

#### Curl
```bash
curl http://localhost:3000/api/v1/services \
  -H "Authorization: Bearer TOKEN"
```

#### fetch
```javascript
fetch('http://localhost:3000/api/v1/services', {
  headers: { Authorization: 'Bearer TOKEN' }
});
```

### POST /api/v1/services
Create a service record.

**Body**
```json
{
  "vehicleId": "id-of-vehicle",
  "serviceType": "oil_filter",
  "customType": "optional",
  "itemName": "model or name",
  "cost": 100,
  "mileage": 12345,
  "shop": "My Garage",
  "selfService": true,
  "note": "optional",
  "photos": ["url1"],
  "date": "2024-01-01T00:00:00.000Z"
}
```

#### Curl
```bash
curl -X POST http://localhost:3000/api/v1/services \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"vehicleId":"id","serviceType":"oil_filter","cost":100,"mileage":12345,"date":"2024-01-01T00:00:00.000Z"}'
```

#### fetch
```javascript
fetch('http://localhost:3000/api/v1/services', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    Authorization: 'Bearer TOKEN'
  },
  body: JSON.stringify({
    vehicleId: 'id',
    serviceType: 'oil_filter',
    cost: 100,
    mileage: 12345,
    date: '2024-01-01T00:00:00.000Z'
  })
});
```

### GET /api/v1/services/{id}
Get a service record by ID.

#### Curl
```bash
curl http://localhost:3000/api/v1/services/SERVICE_ID \
  -H "Authorization: Bearer TOKEN"
```

#### fetch
```javascript
fetch(`http://localhost:3000/api/v1/services/${id}`, {
  headers: { Authorization: 'Bearer TOKEN' }
});
```

### PUT /api/v1/services/{id}
Update a service record. Same body fields as service creation.

**Body**
```json
{
  "vehicleId": "id-of-vehicle",
  "serviceType": "air_filter",
  "cost": 90,
  "mileage": 13000,
  "date": "2024-02-01T00:00:00.000Z"
}
```

#### Curl
```bash
curl -X PUT http://localhost:3000/api/v1/services/SERVICE_ID \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"vehicleId":"id-of-vehicle","serviceType":"air_filter","cost":90,"mileage":13000,"date":"2024-02-01T00:00:00.000Z"}'
```

#### fetch
```javascript
fetch(`http://localhost:3000/api/v1/services/${id}`, {
  method: 'PUT',
  headers: {
    'Content-Type': 'application/json',
    Authorization: 'Bearer TOKEN'
  },
  body: JSON.stringify({
    vehicleId: 'id-of-vehicle',
    serviceType: 'air_filter',
    cost: 90,
    mileage: 13000,
    date: '2024-02-01T00:00:00.000Z'
  })
});
```

### DELETE /api/v1/services/{id}
Delete a service record.

#### Curl
```bash
curl -X DELETE http://localhost:3000/api/v1/services/SERVICE_ID \
  -H "Authorization: Bearer TOKEN"
```

#### fetch
```javascript
fetch(`http://localhost:3000/api/v1/services/${id}`, {
  method: 'DELETE',
  headers: { Authorization: 'Bearer TOKEN' }
});
```

### GET /api/v1/services/export
Export service records as a CSV file. Optional `vehicleId` query parameter filters records by vehicle.

#### Curl
```bash
curl http://localhost:3000/api/v1/services/export?vehicleId=VEHICLE_ID \
  -H "Authorization: Bearer TOKEN"
```

### POST /api/v1/services/import
Import service records from CSV. Optional `vehicleId` query parameter acts as the fallback vehicle if row-level `vehicleId` is omitted. Accepts raw CSV text body or JSON body with a `csv` property.

**Body (Raw CSV)**
```csv
vehicleId,serviceType,customType,itemName,cost,mileage,shop,selfService,note,date
VEHICLE_ID,oil_change,,filter,100,1000,Garage,true,,2026-07-12T16:23:59.000Z
```

**Body (JSON)**
```json
{
  "csv": "vehicleId,serviceType,customType,itemName,cost,mileage,shop,selfService,note,date\nVEHICLE_ID,oil_change,,filter,100,1000,Garage,true,,2026-07-12T16:23:59.000Z"
}
```

#### Curl
```bash
curl -X POST http://localhost:3000/api/v1/services/import \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: text/csv" \
  --data-binary @services.csv
```


