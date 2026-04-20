export function hojeBR() {
  const d = new Date()
  const y = String(d.getFullYear()).slice(-2)
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${day}/${m}/${y}`
}

// '06/04/26' | '06/04/2026' | '060426' → '2026-04-06' | inválido → null
export function parseDataBR(s: string): string | null {
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
export function mascaraDataBR(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 8)
  if (digits.length <= 2) return digits
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`
}

// '2026-04-06' → '06/04/26'
export function isoToBR(iso: string): string {
  const [y, m, d] = iso.split('-')
  if (!y || !m || !d) return ''
  return `${d}/${m}/${y.slice(-2)}`
}
