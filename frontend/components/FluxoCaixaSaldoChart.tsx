'use client'

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts'
import { SaldoDiario } from '@/components/FluxoCaixaDashboard'
import { formatBRL, isoToBR } from '@/lib/dataBR'

type Props = {
  data: SaldoDiario[]
}

export default function FluxoCaixaSaldoChart({ data }: Props) {
  if (data.length === 0) {
    return <p className="text-muted-foreground text-sm">Sem dados no período.</p>
  }

  const chartData = data.map((d) => ({
    data: d.data ? isoToBR(d.data) : '',
    saldo: d.saldo,
  }))

  const hasNegative = data.some((d) => d.saldo < 0)

  return (
    <ResponsiveContainer width="100%" height={280}>
      <LineChart data={chartData} margin={{ top: 4, right: 4, left: 8, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
        <XAxis
          dataKey="data"
          tick={{ fontSize: 10 }}
          tickLine={false}
          axisLine={false}
          interval="preserveStartEnd"
        />
        <YAxis
          tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`}
          tick={{ fontSize: 11 }}
          tickLine={false}
          axisLine={false}
          width={56}
        />
        <Tooltip
          formatter={(value) => [formatBRL(Number(value)), 'Saldo']}
          contentStyle={{ fontSize: 12 }}
        />
        {hasNegative && <ReferenceLine y={0} stroke="#dc2626" strokeDasharray="4 4" />}
        <Line
          type="monotone"
          dataKey="saldo"
          stroke="#2563eb"
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 4 }}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}
