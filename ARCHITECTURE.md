# Dolcove Architecture

## Overview

Dolcove uses a standard consumer-app architecture.

OpenClaw is used as the coding workforce and later as the agent layer for product intelligence, but it does not replace the app backend or database.

## System layers

### 1. Mobile app
Stack:
- React Native

Responsibilities:
- auth screens
- group list
- group detail view
- chat UI
- plan cards
- recap feed
- settings
- local state and API integration

### 2. API backend
Stack:
- Node.js
- TypeScript
- Fastify or NestJS

Responsibilities:
- auth/session handling
- user and group APIs
- message APIs
- plan APIs
- permissions
- realtime integration
- worker job triggers
- notification APIs

### 3. Database
Stack:
- Postgres

Responsibilities:
- source of truth for product data
- durable storage for users, groups, memberships, messages, plans, memories, and recaps

### 4. Cache / queue
Stack:
- Redis

Responsibilities:
- queue support
- rate limiting
- temporary cache/state
- fanout assistance

### 5. Realtime
Stack:
- WebSocket / Socket.IO

Responsibilities:
- live chat delivery
- typing/presence later
- plan update fanout

### 6. Object storage
Stack:
- S3-compatible storage

Responsibilities:
- avatars
- attachments
- uploaded media
- recap assets

### 7. Worker layer
Stack:
- Node.js workers

Responsibilities:
- memory extraction jobs
- recap jobs
- notification fanout jobs
- asynchronous processing

## Monorepo layout

apps/mobile
services/api
services/workers
packages/shared
packages/ui
db/schema
db/migrations
infra/

## Ownership boundaries
- Mobile UI lives in `apps/mobile`
- API logic lives in `services/api`
- background jobs live in `services/workers`
- shared types and utilities live in `packages/shared`
- reusable UI primitives live in `packages/ui`
- schema and migrations live in `db`

## Data flow example
1. User sends a message from mobile
2. Backend validates membership and stores the message in Postgres
3. Backend emits a job/event for asynchronous processing
4. Worker decides whether memory or recap signals should be updated
5. Processed outputs are stored back into product tables
6. Mobile app receives new state via API refresh or realtime event

## Architectural rules
- Product state lives in Postgres
- Shared contracts live in `packages/shared`
- Controllers stay thin
- Business logic belongs in services
- Schema changes require migrations
- Background jobs should be idempotent where practical
- Feature work must be task-scoped and file-bounded
