# syntax=docker/dockerfile:1

# Build stage
FROM rustlang/rust:nightly-slim AS builder

RUN apt-get update && apt-get install -y \
    curl \
    libssl-dev \
    pkg-config \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY Cargo.toml Cargo.lock ./

# Copy workspace member directories (empty to cache deps)
COPY crates/common/Cargo.toml ./crates/common/
COPY crates/sheets/core/Cargo.toml ./crates/sheets/core/
COPY crates/sheets/adapters/web/Cargo.toml ./crates/sheets/adapters/web/
COPY crates/sheets/adapters/storage/Cargo.toml ./crates/sheets/adapters/storage/
COPY crates/sheets/adapters/db/Cargo.toml ./crates/sheets/adapters/db/
COPY crates/sheets/adapters/pdf/Cargo.toml ./crates/sheets/adapters/pdf/
COPY crates/actions/core/Cargo.toml ./crates/actions/core/
COPY crates/actions/adapters/web/Cargo.toml ./crates/actions/adapters/web/
COPY crates/actions/adapters/pdf/Cargo.toml ./crates/actions/adapters/pdf/

# Create dummy source files to build dependencies
RUN mkdir -p src && \
    echo "fn main() {}" > src/main.rs && \
    mkdir -p crates/common/src crates/sheets/core/src crates/sheets/adapters/web/src \
             crates/sheets/adapters/storage/src crates/sheets/adapters/db/src \
             crates/sheets/adapters/pdf/src crates/actions/core/src \
             crates/actions/adapters/web/src crates/actions/adapters/pdf/src && \
    echo "// dummy" > crates/common/src/lib.rs && \
    echo "// dummy" > crates/sheets/core/src/lib.rs && \
    echo "// dummy" > crates/sheets/adapters/web/src/lib.rs && \
    echo "// dummy" > crates/sheets/adapters/storage/src/lib.rs && \
    echo "// dummy" > crates/sheets/adapters/db/src/lib.rs && \
    echo "// dummy" > crates/sheets/adapters/pdf/src/lib.rs && \
    echo "// dummy" > crates/actions/core/src/lib.rs && \
    echo "// dummy" > crates/actions/adapters/web/src/lib.rs && \
    echo "// dummy" > crates/actions/adapters/pdf/src/lib.rs

# Build dependencies (cached layer)
RUN cargo build --release --no-default-features --features json-logs

# Remove dummy sources and build artifacts
RUN rm -rf src crates/common/src crates/sheets crates/actions target/release/.fingerprint/form-forge-* \
    target/release/.fingerprint/common-* target/release/.fingerprint/sheets_* \
    target/release/.fingerprint/actions_*

# Copy actual source code (context is apps/api/)
COPY . .

# Build the application with SQLx offline mode (production logs)
ENV SQLX_OFFLINE=true
RUN cargo build --release --no-default-features --features json-logs

# Runtime stage
FROM debian:bookworm-slim

RUN apt-get update && apt-get install -y \
    ca-certificates \
    curl \
    libssl3 \
    && rm -rf /var/lib/apt/lists/*

# Create non-root user
RUN useradd -m -u 1000 -s /bin/bash appuser

WORKDIR /app
RUN mkdir -p /app/data && chown -R appuser:appuser /app

# Copy binary from builder
COPY --from=builder --chown=appuser:appuser /app/target/release/form-forge /app/form-forge

# Copy migrations
COPY --from=builder --chown=appuser:appuser /app/migrations /app/migrations

# Switch to non-root user
USER appuser

# Expose the application port
EXPOSE 8081

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8081/health || exit 1

CMD ["/app/form-forge"]