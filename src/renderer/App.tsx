import { Navigate, Route, Routes } from 'react-router-dom'
import Layout from './components/Layout'
import LancamentoPage from './pages/Lancamento'
import FuncionariosPage from './pages/Funcionarios'
import PlanilhaPage from './pages/Planilha'
import RelatorioPage from './pages/Relatorio'
import ConfiguracoesPage from './pages/Configuracoes'

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Navigate to="/lancar" replace />} />
        <Route path="/lancar" element={<LancamentoPage />} />
        <Route path="/funcionarios" element={<FuncionariosPage />} />
        <Route path="/planilha" element={<PlanilhaPage />} />
        <Route path="/relatorio" element={<RelatorioPage />} />
        <Route path="/configuracoes" element={<ConfiguracoesPage />} />
        <Route path="*" element={<Navigate to="/lancar" replace />} />
      </Route>
    </Routes>
  )
}
