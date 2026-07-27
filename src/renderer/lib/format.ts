import { formatarHoras } from '@shared/hours'

export function formatarDataBr(iso: string): string {
  if (!iso) return ''
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}

export function formatarHorasDisplay(horas: number): string {
  return formatarHoras(horas)
}

export function labelTipoDia(tipo: string): string {
  switch (tipo) {
    case 'falta':
      return 'Falta'
    case 'folga':
      return 'Folga'
    case 'atestado':
      return 'Atestado'
    default:
      return 'Trabalho'
  }
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

/** Retorna YYYY-MM-01 e YYYY-MM-último para um mês (1–12) */
export function periodoMesISO(ano: number, mes: number): {
  inicio: string
  fim: string
} {
  const m = String(mes).padStart(2, '0')
  const last = new Date(ano, mes, 0).getDate()
  return {
    inicio: `${ano}-${m}-01`,
    fim: `${ano}-${m}-${String(last).padStart(2, '0')}`
  }
}

export function mesAtual(): { ano: number; mes: number } {
  const d = new Date()
  return { ano: d.getFullYear(), mes: d.getMonth() + 1 }
}
