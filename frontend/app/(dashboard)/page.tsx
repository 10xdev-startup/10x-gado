import Link from 'next/link'

function WelcomeCard() {
  return (
    <div className="rounded-xl border border-border bg-card p-6 shadow-sm max-w-sm w-full">
      <div className="flex items-center gap-3 mb-3">
        <span className="text-2xl">🚀</span>
        <h2 className="font-semibold text-base">Bem-vindo ao template</h2>
      </div>
      <p className="text-sm text-muted-foreground mb-4">
        Seja bem-vindo a esse template. Se quiser ajuda para construir seu projeto, acesse:
      </p>
      <Link
        href="https://10xdev.com.br"
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
      >
        10xdev.com.br
      </Link>
    </div>
  )
}

export default function HomePage() {
  return (
    <div className="p-2">
      <WelcomeCard />
    </div>
  )
}
