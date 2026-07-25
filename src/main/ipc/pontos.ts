import { ipcMain } from 'electron'
import { getPrisma } from '../db'
import { assertAuthenticated } from './auth'
import { calcularHorasTrabalhadas, isHorarioValido } from '../../shared/hours'
import type {
  ApiResult,
  PontosFiltro,
  RegistroPonto,
  RegistroPontoInput,
  RegistroPontoUpdate
} from '../../shared/types'

function mapRegistro(r: {
  id: string
  funcionarioId: string
  data: string
  horaEntrada: string
  horaSaida: string
  horasTrabalhadas: number
  observacao: string | null
  createdAt: Date
  updatedAt: Date
  funcionario?: { id: string; nome: string; cargo: string | null }
}): RegistroPonto {
  return {
    id: r.id,
    funcionarioId: r.funcionarioId,
    data: r.data,
    horaEntrada: r.horaEntrada,
    horaSaida: r.horaSaida,
    horasTrabalhadas: r.horasTrabalhadas,
    observacao: r.observacao,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
    funcionario: r.funcionario
      ? {
          id: r.funcionario.id,
          nome: r.funcionario.nome,
          cargo: r.funcionario.cargo
        }
      : undefined
  }
}

function validarHorarios(
  horaEntrada: string,
  horaSaida: string
): ApiResult<number> {
  if (!isHorarioValido(horaEntrada) || !isHorarioValido(horaSaida)) {
    return {
      ok: false,
      error: 'Informe horários válidos no formato HH:mm',
      code: 'VALIDATION'
    }
  }

  const horas = calcularHorasTrabalhadas(horaEntrada, horaSaida)
  if (horas === null) {
    return {
      ok: false,
      error: 'A saída não pode ser anterior à entrada',
      code: 'VALIDATION'
    }
  }

  return { ok: true, data: horas }
}

export function registerPontoHandlers(): void {
  ipcMain.handle(
    'pontos:listar',
    async (_event, filtro: PontosFiltro = {}): Promise<ApiResult<RegistroPonto[]>> => {
      try {
        assertAuthenticated()
        const where: {
          funcionarioId?: string
          data?: { gte?: string; lte?: string }
        } = {}

        if (filtro.funcionarioId) {
          where.funcionarioId = filtro.funcionarioId
        }

        if (filtro.dataInicio || filtro.dataFim) {
          where.data = {}
          if (filtro.dataInicio) where.data.gte = filtro.dataInicio
          if (filtro.dataFim) where.data.lte = filtro.dataFim
        }

        const lista = await getPrisma().registroPonto.findMany({
          where,
          include: {
            funcionario: {
              select: { id: true, nome: true, cargo: true }
            }
          },
          orderBy: [{ data: 'desc' }, { funcionario: { nome: 'asc' } }]
        })

        return { ok: true, data: lista.map(mapRegistro) }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Erro ao listar pontos'
        return { ok: false, error: message }
      }
    }
  )

  ipcMain.handle(
    'pontos:buscarPorDia',
    async (
      _event,
      funcionarioId: string,
      data: string
    ): Promise<ApiResult<RegistroPonto | null>> => {
      try {
        assertAuthenticated()
        const registro = await getPrisma().registroPonto.findUnique({
          where: {
            funcionarioId_data: { funcionarioId, data }
          },
          include: {
            funcionario: {
              select: { id: true, nome: true, cargo: true }
            }
          }
        })

        return { ok: true, data: registro ? mapRegistro(registro) : null }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Erro ao buscar'
        return { ok: false, error: message }
      }
    }
  )

  ipcMain.handle(
    'pontos:salvar',
    async (_event, input: RegistroPontoInput): Promise<ApiResult<RegistroPonto>> => {
      try {
        assertAuthenticated()

        if (!input.funcionarioId || !input.data) {
          return {
            ok: false,
            error: 'Funcionário e data são obrigatórios',
            code: 'VALIDATION'
          }
        }

        const validacao = validarHorarios(input.horaEntrada, input.horaSaida)
        if (!validacao.ok || validacao.data === undefined) {
          return { ok: false, error: validacao.error, code: validacao.code }
        }

        const existente = await getPrisma().registroPonto.findUnique({
          where: {
            funcionarioId_data: {
              funcionarioId: input.funcionarioId,
              data: input.data
            }
          }
        })

        if (existente && !input.sobrescrever) {
          return {
            ok: false,
            error: 'Já existe um lançamento para este funcionário nesta data',
            code: 'DUPLICATE'
          }
        }

        const data = {
          horaEntrada: input.horaEntrada,
          horaSaida: input.horaSaida,
          horasTrabalhadas: validacao.data,
          observacao: input.observacao?.trim() || null
        }

        const registro = existente
          ? await getPrisma().registroPonto.update({
              where: { id: existente.id },
              data,
              include: {
                funcionario: {
                  select: { id: true, nome: true, cargo: true }
                }
              }
            })
          : await getPrisma().registroPonto.create({
              data: {
                funcionarioId: input.funcionarioId,
                data: input.data,
                ...data
              },
              include: {
                funcionario: {
                  select: { id: true, nome: true, cargo: true }
                }
              }
            })

        return { ok: true, data: mapRegistro(registro) }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Erro ao salvar ponto'
        return { ok: false, error: message }
      }
    }
  )

  ipcMain.handle(
    'pontos:atualizar',
    async (
      _event,
      id: string,
      input: RegistroPontoUpdate
    ): Promise<ApiResult<RegistroPonto>> => {
      try {
        assertAuthenticated()

        const atual = await getPrisma().registroPonto.findUnique({ where: { id } })
        if (!atual) {
          return { ok: false, error: 'Registro não encontrado', code: 'NOT_FOUND' }
        }

        const horaEntrada = input.horaEntrada ?? atual.horaEntrada
        const horaSaida = input.horaSaida ?? atual.horaSaida
        const validacao = validarHorarios(horaEntrada, horaSaida)
        if (!validacao.ok || validacao.data === undefined) {
          return { ok: false, error: validacao.error, code: validacao.code }
        }

        if (input.data && input.data !== atual.data) {
          const conflito = await getPrisma().registroPonto.findUnique({
            where: {
              funcionarioId_data: {
                funcionarioId: atual.funcionarioId,
                data: input.data
              }
            }
          })
          if (conflito) {
            return {
              ok: false,
              error: 'Já existe lançamento nesta data para o funcionário',
              code: 'DUPLICATE'
            }
          }
        }

        const atualizado = await getPrisma().registroPonto.update({
          where: { id },
          data: {
            data: input.data ?? atual.data,
            horaEntrada,
            horaSaida,
            horasTrabalhadas: validacao.data,
            observacao:
              input.observacao !== undefined
                ? input.observacao?.trim() || null
                : atual.observacao
          },
          include: {
            funcionario: {
              select: { id: true, nome: true, cargo: true }
            }
          }
        })

        return { ok: true, data: mapRegistro(atualizado) }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Erro ao atualizar'
        return { ok: false, error: message }
      }
    }
  )
}
