# syntax=docker/dockerfile:1.7
FROM node:22-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN --mount=type=cache,target=/root/.npm npm install --no-audit --no-fund --prefer-offline

# Copy application files
COPY . .

# Expose port
EXPOSE 8082

# Start the application
CMD ["npm", "run", "start:production"]
