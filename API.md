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
  "password": "strongpassword"
}
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

## User

### GET /api/v1/user/me
Return the current user.

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

