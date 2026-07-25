import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { Search, Timer } from 'lucide-react'
import type { Funcionario, RegistroPonto } from '@shared/types'
import { calcularHorasTrabalhadas, formatarHoras, hojeISO } from '@shared/hours'
import ConfirmDialog from '../components/ConfirmDialog'
import { useToast } from '../components/Toast'

export default function LancamentoPage() {
  const { toast } = useToast()
  const [funcionarios, setFuncionarios] = useState<Funcionario[]>([])
  const [busca, setBusca] = useState('')
  const [funcionarioId, setFuncionarioId] = useState('')
  const [data, setData] = useState(hojeISO())
  const [horaEntrada, setHoraEntrada] = useState('')
  const [horaSaida, setHoraSaida] = useState('')
  const [observacao, setObservacao] = useState('')
  const [loading, setLoading] = useState(false)
  const [existente, setExistente] = useState<RegistroPonto | null>(null)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const selectRef = useRef<HTMLSelectElement>(null)

  useEffect(() => {
    window.api.funcionarios.listar(true).then((result) => {
      if (result.ok && result.data) setFuncionarios(result.data)
    })
  }, [])

  const filtrados = useMemo(() => {
    const q = busca.trim().toLowerCase()
    if (!q) return funcionarios
    return funcionarios.filter(
      (f) =>
        f.nome.toLowerCase().includes(q) ||
        (f.cargo ?? '').toLowerCase().includes(q)
    )
  }, [funcionarios, busca])

  const funcionario = funcionarios.find((f) => f.id === funcionarioId)

  const horasPreview = useMemo(
    () => calcularHorasTrabalhadas(horaEntrada, horaSaida),
    [horaEntrada, horaSaida]
  )

  useEffect(() => {
    if (!funcionarioId) {
      setHoraEntrada('')
      setHoraSaida('')
      setExistente(null)
      return
    }

    const f = funcionarios.find((item) => item.id === funcionarioId)
    if (f) {
      setHoraEntrada(f.horarioEntradaPadrao ?? '')
      setHoraSaida(f.horarioSaidaPadrao ?? '')
    }

    window.api.pontos.buscarPorDia(funcionarioId, data).then((result) => {
      if (result.ok) {
        setExistente(result.data ?? null)
        if (result.data) {
          setHoraEntrada(result.data.horaEntrada)
          setHoraSaida(result.data.horaSaida)
          setObservacao(result.data.observacao ?? '')
        } else {
          setObservacao('')
        }
      }
    })
  }, [funcionarioId, data, funcionarios])

  function limparAposSalvar() {
    setFuncionarioId('')
    setBusca('')
    setHoraEntrada('')
    setHoraSaida('')
    setObservacao('')
    setExistente(null)
    selectRef.current?.focus()
  }

  async function salvar(sobrescrever = false) {
    if (!funcionarioId) {
      toast('Selecione um funcionário', 'error')
      return
    }

    if (horasPreview === null) {
      toast('Verifique os horários de entrada e saída', 'error')
      return
    }

    setLoading(true)
    try {
      const result = await window.api.pontos.salvar({
        funcionarioId,
        data,
        horaEntrada,
        horaSaida,
        observacao,
        sobrescrever
      })

      if (!result.ok) {
        if (result.code === 'DUPLICATE') {
          setConfirmOpen(true)
          return
        }
        toast(result.error || 'Erro ao salvar', 'error')
        return
      }

      toast(
        sobrescrever
          ? 'Lançamento atualizado com sucesso'
          : `Ponto salvo · ${formatarHoras(result.data!.horasTrabalhadas)}`
      )
      setConfirmOpen(false)
      limparAposSalvar()
    } finally {
      setLoading(false)
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    await salvar(false)
  }

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-5">
        <h1 className="text-2xl font-bold text-text">Lançar ponto</h1>
        <p className="text-sm text-muted">
          Selecione o funcionário, confirme os horários e salve. A data fica
          mantida para o próximo lançamento.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="card-panel space-y-4">
        <div>
          <label htmlFor="busca" className="label">
            Buscar funcionário
          </label>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              id="busca"
              className="input-field pl-10"
              placeholder="Digite o nome..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
            />
          </div>
        </div>

        <div>
          <label htmlFor="funcionario" className="label">
            Funcionário
          </label>
          <select
            id="funcionario"
            ref={selectRef}
            className="input-field"
            required
            value={funcionarioId}
            onChange={(e) => setFuncionarioId(e.target.value)}
          >
            <option value="">Selecione...</option>
            {filtrados.map((f) => (
              <option key={f.id} value={f.id}>
                {f.nome}
                {f.cargo ? ` — ${f.cargo}` : ''}
              </option>
            ))}
          </select>
          {funcionario?.horarioEntradaPadrao ? (
            <p className="mt-1.5 text-xs text-muted">
              Horário padrão: {funcionario.horarioEntradaPadrao} às{' '}
              {funcionario.horarioSaidaPadrao}
            </p>
          ) : null}
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label htmlFor="data" className="label">
              Data
            </label>
            <input
              id="data"
              type="date"
              required
              className="input-field"
              value={data}
              onChange={(e) => setData(e.target.value)}
            />
          </div>
          <div>
            <label htmlFor="entrada" className="label">
              Entrada
            </label>
            <input
              id="entrada"
              type="time"
              required
              className="input-field"
              value={horaEntrada}
              onChange={(e) => setHoraEntrada(e.target.value)}
            />
          </div>
          <div>
            <label htmlFor="saida" className="label">
              Saída
            </label>
            <input
              id="saida"
              type="time"
              required
              className="input-field"
              value={horaSaida}
              onChange={(e) => setHoraSaida(e.target.value)}
            />
          </div>
        </div>

        <div>
          <label htmlFor="observacao" className="label">
            Observação (opcional)
          </label>
          <input
            id="observacao"
            className="input-field"
            placeholder="Ex.: saiu mais cedo, atestado médico"
            value={observacao}
            onChange={(e) => setObservacao(e.target.value)}
          />
        </div>

        <div
          className={`flex items-center justify-between rounded-xl px-4 py-3 ${
            horasPreview === null
              ? 'bg-slate-50 text-muted'
              : 'bg-blue-50 text-primary'
          }`}
        >
          <div className="flex items-center gap-2 text-sm font-medium">
            <Timer className="h-4 w-4" />
            Horas trabalhadas
          </div>
          <div className="text-lg font-bold">
            {horasPreview === null ? '—' : formatarHoras(horasPreview)}
          </div>
        </div>

        {existente ? (
          <p
            role="status"
            className="rounded-lg border border-orange-200 bg-orange-50 px-3 py-2 text-sm text-orange-800"
          >
            Já existe lançamento neste dia. Ao salvar, você poderá sobrescrever.
          </p>
        ) : null}

        <button type="submit" className="btn-cta w-full" disabled={loading}>
          {loading ? 'Salvando...' : 'Salvar lançamento'}
        </button>
      </form>

      <ConfirmDialog
        open={confirmOpen}
        title="Sobrescrever lançamento?"
        description="Já existe um ponto para este funcionário nesta data. Deseja substituir pelos horários atuais?"
        confirmLabel="Sim, sobrescrever"
        loading={loading}
        onCancel={() => setConfirmOpen(false)}
        onConfirm={() => salvar(true)}
      />
    </div>
  )
}
