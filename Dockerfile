# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# Copy package files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY client/package.json ./client/
COPY server/package.json ./server/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source code
COPY . .

# Build client
RUN pnpm --filter client build

# Build server
RUN pnpm --filter server build

# Production stage
FROM node:20-alpine AS production

WORKDIR /app

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# Copy package files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY server/package.json ./server/

# Install production dependencies only
RUN pnpm install --frozen-lockfile --prod --filter server

# Copy built server
COPY --from=builder /app/server/dist ./server/dist

# Copy built client to server public folder
COPY --from=builder /app/client/dist ./server/public

# Set environment
ENV NODE_ENV=production
ENV PORT=8080

# Expose port
EXPOSE 8080

# Start server
WORKDIR /app/server
CMD ["node", "dist/index.js"]
