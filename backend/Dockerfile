FROM node:20-alpine

WORKDIR /app

# Enable pnpm via corepack
ENV PNPM_HOME="/usr/local/share/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

# Copy workspace manifests + root tsconfigs
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml* ./
COPY tsconfig.base.json tsconfig.paths.json ./

# Copy workspace packages
COPY backend backend
COPY shared shared
COPY ai-service ai-service

# Install all workspace dependencies (dev mode)
RUN pnpm install

WORKDIR /app/backend

ENV NODE_ENV=development
ENV HOST=0.0.0.0
ENV PORT=3333

EXPOSE 3333

# Run Adonis in watch mode inside the container
CMD ["pnpm", "dev"]

