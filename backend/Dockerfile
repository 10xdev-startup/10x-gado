# Backend Dockerfile - Node.js com Express e TypeScript
FROM node:18-alpine AS base

# Instalar dependências do sistema
RUN apk add --no-cache libc6-compat wget

WORKDIR /app

# Copiar arquivos de dependências
COPY package*.json ./

# Instalar dependências de produção
RUN npm install --omit=dev && npm cache clean --force

# Development stage
FROM base AS dev
RUN npm install
COPY . .
EXPOSE 3001
CMD ["npm", "run", "dev"]

# Build stage
FROM base AS builder
RUN npm install
COPY . .

# Build da aplicação TypeScript
RUN npm run build

# Production stage
FROM node:18-alpine AS runner

WORKDIR /app

ENV NODE_ENV production

# Criar usuário não-root para segurança
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 apiuser

# Copiar dependências de produção
COPY --from=base /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package*.json ./

# Criar diretório para logs
RUN mkdir -p /app/logs && chown apiuser:nodejs /app/logs

# Definir permissões
USER apiuser

EXPOSE 3001

# Comando de inicialização
CMD ["npm", "start"]
