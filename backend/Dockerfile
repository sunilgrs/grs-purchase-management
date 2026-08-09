FROM node:20-alpine

WORKDIR /app

ENV NODE_ENV=production
ENV DATABASE_URL=file:./data/grs.db

# Install deps (dev deps kept so `prisma` CLI is available for migrate/seed)
COPY package.json package-lock.json ./
COPY prisma.config.ts ./
COPY prisma ./prisma
RUN npm ci && npx prisma generate

# Build the app
COPY tsconfig.json tsconfig.build.json nest-cli.json ./
COPY src ./src
RUN npm run build

# Ensure the SQLite data directory exists (compose mounts a volume here)
RUN mkdir -p data

EXPOSE 3000

# Apply migrations on start, then boot the API
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/src/main"]
