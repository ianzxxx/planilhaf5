import { ipcMain } from 'electron'
import bcrypt from 'bcryptjs'
import { getPrisma } from '../db'
import { store } from '../store'
import type { ApiResult, UsuarioSessao } from '../../shared/types'

function requireSession(): UsuarioSessao | null {
  return store.get('sessao')
}

export function registerAuthHandlers(): void {
  ipcMain.handle(
    'auth:login',
    async (_event, email: string, senha: string): Promise<ApiResult<UsuarioSessao>> => {
      try {
        const usuario = await getPrisma().usuario.findUnique({
          where: { email: email.trim().toLowerCase() }
        })

        if (!usuario) {
          return { ok: false, error: 'E-mail ou senha incorretos', code: 'UNAUTHORIZED' }
        }

        const ok = await bcrypt.compare(senha, usuario.senhaHash)
        if (!ok) {
          return { ok: false, error: 'E-mail ou senha incorretos', code: 'UNAUTHORIZED' }
        }

        const sessao: UsuarioSessao = {
          id: usuario.id,
          email: usuario.email,
          role: usuario.role
        }

        store.set('sessao', sessao)
        return { ok: true, data: sessao }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Erro ao entrar'
        return { ok: false, error: message, code: 'UNKNOWN' }
      }
    }
  )

  ipcMain.handle('auth:logout', async (): Promise<ApiResult> => {
    store.set('sessao', null)
    return { ok: true }
  })

  ipcMain.handle('auth:sessao', async (): Promise<ApiResult<UsuarioSessao | null>> => {
    return { ok: true, data: requireSession() }
  })
}

export function assertAuthenticated(): UsuarioSessao {
  const sessao = requireSession()
  if (!sessao) {
    throw new Error('Não autenticado')
  }
  return sessao
}
