# syntax=docker/dockerfile:1

# ---- Build stage ------------------------------------------------------------
# Compile the Create React App bundle. Node 24 matches the CI toolchain.
FROM node:24-alpine AS build

WORKDIR /app

# Install deps first (cached until the lockfile changes).
COPY package.json package-lock.json ./
RUN npm ci

# Build the static bundle. CRA reads .env.production here, which pins
# REACT_APP_API_URL and INLINE_RUNTIME_CHUNK=false (external runtime, required
# by the strict CSP). `npm run build` already sets CI=false so warnings don't fail it.
COPY . .
RUN npm run build

# ---- Serve stage ------------------------------------------------------------
# Serve the static files with nginx. Only the build output and config carry over,
# so no source, node_modules, or build toolchain ship in the final image.
FROM nginx:alpine AS production

# SPA routing + security headers (mirrors vercel.json so the image matches prod).
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/build /usr/share/nginx/html

EXPOSE 80

# Container-level health check against the served index.
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider "http://localhost:80/" || exit 1

CMD ["nginx", "-g", "daemon off;"]
