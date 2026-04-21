'use client'

import { useState, useMemo } from 'react'
import ResumoMensalTable from '@/components/ResumoMensalTable'
import YearSelector from '@/components/YearSelector'
import { Transacao, SaldoDiario } from '@/components/FluxoCaixaDashboard'
import { preencherMesesDoAno } from '@/lib/fluxoCaixa'

type Props = {
  transacoes: Transacao[]
  saldos: SaldoDiario[]
  anosDisponiveis: string[]
}

export default function ComparativoAnualSection({
  transacoes,
  saldos,
  anosDisponiveis,
}: Props) {
  const [ano, setAno] = useState(
    anosDisponiveis[0] ?? String(new Date().getFullYear())
  )

  const resumoMensal = useMemo(
    () => preencherMesesDoAno(transacoes, ano),
    [transacoes, ano]
  )

  return (
    <div className="rounded-lg border bg-card p-4 flex flex-col gap-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h3 className="text-sm font-medium text-muted-foreground">
          Comparativo anual
        </h3>
        <YearSelector
          anos={anosDisponiveis}
          selecionado={ano}
          onChange={setAno}
        />
      </div>
      <ResumoMensalTable data={resumoMensal} saldos={saldos} />
    </div>
  )
}
