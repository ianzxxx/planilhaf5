import { NavLink, Outlet } from 'react-router-dom'
import {
  BarChart3,
  ClipboardList,
  Settings,
  Table2,
  Users
} from 'lucide-react'
import logo from '../assets/logo.png'

const links = [
  { to: '/lancar', label: 'Ponto do dia', icon: ClipboardList },
  { to: '/planilha', label: 'Planilha', icon: Table2 },
  { to: '/relatorio', label: 'Relatório', icon: BarChart3 },
  { to: '/funcionarios', label: 'Funcionários', icon: Users },
  { to: '/configuracoes', label: 'Configurações', icon: Settings }
]

export default function Layout() {
  return (
    <div className="min-h-screen bg-bg">
      <header className="border-b border-border bg-white">
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3">
          <img
            src={logo}
            alt="Atacadão do Celular"
            className="h-11 w-11 shrink-0 rounded-lg object-contain"
          />
          <div>
            <p className="text-lg font-bold tracking-tight text-text">
              Ponto Escritório
            </p>
            <p className="text-xs text-muted">Controle de ponto manual</p>
          </div>
        </div>
        <nav className="mx-auto max-w-7xl overflow-x-auto px-4 pb-3">
          <ul className="flex min-w-max gap-1">
            {links.map(({ to, label, icon: Icon }) => (
              <li key={to}>
                <NavLink
                  to={to}
                  className={({ isActive }) =>
                    `inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors duration-200 ${
                      isActive
                        ? 'bg-primary text-white'
                        : 'text-muted hover:bg-slate-100 hover:text-text'
                    }`
                  }
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6">
        <Outlet />
      </main>
    </div>
  )
}
