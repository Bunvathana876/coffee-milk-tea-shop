# ===================================================
# Stage 1: Build the React Application
# ===================================================
FROM node:22-alpine AS builder

WORKDIR /app

# Copy dependency specifications and install cleanly
COPY package*.json ./
RUN npm ci || npm install

# Copy frontend source code
COPY . .

# Build arguments for frontend configuration
ARG VITE_API_URL=http://localhost:8000
ARG VITE_USD_TO_KHR=4100
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_USD_TO_KHR=$VITE_USD_TO_KHR

# Compile TypeScript and build production distribution
RUN npm run build

# ===================================================
# Stage 2: Serve Production Assets with Nginx
# ===================================================
FROM nginx:alpine

# Remove default Nginx configuration
RUN rm -rf /etc/nginx/conf.d/default.conf

# Copy custom Nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy compiled web assets from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Expose HTTP port 80 inside container
EXPOSE 80

# Health check to ensure web server is responding (using 127.0.0.1 to avoid IPv6 resolution quirks in Alpine)
HEALTHCHECK --interval=10s --timeout=3s --start-period=3s --retries=3 \
    CMD wget -q --spider http://127.0.0.1/ || exit 1

# Start Nginx
CMD ["nginx", "-g", "daemon off;"]
