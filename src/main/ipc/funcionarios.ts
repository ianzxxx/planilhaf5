import { ipcMain } from 'electron'
import { getPrisma } from '../db'
import type { ApiResult, Funcionario, FuncionarioInput } from '../../shared/types'

function mapFuncionario(f: {
  id: string
  nome: string
  cargo: string | null
  horarioEntradaPadrao: string | null
  horarioSaidaPadrao: string | null
  minutosAlmocoPadrao: number | null
  ativo: boolean
  createdAt: Date
}): Funcionario {
  return {
    id: f.id,
    nome: f.nome,
    cargo: f.cargo,
    horarioEntradaPadrao: f.horarioEntradaPadrao,
    horarioSaidaPadrao: f.horarioSaidaPadrao,
    minutosAlmocoPadrao: f.minutosAlmocoPadrao,
    ativo: f.ativo,
    createdAt: f.createdAt.toISOString()
  }
}

function normalizarMinutosAlmoco(
  valor: number | null | undefined
): number | null {
  if (valor === undefined) return 60
  if (valor === null) return null
  if (Number.isNaN(valor) || valor < 0) return 60
  return Math.round(valor)
}

export function registerFuncionarioHandlers(): void {
  ipcMain.handle(
    'funcionarios:listar',
    async (_event, apenasAtivos = false): Promise<ApiResult<Funcionario[]>> => {
      try {
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
        const criado = await getPrisma().funcionario.create({
          data: {
            nome: input.nome?.trim() || 'Sem nome',
            cargo: input.cargo?.trim() || null,
            horarioEntradaPadrao: input.horarioEntradaPadrao || null,
            horarioSaidaPadrao: input.horarioSaidaPadrao || null,
            minutosAlmocoPadrao: normalizarMinutosAlmoco(input.minutosAlmocoPadrao),
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
        const atualizado = await getPrisma().funcionario.update({
          where: { id },
          data: {
            nome: input.nome?.trim() || 'Sem nome',
            cargo: input.cargo?.trim() || null,
            horarioEntradaPadrao: input.horarioEntradaPadrao || null,
            horarioSaidaPadrao: input.horarioSaidaPadrao || null,
            minutosAlmocoPadrao: normalizarMinutosAlmoco(input.minutosAlmocoPadrao),
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
