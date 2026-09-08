# Hugging Face Spaces runs this image as a long-lived server process, so this is
# the same thing `npm start` does locally - only inside a container.

FROM node:22-slim

# Prisma's query engine links against OpenSSL, which node:*-slim does not ship.
RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

# Spaces run containers as uid 1000. Building as that same user means every file
# the build writes is still writable by the process that starts the server.
RUN useradd -m -u 1000 user
USER user
ENV HOME=/home/user
WORKDIR /home/user/app

# Dependencies first, so editing src/ does not re-run npm ci on every rebuild.
# prisma/ and prisma.config.ts must already be here: `postinstall` runs
# `prisma generate`, which reads both.
COPY --chown=user package.json package-lock.json ./
COPY --chown=user prisma ./prisma
COPY --chown=user prisma.config.ts ./

# `prisma generate` reads the schema and never opens a connection, but it still
# refuses to run unless the datasource variables are defined. These placeholders
# exist for that check alone - the Space's own secrets replace them at runtime,
# and no build step ever reaches a database.
ENV DATABASE_URL="postgresql://build:build@localhost:5432/build"
ENV DIRECT_URL="postgresql://build:build@localhost:5432/build"

# --include=dev is not optional: typescript is a devDependency and `tsc` runs
# in the build step below.
RUN npm ci --include=dev

COPY --chown=user tsconfig.json ./
COPY --chown=user src ./src

RUN npm run build

# Spaces send public traffic to 7860 unless the Space README says otherwise.
# index.ts already reads PORT, so nothing in the app needs to know about this.
ENV NODE_ENV=production
ENV PORT=7860
EXPOSE 7860

CMD ["node", "dist/src/index.js"]
