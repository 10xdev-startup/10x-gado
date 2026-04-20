# Plano: BoiModal — editar e apagar pesagens

## Objetivo
Permitir que o usuário abra um modal de detalhe de um boi clicando na célula `Nº boi` da tabela e, dentro desse modal, **edite** ou **apague** pesagens existentes desse animal. O nome `BoiModal` é genérico de propósito: começa só com pesagens, mas fica pronto pra crescer (editar `vendedor`, `data_compra`, `status`, `data_venda` depois).

## Contexto atual

### Schema
- `pesagens`: `id`, `animal_id`, `numero` (1..N, sequência da pesagem daquele animal), `data`, `peso_kg`, `peso_arroba`.
- `animais`: `id`, `numero_boi`, `vendedor`, `data_compra`, `valor_compra`, `status`, `data_venda`.

### Convenções
- `peso_arroba = peso_kg / 15` (2 casas, `Math.round(x*100)/100`). Recalcular automaticamente se `peso_kg` mudar.
- Data no front em `dd/mm/yy`, no banco em ISO `YYYY-MM-DD`. Reusar parsers criados em [AddPesagemModal.tsx](frontend/components/AddPesagemModal.tsx).
- RLS hoje: `animais` tem UPDATE público; `pesagens` tem INSERT público (adicionado na feature anterior). **Falta**: UPDATE e DELETE em `pesagens`.

### Arquivos relevantes
- [frontend/components/AnimaisTable.tsx](frontend/components/AnimaisTable.tsx) — tabela que renderiza as colunas `p{i}_data`, `p{i}_kg`, `p{i}_arroba`. Trigger do modal vai aqui.
- [frontend/components/AddPesagemModal.tsx](frontend/components/AddPesagemModal.tsx) — referência de estilo, parsers de data, padrão de erro inline.
- [frontend/app/(dashboard)/page.tsx](<frontend/app/(dashboard)/page.tsx>) — server component que traz `animais` com `pesagens(*)`. Passa os dados pra tabela.

## UX

### Ponto de entrada
A célula `Nº boi` vira clicável (botão/link visual discreto — underline on hover ou cursor-pointer). Click → abre `BoiModal` com aquele animal.

### Modal — layout
- Título: `Boi #123` (com o `numero_boi`).
- Corpo: lista de pesagens, **ordem decrescente por `numero`** (mais recente no topo, mais antiga embaixo), uma linha por pesagem:
  - label `Peso NN:` (zero-padded para 2 dígitos — `Peso 01:`, `Peso 02:`, ... `Peso 10:`)
  - input `data` (dd/mm/yy)
  - input `peso (kg)` (sufixo "kg")
  - botão `×` — **só habilitado na linha de maior `numero`** (última pesagem). Nas outras: visível mas desabilitado (opacity-30, cursor-not-allowed), com `title="Apague a última pesagem primeiro"`.

Arroba não aparece na UI do modal — é derivada de kg e recalculada no save apenas para persistir em `peso_arroba`.
- Banner de erro inline (padrão do `AddPesagemModal`).
- Rodapé: `Cancelar` (esquerda/direita a definir) e `Salvar`.

### Regra de delete
> "Apagar p3 só se antes apagar p5 e p4."

Implementação: a cada render, identificar `max(numero)` entre as pesagens **ainda presentes no estado local**. Só essa linha tem × ativo. Ao clicar ×, a linha é removida do estado local — agora o próximo menor `numero` vira o novo máximo e seu × fica ativo. Cascata natural.

### Edição
- `data` e `peso_kg` são editáveis por linha.
- `peso_arroba` é recalculado apenas no momento do save (não aparece na UI).
- `numero` não é editável (é sequência interna).

### Fluxo
1. Click no `Nº boi` → modal abre com pesagens daquele boi (dados já vêm do server component, não precisa refetch).
2. Usuário edita campos e/ou clica × em linhas (removidas visualmente).
3. Click em `Salvar`:
   - Valida: toda data parsável, todo peso > 0.
   - Diff contra original:
     - `apagadas`: estavam no original, não estão no estado local.
     - `editadas`: estão nos dois, mas `data` ou `peso_kg` mudou.
   - Executa em ordem: `DELETE` em lote → `UPDATE` uma por uma (ou `upsert` em lote).
   - Em caso de erro em qualquer passo: mostra banner, **não fecha**. (Se delete passou e update falhou, o estado fica parcialmente salvo — aceitável pra MVP; follow-up: transação via RPC.)
   - Sucesso: `onClose()` + `router.refresh()`.
4. Cancelar / click fora / × do header → fecha sem salvar (descarta edições).

### Edge cases
- **Apagar todas as pesagens**: permitido. O animal continua existindo sem pesagem.
- **Sem pesagens**: modal abre mostrando "Nenhuma pesagem cadastrada" e só botão `Cancelar`.
- **Data inválida em edição**: banner `"Pesagem #N: data inválida."`, não salva nada.
- **Peso inválido** (≤0 ou NaN): banner similar.
- **Concorrência**: MVP ignora. Se alguém inserir uma pesagem nova enquanto esse modal está aberto, o save do modal pode sobrescrever stale state — mas é uso pessoal.
- **Renumeração após delete**: não fazemos. User confirmou: apagar do meio é edge case e a regra já impede.

## Refatoração — extrair utils de data

`parseDataBR`, `mascaraDataBR`, `hojeBR` hoje vivem dentro de [AddPesagemModal.tsx](frontend/components/AddPesagemModal.tsx). Extrair para `frontend/lib/dataBR.ts` e importar nos dois modais. Reduz duplicação.

## Banco

### RLS
Adicionar via Management API:
```sql
CREATE POLICY "update livre" ON pesagens FOR UPDATE TO public USING (true) WITH CHECK (true);
CREATE POLICY "delete livre" ON pesagens FOR DELETE TO public USING (true);
```

## Componentes

### `frontend/components/BoiModal.tsx` (novo, client)
- Props: `animal: { id, numero_boi, pesagens: Pesagem[] }`, `onClose()`.
- Estado:
  - `linhas: LinhaEdit[]` onde `LinhaEdit = { id, numero, dataBR, peso_kg }` (strings pra edição).
  - `originais: Map<id, Pesagem>` pra diff.
  - `saving`, `erro`.
- UI:
  - Overlay `fixed inset-0 bg-black/40`, painel `max-w-sm` (alinhado ao AddPesagemModal).
  - Cabeçalho com `Boi #{numero_boi}` + ×.
  - Corpo: lista de linhas (ordem decrescente por `numero`).
  - Rodapé: `Cancelar` + `Salvar`.
- Lógica do delete: `const maxNumero = linhas.reduce((m,l) => Math.max(m, l.numero), 0)`; × só ativo se `l.numero === maxNumero`.
- Save: monta `idsParaDeletar` e `updates`; faz `supabase.from('pesagens').delete().in('id', idsParaDeletar)` seguido de N `updates` (ou um `upsert`).

### Integração em `AnimaisTable.tsx`
- Estado: `const [boiSelecionado, setBoiSelecionado] = useState<Animal | null>(null)`.
- Célula `numero_boi`: envolver em `<button onClick={() => setBoiSelecionado(animal)}>` com estilo de link (`underline-offset-2 hover:underline cursor-pointer`).
- Render: `{boiSelecionado && <BoiModal animal={boiSelecionado} onClose={() => setBoiSelecionado(null)} />}`.
- Precisamos reter o objeto animal completo (com pesagens) no row — hoje o dado flattened vive na tabela, mas o `animal` original também está disponível. Verificar durante implementação.

## Passos de implementação

1. **Banco**: criar policies UPDATE e DELETE em `pesagens` via Management API.
2. **Refactor**: extrair `hojeBR`, `parseDataBR`, `mascaraDataBR` para `frontend/lib/dataBR.ts`. Atualizar `AddPesagemModal.tsx` pra importar de lá.
3. **Componente**: criar `BoiModal.tsx` com a UI (lista + ×, edit inputs, footer). Sem salvar ainda — log do diff no console.
4. **Lógica de delete**: × só ativo na última linha, remove do estado local.
5. **Lógica de edit**: inputs controlados de `data` e `peso_kg`. Arroba só entra no payload do save.
6. **Save**: computar diff (deletar + atualizar), executar, tratar erro inline, `router.refresh()` + `onClose()`.
7. **Trigger**: célula `numero_boi` clicável em `AnimaisTable.tsx` + render condicional do modal.
8. **QA manual**:
   - Apagar última pesagem → sucesso, tabela atualiza.
   - Tentar apagar p2 quando existe p3 → × desabilitado.
   - Apagar p3 depois p2 depois p1 em cascata → todas somem.
   - Editar data e peso → salva com `peso_arroba` recalculado no banco.
   - Cancelar com edições pendentes → nada persiste.
9. **Typecheck** + commit.

## Fora de escopo (follow-ups)
- Editar campos do animal (`vendedor`, `data_compra`, `valor_compra`, `status`, `data_venda`) no mesmo modal.
- Adicionar pesagem **dentro** do BoiModal (hoje é só via AddPesagemModal em lote).
- Renumerar pesagens após delete do meio.
- Transação real (RPC no Postgres) pra garantir atomicidade de delete+update.
- Undo / toast de confirmação após salvar.
- Histórico/auditoria.
