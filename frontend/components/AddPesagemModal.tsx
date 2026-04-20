'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

type Linha = {
  id: string
  numero_boi: string
  peso_kg: string
}

function novaLinha(): Linha {
  return {
    id: crypto.randomUUID(),
    numero_boi: '',
    peso_kg: '',
  }
}

function hojeBR() {
  const d = new Date()
  const y = String(d.getFullYear()).slice(-2)
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${day}/${m}/${y}`
}

// '06/04/26' | '06/04/2026' | '060426' → '2026-04-06' | inválido → null
function parseDataBR(s: string): string | null {
  const digits = s.replace(/\D/g, '')
  if (digits.length !== 6 && digits.length !== 8) return null
  const dd = digits.slice(0, 2)
  const mm = digits.slice(2, 4)
  const rest = digits.slice(4)
  const d = parseInt(dd, 10)
  const m = parseInt(mm, 10)
  let y = parseInt(rest, 10)
  if (rest.length === 2) y = 2000 + y
  if (!Number.isFinite(d) || d < 1 || d > 31) return null
  if (!Number.isFinite(m) || m < 1 || m > 12) return null
  if (!Number.isFinite(y) || y < 1900 || y > 2100) return null
  const check = new Date(y, m - 1, d)
  if (check.getFullYear() !== y || check.getMonth() !== m - 1 || check.getDate() !== d) return null
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}

// Auto-insere '/' enquanto o usuário digita
function mascaraDataBR(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 8)
  if (digits.length <= 2) return digits
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`
}

export default function AddPesagemModal({
  onClose,
}: {
  onClose: () => void
}) {
  const router = useRouter()
  const [dataBR, setDataBR] = useState(hojeBR())
  const [linhas, setLinhas] = useState<Linha[]>([novaLinha()])
  const [saving, setSaving] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const numeroRefs = useRef<Record<string, HTMLInputElement | null>>({})
  const focusIdRef = useRef<string | null>(null)
  const listEndRef = useRef<HTMLDivElement | null>(null)
  const datePickerRef = useRef<HTMLInputElement | null>(null)

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

  async function salvar() {
    if (saving) return
    setErro(null)

    const dataISO = parseDataBR(dataBR)
    if (!dataISO) {
      setErro('Data inválida. Use o formato DD/MM/AA.')
      return
    }

    const itens: { numero_boi: number; peso_kg: number }[] = []
    for (let i = 0; i < linhas.length; i++) {
      const l = linhas[i]
      const numero = parseInt(l.numero_boi.trim(), 10)
      const peso = parseFloat(l.peso_kg.replace(',', '.').trim())
      if (!Number.isFinite(numero) || numero <= 0) {
        setErro(`Linha ${i + 1}: número do boi inválido.`)
        return
      }
      if (!Number.isFinite(peso) || peso <= 0) {
        setErro(`Linha ${i + 1}: peso (kg) inválido.`)
        return
      }
      itens.push({ numero_boi: numero, peso_kg: peso })
    }

    const numeros = itens.map((i) => i.numero_boi)
    const duplicados = numeros.filter((n, i) => numeros.indexOf(n) !== i)
    if (duplicados.length > 0) {
      setErro(`Boi repetido na lista: ${Array.from(new Set(duplicados)).join(', ')}.`)
      return
    }

    setSaving(true)
    const supabase = createClient()

    const { data: animais, error: fetchErr } = await supabase
      .from('animais')
      .select('id, numero_boi, pesagens(numero)')
      .in('numero_boi', numeros)

    if (fetchErr) {
      setSaving(false)
      setErro(`Erro ao buscar animais: ${fetchErr.message}`)
      return
    }

    const porNumero = new Map<number, { id: string; maxNumero: number }>()
    for (const a of animais ?? []) {
      const maxNumero = (a.pesagens ?? []).reduce(
        (m: number, p: { numero: number }) => Math.max(m, p.numero),
        0,
      )
      porNumero.set(a.numero_boi, { id: a.id, maxNumero })
    }

    const faltando = numeros.filter((n) => !porNumero.has(n))
    if (faltando.length > 0) {
      setSaving(false)
      setErro(`Bois não encontrados: ${faltando.join(', ')}.`)
      return
    }

    const inserts = itens.map((it) => {
      const animal = porNumero.get(it.numero_boi)!
      animal.maxNumero += 1
      return {
        animal_id: animal.id,
        numero: animal.maxNumero,
        data: dataISO,
        peso_kg: it.peso_kg,
        peso_arroba: Math.round((it.peso_kg / 15) * 100) / 100,
      }
    })

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
          <label className="flex flex-col gap-1 text-xs">
            <span className="text-muted-foreground">Data da pesagem</span>
            <div className="relative w-40">
              <input
                type="text"
                inputMode="numeric"
                placeholder="DD/MM/AA"
                value={dataBR}
                onChange={(e) => setDataBR(mascaraDataBR(e.target.value))}
                className="h-8 w-full rounded-md border border-input bg-background pl-2 pr-8 text-xs font-mono"
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
                className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6 flex items-center justify-center text-muted-foreground hover:text-foreground"
                aria-label="Abrir calendário"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
                <div key={l.id} className="flex items-center gap-2">
                  <span className="text-[11px] text-muted-foreground w-5 text-right">{i + 1}.</span>
                  <input
                    ref={(el) => {
                      numeroRefs.current[l.id] = el
                    }}
                    type="number"
                    inputMode="numeric"
                    placeholder="Nº boi"
                    value={l.numero_boi}
                    onChange={(e) => atualizarLinha(l.id, { numero_boi: e.target.value })}
                    className="h-8 rounded-md border border-input bg-background px-2 text-xs w-24"
                  />
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
