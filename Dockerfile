# syntax=docker/dockerfile:1

# ---- deps: install dependencies ----
FROM node:22-slim AS deps
WORKDIR /app
COPY package.json ./
# copy lockfile if it exists (npm/yarn/pnpm), falls back to plain install otherwise
COPY package-lock.json* yarn.lock* pnpm-lock.yaml* ./
RUN if [ -f package-lock.json ]; then npm ci; \
    elif [ -f pnpm-lock.yaml ]; then corepack enable && corepack prepare pnpm@latest --activate && pnpm install --frozen-lockfile; \
    elif [ -f yarn.lock ]; then corepack enable && yarn install --frozen-lockfile; \
    else npm install; fi

# ---- builder: build the next.js app ----
FROM node:22-slim AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# public/ is optional in Next.js — make sure it exists so the later
# COPY --from=builder /app/public step never fails if the project has none.
RUN mkdir -p public
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# ---- runner: run the production server ----
FROM node:22-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000

# non-root user
RUN groupadd --system --gid 1001 nodejs \
 && useradd --system --uid 1001 --gid nodejs nextjs

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/next.config.ts ./next.config.ts

USER nextjs
EXPOSE 3000

# ONE_C_API_URL is provided at runtime via docker-compose / --env-file
CMD ["npm", "run", "start"]
