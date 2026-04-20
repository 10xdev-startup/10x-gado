import { createClient } from '@/lib/supabase/server'
import AnimaisTable from '@/components/AnimaisTable'

export default async function AnimaisPage() {
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
    return <p className="p-4 text-red-500">Erro ao carregar animais: {error.message}</p>
  }

  return (
    <div className="p-4">
      <h1 className="text-xl font-semibold mb-4">Animais</h1>
      <AnimaisTable data={data ?? []} />
    </div>
  )
}
