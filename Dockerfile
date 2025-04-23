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
  ARG VERSION=v2.0.8
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
  RUN cd /app && npm install --omit=dev --ignore-scripts
  
  # Install chokidar for certificate monitoring
  RUN npm install chokidar
  
  # Add tini for proper signal handling
  RUN apt-get update && apt-get install -y tini curl && rm -rf /var/lib/apt/lists/*
  
  # Create required directories
  RUN mkdir -p /app/certs /config/storage
  
  # Copy our certificate monitor script and entrypoint
  COPY traefik-cert-monitor.js /app/traefik-cert-monitor.js
  COPY entrypoint.sh /app/entrypoint.sh
  RUN chmod +x /app/traefik-cert-monitor.js /app/entrypoint.sh
  
  # Remove the configuration directory copied from the builder stage first
  RUN rm -rf /app/configuration
  # Now, create the symlink pointing to the volume root
  RUN ln -s /config /app/configuration
  
  # Volume for configuration and data persistence
  VOLUME ["/config"]
  VOLUME ["/traefik-certs"]
  
  # Expose web port
  EXPOSE 3000
  # Expose SMTP port
  EXPOSE 25
  
  # Environment variables
  ENV NODE_ENV=production
  ENV HOSTNAME=localhost
  ENV DOMAIN=example.com
  ENV TRAEFIK_CERTS_PATH=/traefik-certs
  ENV CERT_OUTPUT_DIR=/app/certs
  ENV CONFIG_PATH=/config/configuration.mjs
  ENV STORAGE_PATH=/config/storage
  ENV PORT=3000
  ENV USE_TRAEFIK=false
  
  # Healthcheck
  HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
      CMD curl -f http://localhost:3000 || exit 1
  
  ENTRYPOINT ["/usr/bin/tini", "--", "/app/entrypoint.sh"]