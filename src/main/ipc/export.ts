import { BrowserWindow, ipcMain } from 'electron'
import { exportarPontosXlsx, exportarRelatorioMensalXlsx } from '../excel'
import type {
  ApiResult,
  ExportResult,
  RegistroPonto,
  RelatorioMensal
} from '../../shared/types'

export function registerExportHandlers(): void {
  ipcMain.handle(
    'export:xlsx',
    async (
      event,
      registros: RegistroPonto[]
    ): Promise<ApiResult<ExportResult>> => {
      try {
        const win = BrowserWindow.fromWebContents(event.sender)
        const result = await exportarPontosXlsx(registros, win)
        return { ok: true, data: result }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Erro ao exportar'
        return { ok: false, error: message }
      }
    }
  )

  ipcMain.handle(
    'export:relatorioMensal',
    async (
      event,
      relatorio: RelatorioMensal
    ): Promise<ApiResult<ExportResult>> => {
      try {
        const win = BrowserWindow.fromWebContents(event.sender)
        const result = await exportarRelatorioMensalXlsx(relatorio, win)
        return { ok: true, data: result }
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Erro ao exportar relatório'
        return { ok: false, error: message }
      }
    }
  )
}
