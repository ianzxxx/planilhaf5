export type Role = 'secretaria' | 'gestor'

export interface UsuarioSessao {
  id: string
  email: string
  role: Role
}

export interface Funcionario {
  id: string
  nome: string
  cargo: string | null
  horarioEntradaPadrao: string | null
  horarioSaidaPadrao: string | null
  ativo: boolean
  createdAt: string
}

export interface FuncionarioInput {
  nome: string
  cargo?: string | null
  horarioEntradaPadrao?: string | null
  horarioSaidaPadrao?: string | null
  ativo?: boolean
}

export interface RegistroPonto {
  id: string
  funcionarioId: string
  data: string
  horaEntrada: string
  horaSaida: string
  horasTrabalhadas: number
  observacao: string | null
  createdAt: string
  updatedAt: string
  funcionario?: Pick<Funcionario, 'id' | 'nome' | 'cargo'>
}

export interface RegistroPontoInput {
  funcionarioId: string
  data: string
  horaEntrada: string
  horaSaida: string
  observacao?: string | null
  sobrescrever?: boolean
}

export interface RegistroPontoUpdate {
  data?: string
  horaEntrada?: string
  horaSaida?: string
  observacao?: string | null
}

export interface PontosFiltro {
  funcionarioId?: string | null
  dataInicio?: string | null
  dataFim?: string | null
}

export interface BackupConfig {
  pastaBackup: string | null
  ultimoBackupEm: string | null
}

export interface ApiResult<T = void> {
  ok: boolean
  data?: T
  error?: string
  code?: 'DUPLICATE' | 'VALIDATION' | 'UNAUTHORIZED' | 'NOT_FOUND' | 'UNKNOWN'
}

export interface ExportResult {
  canceled: boolean
  filePath?: string
}
