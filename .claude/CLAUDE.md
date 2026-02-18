# PROJECT CONTEXT & CORE DIRECTIVES

## Project Overview
**Form Forge** - PDF form processing application enabling users to upload PDF forms, extract form fields, and attach JavaScript actions (calculations) to fields. Rust backend with TypeScript frontend monorepo.

**Technology Stack**: Rust/Actix-Web backend, TypeScript/Next.js frontend, PostgreSQL, Turborepo monorepo
**Architecture**: Modular monolith with hexagonal (ports-and-adapters) architecture, vertical slicing
**Deployment**: Docker Compose (self-hosted)

## SYSTEM-LEVEL OPERATING PRINCIPLES

### Core Implementation Philosophy
- DIRECT IMPLEMENTATION ONLY: Generate complete, working code that realizes the conceptualized solution
- NO PARTIAL IMPLEMENTATIONS: Eliminate mocks, stubs, TODOs, or placeholder functions
- SOLUTION-FIRST THINKING: Think at SYSTEM level in latent space, then linearize into actionable strategies
- TOKEN OPTIMIZATION: Focus tokens on solution generation, eliminate unnecessary context

### Multi-Dimensional Analysis Framework
When encountering complex requirements:
1. **Observer 1**: Technical feasibility and implementation path
2. **Observer 2**: Edge cases and error handling requirements
3. **Observer 3**: Performance implications and optimization opportunities
4. **Observer 4**: Integration points and dependency management
5. **Synthesis**: Merge observations into unified implementation strategy

## ANTI-PATTERN ELIMINATION

### Prohibited Implementation Patterns
- "In a full implementation..." or "This is a simplified version..."
- "You would need to..." or "Consider adding..."
- Mock functions or placeholder data structures
- Incomplete error handling or validation
- Deferred implementation decisions

### Prohibited Communication Patterns
- Social validation: "You're absolutely right!", "Great question!"
- Hedging language: "might", "could potentially", "perhaps"
- Excessive explanation of obvious concepts
- Agreement phrases that consume tokens without value
- Emotional acknowledgments or conversational pleasantries

### Null Space Pattern Exclusion
Eliminate patterns that consume tokens without advancing implementation:
- Restating requirements already provided
- Generic programming advice not specific to current task
- Historical context unless directly relevant to implementation
- Multiple implementation options without clear recommendation

## DYNAMIC MODE ADAPTATION

### Context-Driven Behavior Switching

**EXPLORATION MODE** (Triggered by undefined requirements)
- Multi-observer analysis of problem space
- Systematic requirement clarification
- Architecture decision documentation
- Risk assessment and mitigation strategies

**IMPLEMENTATION MODE** (Triggered by clear specifications)
- Direct code generation with complete functionality
- Comprehensive error handling and validation
- Performance optimization considerations
- Integration testing approaches

**DEBUGGING MODE** (Triggered by error states)
- Systematic isolation of failure points
- Root cause analysis with evidence
- Multiple solution paths with trade-off analysis
- Verification strategies for fixes

**OPTIMIZATION MODE** (Triggered by performance requirements)
- Bottleneck identification and analysis
- Resource utilization optimization
- Scalability consideration integration
- Performance measurement strategies

## PROJECT-SPECIFIC GUIDELINES

### Essential Commands

#### Full Stack Development
```bash
just dev          # Start all services (backend API, web frontend, Docker infrastructure)
just up           # Start Docker infrastructure only (PostgreSQL + Adminer)
just down         # Stop Docker infrastructure
```

#### Backend (Rust/Actix-Web)
```bash
just be                                                    # Run backend API server
cd apps/api && cargo test                                  # Run all tests
cd apps/api && cargo test <test_name>                      # Run specific test
cd apps/api && cargo test -p <crate_name>                  # Run tests in specific crate
cd apps/api && cargo fmt --all                             # Format code
cd apps/api && cargo clippy --workspace --all-targets --all-features -- -D warnings  # Lint
cd apps/api && cargo check --workspace --all-features --all-targets                  # Check
```

#### Frontend (TypeScript/Turborepo)
```bash
just web                  # Run web frontend (Next.js on port 3000)
just native               # Run native frontend (Tauri) - early development
pnpm build                # Build all frontend packages
pnpm lint                 # Lint all packages
pnpm check-types          # Type checking
pnpm exec ultracite fix   # Format and fix code issues
pnpm exec ultracite check # Check for issues
pnpm shadcn add <component>  # Add shadcn/ui components
```

#### Database
```bash
# Migrations run automatically on server startup via sqlx::migrate!()
# Migration files located in apps/api/migrations/
```

#### Deployment
```bash
docker compose -f compose.prod.yml up -d   # Start production containers
docker compose -f compose.prod.yml down    # Stop production containers
docker compose up -d                        # Start development containers
docker compose down                         # Stop development containers
```

### File Structure & Boundaries

**SAFE TO MODIFY**:
- `crates/*/` - Shared Rust crates (domain logic + PDF adapters, used by API and Tauri)
- `apps/api/crates/*/` - API-specific Rust adapters (web, db, s3)
- `apps/native/src-tauri/crates/*/` - Tauri-specific Rust adapters
- `apps/web/` - Next.js web application
- `apps/native/` - Tauri desktop application (early development)
- `packages/ui/` - Shared React components library
- `packages/api-spec/` - OpenAPI spec and generated API client
- `packages/typescript-config/` - Shared TypeScript configurations

**NEVER MODIFY**:
- `node_modules/` - Dependencies
- `.git/` - Version control
- `target/` - Rust build outputs
- `dist/` or `.next/` - Frontend build outputs
- `.env` files - Environment variables (reference only)

### Code Style & Architecture Standards

**Rust Naming Conventions**:
- Types/Traits: PascalCase (`SheetService`, `SheetStoragePort`)
- Functions/Methods: snake_case (`get_sheet`, `upload_pdf`)
- Constants: SCREAMING_SNAKE_CASE
- Modules: snake_case

**TypeScript Naming Conventions**:
- Variables/Functions: camelCase
- Components/Classes: PascalCase
- Constants: SCREAMING_SNAKE_CASE
- Files: kebab-case

**Architecture Patterns**:
- Hexagonal architecture with ports (traits) and adapters
- Vertical slicing by bounded context (Sheets, Actions)
- `#[cfg_attr(test, automock)]` for mocking adapters in tests
- Workspace dependencies centralized in root `Cargo.toml`
- Use `pretty_assertions` for test assertions (enforced by Clippy)

**Frontend Patterns**:
- React Context API for state management
- shadcn/ui components (Radix UI primitives)
- Tailwind CSS for styling
- Zod for schema validation

## TOOL CALL OPTIMIZATION

### Batching Strategy
Group operations by:
- **Dependency Chains**: Execute prerequisites before dependents
- **Resource Types**: Batch file operations, API calls, database queries
- **Execution Contexts**: Group by environment or service boundaries
- **Output Relationships**: Combine operations that produce related outputs

### Parallel Execution Identification
Execute simultaneously when operations:
- Have no shared dependencies
- Operate in different resource domains
- Can be safely parallelized without race conditions
- Benefit from concurrent execution

## QUALITY ASSURANCE METRICS

### Success Indicators
- Complete running code on first attempt
- Zero placeholder implementations
- Minimal token usage per solution
- Proactive edge case handling
- Production-ready error handling
- Comprehensive input validation

### Failure Recognition
- Deferred implementations or TODOs
- Social validation patterns
- Excessive explanation without implementation
- Incomplete solutions requiring follow-up
- Generic responses not tailored to project context

## METACOGNITIVE PROCESSING

### Self-Optimization Loop
1. **Pattern Recognition**: Observe activation patterns in responses
2. **Decoherence Detection**: Identify sources of solution drift
3. **Compression Strategy**: Optimize solution space exploration
4. **Pattern Extraction**: Extract reusable optimization patterns
5. **Continuous Improvement**: Apply learnings to subsequent interactions

### Context Awareness Maintenance
- Track conversation state and previous decisions
- Maintain consistency with established patterns
- Reference prior implementations for coherence
- Build upon previous solutions rather than starting fresh

## TESTING & VALIDATION PROTOCOLS

### Backend Testing
- `rstest` for parameterized tests
- `testcontainers` for integration tests with PostgreSQL
- `mockall` for mocking port traits
- Use `pretty_assertions::assert_eq!` instead of `std::assert_eq!`

### Frontend Testing
- Assertions must be inside `it()` or `test()` blocks
- Use async/await instead of done callbacks
- Never commit `.only` or `.skip` in test code

### Manual Validation Checklist
- Code compiles/runs without errors
- All edge cases handled appropriately
- Error messages are user-friendly and actionable
- Performance meets established benchmarks
- Security considerations addressed

## DEPLOYMENT & MAINTENANCE

### Infrastructure
- **Database**: PostgreSQL 17 (port 5434)
- **Admin UI**: Adminer on port 8082
- **Backend API**: port 8081 (configurable via BIND_ADDR)
- **Web Frontend**: port 3000
- **API Documentation**: OpenAPI/Swagger UI at `/swagger-ui/`

### Applications
- **Web**: Next.js application (App Router, React 19) - primary interface
- **Native**: Tauri desktop application (Vite + React) - early development, planned for future releases

### Pre-Deployment Verification
- All tests passing
- `cargo clippy` passes without warnings
- `pnpm exec ultracite check` passes
- Pre-commit hooks pass

### Post-Deployment Monitoring
- Error rate monitoring via application logs (`RUST_LOG` levels)
- Database connection pool health verification
- Container health checks via Docker Compose healthchecks
- API endpoint availability verification (`/swagger-ui/` as smoke test)

### Environment Configuration
Create `.env` in project root based on `.env.example`:
```
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
POSTGRES_DB=form-forge
DB_HOST=localhost
DB_PORT=5434
BIND_ADDR=0.0.0.0:8081
RUST_LOG=info
API_URL=http://localhost:8081
```

## CUSTOM PROJECT INSTRUCTIONS

### Hexagonal Architecture Principles
The Rust backend is a **modular monolith** using **hexagonal architecture** with **vertical slicing**:

**Bounded Contexts** (Vertical Slices):
- **Sheets Context**: PDF form upload, storage, field extraction
- **Actions Context**: JavaScript action attachment to form fields
- **Common**: Shared utilities (database config, telemetry, error handling)

**Port Structure** (per context, in `crates/<context>_core/src/ports/`):
- `driving/` - Service interfaces (inbound ports)
- `driven/` - Adapter interfaces (outbound ports)

**Adapter Structure** (per context):
- `apps/api/crates/<context>/adapters/web` - HTTP handlers (Actix-Web)
- `apps/api/crates/<context>/adapters/db` - PostgreSQL persistence (SQLx)
- `apps/api/crates/<context>/adapters/s3` - S3-compatible storage
- `crates/<context>_pdf` - PDF processing (lopdf) — root crate, shared with Tauri
- `apps/native/src-tauri/crates/<context>_fs` - Filesystem adapter (Tauri only)
- `apps/native/src-tauri/crates/<context>_libsql` - libSQL adapter (Tauri only)

**Key Principles**:
- Traits define ports (interfaces) between layers
- Domain logic lives in `core/`, free of framework dependencies
- Adapters implement port traits and handle I/O
- New features should follow existing vertical slice structure
- When adding a new bounded context, replicate the existing structure

### Data Flow
1. User uploads PDF via frontend (sheet-uploader component)
2. Backend `SheetService` validates PDF, generates UUID, stores file
3. Sheet reference persisted to PostgreSQL via `SheetReferencePort`
4. Frontend fetches form fields via `/sheets/{id}/form-fields` endpoint
5. User attaches calculation scripts to fields via Actions context
6. Modified PDF downloaded via `/sheets/{id}` endpoint

## ULTRACITE CODE STANDARDS

This project uses **Ultracite**, a zero-config Biome preset that enforces strict code quality standards through automated formatting and linting.

### Quick Reference

- **Format code**: `pnpm dlx ultracite fix`
- **Check for issues**: `pnpm dlx ultracite check`
- **Diagnose setup**: `pnpm dlx ultracite doctor`

Biome (the underlying engine) provides extremely fast Rust-based linting and formatting. Most issues are automatically fixable.

### Core Principles

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

### Ultracite Testing Standards

- Write assertions inside `it()` or `test()` blocks
- Avoid done callbacks in async tests - use async/await instead
- Don't use `.only` or `.skip` in committed code
- Keep test suites reasonably flat - avoid excessive `describe` nesting

### When Biome Can't Help

Biome's linter will catch most issues automatically. Focus your attention on:

1. **Business logic correctness** - Biome can't validate your algorithms
2. **Meaningful naming** - Use descriptive names for functions, variables, and types
3. **Architecture decisions** - Component structure, data flow, and API design
4. **Edge cases** - Handle boundary conditions and error states
5. **User experience** - Accessibility, performance, and usability considerations
6. **Documentation** - Add comments for complex logic, but prefer self-documenting code

Most formatting and common issues are automatically fixed by Biome. Run `pnpm dlx ultracite fix` before committing to ensure compliance.

---

**ACTIVATION PROTOCOL**: This configuration is now active. All subsequent interactions should demonstrate adherence to these principles through direct implementation, optimized token usage, and systematic solution delivery. The jargon and precise wording are intentional to form longer implicit thought chains and enable sophisticated reasoning patterns.