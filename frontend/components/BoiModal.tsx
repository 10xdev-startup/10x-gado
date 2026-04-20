'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { isoToBR, mascaraDataBR, parseDataBR } from '@/lib/dataBR'

type Pesagem = {
  id: string
  numero: number
  data: string | null
  peso_kg: number | null
  peso_arroba: number | null
}

type Animal = {
  id: string
  numero_boi: number
  pesagens: Pesagem[]
}

type LinhaEdit = {
  id: string
  numero: number
  dataBR: string
  peso_kg: string
}

export default function BoiModal({
  animal,
  onClose,
}: {
  animal: Animal
  onClose: () => void
}) {
  const router = useRouter()

  const originais = useMemo(() => {
    const map = new Map<string, Pesagem>()
    for (const p of animal.pesagens) map.set(p.id, p)
    return map
  }, [animal])

  const [linhas, setLinhas] = useState<LinhaEdit[]>(() =>
    [...animal.pesagens]
      .sort((a, b) => b.numero - a.numero)
      .map((p) => ({
        id: p.id,
        numero: p.numero,
        dataBR: p.data ? isoToBR(p.data) : '',
        peso_kg: p.peso_kg != null ? String(p.peso_kg) : '',
      })),
  )
  const [saving, setSaving] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  const maxNumero = linhas.reduce((m, l) => Math.max(m, l.numero), 0)

  function atualizarLinha(id: string, patch: Partial<LinhaEdit>) {
    setLinhas((prev) => prev.map((l) => (l.id === id ? { ...l, ...patch } : l)))
  }

  function removerLinha(id: string) {
    setLinhas((prev) => prev.filter((l) => l.id !== id))
  }

  async function salvar() {
    if (saving) return
    setErro(null)

    const updates: {
      id: string
      data: string
      peso_kg: number
      peso_arroba: number
    }[] = []

    for (const l of linhas) {
      const dataISO = parseDataBR(l.dataBR)
      if (!dataISO) {
        setErro(`Peso ${String(l.numero).padStart(2, '0')}: data inválida.`)
        return
      }
      const peso = parseFloat(l.peso_kg.replace(',', '.').trim())
      if (!Number.isFinite(peso) || peso <= 0) {
        setErro(`Peso ${String(l.numero).padStart(2, '0')}: peso (kg) inválido.`)
        return
      }
      const original = originais.get(l.id)
      if (!original) continue
      const mudouData = original.data !== dataISO
      const mudouPeso = original.peso_kg !== peso
      if (mudouData || mudouPeso) {
        updates.push({
          id: l.id,
          data: dataISO,
          peso_kg: peso,
          peso_arroba: Math.round((peso / 15) * 100) / 100,
        })
      }
    }

    const idsRestantes = new Set(linhas.map((l) => l.id))
    const idsParaDeletar = [...originais.keys()].filter((id) => !idsRestantes.has(id))

    if (idsParaDeletar.length === 0 && updates.length === 0) {
      onClose()
      return
    }

    setSaving(true)
    const supabase = createClient()

    if (idsParaDeletar.length > 0) {
      const { error: deleteErr, count } = await supabase
        .from('pesagens')
        .delete({ count: 'exact' })
        .in('id', idsParaDeletar)

      if (deleteErr || count !== idsParaDeletar.length) {
        setSaving(false)
        setErro(
          `Erro ao apagar pesagens: ${
            deleteErr?.message ??
            `esperava apagar ${idsParaDeletar.length}, apagou ${count ?? 0} (RLS?)`
          }`,
        )
        return
      }
    }

    for (const u of updates) {
      const { data: updated, error: updateErr } = await supabase
        .from('pesagens')
        .update({ data: u.data, peso_kg: u.peso_kg, peso_arroba: u.peso_arroba })
        .eq('id', u.id)
        .select('id')

      if (updateErr || !updated || updated.length === 0) {
        setSaving(false)
        setErro(
          `Erro ao atualizar pesagem: ${
            updateErr?.message ?? 'nenhuma linha foi atualizada (RLS?)'
          }`,
        )
        return
      }
    }

    setSaving(false)
    onClose()
    router.refresh()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="bg-background rounded-lg shadow-lg w-full max-w-sm max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-4 py-3 border-b flex items-center justify-between">
          <h2 className="text-sm font-semibold">Boi #{animal.numero_boi}</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground text-lg leading-none"
            aria-label="Fechar"
          >
            ×
          </button>
        </div>

        <div className="px-4 py-3 flex flex-col gap-3 overflow-auto">
          {erro && (
            <div className="rounded-md border border-red-200 bg-red-50 text-red-800 text-xs px-2 py-1.5">
              {erro}
            </div>
          )}

          {linhas.length === 0 ? (
            <div className="text-xs text-muted-foreground py-2">
              Nenhuma pesagem cadastrada.
            </div>
          ) : (
            <div className="flex flex-col gap-1.5">
              {linhas.map((l) => {
                const isUltima = l.numero === maxNumero
                return (
                  <div key={l.id} className="flex items-center gap-2">
                    <span className="text-[11px] text-muted-foreground w-14 shrink-0">
                      Peso {String(l.numero).padStart(2, '0')}:
                    </span>
                    <input
                      type="text"
                      inputMode="numeric"
                      placeholder="DD/MM/AA"
                      value={l.dataBR}
                      onChange={(e) => atualizarLinha(l.id, { dataBR: mascaraDataBR(e.target.value) })}
                      className="h-8 w-24 rounded-md border border-input bg-background px-2 text-xs font-mono"
                    />
                    <div className="relative flex-1 max-w-[120px]">
                      <input
                        type="number"
                        inputMode="decimal"
                        step="0.1"
                        placeholder="Peso"
                        value={l.peso_kg}
                        onChange={(e) => atualizarLinha(l.id, { peso_kg: e.target.value })}
                        className="h-8 w-full rounded-md border border-input bg-background pl-2 pr-8 text-xs"
                      />
                      <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[11px] text-muted-foreground pointer-events-none">
                        kg
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => removerLinha(l.id)}
                      disabled={!isUltima}
                      title={isUltima ? 'Apagar esta pesagem' : 'Apague a última pesagem primeiro'}
                      className="h-7 w-7 rounded-md border border-input text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                      aria-label="Remover pesagem"
                    >
                      ×
                    </button>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        <div className="px-4 py-3 border-t flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="h-8 rounded-md border border-input bg-background px-3 text-xs hover:bg-muted transition-colors disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={salvar}
            disabled={saving}
            className="h-8 rounded-md bg-foreground text-background px-3 text-xs font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {saving ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </div>
    </div>
  )
}
