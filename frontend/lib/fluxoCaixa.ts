import type {
  Transacao,
  AgregadoMensal,
} from '@/components/FluxoCaixaDashboard'

export function preencherMesesDoAno(
  transacoes: Transacao[],
  ano: string
): AgregadoMensal[] {
  const byMonth = new Map<string, AgregadoMensal>()
  for (let m = 1; m <= 12; m++) {
    const mesRef = `${ano}-${String(m).padStart(2, '0')}-01`
    byMonth.set(mesRef, {
      mes_referencia: mesRef,
      entradas: 0,
      saidas: 0,
      liquido: 0,
    })
  }
  for (const t of transacoes) {
    if (!t.mes_referencia.startsWith(ano)) continue
    const agg = byMonth.get(t.mes_referencia)
    if (!agg) continue
    if (t.tipo === 'entrada') agg.entradas += t.valor
    else agg.saidas += Math.abs(t.valor)
    agg.liquido = agg.entradas - agg.saidas
  }
  return Array.from(byMonth.values())
}
