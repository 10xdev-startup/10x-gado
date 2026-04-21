'use client'

import { useMemo } from 'react'
import FluxoCaixaResumoCards from '@/components/FluxoCaixaResumoCards'
import EntradasSaidasSection from '@/components/EntradasSaidasSection'
import CurvaSaldoSection from '@/components/CurvaSaldoSection'
import ComparativoAnualSection from '@/components/ComparativoAnualSection'
import TransacoesSection from '@/components/TransacoesSection'

export type Transacao = {
  id: string
  mes_referencia: string
  data: string
  lancamento: string
  detalhes: string | null
  valor: number
  tipo: 'entrada' | 'saida'
}

export type SaldoDiario = {
  mes_referencia: string
  data: string | null
  saldo: number
}

export type AgregadoMensal = {
  mes_referencia: string
  entradas: number
  saidas: number
  liquido: number
}

type Props = {
  transacoes: Transacao[]
  saldos: SaldoDiario[]
}

export default function FluxoCaixaDashboard({ transacoes, saldos }: Props) {
  const anosDisponiveis = useMemo(() => {
    const set = new Set<string>()
    for (const t of transacoes) set.add(t.data.slice(0, 4))
    return Array.from(set).sort().reverse()
  }, [transacoes])

  return (
    <div className="flex flex-col gap-6 pb-6">
      <h2 className="text-lg font-semibold">Fluxo de Caixa</h2>

      <FluxoCaixaResumoCards transacoes={transacoes} saldos={saldos} />

      <TransacoesSection
        transacoes={transacoes}
        anosDisponiveis={anosDisponiveis}
      />

      <ComparativoAnualSection
        transacoes={transacoes}
        saldos={saldos}
        anosDisponiveis={anosDisponiveis}
      />

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <EntradasSaidasSection
          transacoes={transacoes}
          anosDisponiveis={anosDisponiveis}
        />
        <CurvaSaldoSection
          saldos={saldos}
          anosDisponiveis={anosDisponiveis}
        />
      </div>
    </div>
  )
}
