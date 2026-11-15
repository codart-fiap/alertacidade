import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { useSensors } from '../context/SensorContext.jsx'

export default function Layout() {
  const { user, logout } = useAuth()
  const { apiError, loading, apiMode } = useSensors()
  const location = useLocation()
  const navigate = useNavigate()
  const manager = location.pathname.startsWith('/admin')
  const goBack = () => window.history.state?.idx > 0 ? navigate(-1) : navigate('/')

  return (
    <div>
      <header className="app-header">
        <Link to="/" className="brand"><span className="brand-dot" />AlertaCidade</Link>
        <nav className="app-nav">
          <Link to="/">Início</Link>
          {manager ? <><Link to="/admin/alertas">Painel do gestor</Link><Link to="/admin/sensores">Sensores</Link>{!apiMode && <Link to="/admin/notificacoes">Notificações</Link>}<button className="btn secondary" onClick={logout}>Sair</button></> : <><Link to="/resumos">Resumos e alertas</Link>{user?.role === 'gestor' ? <Link to="/admin/alertas">Gestor</Link> : <Link to="/login">Gestor</Link>}</>}
        </nav>
      </header>
      <div className="back-button-row"><button className="back-button" onClick={goBack}>← Voltar</button></div>
      {loading && <p className="page muted" role="status">Conectando ao Pluvia…</p>}
      {apiError && <p className="page error-text" role="alert">{apiError}</p>}
      <Outlet />
    </div>
  )
}
