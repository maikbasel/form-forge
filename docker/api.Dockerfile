# syntax=docker/dockerfile:1

# Build stage
FROM rustlang/rust:nightly-slim AS builder

RUN apt-get update && apt-get install -y \
    curl \
    libssl-dev \
    pkg-config \
    && rm -rf /var/lib/apt/lists/*

ARG CARGO_FEATURES=json-logs,otel

WORKDIR /app

# Copy workspace root manifests and lock file
COPY Cargo.toml Cargo.lock ./

# Copy workspace member Cargo.toml files (for dependency caching)
# API app
COPY apps/api/Cargo.toml ./apps/api/
# API crates
COPY apps/api/crates/common/Cargo.toml ./apps/api/crates/common/
COPY apps/api/crates/sheets/adapters/web/Cargo.toml ./apps/api/crates/sheets/adapters/web/
COPY apps/api/crates/sheets/adapters/s3/Cargo.toml ./apps/api/crates/sheets/adapters/s3/
COPY apps/api/crates/sheets/adapters/db/Cargo.toml ./apps/api/crates/sheets/adapters/db/
COPY apps/api/crates/actions/adapters/web/Cargo.toml ./apps/api/crates/actions/adapters/web/
# Shared crates
COPY crates/common_telemetry/Cargo.toml ./crates/common_telemetry/
COPY crates/common_pdf/Cargo.toml ./crates/common_pdf/
COPY crates/sheets_core/Cargo.toml ./crates/sheets_core/
COPY crates/actions_core/Cargo.toml ./crates/actions_core/
COPY crates/sheets_pdf/Cargo.toml ./crates/sheets_pdf/
COPY crates/actions_pdf/Cargo.toml ./crates/actions_pdf/
# Tauri crates (needed for workspace resolution, not built via default-members)
COPY apps/native/src-tauri/Cargo.toml ./apps/native/src-tauri/
COPY apps/native/src-tauri/crates/sheets_fs/Cargo.toml ./apps/native/src-tauri/crates/sheets_fs/
COPY apps/native/src-tauri/crates/sheets_libsql/Cargo.toml ./apps/native/src-tauri/crates/sheets_libsql/

# Create dummy source files to build dependencies
RUN mkdir -p apps/api/src/bin && \
    echo "fn main() {}" > apps/api/src/main.rs && \
    echo "fn main() {}" > apps/api/src/bin/generate-openapi.rs && \
    mkdir -p apps/api/crates/common/src \
             apps/api/crates/sheets/adapters/web/src \
             apps/api/crates/sheets/adapters/s3/src \
             apps/api/crates/sheets/adapters/db/src \
             apps/api/crates/actions/adapters/web/src \
             crates/common_telemetry/src \
             crates/common_pdf/src \
             crates/sheets_core/src \
             crates/actions_core/src \
             crates/sheets_pdf/src \
             crates/actions_pdf/src \
             apps/native/src-tauri/src \
             apps/native/src-tauri/crates/sheets_fs/src \
             apps/native/src-tauri/crates/sheets_libsql/src && \
    echo "// dummy" > apps/api/crates/common/src/lib.rs && \
    echo "// dummy" > apps/api/crates/sheets/adapters/web/src/lib.rs && \
    echo "// dummy" > apps/api/crates/sheets/adapters/s3/src/lib.rs && \
    echo "// dummy" > apps/api/crates/sheets/adapters/db/src/lib.rs && \
    echo "// dummy" > apps/api/crates/actions/adapters/web/src/lib.rs && \
    echo "// dummy" > crates/common_telemetry/src/lib.rs && \
    echo "// dummy" > crates/common_pdf/src/lib.rs && \
    echo "// dummy" > crates/sheets_core/src/lib.rs && \
    echo "// dummy" > crates/actions_core/src/lib.rs && \
    echo "// dummy" > crates/sheets_pdf/src/lib.rs && \
    echo "// dummy" > crates/actions_pdf/src/lib.rs && \
    echo "fn main() {}" > apps/native/src-tauri/src/main.rs && \
    echo "// dummy" > apps/native/src-tauri/src/lib.rs && \
    echo "// dummy" > apps/native/src-tauri/crates/sheets_fs/src/lib.rs && \
    echo "// dummy" > apps/native/src-tauri/crates/sheets_libsql/src/lib.rs

# Build dependencies (cached layer) - uses default-members (API crates only)
RUN cargo build --release --no-default-features --features ${CARGO_FEATURES}

# Remove dummy sources and build artifacts for API crates
RUN rm -rf apps/api/src apps/api/crates/common/src \
    apps/api/crates/sheets apps/api/crates/actions \
    crates/common_telemetry/src crates/common_pdf/src \
    crates/sheets_core/src crates/actions_core/src \
    crates/sheets_pdf/src crates/actions_pdf/src \
    target/release/.fingerprint/form-forge-api-* \
    target/release/.fingerprint/common-* \
    target/release/.fingerprint/common_telemetry-* \
    target/release/.fingerprint/common_pdf-* \
    target/release/.fingerprint/sheets_* \
    target/release/.fingerprint/actions_*

# Copy actual source code
COPY apps/api/ ./apps/api/
COPY crates/ ./crates/

# Build the application with SQLx offline mode (production logs + OpenTelemetry)
ENV SQLX_OFFLINE=true
RUN cargo build --release --no-default-features --features ${CARGO_FEATURES}

# Runtime stage - use trixie (Debian 13) to match GLIBC 2.38 from rust:nightly
FROM debian:trixie-slim

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
COPY --from=builder --chown=appuser:appuser /app/target/release/form-forge-api /app/form-forge-api

# Copy migrations
COPY --from=builder --chown=appuser:appuser /app/apps/api/migrations /app/migrations

# Switch to non-root user
USER appuser

# Expose the application port
EXPOSE 8081

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8081/health || exit 1

CMD ["/app/form-forge-api"]
