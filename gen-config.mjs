#!/usr/bin/env node
/**
 * Configuration generator for Kill the Newsletter
 * This script generates a configuration file from environment variables
 */

import fs from 'fs';
import path from 'path';

// Environment variables with defaults
const domain = process.env.DOMAIN || 'localhost';
const adminEmail = process.env.ADMIN_EMAIL || 'admin@example.com';
const storagePath = process.env.STORAGE_PATH || '/config/storage';
const nodeEnv = process.env.NODE_ENV || 'production';
const certDir = process.env.CERT_OUTPUT_DIR || '/app/certs';
const configPath = process.env.CONFIG_PATH || '/config/configuration.mjs';
const hstsPreload = process.env.HSTS_PRELOAD === 'true';
const extraCaddyfile = process.env.EXTRA_CADDYFILE || null;

// Create configuration object
const config = {
  hostname: domain,
  systemAdministratorEmail: adminEmail,
  tls: {
    key: path.join(certDir, `${domain}.key`),
    certificate: path.join(certDir, `${domain}.crt`),
  },
  dataDirectory: storagePath,
  environment: nodeEnv
};

// Add optional parameters if they exist
if (hstsPreload) {
  config.hstsPreload = true;
}

if (extraCaddyfile) {
  config.extraCaddyfile = extraCaddyfile;
}

// Ensure config directory exists
const configDir = path.dirname(configPath);
if (!fs.existsSync(configDir)) {
  fs.mkdirSync(configDir, { recursive: true });
}

// Write configuration to file
const configContent = `// Generated configuration for Kill the Newsletter
// Domain: ${domain}
// Generated: ${new Date().toISOString()}

export default ${JSON.stringify(config, null, 2)};
`;

fs.writeFileSync(configPath, configContent);
console.log(`Configuration generated at ${configPath}`);