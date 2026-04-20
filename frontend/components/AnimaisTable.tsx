'use client'

import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  getPaginationRowModel,
  flexRender,
  ColumnDef,
  ColumnFiltersState,
  SortingState,
  RowData,
  Row,
} from '@tanstack/react-table'
import { useState, useMemo } from 'react'
import { ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { createClient } from '@/lib/supabase/client'
import AddPesagemModal from '@/components/AddPesagemModal'
import BoiModal from '@/components/BoiModal'

declare module '@tanstack/react-table' {
  interface ColumnMeta<TData extends RowData, TValue> {
    pesagemNum?: number
  }
}

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
  vendedor: string | null
  data_compra: string | null
  valor_compra: number | null
  status: string | null
  data_venda: string | null
  pesagens: Pesagem[]
}

type AnimalRow = {
  id: string
  numero_boi: number
  vendedor: string | null
  data_compra: string | null
  valor_compra: number | null
  status: string | null
  data_venda: string | null
  ultimo_kg: number | null
  ultima_data: string | null
  datas_pesagens: string[]
  [key: string]: unknown
}

// ---------------------------------------------------------------------------
// Cores por pesagem
// ---------------------------------------------------------------------------
const PESAGEM_COLOR_PALETTE: { header: string; cell: string }[] = [
  { header: 'bg-blue-200',    cell: 'bg-blue-50' },
  { header: 'bg-green-200',   cell: 'bg-green-50' },
  { header: 'bg-purple-200',  cell: 'bg-purple-50' },
  { header: 'bg-orange-200',  cell: 'bg-orange-50' },
  { header: 'bg-pink-200',    cell: 'bg-pink-50' },
  { header: 'bg-cyan-200',    cell: 'bg-cyan-50' },
  { header: 'bg-amber-200',   cell: 'bg-amber-50' },
  { header: 'bg-red-200',     cell: 'bg-red-50' },
  { header: 'bg-gray-200',    cell: 'bg-gray-50' },
  { header: 'bg-teal-200',    cell: 'bg-teal-50' },
  { header: 'bg-indigo-200',  cell: 'bg-indigo-50' },
  { header: 'bg-lime-200',    cell: 'bg-lime-50' },
  { header: 'bg-rose-200',    cell: 'bg-rose-50' },
  { header: 'bg-fuchsia-200', cell: 'bg-fuchsia-50' },
  { header: 'bg-sky-200',     cell: 'bg-sky-50' },
]

function pesagemColor(num: number) {
  return PESAGEM_COLOR_PALETTE[(num - 1) % PESAGEM_COLOR_PALETTE.length]
}

// ---------------------------------------------------------------------------
// Status
// ---------------------------------------------------------------------------
const STATUS_LABEL: Record<string, string> = {
  vivo: 'Vivo', morreu: 'Morreu', vendido: 'Vendido',
}
const STATUS_CLASS: Record<string, string> = {
  vivo: 'bg-green-100 text-green-800',
  morreu: 'bg-red-100 text-red-800',
  vendido: 'bg-yellow-100 text-yellow-800',
}

function StatusSelect({
  status,
  onChange,
}: {
  status: string | null
  onChange: (next: string) => void
}) {
  const key = status ?? ''
  const cls = STATUS_CLASS[key] ?? 'bg-gray-100 text-gray-700'
  return (
    <select
      value={key}
      onChange={(e) => onChange(e.target.value)}
      onClick={(e) => e.stopPropagation()}
      className={`rounded-full px-2 py-0.5 text-xs font-medium border-0 focus:outline-none focus:ring-1 focus:ring-ring/30 cursor-pointer ${cls}`}
    >
      <option value="vivo">Vivo</option>
      <option value="morreu">Morreu</option>
      <option value="vendido">Vendido</option>
    </select>
  )
}

function formatDate(s: string | null | unknown) {
  if (!s || typeof s !== 'string') return '—'
  const [y, m, d] = s.split('-')
  return `${d}/${m}/${y}`
}

function formatBRL(n: number | null) {
  if (n == null) return '—'
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function numFmt(v: unknown) {
  if (v == null) return '—'
  return String(v)
}

function formatArrobaRange(kg: number) {
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(kg / 30)
}

function compareNullableNumbers(a: number | null, b: number | null) {
  if (a == null && b == null) return 0
  if (a == null) return 1
  if (b == null) return -1
  return a - b
}

function compareNullableIsoDates(a: string | null, b: string | null) {
  if (!a && !b) return 0
  if (!a) return 1
  if (!b) return -1
  return a.localeCompare(b)
}

// ---------------------------------------------------------------------------
// Componente
// ---------------------------------------------------------------------------
export default function AnimaisTable({ data }: { data: Animal[] }) {
  const filterControlClass =
    'h-6 rounded-md border border-input bg-background px-2 text-[11px] box-border ' +
    'focus-visible:outline-none focus-visible:border-ring focus-visible:ring-1 ' +
    'focus-visible:ring-inset focus-visible:ring-ring/30'
  const pesoBucketSize = 100

  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [sorting, setSorting] = useState<SortingState>([{ id: 'numero_boi', desc: false }])
  const [boiSearch, setBoiSearch] = useState('')
  const [sortKey, setSortKey] = useState('numero_boi-asc')
  const [pesoRange, setPesoRange] = useState('')
  const [pesagemDateFilters, setPesagemDateFilters] = useState<string[]>([])
  const [statusOverrides, setStatusOverrides] = useState<Record<string, string>>({})
  const [addPesagemOpen, setAddPesagemOpen] = useState(false)
  const [boiSelecionado, setBoiSelecionado] = useState<Animal | null>(null)

  const animaisById = useMemo(() => {
    const map = new Map<string, Animal>()
    for (const a of data) map.set(a.id, a)
    return map
  }, [data])

  async function handleStatusChange(id: string, next: string) {
    let hadOverride = false
    let prevOverride: string | undefined
    setStatusOverrides((o) => {
      hadOverride = id in o
      prevOverride = o[id]
      return { ...o, [id]: next }
    })
    const supabase = createClient()
    const { data, error } = await supabase.from('animais').update({ status: next }).eq('id', id).select('id')
    if (error || !data || data.length === 0) {
      setStatusOverrides((o) => {
        const copy = { ...o }
        if (hadOverride && prevOverride !== undefined) copy[id] = prevOverride
        else delete copy[id]
        return copy
      })
      alert(`Erro ao atualizar status: ${error?.message ?? 'nenhuma linha foi atualizada (RLS?)'}`)
    }
  }

  const maxPesagem = useMemo(() => {
    let max = 0
    for (const a of data) {
      for (const p of a.pesagens) {
        if (p.numero > max) max = p.numero
      }
    }
    return Math.max(max, 1)
  }, [data])

  // Transforma animais → linhas com p1_data, p1_kg, p1_arroba, p2_data...
  const rows: AnimalRow[] = useMemo(() => {
    return data.map((a) => {
      const byNum: Record<number, Pesagem> = {}
      for (const p of a.pesagens) byNum[p.numero] = p

      const ultima = a.pesagens.length > 0
        ? a.pesagens.reduce((max, p) => p.numero > max.numero ? p : max)
        : null

      const row: AnimalRow = {
        id: a.id,
        numero_boi: a.numero_boi,
        vendedor: a.vendedor,
        data_compra: a.data_compra,
        valor_compra: a.valor_compra,
        status: statusOverrides[a.id] ?? a.status,
        data_venda: a.data_venda,
        ultimo_kg: ultima?.peso_kg ?? null,
        ultima_data: ultima?.data ?? null,
        datas_pesagens: a.pesagens
          .map((p) => p.data)
          .filter((date): date is string => Boolean(date)),
      }

      for (let i = 1; i <= maxPesagem; i++) {
        const p = byNum[i] ?? null
        row[`p${i}_data`]   = p?.data ?? null
        row[`p${i}_kg`]     = p?.peso_kg ?? null
        row[`p${i}_arroba`] = p?.peso_arroba ?? null
      }

      return row
    })
  }, [data, statusOverrides, maxPesagem])

  const statusCounts = useMemo(() => {
    const c = { vivo: 0, morreu: 0, vendido: 0 }
    for (const r of rows) {
      const s = r.status as 'vivo' | 'morreu' | 'vendido' | null
      if (s && s in c) c[s]++
    }
    return c
  }, [rows])

  const vendedores = useMemo(() => {
    const set = new Set(data.map((a) => a.vendedor ?? ''))
    return Array.from(set).filter(Boolean).sort()
  }, [data])

  const pesoRangeOptions = useMemo(() => {
    const liveWeights = rows
      .filter((r) => r.status === 'vivo' && typeof r.ultimo_kg === 'number')
      .map((r) => r.ultimo_kg as number)

    if (liveWeights.length === 0) return []

    const minWeight = Math.floor(Math.min(...liveWeights) / pesoBucketSize) * pesoBucketSize
    const maxWeight = Math.ceil(Math.max(...liveWeights) / pesoBucketSize) * pesoBucketSize
    const options: Array<{ value: string; label: string }> = []

    for (let start = minWeight; start < maxWeight; start += pesoBucketSize) {
      const end = start + pesoBucketSize
      options.push({
        value: `${start}-${end}`,
        label: `${start} a ${end} kg - ${formatArrobaRange(start)} a ${formatArrobaRange(end)} @`,
      })
    }

    return options.reverse()
  }, [rows])

  const pesagemDateOptions = useMemo(() => {
    const uniqueDates = new Set<string>()

    for (const row of rows) {
      for (const date of row.datas_pesagens) {
        uniqueDates.add(date)
      }
    }

    return Array.from(uniqueDates).sort((a, b) => b.localeCompare(a))
  }, [rows])

  const filteredRows = useMemo(() => {
    let nextRows = rows

    if (boiSearch) {
      const n = parseInt(boiSearch)
      if (!isNaN(n)) {
        nextRows = nextRows.filter((r) => r.numero_boi === n)
      }
    }

    if (pesoRange) {
      const [minStr, maxStr] = pesoRange.split('-')
      const min = Number(minStr)
      const max = Number(maxStr)

      if (!Number.isNaN(min) && !Number.isNaN(max)) {
        nextRows = nextRows.filter((r) => (
          r.status === 'vivo' &&
          typeof r.ultimo_kg === 'number' &&
          r.ultimo_kg >= min &&
          r.ultimo_kg < max
        ))
      }
    }

    if (pesagemDateFilters.length > 0) {
      nextRows = nextRows.filter((r) => (
        r.datas_pesagens.some((date) => pesagemDateFilters.includes(date))
      ))
    }

    return nextRows
  }, [rows, boiSearch, pesoRange, pesagemDateFilters])

  // Colunas base
  const baseColumns = useMemo<ColumnDef<AnimalRow>[]>(() => [
    {
      accessorKey: 'numero_boi',
      header: 'Boi',
      size: 60,
      cell: (info) => (
        <button
          type="button"
          onClick={() => {
            const animal = animaisById.get(info.row.original.id)
            if (animal) setBoiSelecionado(animal)
          }}
          className="underline-offset-2 hover:underline cursor-pointer"
        >
          {info.getValue() as number}
        </button>
      ),
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: (info) => (
        <StatusSelect
          status={info.getValue() as string}
          onChange={(next) => handleStatusChange(info.row.original.id, next)}
        />
      ),
      filterFn: 'equals',
    },
    { accessorKey: 'vendedor', header: 'Vendedor', filterFn: 'equals' },
    { accessorKey: 'data_compra', header: 'Compra', cell: (info) => formatDate(info.getValue()) },
    { accessorKey: 'valor_compra', header: 'Valor', cell: (info) => formatBRL(info.getValue() as number) },
    {
      accessorKey: 'ultimo_kg',
      header: 'Último KG',
      cell: (info) => numFmt(info.getValue()),
      sortingFn: (rowA: Row<AnimalRow>, rowB: Row<AnimalRow>, columnId: string) => (
        compareNullableNumbers(
          rowA.getValue(columnId) as number | null,
          rowB.getValue(columnId) as number | null,
        )
      ),
    },
    {
      accessorKey: 'ultima_data',
      header: 'Última pesagem',
      cell: (info) => formatDate(info.getValue()),
      sortingFn: (rowA: Row<AnimalRow>, rowB: Row<AnimalRow>, columnId: string) => (
        compareNullableIsoDates(
          rowA.getValue(columnId) as string | null,
          rowB.getValue(columnId) as string | null,
        )
      ),
    },
  ], [animaisById])

  // Colunas de pesagem (1..maxPesagem)
  const pesagemColumns = useMemo<ColumnDef<AnimalRow>[]>(() => {
    const cols: ColumnDef<AnimalRow>[] = []
    for (let i = 1; i <= maxPesagem; i++) {
      cols.push(
        {
          id: `p${i}_data`,
          accessorKey: `p${i}_data`,
          header: `Data ${i}`,
          cell: (info) => formatDate(info.getValue()),
          meta: { pesagemNum: i },
          enableSorting: false,
        },
        {
          id: `p${i}_kg`,
          accessorKey: `p${i}_kg`,
          header: `KG ${i}`,
          cell: (info) => numFmt(info.getValue()),
          meta: { pesagemNum: i },
        },
      )
      cols.push({
        id: `p${i}_arroba`,
        accessorKey: `p${i}_arroba`,
        header: `@ ${i}`,
        cell: (info) => numFmt(info.getValue()),
        meta: { pesagemNum: i },
        enableSorting: false,
      })
    }
    return cols
  }, [maxPesagem])

  const columns = useMemo(() => [...baseColumns, ...pesagemColumns], [baseColumns, pesagemColumns])

  const table = useReactTable({
    data: filteredRows,
    columns,
    state: { columnFilters, sorting },
    onColumnFiltersChange: setColumnFilters,
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    autoResetPageIndex: false,
    initialState: {
      pagination: { pageSize: 50 },
      columnVisibility: {
        ultimo_kg: false,
        ultima_data: false,
      },
    },
  })

  const statusFilter   = (columnFilters.find((f) => f.id === 'status')?.value as string) ?? ''
  const vendedorFilter = (columnFilters.find((f) => f.id === 'vendedor')?.value as string) ?? ''

  function setFilter(id: string, value: string) {
    setColumnFilters((prev) => {
      const rest = prev.filter((f) => f.id !== id)
      return value ? [...rest, { id, value }] : rest
    })
  }

  function handleSort(value: string) {
    setSortKey(value)
    const [id, dir] = value.split('-')
    setSorting([{ id, desc: dir === 'desc' }])
  }

  function togglePesagemDate(date: string) {
    setPesagemDateFilters((prev) => (
      prev.includes(date)
        ? prev.filter((item) => item !== date)
        : [...prev, date]
    ))
  }

  function clearPesagemDates() {
    setPesagemDateFilters([])
  }

  function selectAllPesagemDates() {
    setPesagemDateFilters(pesagemDateOptions)
  }

  const pesagemDateFilterLabel = pesagemDateFilters.length === 0
    ? 'Pesagens: todas as datas'
    : pesagemDateFilters.length === 1
      ? `Pesagem: ${formatDate(pesagemDateFilters[0])}`
      : `Pesagens: ${pesagemDateFilters.length} datas`

  return (
    <div className="flex flex-col gap-3 h-full min-h-0 px-2 pb-4">
      {/* Filtros */}
      <div className="inline-block min-w-full pr-16">
        <div className="min-w-0 overflow-x-auto">
          <div className="flex w-max gap-1.5 pr-2">
              <input
                type="number"
                placeholder="Buscar boi #"
                value={boiSearch}
                onChange={(e) => setBoiSearch(e.target.value)}
                className={`${filterControlClass} w-24`}
              />
              <select
                value={statusFilter}
                onChange={(e) => setFilter('status', e.target.value)}
                className={`${filterControlClass} w-28`}
              >
                <option value="">Todos os status</option>
                <option value="vivo">Vivo</option>
                <option value="morreu">Morreu</option>
                <option value="vendido">Vendido</option>
              </select>
              <select
                value={vendedorFilter}
                onChange={(e) => setFilter('vendedor', e.target.value)}
                className={`${filterControlClass} w-40`}
              >
                <option value="">Todos os vendedores</option>
                {vendedores.map((v) => (
                  <option key={v} value={v}>{v}</option>
                ))}
              </select>
              <select
                value={sortKey}
                onChange={(e) => handleSort(e.target.value)}
                className={`${filterControlClass} w-40`}
              >
                <option value="numero_boi-asc">Boi: menor → maior</option>
                <option value="numero_boi-desc">Boi: maior → menor</option>
                <option value="ultimo_kg-desc">Peso: maior → menor</option>
                <option value="ultimo_kg-asc">Peso: menor → maior</option>
                <option value="ultima_data-desc">Pesagem: mais recente</option>
                <option value="ultima_data-asc">Pesagem: mais antiga</option>
              </select>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className={`${filterControlClass} inline-flex w-44 items-center justify-between text-left`}
                  >
                    <span className="block truncate">{pesagemDateFilterLabel}</span>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-56">
                  <DropdownMenuLabel>Datas de pesagem</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onSelect={selectAllPesagemDates}>
                    Selecionar todas
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={clearPesagemDates}>
                    Limpar
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  {pesagemDateOptions.map((date) => (
                    <DropdownMenuCheckboxItem
                      key={date}
                      checked={pesagemDateFilters.includes(date)}
                      onSelect={(event) => event.preventDefault()}
                      onCheckedChange={() => togglePesagemDate(date)}
                    >
                      {formatDate(date)}
                    </DropdownMenuCheckboxItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
              <select
                value={pesoRange}
                onChange={(e) => setPesoRange(e.target.value)}
                className={`${filterControlClass} w-36`}
              >
                <option value="">Vivos: todos os pesos</option>
                {pesoRangeOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
          </div>
        </div>
      </div>

      {/* Pills de contagem + paginação */}
      <div className="flex items-center justify-between gap-2 text-xs pr-16">
        <div className="flex items-center gap-2">
          <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 font-medium ${STATUS_CLASS.vivo}`}>
            Vivos <span className="font-semibold">{statusCounts.vivo}</span>
          </span>
          <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 font-medium ${STATUS_CLASS.morreu}`}>
            Morreu <span className="font-semibold">{statusCounts.morreu}</span>
          </span>
          <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 font-medium ${STATUS_CLASS.vendido}`}>
            Vendidos <span className="font-semibold">{statusCounts.vendido}</span>
          </span>
        </div>
        <div className="flex items-center gap-1.5 whitespace-nowrap">
          <button
            type="button"
            onClick={() => setAddPesagemOpen(true)}
            className="h-6 rounded-md border bg-background px-2 text-[11px] font-medium hover:bg-muted transition-colors"
          >
            + Adicionar pesagem
          </button>
          <span className="text-[11px] text-muted-foreground whitespace-nowrap">
            {filteredRows.length} bois
          </span>
          <button
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
            className="h-6 rounded-md border px-1.5 text-[11px] disabled:opacity-40 hover:bg-muted transition-colors"
          >
            Anterior
          </button>
          <span className="text-[11px] text-muted-foreground whitespace-nowrap">
            {table.getState().pagination.pageIndex + 1} / {table.getPageCount()}
          </span>
          <button
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
            className="h-6 rounded-md border px-1.5 text-[11px] disabled:opacity-40 hover:bg-muted transition-colors"
          >
            Próxima
          </button>
        </div>
      </div>

      {addPesagemOpen && (
        <AddPesagemModal onClose={() => setAddPesagemOpen(false)} />
      )}

      {boiSelecionado && (
        <BoiModal
          animal={boiSelecionado}
          onClose={() => setBoiSelecionado(null)}
        />
      )}

      {/* Tabela */}
      <div className="flex-1 min-h-0 overflow-auto">
        <div className="inline-block pr-12">
          <div className="overflow-hidden rounded-md border">
            <table className="text-xs border-collapse w-max">
              <thead>
                {table.getHeaderGroups().map((hg) => (
                  <tr key={hg.id}>
                    {hg.headers.map((header, columnIndex) => {
                      const pNum = header.column.columnDef.meta?.pesagemNum
                      const colorClass = pNum ? pesagemColor(pNum).header : 'bg-muted/50'
                      const isFirstColumn = columnIndex === 0
                      return (
                        <th
                          key={header.id}
                          className={`px-2 py-1 text-left font-medium whitespace-nowrap border-b border-r last:border-r-0 cursor-pointer select-none sticky top-0 z-20 ${colorClass} ${isFirstColumn ? 'left-0 z-30 shadow-[2px_0_0_rgba(0,0,0,0.06)]' : ''}`}
                          onClick={header.column.getToggleSortingHandler()}
                        >
                          <div className="flex items-center gap-1">
                            {flexRender(header.column.columnDef.header, header.getContext())}
                            {header.column.getCanSort() && (
                              header.column.getIsSorted() === 'asc'  ? <ChevronUp className="size-3" /> :
                              header.column.getIsSorted() === 'desc' ? <ChevronDown className="size-3" /> :
                              <ChevronsUpDown className="size-3 opacity-40" />
                            )}
                          </div>
                        </th>
                      )
                    })}
                  </tr>
                ))}
              </thead>
              <tbody>
                {table.getRowModel().rows.map((row) => (
                  <tr key={row.id} className="border-t hover:brightness-95 transition-colors">
                    {row.getVisibleCells().map((cell, columnIndex) => {
                      const pNum = cell.column.columnDef.meta?.pesagemNum
                      const colorClass = pNum ? pesagemColor(pNum).cell : ''
                      const isFirstColumn = columnIndex === 0
                      return (
                        <td
                          key={cell.id}
                          className={`px-2 py-0.5 whitespace-nowrap border-r last:border-r-0 ${colorClass} ${isFirstColumn ? 'sticky left-0 z-10 bg-background shadow-[2px_0_0_rgba(0,0,0,0.06)]' : ''}`}
                        >
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

    </div>
  )
}
