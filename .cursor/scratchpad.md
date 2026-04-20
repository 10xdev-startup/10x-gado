# Background and Motivation

- Ajustes visuais na tela `Animais`, principalmente na tabela de `Evolução`.
- Problema atual investigado em modo Executor: a paginação no topo direito está sendo cortada para fora da área visível.
- Novo pedido em modo Executor: adicionar um filtro `select` para ver apenas bois vivos dentro de uma faixa de peso.
- Novo pedido em modo Planner: permitir clicar na célula de status (`Vivo`, `Morreu`, `Vendido`) para alterar o status diretamente na tabela.

# Key Challenges and Analysis

- A linha superior de filtros e paginação em `frontend/components/AnimaisTable.tsx` usa `flex` com `justify-between`, um bloco esquerdo com `flex-1` e um bloco direito com paginação.
- Os controles do bloco esquerdo (`input` e `selects`) têm largura intrínseca relevante e não reduzem bem.
- Quando a soma das larguras dos filtros com a paginação excede a largura disponível, o topo transborda horizontalmente.
- Esse transbordamento é recortado pelo layout do dashboard em `frontend/app/(dashboard)/layout.tsx`, que usa `overflow-hidden` no container principal.
- Hoje a tabela é somente leitura: `frontend/app/(dashboard)/page.tsx` busca dados no servidor com Supabase e `frontend/components/AnimaisTable.tsx` apenas renderiza/filtra localmente.
- Já existe `createBrowserClient` em `frontend/lib/supabase/client.ts`, então há base para mutation no cliente sem criar outra stack.
- O status hoje é exibido por `StatusBadge`, sem affordance de edição. Precisamos decidir a UX: clique simples abrindo menu de opções é o caminho mais leve e mais compatível com tabela.
- Mudança de status pode ter efeitos de negócio:
  - `vendido` pode exigir ou ao menos sugerir `data_venda`
  - `morreu` talvez devesse bloquear futuras operações/filtros específicos
  - voltar de `vendido`/`morreu` para `vivo` pode precisar confirmação
- Como já existem filtros por status e por faixa de peso de vivos, a atualização precisa refletir imediatamente na lista atual; do contrário o usuário vai mudar para `vendido` e continuar vendo a linha erroneamente até refresh.
- Precisamos decidir entre mutation direta no cliente via Supabase ou route/server action.
  - Cliente é mais rápido de implementar
  - Server action/route dá melhor centralização de validações e auditoria futura
- Também precisamos tratar concorrência/feedback:
  - desabilitar o badge enquanto salva
  - mostrar erro se falhar
  - aplicar update otimista ou fazer refresh da query após salvar

# High-level Task Breakdown

- [x] Confirmar a causa do corte da paginação com base no layout atual.
  - Critério de sucesso: explicar quais containers e regras CSS geram o overflow e onde ele é recortado.
- [ ] Validar visualmente a nova estrutura do topo após a correção.
  - Critério de sucesso: paginação permanece totalmente visível, sem depender do scroll da tabela.
- [ ] Definir comportamento de edição inline do status.
  - Critério de sucesso: fluxo escolhido para clique, opções disponíveis, confirmações e efeitos colaterais documentados.
- [ ] Implementar mutation segura para atualizar `animais.status`.
  - Critério de sucesso: mudar status salva no banco, mostra feedback e não deixa a UI inconsistente.
- [ ] Atualizar a tabela após troca de status.
  - Critério de sucesso: filtros e linhas refletem imediatamente o novo status sem refresh manual.
- [ ] Validar regras de negócio mínimas da troca de status.
  - Critério de sucesso: transitions sensíveis (`vendido`, `morreu`) têm confirmação e não geram dados inválidos silenciosamente.

# Project Status Board

- [x] Investigar regressões recentes na estrutura da tabela.
- [x] Identificar a causa do corte da paginação no topo.
- [ ] Validar em tela a correção de layout no topo.
- [ ] Validar em tela o novo filtro de peso para bois vivos.
- [ ] Definir UX e regras para edição inline de status.
- [ ] Implementar alteração de status clicando no badge.

# Executor's Feedback or Assistance Requests

- A causa encontrada aponta para conflito entre a largura mínima combinada dos filtros e da paginação no topo versus a largura útil da página.
- O corte visual final acontece porque o dashboard usa `overflow-hidden`, então qualquer excesso horizontal nesse topo some em vez de gerar scroll.
- Correção aplicada: o topo trocou de `flex` para `grid`, com uma coluna dedicada para a paginação em larguras maiores e queda controlada para a linha seguinte quando faltar espaço.
- Ajuste adicional aplicado: o topo agora usa sempre duas colunas (`minmax(0,1fr)` + `auto`), mantendo a paginação na mesma linha e presa à direita.
- Ajuste adicional aplicado: a coluna esquerda do topo agora tem `overflow-x-auto`, então só os filtros se deslocam quando faltar espaço; a paginação continua fixa e visível à direita.
- Ajuste adicional aplicado: a linha superior foi compactada com gaps menores, controles mais estreitos e paginação menor para reduzir a largura total.
- Ajuste adicional aplicado: a toolbar superior agora usa largura útil um pouco menor e folga à direita para evitar que a paginação fique colada no limite recortado do dashboard.
- Ajuste adicional aplicado: a toolbar superior agora usa margem horizontal real (`mx`) e o bloco da paginação ganhou mais respiro à direita.
- Ajuste adicional aplicado: a toolbar superior agora usa `pr-12`, igual à folga direita do conteúdo da tabela, para terminar na mesma linha visual.
- Ajuste adicional aplicado: topo e tabela agora compartilham o mesmo `px-2` externo, para encerrar no mesmo limite lateral.
- Ajuste adicional aplicado: a borda da tabela saiu do container de scroll e foi para o wrapper interno, para a linha superior terminar junto com a última coluna.
- Ajuste adicional aplicado: a caixa com `rounded-md border` agora fica separada do `pr-12`, para o canto direito arredondado aparecer no fim real da tabela.
- Ajuste adicional aplicado: o topo passou a usar a mesma estrutura em dois níveis da tabela, com `pr-12` no wrapper externo e conteúdo real num wrapper interno.
- Ajuste adicional aplicado: o topo agora usa `inline-block min-w-full`, igual ao wrapper da tabela, para alinhar o fim visual com a mesma base de largura.
- Ajuste adicional aplicado: o topo ganhou `pr-16` para compensar a largura consumida pela scrollbar vertical da área da tabela, que fazia a paginação parecer mais à direita.
- Ajuste adicional aplicado: a linha da aba `Evolução` agora também usa wrapper com `px-2` e `pr-16`, para encerrar no mesmo limite visual do topo e da tabela.
- Ajuste adicional aplicado: os filtros agora compartilham uma classe de foco com `border-ring` e `ring-inset`, para a borda ficar visível ao clicar inclusive no topo e embaixo.
- Novo filtro aplicado: `Vivos: todos os pesos` / `x a y kg`, usando `ultimo_kg`, restringindo para `status = vivo` quando uma faixa e selecionada, e agora agrupando em faixas de `100 kg`.
- Ajuste adicional aplicado: cada opcao do filtro de peso agora mostra tambem a faixa equivalente em arrobas (`@`), usando 30 kg por arroba.
- Ajuste adicional aplicado: as opcoes do filtro de peso agora aparecem do maior para o menor.
- Investigacao adicional: o frontend roda com `npm run dev` -> `next dev`, e o terminal mostra `Next.js 16.1.6 (Turbopack)`, o que fornece Fast Refresh/HMR para alteracoes em TS/TSX sem precisar recarregar manualmente na maioria dos casos.
- Recomendacao de planejamento: para a primeira versao, usar clique no badge -> dropdown com `Vivo`, `Morreu`, `Vendido`, mutation unica de `status`, loading local por linha e refresh local imediato da tabela. Confirmacao apenas para mudancas destrutivas (`morreu` e `vendido`) e deixar `data_venda` para uma etapa separada, a menos que o usuario queira acoplar isso agora.
- Preciso da sua validação visual para marcar essa etapa como concluída.

# Lessons

- Em layouts com tabela larga e dashboard com `overflow-hidden`, a toolbar superior não pode depender de uma única linha com grupos rígidos; precisa quebrar ou reduzir em largura de forma explícita.
- Quando a paginação precisa ficar sempre visível, vale isolar o overflow apenas na área dos filtros em vez de no toolbar inteiro.
- Para filtro de faixa por `select`, usar opções dinâmicas a partir dos pesos reais evita manter listas manuais desatualizadas; neste caso, as faixas foram padronizadas em `100 kg`.
- Neste projeto, quando esse filtro mostrar equivalencia em arrobas, considerar `1 @ = 30 kg`.
- Para edição inline em tabela já filtrada, planejar desde o início como a linha deve reagir após mutation bem-sucedida; caso contrário a UI aparenta falha mesmo com o banco atualizado.
