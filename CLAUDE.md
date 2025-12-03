# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Form Forge is a PDF form processing application with a Rust backend and TypeScript frontend monorepo. The application allows users to upload PDF forms, extract form fields, and attach JavaScript actions (like calculations) to those fields.

## Development Commands

### Full Stack Development

```bash
# Start all services (backend, web frontend, and Docker infrastructure)
just dev

# Start Docker infrastructure only (PostgreSQL + Adminer)
just up

# Stop Docker infrastructure
just down
```

### Backend (Rust/Actix-Web)

```bash
# Run backend server (from project root)
just be
# Or: cd backend && cargo run

# Run all tests
cd backend && cargo test

# Run specific test
cd backend && cargo test <test_name>

# Run tests in specific crate
cd backend && cargo test -p <crate_name>

# Format code
cd backend && cargo fmt --all

# Lint with Clippy
cd backend && cargo clippy --workspace --all-targets --all-features -- -D warnings

# Check code without building
cd backend && cargo check --workspace --all-features --all-targets
```

### Frontend (TypeScript/Turborepo)

```bash
# Run web frontend (Next.js on port 3000)
just web
# Or: cd frontend && pnpm --filter web dev

# Run native frontend (Tauri)
just native
# Or: cd frontend && pnpm --filter native tauri dev

# Build all frontend packages
cd frontend && pnpm build

# Lint all packages
cd frontend && pnpm lint

# Type checking
cd frontend && pnpm check-types

# Format and fix code issues (Biome/Ultracite)
cd frontend && npx ultracite fix

# Check for issues
cd frontend && npx ultracite check

# Add shadcn/ui components
cd frontend && pnpm shadcn add <component>
```

## Architecture

### Backend - Hexagonal Architecture

The backend follows hexagonal/ports-and-adapters architecture with two main bounded contexts:

**Sheets Context** - Handles PDF form upload, storage, and field extraction:
- `sheets/core` - Domain logic and port definitions
  - `ports/driving` - Service interfaces (e.g., `SheetService`)
  - `ports/driven` - Adapter interfaces (`SheetStoragePort`, `SheetReferencePort`, `SheetPdfPort`)
- `sheets/adapters/web` - HTTP handlers (Actix-Web)
- `sheets/adapters/db` - PostgreSQL persistence (SQLx)
- `sheets/adapters/storage` - File system storage
- `sheets/adapters/pdf` - PDF processing (lopdf)

**Actions Context** - Handles JavaScript action attachment to form fields:
- `actions/core` - Domain logic and port definitions
- `actions/adapters/web` - HTTP handlers
- `actions/adapters/pdf` - PDF modification with embedded JavaScript

**Common** - Shared utilities:
- `common` - Database config, telemetry, error handling

Key patterns:
- Traits define ports (interfaces) between layers
- `#[cfg_attr(test, automock)]` enables mocking adapters in tests
- Workspace dependencies centralized in root `Cargo.toml`
- Use `pretty_assertions` for test assertions (enforced by Clippy config)

### Frontend - Turborepo Monorepo

Organized as a pnpm workspace managed by Turborepo:

**Apps**:
- `apps/web` - Next.js web application (App Router, React 19)
- `apps/native` - Tauri desktop application (Vite + React)

**Packages**:
- `packages/ui` - Shared React components library
  - `src/views/` - High-level view components (sheet-uploader, sheet-viewer, etc.)
  - `src/components/` - Reusable UI components (shadcn/ui based)
  - `src/context/` - React contexts (e.g., sheet-context)
- `packages/typescript-config` - Shared TypeScript configurations
- `packages/eslint-config` - Shared ESLint configurations

Key technologies:
- **State Management**: React Context API
- **Styling**: Tailwind CSS with shadcn/ui components
- **Drag & Drop**: dnd-kit library
- **UI Components**: shadcn/ui (Radix UI primitives)
- **Validation**: Zod for schema validation

### Data Flow

1. User uploads PDF via frontend (sheet-uploader component)
2. Backend `SheetService` validates PDF, generates UUID, stores file
3. Sheet reference persisted to PostgreSQL via `SheetReferencePort`
4. Frontend fetches form fields via `/sheets/{id}/form-fields` endpoint
5. User can attach calculation scripts to fields via Actions context
6. Modified PDF downloaded via `/sheets/{id}` endpoint

## Configuration

### Backend Environment

Create `backend/.env` based on `backend/.env.example`:
```
DATABASE_URL=postgres://postgres:postgres@localhost:5434/form-forge
BIND_ADDR=127.0.0.1:8081
```

PostgreSQL runs on port 5434 (not default 5432) via Docker Compose.

### Frontend Code Standards

This project uses **Ultracite** (Biome preset) for strict code quality. See `frontend/.claude/CLAUDE.md` for detailed standards covering:
- Type safety and explicitness
- Modern JavaScript/TypeScript patterns
- React 19 best practices (function components, hooks, ref as prop)
- Accessibility requirements (semantic HTML, ARIA attributes)
- Security practices
- Performance optimization

Run `npx ultracite fix` before committing to auto-fix most issues.

## Testing

### Backend
- Uses `rstest` for parameterized tests
- Uses `testcontainers` for integration tests with PostgreSQL
- Mocking with `mockall` on port traits
- Use `pretty_assertions::assert_eq!` instead of `std::assert_eq!`

### Frontend
- Assertions must be inside `it()` or `test()` blocks
- Use async/await instead of done callbacks
- Never commit `.only` or `.skip` in test code

## Infrastructure

- **Database**: PostgreSQL 17 (port 5434)
- **Admin UI**: Adminer on port 8082
- **Backend API**: port 8081 (configurable via BIND_ADDR)
- **Web Frontend**: port 3000
- **Migrations**: SQLx migrations in `backend/migrations/`

Run migrations automatically on server startup via `sqlx::migrate!()`.

## API Documentation

Backend provides OpenAPI/Swagger UI at `/swagger-ui/` when running (via utoipa).

## Pre-commit Hooks

Pre-commit hooks run on commits (defined in `.pre-commit-config.yaml`):
- `cargo fmt --check` (Rust formatting)
- `cargo clippy` (Rust linting)
- `cargo check` (Rust compilation check)

Install with: `pre-commit install`

## Tool Versions

Managed via asdf (`.tool-versions`):
- pnpm 9.15.5
- Node.js 23.10.0
- just 1.43.1

Backend uses stable Rust toolchain with rustfmt and clippy components.