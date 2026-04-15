# Dolcove Agent Operating Guide

Dolcove is built with a multi-agent coding workflow.

Agents do not share unrestricted write access. Each agent has clear ownership boundaries.

## Global rules
- No agent edits outside its owned area unless explicitly assigned
- No direct merge to main branch
- Every task must exist in `TASKS.md`
- Every non-trivial contract change must update docs or shared types
- Large refactors require Architect approval
- Each task should be small, testable, and scoped to specific files
- One writing agent per code area at a time

## Agent roster

### Architect Agent
Responsibilities:
- maintain `PROJECT.md`, `ARCHITECTURE.md`, `AGENTS.md`, `TASKS.md`, and `CODE_RULES.md`
- define boundaries and task breakdowns
- approve contract-level changes
- prevent scope creep

Owned areas:
- root docs
- architectural decisions
- task specifications

### Mobile Agent
Responsibilities:
- implement React Native screens, hooks, navigation, UI wiring, and API consumption

Owned areas:
- `apps/mobile/**`
- `packages/ui/**` when required for mobile use

### Backend Agent
Responsibilities:
- implement APIs, services, auth, permissions, realtime handlers, and job triggers

Owned areas:
- `services/api/**`

### Data Agent
Responsibilities:
- implement schema, migrations, seeds, and DB-related types

Owned areas:
- `db/**`
- DB-related shared types when assigned

### Review Agent
Responsibilities:
- review diffs
- add tests
- identify regressions
- patch small issues when assigned

Owned areas:
- `tests/**`
- review notes and small corrective changes

## Workflow
1. Architect creates a task with scope, file boundaries, and acceptance criteria
2. Assigned implementation agent writes code only within owned files
3. Review Agent evaluates the result
4. Architect approves or sends back for revision
5. Human operator decides final merge

## Commit naming
- `arch:` for architectural/docs changes
- `mobile:` for mobile changes
- `api:` for backend changes
- `data:` for schema/migration changes
- `review:` for tests/review patches
