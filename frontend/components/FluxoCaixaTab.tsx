'use client'

import dynamic from 'next/dynamic'
import type { Transacao, SaldoDiario } from '@/components/FluxoCaixaDashboard'

const FluxoCaixaDashboard = dynamic(
  () => import('@/components/FluxoCaixaDashboard'),
  { ssr: false }
)

type Props = {
  transacoes: Transacao[]
  saldos: SaldoDiario[]
}

export default function FluxoCaixaTab({ transacoes, saldos }: Props) {
  return <FluxoCaixaDashboard transacoes={transacoes} saldos={saldos} />
}
