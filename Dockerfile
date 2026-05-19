FROM node:lts AS builder

WORKDIR /app

COPY package.json pnpm-lock.yaml .npmrc ./

RUN corepack enable pnpm && pnpm install --frozen-lockfile --ignore-scripts && pnpm rebuild esbuild sharp

COPY . .

RUN pnpm build

FROM node:lts

COPY --from=builder /app/dist ./dist

RUN npm install -g serve

CMD ["serve", "dist", "-l", "3000"]