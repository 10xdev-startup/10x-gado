# TODOS

Itens de trabalho adiados, com contexto suficiente pra retomar em 3 meses sem precisar reconstruir a conversa que gerou cada um.

Convenção: cada item tem **O quê**, **Por quê**, **Depende de**, **Pros/Cons** e **Onde começar**.

---

## 1. Upload xlsx mensal (fluxo de caixa)

- **O quê:** rota de admin no frontend (`(dashboard)/fluxo-caixa/upload`) e endpoint `POST /api/fluxo-caixa/upload` que recebe um xlsx de extrato bancário, faz preview, valida reconciliação e insere no Supabase.
- **Por quê:** o backfill histórico (jul/2022 → atual) é feito via script Python. Mas a cada mês vai chegar um extrato novo, e subir via script + import manual é fricção desnecessária pra algo que vai repetir ~12×/ano. Preview + validação + idempotência elimina tanto duplicação silenciosa quanto a necessidade de abrir o terminal.
- **Depende de:** backfill inicial concluído (schema de `transacoes_bancarias` e `saldos_diarios` já existente, com `row_hash UNIQUE`). Parser do xlsx idealmente já em TS no backend pra reusar entre endpoint e qualquer outro caller futuro.
- **Pros:** self-service; reconciliação obrigatória no preview evita dado furado; `row_hash` UNIQUE pavimenta idempotência.
- **Cons:** esforço adicional de UI (preview + confirmação + diff quando o mês já foi subido). Vale se o upload vai acontecer mesmo — se o caminho script continuar dominante, adiar mais.
- **Onde começar:** reescrever a lógica de parsing do `scripts/clean_fluxo_caixa.py` em TS dentro de `backend/src/fluxo-caixa/parser.ts`, expor endpoint, criar página de upload espelhando o padrão `(dashboard)/animais`.

---

## 2. Categorização automática por regra

- **O quê:** camada de classificação sobre `transacoes_bancarias.lancamento` que deriva uma categoria estruturada (PIX enviado/recebido, Boleto, Imposto, Tarifa, Cartão, Transferência Interna, Cheque, Saque, Rendimento, Outros). Implementação como view Supabase ou coluna materializada.
- **Por quê:** o campo `Lançamento` do banco já é quase uma taxonomia (`Pix - Enviado`, `Pagamento de Boleto`, `Cobrança de I.O.F.`, `BB Rende Fácil` etc). Sem categoria derivada, toda view de insight (gasto por categoria/mês) precisa repetir o CASE WHEN no SQL. Centralizar vira fonte única de verdade.
- **Depende de:** backfill populando `transacoes_bancarias`. Mapeamento de categorias definido (lista de regras regex sobre `lancamento`).
- **Pros:** toda análise downstream fica mais limpa; auditável (uma tabela `categoria_regras` versionada).
- **Cons:** nenhuma regra cobre 100% — vai existir "Outros" que alguém precisa olhar e re-classificar manualmente. Se o volume for baixo, tudo bem; se for alto, precisa de UI de triagem.
- **Onde começar:** query `SELECT DISTINCT lancamento, COUNT(*) FROM transacoes_bancarias GROUP BY 1 ORDER BY 2 DESC` pra ver a distribuição real. Depois escrever as regras cobrindo ≥95% do volume e deixar o resto como `outros`.

---

## 3. Extrair contraparte do campo `Detalhes`

- **O quê:** parser que extrai o nome da contraparte do campo `Detalhes` (ex: `"09/07 11:37 Soma Comercio De Pneus E P"` → `"Soma Comercio De Pneus E P"`). Armazenar em coluna `contraparte` nova ou em view.
- **Por quê:** sem isso, não dá pra responder "quanto eu gastei no Posto Itacema em 2025" sem LIKE bagunçado. Contraparte é a dimensão de análise mais valiosa depois de categoria.
- **Depende de:** categorização (item 2) ajuda a saber quais `lancamento` têm contraparte utilizável — Pix, Pagamento de Boleto, Transferência sim; Cobrança de Juros, IOF não.
- **Pros:** habilita dashboards "top fornecedores", "gasto recorrente com X".
- **Cons:** parsing é frágil (formato `DD/MM HH:MM NOME` na maioria, mas nem sempre). Nomes chegam truncados a ~30 chars e às vezes em CAPS. Normalização (fuzzy match de "POSTO ITACEMA LTDA" vs "POSTO ITACEMA") é um sub-problema.
- **Onde começar:** regex `^\d{2}/\d{2}\s+\d{2}:\d{2}\s+(.+)$` sobre `detalhes`, depois `INITCAP` e `TRIM`. Fuzzy match fica pra depois.

---

## 4. Views de insights

- **O quê:** views SQL no Supabase que agregam `transacoes_bancarias` para os cortes que o dashboard vai consumir. Pelo menos:
  - `vw_fluxo_caixa_mensal` — por mês: total entradas, total saídas, líquido
  - `vw_fluxo_por_categoria` — por mês × categoria
  - `vw_fluxo_por_contraparte` — por mês × contraparte
  - `vw_saldo_curva` — curva de saldo diário (join com `saldos_diarios`)
- **Por quê:** frontend consumir views é mais rápido e mais simples do que montar agregação em JS. Também força a gente a pensar nos cortes antes de codar tela.
- **Depende de:** itens 2 e 3 (categorização e contraparte) pra as views mais valiosas funcionarem. `vw_fluxo_caixa_mensal` e `vw_saldo_curva` já podem sair com dado cru.
- **Pros:** dashboard via Supabase client fica trivial; views são baratas de iterar.
- **Cons:** nenhum real. Views são descartáveis.
- **Onde começar:** `vw_fluxo_caixa_mensal` e `vw_saldo_curva` como primeira entrega (não dependem das outras TODOs).

---

## 5. Tela `(dashboard)/fluxo-caixa`

- **O quê:** página frontend espelhando o padrão de `(dashboard)/animais`. Cartões de resumo (entradas/saídas/líquido do mês), gráfico de curva de saldo, tabela de transações com filtros por data/categoria/contraparte.
- **Por quê:** dado no banco sem UI não gera insight. A tela é onde a feature vira valor.
- **Depende de:** views (item 4). Idealmente também categorização (item 2) pra filtros fazerem sentido.
- **Pros:** fecha o loop de fluxo de caixa.
- **Cons:** design não existe ainda — gráficos de finanças pessoais têm armadilhas (escalas, cores de positivo/negativo, agrupamento temporal). Vale uma consulta de design rápida antes de implementar.
- **Onde começar:** espelhar estrutura de `frontend/app/(dashboard)/animais/`. Gráfico de saldo via `recharts` (já padrão React). Tabela com `shadcn/ui`.
