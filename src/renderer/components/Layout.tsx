import { NavLink, Outlet } from 'react-router-dom'
import {
  ClipboardList,
  LogOut,
  Settings,
  Table2,
  Users
} from 'lucide-react'
import type { UsuarioSessao } from '@shared/types'

const links = [
  { to: '/lancar', label: 'Lançar ponto', icon: ClipboardList },
  { to: '/planilha', label: 'Planilha', icon: Table2 },
  { to: '/funcionarios', label: 'Funcionários', icon: Users },
  { to: '/configuracoes', label: 'Configurações', icon: Settings }
]

interface LayoutProps {
  sessao: UsuarioSessao
  onLogout: () => void
}

export default function Layout({ sessao, onLogout }: LayoutProps) {
  return (
    <div className="min-h-screen bg-bg">
      <header className="border-b border-border bg-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <div>
            <p className="text-lg font-bold tracking-tight text-text">
              Ponto Escritório
            </p>
            <p className="text-xs text-muted">Controle de ponto manual</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-muted sm:inline">
              {sessao.email}
            </span>
            <button
              type="button"
              onClick={onLogout}
              className="btn-secondary !min-h-10 !px-3"
              aria-label="Sair do sistema"
            >
              <LogOut className="h-4 w-4" />
              Sair
            </button>
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
