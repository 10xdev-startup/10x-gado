# Frontend Dockerfile - Next.js com TypeScript
FROM node:18-alpine AS base

# Instalar dependências necessárias para compilação
RUN apk add --no-cache libc6-compat wget

WORKDIR /app

# Copiar package.json
COPY package*.json ./

# Instalar dependências
RUN npm install --omit=dev --legacy-peer-deps

# Development stage
FROM base AS dev
RUN npm install --legacy-peer-deps
COPY . .
EXPOSE 3000
CMD ["npm", "run", "dev"]

# Build stage
FROM base AS builder
RUN npm install --legacy-peer-deps
COPY . .

# Definir variáveis de ambiente para build
ENV NEXT_TELEMETRY_DISABLED 1
ENV NODE_ENV production

# Definir ARG e ENV para API URL
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

# Definir ARG e ENV para variáveis Supabase
ARG NEXT_PUBLIC_SUPABASE_URL
ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY
ENV NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY

# Definir ARG e ENV para APP URL (necessário para redirect correto atrás de proxy)
ARG NEXT_PUBLIC_APP_URL
ENV NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL

# Build da aplicação
RUN npm run build

# Production stage
FROM node:18-alpine AS runner

WORKDIR /app

ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copiar arquivos necessários do build standalone
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# Definir permissões corretas
USER nextjs

EXPOSE 8080

ENV PORT 8080
ENV HOSTNAME "0.0.0.0"

CMD ["node", "server.js"]
