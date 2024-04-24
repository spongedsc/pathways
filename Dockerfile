FROM oven/bun:alpine
ENV NODE_ENV=production

WORKDIR /app

COPY ["package.json", "bun.lockb", "./"]

RUN bun install --frozen-lockfile --production

COPY . .

USER bun
CMD ["bun", "run", "index.js"]