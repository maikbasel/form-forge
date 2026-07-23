# Self-Hosting

Run the Form Forge web stack with Docker Compose. This page covers the whole
setup: prerequisites, deployment, configuration, backups, and troubleshooting.
Use the table of contents on the right to jump between sections.

!!! tip "Quick start"
    Clone the repo, copy `.env.example` to `.env` and set the required secrets,
    then run `docker compose -f compose.prod.yml up --build -d`. The
    [Docker Compose](#docker-compose) and [Configuration](#configuration)
    sections below spell each step out.

Pick the route that fits you:

| Route | Best for | Effort |
| --- | --- | --- |
| **Docker Compose** (this page) | Hosting for yourself or your table on a server | Moderate |
| **[Desktop app](desktop.md)** | Solo use with no server to run | Lowest |

## Prerequisites

To self-host Form Forge you need:

- **Docker** and **Docker Compose v2**
- A **domain name** and reverse-proxy/TLS termination if exposing publicly
  (the production stack ships an nginx reverse proxy)

Clone the repository:

```bash
git clone https://github.com/maikbasel/form-forge.git
cd form-forge
```

!!! note "Building the desktop app instead?"
    If you want to build the Tauri native desktop app from source rather than
    self-hosting the web stack, see the
    [Tauri v2 system dependencies](https://v2.tauri.app/start/prerequisites/)
    for your platform.

## Docker Compose

The repository includes three Docker Compose configurations:

- `compose.dev.yml` - Development (used by `just up`)
- `compose.prod.yml` - Production (full stack with nginx reverse proxy)
- `compose.e2e.yml` - E2E testing (full stack with Playwright runner)

**Development** (infrastructure only):

```bash
just up    # Start PostgreSQL + RustFS + Adminer
just down  # Stop infrastructure
```

**Production** (full stack):

```bash
# Configure environment (see .env.example)
cp .env.example .env
# Edit .env with production values

# Build and start all services
docker compose -f compose.prod.yml up --build -d

# View logs
docker compose -f compose.prod.yml logs -f

# Stop services
docker compose -f compose.prod.yml down
```

**Production access points** (behind nginx reverse proxy):

- Web UI: `https://<domain>/`
- API: `https://<domain>/sheets`, `https://<domain>/dnd5e`
- Swagger UI: `https://<domain>/swagger-ui/`
- S3 Console: `https://<domain>/s3-console` (redirects to RustFS admin UI, login with `S3_ACCESS_KEY` / `S3_SECRET_KEY`)

## Configuration

Configure these in `.env` (copy `.env.example`).

```bash
cp .env.example .env
```

**Required environment variables** for production:

```bash
# Database (required)
POSTGRES_PASSWORD=your-secure-password

# S3 Storage (required)
S3_ACCESS_KEY=your-access-key
S3_SECRET_KEY=your-secret-key
S3_PUBLIC_ENDPOINT=https://yourdomain.com/s3  # Public URL for downloads

# Optional
POSTGRES_USER=postgres        # default: postgres
POSTGRES_DB=form-forge        # default: form-forge
S3_BUCKET=form-forge          # default: form-forge
HTTP_PORT=80                  # default: 80
RUST_LOG=info                 # default: info
S3_LIFECYCLE_EXPIRATION_DAYS=7  # default: 7

# OpenTelemetry (optional)
OTEL_EXPORTER_OTLP_ENDPOINT=http://your-signoz:4318
OTEL_SERVICE_NAME=form-forge-api  # default: form-forge-api
```

**Document TTL**: Uploaded PDFs are automatically deleted after 1 day (configurable via `config/lifecycle.json`). Database records are cleaned up via S3 webhook notifications and hourly reconciliation.

## Observability

The backend supports exporting traces and metrics via OpenTelemetry. This is **disabled by default** and can be enabled at runtime.

**To enable:** Set `OTEL_EXPORTER_OTLP_ENDPOINT` in your `.env` file:

```bash
# For SigNoz
OTEL_EXPORTER_OTLP_ENDPOINT=http://signoz-otel-collector:4318

# For Jaeger
OTEL_EXPORTER_OTLP_ENDPOINT=http://jaeger:4318

# Optionally customize service name (default: form-forge-api)
OTEL_SERVICE_NAME=my-form-forge-instance
```

**To disable:** Leave `OTEL_EXPORTER_OTLP_ENDPOINT` unset or empty. No traces or metrics will be exported.

## Backup & restore

The PostgreSQL database is the state worth backing up. It holds your sheet
references and attached calculations. Uploaded PDFs in S3 storage are transient
by design: they expire after `S3_LIFECYCLE_EXPIRATION_DAYS` (default 1 day), so
there is no long-lived file data to preserve.

**Back up the database** with `pg_dump` against the running container:

```bash
docker compose -f compose.prod.yml exec -T db \
  pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB" > form-forge-backup.sql
```

**Restore** it into a running stack:

```bash
docker compose -f compose.prod.yml exec -T db \
  psql -U "$POSTGRES_USER" "$POSTGRES_DB" < form-forge-backup.sql
```

Run backups on a schedule (for example a nightly `cron` job) and keep the dumps
off the host. The database volume itself (`postgres_data`) can also be snapshot
with your usual volume-backup tooling if you prefer image-level backups.

## Troubleshooting

**The site doesn't load.** Check the containers are healthy and the port is
free:

```bash
docker compose -f compose.prod.yml ps
docker compose -f compose.prod.yml logs -f api
```

If another service already uses port 80, set `HTTP_PORT` in `.env` to a free
port and restart.

**Downloads fail or produce broken links.** `S3_PUBLIC_ENDPOINT` must be the
URL that browsers can actually reach, not an internal container address. Set it
to your public domain's S3 path (for example `https://yourdomain.com/s3`) and
recreate the stack.

**The API can't reach the database.** Confirm `POSTGRES_PASSWORD` in `.env`
matches what the `db` container was first created with. If you changed the
password after the volume was created, either set it back or recreate the
volume with `docker compose -f compose.prod.yml down -v` (this deletes the
database, so back it up first).

**Migrations.** The API runs database migrations automatically on startup, so
a fresh database is set up on first boot. If the API exits complaining about
the schema, check its logs for the failing migration.
