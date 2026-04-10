# syntax=docker/dockerfile:1.7
FROM node:22-alpine

WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN --mount=type=cache,target=/root/.npm npm install --no-audit --no-fund --prefer-offline

# Copy application files
COPY . .

# Expose port
EXPOSE 3000

# Start the React application
CMD ["npm", "start"]
