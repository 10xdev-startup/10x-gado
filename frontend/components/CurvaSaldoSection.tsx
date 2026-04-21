'use client'

import { useState, useMemo } from 'react'
import FluxoCaixaSaldoChart from '@/components/FluxoCaixaSaldoChart'
import YearSelector from '@/components/YearSelector'
import { SaldoDiario } from '@/components/FluxoCaixaDashboard'

type Props = {
  saldos: SaldoDiario[]
  anosDisponiveis: string[]
}

export default function CurvaSaldoSection({ saldos, anosDisponiveis }: Props) {
  const [ano, setAno] = useState(
    anosDisponiveis[0] ?? String(new Date().getFullYear())
  )

  const saldosAno = useMemo(
    () => saldos.filter((s) => s.data && s.data.startsWith(ano)),
    [saldos, ano]
  )

  return (
    <div className="rounded-lg border bg-card p-4 flex flex-col gap-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h3 className="text-sm font-medium text-muted-foreground">
          Curva de Saldo
        </h3>
        <YearSelector
          anos={anosDisponiveis}
          selecionado={ano}
          onChange={setAno}
        />
      </div>
      <FluxoCaixaSaldoChart data={saldosAno} />
    </div>
  )
}
