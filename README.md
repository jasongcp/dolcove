# Dolcove Backend

Production-ready backend skeleton for the Dolcove monorepo.

## Structure
- `services/api` - Fastify HTTP API
- `services/worker` - background worker scaffold
- `packages/shared` - shared TypeScript contracts
- `db/migrations` - existing Postgres migrations

## Commands
From the repository root:

```bash
npm install
npm run dev:api
npm run dev:worker
npm run build
npm run start:api
npm run start:worker
```

## Environment
Create a `.env` file or provide environment variables through Docker/runtime:

```bash
DATABASE_URL=postgres://user:password@postgres:5432/dolcove
PORT=3000
HOST=0.0.0.0
```

`DATABASE_URL` is required by the API service even though no business queries exist yet.

## Notes
- Root workspaces are enabled via `package.json`.
- Local package linking uses file references so the skeleton installs cleanly in the current environment.
