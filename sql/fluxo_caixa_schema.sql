-- Extrato bancário: transações reais
create table if not exists transacoes_bancarias (
  id               uuid primary key default gen_random_uuid(),
  row_hash         text unique not null,           -- idempotência: sha256(mes+data+lancamento+detalhes+ndoc+valor)
  mes_referencia   date not null,                  -- 1º dia do mês do extrato (ex: 2022-07-01)
  data             date not null,
  lancamento       text not null,
  detalhes         text,
  n_documento      text,
  valor            numeric(14, 2) not null,
  tipo             text not null check (tipo in ('entrada', 'saida')),
  tipo_raw         text,                           -- valor original do extrato ('Entrada' / 'Saída')
  created_at       timestamptz default now()
);

create index if not exists idx_transacoes_data on transacoes_bancarias (data);
create index if not exists idx_transacoes_mes  on transacoes_bancarias (mes_referencia);

-- Saldos de abertura (anterior) e fechamento diário — usados para reconciliação e curva de saldo
create table if not exists saldos_diarios (
  id               uuid primary key default gen_random_uuid(),
  mes_referencia   date not null,
  data             date,                           -- null impossível na prática; preserva data real do Saldo Anterior
  tipo_saldo       text not null check (tipo_saldo in ('anterior', 'diario')),
  saldo            numeric(14, 2) not null,
  created_at       timestamptz default now()
);

create index if not exists idx_saldos_mes on saldos_diarios (mes_referencia);
