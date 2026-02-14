# ============================================
# Vibe Code Kidz - Production Docker Image
# ============================================
# Multi-stage build: build frontend, then run server
#
# Build:  docker build -t vibecodekidz .
# Run:    docker run -p 3001:3001 --env-file .env vibecodekidz
# ============================================

# --- Stage 1: Build frontend ---
FROM node:20-alpine AS builder

WORKDIR /app

# Install deps first (cache layer)
COPY package.json package-lock.json* ./
RUN npm ci --include=dev

# Copy source and build
COPY . .
RUN npm run build

# --- Stage 2: Production runtime ---
FROM node:20-alpine AS runtime

WORKDIR /app

# Install only production deps
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev && npm cache clean --force

# Copy server code
COPY server/ ./server/
COPY public/ ./public/
COPY scripts/ ./scripts/

# Copy built frontend from builder stage
COPY --from=builder /app/dist ./dist

# Create data directories
RUN mkdir -p data/users data/projects

# Non-root user for security
RUN addgroup -g 1001 -S appgroup && \
    adduser -S appuser -u 1001 -G appgroup && \
    chown -R appuser:appgroup /app/data

USER appuser

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3001/api/health || exit 1

# Start server
ENV NODE_ENV=production
CMD ["node", "server/index.js"]
