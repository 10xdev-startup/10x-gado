'use client'

import { Button } from '@/components/ui/button'

type Props = {
  anos: string[]
  selecionado: string
  onChange: (ano: string) => void
}

export default function YearSelector({ anos, selecionado, onChange }: Props) {
  return (
    <div className="flex gap-1">
      {anos.map((ano) => (
        <Button
          key={ano}
          size="sm"
          variant={selecionado === ano ? 'default' : 'ghost'}
          onClick={() => onChange(ano)}
        >
          {ano}
        </Button>
      ))}
    </div>
  )
}
