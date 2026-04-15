# Dolcove Code Rules

These rules are mandatory for all coding agents.

## General principles
- Prefer simple solutions over clever solutions
- Build for MVP first
- Keep boundaries explicit
- Avoid unnecessary abstractions
- Optimize for readability and maintainability
- Do not introduce dependencies without clear need

## Language and typing
- TypeScript only across mobile, API, workers, and shared packages
- No implicit `any`
- Prefer explicit interfaces/types for shared contracts
- Shared request/response and entity types must live in `packages/shared`
- Do not duplicate API contract types across frontend and backend

## Project structure
- Mobile code belongs in `apps/mobile`
- API code belongs in `services/api`
- Worker/background code belongs in `services/workers`
- Database schema and migrations belong in `db`
- Shared utilities and types belong in `packages/shared`
- Reusable UI primitives belong in `packages/ui`

## Size and complexity
- Prefer small focused files
- Avoid files larger than 400 lines unless justified
- Avoid functions larger than 60 lines unless necessary
- Extract repeated logic into utilities or services
- Do not create a new abstraction until duplication is real

## API rules
- Controllers must remain thin
- Business logic belongs in services
- Validation happens at the edge
- API responses must be structured and predictable
- Auth and permission checks must be explicit

## Database rules
- Every schema change requires a migration
- Migrations should be reversible where practical
- No direct schema edits without migration files
- Use relational design first
- Indexes should be added intentionally, not speculatively

## UI rules
- Screens should remain thin and composable
- Handle loading, empty, and error states explicitly
- Do not hardcode backend response assumptions outside typed contracts

## Testing rules
- Critical service logic requires tests
- New API endpoints should have basic route/service coverage
- Regression fixes should include a test when practical

## Security and secrets
- Never hardcode secrets
- Never commit tokens or API keys
- Use environment variables or secret providers only

## Review rules
- Prefer minimal corrective changes
- Large rewrites need explicit approval
- Scope creep during review is not allowed
