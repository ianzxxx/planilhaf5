import { useEffect, useState } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import type { UsuarioSessao } from '@shared/types'
import Layout from './components/Layout'
import LoginPage from './pages/Login'
import LancamentoPage from './pages/Lancamento'
import FuncionariosPage from './pages/Funcionarios'
import PlanilhaPage from './pages/Planilha'
import ConfiguracoesPage from './pages/Configuracoes'

export default function App() {
  const [sessao, setSessao] = useState<UsuarioSessao | null>(null)
  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    window.api.auth.sessao().then((result) => {
      if (result.ok) setSessao(result.data ?? null)
      setCarregando(false)
    })
  }, [])

  if (carregando) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg text-muted">
        Carregando...
      </div>
    )
  }

  if (!sessao) {
    return <LoginPage onLogin={setSessao} />
  }

  return (
    <Routes>
      <Route
        element={
          <Layout
            sessao={sessao}
            onLogout={async () => {
              await window.api.auth.logout()
              setSessao(null)
            }}
          />
        }
      >
        <Route index element={<Navigate to="/lancar" replace />} />
        <Route path="/lancar" element={<LancamentoPage />} />
        <Route path="/funcionarios" element={<FuncionariosPage />} />
        <Route path="/planilha" element={<PlanilhaPage />} />
        <Route path="/configuracoes" element={<ConfiguracoesPage />} />
        <Route path="*" element={<Navigate to="/lancar" replace />} />
      </Route>
    </Routes>
  )
}
