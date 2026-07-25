import { useState, type FormEvent } from 'react'
import { Clock3 } from 'lucide-react'
import type { UsuarioSessao } from '@shared/types'

interface LoginPageProps {
  onLogin: (sessao: UsuarioSessao) => void
}

export default function LoginPage({ onLogin }: LoginPageProps) {
  const [email, setEmail] = useState('secretaria@escritorio.local')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setErro('')
    setLoading(true)

    try {
      const result = await window.api.auth.login(email, senha)
      if (!result.ok || !result.data) {
        setErro(result.error || 'Não foi possível entrar')
        return
      }
      onLogin(result.data)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg px-4">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_#dbeafe_0%,_transparent_45%),radial-gradient(circle_at_bottom_right,_#ffedd5_0%,_transparent_40%)]" />
      <div className="relative w-full max-w-md rounded-2xl border border-border bg-white/95 p-8">
        <div className="mb-6 flex items-center gap-3">
          <div className="rounded-xl bg-primary/10 p-3 text-primary">
            <Clock3 className="h-7 w-7" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-text">Ponto Escritório</h1>
            <p className="text-sm text-muted">Entre para lançar os pontos do dia</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="label">
              E-mail
            </label>
            <input
              id="email"
              type="email"
              autoComplete="username"
              required
              className="input-field"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div>
            <label htmlFor="senha" className="label">
              Senha
            </label>
            <input
              id="senha"
              type="password"
              autoComplete="current-password"
              required
              className="input-field"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
            />
          </div>

          {erro ? (
            <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
              {erro}
            </p>
          ) : null}

          <button type="submit" className="btn-primary w-full" disabled={loading}>
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>

        <p className="mt-5 text-xs text-muted">
          Usuário inicial: secretaria@escritorio.local · senha: secretaria123
        </p>
      </div>
    </div>
  )
}
