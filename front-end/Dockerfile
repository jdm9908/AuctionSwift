# Stage 1: Build
FROM node:20-alpine AS builder

WORKDIR /app

# Build arguments for Vite environment variables
ARG VITE_API_URL
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_PUBLIC

# Set as environment variables for the build
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL
ENV VITE_SUPABASE_PUBLIC=$VITE_SUPABASE_PUBLIC

# Copy package files
COPY package.json package-lock.json* ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Stage 2: Production
FROM nginx:alpine

# Copy nginx config template
COPY nginx.conf /etc/nginx/conf.d/configfile.template

# Copy built assets from builder
COPY --from=builder /app/dist /usr/share/nginx/html

# Cloud Run provides PORT env variable, default to 8080
ENV PORT=8080
ENV HOST=0.0.0.0

EXPOSE 8080

# Use envsubst to replace $PORT in nginx config, then start nginx
CMD ["/bin/sh", "-c", "envsubst '$PORT' < /etc/nginx/conf.d/configfile.template > /etc/nginx/conf.d/default.conf && nginx -g 'daemon off;'"]
