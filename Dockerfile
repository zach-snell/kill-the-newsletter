# -----------------------
# Stage 1: Build
# -----------------------
  FROM node:lts-slim AS builder
  WORKDIR /app
  
  # Install native build tools
  RUN apt-get update && apt-get install -y \
      python3 \
      make \
      g++ \
      git \
    && rm -rf /var/lib/apt/lists/*
  
  # Clone upstream and checkout version
  ARG VERSION
  RUN git clone --depth 1 --branch ${VERSION} https://github.com/leafac/kill-the-newsletter.git .
  
  # Install and build
  RUN npm install
  RUN npm run prepare
  
  # -----------------------
  # Stage 2: Runtime
  # -----------------------
  FROM node:lts-slim AS runner
  WORKDIR /app
  
  # Copy built app
  COPY --from=builder /app /app
  
  # Install only production dependencies (skip scripts)
  COPY package*.json ./
  RUN npm install --omit=dev --ignore-scripts
  
  # Add tini for proper signal handling
  RUN apt-get update && apt-get install -y tini && rm -rf /var/lib/apt/lists/*
  
  # Copy entrypoint logic and config generator
  COPY gen-config.mjs /app/gen-config.mjs
  COPY entrypoint.sh /app/entrypoint.sh
  RUN chmod +x /app/gen-config.mjs /app/entrypoint.sh
  
  ENTRYPOINT ["/usr/bin/tini", "--", "/app/entrypoint.sh"]
  
  # Symlink config dir
  RUN ln -s /config /app/configuration
  
  VOLUME ["/config"]
  EXPOSE 3000
  
  ENV NODE_ENV=production
  ENV STORAGE_PATH=/config/storage
  ENV PORT=3000
  
  HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:3000 || exit 1