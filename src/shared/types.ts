export type TipoBatida =
  | 'entrada'
  | 'saidaAlmoco'
  | 'voltaAlmoco'
  | 'saida'

/** Dia de trabalho normal ou ausência (0 horas) */
export type TipoDia = 'trabalho' | 'falta' | 'folga' | 'atestado'

export interface Funcionario {
  id: string
  nome: string
  cargo: string | null
  horarioEntradaPadrao: string | null
  horarioSaidaPadrao: string | null
  /** Minutos de almoço a descontar quando o dia fecha só com entrada+saída */
  minutosAlmocoPadrao: number | null
  ativo: boolean
  createdAt: string
}

export interface FuncionarioInput {
  nome?: string | null
  cargo?: string | null
  horarioEntradaPadrao?: string | null
  horarioSaidaPadrao?: string | null
  minutosAlmocoPadrao?: number | null
  ativo?: boolean
}

export interface RegistroPonto {
  id: string
  funcionarioId: string
  data: string
  tipoDia: TipoDia
  horaEntrada: string | null
  horaSaidaAlmoco: string | null
  horaVoltaAlmoco: string | null
  horaSaida: string | null
  horasTrabalhadas: number | null
  observacao: string | null
  createdAt: string
  updatedAt: string
  funcionario?: Pick<
    Funcionario,
    'id' | 'nome' | 'cargo' | 'minutosAlmocoPadrao'
  >
}

export interface RegistroPontoInput {
  funcionarioId: string
  data?: string | null
  tipoDia?: TipoDia
  horaEntrada?: string | null
  horaSaidaAlmoco?: string | null
  horaVoltaAlmoco?: string | null
  horaSaida?: string | null
  observacao?: string | null
  registroId?: string | null
  descontarAlmoco?: boolean
}

export interface MarcarBatidaInput {
  funcionarioId: string
  tipo: TipoBatida
  data?: string | null
  horario?: string | null
  observacao?: string | null
  descontarAlmoco?: boolean
  forcar?: boolean
}

export interface RegistrarAusenciaInput {
  funcionarioId: string
  data?: string | null
  tipoDia: Exclude<TipoDia, 'trabalho'>
  observacao?: string | null
  /** Substitui ponto já lançado no dia */
  sobrescrever?: boolean
}

export interface RegistroPontoUpdate {
  data?: string | null
  tipoDia?: TipoDia
  horaEntrada?: string | null
  horaSaidaAlmoco?: string | null
  horaVoltaAlmoco?: string | null
  horaSaida?: string | null
  observacao?: string | null
  descontarAlmoco?: boolean
}

export interface PontosFiltro {
  funcionarioId?: string | null
  dataInicio?: string | null
  dataFim?: string | null
}

export interface RelatorioMensalFiltro {
  ano: number
  mes: number
  funcionarioId?: string | null
}

export interface RelatorioMensalLinha {
  funcionarioId: string
  nome: string
  cargo: string | null
  diasTrabalhados: number
  diasComPonto: number
  faltas: number
  folgas: number
  atestados: number
  totalHoras: number
  mediaHorasPorDiaTrabalhado: number | null
}

export interface RelatorioMensal {
  ano: number
  mes: number
  periodoInicio: string
  periodoFim: string
  linhas: RelatorioMensalLinha[]
  totais: {
    diasTrabalhados: number
    faltas: number
    folgas: number
    atestados: number
    totalHoras: number
  }
}

export interface BackupConfig {
  pastaBackup: string | null
  ultimoBackupEm: string | null
}

export interface ApiResult<T = void> {
  ok: boolean
  data?: T
  error?: string
  code?:
    | 'DUPLICATE'
    | 'VALIDATION'
    | 'NOT_FOUND'
    | 'SEM_ENTRADA'
    | 'BATIDA_INVALIDA'
    | 'UNKNOWN'
}

export interface ExportResult {
  canceled: boolean
  filePath?: string
}
