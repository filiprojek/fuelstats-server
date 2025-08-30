# FuelStats Server

A TypeScript backend for Fuel Stats, exposing a RESTful API used by the Android client.

## Features

- Express.js server bootstrap
- Type-safe request/response handling
- MVC-inspired folder structure
- Integrated testing (Jest)
- Biome for formatting & linting
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
  PORT=6060
  MONGO_URL=mongodb://username:password@mongodb:27017/fuelstats?authSource=admin
  JWT_SECRET=changeme
  ```
* ⚠️ `.env.production` **must exist before running Docker**. If missing, Docker will create a directory instead of a file.

---

## Running

### Development (Node.js)

```bash
npm run dev
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

* Secrets like `MONGO_URL` are injected from `.env.production` (mounted into the container).
* Logs are written to `dist/logs/` — you can mount this to the host if you want persistence.

---
## License

[MIT](LICENSE)
