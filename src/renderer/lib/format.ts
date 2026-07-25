import { formatarHoras } from '@shared/hours'

export function formatarDataBr(iso: string): string {
  if (!iso) return ''
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}

export function formatarHorasDisplay(horas: number): string {
  return formatarHoras(horas)
}

export function inicioDoMesISO(): string {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  return `${y}-${m}-01`
}

export function fimDoMesISO(): string {
  const d = new Date()
  const y = d.getFullYear()
  const m = d.getMonth()
  const last = new Date(y, m + 1, 0).getDate()
  return `${y}-${String(m + 1).padStart(2, '0')}-${String(last).padStart(2, '0')}`
}
