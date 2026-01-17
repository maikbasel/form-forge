# @repo/api-spec

Generated OpenAPI specification and TypeScript types for the Form Forge API.

## Overview

This package contains:
- `openapi.yaml` - OpenAPI 3.x specification generated from Rust backend (utoipa)
- `types.ts` - TypeScript type definitions generated from the OpenAPI spec

## Generation

The spec and types are generated from the Rust backend's utoipa annotations:

```bash
# Generate OpenAPI YAML spec
cd ../../apps/api
cargo run --bin generate-openapi

# Generate TypeScript types
cd ../../packages/api-spec
pnpm generate

# Or generate both at once from project root
just gen-api
```

## Usage

Import types in your TypeScript code:

```typescript
import type { components } from '@repo/api-spec/types';

type FormField = components['schemas']['SheetFieldDto'];
type UploadResponse = components['schemas']['UploadSheetResponse'];
```

## Consumers

- `packages/ui` - Uses these types to type the `ApiClient` interface
- Swagger UI - Serves the OpenAPI spec at `/swagger-ui/`
- External API consumers - Can use the spec for client generation

## Development

Both `openapi.yaml` and `types.ts` are committed to git. This allows:
- Frontend developers to work without installing Rust
- Type checking in CI without backend compilation
- Reviewable type changes in pull requests

CI verifies that the committed spec and types match the backend code.
