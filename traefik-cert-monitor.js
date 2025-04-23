#!/usr/bin/env node
/**
 * Traefik Certificate Monitor for Kill the Newsletter
 * 
 * This script monitors Traefik's certificate store (acme.json) for changes,
 * extracts the certificates for the specified domain, and updates the
 * Kill the Newsletter application configuration.
 */

const fs = require('fs');
const path = require('path');
const chokidar = require('chokidar');
const { execSync } = require('child_process');

// Configuration (can be overridden with environment variables)
const TRAEFIK_CERTS_PATH = process.env.TRAEFIK_CERTS_PATH || '/etc/traefik/acme';
const CERT_OUTPUT_DIR = process.env.CERT_OUTPUT_DIR || '/app/certs';
const DOMAIN = process.env.DOMAIN || 'example.com';
const CONFIG_PATH = process.env.CONFIG_PATH || '/config/configuration.mjs';

// Ensure output directory exists
fs.mkdirSync(CERT_OUTPUT_DIR, { recursive: true });

console.log(`Traefik Certificate Monitor starting...`);
console.log(`Domain: ${DOMAIN}`);
console.log(`Certificate path: ${TRAEFIK_CERTS_PATH}`);
console.log(`Output directory: ${CERT_OUTPUT_DIR}`);
console.log(`Config path: ${CONFIG_PATH}`);

/**
 * Extract certificates from Traefik's acme.json file
 * 
 * Traefik stores certificates in a JSON file with a structure that has changed
 * between versions. This function attempts to handle both older and newer formats.
 */
function extractCertificates(certFilePath) {
  console.log(`Processing certificate file: ${certFilePath}`);
  
  try {
    // Read the Traefik certificate file
    const fileContent = fs.readFileSync(certFilePath, 'utf8');
    
    // Try to parse the JSON - Traefik's acme.json is usually a single large JSON object
    let traefikCerts;
    try {
      traefikCerts = JSON.parse(fileContent);
    } catch (jsonError) {
      console.error('Error parsing certificate JSON:', jsonError.message);
      return false;
    }
    
    // Check different possible structures in Traefik's acme.json
    
    // Handle Traefik v2.x structure
    let certificates = [];
    
    // Traefik v2.x with resolver-based structure
    if (traefikCerts.letsencrypt && traefikCerts.letsencrypt.Certificates) {
      certificates = traefikCerts.letsencrypt.Certificates;
    } 
    // Alternative format sometimes seen
    else if (traefikCerts.Certificates) {
      certificates = traefikCerts.Certificates;
    }
    // Try other resolvers that might be configured
    else {
      // Look for any resolver with Certificates
      for (const [resolver, data] of Object.entries(traefikCerts)) {
        if (data && data.Certificates && Array.isArray(data.Certificates)) {
          certificates = data.Certificates;
          break;
        }
      }
    }
    
    if (certificates.length === 0) {
      console.log('No certificates found in acme.json');
      return false;
    }
    
    // Find certificate for our domain
    const domainCert = certificates.find(cert => {
      // Check different possible structures
      if (cert.domain && cert.domain.main === DOMAIN) {
        return true;
      }
      if (cert.Domain && cert.Domain.Main === DOMAIN) {
        return true;
      }
      // Check for SANs as well
      if (cert.domain && cert.domain.sans && cert.domain.sans.includes(DOMAIN)) {
        return true;
      }
      if (cert.Domain && cert.Domain.SANs && cert.Domain.SANs.includes(DOMAIN)) {
        return true;
      }
      return false;
    });
    
    if (!domainCert) {
      console.log(`No certificate found for domain: ${DOMAIN}`);
      return false;
    }
    
    // Extract key and certificate from Traefik's format
    // Handle different property capitalizations based on Traefik version
    let key, certificate;
    
    // Check certificate properties - could be camelCase or PascalCase
    if (domainCert.key) {
      key = domainCert.key;
    } else if (domainCert.Key) {
      key = domainCert.Key;
    } else {
      console.error('No key found in certificate');
      return false;
    }
    
    if (domainCert.certificate) {
      certificate = domainCert.certificate;
    } else if (domainCert.Certificate) {
      certificate = domainCert.Certificate;
    } else {
      console.error('No certificate found in certificate object');
      return false;
    }
    
    // Write the key and certificate to separate files
    const keyPath = path.join(CERT_OUTPUT_DIR, `${DOMAIN}.key`);
    const certPath = path.join(CERT_OUTPUT_DIR, `${DOMAIN}.crt`);
    
    fs.writeFileSync(keyPath, key);
    fs.writeFileSync(certPath, certificate);
    console.log(`Certificates extracted successfully to ${CERT_OUTPUT_DIR}`);
    
    // Update the configuration file to point to the new certificates
    updateConfiguration(keyPath, certPath);
    
    return true;
  } catch (error) {
    console.error('Error processing certificate:', error);
    return false;
  }
}

/**
 * Update the Kill the Newsletter configuration to use the new certificates
 */
function updateConfiguration(keyPath, certPath) {
  try {
    // Skip if config file doesn't exist yet
    if (!fs.existsSync(CONFIG_PATH)) {
      console.log(`Config file doesn't exist yet: ${CONFIG_PATH}`);
      return;
    }
    
    let configContent = fs.readFileSync(CONFIG_PATH, 'utf8');
    
    // Safely parse the ESM config file
    // Strategy: Look for the export default statement and extract the object
    const configMatch = configContent.match(/export\s+default\s+({[\s\S]*});?/);
    if (!configMatch) {
      console.error('Could not parse configuration file format');
      return;
    }
    
    // Safer approach: use JSON to parse and update the config
    // First, try to convert the config object to proper JSON
    let configObjectStr = configMatch[1];
    
    // Replace the key/cert paths in the original content
    const updatedContent = configContent.replace(
      /"key"\s*:\s*"[^"]*"/g, 
      `"key": "${keyPath.replace(/\\/g, '\\\\')}"`
    ).replace(
      /"certificate"\s*:\s*"[^"]*"/g, 
      `"certificate": "${certPath.replace(/\\/g, '\\\\')}"`
    );
    
    // Write the updated configuration
    fs.writeFileSync(CONFIG_PATH, updatedContent);
    console.log('Configuration file updated successfully');
    
    // Signal the application to reload by touching the config file
    // This avoids having to send signals directly to the process
    try {
      const now = new Date();
      fs.utimesSync(CONFIG_PATH, now, now);
      console.log('Updated config file timestamp to trigger reload');
    } catch (signalError) {
      console.log('Failed to update config timestamp:', signalError);
    }
  } catch (error) {
    console.error('Error updating configuration:', error);
  }
}

// Look for and process any existing certificates immediately
console.log(`Checking for existing certificates in ${TRAEFIK_CERTS_PATH}...`);

try {
  // Find all JSON files in the Traefik certs directory
  const existingCertFiles = fs.readdirSync(TRAEFIK_CERTS_PATH)
    .filter(file => file.endsWith('.json'));
  
  console.log(`Found ${existingCertFiles.length} certificate files.`);
  
  let processedCert = false;
  for (const file of existingCertFiles) {
    const certPath = path.join(TRAEFIK_CERTS_PATH, file);
    processedCert = extractCertificates(certPath) || processedCert;
  }
  
  if (!processedCert) {
    console.log('No valid certificates found for our domain. Will wait for Traefik to generate them.');
  }
} catch (error) {
  console.error(`Error reading cert directory: ${error.message}`);
}

// Set up watcher to monitor for certificate changes
console.log(`Setting up watcher for certificate changes...`);

const watcher = chokidar.watch(`${TRAEFIK_CERTS_PATH}/*.json`, {
  persistent: true,
  ignoreInitial: true,
  awaitWriteFinish: {
    stabilityThreshold: 2000,
    pollInterval: 100
  }
});

watcher.on('add', path => {
  console.log(`Certificate file added: ${path}`);
  extractCertificates(path);
});

watcher.on('change', path => {
  console.log(`Certificate file changed: ${path}`);
  extractCertificates(path);
});

watcher.on('error', error => {
  console.error(`Watcher error: ${error}`);
});

console.log(`Watcher started. Monitoring ${TRAEFIK_CERTS_PATH} for certificate changes...`);

// Keep the process running
process.on('SIGINT', () => {
  console.log('Shutting down certificate monitor...');
  watcher.close();
  process.exit(0);
});

// Log that we're running
console.log(`Traefik Certificate Monitor running for domain: ${DOMAIN}`);