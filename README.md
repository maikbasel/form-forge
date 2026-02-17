# Form Forge

[![Backend CI](https://github.com/maikbasel/form-forge/workflows/Backend%20CI/badge.svg)](https://github.com/maikbasel/form-forge/actions/workflows/backend-ci.yml)
[![Frontend CI](https://github.com/maikbasel/form-forge/workflows/Frontend%20CI/badge.svg)](https://github.com/maikbasel/form-forge/actions/workflows/frontend-ci.yml)
[![Playwright Tests](https://github.com/maikbasel/form-forge/workflows/Playwright%20Tests/badge.svg)](https://github.com/maikbasel/form-forge/actions/workflows/playwright.yml)

A PDF form processing application that enables non-technical D&D 5e players to add dynamic calculations to their PDF
character sheets without writing JavaScript or understanding PDF AcroForm internals.

## What It Does

Users upload a PDF character sheet, the application extracts form fields, and provides a visual interface to map
calculations between fields (e.g., `Strength modifier = (Strength score - 10) / 2`). The application generates the
necessary JavaScript and embeds it into the PDF AcroForm structure.

## Tech Stack

**Backend (Rust):**

- Actix-Web for HTTP API
- SQLx with PostgreSQL for persistence
- lopdf for PDF parsing and manipulation
- Hexagonal architecture

**Frontend (TypeScript):**

- React 19 + Next.js (App Router) for web
- Tauri for desktop application
- Turborepo monorepo with pnpm workspaces
- shadcn/ui components + Tailwind CSS

## Prerequisites

- Rust (stable toolchain)
- Docker + Docker Compose

**Recommended: Install via asdf** (version manager)

The following tools are managed via asdf (see `.tool-versions`):
- Node.js 23.10.0
- pnpm 9.15.5
- just 1.43.1
- Python 3.13.1 (required for pre-commit)
- pre-commit 4.0.1

```bash
# Install asdf plugins and tools
asdf plugin add nodejs
asdf plugin add pnpm
asdf plugin add just
asdf plugin add python
asdf plugin add pre-commit

# Install all versions from .tool-versions
asdf install
```

## Setup

```bash
# Clone and install dependencies
pnpm install

# Configure environment
cp .env.example .env
# Edit .env if needed (defaults work for local development)

# Start PostgreSQL
just up

# Run backend + web frontend
just dev
```

Access points:

- Web: http://localhost:3000
- API: http://localhost:8081
- Swagger UI: http://localhost:8081/swagger-ui/
- Adminer: http://localhost:8082

## Development

### Commands

```bash
# Full stack
just dev              # Backend + web frontend
just up               # Start Docker infrastructure only
just down             # Stop Docker infrastructure

# Backend only
just be               # Run API server
cd apps/api && cargo test
cd apps/api && cargo fmt --all
cd apps/api && cargo clippy --workspace --all-targets --all-features -- -D warnings

# Frontend only
just web              # Next.js web app
just native           # Tauri desktop app
pnpm build            # Build all packages
pnpm lint             # Lint all packages
pnpm check-types      # Type checking
pnpm exec ultracite fix     # Format/fix (Biome-based)
pnpm exec ultracite check   # Check for issues without fixing
```

### Code Quality

- **Rust**: Uses rustfmt and clippy (enforced via pre-commit hooks)
- **TypeScript**: Uses Ultracite (Biome preset) for formatting and linting

**Pre-commit Hooks Setup:**

If you installed via asdf (recommended), pre-commit is already available. Just run:

```bash
pre-commit install
```

This installs git hooks that automatically run on every commit:
- Backend: `cargo fmt --check`, `cargo clippy`, `cargo check`
- Frontend: `pnpm exec ultracite fix`

## Project Structure

```
apps/
  api/              # Rust backend
    crates/
      sheets/       # PDF upload, storage, field extraction
      actions/      # JavaScript action attachment
      common/       # Shared utilities (DB, telemetry, errors)
  web/              # Next.js web application
  native/           # Tauri desktop application

packages/
  ui/               # Shared React component library
  typescript-config/# Shared TypeScript configs
```

### Architecture

The backend uses hexagonal architecture with two bounded contexts:

- **Sheets**: Handles PDF form upload, storage, and field extraction
- **Actions**: Handles JavaScript action generation and PDF modification

See [Development Guide](.claude/CLAUDE.md) for detailed architecture documentation.

## Deployment

### Docker Compose

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

### OpenTelemetry / Observability

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

**Document TTL**: Uploaded PDFs are automatically deleted after 1 day (configurable via `config/lifecycle.json`). Database records are cleaned up via S3 webhook notifications and hourly reconciliation.

## Database

PostgreSQL runs on port 5434 (local) or 5432 (Docker). Migrations auto-run on API startup via SQLx.

Manual migration commands:

```bash
cd apps/api
sqlx migrate run
sqlx migrate revert
```

## Testing

### Backend (Rust)

```bash
# Run all tests (includes testcontainers for integration tests)
cd apps/api && cargo test

# Run specific test
cd apps/api && cargo test <test_name>

# Run tests for specific crate
cd apps/api && cargo test -p <crate_name>
# Example: cd apps/api && cargo test -p sheets-core
```

**Testing stack:**

- `rstest` for parameterized tests
- `testcontainers` for PostgreSQL integration tests
- `mockall` for mocking port traits (via `#[cfg_attr(test, automock)]`)
- `pretty_assertions` for test assertions

### Frontend (TypeScript)

The monorepo uses Turborepo for orchestrating tests across packages.

```bash
# Run all tests across the monorepo (using Turborepo)
pnpm test

# Run tests for specific package
pnpm --filter <package-name> test

# Examples:
# pnpm --filter web test
# pnpm --filter ui test
```

### E2E Tests

E2E tests use Playwright across Chromium, Firefox, and WebKit.

**Local** (headed browsers, requires Rust toolchain + Playwright browsers installed):

```bash
pnpm test:e2e
```

**Docker** (headless, requires only Docker):

```bash
pnpm test:e2e:docker    # Run tests
pnpm test:e2e:docker:down  # Clean up containers/volumes

# Or using just (runs + cleans up automatically):
just test-e2e-docker
```

## API Documentation

Interactive OpenAPI/Swagger UI available at `/swagger-ui/` when the backend is running.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make changes following code quality standards (Ultracite/Clippy)
4. Run tests and linting
5. Submit a pull request

## TO DO

- [x] When mapping selected fields to roles in the calc, move fields down when they were mapped. This way the user
  doesn't need to scroll down.
- [x] ~~Show tooltips on hover for form fields.~~ (Fields are highlighted on hover now)
- [x] Use S3-compatible storage for PDF files and update API.
- [x] Loading indicator when clicking "Attach Calculation" button.
- [x] Add some way to make it easier for users to identify which selected field contains what character information.
- [x] ~~BE `GET /sheets/{id}/fields` should also return field type to use as additional hint/validation during field role
  mapping.~~
- [ ] Add product tour.
- [ ] Implement native application.
- [x] Generate API client from OpenAPI specification.
- [ ] Generate docker images in ci.
- [x] Implement release workflow
- [ ] Setup demo
- [x] implement ttl for uploaded files
- [ ] implement application/problem+json
- [x] dockerize playwright tests
- [ ] add translation
