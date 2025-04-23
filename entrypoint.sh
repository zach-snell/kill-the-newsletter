#!/usr/bin/env sh
set -e

CONFIG_FILE="${CONFIG_PATH:-/config/configuration.mjs}"
STORAGE_DIR="${STORAGE_PATH:-/config/storage}"
USE_TRAEFIK="${USE_TRAEFIK:-false}"

# Create necessary directories
mkdir -p "$STORAGE_DIR"
mkdir -p /app/certs

# Check if config exists
if [ ! -f "$CONFIG_FILE" ]; then
    echo "No config found at $CONFIG_FILE, generating from environment..."
    
    # Create config directory if it doesn't exist
    mkdir -p $(dirname "$CONFIG_FILE")
    
    # Generate config file
    cat > "$CONFIG_FILE" << EOF
export default {
  hostname: "${DOMAIN}",
  systemAdministratorEmail: "${ADMIN_EMAIL:-admin@example.com}",
  tls: {
    key: "/app/certs/${DOMAIN}.key",
    certificate: "/app/certs/${DOMAIN}.crt"
  },
  dataDirectory: "${STORAGE_DIR}",
  environment: "${NODE_ENV:-production}"
};
EOF
    echo "Generated configuration at $CONFIG_FILE"
else
    echo "Using existing config file at $CONFIG_FILE"
fi

# Handle certificate management based on configuration
if [ "$USE_TRAEFIK" = "true" ]; then
    echo "Using Traefik for certificate management"
    
    # Start certificate monitor in background
    echo "Starting Traefik certificate monitor..."
    node /app/traefik-cert-monitor.js &
    CERT_MONITOR_PID=$!
    
    # Wait for certificates before starting the application
    echo "Waiting for SSL certificates to become available..."
    for i in $(seq 1 60); do
        if [ -f "/app/certs/${DOMAIN}.key" ] && [ -f "/app/certs/${DOMAIN}.crt" ]; then
            echo "Certificates are ready."
            break
        fi
        
        if [ $i -eq 60 ]; then
            echo "Timed out waiting for certificates. Starting application anyway..."
        fi
        
        echo "Waiting for certificates... ($i/60)"
        sleep 1
    done
else
    echo "Using Caddy for certificate management (original Kill the Newsletter implementation)"
    # No need to start additional certificate monitor - Caddy is integrated in the application
    echo "Certificates will be managed by Kill the Newsletter's built-in Caddy integration"
fi

# Start Kill the Newsletter in foreground
echo "Starting Kill the Newsletter..."
exec node /app/build/index.mjs "$CONFIG_FILE"