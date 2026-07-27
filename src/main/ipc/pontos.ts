import { ipcMain } from 'electron'
import { getPrisma } from '../db'
import {
  agoraHHMM,
  calcularHorasTrabalhadas,
  hojeISO,
  normalizarHorario,
  statusDoDia
} from '../../shared/hours'
import type {
  ApiResult,
  MarcarBatidaInput,
  PontosFiltro,
  RegistrarAusenciaInput,
  RegistroPonto,
  RegistroPontoInput,
  RegistroPontoUpdate,
  RelatorioMensal,
  RelatorioMensalFiltro,
  RelatorioMensalLinha,
  TipoBatida,
  TipoDia
} from '../../shared/types'

type RegistroRow = {
  id: string
  funcionarioId: string
  data: string
  tipoDia: string
  horaEntrada: string | null
  horaSaidaAlmoco: string | null
  horaVoltaAlmoco: string | null
  horaSaida: string | null
  horasTrabalhadas: number | null
  observacao: string | null
  createdAt: Date
  updatedAt: Date
  funcionario?: {
    id: string
    nome: string
    cargo: string | null
    minutosAlmocoPadrao: number | null
  }
}

function asTipoDia(valor: string | null | undefined): TipoDia {
  if (valor === 'falta' || valor === 'folga' || valor === 'atestado') return valor
  return 'trabalho'
}

function mapRegistro(r: RegistroRow): RegistroPonto {
  return {
    id: r.id,
    funcionarioId: r.funcionarioId,
    data: r.data,
    tipoDia: asTipoDia(r.tipoDia),
    horaEntrada: r.horaEntrada,
    horaSaidaAlmoco: r.horaSaidaAlmoco,
    horaVoltaAlmoco: r.horaVoltaAlmoco,
    horaSaida: r.horaSaida,
    horasTrabalhadas: r.horasTrabalhadas,
    observacao: r.observacao,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
    funcionario: r.funcionario
      ? {
          id: r.funcionario.id,
          nome: r.funcionario.nome,
          cargo: r.funcionario.cargo,
          minutosAlmocoPadrao: r.funcionario.minutosAlmocoPadrao
        }
      : undefined
  }
}

const includeFuncionario = {
  funcionario: {
    select: {
      id: true,
      nome: true,
      cargo: true,
      minutosAlmocoPadrao: true
    }
  }
} as const

function horasDe(
  registro: {
    horaEntrada: string | null
    horaSaidaAlmoco: string | null
    horaVoltaAlmoco: string | null
    horaSaida: string | null
  },
  minutosAlmocoPadrao: number | null | undefined,
  descontarAlmoco = true
): number | null {
  const temAlmocoBatido = Boolean(
    registro.horaSaidaAlmoco || registro.horaVoltaAlmoco
  )
  const desconto =
    !temAlmocoBatido && descontarAlmoco ? (minutosAlmocoPadrao ?? 0) : 0

  return calcularHorasTrabalhadas(
    {
      horaEntrada: registro.horaEntrada,
      horaSaidaAlmoco: registro.horaSaidaAlmoco,
      horaVoltaAlmoco: registro.horaVoltaAlmoco,
      horaSaida: registro.horaSaida
    },
    desconto
  )
}

function periodoMes(ano: number, mes: number): { inicio: string; fim: string } {
  const m = String(mes).padStart(2, '0')
  const last = new Date(ano, mes, 0).getDate()
  return {
    inicio: `${ano}-${m}-01`,
    fim: `${ano}-${m}-${String(last).padStart(2, '0')}`
  }
}

async function registroAbertoDoDia(funcionarioId: string, data: string) {
  return getPrisma().registroPonto.findFirst({
    where: {
      funcionarioId,
      data,
      tipoDia: 'trabalho',
      horaSaida: null
    },
    orderBy: { createdAt: 'desc' },
    include: includeFuncionario
  })
}

export function registerPontoHandlers(): void {
  ipcMain.handle(
    'pontos:listar',
    async (_event, filtro: PontosFiltro = {}): Promise<ApiResult<RegistroPonto[]>> => {
      try {
        const where: {
          funcionarioId?: string
          data?: { gte?: string; lte?: string }
        } = {}
        if (filtro.funcionarioId) where.funcionarioId = filtro.funcionarioId
        if (filtro.dataInicio || filtro.dataFim) {
          where.data = {}
          if (filtro.dataInicio) where.data.gte = filtro.dataInicio
          if (filtro.dataFim) where.data.lte = filtro.dataFim
        }

        const lista = await getPrisma().registroPonto.findMany({
          where,
          include: includeFuncionario,
          orderBy: [{ data: 'desc' }, { funcionario: { nome: 'asc' } }]
        })
        return { ok: true, data: lista.map(mapRegistro) }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Erro ao listar'
        return { ok: false, error: message }
      }
    }
  )

  ipcMain.handle(
    'pontos:listarDoDia',
    async (_event, data?: string): Promise<ApiResult<RegistroPonto[]>> => {
      try {
        const dia = data?.trim() || hojeISO()
        const lista = await getPrisma().registroPonto.findMany({
          where: { data: dia },
          include: includeFuncionario,
          orderBy: [{ createdAt: 'asc' }, { funcionario: { nome: 'asc' } }]
        })
        return { ok: true, data: lista.map(mapRegistro) }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Erro ao listar do dia'
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
        const registro = await getPrisma().registroPonto.findFirst({
          where: { funcionarioId, data },
          orderBy: { updatedAt: 'desc' },
          include: includeFuncionario
        })
        return { ok: true, data: registro ? mapRegistro(registro) : null }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Erro ao buscar'
        return { ok: false, error: message }
      }
    }
  )

  ipcMain.handle(
    'pontos:registrarAusencia',
    async (
      _event,
      input: RegistrarAusenciaInput
    ): Promise<ApiResult<RegistroPonto>> => {
      try {
        if (!input.funcionarioId) {
          return { ok: false, error: 'Selecione um funcionário', code: 'VALIDATION' }
        }
        if (!['falta', 'folga', 'atestado'].includes(input.tipoDia)) {
          return { ok: false, error: 'Tipo de ausência inválido', code: 'VALIDATION' }
        }

        const data = input.data?.trim() || hojeISO()
        const existentes = await getPrisma().registroPonto.findMany({
          where: { funcionarioId: input.funcionarioId, data }
        })

        if (existentes.length > 0 && !input.sobrescrever) {
          return {
            ok: false,
            error: 'Já existe lançamento neste dia. Confirme para substituir.',
            code: 'DUPLICATE'
          }
        }

        if (existentes.length > 0) {
          await getPrisma().registroPonto.deleteMany({
            where: { funcionarioId: input.funcionarioId, data }
          })
        }

        const criado = await getPrisma().registroPonto.create({
          data: {
            funcionarioId: input.funcionarioId,
            data,
            tipoDia: input.tipoDia,
            horaEntrada: null,
            horaSaidaAlmoco: null,
            horaVoltaAlmoco: null,
            horaSaida: null,
            horasTrabalhadas: 0,
            observacao: input.observacao?.trim() || null
          },
          include: includeFuncionario
        })

        return { ok: true, data: mapRegistro(criado) }
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Erro ao registrar ausência'
        return { ok: false, error: message }
      }
    }
  )

  ipcMain.handle(
    'pontos:excluir',
    async (_event, id: string): Promise<ApiResult> => {
      try {
        await getPrisma().registroPonto.delete({ where: { id } })
        return { ok: true }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Erro ao excluir'
        return { ok: false, error: message }
      }
    }
  )

  ipcMain.handle(
    'pontos:relatorioMensal',
    async (
      _event,
      filtro: RelatorioMensalFiltro
    ): Promise<ApiResult<RelatorioMensal>> => {
      try {
        const ano = filtro.ano
        const mes = filtro.mes
        if (!ano || !mes || mes < 1 || mes > 12) {
          return { ok: false, error: 'Informe ano e mês válidos', code: 'VALIDATION' }
        }

        const { inicio, fim } = periodoMes(ano, mes)

        const funcionarios = await getPrisma().funcionario.findMany({
          where: filtro.funcionarioId
            ? { id: filtro.funcionarioId }
            : { ativo: true },
          orderBy: { nome: 'asc' }
        })

        const registros = await getPrisma().registroPonto.findMany({
          where: {
            data: { gte: inicio, lte: fim },
            ...(filtro.funcionarioId
              ? { funcionarioId: filtro.funcionarioId }
              : {})
          }
        })

        const porFunc = new Map<string, typeof registros>()
        for (const r of registros) {
          const lista = porFunc.get(r.funcionarioId) ?? []
          lista.push(r)
          porFunc.set(r.funcionarioId, lista)
        }

        const linhas: RelatorioMensalLinha[] = funcionarios.map((f) => {
          const lista = porFunc.get(f.id) ?? []
          const faltas = lista.filter((r) => r.tipoDia === 'falta').length
          const folgas = lista.filter((r) => r.tipoDia === 'folga').length
          const atestados = lista.filter((r) => r.tipoDia === 'atestado').length
          const trabalhos = lista.filter((r) => r.tipoDia === 'trabalho')
          const diasTrabalhados = trabalhos.filter(
            (r) => (r.horasTrabalhadas ?? 0) > 0 || Boolean(r.horaEntrada)
          ).length
          const totalHoras = trabalhos.reduce(
            (acc, r) => acc + (r.horasTrabalhadas ?? 0),
            0
          )

          return {
            funcionarioId: f.id,
            nome: f.nome || 'Sem nome',
            cargo: f.cargo,
            diasTrabalhados,
            diasComPonto: lista.length,
            faltas,
            folgas,
            atestados,
            totalHoras: Math.round(totalHoras * 100) / 100,
            mediaHorasPorDiaTrabalhado:
              diasTrabalhados > 0
                ? Math.round((totalHoras / diasTrabalhados) * 100) / 100
                : null
          }
        })

        const totais = linhas.reduce(
          (acc, l) => ({
            diasTrabalhados: acc.diasTrabalhados + l.diasTrabalhados,
            faltas: acc.faltas + l.faltas,
            folgas: acc.folgas + l.folgas,
            atestados: acc.atestados + l.atestados,
            totalHoras: acc.totalHoras + l.totalHoras
          }),
          {
            diasTrabalhados: 0,
            faltas: 0,
            folgas: 0,
            atestados: 0,
            totalHoras: 0
          }
        )
        totais.totalHoras = Math.round(totais.totalHoras * 100) / 100

        return {
          ok: true,
          data: {
            ano,
            mes,
            periodoInicio: inicio,
            periodoFim: fim,
            linhas,
            totais
          }
        }
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Erro no relatório mensal'
        return { ok: false, error: message }
      }
    }
  )

  ipcMain.handle(
    'pontos:marcarBatida',
    async (_event, input: MarcarBatidaInput): Promise<ApiResult<RegistroPonto>> => {
      try {
        if (!input.funcionarioId) {
          return { ok: false, error: 'Selecione um funcionário', code: 'VALIDATION' }
        }

        const data = input.data?.trim() || hojeISO()
        const horario = normalizarHorario(input.horario) || agoraHHMM()
        const observacao = input.observacao?.trim() || null
        const tipo: TipoBatida = input.tipo

        const funcionario = await getPrisma().funcionario.findUnique({
          where: { id: input.funcionarioId }
        })
        if (!funcionario) {
          return { ok: false, error: 'Funcionário não encontrado', code: 'NOT_FOUND' }
        }

        // Se o dia está como ausência, precisa confirmar para virar trabalho
        const ausencia = await getPrisma().registroPonto.findFirst({
          where: {
            funcionarioId: input.funcionarioId,
            data,
            tipoDia: { in: ['falta', 'folga', 'atestado'] }
          }
        })
        if (ausencia && !input.forcar) {
          return {
            ok: false,
            error: 'Este dia está marcado como ausência. Confirme para substituir por ponto.',
            code: 'DUPLICATE'
          }
        }
        if (ausencia && input.forcar) {
          await getPrisma().registroPonto.delete({ where: { id: ausencia.id } })
        }

        let aberto = await registroAbertoDoDia(input.funcionarioId, data)

        if (tipo === 'entrada') {
          if (aberto?.horaEntrada && !input.forcar) {
            const atualizado = await getPrisma().registroPonto.update({
              where: { id: aberto.id },
              data: {
                tipoDia: 'trabalho',
                horaEntrada: horario,
                horasTrabalhadas: null,
                ...(observacao ? { observacao } : {})
              },
              include: includeFuncionario
            })
            return { ok: true, data: mapRegistro(atualizado) }
          }

          const criado = await getPrisma().registroPonto.create({
            data: {
              funcionarioId: input.funcionarioId,
              data,
              tipoDia: 'trabalho',
              horaEntrada: horario,
              horaSaidaAlmoco: null,
              horaVoltaAlmoco: null,
              horaSaida: null,
              horasTrabalhadas: null,
              observacao
            },
            include: includeFuncionario
          })
          return { ok: true, data: mapRegistro(criado) }
        }

        if (!aberto) {
          if (tipo === 'saida' && input.forcar) {
            const criado = await getPrisma().registroPonto.create({
              data: {
                funcionarioId: input.funcionarioId,
                data,
                tipoDia: 'trabalho',
                horaEntrada: null,
                horaSaidaAlmoco: null,
                horaVoltaAlmoco: null,
                horaSaida: horario,
                horasTrabalhadas: null,
                observacao
              },
              include: includeFuncionario
            })
            return { ok: true, data: mapRegistro(criado) }
          }
          return {
            ok: false,
            error: 'Não há ponto aberto neste dia. Registre a entrada primeiro.',
            code: 'SEM_ENTRADA'
          }
        }

        const status = statusDoDia(aberto)

        if (tipo === 'saida' && status.status === 'trabalhando_manha') {
          const descontar = input.descontarAlmoco !== false
          const horas = horasDe(
            { ...aberto, horaSaida: horario },
            funcionario.minutosAlmocoPadrao,
            descontar
          )
          const atualizado = await getPrisma().registroPonto.update({
            where: { id: aberto.id },
            data: {
              tipoDia: 'trabalho',
              horaSaida: horario,
              horasTrabalhadas: horas,
              ...(observacao ? { observacao } : {})
            },
            include: includeFuncionario
          })
          return { ok: true, data: mapRegistro(atualizado) }
        }

        const campoPorTipo: Record<
          Exclude<TipoBatida, 'entrada'>,
          'horaSaidaAlmoco' | 'horaVoltaAlmoco' | 'horaSaida'
        > = {
          saidaAlmoco: 'horaSaidaAlmoco',
          voltaAlmoco: 'horaVoltaAlmoco',
          saida: 'horaSaida'
        }

        const campo = campoPorTipo[tipo as Exclude<TipoBatida, 'entrada'>]
        if (!campo) {
          return { ok: false, error: 'Tipo de batida inválido', code: 'BATIDA_INVALIDA' }
        }

        if (!input.forcar) {
          if (tipo === 'saidaAlmoco' && !aberto.horaEntrada) {
            return {
              ok: false,
              error: 'Registre a entrada antes da saída para o almoço',
              code: 'BATIDA_INVALIDA'
            }
          }
          if (tipo === 'voltaAlmoco' && !aberto.horaSaidaAlmoco) {
            return {
              ok: false,
              error: 'Registre a saída para o almoço antes da volta',
              code: 'BATIDA_INVALIDA'
            }
          }
          if (tipo === 'saida' && aberto.horaSaidaAlmoco && !aberto.horaVoltaAlmoco) {
            return {
              ok: false,
              error: 'Registre a volta do almoço antes da saída final',
              code: 'BATIDA_INVALIDA'
            }
          }
        }

        const next = {
          horaEntrada: aberto.horaEntrada,
          horaSaidaAlmoco: aberto.horaSaidaAlmoco,
          horaVoltaAlmoco: aberto.horaVoltaAlmoco,
          horaSaida: aberto.horaSaida,
          [campo]: horario
        }

        const descontar =
          tipo === 'saida' ? input.descontarAlmoco !== false : true

        const atualizado = await getPrisma().registroPonto.update({
          where: { id: aberto.id },
          data: {
            tipoDia: 'trabalho',
            ...next,
            horasTrabalhadas: horasDe(
              next,
              funcionario.minutosAlmocoPadrao,
              descontar
            ),
            ...(observacao ? { observacao } : {})
          },
          include: includeFuncionario
        })

        return { ok: true, data: mapRegistro(atualizado) }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Erro ao marcar batida'
        return { ok: false, error: message }
      }
    }
  )

  ipcMain.handle(
    'pontos:salvar',
    async (_event, input: RegistroPontoInput): Promise<ApiResult<RegistroPonto>> => {
      try {
        if (!input.funcionarioId) {
          return { ok: false, error: 'Selecione um funcionário', code: 'VALIDATION' }
        }

        const data = input.data?.trim() || hojeISO()
        const tipoDia = asTipoDia(input.tipoDia)
        const funcionario = await getPrisma().funcionario.findUnique({
          where: { id: input.funcionarioId }
        })

        if (tipoDia !== 'trabalho') {
          const payload = {
            tipoDia,
            horaEntrada: null as string | null,
            horaSaidaAlmoco: null as string | null,
            horaVoltaAlmoco: null as string | null,
            horaSaida: null as string | null,
            horasTrabalhadas: 0,
            observacao: input.observacao?.trim() || null
          }
          const existente = input.registroId
            ? await getPrisma().registroPonto.findUnique({
                where: { id: input.registroId }
              })
            : null
          const registro = existente
            ? await getPrisma().registroPonto.update({
                where: { id: existente.id },
                data: { data, ...payload },
                include: includeFuncionario
              })
            : await getPrisma().registroPonto.create({
                data: {
                  funcionarioId: input.funcionarioId,
                  data,
                  ...payload
                },
                include: includeFuncionario
              })
          return { ok: true, data: mapRegistro(registro) }
        }

        const horarios = {
          horaEntrada: normalizarHorario(input.horaEntrada),
          horaSaidaAlmoco: normalizarHorario(input.horaSaidaAlmoco),
          horaVoltaAlmoco: normalizarHorario(input.horaVoltaAlmoco),
          horaSaida: normalizarHorario(input.horaSaida)
        }

        const payload = {
          tipoDia: 'trabalho' as const,
          ...horarios,
          horasTrabalhadas: horasDe(
            horarios,
            funcionario?.minutosAlmocoPadrao ?? 60,
            input.descontarAlmoco !== false
          ),
          observacao: input.observacao?.trim() || null
        }

        const existente = input.registroId
          ? await getPrisma().registroPonto.findUnique({
              where: { id: input.registroId }
            })
          : null

        const registro = existente
          ? await getPrisma().registroPonto.update({
              where: { id: existente.id },
              data: { data, ...payload },
              include: includeFuncionario
            })
          : await getPrisma().registroPonto.create({
              data: {
                funcionarioId: input.funcionarioId,
                data,
                ...payload
              },
              include: includeFuncionario
            })

        return { ok: true, data: mapRegistro(registro) }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Erro ao salvar'
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
        const atual = await getPrisma().registroPonto.findUnique({
          where: { id },
          include: includeFuncionario
        })
        if (!atual) {
          return { ok: false, error: 'Registro não encontrado', code: 'NOT_FOUND' }
        }

        const tipoDia = input.tipoDia ? asTipoDia(input.tipoDia) : asTipoDia(atual.tipoDia)

        if (tipoDia !== 'trabalho') {
          const atualizado = await getPrisma().registroPonto.update({
            where: { id },
            data: {
              data: input.data?.trim() || atual.data,
              tipoDia,
              horaEntrada: null,
              horaSaidaAlmoco: null,
              horaVoltaAlmoco: null,
              horaSaida: null,
              horasTrabalhadas: 0,
              observacao:
                input.observacao !== undefined
                  ? input.observacao?.trim() || null
                  : atual.observacao
            },
            include: includeFuncionario
          })
          return { ok: true, data: mapRegistro(atualizado) }
        }

        const horarios = {
          horaEntrada:
            input.horaEntrada !== undefined
              ? normalizarHorario(input.horaEntrada)
              : atual.horaEntrada,
          horaSaidaAlmoco:
            input.horaSaidaAlmoco !== undefined
              ? normalizarHorario(input.horaSaidaAlmoco)
              : atual.horaSaidaAlmoco,
          horaVoltaAlmoco:
            input.horaVoltaAlmoco !== undefined
              ? normalizarHorario(input.horaVoltaAlmoco)
              : atual.horaVoltaAlmoco,
          horaSaida:
            input.horaSaida !== undefined
              ? normalizarHorario(input.horaSaida)
              : atual.horaSaida
        }

        const atualizado = await getPrisma().registroPonto.update({
          where: { id },
          data: {
            data: input.data?.trim() || atual.data,
            tipoDia: 'trabalho',
            ...horarios,
            horasTrabalhadas: horasDe(
              horarios,
              atual.funcionario.minutosAlmocoPadrao,
              input.descontarAlmoco !== false
            ),
            observacao:
              input.observacao !== undefined
                ? input.observacao?.trim() || null
                : atual.observacao
          },
          include: includeFuncionario
        })

        return { ok: true, data: mapRegistro(atualizado) }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Erro ao atualizar'
        return { ok: false, error: message }
      }
    }
  )
}
