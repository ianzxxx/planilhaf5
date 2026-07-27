import { useCallback, useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { Download } from 'lucide-react'
import type { Funcionario, RelatorioMensal } from '@shared/types'
import { formatarHoras } from '@shared/hours'
import {
  formatarDataBr,
  formatarHorasDisplay,
  mesAtual
} from '../lib/format'
import { useToast } from '../components/Toast'
import { useSyncData } from '../hooks/useSync'

const MESES = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro'
]

export default function RelatorioPage() {
  const { toast } = useToast()
  const location = useLocation()
  const atual = mesAtual()
  const [ano, setAno] = useState(atual.ano)
  const [mes, setMes] = useState(atual.mes)
  const [funcionarioId, setFuncionarioId] = useState('')
  const [funcionarios, setFuncionarios] = useState<Funcionario[]>([])
  const [relatorio, setRelatorio] = useState<RelatorioMensal | null>(null)
  const [loading, setLoading] = useState(false)
  const [exportando, setExportando] = useState(false)

  const carregarFuncionarios = useCallback(async () => {
    const result = await window.api.funcionarios.listar(false)
    if (result.ok && result.data) setFuncionarios(result.data)
  }, [])

  const carregar = useCallback(async () => {
    setLoading(true)
    try {
      const [funcs, result] = await Promise.all([
        window.api.funcionarios.listar(false),
        window.api.pontos.relatorioMensal({
          ano,
          mes,
          funcionarioId: funcionarioId || null
        })
      ])
      if (funcs.ok && funcs.data) setFuncionarios(funcs.data)
      if (!result.ok || !result.data) {
        toast(result.error || 'Erro ao gerar relatório', 'error')
        return
      }
      setRelatorio(result.data)
    } finally {
      setLoading(false)
    }
  }, [ano, mes, funcionarioId, toast])

  useEffect(() => {
    void carregarFuncionarios()
  }, [carregarFuncionarios, location.pathname, location.key])

  useEffect(() => {
    void carregar()
  }, [carregar, location.pathname, location.key])

  useSyncData(carregar)

  async function exportar() {
    if (!relatorio) return
    setExportando(true)
    try {
      const result = await window.api.exportar.relatorioMensal(relatorio)
      if (!result.ok) {
        toast(result.error || 'Erro ao exportar', 'error')
        return
      }
      if (result.data?.canceled) return
      toast('Relatório exportado')
    } finally {
      setExportando(false)
    }
  }

  const anos = [atual.ano - 1, atual.ano, atual.ano + 1]

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-text">Relatório mensal</h1>
          <p className="text-sm text-muted">
            Totais por pessoa: horas, dias trabalhados, faltas, folgas e
            atestados.
          </p>
        </div>
        <button
          type="button"
          className="btn-cta"
          onClick={exportar}
          disabled={!relatorio || exportando}
        >
          <Download className="h-4 w-4" />
          {exportando ? 'Exportando...' : 'Exportar Excel'}
        </button>
      </div>

      <div className="card-panel grid gap-3 md:grid-cols-4">
        <div>
          <label htmlFor="mes" className="label">
            Mês
          </label>
          <select
            id="mes"
            className="input-field"
            value={mes}
            onChange={(e) => setMes(Number(e.target.value))}
          >
            {MESES.map((nome, idx) => (
              <option key={nome} value={idx + 1}>
                {nome}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="ano" className="label">
            Ano
          </label>
          <select
            id="ano"
            className="input-field"
            value={ano}
            onChange={(e) => setAno(Number(e.target.value))}
          >
            {anos.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="func" className="label">
            Funcionário
          </label>
          <select
            id="func"
            className="input-field"
            value={funcionarioId}
            onChange={(e) => setFuncionarioId(e.target.value)}
          >
            <option value="">Todos (ativos)</option>
            {funcionarios.map((f) => (
              <option key={f.id} value={f.id}>
                {f.nome || 'Sem nome'}
                {f.ativo ? '' : ' (inativo)'}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-end">
          <button
            type="button"
            className="btn-primary w-full"
            onClick={carregar}
            disabled={loading}
          >
            {loading ? 'Gerando...' : 'Gerar relatório'}
          </button>
        </div>
      </div>

      {relatorio ? (
        <>
          <p className="text-sm text-muted">
            Período: {formatarDataBr(relatorio.periodoInicio)} a{' '}
            {formatarDataBr(relatorio.periodoFim)}
          </p>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {[
              ['Horas no mês', formatarHorasDisplay(relatorio.totais.totalHoras)],
              ['Dias trabalhados', String(relatorio.totais.diasTrabalhados)],
              ['Faltas', String(relatorio.totais.faltas)],
              ['Folgas', String(relatorio.totais.folgas)],
              ['Atestados', String(relatorio.totais.atestados)]
            ].map(([label, value]) => (
              <div key={label} className="card-panel !p-4">
                <p className="text-xs font-medium uppercase tracking-wide text-muted">
                  {label}
                </p>
                <p className="mt-1 text-xl font-bold text-text">{value}</p>
              </div>
            ))}
          </div>

          <div className="card-panel overflow-hidden p-0">
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-slate-50 text-muted">
                  <tr>
                    <th className="px-3 py-3 font-semibold">Funcionário</th>
                    <th className="px-3 py-3 font-semibold">Cargo</th>
                    <th className="px-3 py-3 font-semibold">Dias trab.</th>
                    <th className="px-3 py-3 font-semibold">Faltas</th>
                    <th className="px-3 py-3 font-semibold">Folgas</th>
                    <th className="px-3 py-3 font-semibold">Atestados</th>
                    <th className="px-3 py-3 font-semibold">Total horas</th>
                    <th className="px-3 py-3 font-semibold">Média/dia</th>
                  </tr>
                </thead>
                <tbody>
                  {relatorio.linhas.map((l) => (
                    <tr key={l.funcionarioId} className="border-t border-border">
                      <td className="px-3 py-2.5 font-medium">{l.nome}</td>
                      <td className="px-3 py-2.5 text-muted">{l.cargo || '—'}</td>
                      <td className="px-3 py-2.5">{l.diasTrabalhados}</td>
                      <td className="px-3 py-2.5">{l.faltas}</td>
                      <td className="px-3 py-2.5">{l.folgas}</td>
                      <td className="px-3 py-2.5">{l.atestados}</td>
                      <td className="px-3 py-2.5 font-semibold text-primary">
                        {formatarHoras(l.totalHoras)}
                      </td>
                      <td className="px-3 py-2.5 text-muted">
                        {l.mediaHorasPorDiaTrabalhado == null
                          ? '—'
                          : formatarHoras(l.mediaHorasPorDiaTrabalhado)}
                      </td>
                    </tr>
                  ))}
                  {relatorio.linhas.length === 0 ? (
                    <tr>
                      <td
                        colSpan={8}
                        className="px-3 py-10 text-center text-muted"
                      >
                        Nenhum funcionário neste filtro.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : null}
    </div>
  )
}
