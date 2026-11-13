import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'

// Controle de acesso por perfil (parte 5 do documento).
// requireRole e opcional: sem ele, so exige estar logado (qualquer
// perfil); com ele, exige o perfil especifico (ex: "gestor").
export default function ProtectedRoute({ children, requireRole }) {
  const { user } = useAuth()

  if (!user) return <Navigate to="/login" replace />
  if (requireRole && user.role !== requireRole) return <Navigate to="/" replace />

  return children
}
