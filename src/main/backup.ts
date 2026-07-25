import fs from 'fs'
import path from 'path'
import { getDbPath } from './db'
import { store } from './store'

export function getBackupConfig() {
  return {
    pastaBackup: store.get('pastaBackup'),
    ultimoBackupEm: store.get('ultimoBackupEm')
  }
}

export function setPastaBackup(pasta: string | null): void {
  store.set('pastaBackup', pasta)
}

export async function executarBackup(forcar = false): Promise<{
  ok: boolean
  skipped?: boolean
  error?: string
  destino?: string
}> {
  const pasta = store.get('pastaBackup')
  if (!pasta) {
    return { ok: true, skipped: true }
  }

  if (!fs.existsSync(pasta)) {
    return { ok: false, error: 'Pasta de backup não encontrada' }
  }

  const ultimo = store.get('ultimoBackupEm')
  if (!forcar && ultimo && isMesmoDia(ultimo, new Date().toISOString())) {
    return { ok: true, skipped: true }
  }

  const dbPath = getDbPath()
  if (!fs.existsSync(dbPath)) {
    return { ok: false, error: 'Arquivo do banco não encontrado' }
  }

  try {
    const agora = new Date()
    const stamp = [
      agora.getFullYear(),
      String(agora.getMonth() + 1).padStart(2, '0'),
      String(agora.getDate()).padStart(2, '0'),
      String(agora.getHours()).padStart(2, '0'),
      String(agora.getMinutes()).padStart(2, '0')
    ].join('')

    const destino = path.join(pasta, `ponto-backup-${stamp}.db`)
    const destinoRecente = path.join(pasta, 'ponto-backup-recente.db')

    fs.copyFileSync(dbPath, destino)
    fs.copyFileSync(dbPath, destinoRecente)

    store.set('ultimoBackupEm', agora.toISOString())

    limparBackupsAntigos(pasta)

    return { ok: true, destino }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro ao copiar backup'
    return { ok: false, error: message }
  }
}

function isMesmoDia(isoA: string, isoB: string): boolean {
  return isoA.slice(0, 10) === isoB.slice(0, 10)
}

function limparBackupsAntigos(pasta: string): void {
  try {
    const arquivos = fs
      .readdirSync(pasta)
      .filter((f) => /^ponto-backup-\d{12}\.db$/.test(f))
      .map((f) => ({
        nome: f,
        mtime: fs.statSync(path.join(pasta, f)).mtimeMs
      }))
      .sort((a, b) => b.mtime - a.mtime)

    for (const antigo of arquivos.slice(14)) {
      fs.unlinkSync(path.join(pasta, antigo.nome))
    }
  } catch {
    // limpeza é best-effort
  }
}
