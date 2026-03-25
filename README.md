# Meu Projeto

> Template full-stack moderno com Next.js, Express e Supabase. Pronto para começar.

[![Node.js](https://img.shields.io/badge/Node.js-v22+-green?style=flat-square)](https://nodejs.org)
[![Next.js](https://img.shields.io/badge/Next.js-16-black?style=flat-square)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue?style=flat-square)](https://www.typescriptlang.org)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-v3-06B6D4?style=flat-square)](https://tailwindcss.com)

## 📚 Visão Geral

Projeto full-stack pronto para produção com:

- **Frontend**: Next.js 16 + React 19 com App Router
- **Backend**: Express 5 + TypeScript com padrão Controller → Model → Routes
- **Banco**: Supabase (PostgreSQL)
- **UI**: Radix UI + Tailwind CSS + shadcn/ui
- **Sidebar**: 3 modos de visualização (expandida, colapsada, hover)

Tudo configurado, tipado e pronto para escalar.

## 🚀 Quick Start

### Pré-requisitos

- Node.js >= 18.0.0
- npm ou yarn
- Conta Supabase (https://supabase.com)

### Instalação

```bash
# Clone o repositório
git clone <seu-repo>
cd meu-projeto

# Instale as dependências
npm install

# Configure as variáveis de ambiente
cp .env.example backend/.env
cp .env.example frontend/.env.local

# Edite os arquivos .env com suas credenciais Supabase
```

### Rodando Localmente

```bash
# Modo desenvolvimento (frontend + backend)
npm run dev

# Ou separadamente:

# Terminal 1 - Backend (porta 3001)
cd backend && npm run dev

# Terminal 2 - Frontend (porta 3000)
cd frontend && npm run dev
```

Acesse:
- 🖥️ **Frontend**: http://localhost:3000
- 🔌 **API**: http://localhost:3001

## 📁 Estrutura do Projeto

```
meu-projeto/
├── backend/
│   ├── src/
│   │   ├── controllers/    # Lógica das rotas
│   │   ├── models/         # Operações com banco de dados
│   │   ├── routes/         # Definição das rotas
│   │   ├── middleware/     # Middlewares Express
│   │   ├── types/          # Tipos TypeScript
│   │   ├── database/       # Configuração Supabase
│   │   ├── utils/          # Funções utilitárias
│   │   └── index.ts        # Servidor principal
│   ├── package.json
│   └── tsconfig.json
│
├── frontend/
│   ├── app/
│   │   ├── (dashboard)/    # Rotas protegidas
│   │   ├── layout.tsx      # Layout raiz
│   │   └── globals.css     # Estilos globais
│   ├── components/
│   │   ├── AppSidebar.tsx  # Sidebar principal
│   │   └── ui/             # Componentes Radix UI
│   ├── package.json
│   └── next.config.js
│
└── package.json            # Root workspace
```

## 🎨 Features

### ✨ Sidebar Inteligente

A sidebar do projeto suporta **3 modos de visualização**:

- **Expandida**: Mostra menu completo com ícones e textos
- **Colapsada**: Apenas ícones, economia de espaço
- **Hover**: Expande ao passar o mouse, volta ao repouso

Preferências salvas no `localStorage`, funciona perfeitamente em mobile.

### 🔐 Autenticação Pronta

Integração com Supabase Auth configurada:
- Tipos sincronizados frontend/backend
- Middlewares de proteção de rota
- Gerenciamento de sessão

### 🎭 Componentes UI

Usando **shadcn/ui** + **Radix UI**:
- Botões, Cards, Diálogos
- Dropdowns, Menus
- Toast notifications (Sonner)
- Responsivo e acessível

### 📱 Mobile-First

- Responsive design com Tailwind CSS
- Sidebar adaptável em mobile
- API pronta para PWA

## ⌨️ Comandos Disponíveis

### Root (ambos os projetos)

```bash
npm run dev        # Roda frontend + backend
npm run build      # Build dos dois workspaces
npm run lint       # ESLint em todos os projetos
```

### Backend (`cd backend`)

```bash
npm run dev        # Dev server com nodemon
npm run build      # Compila TypeScript
npm run start      # Roda o build compilado
npm run lint       # Verifica ESLint
npm run lint:fix   # Corrige automaticamente
npm run test       # Jest tests
```

### Frontend (`cd frontend`)

```bash
npm run dev        # Dev server Next.js
npm run build      # Build otimizado
npm run start      # Roda o build
npm run lint       # Verifica ESLint
```

## 🔧 Configuração

### Variáveis de Ambiente

**Backend** (`.env`):
```env
PORT=3001
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_ANON_KEY=xxx
SUPABASE_SERVICE_ROLE_KEY=xxx
```

**Frontend** (`.env.local`):
```env
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=xxx
```

### TypeScript

Projeto com **TypeScript estrito** habilitado:
- `noImplicitAny`: Todos os tipos explícitos
- `noImplicitReturns`: Retorno obrigatório em funções
- `strictNullChecks`: Validação rigorosa de null/undefined

## 📚 Padrões de Código

### Backend

```typescript
// controllers/UserController.ts
static async getUser(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params
    const user = await UserModel.findById(id)

    if (!user) {
      res.status(404).json({ error: 'Usuário não encontrado' })
      return
    }

    res.json({ success: true, data: user })
  } catch (error) {
    res.status(500).json({ error: 'Erro interno' })
  }
}
```

### Frontend

```typescript
// app/(dashboard)/page.tsx
'use client'

import { useEffect, useState } from 'react'

export default function Dashboard() {
  const [data, setData] = useState(null)

  useEffect(() => {
    fetch('/api/data')
      .then(res => res.json())
      .then(setData)
  }, [])

  return <div>{/* conteúdo */}</div>
}
```

### Path Aliases

- **Frontend**: `@/*` → caminho raiz
- **Backend**: `@/*` → `src/*`

Use aliases para imports limpos:
```typescript
import { Button } from '@/components/ui/button'
import { UserModel } from '@/models/UserModel'
```

## 🚀 Deploy

### Frontend (Vercel)

```bash
npm run build
# Faz deploy automático ao fazer push
```

### Backend (Qualquer Node host)

```bash
npm run build
npm start
```

## 📖 Documentação

- [Next.js Docs](https://nextjs.org/docs)
- [Express Docs](https://expressjs.com)
- [Supabase Docs](https://supabase.com/docs)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [Radix UI](https://www.radix-ui.com/docs/primitives/overview/introduction)

## 🤝 Contribuindo

1. Crie uma branch para sua feature (`git checkout -b feature/AmazingFeature`)
2. Commit suas mudanças (`git commit -m 'Add some AmazingFeature'`)
3. Push para a branch (`git push origin feature/AmazingFeature`)
4. Abra um Pull Request

## 📝 Licença

MIT - sinta-se livre para usar

---

## 💡 Feito com 10xDev

Este template foi estruturado seguindo os **CardFeatures da 10xDev**, uma plataforma que documenta código em múltiplas perspectivas (Setup, API, Deploy, Flow).

### 🎓 Entenda o Fluxo do Projeto

Quer aprender como este projeto funciona? Use a plataforma **10xDev** para:

1. **Estudar ComponenteS**: Veja como a Sidebar foi implementada
2. **Entender a Arquitetura**: CardFlow mostra o caminho exato dos dados
3. **Adaptar para seu projeto**: Copie padrões aprovados e customize

### 🚀 Próximos Passos

1. Clone este template
2. Configure o `.env` com suas credenciais
3. Rode localmente (`npm run dev`)
4. Estude os CardFeatures da 10xDev para entender melhor cada camada
5. Customize e adapte para seu projeto

### 📚 CardFeatures Recomendados

- **Sistema de Autenticação JWT** — entenda como proteger rotas
- **CRUD Completo** — padrão Controller → Model
- **Deploy & DevOps** — como colocar em produção
- **CardFlow** — visualize o fluxo de dados da aplicação

Visite **[10xdev.com.br](https://10xdev.com.br)** para descobrir mais templates e documentação estruturada.

---

**Dúvidas?** Abra uma issue ou consulte os CardFeatures na plataforma 10xDev! 🎯
