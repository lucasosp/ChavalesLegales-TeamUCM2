# Multi-target build for Chavales Legales:
#   backend   FastAPI API (uvicorn, :8000)
#   frontend  Next.js app (:3000), with the LegalinStory novel built into
#             public/novela by frontend/scripts/prepare-novel.mjs
#   caddy     reverse proxy: /api/* and /ws/* -> backend, everything else -> frontend
#
# Build from the repository root:
#   docker compose -f compose.prod.yml build

# ---------------------------------------------------------------- frontend
FROM node:22-alpine AS frontend-build
WORKDIR /src
# Dependency manifests first, so source edits don't bust the npm cache.
COPY LegalinStory/package.json LegalinStory/package-lock.json ./LegalinStory/
RUN cd LegalinStory && npm ci --no-audit --no-fund
COPY frontend/package.json frontend/package-lock.json ./frontend/
RUN cd frontend && npm ci --no-audit --no-fund
COPY LegalinStory ./LegalinStory
COPY frontend ./frontend
# LegalinStory imports its portrait and background photos with
#   new URL("../../../images/sara_normal.png", import.meta.url)
# From LegalinStory/src/content/ that resolves to the REPOSITORY ROOT, not to
# LegalinStory/. Vite hashes those files into frontend/public/novela/assets at
# build time, so they have to exist here. When they are missing Vite only
# warns and leaves the raw path in the bundle, which resolves at runtime to
# /images/... on the web root (Next.js only serves frontend/public) and 404s.
# That is why images/ and fotoss/ must NOT be in .dockerignore.
COPY images ./images
COPY fotoss ./fotoss
# Runs prebuild -> prepare-novel.mjs (vite build of LegalinStory into
# frontend/public/novela) and then next build.
RUN cd frontend && npm run build
# Guard: the photo assets must have been bundled. Without them the novel still
# builds and runs, it just shows no portraits and no backgrounds, so nothing
# above fails loudly. Break the build instead.
# Vite emits the portraits/backgrounds as .webp (see scripts/optimizar-imagenes.py),
# so counting only .png/.jpg always yields 0 and broke every build.
RUN count=$(ls frontend/public/novela/assets/*.webp frontend/public/novela/assets/*.png frontend/public/novela/assets/*.jpg 2>/dev/null | wc -l) \
 && echo "novela photo assets bundled: $count" \
 && [ "$count" -ge 20 ]

FROM node:22-alpine AS frontend
WORKDIR /app
ENV NODE_ENV=production \
    PORT=3000 \
    HOSTNAME=0.0.0.0
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci --omit=dev --no-audit --no-fund && npm cache clean --force
COPY --from=frontend-build /src/frontend/.next ./.next
COPY --from=frontend-build /src/frontend/public ./public
COPY --from=frontend-build /src/frontend/next.config.mjs ./
USER node
EXPOSE 3000
CMD ["node_modules/.bin/next", "start"]

# ----------------------------------------------------------------- backend
FROM python:3.12-slim AS backend
WORKDIR /app
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1 \
    PORT=8000
COPY backend/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt
COPY backend/ ./
COPY deploy/backend-entrypoint.sh /usr/local/bin/backend-entrypoint
RUN chmod +x /usr/local/bin/backend-entrypoint
EXPOSE 8000
ENTRYPOINT ["/usr/local/bin/backend-entrypoint"]

# ------------------------------------------------------------------- caddy
FROM caddy:2-alpine AS caddy
COPY Caddyfile /etc/caddy/Caddyfile
