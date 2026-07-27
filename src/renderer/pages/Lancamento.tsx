import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { useLocation } from 'react-router-dom'
import {
  Coffee,
  FileHeart,
  LogIn,
  LogOut,
  Palmtree,
  Sunrise,
  Sunset,
  UserX
} from 'lucide-react'
import type {
  Funcionario,
  RegistroPonto,
  TipoBatida,
  TipoDia
} from '@shared/types'
import {
  agoraHHMM,
  formatarHoras,
  hojeISO,
  statusDoDia
} from '@shared/hours'
import { labelTipoDia } from '../lib/format'
import ConfirmDialog from '../components/ConfirmDialog'
import FuncionarioPicker from '../components/FuncionarioPicker'
import { useToast } from '../components/Toast'
import { useSyncData } from '../hooks/useSync'
import { notifyPontosChanged } from '../lib/sync'

const BATIDAS: Array<{
  tipo: TipoBatida
  label: string
  descricao: string
  icon: typeof LogIn
  corAtiva: string
}> = [
  {
    tipo: 'entrada',
    label: 'Entrada',
    descricao: 'Início do expediente',
    icon: Sunrise,
    corAtiva: 'bg-primary text-white'
  },
  {
    tipo: 'saidaAlmoco',
    label: 'Saída almoço',
    descricao: 'Início do intervalo',
    icon: Coffee,
    corAtiva: 'bg-amber-500 text-white'
  },
  {
    tipo: 'voltaAlmoco',
    label: 'Volta almoço',
    descricao: 'Retorno ao trabalho',
    icon: LogIn,
    corAtiva: 'bg-sky-600 text-white'
  },
  {
    tipo: 'saida',
    label: 'Saída',
    descricao: 'Fim do expediente',
    icon: Sunset,
    corAtiva: 'bg-cta text-white'
  }
]

const AUSENCIAS: Array<{
  tipo: Exclude<TipoDia, 'trabalho'>
  label: string
  icon: typeof UserX
  cor: string
}> = [
  { tipo: 'falta', label: 'Falta', icon: UserX, cor: 'bg-red-600 text-white' },
  { tipo: 'folga', label: 'Folga', icon: Palmtree, cor: 'bg-emerald-600 text-white' },
  {
    tipo: 'atestado',
    label: 'Atestado',
    icon: FileHeart,
    cor: 'bg-violet-600 text-white'
  }
]

type ModoTela = 'ponto' | 'ausencia'

export default function LancamentoPage() {
  const { toast } = useToast()
  const location = useLocation()
  const [modoTela, setModoTela] = useState<ModoTela>('ponto')
  const [tipo, setTipo] = useState<TipoBatida>('entrada')
  const [tipoAusencia, setTipoAusencia] =
    useState<Exclude<TipoDia, 'trabalho'>>('falta')
  const [funcionarios, setFuncionarios] = useState<Funcionario[]>([])
  const [doDia, setDoDia] = useState<RegistroPonto[]>([])
  const [funcionarioId, setFuncionarioId] = useState('')
  const [data, setData] = useState(hojeISO())
  const [horario, setHorario] = useState(agoraHHMM())
  const [observacao, setObservacao] = useState('')
  const [descontarAlmoco, setDescontarAlmoco] = useState(true)
  const [loading, setLoading] = useState(false)
  const [confirmForcar, setConfirmForcar] = useState(false)
  const [confirmAusencia, setConfirmAusencia] = useState(false)
  const pickerInputRef = useRef<HTMLInputElement>(null)

  const carregarBase = useCallback(async () => {
    const [funcs, pontos] = await Promise.all([
      window.api.funcionarios.listar(true),
      window.api.pontos.listarDoDia(data || hojeISO())
    ])
    if (funcs.ok && funcs.data) setFuncionarios(funcs.data)
    if (pontos.ok && pontos.data) setDoDia(pontos.data)
  }, [data])

  // Recarrega ao abrir a tela, mudar a data, ou voltar de outra aba
  useEffect(() => {
    void carregarBase()
  }, [carregarBase, location.pathname, location.key])

  useSyncData(carregarBase)

  useEffect(() => {
    const onFocus = () => {
      void carregarBase()
    }
    const onVisibility = () => {
      if (document.visibilityState === 'visible') onFocus()
    }
    window.addEventListener('focus', onFocus)
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      window.removeEventListener('focus', onFocus)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [carregarBase])

  useEffect(() => {
    setHorario(agoraHHMM())
    setObservacao('')
    setConfirmForcar(false)
    setConfirmAusencia(false)
  }, [tipo, modoTela, tipoAusencia])

  const funcionario = funcionarios.find((f) => f.id === funcionarioId)

  const registroFuncionario = useMemo(() => {
    if (!funcionarioId) return null
    return (
      doDia.find((r) => r.funcionarioId === funcionarioId && !r.horaSaida) ||
      doDia
        .filter((r) => r.funcionarioId === funcionarioId)
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0] ||
      null
    )
  }, [doDia, funcionarioId])

  const statusAtual = useMemo(() => {
    if (registroFuncionario && registroFuncionario.tipoDia !== 'trabalho') {
      return {
        status: 'encerrado' as const,
        proximaBatida: null,
        label: labelTipoDia(registroFuncionario.tipoDia)
      }
    }
    return statusDoDia({
      horaEntrada: registroFuncionario?.horaEntrada,
      horaSaidaAlmoco: registroFuncionario?.horaSaidaAlmoco,
      horaVoltaAlmoco: registroFuncionario?.horaVoltaAlmoco,
      horaSaida: registroFuncionario?.horaSaida
    })
  }, [registroFuncionario])

  useEffect(() => {
    if (modoTela === 'ponto' && statusAtual.proximaBatida) {
      setTipo(statusAtual.proximaBatida)
    }
  }, [funcionarioId, statusAtual.proximaBatida, modoTela])

  const abertos = useMemo(
    () =>
      doDia.filter(
        (r) => r.tipoDia === 'trabalho' && r.horaEntrada && !r.horaSaida
      ),
    [doDia]
  )

  const ausenciasDoDia = useMemo(
    () => doDia.filter((r) => r.tipoDia !== 'trabalho'),
    [doDia]
  )

  const precisaDescontoAlmoco =
    modoTela === 'ponto' &&
    tipo === 'saida' &&
    Boolean(registroFuncionario?.horaEntrada) &&
    !registroFuncionario?.horaSaidaAlmoco &&
    !registroFuncionario?.horaVoltaAlmoco

  function limparAposSalvar() {
    setFuncionarioId('')
    setObservacao('')
    setHorario(agoraHHMM())
    setDescontarAlmoco(true)
    setTipo('entrada')
    pickerInputRef.current?.focus()
  }

  const onFuncionarioChange = useCallback((id: string) => {
    setFuncionarioId(id)
  }, [])

  async function marcar(forcar = false) {
    if (!funcionarioId) {
      toast('Selecione um funcionário', 'error')
      return
    }

    setLoading(true)
    try {
      const result = await window.api.pontos.marcarBatida({
        funcionarioId,
        tipo,
        data: data || hojeISO(),
        horario: horario || null,
        observacao,
        descontarAlmoco: precisaDescontoAlmoco ? descontarAlmoco : true,
        forcar
      })

      if (!result.ok) {
        if (
          result.code === 'SEM_ENTRADA' ||
          result.code === 'BATIDA_INVALIDA' ||
          result.code === 'DUPLICATE'
        ) {
          setConfirmForcar(true)
          return
        }
        toast(result.error || 'Erro ao registrar', 'error')
        return
      }

      const batida = BATIDAS.find((b) => b.tipo === tipo)?.label ?? 'Batida'
      const horas = result.data?.horasTrabalhadas
      toast(
        horas != null
          ? `${batida} ok · ${formatarHoras(horas)} trabalhadas`
          : `${batida} registrada às ${horario || agoraHHMM()}`
      )
      setConfirmForcar(false)
      limparAposSalvar()
      notifyPontosChanged()
      await carregarBase()
    } finally {
      setLoading(false)
    }
  }

  async function registrarAusencia(sobrescrever = false) {
    if (!funcionarioId) {
      toast('Selecione um funcionário', 'error')
      return
    }

    setLoading(true)
    try {
      const result = await window.api.pontos.registrarAusencia({
        funcionarioId,
        data: data || hojeISO(),
        tipoDia: tipoAusencia,
        observacao,
        sobrescrever
      })

      if (!result.ok) {
        if (result.code === 'DUPLICATE') {
          setConfirmAusencia(true)
          return
        }
        toast(result.error || 'Erro ao registrar ausência', 'error')
        return
      }

      toast(`${labelTipoDia(tipoAusencia)} registrada (0h)`)
      setConfirmAusencia(false)
      limparAposSalvar()
      notifyPontosChanged()
      await carregarBase()
    } finally {
      setLoading(false)
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (modoTela === 'ausencia') await registrarAusencia(false)
    else await marcar(false)
  }

  function selecionarRegistro(r: RegistroPonto) {
    setFuncionarioId(r.funcionarioId)
    if (r.tipoDia !== 'trabalho') {
      setModoTela('ausencia')
      setTipoAusencia(r.tipoDia)
      return
    }
    setModoTela('ponto')
    const st = statusDoDia(r)
    if (st.proximaBatida) setTipo(st.proximaBatida)
    setHorario(agoraHHMM())
  }

  const batidaAtiva = BATIDAS.find((b) => b.tipo === tipo)!

  return (
    <div className="mx-auto grid max-w-5xl gap-6 lg:grid-cols-[1fr_20rem]">
      <div>
        <div className="mb-5">
          <h1 className="text-2xl font-bold text-text">Ponto do dia</h1>
          <p className="text-sm text-muted">
            Registre batidas de trabalho ou marque falta, folga e atestado
            (contam 0 horas).
          </p>
        </div>

        <div className="mb-4 grid grid-cols-2 gap-1 rounded-xl border border-border bg-slate-50 p-1">
          <button
            type="button"
            className={`inline-flex min-h-11 cursor-pointer items-center justify-center rounded-lg text-sm font-semibold transition-colors duration-200 ${
              modoTela === 'ponto'
                ? 'bg-primary text-white'
                : 'text-muted hover:bg-white hover:text-text'
            }`}
            onClick={() => setModoTela('ponto')}
          >
            Batidas
          </button>
          <button
            type="button"
            className={`inline-flex min-h-11 cursor-pointer items-center justify-center rounded-lg text-sm font-semibold transition-colors duration-200 ${
              modoTela === 'ausencia'
                ? 'bg-slate-800 text-white'
                : 'text-muted hover:bg-white hover:text-text'
            }`}
            onClick={() => setModoTela('ausencia')}
          >
            Falta / Folga / Atestado
          </button>
        </div>

        {modoTela === 'ponto' ? (
          <div
            className="mb-4 grid grid-cols-2 gap-1 rounded-xl border border-border bg-slate-50 p-1 sm:grid-cols-4"
            role="tablist"
            aria-label="Tipo de batida"
          >
            {BATIDAS.map((b) => {
              const Icon = b.icon
              const ativa = tipo === b.tipo
              return (
                <button
                  key={b.tipo}
                  type="button"
                  role="tab"
                  aria-selected={ativa}
                  className={`inline-flex min-h-11 cursor-pointer flex-col items-center justify-center gap-0.5 rounded-lg px-2 py-2 text-center transition-colors duration-200 ${
                    ativa
                      ? b.corAtiva
                      : 'text-muted hover:bg-white hover:text-text'
                  }`}
                  onClick={() => setTipo(b.tipo)}
                >
                  <span className="inline-flex items-center gap-1 text-xs font-semibold sm:text-sm">
                    <Icon className="h-3.5 w-3.5" />
                    {b.label}
                  </span>
                </button>
              )
            })}
          </div>
        ) : (
          <div className="mb-4 grid grid-cols-3 gap-1 rounded-xl border border-border bg-slate-50 p-1">
            {AUSENCIAS.map((a) => {
              const Icon = a.icon
              const ativa = tipoAusencia === a.tipo
              return (
                <button
                  key={a.tipo}
                  type="button"
                  className={`inline-flex min-h-11 cursor-pointer items-center justify-center gap-1 rounded-lg px-2 text-xs font-semibold transition-colors duration-200 sm:text-sm ${
                    ativa ? a.cor : 'text-muted hover:bg-white hover:text-text'
                  }`}
                  onClick={() => setTipoAusencia(a.tipo)}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {a.label}
                </button>
              )
            })}
          </div>
        )}

        <form onSubmit={handleSubmit} className="card-panel space-y-4">
          <p className="text-sm text-muted">
            {modoTela === 'ponto'
              ? batidaAtiva.descricao
              : `${labelTipoDia(tipoAusencia)} — não gera horas trabalhadas.`}
          </p>

          <div>
            <label htmlFor="data" className="label">
              Data
            </label>
            <input
              id="data"
              type="date"
              className="input-field"
              value={data}
              onChange={(e) => setData(e.target.value)}
            />
          </div>

          <FuncionarioPicker
            funcionarios={funcionarios}
            value={funcionarioId}
            onChange={onFuncionarioChange}
            inputRef={pickerInputRef}
          />

          {funcionarioId ? (
            <p className="-mt-2 text-xs text-muted">
              Status:{' '}
              <span className="font-semibold text-text">{statusAtual.label}</span>
            </p>
          ) : null}

          {modoTela === 'ponto' ? (
            <div>
              <label htmlFor="horario" className="label">
                Horário (opcional)
              </label>
              <input
                id="horario"
                type="time"
                className="input-field"
                value={horario}
                onChange={(e) => setHorario(e.target.value)}
              />
            </div>
          ) : null}

          {precisaDescontoAlmoco ? (
            <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-3 text-sm text-amber-950">
              <input
                type="checkbox"
                className="mt-0.5 h-4 w-4 cursor-pointer accent-amber-600"
                checked={descontarAlmoco}
                onChange={(e) => setDescontarAlmoco(e.target.checked)}
              />
              <span>
                Descontar intervalo de almoço (
                {funcionario?.minutosAlmocoPadrao ?? 60} min)
              </span>
            </label>
          ) : null}

          <div>
            <label htmlFor="observacao" className="label">
              Observação (opcional)
            </label>
            <input
              id="observacao"
              className="input-field"
              placeholder={
                modoTela === 'ausencia'
                  ? 'Ex.: atestado médico, folga combinada...'
                  : 'Ex.: saiu mais cedo...'
              }
              value={observacao}
              onChange={(e) => setObservacao(e.target.value)}
            />
          </div>

          {modoTela === 'ponto' &&
          registroFuncionario?.tipoDia === 'trabalho' ? (
            <div className="grid grid-cols-2 gap-2 rounded-xl bg-slate-50 px-3 py-3 text-xs sm:grid-cols-4">
              <div>
                <p className="text-muted">Entrada</p>
                <p className="font-semibold">
                  {registroFuncionario.horaEntrada || '—'}
                </p>
              </div>
              <div>
                <p className="text-muted">Saiu almoço</p>
                <p className="font-semibold">
                  {registroFuncionario.horaSaidaAlmoco || '—'}
                </p>
              </div>
              <div>
                <p className="text-muted">Voltou</p>
                <p className="font-semibold">
                  {registroFuncionario.horaVoltaAlmoco || '—'}
                </p>
              </div>
              <div>
                <p className="text-muted">Saída</p>
                <p className="font-semibold">
                  {registroFuncionario.horaSaida || '—'}
                </p>
              </div>
            </div>
          ) : null}

          <button
            type="submit"
            className={`w-full ${
              modoTela === 'ausencia'
                ? 'btn-secondary !bg-slate-800 !text-white hover:!bg-slate-700'
                : tipo === 'saida'
                  ? 'btn-cta'
                  : 'btn-primary'
            }`}
            disabled={loading}
          >
            {loading
              ? 'Salvando...'
              : modoTela === 'ausencia'
                ? `Registrar ${labelTipoDia(tipoAusencia).toLowerCase()}`
                : `Registrar ${batidaAtiva.label.toLowerCase()}`}
          </button>
        </form>
      </div>

      <aside className="space-y-4">
        <section className="card-panel">
          <h2 className="text-sm font-semibold text-text">Em andamento</h2>
          <ul className="mt-3 space-y-2">
            {abertos.map((r) => {
              const st = statusDoDia(r)
              return (
                <li key={r.id}>
                  <button
                    type="button"
                    className="flex w-full cursor-pointer flex-col gap-1 rounded-lg border border-border bg-white px-3 py-2 text-left transition-colors duration-200 hover:bg-slate-50"
                    onClick={() => selecionarRegistro(r)}
                  >
                    <span className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium text-text">
                        {r.funcionario?.nome || 'Sem nome'}
                      </span>
                      <LogOut className="h-3.5 w-3.5 text-muted" />
                    </span>
                    <span className="text-xs text-muted">
                      {st.label}
                      {r.horaEntrada ? ` · entrou ${r.horaEntrada}` : ''}
                    </span>
                  </button>
                </li>
              )
            })}
            {abertos.length === 0 ? (
              <li className="py-3 text-center text-sm text-muted">
                Ninguém em expediente aberto.
              </li>
            ) : null}
          </ul>
        </section>

        <section className="card-panel">
          <h2 className="text-sm font-semibold text-text">Ausências do dia</h2>
          <ul className="mt-3 space-y-2">
            {ausenciasDoDia.map((r) => (
              <li
                key={r.id}
                className="rounded-lg border border-border px-3 py-2 text-sm"
              >
                <p className="font-medium">{r.funcionario?.nome || 'Sem nome'}</p>
                <p className="text-xs text-muted">
                  {labelTipoDia(r.tipoDia)}
                  {r.observacao ? ` · ${r.observacao}` : ''}
                </p>
              </li>
            ))}
            {ausenciasDoDia.length === 0 ? (
              <li className="py-3 text-center text-sm text-muted">
                Nenhuma ausência hoje.
              </li>
            ) : null}
          </ul>
        </section>
      </aside>

      <ConfirmDialog
        open={confirmForcar}
        title="Confirmar registro"
        description="Há conflito com o lançamento atual (ordem de batida ou ausência no dia). Deseja registrar mesmo assim?"
        confirmLabel="Registrar assim mesmo"
        loading={loading}
        onCancel={() => setConfirmForcar(false)}
        onConfirm={() => marcar(true)}
      />

      <ConfirmDialog
        open={confirmAusencia}
        title="Substituir lançamento do dia?"
        description="Já existe ponto ou ausência neste dia. Deseja apagar o existente e registrar esta ausência?"
        confirmLabel="Sim, substituir"
        loading={loading}
        onCancel={() => setConfirmAusencia(false)}
        onConfirm={() => registrarAusencia(true)}
      />
    </div>
  )
}
