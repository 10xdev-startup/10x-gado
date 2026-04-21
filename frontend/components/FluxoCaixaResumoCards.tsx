'use client'

import { Transacao, SaldoDiario } from '@/components/FluxoCaixaDashboard'
import { formatBRL, isoToBR, mesAbrev } from '@/lib/dataBR'

type Props = {
  transacoes: Transacao[]
  saldos: SaldoDiario[]
}

function currentMonthISO(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`
}

function dataLimite30d(): string {
  const d = new Date()
  d.setDate(d.getDate() - 30)
  return d.toISOString().slice(0, 10)
}

export default function FluxoCaixaResumoCards({ transacoes, saldos }: Props) {
  const mesAtual = currentMonthISO()
  const limite30d = dataLimite30d()

  const saldoAtual = saldos.length > 0 ? saldos[saldos.length - 1].saldo : null

  const txMes = transacoes.filter((t) => t.mes_referencia === mesAtual)
  const volumeMes = txMes.reduce(
    (acc, t) => acc + Math.abs(t.valor),
    0
  )

  const tx30d = transacoes.filter((t) => t.data >= limite30d)
  const maiorEntrada = tx30d
    .filter((t) => t.tipo === 'entrada')
    .reduce<Transacao | null>(
      (max, t) => (!max || Math.abs(t.valor) > Math.abs(max.valor) ? t : max),
      null
    )
  const maiorSaida = tx30d
    .filter((t) => t.tipo === 'saida')
    .reduce<Transacao | null>(
      (max, t) => (!max || Math.abs(t.valor) > Math.abs(max.valor) ? t : max),
      null
    )

  return (
    <div className="grid grid-cols-4 gap-4">
      <SaldoCard saldo={saldoAtual} />
      <VolumeCard
        mesLabel={mesAbrev(mesAtual)}
        volume={volumeMes}
        count={txMes.length}
      />
      <DestaqueCard
        label="Maior entrada"
        sublabel="últimos 30 dias"
        transacao={maiorEntrada}
        color="green"
      />
      <DestaqueCard
        label="Maior saída"
        sublabel="últimos 30 dias"
        transacao={maiorSaida}
        color="red"
      />
    </div>
  )
}

function SaldoCard({ saldo }: { saldo: number | null }) {
  const negative = saldo !== null && saldo < 0
  return (
    <div className="rounded-lg border bg-card p-4 flex flex-col gap-1">
      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
        Saldo atual
      </span>
      <p className="text-[11px] text-muted-foreground">conta corrente</p>
      <p
        className={`text-2xl font-semibold mt-2 ${
          negative ? 'text-red-600 dark:text-red-400' : 'text-foreground'
        }`}
      >
        {saldo !== null ? formatBRL(saldo) : '—'}
      </p>
    </div>
  )
}

function VolumeCard({
  mesLabel,
  volume,
  count,
}: {
  mesLabel: string
  volume: number
  count: number
}) {
  return (
    <div className="rounded-lg border bg-card p-4 flex flex-col gap-1">
      <div className="flex items-center gap-2">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Movimento do mês
        </span>
        <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 font-medium">
          {mesLabel}
        </span>
      </div>
      <p className="text-[11px] text-muted-foreground">entradas + saídas</p>
      <p className="text-2xl font-semibold mt-2">{formatBRL(volume)}</p>
      <p className="text-[11px] text-muted-foreground mt-1">
        {count} transaç{count === 1 ? 'ão' : 'ões'}
      </p>
    </div>
  )
}

function DestaqueCard({
  label,
  sublabel,
  transacao,
  color,
}: {
  label: string
  sublabel: string
  transacao: Transacao | null
  color: 'green' | 'red'
}) {
  const valorClass =
    color === 'green'
      ? 'text-green-600 dark:text-green-400'
      : 'text-red-600 dark:text-red-400'

  return (
    <div className="rounded-lg border bg-card p-4 flex flex-col gap-1">
      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
        {label}
      </span>
      <p className="text-[11px] text-muted-foreground">{sublabel}</p>
      {transacao ? (
        <>
          <p className={`text-2xl font-semibold mt-2 ${valorClass}`}>
            {formatBRL(Math.abs(transacao.valor))}
          </p>
          <p
            className="text-[11px] text-foreground/80 truncate mt-1"
            title={transacao.lancamento}
          >
            {transacao.lancamento}
          </p>
          <p className="text-[10px] text-muted-foreground">
            {isoToBR(transacao.data)}
          </p>
        </>
      ) : (
        <p className="text-2xl font-semibold mt-2 text-muted-foreground">—</p>
      )}
    </div>
  )
}
