# Kill the Newsletter Docker

This project provides a Docker container for [Kill the Newsletter](https://github.com/leafac/kill-the-newsletter) that works with both Traefik and Caddy for SSL certificate management.

Kill the Newsletter is a service that converts email newsletters into Atom feeds, allowing you to read newsletters in your feed reader instead of your email inbox.

## Features

- Dockerized Kill the Newsletter service
- Flexible certificate management:
  - Works with Traefik's certificate store (recommended for Traefik users)
  - Works with the original Caddy-based certificate management (default)
- Certificate monitoring for real-time updates when using Traefik
- Persistent storage for feeds and configuration
- Supports both Traefik and Caddy ecosystems

## Requirements

- Docker and Docker Compose
- Either Traefik or Caddy as a reverse proxy with SSL certificate management
- A domain name pointing to your server
- Port 25 available for the SMTP server (often blocked by ISPs for residential connections)

## Installation

1. Clone this repository:

```bash
git clone https://github.com/yourusername/kill-the-newsletter-docker.git
cd kill-the-newsletter-docker
```

2. Update the domain name in `docker-compose.yml`:

```yaml
environment:
  - DOMAIN=newsletter.example.com  # Change to your domain
  - ADMIN_EMAIL=admin@example.com  # Change to your email
  - USE_TRAEFIK=true               # Set to true for Traefik, false for Caddy (default: false)
```

3. Update the Traefik or Caddy configuration as needed in the compose file.

4. Build and start the container:

```bash
docker-compose up -d
```

## Configuration

The container uses the following environment variables:

- `DOMAIN`: Your domain name (e.g., `newsletter.example.com`)
- `ADMIN_EMAIL`: Admin email address for notifications
- `NODE_ENV`: Runtime environment (`production` or `development`)
- `USE_TRAEFIK`: Whether to use Traefik for certificate management (default: `false`)
- `TRAEFIK_CERTS_PATH`: Path to Traefik certificates inside the container (default: `/traefik-certs`)
- `CERT_OUTPUT_DIR`: Path where extracted certificates are stored (default: `/app/certs`)
- `CONFIG_PATH`: Path to the Kill the Newsletter configuration file (default: `/config/configuration.mjs`)
- `STORAGE_PATH`: Path to store application data (default: `/config/storage`)
- `PORT`: HTTP port for the web interface (default: `3000`)

## Certificate Management Options

### Using Traefik (USE_TRAEFIK=true)

1. The container mounts Traefik's certificate store (`acme.json`) at `/traefik-certs`
2. A certificate monitor script watches for changes to this file
3. When changes are detected, the monitor extracts the domain certificate and key
4. The application's configuration is updated to point to these extracted certificates
5. The application is signaled to reload and use the new certificates

Example configuration in docker-compose.yml:

```yaml
services:
  kill-the-newsletter:
    environment:
      - USE_TRAEFIK=true
    volumes:
      - traefik-certs:/traefik-certs:ro
```

### Using Caddy (USE_TRAEFIK=false, default)

When using Caddy (the default method):

1. The container relies on the original Kill the Newsletter implementation
2. Certificates are managed by the integrated Caddy server
3. No additional configuration is needed

Example configuration in docker-compose.yml:

```yaml
services:
  kill-the-newsletter:
    environment:
      - USE_TRAEFIK=false  # This is the default
```

## DNS Configuration

Ensure your DNS records include:

1. An A record for your domain pointing to your server's IP
2. An MX record for your domain pointing to your domain (for email delivery)

Example:

```
newsletter.example.com.  IN  A     123.456.789.10
newsletter.example.com.  IN  MX 10 newsletter.example.com.
```

## Security Considerations

- Port 25 (SMTP) is exposed to receive emails. Make sure your firewall is properly configured.
- The container requires read-only access to certificate stores.
- Consider implementing SPAM filtering if making this service public.

## Troubleshooting

### Certificate Issues

If you encounter certificate issues:

1. Check your reverse proxy logs to ensure certificates are being acquired properly
2. If using Traefik, verify the certificate monitor is extracting certificates correctly:
   ```bash
   docker-compose logs kill-the-newsletter | grep "certificate"
   ```
3. Ensure your domain is correctly configured in the `DOMAIN` environment variable

### Email Reception Issues

If emails aren't being received:

1. Verify your MX record is correctly set up
2. Check if port 25 is open and accessible
3. Some email providers may block sending to non-standard MX records

## Updates

To update to a new version of Kill the Newsletter:

1. Update the `VERSION` in your docker-compose.yml
2. Rebuild and restart the container:

```bash
docker-compose down
docker-compose up -d --build
```

## License

This Docker wrapper is provided under the MIT License. Kill the Newsletter is created by Leandro Facchinetti and is also under the MIT License.