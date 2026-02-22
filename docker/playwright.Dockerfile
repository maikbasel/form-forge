# syntax=docker/dockerfile:1

# NOTE: Image version must match the @playwright/test package version in package.json
FROM mcr.microsoft.com/playwright:v1.58.2-noble

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm@9

# Copy workspace configuration
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# Copy workspace package.json stubs so pnpm can resolve the workspace
COPY apps/web/package.json ./apps/web/package.json
COPY apps/native/package.json ./apps/native/package.json
COPY crates/actions_core/js/package.json ./crates/actions_core/js/package.json
COPY packages/ui/package.json ./packages/ui/package.json
COPY packages/api-spec/package.json ./packages/api-spec/package.json
COPY packages/typescript-config/package.json ./packages/typescript-config/package.json

RUN pnpm install --frozen-lockfile

# Copy test files
COPY tests ./tests
COPY playwright.docker.config.ts ./

# Copy PDF fixture referenced by sheet-workflow.spec.ts
COPY crates/sheets_pdf/tests/fixtures/ ./crates/sheets_pdf/tests/fixtures/

CMD ["npx", "playwright", "test", "--config=playwright.docker.config.ts"]
