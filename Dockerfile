FROM node:20-alpine AS builder

WORKDIR /app

COPY package.json pnpm-lock.yaml ./

RUN corepack enable pnpm && pnpm install --frozen-lockfile

COPY . .

RUN pnpm build

FROM node:20-alpine

WORKDIR /app

COPY --from=builder /app/dist ./dist

RUN npm install -g serve