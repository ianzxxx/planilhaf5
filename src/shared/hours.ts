/**
 * Cálculo exato de horas trabalhadas.
 * O intervalo de almoço NUNCA entra na conta quando há batidas de almoço.
 * Com só entrada+saída, pode descontar minutos de almoço padrão (se informado).
 */

export type TipoBatida =
  | 'entrada'
  | 'saidaAlmoco'
  | 'voltaAlmoco'
  | 'saida'

export interface HorariosPonto {
  horaEntrada?: string | null
  horaSaidaAlmoco?: string | null
  horaVoltaAlmoco?: string | null
  horaSaida?: string | null
}

/**
 * Diferença em minutos entre dois HH:mm.
 * Se o fim for "antes" do início, assume virada de dia (+24h).
 */
export function minutosEntre(
  inicio: string | null | undefined,
  fim: string | null | undefined
): number | null {
  if (!isHorarioValido(inicio) || !isHorarioValido(fim)) return null
  let minutos = toMinutes(fim!) - toMinutes(inicio!)
  if (minutos < 0) minutos += 24 * 60
  return minutos
}

/**
 * Calcula horas líquidas trabalhadas.
 * - Manhã: entrada → saída almoço
 * - Tarde: volta almoço → saída
 * - Sem batidas de almoço: entrada → saída, menos minutosAlmocoDescontar
 */
export function calcularHorasTrabalhadas(
  horarios: HorariosPonto,
  minutosAlmocoDescontar: number | null = null
): number | null {
  const manha = minutosEntre(horarios.horaEntrada, horarios.horaSaidaAlmoco)
  const tarde = minutosEntre(horarios.horaVoltaAlmoco, horarios.horaSaida)

  const temBatidaAlmoco = Boolean(
    horarios.horaSaidaAlmoco || horarios.horaVoltaAlmoco
  )

  let totalMinutos = 0
  let temAlgo = false

  if (manha != null) {
    totalMinutos += manha
    temAlgo = true
  }
  if (tarde != null) {
    totalMinutos += tarde
    temAlgo = true
  }

  // Dia só com entrada e saída (sem almoço marcado)
  if (
    !temBatidaAlmoco &&
    !temAlgo &&
    isHorarioValido(horarios.horaEntrada) &&
    isHorarioValido(horarios.horaSaida)
  ) {
    const bruto = minutosEntre(horarios.horaEntrada, horarios.horaSaida)
    if (bruto == null) return null
    const desconto = Math.max(0, minutosAlmocoDescontar ?? 0)
    totalMinutos = Math.max(0, bruto - desconto)
    temAlgo = true
  }

  // Entrada + saída final, mas também tem só uma batida de almoço incompleta:
  // se tem saída almoço sem volta, e tem saída final — não misturar; só conta segmentos claros
  if (!temAlgo) return null

  return Math.round((totalMinutos / 60) * 100) / 100
}

/** Compat: cálculo simples entre dois horários (um segmento). */
export function calcularSegmento(
  horaInicio: string | null | undefined,
  horaFim: string | null | undefined
): number | null {
  const minutos = minutosEntre(horaInicio, horaFim)
  if (minutos == null) return null
  return Math.round((minutos / 60) * 100) / 100
}

export function statusDoDia(horarios: HorariosPonto): {
  status:
    | 'sem_ponto'
    | 'trabalhando_manha'
    | 'em_almoco'
    | 'trabalhando_tarde'
    | 'encerrado'
    | 'incompleto'
  proximaBatida: TipoBatida | null
  label: string
} {
  const { horaEntrada, horaSaidaAlmoco, horaVoltaAlmoco, horaSaida } = horarios

  if (!horaEntrada && !horaSaidaAlmoco && !horaVoltaAlmoco && !horaSaida) {
    return {
      status: 'sem_ponto',
      proximaBatida: 'entrada',
      label: 'Sem ponto'
    }
  }

  if (horaEntrada && !horaSaidaAlmoco && !horaVoltaAlmoco && !horaSaida) {
    return {
      status: 'trabalhando_manha',
      proximaBatida: 'saidaAlmoco',
      label: 'Trabalhando (manhã)'
    }
  }

  if (horaEntrada && horaSaidaAlmoco && !horaVoltaAlmoco && !horaSaida) {
    return {
      status: 'em_almoco',
      proximaBatida: 'voltaAlmoco',
      label: 'Em almoço'
    }
  }

  if (horaEntrada && horaSaidaAlmoco && horaVoltaAlmoco && !horaSaida) {
    return {
      status: 'trabalhando_tarde',
      proximaBatida: 'saida',
      label: 'Trabalhando (tarde)'
    }
  }

  if (horaSaida) {
    return {
      status: 'encerrado',
      proximaBatida: null,
      label: 'Dia encerrado'
    }
  }

  // Casos atípicos (ex.: só saída, ou pulou almoço)
  if (horaEntrada && !horaSaidaAlmoco && !horaVoltaAlmoco && horaSaida) {
    return {
      status: 'encerrado',
      proximaBatida: null,
      label: 'Dia encerrado (sem almoço marcado)'
    }
  }

  return {
    status: 'incompleto',
    proximaBatida: !horaEntrada
      ? 'entrada'
      : !horaSaidaAlmoco
        ? 'saidaAlmoco'
        : !horaVoltaAlmoco
          ? 'voltaAlmoco'
          : 'saida',
    label: 'Incompleto'
  }
}

export function normalizarHorario(
  hora: string | null | undefined
): string | null {
  const valor = hora?.trim() || ''
  if (!valor) return null
  return isHorarioValido(valor) ? valor : valor
}

export function isHorarioValido(
  hora: string | null | undefined
): boolean {
  if (!hora || !/^\d{2}:\d{2}$/.test(hora)) return false
  const [h, m] = hora.split(':').map(Number)
  return h >= 0 && h <= 23 && m >= 0 && m <= 59
}

export function formatarHoras(horas: number): string {
  const totalMinutos = Math.round(horas * 60)
  const h = Math.floor(totalMinutos / 60)
  const m = totalMinutos % 60
  if (m === 0) return `${h}h`
  return `${h}h ${String(m).padStart(2, '0')}M`
}

export function hojeISO(): string {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function agoraHHMM(): string {
  const d = new Date()
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

function toMinutes(hora: string): number {
  const [h, m] = hora.split(':').map(Number)
  return h * 60 + m
}
