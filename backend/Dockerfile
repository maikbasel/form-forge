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
COPY common/Cargo.toml ./common/
COPY sheets/core/Cargo.toml ./sheets/core/
COPY sheets/adapters/web/Cargo.toml ./sheets/adapters/web/
COPY sheets/adapters/storage/Cargo.toml ./sheets/adapters/storage/
COPY sheets/adapters/db/Cargo.toml ./sheets/adapters/db/
COPY sheets/adapters/pdf/Cargo.toml ./sheets/adapters/pdf/
COPY actions/core/Cargo.toml ./actions/core/
COPY actions/adapters/web/Cargo.toml ./actions/adapters/web/
COPY actions/adapters/pdf/Cargo.toml ./actions/adapters/pdf/

# Create dummy source files to build dependencies
RUN mkdir -p src && \
    echo "fn main() {}" > src/main.rs && \
    mkdir -p common/src sheets/core/src sheets/adapters/web/src \
             sheets/adapters/storage/src sheets/adapters/db/src \
             sheets/adapters/pdf/src actions/core/src \
             actions/adapters/web/src actions/adapters/pdf/src && \
    echo "// dummy" > common/src/lib.rs && \
    echo "// dummy" > sheets/core/src/lib.rs && \
    echo "// dummy" > sheets/adapters/web/src/lib.rs && \
    echo "// dummy" > sheets/adapters/storage/src/lib.rs && \
    echo "// dummy" > sheets/adapters/db/src/lib.rs && \
    echo "// dummy" > sheets/adapters/pdf/src/lib.rs && \
    echo "// dummy" > actions/core/src/lib.rs && \
    echo "// dummy" > actions/adapters/web/src/lib.rs && \
    echo "// dummy" > actions/adapters/pdf/src/lib.rs

# Build dependencies (cached layer)
RUN cargo build --release --no-default-features --features json-logs

# Remove dummy sources and build artifacts
RUN rm -rf src common/src sheets actions target/release/.fingerprint/form-forge-* \
    target/release/.fingerprint/common-* target/release/.fingerprint/sheets_* \
    target/release/.fingerprint/actions_*

# Copy actual source code
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