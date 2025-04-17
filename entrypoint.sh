#!/usr/bin/env sh

CONFIG_FILE="/config/configuration/${NODE_ENV:-development}.mjs"

if [ ! -f "$CONFIG_FILE" ]; then
  echo "No config found at $CONFIG_FILE, generating from environment..."
  /app/gen-config.mjs
else
  echo "Using existing config file at $CONFIG_FILE"
fi

exec npm start
