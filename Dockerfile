FROM node:24-alpine AS build

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
ENV NODE_ENV=production
RUN npm run build

FROM caddy:2-alpine

# Remove all capabilities from the Caddy binary to allow it to run in our
# OpenShift cluster, which runs containers with all capabilities dropped by
# default.
RUN setcap -r /usr/bin/caddy || true

# Run Caddy as non-root user
RUN adduser --disabled-password --no-create-home --uid 1000 caddy

RUN chown -R caddy:caddy /data \
    && chown -R caddy:caddy /config \
    && chown -R caddy:caddy /etc/caddy

USER caddy

COPY --from=build /app/build/client /app
COPY Caddyfile /etc/caddy/Caddyfile
