FROM node:20-alpine AS base
WORKDIR /repo
COPY package.json package-lock.json* ./
COPY apps/web/package.json apps/web/package.json
COPY packages/shared/package.json packages/shared/package.json
RUN npm install --workspaces --include-workspace-root

FROM base AS build
COPY packages/shared packages/shared
COPY apps/web apps/web

WORKDIR /repo/packages/shared
RUN npm run build

WORKDIR /repo/apps/web
ARG VITE_API_URL=/api
ENV VITE_API_URL=$VITE_API_URL
RUN npm run build

FROM nginx:alpine AS runtime
COPY --from=build /repo/apps/web/dist /usr/share/nginx/html
COPY apps/web/nginx.conf /etc/nginx/templates/default.conf.template
ENV PORT=80
EXPOSE 80
