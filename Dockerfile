# syntax=docker/dockerfile:1

FROM node:18-alpine3.17
ENV NODE_ENV=production

WORKDIR /app

COPY ["package.json", "package-lock.json*", "./"]

COPY . .

CMD ["./run.sh"]