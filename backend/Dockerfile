# Debian-slim (glibc): better-sqlite3 ships prebuilt binaries here, so no
# compiler toolchain is needed. Alpine (musl) would force a node-gyp build.
FROM node:20-slim

WORKDIR /app

ENV NODE_ENV=production
ENV DATABASE_URL=file:./data/grs.db

# Toolchain for better-sqlite3 (native module) if no prebuilt binary matches
RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 make g++ \
  && rm -rf /var/lib/apt/lists/*

# Install deps (NODE_ENV=production above would skip devDeps; include them so
# the prisma CLI, tsx, and the nest CLI are available for migrate/seed/build).
# tsconfig is copied BEFORE `prisma generate` so the client emits .js imports
# (without it, the generator emits .ts imports that Node cannot resolve).
COPY package.json package-lock.json ./
COPY prisma.config.ts ./
COPY prisma ./prisma
COPY tsconfig.json tsconfig.build.json nest-cli.json ./
RUN npm ci --include=dev && npx prisma generate

# Build the app
COPY src ./src
RUN npm run build

# Ensure the SQLite data directory exists (compose mounts a volume here)
RUN mkdir -p data

EXPOSE 3000

# Apply migrations on start, then boot the API
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/src/main"]
