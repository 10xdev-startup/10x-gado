'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { hojeBR, isoToBR, mascaraDataBR, parseDataBR } from '@/lib/dataBR'

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
  boi_planilha: number | null
  status: string | null
  pesagens: Pesagem[]
}

type Candidato = {
  id: string
  numero_boi: number
  status: string | null
}

type Linha = {
  id: string
  boi_planilha: string
  peso_kg: string
  animal_id: string | null
  animal_numero_boi: number | null
  candidatos: Candidato[] | null
}

function novaLinha(): Linha {
  return {
    id: crypto.randomUUID(),
    boi_planilha: '',
    peso_kg: '',
    animal_id: null,
    animal_numero_boi: null,
    candidatos: null,
  }
}

export default function AddPesagemModal({
  animais,
  dataInicialISO,
  onClose,
}: {
  animais: Animal[]
  dataInicialISO?: string
  onClose: () => void
}) {
  const router = useRouter()
  const [dataBR, setDataBR] = useState(dataInicialISO ? isoToBR(dataInicialISO) : hojeBR())
  const [linhas, setLinhas] = useState<Linha[]>([novaLinha()])
  const [saving, setSaving] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const numeroRefs = useRef<Record<string, HTMLInputElement | null>>({})
  const focusIdRef = useRef<string | null>(null)
  const listEndRef = useRef<HTMLDivElement | null>(null)
  const datePickerRef = useRef<HTMLInputElement | null>(null)

  const byPlanilha = useMemo(() => {
    const map = new Map<number, Candidato[]>()
    for (const a of animais) {
      if (a.boi_planilha == null) continue
      const lista = map.get(a.boi_planilha) ?? []
      lista.push({ id: a.id, numero_boi: a.numero_boi, status: a.status })
      map.set(a.boi_planilha, lista)
    }
    for (const lista of map.values()) {
      lista.sort((a, b) => a.numero_boi - b.numero_boi)
    }
    return map
  }, [animais])

  const maxNumeroById = useMemo(() => {
    const map = new Map<string, number>()
    for (const a of animais) {
      const max = a.pesagens.reduce((m, p) => Math.max(m, p.numero), 0)
      map.set(a.id, max)
    }
    return map
  }, [animais])

  useEffect(() => {
    if (focusIdRef.current) {
      const el = numeroRefs.current[focusIdRef.current]
      el?.focus()
      listEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
      focusIdRef.current = null
    }
  }, [linhas])

  function adicionarLinha() {
    const linha = novaLinha()
    focusIdRef.current = linha.id
    setLinhas((prev) => [...prev, linha])
  }

  function removerLinha(id: string) {
    setLinhas((prev) => (prev.length === 1 ? prev : prev.filter((l) => l.id !== id)))
  }

  function atualizarLinha(id: string, patch: Partial<Linha>) {
    setLinhas((prev) => prev.map((l) => (l.id === id ? { ...l, ...patch } : l)))
  }

  function handlePlanilhaChange(id: string, raw: string) {
    const n = parseInt(raw.trim(), 10)
    let patch: Partial<Linha> = {
      boi_planilha: raw,
      animal_id: null,
      animal_numero_boi: null,
      candidatos: null,
    }
    if (Number.isFinite(n) && n > 0) {
      const matches = byPlanilha.get(n) ?? []
      if (matches.length === 1) {
        patch = {
          ...patch,
          animal_id: matches[0].id,
          animal_numero_boi: matches[0].numero_boi,
        }
      } else if (matches.length > 1) {
        patch = { ...patch, candidatos: matches }
      }
    }
    atualizarLinha(id, patch)
  }

  function editarBoi(linhaId: string) {
    atualizarLinha(linhaId, {
      animal_id: null,
      animal_numero_boi: null,
      candidatos: null,
    })
  }

  function escolherCandidato(linhaId: string, c: Candidato) {
    atualizarLinha(linhaId, {
      animal_id: c.id,
      animal_numero_boi: c.numero_boi,
      candidatos: null,
    })
  }

  async function salvar() {
    if (saving) return
    setErro(null)

    const dataISO = parseDataBR(dataBR)
    if (!dataISO) {
      setErro('Data inválida. Use o formato DD/MM/AA.')
      return
    }

    const pesos = new Map<string, number>()
    for (let i = 0; i < linhas.length; i++) {
      const l = linhas[i]
      const peso = parseFloat(l.peso_kg.replace(',', '.').trim())
      if (!Number.isFinite(peso) || peso <= 0) {
        setErro(`Linha ${i + 1}: peso (kg) inválido.`)
        return
      }
      pesos.set(l.id, peso)
      if (l.animal_id) continue
      const n = parseInt(l.boi_planilha.trim(), 10)
      if (!Number.isFinite(n) || n <= 0) {
        setErro(`Linha ${i + 1}: número da planilha inválido.`)
        return
      }
    }

    const semMatch = linhas
      .filter((l) => !l.animal_id && (!l.candidatos || l.candidatos.length === 0))
      .map((l) => l.boi_planilha.trim())

    if (semMatch.length > 0) {
      setErro(`Planilha sem match: ${Array.from(new Set(semMatch)).join(', ')}.`)
      return
    }

    const ambiguas = linhas.filter((l) => !l.animal_id && l.candidatos && l.candidatos.length > 0)
    if (ambiguas.length > 0) {
      setErro('Selecione o boi correto nas linhas marcadas.')
      return
    }

    const ids = linhas.map((l) => l.animal_id!)
    const duplicados = ids.filter((n, i) => ids.indexOf(n) !== i)
    if (duplicados.length > 0) {
      const numsDup = linhas
        .filter((l) => duplicados.includes(l.animal_id!))
        .map((l) => l.animal_numero_boi)
      setErro(`Boi repetido na lista: ${Array.from(new Set(numsDup)).join(', ')}.`)
      return
    }

    const proxPorAnimal = new Map<string, number>()
    for (const id of ids) {
      proxPorAnimal.set(id, maxNumeroById.get(id) ?? 0)
    }

    const inserts = linhas.map((l) => {
      const prox = (proxPorAnimal.get(l.animal_id!) ?? 0) + 1
      proxPorAnimal.set(l.animal_id!, prox)
      const peso = pesos.get(l.id)!
      return {
        animal_id: l.animal_id!,
        numero: prox,
        data: dataISO,
        peso_kg: peso,
        peso_arroba: Math.round((peso / 15) * 100) / 100,
      }
    })

    setSaving(true)
    const supabase = createClient()

    const { data: inseridos, error: insertErr } = await supabase
      .from('pesagens')
      .insert(inserts)
      .select('id')

    if (insertErr || !inseridos || inseridos.length !== inserts.length) {
      setSaving(false)
      setErro(
        `Erro ao salvar pesagens: ${
          insertErr?.message ?? `esperava ${inserts.length} registros, inseriu ${inseridos?.length ?? 0} (RLS?)`
        }`,
      )
      return
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
          <h2 className="text-sm font-semibold">Adicionar pesagem</h2>
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
          <label className="flex flex-col items-center gap-1.5 text-xs">
            <span className="text-muted-foreground">Data da pesagem</span>
            <div className="relative w-52">
              <input
                type="text"
                inputMode="numeric"
                placeholder="DD/MM/AA"
                value={dataBR}
                onChange={(e) => setDataBR(mascaraDataBR(e.target.value))}
                className="h-11 w-full rounded-md border border-input bg-background pl-3 pr-10 text-center text-base font-mono tracking-wider"
              />
              <button
                type="button"
                onClick={() => {
                  const el = datePickerRef.current
                  if (!el) return
                  el.value = parseDataBR(dataBR) ?? ''
                  if (typeof el.showPicker === 'function') el.showPicker()
                  else el.click()
                }}
                className="absolute right-1.5 top-1/2 -translate-y-1/2 h-8 w-8 flex items-center justify-center text-muted-foreground hover:text-foreground"
                aria-label="Abrir calendário"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="4" width="18" height="18" rx="2" />
                  <path d="M16 2v4M8 2v4M3 10h18" />
                </svg>
              </button>
              <input
                ref={datePickerRef}
                type="date"
                tabIndex={-1}
                aria-hidden="true"
                onChange={(e) => {
                  const iso = e.target.value
                  if (!iso) return
                  const [y, m, d] = iso.split('-')
                  setDataBR(`${d}/${m}/${y.slice(-2)}`)
                }}
                className="sr-only pointer-events-none absolute inset-0 opacity-0"
              />
            </div>
          </label>

          <div className="flex flex-col gap-2">
            <div className="flex flex-col gap-1.5">
              {linhas.map((l, i) => (
                <div key={l.id} className="flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-muted-foreground w-5 text-right">{i + 1}.</span>
                    {l.animal_id ? (
                      <button
                        type="button"
                        onClick={() => editarBoi(l.id)}
                        title="Trocar boi"
                        className="h-8 w-24 rounded-md border border-input bg-muted px-2 text-xs text-left hover:bg-muted/70 transition-colors"
                      >
                        {l.boi_planilha} (#{l.animal_numero_boi})
                      </button>
                    ) : (
                      <input
                        ref={(el) => {
                          numeroRefs.current[l.id] = el
                        }}
                        type="number"
                        inputMode="numeric"
                        placeholder="Planilha"
                        value={l.boi_planilha}
                        onChange={(e) => handlePlanilhaChange(l.id, e.target.value)}
                        className={`h-8 rounded-md border bg-background px-2 text-xs w-24 ${
                          l.candidatos ? 'border-amber-400' : 'border-input'
                        }`}
                      />
                    )}
                    <div className="relative flex-1 max-w-[160px]">
                      <input
                        type="number"
                        inputMode="decimal"
                        step="0.1"
                        placeholder="Peso em kg"
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
                      disabled={linhas.length === 1}
                      className="h-7 w-7 rounded-md border border-input text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                      aria-label="Remover linha"
                    >
                      ×
                    </button>
                  </div>
                  {l.candidatos && l.candidatos.length > 0 && (
                    <div className="flex flex-wrap gap-1 pl-7">
                      {l.candidatos.map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => escolherCandidato(l.id, c)}
                          className="h-7 rounded-md border border-input bg-background px-2 text-[11px] hover:bg-muted transition-colors"
                        >
                          #{c.numero_boi} — {c.status ?? '—'}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
              <div ref={listEndRef} />
            </div>
          </div>
        </div>

        <div className="px-4 py-3 border-t flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={adicionarLinha}
            className="h-8 rounded-md border border-input bg-background px-3 text-xs hover:bg-muted transition-colors"
          >
            + Adicionar boi
          </button>
          <div className="flex items-center gap-2">
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
    </div>
  )
}
