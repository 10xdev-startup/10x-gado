import { createClient } from '@/lib/supabase/server'
import AnimaisTable from '@/components/AnimaisTable'
import FluxoCaixaTab from '@/components/FluxoCaixaTab'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'

export default async function HomePage() {
  const supabase = await createClient()

  const [animaisResult, transacoesResult, saldosResult] = await Promise.all([
    supabase
      .from('animais')
      .select(`
        id,
        numero_boi,
        boi_planilha,
        vendedor,
        data_compra,
        valor_compra,
        status,
        data_venda,
        pesagens (
          id,
          numero,
          data,
          peso_kg,
          peso_arroba,
          created_at
        )
      `)
      .order('numero_boi', { ascending: true }),
    supabase
      .from('transacoes_bancarias')
      .select('id, mes_referencia, data, lancamento, detalhes, valor, tipo')
      .order('data', { ascending: false }),
    supabase
      .from('saldos_diarios')
      .select('mes_referencia, data, saldo')
      .eq('tipo_saldo', 'diario')
      .order('data', { ascending: true }),
  ])

  if (animaisResult.error) {
    return <p className="text-red-500">Erro ao carregar animais: {animaisResult.error.message}</p>
  }

  return (
    <div className="h-full flex flex-col gap-3 min-h-0">
      <Tabs defaultValue="evolucao" className="flex flex-col flex-1 min-h-0 gap-3">
        <div className="inline-block min-w-full px-2 pr-16 shrink-0">
          <TabsList className="shrink-0 w-full">
            <TabsTrigger value="evolucao">Evolução</TabsTrigger>
            <TabsTrigger value="fluxo-caixa">Fluxo de Caixa</TabsTrigger>
          </TabsList>
        </div>
        <TabsContent value="evolucao" className="flex-1 min-h-0 overflow-hidden mt-0">
          <AnimaisTable data={animaisResult.data ?? []} />
        </TabsContent>
        <TabsContent value="fluxo-caixa" className="flex-1 min-h-0 overflow-auto mt-0">
          <FluxoCaixaTab
            transacoes={transacoesResult.data ?? []}
            saldos={saldosResult.data ?? []}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}
