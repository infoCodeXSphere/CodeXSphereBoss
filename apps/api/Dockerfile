FROM node:20-alpine AS build
WORKDIR /repo

RUN apk add --no-cache openssl

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

FROM node:20-alpine AS runtime
WORKDIR /repo
ENV NODE_ENV=production
RUN apk add --no-cache openssl
COPY --from=build /repo /repo
WORKDIR /repo/apps/api
RUN mkdir -p storage
EXPOSE 4000
CMD ["node", "dist/server.js"]
