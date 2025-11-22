set shell := ["bash", "-cu"]

backend_dir := "backend"
frontend_dir := "frontend"
compose_file := "compose.yml"

up:
    @echo "🐳 Starting Docker infrastructure..."
    docker compose -f {{compose_file}} up -d
    @echo "✅ Infrastructure is up!"

down:
    @echo "🛑 Stopping Docker infrastructure..."
    docker compose -f {{compose_file}} down
    @echo "✅ Infrastructure stopped!"

be:
    @echo "🦀 Starting backend..."
    cd {{backend_dir}} && cargo run

web:
    @echo "⚛️  Starting web frontend..."
    cd {{frontend_dir}} && pnpm --filter web dev

native:
    @echo "📱 Starting native frontend..."
    cd {{frontend_dir}} && pnpm --filter native tauri dev

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
