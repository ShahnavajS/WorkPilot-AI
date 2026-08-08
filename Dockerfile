# Multi-stage Production Dockerfile — WorkPilot AI

# ----------------------------------------------------
# Stage 1: Dependencies
# ----------------------------------------------------
FROM node:20-alpine AS deps
WORKDIR /app

# Copy package descriptors
COPY package.json package-lock.json* ./
COPY prisma ./prisma/

# Install exact production & build dependencies
RUN npm ci

# Generate Prisma Client
RUN npx prisma generate

# ----------------------------------------------------
# Stage 2: Builder
# ----------------------------------------------------
FROM node:20-alpine AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Set environment variables for build
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

# Execute production build
RUN npm run build

# ----------------------------------------------------
# Stage 3: Production Runner
# ----------------------------------------------------
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000

# Create non-root system user for security
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy built artifacts & dependencies
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next ./.next

USER nextjs

EXPOSE 3000

# Production startup
CMD ["npm", "run", "start"]
