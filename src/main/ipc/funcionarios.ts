import { ipcMain } from 'electron'
import { getPrisma } from '../db'
import { assertAuthenticated } from './auth'
import type { ApiResult, Funcionario, FuncionarioInput } from '../../shared/types'

function mapFuncionario(f: {
  id: string
  nome: string
  cargo: string | null
  horarioEntradaPadrao: string | null
  horarioSaidaPadrao: string | null
  ativo: boolean
  createdAt: Date
}): Funcionario {
  return {
    id: f.id,
    nome: f.nome,
    cargo: f.cargo,
    horarioEntradaPadrao: f.horarioEntradaPadrao,
    horarioSaidaPadrao: f.horarioSaidaPadrao,
    ativo: f.ativo,
    createdAt: f.createdAt.toISOString()
  }
}

export function registerFuncionarioHandlers(): void {
  ipcMain.handle(
    'funcionarios:listar',
    async (_event, apenasAtivos = false): Promise<ApiResult<Funcionario[]>> => {
      try {
        assertAuthenticated()
        const lista = await getPrisma().funcionario.findMany({
          where: apenasAtivos ? { ativo: true } : undefined,
          orderBy: { nome: 'asc' }
        })
        return { ok: true, data: lista.map(mapFuncionario) }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Erro ao listar'
        return { ok: false, error: message }
      }
    }
  )

  ipcMain.handle(
    'funcionarios:criar',
    async (_event, input: FuncionarioInput): Promise<ApiResult<Funcionario>> => {
      try {
        assertAuthenticated()
        const nome = input.nome?.trim()
        if (!nome) {
          return { ok: false, error: 'Nome é obrigatório', code: 'VALIDATION' }
        }

        const criado = await getPrisma().funcionario.create({
          data: {
            nome,
            cargo: input.cargo?.trim() || null,
            horarioEntradaPadrao: input.horarioEntradaPadrao || null,
            horarioSaidaPadrao: input.horarioSaidaPadrao || null,
            ativo: input.ativo ?? true
          }
        })

        return { ok: true, data: mapFuncionario(criado) }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Erro ao criar'
        return { ok: false, error: message }
      }
    }
  )

  ipcMain.handle(
    'funcionarios:atualizar',
    async (
      _event,
      id: string,
      input: FuncionarioInput
    ): Promise<ApiResult<Funcionario>> => {
      try {
        assertAuthenticated()
        const nome = input.nome?.trim()
        if (!nome) {
          return { ok: false, error: 'Nome é obrigatório', code: 'VALIDATION' }
        }

        const atualizado = await getPrisma().funcionario.update({
          where: { id },
          data: {
            nome,
            cargo: input.cargo?.trim() || null,
            horarioEntradaPadrao: input.horarioEntradaPadrao || null,
            horarioSaidaPadrao: input.horarioSaidaPadrao || null,
            ...(typeof input.ativo === 'boolean' ? { ativo: input.ativo } : {})
          }
        })

        return { ok: true, data: mapFuncionario(atualizado) }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Erro ao atualizar'
        return { ok: false, error: message }
      }
    }
  )

  ipcMain.handle(
    'funcionarios:inativar',
    async (_event, id: string): Promise<ApiResult<Funcionario>> => {
      try {
        assertAuthenticated()
        const atualizado = await getPrisma().funcionario.update({
          where: { id },
          data: { ativo: false }
        })
        return { ok: true, data: mapFuncionario(atualizado) }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Erro ao inativar'
        return { ok: false, error: message }
      }
    }
  )

  ipcMain.handle(
    'funcionarios:reativar',
    async (_event, id: string): Promise<ApiResult<Funcionario>> => {
      try {
        assertAuthenticated()
        const atualizado = await getPrisma().funcionario.update({
          where: { id },
          data: { ativo: true }
        })
        return { ok: true, data: mapFuncionario(atualizado) }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Erro ao reativar'
        return { ok: false, error: message }
      }
    }
  )
}
