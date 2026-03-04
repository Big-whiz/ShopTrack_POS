# ── Build stage ──────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app
COPY package.json .
RUN npm install

# Force invalidate the cache before copying source code
ARG CACHEBUST=1
COPY . .
# Use the production env file if it exists
ARG VITE_API_BASE_URL=/api/v1
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL

RUN npm run build

# ── Production stage ─────────────────────────────────
FROM nginx:1.25-alpine

# Remove default config
RUN rm /etc/nginx/conf.d/default.conf

# Copy React SPA build output
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy nginx SPA config so BrowserRouter works
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
