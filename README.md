# FuelStats server

A Node.js + TypeScript backend for Fuel Stats, exposing a RESTful API used by the Android client.

## Features

- Express.js server bootstrap
- Type-safe request/response handling
- MVC-inspired folder structure
- Integrated testing (Jest)
- ESLint & Prettier for consistent style

## Prerequisites

- Node.js
- npm
- Docker & Docker Compose (optional, for database)

## Getting Started

1. **Clone the repo**
   ```bash
   git clone https://github.com/filiprojek/fuelstats-server.git
   cd fuelstats-server
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Configure environment**
   Copy `.env.example` → `.env` and fill in your settings (e.g. `DATABASE_URL`, `PORT`, `JWT_SECRET`).

4. **Run in development**

   ```bash
   npm run dev
   ```

   Server listens on `http://localhost:<PORT>`.

5. **Build & start**

   ```bash
   npm run build
   npm start
   ```

6. **Run tests**

   ```bash
   npm test
   ```
