# Production Multi-Stage Dockerfile for Express Backend
FROM node:20-alpine AS base
WORKDIR /app
RUN apk add --no-cache libc6-compat

# Dependencies Stage
FROM base AS dependencies
COPY package.json package-lock.json ./
RUN npm ci --only=production

# Production Runner
FROM base AS runner
ENV NODE_ENV=production
ENV PORT=5000

# Create non-root system user for security
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 expressuser

WORKDIR /app

COPY --from=dependencies /app/node_modules ./node_modules
COPY package.json ./
COPY migrations ./migrations
COPY src ./src

USER expressuser

EXPOSE 5000

CMD ["node", "src/server.js"]
