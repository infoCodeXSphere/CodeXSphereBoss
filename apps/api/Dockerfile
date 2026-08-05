# --------------------------------------------------------------
# Build stage: install everything and compile the TypeScript API
# --------------------------------------------------------------
FROM node:20-alpine AS build
WORKDIR /repo

COPY package.json package-lock.json* ./
COPY apps/api/package.json apps/api/package.json
COPY packages/shared/package.json packages/shared/package.json
RUN npm install --workspaces --include-workspace-root

COPY packages/shared packages/shared
COPY apps/api apps/api

WORKDIR /repo/packages/shared
RUN npm run build

WORKDIR /repo/apps/api
RUN npx prisma generate
RUN npm run build

# --------------------------------------------------------------
# Runtime stage
# --------------------------------------------------------------
# npm workspaces hoist shared dependencies to the ROOT node_modules
# folder (/repo/node_modules), not a per-package one — there is no
# /repo/apps/api/node_modules to copy in isolation. Copying the whole
# /repo directory (not just isolated subfolders) sidesteps that
# entirely and is the reliable approach for a workspaces monorepo,
# at the cost of a slightly larger image than a hand-picked copy.
FROM node:20-alpine AS runtime
WORKDIR /repo
ENV NODE_ENV=production
COPY --from=build /repo /repo
WORKDIR /repo/apps/api
RUN mkdir -p storage
EXPOSE 4000
CMD ["node", "dist/server.js"]
