# Form Forge

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
- Node.js 23.10.0+
- pnpm 9.15.5+
- just (command runner)
- Docker + Docker Compose

Optional: asdf for version management (see `.tool-versions`)

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
- Install pre-commit hooks: `pre-commit install`

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

The repository includes Docker Compose configuration for local development. For production deployment:

```bash
# Start all services (PostgreSQL + API + Web)
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

**Environment variables** for production (create `.env` in project root):

```bash
# Database Configuration
POSTGRES_USER=postgres
POSTGRES_PASSWORD=password
POSTGRES_DB=form-forge
DB_HOST=db
DB_PORT=5432

# Backend Configuration
BIND_ADDR=0.0.0.0:8081
RUST_LOG=info

# Frontend Configuration
API_URL=http://localhost:8081
```

**Volumes**: PDF files are stored in `./data/storage` (configure via backend environment). Ensure this directory is
persisted in production.

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

## API Documentation

Interactive OpenAPI/Swagger UI available at `/swagger-ui/` when the backend is running.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make changes following code quality standards (Ultracite/Clippy)
4. Run tests and linting
5. Submit a pull request

## TO DO

- [ ] When mapping selected fields to roles in the calc, move fields down when they were mapped. This way the user
  doesn't need to scroll down.
- [ ] Show tooltips on hover for form fields. 
- [ ] Use S3-compatible storage for PDF files and update API.
- [ ] Implement native application.
- [ ] Loading indicator when clicking "Attach Calculation" button.
- [ ] Extract and display nearby label text as hints for selected fields when mapping them to roles in the calculation.
- [ ] BE `GET /sheets/{id}/fields` should also return field type to use as additional hint/validation during field role 
  mapping.
- [ ] Add product tour.
- [ ] Implement native application.