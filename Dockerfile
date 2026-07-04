# Multi-stage build: Node builds the static site, nginx serves it.

# Stage 1: Build the static site
FROM node:22-alpine AS builder

WORKDIR /app

# Copy manifest first for better layer caching
COPY package.json package-lock.json ./
RUN npm ci

# Copy source and build
COPY . .
RUN npm run build

# Stage 2: Serve static output with Nginx
FROM nginx:alpine

COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf

EXPOSE 80
