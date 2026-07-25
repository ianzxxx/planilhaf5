import { contextBridge, ipcRenderer } from 'electron'
import type {
  ApiResult,
  BackupConfig,
  ExportResult,
  Funcionario,
  FuncionarioInput,
  PontosFiltro,
  RegistroPonto,
  RegistroPontoInput,
  RegistroPontoUpdate,
  UsuarioSessao
} from '../shared/types'

const api = {
  auth: {
    login: (email: string, senha: string): Promise<ApiResult<UsuarioSessao>> =>
      ipcRenderer.invoke('auth:login', email, senha),
    logout: (): Promise<ApiResult> => ipcRenderer.invoke('auth:logout'),
    sessao: (): Promise<ApiResult<UsuarioSessao | null>> =>
      ipcRenderer.invoke('auth:sessao')
  },
  funcionarios: {
    listar: (apenasAtivos = false): Promise<ApiResult<Funcionario[]>> =>
      ipcRenderer.invoke('funcionarios:listar', apenasAtivos),
    criar: (input: FuncionarioInput): Promise<ApiResult<Funcionario>> =>
      ipcRenderer.invoke('funcionarios:criar', input),
    atualizar: (
      id: string,
      input: FuncionarioInput
    ): Promise<ApiResult<Funcionario>> =>
      ipcRenderer.invoke('funcionarios:atualizar', id, input),
    inativar: (id: string): Promise<ApiResult<Funcionario>> =>
      ipcRenderer.invoke('funcionarios:inativar', id),
    reativar: (id: string): Promise<ApiResult<Funcionario>> =>
      ipcRenderer.invoke('funcionarios:reativar', id)
  },
  pontos: {
    listar: (filtro?: PontosFiltro): Promise<ApiResult<RegistroPonto[]>> =>
      ipcRenderer.invoke('pontos:listar', filtro),
    buscarPorDia: (
      funcionarioId: string,
      data: string
    ): Promise<ApiResult<RegistroPonto | null>> =>
      ipcRenderer.invoke('pontos:buscarPorDia', funcionarioId, data),
    salvar: (input: RegistroPontoInput): Promise<ApiResult<RegistroPonto>> =>
      ipcRenderer.invoke('pontos:salvar', input),
    atualizar: (
      id: string,
      input: RegistroPontoUpdate
    ): Promise<ApiResult<RegistroPonto>> =>
      ipcRenderer.invoke('pontos:atualizar', id, input)
  },
  exportar: {
    xlsx: (registros: RegistroPonto[]): Promise<ApiResult<ExportResult>> =>
      ipcRenderer.invoke('export:xlsx', registros)
  },
  config: {
    getBackup: (): Promise<ApiResult<BackupConfig>> =>
      ipcRenderer.invoke('config:backup:get'),
    escolherPastaBackup: (): Promise<ApiResult<BackupConfig>> =>
      ipcRenderer.invoke('config:backup:escolherPasta'),
    removerPastaBackup: (): Promise<ApiResult<BackupConfig>> =>
      ipcRenderer.invoke('config:backup:remover'),
    executarBackup: (): Promise<
      ApiResult<{ destino?: string; skipped?: boolean }>
    > => ipcRenderer.invoke('config:backup:executar')
  }
}

export type ElectronApi = typeof api

contextBridge.exposeInMainWorld('api', api)
