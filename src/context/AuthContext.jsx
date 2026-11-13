import { createContext, useContext, useState } from 'react'
import { login as apiLogin } from '../services/apiClient.js'

const AuthContext = createContext(null)

// Guarda o usuario logado e expoe login/logout pro resto do app.
//
// Decisao de seguranca: o token fica em sessionStorage, nao em
// localStorage. sessionStorage some quando a aba fecha, o que reduz
// a janela de tempo em que um token roubado continua valido. Nao e
// perfeito (nenhuma das duas opcoes protege contra XSS de verdade —
// isso exigiria cookie httpOnly configurado pelo backend), mas e a
// melhor opcao disponivel so no frontend.
export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const saved = sessionStorage.getItem('user')
    return saved ? JSON.parse(saved) : null
  })
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)

  async function login(email, password) {
    setLoading(true)
    setError(null)
    try {
      const { token, user: loggedUser } = await apiLogin(email, password)
      if (loggedUser.role !== 'gestor') throw new Error('Apenas gestores possuem acesso com login. O espaço do cidadão é público.')
      sessionStorage.setItem('token', token)
      sessionStorage.setItem('user', JSON.stringify(loggedUser))
      setUser(loggedUser)
      return true
    } catch (err) {
      setError(err.message)
      return false
    } finally {
      setLoading(false)
    }
  }

  function logout() {
    sessionStorage.removeItem('token')
    sessionStorage.removeItem('user')
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, login, logout, error, loading }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth precisa ser usado dentro de um AuthProvider.')
  return ctx
}
