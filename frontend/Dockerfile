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
COPY backend/package.json backend/package.json
COPY frontend frontend
COPY shared shared
COPY ai-service ai-service

# Install all workspace deps (dev)
RUN pnpm install

WORKDIR /app/frontend

ENV NODE_ENV=development
EXPOSE 5173

# Run Vite dev server
CMD ["pnpm", "dev", "--host", "0.0.0.0", "--port", "5173"]
