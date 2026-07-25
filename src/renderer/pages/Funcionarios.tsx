import { useEffect, useState, type FormEvent } from 'react'
import { Pencil, UserMinus, UserPlus, UserCheck } from 'lucide-react'
import type { Funcionario, FuncionarioInput } from '@shared/types'
import { useToast } from '../components/Toast'

const emptyForm: FuncionarioInput = {
  nome: '',
  cargo: '',
  horarioEntradaPadrao: '',
  horarioSaidaPadrao: ''
}

export default function FuncionariosPage() {
  const { toast } = useToast()
  const [lista, setLista] = useState<Funcionario[]>([])
  const [form, setForm] = useState<FuncionarioInput>(emptyForm)
  const [editandoId, setEditandoId] = useState<string | null>(null)
  const [mostrarInativos, setMostrarInativos] = useState(false)
  const [loading, setLoading] = useState(false)

  async function carregar() {
    const result = await window.api.funcionarios.listar(false)
    if (result.ok && result.data) setLista(result.data)
  }

  useEffect(() => {
    carregar()
  }, [])

  const visiveis = lista.filter((f) => (mostrarInativos ? true : f.ativo))

  function startEdit(f: Funcionario) {
    setEditandoId(f.id)
    setForm({
      nome: f.nome,
      cargo: f.cargo ?? '',
      horarioEntradaPadrao: f.horarioEntradaPadrao ?? '',
      horarioSaidaPadrao: f.horarioSaidaPadrao ?? ''
    })
  }

  function cancelEdit() {
    setEditandoId(null)
    setForm(emptyForm)
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      const payload: FuncionarioInput = {
        nome: form.nome.trim(),
        cargo: form.cargo || null,
        horarioEntradaPadrao: form.horarioEntradaPadrao || null,
        horarioSaidaPadrao: form.horarioSaidaPadrao || null
      }

      const result = editandoId
        ? await window.api.funcionarios.atualizar(editandoId, payload)
        : await window.api.funcionarios.criar(payload)

      if (!result.ok) {
        toast(result.error || 'Erro ao salvar', 'error')
        return
      }

      toast(editandoId ? 'Funcionário atualizado' : 'Funcionário cadastrado')
      cancelEdit()
      await carregar()
    } finally {
      setLoading(false)
    }
  }

  async function toggleAtivo(f: Funcionario) {
    const result = f.ativo
      ? await window.api.funcionarios.inativar(f.id)
      : await window.api.funcionarios.reativar(f.id)

    if (!result.ok) {
      toast(result.error || 'Erro ao alterar status', 'error')
      return
    }

    toast(f.ativo ? 'Funcionário inativado' : 'Funcionário reativado')
    await carregar()
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text">Funcionários</h1>
        <p className="text-sm text-muted">
          Cadastre nomes e horários padrão para agilizar o lançamento diário.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="card-panel grid gap-4 md:grid-cols-2">
        <div className="md:col-span-2">
          <h2 className="text-base font-semibold text-text">
            {editandoId ? 'Editar funcionário' : 'Novo funcionário'}
          </h2>
        </div>

        <div className="md:col-span-2">
          <label htmlFor="nome" className="label">
            Nome completo
          </label>
          <input
            id="nome"
            required
            className="input-field"
            value={form.nome ?? ''}
            onChange={(e) => setForm((p) => ({ ...p, nome: e.target.value }))}
          />
        </div>

        <div>
          <label htmlFor="cargo" className="label">
            Cargo (opcional)
          </label>
          <input
            id="cargo"
            className="input-field"
            value={form.cargo ?? ''}
            onChange={(e) => setForm((p) => ({ ...p, cargo: e.target.value }))}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="entradaPadrao" className="label">
              Entrada padrão
            </label>
            <input
              id="entradaPadrao"
              type="time"
              className="input-field"
              value={form.horarioEntradaPadrao ?? ''}
              onChange={(e) =>
                setForm((p) => ({ ...p, horarioEntradaPadrao: e.target.value }))
              }
            />
          </div>
          <div>
            <label htmlFor="saidaPadrao" className="label">
              Saída padrão
            </label>
            <input
              id="saidaPadrao"
              type="time"
              className="input-field"
              value={form.horarioSaidaPadrao ?? ''}
              onChange={(e) =>
                setForm((p) => ({ ...p, horarioSaidaPadrao: e.target.value }))
              }
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-2 md:col-span-2">
          <button type="submit" className="btn-primary" disabled={loading}>
            <UserPlus className="h-4 w-4" />
            {loading ? 'Salvando...' : editandoId ? 'Salvar alterações' : 'Cadastrar'}
          </button>
          {editandoId ? (
            <button type="button" className="btn-secondary" onClick={cancelEdit}>
              Cancelar
            </button>
          ) : null}
        </div>
      </form>

      <div className="card-panel">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-base font-semibold text-text">Lista</h2>
          <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-muted">
            <input
              type="checkbox"
              className="h-4 w-4 cursor-pointer accent-primary"
              checked={mostrarInativos}
              onChange={(e) => setMostrarInativos(e.target.checked)}
            />
            Mostrar inativos
          </label>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="border-b border-border text-muted">
                <th className="px-2 py-2 font-medium">Nome</th>
                <th className="px-2 py-2 font-medium">Cargo</th>
                <th className="px-2 py-2 font-medium">Horário</th>
                <th className="px-2 py-2 font-medium">Status</th>
                <th className="px-2 py-2 font-medium">Ações</th>
              </tr>
            </thead>
            <tbody>
              {visiveis.map((f) => (
                <tr key={f.id} className="border-b border-border/70">
                  <td className="px-2 py-3 font-medium text-text">{f.nome}</td>
                  <td className="px-2 py-3 text-muted">{f.cargo || '—'}</td>
                  <td className="px-2 py-3 text-muted">
                    {f.horarioEntradaPadrao && f.horarioSaidaPadrao
                      ? `${f.horarioEntradaPadrao} – ${f.horarioSaidaPadrao}`
                      : '—'}
                  </td>
                  <td className="px-2 py-3">
                    <span
                      className={`inline-flex rounded-md px-2 py-1 text-xs font-semibold ${
                        f.ativo
                          ? 'bg-green-50 text-success'
                          : 'bg-slate-100 text-muted'
                      }`}
                    >
                      {f.ativo ? 'Ativo' : 'Inativo'}
                    </span>
                  </td>
                  <td className="px-2 py-3">
                    <div className="flex gap-1">
                      <button
                        type="button"
                        className="btn-secondary !min-h-10 !px-2.5"
                        aria-label={`Editar ${f.nome}`}
                        onClick={() => startEdit(f)}
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        className="btn-secondary !min-h-10 !px-2.5"
                        aria-label={
                          f.ativo ? `Inativar ${f.nome}` : `Reativar ${f.nome}`
                        }
                        onClick={() => toggleAtivo(f)}
                      >
                        {f.ativo ? (
                          <UserMinus className="h-4 w-4" />
                        ) : (
                          <UserCheck className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {visiveis.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-2 py-8 text-center text-muted">
                    Nenhum funcionário encontrado.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
