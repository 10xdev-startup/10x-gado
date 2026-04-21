'use client'

import { useState, useMemo } from 'react'
import FluxoCaixaBarChart from '@/components/FluxoCaixaBarChart'
import YearSelector from '@/components/YearSelector'
import { Transacao } from '@/components/FluxoCaixaDashboard'
import { preencherMesesDoAno } from '@/lib/fluxoCaixa'

type Props = {
  transacoes: Transacao[]
  anosDisponiveis: string[]
}

export default function EntradasSaidasSection({
  transacoes,
  anosDisponiveis,
}: Props) {
  const [ano, setAno] = useState(
    anosDisponiveis[0] ?? String(new Date().getFullYear())
  )

  const agregados = useMemo(
    () => preencherMesesDoAno(transacoes, ano),
    [transacoes, ano]
  )

  return (
    <div className="rounded-lg border bg-card p-4 flex flex-col gap-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h3 className="text-sm font-medium text-muted-foreground">
          Entradas vs Saídas
        </h3>
        <YearSelector
          anos={anosDisponiveis}
          selecionado={ano}
          onChange={setAno}
        />
      </div>
      <FluxoCaixaBarChart data={agregados} />
    </div>
  )
}
