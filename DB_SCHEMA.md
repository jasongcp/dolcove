# Dolcove DB Schema

## Purpose
This document defines the initial database schema for the Dolcove MVP.

The database is relational and Postgres is the system of record.

## Design principles
- Keep the schema explicit and relational
- Prefer simple normalized structure for MVP
- Add indexes intentionally
- Every schema change requires a migration
- Store timestamps in UTC
- Use opaque string IDs at the application layer

## Core tables

### users
Fields:
- id PK
- email unique nullable
- display_name not null
- avatar_url nullable
- created_at not null
- updated_at not null

### groups
Fields:
- id PK
- name not null
- description nullable
- created_by FK -> users.id
- created_at not null
- updated_at not null

### group_members
Fields:
- id PK
- group_id FK -> groups.id
- user_id FK -> users.id
- role not null
- joined_at not null

Allowed role values:
- owner
- member

Indexes:
- unique (group_id, user_id)
- index user_id
- index group_id

## Messaging tables

### messages
Fields:
- id PK
- group_id FK -> groups.id
- sender_id FK -> users.id
- type not null
- text nullable
- media_url nullable
- created_at not null
- updated_at nullable
- deleted_at nullable

Allowed type values:
- text
- image
- system

Indexes:
- index (group_id, created_at)
- index sender_id

### message_reactions
Fields:
- id PK
- message_id FK -> messages.id
- user_id FK -> users.id
- reaction_type not null
- created_at not null

## Planning tables

### plans
Fields:
- id PK
- group_id FK -> groups.id
- title not null
- description nullable
- status not null
- start_time nullable
- location nullable
- created_by FK -> users.id
- created_at not null
- updated_at not null

Allowed status values:
- proposed
- confirmed
- cancelled
- completed

### plan_votes
Fields:
- id PK
- plan_id FK -> plans.id
- user_id FK -> users.id
- vote not null
- updated_at not null

Allowed vote values:
- yes
- no
- maybe

## Memory tables

### memories
Fields:
- id PK
- group_id FK -> groups.id
- source_type not null
- source_id nullable
- memory_type not null
- memory_text not null
- confidence nullable
- created_at not null
- deleted_at nullable

Suggested memory types:
- preference
- habit
- milestone
- idea
- relationship

## Recap tables

### recaps
Fields:
- id PK
- group_id FK -> groups.id
- period_start not null
- period_end not null
- content not null
- created_at not null

## Notification tables

### notifications
Fields:
- id PK
- user_id FK -> users.id
- type not null
- payload_json not null
- read_at nullable
- created_at not null

## Migration order
1. users
2. groups
3. group_members
4. messages
5. message_reactions
6. plans
7. plan_votes
8. memories
9. recaps
10. notifications
