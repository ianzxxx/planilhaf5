import { useEffect, useMemo, useRef, useState } from 'react'
import { Search, X } from 'lucide-react'
import type { Funcionario } from '@shared/types'

interface FuncionarioPickerProps {
  funcionarios: Funcionario[]
  value: string
  onChange: (id: string) => void
  inputRef?: React.RefObject<HTMLInputElement | null>
  label?: string
}

export default function FuncionarioPicker({
  funcionarios,
  value,
  onChange,
  inputRef,
  label = 'Funcionário'
}: FuncionarioPickerProps) {
  const [busca, setBusca] = useState('')
  const [aberto, setAberto] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)
  const localInputRef = useRef<HTMLInputElement>(null)
  const ref = inputRef ?? localInputRef

  const selecionado = funcionarios.find((f) => f.id === value)

  const filtrados = useMemo(() => {
    const q = busca.trim().toLowerCase()
    if (!q) return funcionarios
    return funcionarios.filter(
      (f) =>
        f.nome.toLowerCase().includes(q) ||
        (f.cargo ?? '').toLowerCase().includes(q)
    )
  }, [funcionarios, busca])

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!wrapRef.current?.contains(e.target as Node)) {
        setAberto(false)
      }
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [])

  // Se a lista mudou e o selecionado sumiu, limpa
  useEffect(() => {
    if (value && !funcionarios.some((f) => f.id === value)) {
      onChange('')
    }
  }, [funcionarios, value, onChange])

  function escolher(f: Funcionario) {
    onChange(f.id)
    setBusca('')
    setAberto(false)
  }

  function limpar() {
    onChange('')
    setBusca('')
    setAberto(true)
    ref.current?.focus()
  }

  return (
    <div ref={wrapRef} className="space-y-1.5">
      <label htmlFor="busca-funcionario" className="label">
        {label}
      </label>

      {selecionado ? (
        <div className="flex min-h-11 items-center justify-between gap-2 rounded-lg border border-primary/30 bg-blue-50 px-3 py-2">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-text">
              {selecionado.nome || 'Sem nome'}
            </p>
            {selecionado.cargo ? (
              <p className="truncate text-xs text-muted">{selecionado.cargo}</p>
            ) : null}
          </div>
          <button
            type="button"
            className="btn-secondary !min-h-9 !px-2.5"
            aria-label="Trocar funcionário"
            onClick={limpar}
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            id="busca-funcionario"
            ref={ref}
            className="input-field pl-10"
            placeholder="Digite para buscar pelo nome..."
            value={busca}
            autoComplete="off"
            onChange={(e) => {
              setBusca(e.target.value)
              setAberto(true)
            }}
            onFocus={() => setAberto(true)}
          />

          {aberto ? (
            <ul
              className="absolute z-30 mt-1 max-h-56 w-full overflow-auto rounded-lg border border-border bg-white shadow-lg"
              role="listbox"
            >
              {filtrados.map((f) => (
                <li key={f.id}>
                  <button
                    type="button"
                    role="option"
                    className="flex w-full cursor-pointer flex-col items-start px-3 py-2.5 text-left transition-colors duration-150 hover:bg-slate-50"
                    onClick={() => escolher(f)}
                  >
                    <span className="text-sm font-medium text-text">
                      {f.nome || 'Sem nome'}
                    </span>
                    {f.cargo ? (
                      <span className="text-xs text-muted">{f.cargo}</span>
                    ) : null}
                  </button>
                </li>
              ))}
              {filtrados.length === 0 ? (
                <li className="px-3 py-4 text-center text-sm text-muted">
                  {funcionarios.length === 0
                    ? 'Nenhum funcionário cadastrado.'
                    : 'Nenhum nome encontrado.'}
                </li>
              ) : null}
            </ul>
          ) : null}
        </div>
      )}
    </div>
  )
}
