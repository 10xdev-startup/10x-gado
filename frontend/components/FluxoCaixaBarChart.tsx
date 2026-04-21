'use client'

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'
import { AgregadoMensal } from '@/components/FluxoCaixaDashboard'
import { formatBRL, mesAbrev } from '@/lib/dataBR'

type Props = {
  data: AgregadoMensal[]
}

const chartData = (data: AgregadoMensal[]) =>
  data.map((d) => ({
    mes: mesAbrev(d.mes_referencia),
    Entradas: d.entradas,
    Saídas: d.saidas,
  }))

export default function FluxoCaixaBarChart({ data }: Props) {
  if (data.length === 0) {
    return <p className="text-muted-foreground text-sm">Sem dados no período.</p>
  }

  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={chartData(data)} margin={{ top: 4, right: 4, left: 8, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
        <XAxis
          dataKey="mes"
          tick={{ fontSize: 11 }}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`}
          tick={{ fontSize: 11 }}
          tickLine={false}
          axisLine={false}
          width={56}
        />
        <Tooltip
          formatter={(value, name) => [formatBRL(Number(value)), String(name)]}
          contentStyle={{ fontSize: 12 }}
        />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Bar dataKey="Entradas" fill="#16a34a" radius={[3, 3, 0, 0]} />
        <Bar dataKey="Saídas" fill="#dc2626" radius={[3, 3, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}
