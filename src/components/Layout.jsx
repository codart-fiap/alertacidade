import { Outlet, Link, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'

export default function Layout() {
  const { user, logout } = useAuth()
  const location = useLocation()
  const manager = location.pathname.startsWith('/admin')

  return (
    <div>
      <header className="app-header">
        <Link to="/" className="brand"><span className="brand-dot" />AlertaCidade</Link>
        <nav className="app-nav">
          {manager ? <><Link to="/admin/alertas">Painel do gestor</Link><button className="btn secondary" onClick={logout}>Sair</button></> : <><Link to="/resumos">Resumos e alertas</Link><Link to="/mapa">Mapa</Link>{user?.role === 'gestor' ? <Link to="/admin/alertas">Gestor</Link> : <Link to="/login">Gestor</Link>}</>}
        </nav>
      </header>
      <Outlet />
    </div>
  )
}
