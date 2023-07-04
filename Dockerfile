# syntax=docker/dockerfile:1

FROM ghcr.io/puppeteer/puppeteer:latest
ENV NODE_ENV=production

WORKDIR /app

COPY ["package.json", "package-lock.json*", "./"]

RUN npm install --production

COPY . .

CMD ["node", "index.js"]