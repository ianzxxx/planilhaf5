import { BrowserWindow, dialog, ipcMain } from 'electron'
import {
  executarBackup,
  getBackupConfig,
  setPastaBackup
} from '../backup'
import { assertAuthenticated } from './auth'
import type { ApiResult, BackupConfig } from '../../shared/types'

export function registerConfigHandlers(): void {
  ipcMain.handle('config:backup:get', async (): Promise<ApiResult<BackupConfig>> => {
    try {
      assertAuthenticated()
      return { ok: true, data: getBackupConfig() }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro ao ler config'
      return { ok: false, error: message }
    }
  })

  ipcMain.handle(
    'config:backup:escolherPasta',
    async (event): Promise<ApiResult<BackupConfig>> => {
      try {
        assertAuthenticated()
        const win = BrowserWindow.fromWebContents(event.sender)
        const result = await dialog.showOpenDialog(win ?? undefined, {
          title: 'Escolher pasta de backup',
          properties: ['openDirectory', 'createDirectory']
        })

        if (result.canceled || !result.filePaths[0]) {
          return { ok: true, data: getBackupConfig() }
        }

        setPastaBackup(result.filePaths[0])
        await executarBackup(true)
        return { ok: true, data: getBackupConfig() }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Erro ao escolher pasta'
        return { ok: false, error: message }
      }
    }
  )

  ipcMain.handle('config:backup:remover', async (): Promise<ApiResult<BackupConfig>> => {
    try {
      assertAuthenticated()
      setPastaBackup(null)
      return { ok: true, data: getBackupConfig() }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro ao remover pasta'
      return { ok: false, error: message }
    }
  })

  ipcMain.handle(
    'config:backup:executar',
    async (): Promise<ApiResult<{ destino?: string; skipped?: boolean }>> => {
      try {
        assertAuthenticated()
        const result = await executarBackup(true)
        if (!result.ok) {
          return { ok: false, error: result.error }
        }
        return {
          ok: true,
          data: { destino: result.destino, skipped: result.skipped }
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Erro no backup'
        return { ok: false, error: message }
      }
    }
  )
}
