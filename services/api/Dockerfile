FROM node:20 AS build
WORKDIR /app

COPY package.json package-lock.json tsconfig.json tsconfig.base.json ./
COPY packages/shared/package.json packages/shared/package.json
COPY packages/shared/tsconfig.json packages/shared/tsconfig.json
COPY packages/shared/src packages/shared/src
COPY services/api/package.json services/api/package.json
COPY services/api/tsconfig.json services/api/tsconfig.json
COPY services/api/src services/api/src
COPY services/worker/package.json services/worker/package.json
COPY services/worker/tsconfig.json services/worker/tsconfig.json
COPY services/worker/src services/worker/src

RUN npm ci
RUN npm run build

FROM node:20-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production \
    HOME=/tmp

COPY --from=build --chown=node:node /app/package.json /app/package-lock.json /app/
COPY --from=build --chown=node:node /app/node_modules /app/node_modules
COPY --from=build --chown=node:node /app/packages/shared/package.json /app/packages/shared/package.json
COPY --from=build --chown=node:node /app/packages/shared/dist /app/packages/shared/dist
COPY --from=build --chown=node:node /app/services/api/package.json /app/services/api/package.json
COPY --from=build --chown=node:node /app/services/api/dist /app/services/api/dist

USER node
EXPOSE 3000
CMD ["node", "services/api/dist/server.js"]
