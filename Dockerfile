# syntax=docker/dockerfile:1

FROM ghcr.io/puppeteer/puppeteer:latest
ENV NODE_ENV=production

WORKDIR /home/pptruser/

COPY ["package.json", "package-lock.json*", "./"]

USER root
RUN npm install --omit=dev

COPY . .

USER pptruser
CMD ["node", "index.js"]