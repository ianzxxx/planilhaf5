import { BrowserWindow, ipcMain } from 'electron'
import { exportarPontosXlsx } from '../excel'
import { assertAuthenticated } from './auth'
import type { ApiResult, ExportResult, RegistroPonto } from '../../shared/types'

export function registerExportHandlers(): void {
  ipcMain.handle(
    'export:xlsx',
    async (
      event,
      registros: RegistroPonto[]
    ): Promise<ApiResult<ExportResult>> => {
      try {
        assertAuthenticated()
        const win = BrowserWindow.fromWebContents(event.sender)
        const result = await exportarPontosXlsx(registros, win)
        return { ok: true, data: result }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Erro ao exportar'
        return { ok: false, error: message }
      }
    }
  )
}
