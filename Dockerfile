# --- Build stage ---
FROM oven/bun:1 AS build
WORKDIR /app

# Install deps
COPY package*.json bun.lockb* ./
RUN bun install --production --frozen-lockfile || bun install

# Copy sources and build
COPY . .
RUN bun run build
#COPY src/.env ./dist/.env
COPY src/views ./dist/views
COPY src/public ./dist/public

# --- Runtime stage ---
FROM oven/bun:1 AS runtime
WORKDIR /app

# Copy only runtime deps and build output
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/norkconfig.json ./norkconfig.json


#RUN mv /app/dist/.env /app/dist/.env.production

# Create logs directory so the app can write there
#RUN mkdir -p /app/dist/logs

#ENV NODE_ENV=production
EXPOSE 6060
CMD ["bun", "dist/server.js"]

