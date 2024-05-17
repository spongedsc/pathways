FROM imbios/bun-node:20-alpine
ENV NODE_ENV=PRODUCTION

WORKDIR /app


COPY ["package.json", "bun.lockb", "./"]

RUN bun install --frozen-lockfile --production
COPY . .

CMD bun start
