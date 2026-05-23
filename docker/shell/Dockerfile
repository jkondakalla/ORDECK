FROM node:20-alpine AS builder
RUN corepack enable
WORKDIR /repo

# Copy workspace manifests first for layer caching
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml* turbo.json tsconfig.base.json ./
COPY packages/ ./packages/
COPY apps/shell/ ./apps/shell/

RUN pnpm install --frozen-lockfile
RUN pnpm --filter @jkhub/shell build

FROM nginx:alpine
COPY --from=builder /repo/apps/shell/dist /usr/share/nginx/html
COPY docker/shell/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
