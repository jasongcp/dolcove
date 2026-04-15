# Dolcove Tasks

## Sprint 0 - Foundation

### T-001 Repo scaffolding verification
Owner:
- Architect Agent

Scope:
- verify monorepo structure
- verify root scripts
- verify docs presence
- verify mobile/api/workers boot

Acceptance criteria:
- repository layout matches architecture document
- empty packages/services boot without structural errors
- docs files exist

### T-002 Shared types package
Owner:
- Architect Agent
- Backend Agent

Scope:
- initialize `packages/shared`
- add shared primitive types for user, group, membership
- add shared API envelope types

Acceptance criteria:
- shared package builds
- mobile and api can import from shared package

### T-003 Initial database schema
Owner:
- Data Agent

Scope:
- create schema for users, groups, group_members
- create initial migration
- define indexes and constraints

Acceptance criteria:
- migration runs cleanly
- relationships are correct
- rollback path is defined where practical

## Sprint 1 - Auth and groups

### T-004 Backend auth skeleton
Owner:
- Backend Agent

Scope:
- implement auth module shell
- define session strategy
- add placeholder protected route

Acceptance criteria:
- authenticated route can be tested
- auth module structure is stable

### T-005 Mobile auth shell
Owner:
- Mobile Agent

Scope:
- create auth screens and navigation flow
- wire form state and placeholder backend integration

Acceptance criteria:
- auth flow renders correctly
- success/error states are handled visually

### T-006 Create group API
Owner:
- Backend Agent
- Data Agent

Scope:
- add create-group endpoint
- persist group and owner membership
- return shared group response type

Acceptance criteria:
- authenticated user can create a group
- owner membership is automatically created
- tests cover service logic

### T-007 Create group screen
Owner:
- Mobile Agent

Scope:
- create group creation form
- connect to create-group API
- handle success and failure states

Acceptance criteria:
- user can submit group name and receive success response
- error state is visible and recoverable

### T-008 Group list flow
Owner:
- Backend Agent
- Mobile Agent

Scope:
- add list-groups endpoint
- create group list screen
- render user memberships

Acceptance criteria:
- groups load correctly for authenticated user
- screen supports loading and empty states

## Sprint 2 - Messaging

### T-009 Message schema and migration
Owner:
- Data Agent

Scope:
- add messages table
- define message types and indexes

Acceptance criteria:
- migration applies cleanly
- message table supports basic chat flow

### T-010 Message API skeleton
Owner:
- Backend Agent

Scope:
- create send-message endpoint
- create list-messages endpoint
- validate membership access

Acceptance criteria:
- user can send and fetch messages only for joined groups

### T-011 Chat screen shell
Owner:
- Mobile Agent

Scope:
- create group chat UI shell
- fetch messages
- send simple text messages

Acceptance criteria:
- messages render in order
- send flow works for text messages

## Sprint 3 - Plans

### T-012 Plan schema and migration
Owner:
- Data Agent

Scope:
- add plans and plan_votes tables
- define statuses and relationships

Acceptance criteria:
- migrations succeed
- plan and vote records are linked properly

### T-013 Plan API
Owner:
- Backend Agent

Scope:
- create plan proposal endpoint
- create vote endpoint
- return structured plan objects

Acceptance criteria:
- plan creation and voting work for members

### T-014 Plan cards on mobile
Owner:
- Mobile Agent

Scope:
- create plan card UI
- allow basic vote interaction

Acceptance criteria:
- users can view and vote on plans in-app

## Sprint 4 - Memory and recap foundations

### T-015 Memory schema
Owner:
- Data Agent

Scope:
- add memories table
- define memory type and confidence fields

Acceptance criteria:
- migration succeeds
- memory records can be stored by group

### T-016 Memory worker skeleton
Owner:
- Backend Agent

Scope:
- create worker entry point for memory jobs
- trigger from message-created events

Acceptance criteria:
- message event can enqueue a memory job

### T-017 Recap schema
Owner:
- Data Agent

Scope:
- add recaps table
- define period and content storage

Acceptance criteria:
- recap records can be stored and retrieved

### T-018 Recap worker skeleton
Owner:
- Backend Agent

Scope:
- create recap generation job scaffold
- define trigger contract

Acceptance criteria:
- recap worker can be invoked with group and time range
