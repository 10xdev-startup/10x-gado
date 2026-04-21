'use client'

import { useState, useMemo } from 'react'
import TransacoesTable from '@/components/TransacoesTable'
import YearSelector from '@/components/YearSelector'
import { Transacao } from '@/components/FluxoCaixaDashboard'

type Props = {
  transacoes: Transacao[]
  anosDisponiveis: string[]
}

export default function TransacoesSection({
  transacoes,
  anosDisponiveis,
}: Props) {
  const [ano, setAno] = useState(
    anosDisponiveis[0] ?? String(new Date().getFullYear())
  )

  const txAno = useMemo(
    () => transacoes.filter((t) => t.data.startsWith(ano)),
    [transacoes, ano]
  )

  return (
    <div className="rounded-lg border bg-card p-4 flex flex-col gap-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h3 className="text-sm font-medium text-muted-foreground">
          Transações
        </h3>
        <YearSelector
          anos={anosDisponiveis}
          selecionado={ano}
          onChange={setAno}
        />
      </div>
      <TransacoesTable data={txAno} />
    </div>
  )
}
