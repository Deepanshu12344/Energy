# Stage 1: Build the Vite React application
FROM node:22-alpine AS builder

WORKDIR /app

# Copy dependency manifests
COPY package.json package-lock.json* ./
RUN npm ci

# Pass build argument for API URL (defaults to http://localhost:8000/api for local docker-compose)
ARG VITE_API_BASE_URL=http://localhost:8000/api
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}

# Copy frontend configuration and source
COPY index.html tsconfig*.json vite.config.ts tailwind.config.js postcss.config.js ./
COPY public/ ./public/
COPY src/ ./src/

# Build static production bundle
RUN npm run build

# Stage 2: Serve static files with Nginx
FROM nginx:alpine-slim

# Copy custom nginx configuration for SPA routing
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy build artifacts from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 5173

HEALTHCHECK --interval=15s --timeout=5s --start-period=5s --retries=3 \
    CMD wget -q -O /dev/null http://localhost:5173/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
