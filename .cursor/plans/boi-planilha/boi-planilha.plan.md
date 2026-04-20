# Plano: coluna `boi_planilha` + busca por planilha no AddPesagemModal

## Objetivo
Preservar o número original da planilha ("boi físico") em paralelo ao `numero_boi` (único no DB), permitindo que o usuário busque e cadastre pesagens usando o número que ele vê na orelha do animal — mesmo quando esse número colide entre lotes (ex.: boi #5 WB e boi #5 Leilão Igaratinga).

## Contexto
- Planilha tem 660 animais numerados assim:
  - Linhas 3–559 (557 animais): `Boi` 1..557 (batches WB, PI, Leilão UNAI)
  - Linhas 560–661 (103 animais): `Boi` **reseta** em 1..103 (Leilão Igaratinga)
- Import atual: sistema normalizou tudo pra `numero_boi` único 1..660 (primeiros 557 coincidem; Igaratinga virou 558..660).
- Arquivo fonte: `Fazenda.xlsx - Evolução Gado.csv` (ordem idêntica à importação no DB).
- Esquema atual: `animais(id, numero_boi UNIQUE, vendedor, data_compra, valor_compra, status, data_venda)`. RLS: SELECT público, UPDATE público.

## Schema

### Migração
```sql
ALTER TABLE animais ADD COLUMN boi_planilha int;
```
- Sem UNIQUE — colisões intencionais (ex.: dois bois com `boi_planilha=5`).
- Nullable inicialmente (pra rodar o backfill sem quebrar); decisão de `NOT NULL` fica pra depois.

### Backfill
**Passo 1 — validar premissa** (spot-check, antes de rodar UPDATE):
- `numero_boi=1` no DB deve ter vendedor `WB` e 1ª pesagem `01/06/2020, 240 kg` (linha 3 do CSV).
- `numero_boi=557` deve ter vendedor `Leilão UNAI`, 1ª pesagem `05/12/2023, 209 kg`.
- `numero_boi=558` deve ter vendedor `Leilão Igaratinga`, 1ª pesagem `21/11/2024, 224 kg` (boi #1 da planilha Igaratinga).
- `numero_boi=660` deve ter vendedor `Leilão Igaratinga` (último boi).

**Passo 2 — se bater, rodar 1 SQL via Management API**:
```sql
UPDATE animais
SET boi_planilha = CASE
  WHEN numero_boi <= 557 THEN numero_boi
  ELSE numero_boi - 557
END;
```

**Passo 3 — validação pós-backfill**: `SELECT COUNT(*) FROM animais WHERE boi_planilha IS NULL;` deve retornar 0. Spot-check: `SELECT numero_boi, boi_planilha, vendedor FROM animais WHERE numero_boi IN (1, 557, 558, 660);`.

## Frontend — `AddPesagemModal.tsx`

### Comportamento atual
Input `Nº boi` → busca direta por `numero_boi` (igualdade). Se não existir, erro "Bois não encontrados".

### Comportamento novo
- Label muda pra `Boi` (ou `Boi (planilha)`).
- No save, busca por `boi_planilha` (pode retornar >1 linha).
- Se houver ambiguidade em **qualquer** linha digitada, **não salva**. Em vez disso, expande a linha ambígua com uma lista de matches (status + texto auxiliar) pro usuário escolher.
- Cada match mostra: `#{numero_boi} — {status}` (ex.: `#5 — vivo`, `#562 — vivo`).
  - `numero_boi` do sistema serve de desempate visual porque é único.
  - Outros diferenciadores (vendedor, data_compra) ficam fora por simplicidade — usuário confirmou.
- Depois de o usuário escolher, a linha fixa o `animal_id` escolhido e o save prossegue normalmente.

### Modelo de estado
Cada linha passa de `{ numero_boi: string, peso_kg: string }` pra:
```ts
type Linha = {
  id: string
  boi_planilha: string   // o que o usuário digita
  peso_kg: string
  animal_id: string | null  // fixado quando match único OU quando usuário escolhe
  candidatos: Candidato[] | null  // preenchido só quando ambíguo e aguardando escolha
}
type Candidato = { id: string; numero_boi: number; status: string | null }
```

### Fluxo de save (novo)
1. Valida data e pesos como hoje.
2. Busca todos os `boi_planilha` da submissão: `.in('boi_planilha', numeros)`.
3. Agrupa por `boi_planilha`. Pra cada linha:
   - Se 1 match → fixa `animal_id`.
   - Se 0 matches → erro `"Boi X não encontrado na planilha."`.
   - Se ≥2 matches → marca a linha como `candidatos` pro usuário escolher. Banner: `"Selecione o boi correto na linha X."` Não prossegue com o insert.
4. Se todas as linhas tiverem `animal_id`, segue o fluxo atual (buscar pesagens existentes, calcular `numero` próximo, inserir em lote).

### UI das linhas ambíguas
- A linha normal some temporariamente e vira um mini-picker: lista vertical de `[ #123 — vivo ]` botões. Click → fixa `animal_id`, linha volta ao normal com um label read-only `#123 (planilha 5)`.
- Opção `× Trocar` pra voltar a digitar `boi_planilha`.

### Edge cases
- **Duplicado na submissão**: a checagem atual olhava `numero_boi`. Precisa passar a olhar `animal_id` (só faz sentido após resolver ambiguidade — então detectar só depois que todas as linhas têm `animal_id` fixado).
- **Usuário digita `boi_planilha` que coincide com `numero_boi`**: funciona, só importa a busca por `boi_planilha`. Sem conflito.

## Integração em outros pontos
- **Tabela (`AnimaisTable.tsx`)**: adicionar coluna `Planilha` logo após `Boi`, mostrando `boi_planilha`. Permitir ordenar e buscar também por planilha (o input "Buscar boi #" atual vai virar duplo? ou só renomeia? — decisão: adicionar um segundo input "Planilha #" ao lado, mantém os dois filtros ortogonais). Mantém cell clicável no `numero_boi` (trigger do BoiModal) como está.
- **BoiModal**: título passa a ser `Boi #{numero_boi} (planilha #{boi_planilha})`.

## Passos de implementação
1. **Schema**: `ALTER TABLE animais ADD COLUMN boi_planilha int;` via Management API.
2. **Spot-check de premissa**: conferir 4 bois (numero_boi 1, 557, 558, 660) via SQL × CSV.
3. **Backfill**: 1 UPDATE com `CASE` via Management API.
4. **Validação pós-backfill**: count de nulls + spot-check em 4 bois.
5. **Types**: `Animal` em `AnimaisTable.tsx` ganha `boi_planilha: number | null`. Atualizar selects em `page.tsx` e `animais/page.tsx` pra incluir `boi_planilha`.
6. **AnimaisTable**: coluna `Planilha` + input "Planilha #" nos filtros.
7. **AddPesagemModal**: reescrever a lógica de busca pra por `boi_planilha`, suportar multi-match com picker inline.
8. **BoiModal**: título passa a exibir `Boi #{numero_boi} (planilha #{boi_planilha})`.
9. **QA manual**:
   - Cadastrar pesagem em boi sem colisão (ex.: #5 WB) → salva direto.
   - Cadastrar pesagem em boi #5 (ambíguo entre WB e Igaratinga) → aparece picker → escolhe → salva.
   - Boi não cadastrado na planilha → erro claro.
   - Tabela mostra `Planilha` e filtro funciona.
10. **Typecheck** + commit.

## Fora de escopo (follow-ups)
- Tornar `boi_planilha` NOT NULL (depois de confirmarmos que todos têm).
- Editar `boi_planilha` no BoiModal (se precisar corrigir depois).
- Unificar busca (AddPesagemModal + futuros filtros globais) em um componente comum.
