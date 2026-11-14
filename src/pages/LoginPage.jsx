import { useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { validateEmail, validatePassword } from '../utils/validation.js'

export default function LoginPage() {
  const { user, login, loading, error } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})

  // se ja tem alguem logado, nao faz sentido mostrar o login de novo
  if (user) return <Navigate to={user.role === 'gestor' ? '/admin/alertas' : '/'} replace />

  async function handleSubmit(e) {
    e.preventDefault()

    const emailError = validateEmail(email)
    const passwordError = validatePassword(password)
    if (emailError || passwordError) {
      setFieldErrors({ email: emailError, password: passwordError })
      return
    }
    setFieldErrors({})
    await login(email, password)
  }

  return (
    <div className="page" style={{ paddingTop: 24 }}>
      <nav className="login-navigation" aria-label="Navegação">
        <Link to="/">Início</Link>
        <button className="back-button" onClick={() => window.history.state?.idx > 0 ? navigate(-1) : navigate('/')}>← Voltar</button>
      </nav>
        <h1 style={{ fontSize: 22, marginBottom: 4 }}>Acesso do gestor</h1>
      <p style={{ color: 'var(--muted)', fontSize: 13.5, marginBottom: 28 }}>
        Área restrita para monitorar sensores e publicar orientações.
      </p>

      <form onSubmit={handleSubmit}>
        <label style={{ fontSize: 13, fontWeight: 600 }}>E-mail</label>
        <input
          className="input"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={{ marginTop: 6, marginBottom: fieldErrors.email ? 2 : 16 }}
          placeholder="seu@email.com"
        />
        {fieldErrors.email && <p className="error-text" style={{ marginBottom: 16 }}>{fieldErrors.email}</p>}

        <label style={{ fontSize: 13, fontWeight: 600 }}>Senha</label>
        <input
          className="input"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={{ marginTop: 6, marginBottom: fieldErrors.password ? 2 : 16 }}
          placeholder="••••••"
        />
        {fieldErrors.password && <p className="error-text" style={{ marginBottom: 16 }}>{fieldErrors.password}</p>}

        {error && <p className="error-text" style={{ marginBottom: 16 }}>{error}</p>}

        <button className="btn" type="submit" disabled={loading} style={{ width: '100%' }}>
          {loading ? 'Entrando...' : 'Entrar'}
        </button>
      </form>

      <p style={{ color: 'var(--muted)', fontSize: 12, marginTop: 24, lineHeight: 1.6 }}>
        Acesso de demonstração — gestor: gestor@teste.com / 123456
      </p>
    </div>
  )
}
