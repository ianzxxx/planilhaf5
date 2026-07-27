import { Fragment, useCallback, useEffect, useMemo, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { Download, Save, X } from 'lucide-react'
import type { Funcionario, RegistroPonto } from '@shared/types'
import { calcularHorasTrabalhadas, formatarHoras } from '@shared/hours'
import {
  fimDoMesISO,
  formatarDataBr,
  formatarHorasDisplay,
  inicioDoMesISO
} from '../lib/format'
import { useToast } from '../components/Toast'
import { useSyncData } from '../hooks/useSync'
import { notifyPontosChanged } from '../lib/sync'

interface EditState {
  id: string
  data: string
  horaEntrada: string
  horaSaidaAlmoco: string
  horaVoltaAlmoco: string
  horaSaida: string
  observacao: string
  minutosAlmocoPadrao: number
}

export default function PlanilhaPage() {
  const { toast } = useToast()
  const location = useLocation()
  const [funcionarios, setFuncionarios] = useState<Funcionario[]>([])
  const [registros, setRegistros] = useState<RegistroPonto[]>([])
  const [funcionarioId, setFuncionarioId] = useState('')
  const [dataInicio, setDataInicio] = useState(inicioDoMesISO())
  const [dataFim, setDataFim] = useState(fimDoMesISO())
  const [edit, setEdit] = useState<EditState | null>(null)
  const [loading, setLoading] = useState(false)
  const [exportando, setExportando] = useState(false)

  const carregarFuncionarios = useCallback(async () => {
    const result = await window.api.funcionarios.listar(false)
    if (result.ok && result.data) setFuncionarios(result.data)
  }, [])

  const carregar = useCallback(async () => {
    setLoading(true)
    try {
      const [funcs, pontos] = await Promise.all([
        window.api.funcionarios.listar(false),
        window.api.pontos.listar({
          funcionarioId: funcionarioId || null,
          dataInicio: dataInicio || null,
          dataFim: dataFim || null
        })
      ])
      if (funcs.ok && funcs.data) setFuncionarios(funcs.data)
      if (!pontos.ok) {
        toast(pontos.error || 'Erro ao carregar', 'error')
        return
      }
      setRegistros(pontos.data ?? [])
      setEdit(null)
    } finally {
      setLoading(false)
    }
  }, [funcionarioId, dataInicio, dataFim, toast])

  useEffect(() => {
    void carregarFuncionarios()
  }, [carregarFuncionarios, location.pathname, location.key])

  useEffect(() => {
    void carregar()
  }, [carregar, location.pathname, location.key])

  useSyncData(carregar)

  const totalHoras = useMemo(
    () => registros.reduce((acc, r) => acc + (r.horasTrabalhadas ?? 0), 0),
    [registros]
  )

  const porData = useMemo(() => {
    const mapa = new Map<string, RegistroPonto[]>()
    for (const r of registros) {
      const lista = mapa.get(r.data) ?? []
      lista.push(r)
      mapa.set(r.data, lista)
    }
    return Array.from(mapa.entries()).sort(([a], [b]) => a.localeCompare(b))
  }, [registros])

  function startEdit(r: RegistroPonto) {
    setEdit({
      id: r.id,
      data: r.data,
      horaEntrada: r.horaEntrada ?? '',
      horaSaidaAlmoco: r.horaSaidaAlmoco ?? '',
      horaVoltaAlmoco: r.horaVoltaAlmoco ?? '',
      horaSaida: r.horaSaida ?? '',
      observacao: r.observacao ?? '',
      minutosAlmocoPadrao: r.funcionario?.minutosAlmocoPadrao ?? 60
    })
  }

  async function salvarEdit() {
    if (!edit) return

    const result = await window.api.pontos.atualizar(edit.id, {
      data: edit.data || null,
      horaEntrada: edit.horaEntrada || null,
      horaSaidaAlmoco: edit.horaSaidaAlmoco || null,
      horaVoltaAlmoco: edit.horaVoltaAlmoco || null,
      horaSaida: edit.horaSaida || null,
      observacao: edit.observacao
    })

    if (!result.ok) {
      toast(result.error || 'Erro ao atualizar', 'error')
      return
    }

    toast('Registro atualizado')
    notifyPontosChanged()
    await carregar()
  }

  async function exportar() {
    if (registros.length === 0) {
      toast('Nada para exportar com os filtros atuais', 'info')
      return
    }

    setExportando(true)
    try {
      const result = await window.api.exportar.xlsx(registros)
      if (!result.ok) {
        toast(result.error || 'Erro ao exportar', 'error')
        return
      }
      if (result.data?.canceled) return
      toast('Planilha exportada com sucesso')
    } finally {
      setExportando(false)
    }
  }

  function previewHoras(e: EditState): string {
    const h = calcularHorasTrabalhadas(
      {
        horaEntrada: e.horaEntrada,
        horaSaidaAlmoco: e.horaSaidaAlmoco,
        horaVoltaAlmoco: e.horaVoltaAlmoco,
        horaSaida: e.horaSaida
      },
      e.horaSaidaAlmoco || e.horaVoltaAlmoco ? 0 : e.minutosAlmocoPadrao
    )
    return h == null ? '—' : formatarHoras(h)
  }

  const colunas = 8

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-text">Planilha de pontos</h1>
          <p className="text-sm text-muted">
            Conferência do dia. Horas = só tempo trabalhado (sem almoço).
          </p>
        </div>
        <button
          type="button"
          className="btn-cta"
          onClick={exportar}
          disabled={exportando}
        >
          <Download className="h-4 w-4" />
          {exportando ? 'Exportando...' : 'Exportar Excel'}
        </button>
      </div>

      <div className="card-panel grid gap-3 md:grid-cols-4">
        <div>
          <label htmlFor="filtroFunc" className="label">
            Funcionário
          </label>
          <select
            id="filtroFunc"
            className="input-field"
            value={funcionarioId}
            onChange={(e) => setFuncionarioId(e.target.value)}
          >
            <option value="">Todos</option>
            {funcionarios.map((f) => (
              <option key={f.id} value={f.id}>
                {f.nome || 'Sem nome'}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="inicio" className="label">
            De
          </label>
          <input
            id="inicio"
            type="date"
            className="input-field"
            value={dataInicio}
            onChange={(e) => setDataInicio(e.target.value)}
          />
        </div>
        <div>
          <label htmlFor="fim" className="label">
            Até
          </label>
          <input
            id="fim"
            type="date"
            className="input-field"
            value={dataFim}
            onChange={(e) => setDataFim(e.target.value)}
          />
        </div>
        <div className="flex items-end">
          <button
            type="button"
            className="btn-primary w-full"
            onClick={carregar}
            disabled={loading}
          >
            {loading ? 'Filtrando...' : 'Aplicar filtros'}
          </button>
        </div>
      </div>

      <div className="card-panel overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-muted">
              <tr>
                <th className="px-3 py-3 font-semibold">Funcionário</th>
                <th className="px-3 py-3 font-semibold">Entrada</th>
                <th className="px-3 py-3 font-semibold">Saiu almoço</th>
                <th className="px-3 py-3 font-semibold">Voltou</th>
                <th className="px-3 py-3 font-semibold">Saída</th>
                <th className="px-3 py-3 font-semibold">Horas</th>
                <th className="px-3 py-3 font-semibold">Obs.</th>
                <th className="px-3 py-3 font-semibold">Ações</th>
              </tr>
            </thead>
            <tbody>
              {porData.map(([data, lista]) => {
                const editNesteDia =
                  edit && lista.some((r) => r.id === edit.id) ? edit : null
                return (
                  <Fragment key={data}>
                    <tr className="border-t border-border bg-slate-100/80">
                      <td
                        colSpan={colunas}
                        className="px-3 py-2.5 text-sm font-bold tracking-wide text-text"
                      >
                        {editNesteDia ? (
                          <div className="flex flex-wrap items-center gap-3">
                            <span>Data</span>
                            <input
                              type="date"
                              className="input-field !w-auto !py-1.5"
                              value={editNesteDia.data}
                              onChange={(e) =>
                                setEdit({
                                  ...editNesteDia,
                                  data: e.target.value
                                })
                              }
                            />
                          </div>
                        ) : (
                          formatarDataBr(data)
                        )}
                      </td>
                    </tr>
                    {lista.map((r) => {
                      const editing = edit?.id === r.id
                      return (
                        <tr key={r.id} className="border-t border-border">
                          <td className="px-3 py-2.5 font-medium">
                            {r.funcionario?.nome || '—'}
                          </td>
                          {(
                            [
                              'horaEntrada',
                              'horaSaidaAlmoco',
                              'horaVoltaAlmoco',
                              'horaSaida'
                            ] as const
                          ).map((key) => (
                            <td key={key} className="px-3 py-2.5">
                              {editing ? (
                                <input
                                  type="time"
                                  className="input-field !py-1.5"
                                  value={edit[key]}
                                  onChange={(e) =>
                                    setEdit({ ...edit, [key]: e.target.value })
                                  }
                                />
                              ) : r.tipoDia === 'trabalho' ? (
                                r[key] || '—'
                              ) : (
                                '—'
                              )}
                            </td>
                          ))}
                          <td className="px-3 py-2.5 font-semibold text-primary">
                            {editing
                              ? previewHoras(edit)
                              : r.horasTrabalhadas == null
                                ? '—'
                                : formatarHorasDisplay(r.horasTrabalhadas)}
                          </td>
                          <td className="px-3 py-2.5">
                            {editing ? (
                              <input
                                className="input-field !py-1.5"
                                value={edit.observacao}
                                onChange={(e) =>
                                  setEdit({
                                    ...edit,
                                    observacao: e.target.value
                                  })
                                }
                              />
                            ) : (
                              <span className="text-muted">
                                {r.observacao || '—'}
                              </span>
                            )}
                          </td>
                          <td className="px-3 py-2.5">
                            {editing ? (
                              <div className="flex gap-1">
                                <button
                                  type="button"
                                  className="btn-primary !min-h-10 !px-2.5"
                                  aria-label="Salvar edição"
                                  onClick={salvarEdit}
                                >
                                  <Save className="h-4 w-4" />
                                </button>
                                <button
                                  type="button"
                                  className="btn-secondary !min-h-10 !px-2.5"
                                  aria-label="Cancelar edição"
                                  onClick={() => setEdit(null)}
                                >
                                  <X className="h-4 w-4" />
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                className="btn-secondary !min-h-10 !text-xs"
                                onClick={() => startEdit(r)}
                              >
                                Editar
                              </button>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </Fragment>
                )
              })}
              {registros.length === 0 ? (
                <tr>
                  <td
                    colSpan={colunas}
                    className="px-3 py-10 text-center text-muted"
                  >
                    Nenhum lançamento neste período.
                  </td>
                </tr>
              ) : null}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-border bg-slate-50">
                <td colSpan={5} className="px-3 py-3 text-sm font-semibold">
                  Total{funcionarioId ? ' do funcionário' : ''}
                </td>
                <td className="px-3 py-3 text-base font-bold text-primary">
                  {formatarHorasDisplay(totalHoras)}
                </td>
                <td colSpan={2} />
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  )
}
