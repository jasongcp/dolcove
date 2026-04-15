# Dolcove API Contracts

## Purpose
This document defines the initial API contracts for the Dolcove MVP.

All request and response types should be mirrored in `packages/shared`.

## Conventions
- All endpoints are versioned under `/v1`
- All responses are JSON
- Authentication is required unless explicitly marked public
- Timestamps use ISO 8601 strings
- IDs are opaque strings

## Standard response envelopes

### Success
```json
{
  "ok": true,
  "data": {}
}
```

### Error
```json
{
  "ok": false,
  "error": {
    "code": "SOME_ERROR_CODE",
    "message": "Human-readable message"
  }
}
```

## Auth

### POST /v1/auth/login
Purpose:
- Start login flow

Request:
```json
{
  "email": "user@example.com"
}
```

Response:
```json
{
  "ok": true,
  "data": {
    "status": "pending"
  }
}
```

### GET /v1/auth/me
Response:
```json
{
  "ok": true,
  "data": {
    "id": "usr_123",
    "displayName": "Jason",
    "email": "user@example.com",
    "avatarUrl": null,
    "createdAt": "2026-04-12T00:00:00.000Z"
  }
}
```

## Groups

### POST /v1/groups
Request:
```json
{
  "name": "Weekend Crew",
  "description": "Close friends planning dinners and trips"
}
```

Response:
```json
{
  "ok": true,
  "data": {
    "id": "grp_123",
    "name": "Weekend Crew",
    "description": "Close friends planning dinners and trips",
    "createdBy": "usr_123",
    "createdAt": "2026-04-12T00:00:00.000Z"
  }
}
```

### GET /v1/groups
Response:
```json
{
  "ok": true,
  "data": [
    {
      "id": "grp_123",
      "name": "Weekend Crew",
      "description": "Close friends planning dinners and trips",
      "memberCount": 4,
      "lastActivityAt": "2026-04-12T00:00:00.000Z"
    }
  ]
}
```

### GET /v1/groups/:groupId
Response:
```json
{
  "ok": true,
  "data": {
    "id": "grp_123",
    "name": "Weekend Crew",
    "description": "Close friends planning dinners and trips",
    "memberCount": 4,
    "createdBy": "usr_123",
    "createdAt": "2026-04-12T00:00:00.000Z"
  }
}
```

## Members

### GET /v1/groups/:groupId/members
Response:
```json
{
  "ok": true,
  "data": [
    {
      "userId": "usr_123",
      "displayName": "Jason",
      "avatarUrl": null,
      "role": "owner",
      "joinedAt": "2026-04-12T00:00:00.000Z"
    }
  ]
}
```

## Messages

### GET /v1/groups/:groupId/messages
Response:
```json
{
  "ok": true,
  "data": {
    "items": [
      {
        "id": "msg_123",
        "groupId": "grp_123",
        "senderId": "usr_123",
        "type": "text",
        "text": "Dinner on Friday?",
        "mediaUrl": null,
        "createdAt": "2026-04-12T00:00:00.000Z"
      }
    ],
    "nextCursor": null
  }
}
```

### POST /v1/groups/:groupId/messages
Request:
```json
{
  "type": "text",
  "text": "Dinner on Friday?"
}
```

Response:
```json
{
  "ok": true,
  "data": {
    "id": "msg_123",
    "groupId": "grp_123",
    "senderId": "usr_123",
    "type": "text",
    "text": "Dinner on Friday?",
    "mediaUrl": null,
    "createdAt": "2026-04-12T00:00:00.000Z"
  }
}
```

## Plans

### GET /v1/groups/:groupId/plans
Response:
```json
{
  "ok": true,
  "data": [
    {
      "id": "pln_123",
      "groupId": "grp_123",
      "title": "Friday dinner",
      "description": "Try the new sushi place",
      "status": "proposed",
      "startTime": "2026-04-18T19:30:00.000Z",
      "location": "Sushi House",
      "createdBy": "usr_123",
      "createdAt": "2026-04-12T00:00:00.000Z"
    }
  ]
}
```

### POST /v1/groups/:groupId/plans
Request:
```json
{
  "title": "Friday dinner",
  "description": "Try the new sushi place",
  "startTime": "2026-04-18T19:30:00.000Z",
  "location": "Sushi House"
}
```

### POST /v1/plans/:planId/votes
Request:
```json
{
  "vote": "yes"
}
```

Allowed values:
- yes
- no
- maybe

## Memories

### GET /v1/groups/:groupId/memories
Response:
```json
{
  "ok": true,
  "data": [
    {
      "id": "mem_123",
      "groupId": "grp_123",
      "memoryType": "preference",
      "memoryText": "The group usually prefers Friday dinner over Saturday lunch.",
      "confidence": 0.88,
      "createdAt": "2026-04-12T00:00:00.000Z"
    }
  ]
}
```

## Recaps

### GET /v1/groups/:groupId/recaps
Response:
```json
{
  "ok": true,
  "data": [
    {
      "id": "rcp_123",
      "groupId": "grp_123",
      "periodStart": "2026-04-05T00:00:00.000Z",
      "periodEnd": "2026-04-12T00:00:00.000Z",
      "content": "This week the group discussed Friday dinner, agreed sushi is the front-runner, and shared two photos from last weekend.",
      "createdAt": "2026-04-12T00:00:00.000Z"
    }
  ]
}
```
