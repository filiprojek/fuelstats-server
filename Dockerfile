# --- Stage 1: Build the Vue Frontend ---
FROM node:22-alpine AS frontend-build
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm install
COPY frontend/ ./
ENV VITE_API=/api/v1
RUN npm run build

# --- Stage 2: Build the Bun Backend ---
FROM oven/bun:1 AS backend-build
WORKDIR /app/backend

# Install ALL dependencies first (including devDependencies like tsc)
COPY backend/package*.json backend/bun.lockb* ./
RUN bun install --frozen-lockfile || bun install

# Copy backend source files from the host
COPY backend/ .

# Copy the compiled Vue frontend from Stage 1 into the backend source public folder
COPY --from=frontend-build /app/frontend/dist ./src/public

# Ensure target directories exist before compiling/copying
RUN mkdir -p dist/views dist/public

RUN ./node_modules/.bin/tsc -p .

# Copy assets into the build directory from our active container context
RUN cp -r src/views/* ./dist/views/
RUN cp -r src/public/* ./dist/public/

# Clear out the heavy devDependencies and install ONLY production packages
RUN rm -rf node_modules && bun install --production

# --- Stage 3: Runtime Stage ---
FROM oven/bun:1 AS runtime
WORKDIR /app
COPY --from=backend-build /app/backend/node_modules ./node_modules
COPY --from=backend-build /app/backend/dist ./dist

EXPOSE 6060
CMD ["bun", "dist/server.js"]

