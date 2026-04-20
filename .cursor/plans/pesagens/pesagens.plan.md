# Plano: Adicionar pesagem por data (em lote)

## Objetivo
Permitir que o usuário registre, de uma só vez, a pesagem de vários bois feita em uma mesma data. Ex.: no dia 06/04/26, pesamos N bois — abre um modal, escolhe a data, adiciona uma linha por boi (número + peso), salva, e o sistema cria uma nova `pesagem` para cada animal correspondente.

## Contexto atual

### Schema (Supabase)
- `animais`: `id`, `numero_boi` (único), `vendedor`, `data_compra`, `valor_compra`, `status`, `data_venda`.
- `pesagens`: `id`, `animal_id` (FK → `animais.id`), `numero` (1..N — sequência da pesagem daquele animal), `data`, `peso_kg`, `peso_arroba`.

### Convenções observadas
- 1 arroba = 15 kg → `peso_arroba = peso_kg / 15` (arredondar 2 casas). Pesagens 7-9 do import original não tinham arroba, mas para pesagens novas vamos preencher.
- `numero` da pesagem é calculado a partir do que já existe: `max(pesagens.numero) + 1` para aquele `animal_id`.
- Frontend: `[frontend/components/AnimaisTable.tsx](frontend/components/AnimaisTable.tsx)` achata as pesagens em colunas `p1_kg…p9_kg`, `p1_arroba…`, `p1_data…`. Hoje só existem colunas p1-p9.
- Dados vêm de [frontend/app/(dashboard)/page.tsx](frontend/app/(dashboard)/page.tsx) (server component com `supabase.from('animais').select(...pesagens(...))`).
- Client Supabase: [frontend/lib/supabase/client.ts](frontend/lib/supabase/client.ts) — usa `anon`/`publishable` key. RLS já permite UPDATE em `animais`; **precisa verificar política de INSERT em `pesagens`**.

## UX

### Ponto de entrada
Botão `+ Adicionar pesagem` na barra superior da página de Animais (linha das Pills, ao lado do botão "X bois" ou acima do cabeçalho da tabela).

### Modal
Campos:
- **Data da pesagem** (input `type="date"`, default = hoje). Uma única data para todo o lote.
- **Lista de linhas**. Cada linha:
  - `Nº boi` (input numérico)
  - `Peso (kg)` (input numérico, aceita decimal) — label e placeholder explícitos em **kg**; sufixo visível "kg" dentro do campo para não deixar dúvida. Arroba não é campo de entrada; é derivada.
  - botão `×` para remover a linha
- Botão `+ Adicionar boi` no **topo** da lista (antes da primeira linha), para ficar sempre próximo e acessível mesmo com muitas linhas. Novas linhas são inseridas no **final** da lista, com foco automático no campo `Nº boi` da linha recém-criada (lista rola até o fim).
- Rodapé: botões `Cancelar` e `Salvar`.

### Fluxo
1. Abre modal com 1 linha vazia.
2. Usuário digita data, depois número do boi e peso. Tab/Enter entre campos. Enter no último campo da última linha cria nova linha.
3. Ao clicar `Salvar`:
   - Valida que data está preenchida e todas as linhas têm `numero_boi` e `peso_kg` > 0.
   - Busca todos os `animais` por `numero_boi` (1 query com `.in('numero_boi', [...])`).
   - Se algum número não existir, aborta e mostra lista dos não encontrados. Não salva nada.
   - Para cada animal, calcula o próximo `numero` (precisa do `max(numero)` atual — vem junto no fetch inicial da página, ou fazer query leve). Detalhe abaixo.
   - Faz 1 `insert` em lote com todas as linhas de `pesagens`.
   - Em caso de sucesso: fecha modal, `router.refresh()` para recarregar a tabela.
   - Em caso de erro: `alert` com a mensagem (padrão já usado para status).

## Lógica de salvar

```ts
// 1. Ler todos os numero_boi da lista
const numeros = rows.map(r => r.numero_boi)

// 2. Buscar animais + pesagens existentes
const { data: animais } = await supabase
  .from('animais')
  .select('id, numero_boi, pesagens(numero)')
  .in('numero_boi', numeros)

// 3. Validar que todos existem
const encontrados = new Map(animais.map(a => [a.numero_boi, a]))
const faltando = numeros.filter(n => !encontrados.has(n))
if (faltando.length) { alert(`Bois não encontrados: ${faltando.join(', ')}`); return }

// 4. Montar payload de inserts
const inserts = rows.map(r => {
  const animal = encontrados.get(r.numero_boi)!
  const proxNum = (animal.pesagens.reduce((m, p) => Math.max(m, p.numero), 0)) + 1
  return {
    animal_id: animal.id,
    numero: proxNum,
    data,                            // YYYY-MM-DD
    peso_kg: r.peso_kg,
    peso_arroba: +(r.peso_kg / 15).toFixed(2),
  }
})

// 5. Insert em lote
const { error } = await supabase.from('pesagens').insert(inserts)
```

### Edge cases
- **Boi duplicado na mesma submissão** (mesmo `numero_boi` em duas linhas): validar antes de salvar — provavelmente um erro de digitação; mostrar aviso e deixar o usuário corrigir.
- **Data da pesagem**: sem validação por enquanto — aceita qualquer data (inclusive futuro ou antes de `data_compra`). Motivo: é comum cadastrar a primeira pesagem de um boi sem ter preenchido `data_compra`. Endurecer depois se virar problema.
- **Mais de 9 pesagens**: hoje a tabela só mostra até `p9_*`. O schema não limita, mas o achatamento em [AnimaisTable.tsx](frontend/components/AnimaisTable.tsx) e as cores em `PESAGEM_COLORS` sim. **Decisão**: a tabela precisa crescer dinamicamente. Em vez de `for i=1..9`, calcular `maxPesagem = max(p.numero)` entre todos os animais e iterar `for i=1..maxPesagem`. Gerar colunas `p{i}_data`, `p{i}_kg`, `p{i}_arroba` dinamicamente. Estender `PESAGEM_COLORS` com paleta para 10+ (ou usar função que cicla cores / gera HSL por índice).
- **RLS**: criar policy `INSERT` pública em `pesagens` (similar à UPDATE de `animais`):
  ```sql
  CREATE POLICY "insert livre" ON pesagens FOR INSERT TO public WITH CHECK (true);
  ```
- **Concorrência no cálculo de `numero`**: se duas pessoas inserirem pesagem ao mesmo tempo no mesmo boi, podem gerar o mesmo `numero`. Para o MVP (uso pessoal), aceitável — mas adicionar `UNIQUE (animal_id, numero)` no banco ajudaria a detectar. Follow-up.

## Componentes a criar

### `frontend/components/AddPesagemModal.tsx` (novo, client component)
- Props: `open`, `onClose()`, `onSaved()`.
- Estado interno: `data: string`, `rows: { numero_boi: string; peso_kg: string }[]`, `saving: boolean`, erros de validação por linha.
- Usa `createClient()` de [lib/supabase/client.ts](frontend/lib/supabase/client.ts).
- UI: implementar com elementos nativos + Tailwind, seguindo padrão atual (inputs simples, sem dependência extra). Pode usar `<dialog>` nativo ou um overlay com `fixed inset-0`. Preferir overlay custom para evitar inconsistências entre browsers.

### Integração
- Adicionar `import AddPesagemModal from '@/components/AddPesagemModal'` em [AnimaisTable.tsx](frontend/components/AnimaisTable.tsx).
- Adicionar estado `addPesagemOpen` e botão `+ Adicionar pesagem` na linha das Pills (antes de "X bois" ou num slot novo à esquerda).
- Após salvar, chamar `router.refresh()` (precisa importar `useRouter` de `next/navigation`).

## Passos de implementação

1. **Banco**: adicionar policy `INSERT` em `pesagens` via curl com service role.
2. **Modal**: criar `AddPesagemModal.tsx` com UI (sem salvar ainda — log no console).
3. **Validação no Salvar**: checar data preenchida, campos preenchidos e `numero_boi` sem duplicata na submissão. Buscar animais por `numero_boi` (`.in(...)`) e abortar com lista se algum não existir.
4. **Insert**: montar payload (com `peso_arroba = peso_kg / 15`, 2 casas) + insert em lote + tratamento de erro.
5. **Refresh**: `router.refresh()` ao sucesso, fecha modal.
6. **Tabela dinâmica**: em `AnimaisTable.tsx`, calcular `maxPesagem` a partir dos dados e gerar colunas p1..pN dinamicamente. Estender paleta de cores para N > 9.
7. **Trigger**: botão `+ Adicionar pesagem` em `AnimaisTable.tsx`.
8. **QA manual**: cadastrar pesagem em bois conhecidos; cadastrar uma 10ª pesagem em um boi que já tenha 9 e verificar que aparece na tela.
9. **Typecheck** + commit.

## Fora de escopo (follow-ups)
- Validação inline do `numero_boi` ao sair do campo (mostrando nome/última pesagem).
- Editar/excluir pesagens existentes.
- Validar data contra `data_compra` e contra data atual.
- Constraint `UNIQUE (animal_id, numero)` para proteger contra concorrência.
- Histórico/auditoria de quem inseriu.
