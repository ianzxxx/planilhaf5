import { useEffect, useMemo, useState } from 'react'
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

interface EditState {
  id: string
  data: string
  horaEntrada: string
  horaSaida: string
  observacao: string
}

export default function PlanilhaPage() {
  const { toast } = useToast()
  const [funcionarios, setFuncionarios] = useState<Funcionario[]>([])
  const [registros, setRegistros] = useState<RegistroPonto[]>([])
  const [funcionarioId, setFuncionarioId] = useState('')
  const [dataInicio, setDataInicio] = useState(inicioDoMesISO())
  const [dataFim, setDataFim] = useState(fimDoMesISO())
  const [edit, setEdit] = useState<EditState | null>(null)
  const [loading, setLoading] = useState(false)
  const [exportando, setExportando] = useState(false)

  useEffect(() => {
    window.api.funcionarios.listar(false).then((result) => {
      if (result.ok && result.data) setFuncionarios(result.data)
    })
  }, [])

  async function carregar() {
    setLoading(true)
    try {
      const result = await window.api.pontos.listar({
        funcionarioId: funcionarioId || null,
        dataInicio: dataInicio || null,
        dataFim: dataFim || null
      })
      if (!result.ok) {
        toast(result.error || 'Erro ao carregar', 'error')
        return
      }
      setRegistros(result.data ?? [])
      setEdit(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    carregar()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const totalHoras = useMemo(
    () => registros.reduce((acc, r) => acc + r.horasTrabalhadas, 0),
    [registros]
  )

  function startEdit(r: RegistroPonto) {
    setEdit({
      id: r.id,
      data: r.data,
      horaEntrada: r.horaEntrada,
      horaSaida: r.horaSaida,
      observacao: r.observacao ?? ''
    })
  }

  async function salvarEdit() {
    if (!edit) return

    const horas = calcularHorasTrabalhadas(edit.horaEntrada, edit.horaSaida)
    if (horas === null) {
      toast('Saída não pode ser anterior à entrada', 'error')
      return
    }

    const result = await window.api.pontos.atualizar(edit.id, {
      data: edit.data,
      horaEntrada: edit.horaEntrada,
      horaSaida: edit.horaSaida,
      observacao: edit.observacao
    })

    if (!result.ok) {
      toast(result.error || 'Erro ao atualizar', 'error')
      return
    }

    toast('Registro atualizado')
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

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-text">Planilha de pontos</h1>
          <p className="text-sm text-muted">
            Filtre, corrija e exporte para Excel quando precisar.
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
                {f.nome}
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
                <th className="px-3 py-3 font-semibold">Data</th>
                <th className="px-3 py-3 font-semibold">Funcionário</th>
                <th className="px-3 py-3 font-semibold">Entrada</th>
                <th className="px-3 py-3 font-semibold">Saída</th>
                <th className="px-3 py-3 font-semibold">Horas</th>
                <th className="px-3 py-3 font-semibold">Observação</th>
                <th className="px-3 py-3 font-semibold">Ações</th>
              </tr>
            </thead>
            <tbody>
              {registros.map((r) => {
                const editing = edit?.id === r.id
                return (
                  <tr key={r.id} className="border-t border-border">
                    <td className="px-3 py-2.5">
                      {editing ? (
                        <input
                          type="date"
                          className="input-field !py-1.5"
                          value={edit.data}
                          onChange={(e) =>
                            setEdit({ ...edit, data: e.target.value })
                          }
                        />
                      ) : (
                        formatarDataBr(r.data)
                      )}
                    </td>
                    <td className="px-3 py-2.5 font-medium">
                      {r.funcionario?.nome ?? '—'}
                    </td>
                    <td className="px-3 py-2.5">
                      {editing ? (
                        <input
                          type="time"
                          className="input-field !py-1.5"
                          value={edit.horaEntrada}
                          onChange={(e) =>
                            setEdit({ ...edit, horaEntrada: e.target.value })
                          }
                        />
                      ) : (
                        r.horaEntrada
                      )}
                    </td>
                    <td className="px-3 py-2.5">
                      {editing ? (
                        <input
                          type="time"
                          className="input-field !py-1.5"
                          value={edit.horaSaida}
                          onChange={(e) =>
                            setEdit({ ...edit, horaSaida: e.target.value })
                          }
                        />
                      ) : (
                        r.horaSaida
                      )}
                    </td>
                    <td className="px-3 py-2.5 font-semibold text-primary">
                      {editing
                        ? (() => {
                            const h = calcularHorasTrabalhadas(
                              edit.horaEntrada,
                              edit.horaSaida
                            )
                            return h === null ? '—' : formatarHoras(h)
                          })()
                        : formatarHorasDisplay(r.horasTrabalhadas)}
                    </td>
                    <td className="px-3 py-2.5">
                      {editing ? (
                        <input
                          className="input-field !py-1.5"
                          value={edit.observacao}
                          onChange={(e) =>
                            setEdit({ ...edit, observacao: e.target.value })
                          }
                        />
                      ) : (
                        <span className="text-muted">{r.observacao || '—'}</span>
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
              {registros.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-3 py-10 text-center text-muted">
                    Nenhum lançamento neste período.
                  </td>
                </tr>
              ) : null}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-border bg-slate-50">
                <td colSpan={4} className="px-3 py-3 text-sm font-semibold">
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
