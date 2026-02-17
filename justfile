set shell := ["bash", "-cu"]

backend_dir := "apps/api"
web_dir := "apps/web"
native_dir := "apps/native"
compose_file := "compose.dev.yml"

# List available recipes
default:
    @just --list

# Start Docker infrastructure (PostgreSQL + Adminer)
up:
    @echo "🐳 Starting Docker infrastructure..."
    docker compose -f {{compose_file}} up -d
    @echo "✅ Infrastructure is up!"

# Stop Docker infrastructure
down:
    @echo "🛑 Stopping Docker infrastructure..."
    docker compose -f {{compose_file}} down
    @echo "✅ Infrastructure stopped!"

# Run backend API server (Rust/Actix-Web on port 8081)
be:
    @echo "🦀 Starting backend..."
    cd {{backend_dir}} && RUST_LOG=debug cargo run

# Run web frontend (Next.js on port 3000)
web:
    @echo "⚛️  Starting web frontend..."
    cd {{web_dir}} && pnpm --filter web dev

# Run native frontend (Tauri desktop app)
native:
    @echo "📱 Starting native frontend..."
    cd {{native_dir}} && pnpm --filter native tauri dev

# Generate OpenAPI spec from Rust API
gen-openapi:
    @echo "📄 Generating OpenAPI spec..."
    cd {{backend_dir}} && cargo run --bin generate-openapi
    @echo "✅ OpenAPI spec generated at packages/api-spec/openapi.yaml"

# Generate TypeScript types from OpenAPI spec
gen-types:
    @echo "🔧 Generating TypeScript types..."
    cd packages/api-spec && pnpm generate
    @echo "✅ TypeScript types generated at packages/api-spec/types.ts"

# Generate both OpenAPI spec and TypeScript types
gen-api: gen-openapi gen-types

# Check if OpenAPI spec and types are in sync
check-api:
    @echo "🔍 Checking if API spec and types are up to date..."
    just gen-api
    @if git diff --quiet packages/api-spec/; then \
        echo "✅ API spec and types are in sync"; \
    else \
        echo "❌ API spec and types are out of sync!"; \
        echo "Changes detected:"; \
        git diff packages/api-spec/; \
        exit 1; \
    fi

# Start all services (Docker + backend + web)
dev:
    #!/usr/bin/env bash
    set -e

    # Always regenerate OpenAPI spec and types to ensure they're in sync
    echo "🔄 Regenerating OpenAPI spec and TypeScript types..."
    just gen-api

    # Cleanup function
    cleanup() {
        echo ""
        echo "🧹 Cleaning up..."
        just down
        # Kill background processes
        pkill -P $$ 2>/dev/null || true
        echo "✅ Cleanup complete"
        exit 0
    }

    # Set trap to run cleanup on script exit
    trap cleanup EXIT INT TERM

    just up

    # Wait for services to be ready
    sleep 2

    just be &
    BACKEND_PID=$!

    # Wait for backend to start
    sleep 2

    just web &
    FRONTEND_PID=$!

    echo ""
    echo "✨ All services running!"
    echo "   Backend PID: $BACKEND_PID"
    echo "   Frontend PID: $FRONTEND_PID"
    echo ""
    echo "💡 Press Ctrl+C to stop all services..."

    # Wait for any process to exit
    wait

# Run E2E tests in Docker (headless, requires only Docker)
e2e:
    #!/usr/bin/env bash
    set -e
    cleanup() {
        echo "Cleaning up E2E containers..."
        docker compose -f compose.e2e.yml --profile init down -v
    }
    trap cleanup EXIT
    # Build all images first
    DOCKER_BUILDKIT=1 docker compose -f compose.e2e.yml build
    # Start infrastructure and wait for it to be healthy
    docker compose -f compose.e2e.yml up -d db rustfs && docker compose -f compose.e2e.yml --profile init run --rm createbuckets
    # Run the stack (createbuckets excluded via profile, won't trigger --abort-on-container-exit)
    docker compose -f compose.e2e.yml up --no-build --abort-on-container-exit --exit-code-from playwright
