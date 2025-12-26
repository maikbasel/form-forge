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
    cd {{backend_dir}} && cargo run

# Run web frontend (Next.js on port 3000)
web:
    @echo "⚛️  Starting web frontend..."
    cd {{web_dir}} && pnpm --filter web dev

# Run native frontend (Tauri desktop app)
native:
    @echo "📱 Starting native frontend..."
    cd {{native_dir}} && pnpm --filter native tauri dev

# Start all services (Docker + backend + web)
dev:
    #!/usr/bin/env bash
    set -e

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
