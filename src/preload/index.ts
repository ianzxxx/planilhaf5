import { contextBridge, ipcRenderer } from 'electron'
import type {
  ApiResult,
  BackupConfig,
  ExportResult,
  Funcionario,
  FuncionarioInput,
  MarcarBatidaInput,
  PontosFiltro,
  RegistrarAusenciaInput,
  RegistroPonto,
  RegistroPontoInput,
  RegistroPontoUpdate,
  RelatorioMensal,
  RelatorioMensalFiltro
} from '../shared/types'

const api = {
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
    listarDoDia: (data?: string): Promise<ApiResult<RegistroPonto[]>> =>
      ipcRenderer.invoke('pontos:listarDoDia', data),
    buscarPorDia: (
      funcionarioId: string,
      data: string
    ): Promise<ApiResult<RegistroPonto | null>> =>
      ipcRenderer.invoke('pontos:buscarPorDia', funcionarioId, data),
    marcarBatida: (
      input: MarcarBatidaInput
    ): Promise<ApiResult<RegistroPonto>> =>
      ipcRenderer.invoke('pontos:marcarBatida', input),
    registrarAusencia: (
      input: RegistrarAusenciaInput
    ): Promise<ApiResult<RegistroPonto>> =>
      ipcRenderer.invoke('pontos:registrarAusencia', input),
    excluir: (id: string): Promise<ApiResult> =>
      ipcRenderer.invoke('pontos:excluir', id),
    relatorioMensal: (
      filtro: RelatorioMensalFiltro
    ): Promise<ApiResult<RelatorioMensal>> =>
      ipcRenderer.invoke('pontos:relatorioMensal', filtro),
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
      ipcRenderer.invoke('export:xlsx', registros),
    relatorioMensal: (
      relatorio: RelatorioMensal
    ): Promise<ApiResult<ExportResult>> =>
      ipcRenderer.invoke('export:relatorioMensal', relatorio)
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
