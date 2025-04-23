#!/usr/bin/env node
// Generate ESM config file from environment variables
import fs from 'fs';
import path from 'path';

const config = {
  server: {
    hostname: process.env.HOSTNAME || '0.0.0.0',
    port: Number(process.env.PORT || 3000),
    secret: process.env.SECRET_KEY || 'CHANGE_ME',
  },
  email: {
    host: process.env.SMTP_HOST || 'smtp.example.com',
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER || 'user@example.com',
      pass: process.env.SMTP_PASS || 'password',
    },
  },
  storage: {
    path: '/config/storage',
  },
};

const outDir = '/config/configuration';
fs.mkdirSync(outDir, { recursive: true });
const content = `export default ${JSON.stringify(config, null, 2)};\n`;
fs.writeFileSync(path.join(outDir, `${process.env.NODE_ENV || 'production'}.mjs`), content);