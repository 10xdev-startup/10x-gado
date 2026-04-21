'use client'

import { AgregadoMensal, SaldoDiario } from '@/components/FluxoCaixaDashboard'
import { formatBRL, mesAbrev } from '@/lib/dataBR'

type Props = {
  data: AgregadoMensal[]
  saldos: SaldoDiario[]
}

function saldoFinalDoMes(saldos: SaldoDiario[], mesRef: string): number | null {
  const mesPattern = mesRef.slice(0, 7)
  const doMes = saldos.filter((s) => s.data && s.data.startsWith(mesPattern))
  if (doMes.length === 0) return null
  return doMes[doMes.length - 1].saldo
}

export default function ResumoMensalTable({ data, saldos }: Props) {
  const totalEntradas = data.reduce((acc, m) => acc + m.entradas, 0)
  const totalSaidas = data.reduce((acc, m) => acc + m.saidas, 0)
  const totalLiquido = totalEntradas - totalSaidas

  return (
    <div className="overflow-x-auto rounded border">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
            <th className="text-left py-2 px-3 font-medium">Mês</th>
            <th className="text-right py-2 px-3 font-medium">Entradas</th>
            <th className="text-right py-2 px-3 font-medium">Saídas</th>
            <th className="text-right py-2 px-3 font-medium">Líquido</th>
            <th className="text-right py-2 px-3 font-medium">Saldo final</th>
          </tr>
        </thead>
        <tbody>
          {data.map((mes) => {
            const saldoFinal = saldoFinalDoMes(saldos, mes.mes_referencia)
            const temMovimento = mes.entradas > 0 || mes.saidas > 0
            return (
              <tr
                key={mes.mes_referencia}
                className={`border-b hover:bg-muted/30 transition-colors ${
                  !temMovimento ? 'text-muted-foreground/40' : ''
                }`}
              >
                <td className="py-2 px-3 font-medium">
                  {mesAbrev(mes.mes_referencia)}
                </td>
                <td className="py-2 px-3 text-right">
                  {temMovimento ? (
                    <span className="text-green-600 dark:text-green-400">
                      {formatBRL(mes.entradas)}
                    </span>
                  ) : (
                    '—'
                  )}
                </td>
                <td className="py-2 px-3 text-right">
                  {temMovimento ? (
                    <span className="text-red-600 dark:text-red-400">
                      {formatBRL(mes.saidas)}
                    </span>
                  ) : (
                    '—'
                  )}
                </td>
                <td className="py-2 px-3 text-right font-medium">
                  {temMovimento ? (
                    <span
                      className={
                        mes.liquido >= 0
                          ? 'text-green-600 dark:text-green-400'
                          : 'text-red-600 dark:text-red-400'
                      }
                    >
                      {formatBRL(mes.liquido)}
                    </span>
                  ) : (
                    '—'
                  )}
                </td>
                <td className="py-2 px-3 text-right">
                  {saldoFinal !== null ? formatBRL(saldoFinal) : '—'}
                </td>
              </tr>
            )
          })}
          {data.some((m) => m.entradas > 0 || m.saidas > 0) && (
            <tr className="bg-muted/30 font-semibold text-xs uppercase tracking-wide">
              <td className="py-2 px-3">Total</td>
              <td className="py-2 px-3 text-right text-green-600 dark:text-green-400">
                {formatBRL(totalEntradas)}
              </td>
              <td className="py-2 px-3 text-right text-red-600 dark:text-red-400">
                {formatBRL(totalSaidas)}
              </td>
              <td
                className={`py-2 px-3 text-right ${
                  totalLiquido >= 0
                    ? 'text-green-600 dark:text-green-400'
                    : 'text-red-600 dark:text-red-400'
                }`}
              >
                {formatBRL(totalLiquido)}
              </td>
              <td className="py-2 px-3 text-right text-muted-foreground">—</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}
