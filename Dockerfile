FROM oven/bun:alpine
ENV NODE_ENV=PRODUCTION

COPY --from=node:lts /usr/local/bin/node /usr/bin/node

WORKDIR /app

COPY ["package.json", "bun.lockb", "./"]

RUN bun install --frozen-lockfile --production
COPY . .

CMD bun start
