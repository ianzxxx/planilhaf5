import { app, dialog } from 'electron'
import { autoUpdater } from 'electron-updater'

export function setupAutoUpdater(): void {
  if (!app.isPackaged) {
    return
  }

  autoUpdater.autoDownload = true
  autoUpdater.autoInstallOnAppQuit = true

  // Token lido no build via GH_TOKEN / electron-builder publish.
  // Em runtime, o updater usa o token embutido pelo electron-builder
  // quando o repositório é privado.
  autoUpdater.on('error', (error) => {
    console.error('Erro no auto-updater:', error)
  })

  autoUpdater.on('update-downloaded', async () => {
    const result = await dialog.showMessageBox({
      type: 'info',
      title: 'Atualização disponível',
      message: 'Uma nova versão foi baixada.',
      detail: 'Deseja reiniciar agora para instalar a atualização?',
      buttons: ['Reiniciar agora', 'Depois'],
      defaultId: 0,
      cancelId: 1
    })

    if (result.response === 0) {
      autoUpdater.quitAndInstall()
    }
  })

  autoUpdater.checkForUpdatesAndNotify().catch((error) => {
    console.error('Falha ao verificar atualizações:', error)
  })
}
