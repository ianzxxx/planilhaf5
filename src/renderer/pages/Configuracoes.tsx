import { useEffect, useState } from 'react'
import { FolderOpen, HardDriveDownload, Trash2 } from 'lucide-react'
import type { BackupConfig } from '@shared/types'
import { useToast } from '../components/Toast'

export default function ConfiguracoesPage() {
  const { toast } = useToast()
  const [config, setConfig] = useState<BackupConfig>({
    pastaBackup: null,
    ultimoBackupEm: null
  })
  const [loading, setLoading] = useState(false)

  async function carregar() {
    const result = await window.api.config.getBackup()
    if (result.ok && result.data) setConfig(result.data)
  }

  useEffect(() => {
    carregar()
  }, [])

  async function escolherPasta() {
    setLoading(true)
    try {
      const result = await window.api.config.escolherPastaBackup()
      if (!result.ok) {
        toast(result.error || 'Erro ao escolher pasta', 'error')
        return
      }
      if (result.data) setConfig(result.data)
      toast('Pasta de backup configurada')
    } finally {
      setLoading(false)
    }
  }

  async function removerPasta() {
    setLoading(true)
    try {
      const result = await window.api.config.removerPastaBackup()
      if (!result.ok) {
        toast(result.error || 'Erro ao remover', 'error')
        return
      }
      if (result.data) setConfig(result.data)
      toast('Pasta de backup removida', 'info')
    } finally {
      setLoading(false)
    }
  }

  async function backupAgora() {
    setLoading(true)
    try {
      const result = await window.api.config.executarBackup()
      if (!result.ok) {
        toast(result.error || 'Erro no backup', 'error')
        return
      }
      await carregar()
      toast(
        result.data?.destino
          ? 'Backup copiado com sucesso'
          : 'Backup concluído'
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-text">Configurações</h1>
        <p className="text-sm text-muted">
          Backup local automático para uma pasta sincronizada (Google Drive,
          OneDrive, Dropbox...).
        </p>
      </div>

      <section className="card-panel space-y-4">
        <div>
          <h2 className="text-base font-semibold text-text">Pasta de backup</h2>
          <p className="mt-1 text-sm text-muted">
            O app copia o banco de dados (`.db`) para esta pasta ao abrir — no
            máximo uma vez por dia. A sincronização com a nuvem fica a cargo do
            app já instalado no computador.
          </p>
        </div>

        <div className="rounded-xl bg-slate-50 px-4 py-3">
          <p className="text-xs font-medium uppercase tracking-wide text-muted">
            Pasta atual
          </p>
          <p className="mt-1 break-all text-sm font-medium text-text">
            {config.pastaBackup || 'Nenhuma pasta configurada'}
          </p>
          {config.ultimoBackupEm ? (
            <p className="mt-2 text-xs text-muted">
              Último backup:{' '}
              {new Date(config.ultimoBackupEm).toLocaleString('pt-BR')}
            </p>
          ) : null}
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="btn-primary"
            onClick={escolherPasta}
            disabled={loading}
          >
            <FolderOpen className="h-4 w-4" />
            Escolher pasta
          </button>
          <button
            type="button"
            className="btn-secondary"
            onClick={backupAgora}
            disabled={loading || !config.pastaBackup}
          >
            <HardDriveDownload className="h-4 w-4" />
            Fazer backup agora
          </button>
          {config.pastaBackup ? (
            <button
              type="button"
              className="btn-secondary"
              onClick={removerPasta}
              disabled={loading}
            >
              <Trash2 className="h-4 w-4" />
              Remover pasta
            </button>
          ) : null}
        </div>
      </section>

      <section className="card-panel">
        <h2 className="text-base font-semibold text-text">Sobre</h2>
        <p className="mt-2 text-sm text-muted">
          Ponto Escritório v1.0 — funciona offline, com dados salvos localmente
          neste computador. Atualizações são baixadas automaticamente quando
          houver nova versão no GitHub Releases.
        </p>
      </section>
    </div>
  )
}
