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
} from '@tanstack/react-table'
import { useState, useMemo } from 'react'
import { ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react'
import { Transacao } from '@/components/FluxoCaixaDashboard'
import { formatBRL, isoToBR, mesAbrev } from '@/lib/dataBR'

type Props = {
  data: Transacao[]
}

function SortIcon({ sorted }: { sorted: false | 'asc' | 'desc' }) {
  if (sorted === 'asc') return <ChevronUp className="h-3 w-3" />
  if (sorted === 'desc') return <ChevronDown className="h-3 w-3" />
  return <ChevronsUpDown className="h-3 w-3 opacity-40" />
}

function normalizaDetalhes(d: string | null): string | null {
  if (!d) return null
  const s = d.replace(/^\d{2}\/\d{2}\s+\d{2}:\d{2}\s+/, '').trim()
  return s || null
}

const columns: ColumnDef<Transacao>[] = [
  {
    accessorKey: 'data',
    header: 'Data',
    cell: ({ getValue }) => isoToBR(getValue<string>()),
    size: 90,
  },
  {
    accessorKey: 'lancamento',
    header: 'Lançamento',
    size: 200,
  },
  {
    accessorKey: 'detalhes',
    header: 'Detalhes',
    cell: ({ getValue }) => getValue<string | null>() ?? '—',
  },
  {
    accessorKey: 'valor',
    header: 'Valor',
    cell: ({ row }) => {
      const v = row.original.valor
      const tipo = row.original.tipo
      const display = formatBRL(Math.abs(v))
      return (
        <span className={tipo === 'entrada' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}>
          {tipo === 'entrada' ? '+' : '−'}{display}
        </span>
      )
    },
    size: 130,
  },
  {
    accessorKey: 'tipo',
    header: 'Tipo',
    cell: ({ getValue }) => {
      const v = getValue<string>()
      return (
        <span className={`text-xs px-2 py-0.5 rounded font-medium ${
          v === 'entrada'
            ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
            : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
        }`}>
          {v === 'entrada' ? 'Entrada' : 'Saída'}
        </span>
      )
    },
    size: 80,
  },
]

export default function TransacoesTable({ data }: Props) {
  const [sorting, setSorting] = useState<SortingState>([])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [busca, setBusca] = useState('')
  const [mesFiltro, setMesFiltro] = useState('')
  const [tipoFiltro, setTipoFiltro] = useState<'' | 'entrada' | 'saida'>('')
  const [pillFiltro, setPillFiltro] = useState('')

  const filtered = useMemo(() => {
    let rows = data
    if (mesFiltro) rows = rows.filter((t) => t.mes_referencia === mesFiltro)
    if (tipoFiltro) rows = rows.filter((t) => t.tipo === tipoFiltro)
    if (pillFiltro) rows = rows.filter((t) => normalizaDetalhes(t.detalhes) === pillFiltro)
    if (busca) {
      const q = busca.toLowerCase()
      rows = rows.filter(
        (t) =>
          t.lancamento.toLowerCase().includes(q) ||
          (t.detalhes?.toLowerCase().includes(q) ?? false)
      )
    }
    return rows
  }, [data, mesFiltro, tipoFiltro, pillFiltro, busca])

  const totalFiltrado = useMemo(
    () => filtered.reduce((acc, t) => acc + Math.abs(t.valor), 0),
    [filtered]
  )

  const topDetalhes = useMemo(() => {
    const counts = new Map<string, number>()
    for (const t of data) {
      const key = normalizaDetalhes(t.detalhes)
      if (!key) continue
      counts.set(key, (counts.get(key) ?? 0) + 1)
    }
    return Array.from(counts.entries())
      .filter(([, count]) => count >= 2)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([detalhe, count]) => ({ detalhe, count }))
  }, [data])

  const meses = useMemo(() => {
    const set = new Set(data.map((t) => t.mes_referencia))
    return Array.from(set).sort()
  }, [data])

  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    data: filtered,
    columns,
    state: { sorting, columnFilters },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 10 } },
  })

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2">
        <input
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar lançamento ou detalhes..."
          className="h-8 px-3 rounded border bg-background text-sm w-64 focus:outline-none focus:ring-1 focus:ring-ring"
        />
        <select
          value={mesFiltro}
          onChange={(e) => setMesFiltro(e.target.value)}
          className="h-8 px-2 rounded border bg-background text-sm focus:outline-none focus:ring-1 focus:ring-ring"
        >
          <option value="">Todos os meses</option>
          {meses.map((m) => (
            <option key={m} value={m}>{mesAbrev(m)}</option>
          ))}
        </select>
        <select
          value={tipoFiltro}
          onChange={(e) => setTipoFiltro(e.target.value as '' | 'entrada' | 'saida')}
          className="h-8 px-2 rounded border bg-background text-sm focus:outline-none focus:ring-1 focus:ring-ring"
        >
          <option value="">Entrada + Saída</option>
          <option value="entrada">Só entradas</option>
          <option value="saida">Só saídas</option>
        </select>
        <select
          value={table.getState().pagination.pageSize}
          onChange={(e) => table.setPageSize(Number(e.target.value))}
          className="h-8 px-2 rounded border bg-background text-sm focus:outline-none focus:ring-1 focus:ring-ring"
        >
          {[10, 25, 50, 100, 250].map((n) => (
            <option key={n} value={n}>{n} por página</option>
          ))}
          <option value={filtered.length || 1}>Todas</option>
        </select>
      </div>

      {topDetalhes.length > 0 && (
        <div className="rounded-md border bg-muted/20 p-3 flex flex-wrap gap-1.5">
          {topDetalhes.map(({ detalhe, count }) => {
            const active = pillFiltro === detalhe
            return (
              <button
                key={detalhe}
                onClick={() => setPillFiltro(active ? '' : detalhe)}
                className={`text-xs px-2.5 py-1 rounded-full border transition-colors max-w-[240px] truncate ${
                  active
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-background hover:bg-muted border-border'
                }`}
                title={`${detalhe} · ${count} transaç${count === 1 ? 'ão' : 'ões'}`}
              >
                {detalhe}
                <span className={`ml-1.5 ${active ? 'opacity-80' : 'text-muted-foreground'}`}>
                  {count}
                </span>
              </button>
            )
          })}
        </div>
      )}

      <span className="text-xs text-muted-foreground">
        {filtered.length} transaç{filtered.length === 1 ? 'ão' : 'ões'} · {formatBRL(totalFiltrado)}
      </span>

      <div className="overflow-x-auto rounded border">
        <table className="w-full text-sm">
          <thead>
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id} className="border-b bg-muted/50">
                {hg.headers.map((h) => (
                  <th
                    key={h.id}
                    className="px-3 py-2 text-left font-medium text-muted-foreground text-xs uppercase tracking-wide cursor-pointer select-none whitespace-nowrap"
                    style={{ width: h.getSize() }}
                    onClick={h.column.getToggleSortingHandler()}
                  >
                    <div className="flex items-center gap-1">
                      {flexRender(h.column.columnDef.header, h.getContext())}
                      <SortIcon sorted={h.column.getIsSorted()} />
                    </div>
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-3 py-8 text-center text-muted-foreground text-sm">
                  Nenhuma transação encontrada para o filtro selecionado.
                </td>
              </tr>
            ) : (
              table.getRowModel().rows.map((row) => (
                <tr key={row.id} className="border-b hover:bg-muted/30 transition-colors">
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="px-3 py-2 whitespace-nowrap text-xs">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {table.getPageCount() > 1 && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <button
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
            className="px-2 py-1 rounded border disabled:opacity-40"
          >
            ‹
          </button>
          <span>
            Pág. {table.getState().pagination.pageIndex + 1} de {table.getPageCount()}
          </span>
          <button
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
            className="px-2 py-1 rounded border disabled:opacity-40"
          >
            ›
          </button>
        </div>
      )}
    </div>
  )
}
