# Form Forge - Development Guide

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Form Forge is a PDF form processing application with a Rust backend and TypeScript frontend monorepo. The application allows users to upload PDF forms, extract form fields, and attach JavaScript actions (like calculations) to those fields.

---

# Code Standards (Ultracite)

This project uses **Ultracite**, a zero-config Biome preset that enforces strict code quality standards through automated formatting and linting.

## Quick Reference

- **Format code**: `npx ultracite fix`
- **Check for issues**: `npx ultracite check`
- **Diagnose setup**: `npx ultracite doctor`

Biome (the underlying engine) provides extremely fast Rust-based linting and formatting. Most issues are automatically fixable.

---

## Core Principles

Write code that is **accessible, performant, type-safe, and maintainable**. Focus on clarity and explicit intent over brevity.

### Type Safety & Explicitness

- Use explicit types for function parameters and return values when they enhance clarity
- Prefer `unknown` over `any` when the type is genuinely unknown
- Use const assertions (`as const`) for immutable values and literal types
- Leverage TypeScript's type narrowing instead of type assertions
- Use meaningful variable names instead of magic numbers - extract constants with descriptive names

### Modern JavaScript/TypeScript

- Use arrow functions for callbacks and short functions
- Prefer `for...of` loops over `.forEach()` and indexed `for` loops
- Use optional chaining (`?.`) and nullish coalescing (`??`) for safer property access
- Prefer template literals over string concatenation
- Use destructuring for object and array assignments
- Use `const` by default, `let` only when reassignment is needed, never `var`

### Async & Promises

- Always `await` promises in async functions - don't forget to use the return value
- Use `async/await` syntax instead of promise chains for better readability
- Handle errors appropriately in async code with try-catch blocks
- Don't use async functions as Promise executors

### React & JSX

- Use function components over class components
- Call hooks at the top level only, never conditionally
- Specify all dependencies in hook dependency arrays correctly
- Use the `key` prop for elements in iterables (prefer unique IDs over array indices)
- Nest children between opening and closing tags instead of passing as props
- Don't define components inside other components
- Use semantic HTML and ARIA attributes for accessibility:
  - Provide meaningful alt text for images
  - Use proper heading hierarchy
  - Add labels for form inputs
  - Include keyboard event handlers alongside mouse events
  - Use semantic elements (`<button>`, `<nav>`, etc.) instead of divs with roles

### Error Handling & Debugging

- Remove `console.log`, `debugger`, and `alert` statements from production code
- Throw `Error` objects with descriptive messages, not strings or other values
- Use `try-catch` blocks meaningfully - don't catch errors just to rethrow them
- Prefer early returns over nested conditionals for error cases

### Code Organization

- Keep functions focused and under reasonable cognitive complexity limits
- Extract complex conditions into well-named boolean variables
- Use early returns to reduce nesting
- Prefer simple conditionals over nested ternary operators
- Group related code together and separate concerns

### Security

- Add `rel="noopener"` when using `target="_blank"` on links
- Avoid `dangerouslySetInnerHTML` unless absolutely necessary
- Don't use `eval()` or assign directly to `document.cookie`
- Validate and sanitize user input

### Performance

- Avoid spread syntax in accumulators within loops
- Use top-level regex literals instead of creating them in loops
- Prefer specific imports over namespace imports
- Avoid barrel files (index files that re-export everything)
- Use proper image components (e.g., Next.js `<Image>`) over `<img>` tags

### Framework-Specific Guidance

**Next.js:**
- Use Next.js `<Image>` component for images
- Use `next/head` or App Router metadata API for head elements
- Use Server Components for async data fetching instead of async Client Components

**React 19+:**
- Use ref as a prop instead of `React.forwardRef`

**Solid/Svelte/Vue/Qwik:**
- Use `class` and `for` attributes (not `className` or `htmlFor`)

---

## Testing

- Write assertions inside `it()` or `test()` blocks
- Avoid done callbacks in async tests - use async/await instead
- Don't use `.only` or `.skip` in committed code
- Keep test suites reasonably flat - avoid excessive `describe` nesting

## When Biome Can't Help

Biome's linter will catch most issues automatically. Focus your attention on:

1. **Business logic correctness** - Biome can't validate your algorithms
2. **Meaningful naming** - Use descriptive names for functions, variables, and types
3. **Architecture decisions** - Component structure, data flow, and API design
4. **Edge cases** - Handle boundary conditions and error states
5. **User experience** - Accessibility, performance, and usability considerations
6. **Documentation** - Add comments for complex logic, but prefer self-documenting code

---

Most formatting and common issues are automatically fixed by Biome. Run `npx ultracite fix` before committing to ensure compliance.

---

# Development Commands

## Full Stack Development

```bash
# Start all services (backend API, web frontend, and Docker infrastructure)
just dev

# Start Docker infrastructure only (PostgreSQL + Adminer)
just up

# Stop Docker infrastructure
just down
```

## Backend (Rust/Actix-Web)

```bash
# Run backend API server (from project root)
just be
# Or: cd apps/api && cargo run

# Run all tests
cd apps/api && cargo test

# Run specific test
cd apps/api && cargo test <test_name>

# Run tests in specific crate
cd apps/api && cargo test -p <crate_name>

# Format code
cd apps/api && cargo fmt --all

# Lint with Clippy
cd apps/api && cargo clippy --workspace --all-targets --all-features -- -D warnings

# Check code without building
cd apps/api && cargo check --workspace --all-features --all-targets
```

## Frontend (TypeScript/Turborepo)

```bash
# Run web frontend (Next.js on port 3000)
just web
# Or: pnpm --filter web dev

# Run native frontend (Tauri)
just native
# Or: pnpm --filter native tauri dev

# Build all frontend packages
pnpm build

# Lint all packages
pnpm lint

# Type checking
pnpm check-types

# Format and fix code issues (Biome/Ultracite)
npx ultracite fix

# Check for issues
npx ultracite check

# Add shadcn/ui components
pnpm shadcn add <component>
```

---

# Architecture

## Backend - Hexagonal Architecture

The backend follows hexagonal/ports-and-adapters architecture with two main bounded contexts:

**Sheets Context** - Handles PDF form upload, storage, and field extraction:
- `apps/api/crates/sheets/core` - Domain logic and port definitions
  - `ports/driving` - Service interfaces (e.g., `SheetService`)
  - `ports/driven` - Adapter interfaces (`SheetStoragePort`, `SheetReferencePort`, `SheetPdfPort`)
- `apps/api/crates/sheets/adapters/web` - HTTP handlers (Actix-Web)
- `apps/api/crates/sheets/adapters/db` - PostgreSQL persistence (SQLx)
- `apps/api/crates/sheets/adapters/storage` - File system storage
- `apps/api/crates/sheets/adapters/pdf` - PDF processing (lopdf)

**Actions Context** - Handles JavaScript action attachment to form fields:
- `apps/api/crates/actions/core` - Domain logic and port definitions
- `apps/api/crates/actions/adapters/web` - HTTP handlers
- `apps/api/crates/actions/adapters/pdf` - PDF modification with embedded JavaScript

**Common** - Shared utilities:
- `apps/api/crates/common` - Database config, telemetry, error handling

Key patterns:
- Traits define ports (interfaces) between layers
- `#[cfg_attr(test, automock)]` enables mocking adapters in tests
- Workspace dependencies centralized in root `Cargo.toml`
- Use `pretty_assertions` for test assertions (enforced by Clippy config)

## Frontend - Turborepo Monorepo

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

Key technologies:
- **State Management**: React Context API
- **Styling**: Tailwind CSS with shadcn/ui components
- **Drag & Drop**: dnd-kit library
- **UI Components**: shadcn/ui (Radix UI primitives)
- **Validation**: Zod for schema validation

## Data Flow

1. User uploads PDF via frontend (sheet-uploader component)
2. Backend `SheetService` validates PDF, generates UUID, stores file
3. Sheet reference persisted to PostgreSQL via `SheetReferencePort`
4. Frontend fetches form fields via `/sheets/{id}/form-fields` endpoint
5. User can attach calculation scripts to fields via Actions context
6. Modified PDF downloaded via `/sheets/{id}` endpoint

---

# Configuration

## Backend Environment

Create `apps/api/.env` based on `apps/api/.env.example`:
```
DATABASE_URL=postgres://postgres:postgres@localhost:5434/form-forge
BIND_ADDR=127.0.0.1:8081
```

PostgreSQL runs on port 5434 (not default 5432) via Docker Compose.

---

# Testing

## Backend
- Uses `rstest` for parameterized tests
- Uses `testcontainers` for integration tests with PostgreSQL
- Mocking with `mockall` on port traits
- Use `pretty_assertions::assert_eq!` instead of `std::assert_eq!`

## Frontend
- Assertions must be inside `it()` or `test()` blocks
- Use async/await instead of done callbacks
- Never commit `.only` or `.skip` in test code

---

# Infrastructure

- **Database**: PostgreSQL 17 (port 5434)
- **Admin UI**: Adminer on port 8082
- **Backend API**: port 8081 (configurable via BIND_ADDR)
- **Web Frontend**: port 3000
- **Migrations**: SQLx migrations in `apps/api/migrations/`

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
