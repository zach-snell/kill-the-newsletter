#!/usr/bin/env sh

CONFIG_FILE="/config/configuration/${NODE_ENV:-production}.mjs"

if [ ! -f "$CONFIG_FILE" ]; then
  echo "No config found at $CONFIG_FILE, generating from environment..."
  /app/gen-config.mjs
else
  echo "Using existing config file at $CONFIG_FILE"
fi

# Pass the absolute path to the node application
exec node ./build/index.mjs "$CONFIG_FILE"