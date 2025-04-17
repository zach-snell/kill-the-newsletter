# kill-the-newsletter

Self-hosted Kill the Newsletter container, built LinuxServer.io-style.

## Usage

```bash
docker run -d \
  -v $(pwd)/config:/config \
  -p 3000:3000 \
  ghcr.io/zach-snell/kill-the-newsletter:latest
```

- **/config**: mount your configuration (.env, example, storage)
- The container will generate `/config/configuration/<NODE_ENV>.mjs` from env vars at startup, **unless it already exists**.

## Configuration via ENV

| ENV Var       | Description                  | Default            |
| ------------- | ---------------------------- | ------------------ |
| `HOSTNAME`    | HTTP server hostname         | `0.0.0.0`          |
| `PORT`        | HTTP server port             | `3000`             |
| `SECRET_KEY`  | Application secret           | `CHANGE_ME`        |
| `SMTP_HOST`   | SMTP host for sending email  | `smtp.example.com` |
| `SMTP_PORT`   | SMTP port                    | `587`              |
| `SMTP_SECURE` | Use secure SMTP (true/false) | `false`            |
| `SMTP_USER`   | SMTP username                | `user@example.com` |
| `SMTP_PASS`   | SMTP password                | `password`         |

Copy `.env` to set your values.

## Custom Config File

Alternatively, you may mount your own `.mjs` config file at:

```
/config/configuration/<NODE_ENV>.mjs
```

This file will **not be overwritten** if it exists.

## Version Pinning

To pin a release, edit `build/version.env` and rebuild:

```bash
docker build \
  --build-arg VERSION=$(cat build/version.env | cut -d= -f2) \
  -t ghcr.io/zach-snell/kill-the-newsletter:latest .
```