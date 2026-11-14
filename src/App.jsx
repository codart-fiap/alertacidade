import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import Layout from './components/Layout.jsx'
import ProtectedRoute from './components/ProtectedRoute.jsx'
import LoginPage from './pages/LoginPage.jsx'
import AreasListPage from './pages/AreasListPage.jsx'
import AreaDetailPage from './pages/AreaDetailPage.jsx'
import AdminAlertsPage from './pages/AdminAlertsPage.jsx'
import AdminSensorsPage from './pages/AdminSensorsPage.jsx'
import AdminNotificationsPage from './pages/AdminNotificationsPage.jsx'

function MapRedirect() {
  const location = useLocation()
  return <Navigate to={{ pathname: '/', search: location.search }} replace />
}

// Todas as rotas da aplicacao ficam centralizadas aqui.
// Se uma tela nova for adicionada, ela entra como mais uma <Route>
// dentro do Layout — nao criar um segundo arquivo de rotas.
export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route element={<Layout />}>
        {/* A área pública do cidadão não exige conta. */}
        <Route path="/" element={<AreasListPage />} />
        <Route path="/resumos" element={<AreasListPage expanded />} />
        <Route
          path="/areas/:id"
          element={<AreaDetailPage />}
        />
        <Route path="/mapa" element={<MapRedirect />} />

        {/* rota do gestor: exige perfil "gestor" especificamente */}
        <Route
          path="/admin/alertas"
          element={
            <ProtectedRoute requireRole="gestor">
              <AdminAlertsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/sensores"
          element={
            <ProtectedRoute requireRole="gestor">
              <AdminSensorsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/notificacoes"
          element={
            <ProtectedRoute requireRole="gestor">
              <AdminNotificationsPage />
            </ProtectedRoute>
          }
        />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
