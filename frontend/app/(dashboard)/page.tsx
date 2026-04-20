import { createClient } from '@/lib/supabase/server'
import AnimaisTable from '@/components/AnimaisTable'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'

export default async function HomePage() {
  const supabase = await createClient()

  const { data, error } = await supabase
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
    .order('numero_boi', { ascending: true })

  if (error) {
    return <p className="text-red-500">Erro ao carregar animais: {error.message}</p>
  }

  return (
    <div className="h-full flex flex-col gap-3 min-h-0">
      <h1 className="text-xl font-semibold shrink-0">Animais</h1>
      <Tabs defaultValue="evolucao" className="flex flex-col flex-1 min-h-0 gap-3">
        <div className="inline-block min-w-full px-2 pr-16 shrink-0">
          <TabsList className="shrink-0 w-full">
            <TabsTrigger value="evolucao">Evolução</TabsTrigger>
          </TabsList>
        </div>
        <TabsContent value="evolucao" className="flex-1 min-h-0 overflow-hidden mt-0">
          <AnimaisTable data={data ?? []} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
