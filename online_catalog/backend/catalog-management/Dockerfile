# syntax=docker/dockerfile:1.7
FROM node:22-alpine

WORKDIR /app
ENV NODE_ENV=production

COPY package*.json ./
RUN --mount=type=cache,target=/root/.npm npm ci --omit=dev --no-audit --no-fund --prefer-offline

COPY . .

EXPOSE 8081
CMD ["npm", "run", "start:production"]
