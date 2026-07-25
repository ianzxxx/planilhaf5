/**
 * Calcula horas trabalhadas entre dois horários no formato HH:mm.
 * Retorna null se inválido ou se saída for antes da entrada.
 */
export function calcularHorasTrabalhadas(
  horaEntrada: string,
  horaSaida: string
): number | null {
  if (!isHorarioValido(horaEntrada) || !isHorarioValido(horaSaida)) {
    return null
  }

  const entrada = toMinutes(horaEntrada)
  const saida = toMinutes(horaSaida)

  if (saida < entrada) {
    return null
  }

  return Math.round(((saida - entrada) / 60) * 100) / 100
}

export function isHorarioValido(hora: string): boolean {
  if (!hora || !/^\d{2}:\d{2}$/.test(hora)) return false
  const [h, m] = hora.split(':').map(Number)
  return h >= 0 && h <= 23 && m >= 0 && m <= 59
}

export function formatarHoras(horas: number): string {
  const totalMinutos = Math.round(horas * 60)
  const h = Math.floor(totalMinutos / 60)
  const m = totalMinutos % 60
  return `${h}h ${String(m).padStart(2, '0')}min`
}

export function hojeISO(): string {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function toMinutes(hora: string): number {
  const [h, m] = hora.split(':').map(Number)
  return h * 60 + m
}
