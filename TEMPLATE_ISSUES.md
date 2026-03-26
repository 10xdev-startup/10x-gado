# Problemas encontrados no template — 10x-gado (mar/2026)

Lista de problemas encontrados ao usar o template nesse projeto,
para corrigir nas próximas versões.

---

## 1. `package.json` na raiz do monorepo

**Problema:** Havia um `package.json` (e `package-lock.json`) na raiz do projeto,
além dos que ficam em `frontend/` e `backend/`. O Turbopack (usado pelo Next.js 16)
detecta múltiplos lockfiles e escolhe a raiz errada como workspace root.
Resultado: `npm run dev` ficava preso em `Compiling /...` para sempre, sem erro visível.

**Fix no template:** Não deixar nenhum `package.json` na raiz do monorepo a menos que
seja um workspace real (com `workspaces` configurado). Se alguém instalar um pacote
na pasta errada por acidente, o `.gitignore` da raiz deve ignorar `package-lock.json`.

---

## 2. `next/font/google` no layout padrão

**Problema:** O template usa `Inter` de `next/font/google` no `app/layout.tsx`.
Em WSL2, essa importação pode travar a compilação ao tentar buscar a fonte do Google
na primeira execução (problema de rede no WSL2).

**Fix no template:** Usar fonte local com `next/font/local`, ou hospedar o arquivo
de fonte dentro do projeto. Elimina a dependência de rede na inicialização.

---

## 3. Nome da variável de ambiente do Supabase

**Problema:** O código usava `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, mas o dashboard
do Supabase exibe a chave com o nome "Publishable **Default** Key", induzindo o usuário
a nomear a variável como `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY` no `.env`.
A divergência faz o cliente Supabase inicializar com `undefined`.

**Fix no template:** Adicionar um comentário claro no `.env.example`:

```env
# Chave encontrada em: Supabase → Project Settings → API → "Publishable default key"
# Atenção: copie só o valor — o nome da variável aqui é fixo e não deve mudar
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
```

---

## 4. `.env` com valores vazios sem aviso visível

**Problema:** O template entrega o `.env` com as variáveis do Supabase vazias
(`NEXT_PUBLIC_SUPABASE_URL=`). O middleware tenta chamar `supabase.auth.getClaims()`
com credenciais inválidas, podendo causar hang silencioso ou redirect loop.

**Fix no template:** Adicionar uma verificação de startup que avise claramente
se as variáveis obrigatórias estiverem faltando. Exemplo em `lib/supabase/client.ts`:

```ts
if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
  throw new Error('NEXT_PUBLIC_SUPABASE_URL não definida. Configure o .env.')
}
```

Ou usar um script de `predev` no `package.json` que valida as variáveis antes de subir.
