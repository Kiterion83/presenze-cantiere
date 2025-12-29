import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './contexts/AuthContext'
import LoginPage from './pages/LoginPage'
import HomePage from './pages/HomePage'
import CheckInPage from './pages/CheckInPage'
import RapportinoPage from './pages/RapportinoPage'
import TeamPage from './pages/TeamPage'
import TrasferimentiPage from './pages/TrasferimentiPage'
import ImpostazioniPage from './pages/ImpostazioniPage'
import StatistichePage from './pages/StatistichePage'
import Layout from './components/Layout'
import LoadingScreen from './components/LoadingScreen'

const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, loading, assegnazione, hasRole } = useAuth()
  if (loading) return <LoadingScreen />
  if (!user) return <Navigate to="/login" replace />
  if (!assegnazione) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="bg-white rounded-xl p-6 text-center max-w-md">
          <h2 className="text-xl font-bold mb-2">Nessun progetto assegnato</h2>
          <p className="text-gray-600">Contatta l'amministratore.</p>
        </div>
      </div>
    )
  }
  if (allowedRoles && !hasRole(allowedRoles)) return <Navigate to="/" replace />
  return children
}

function App() {
  const { user, loading } = useAuth()
  if (loading) return <LoadingScreen />

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <LoginPage />} />
      <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route index element={<HomePage />} />
        <Route path="checkin" element={<CheckInPage />} />
        <Route path="team" element={<TeamPage />} />
        <Route path="rapportino" element={<ProtectedRoute allowedRoles={['foreman', 'supervisor', 'cm', 'admin']}><RapportinoPage /></ProtectedRoute>} />
        <Route path="statistiche" element={<ProtectedRoute allowedRoles={['foreman', 'supervisor', 'cm', 'admin']}><StatistichePage /></ProtectedRoute>} />
        <Route path="trasferimenti" element={<ProtectedRoute allowedRoles={['foreman', 'supervisor', 'cm', 'admin']}><TrasferimentiPage /></ProtectedRoute>} />
        <Route path="impostazioni" element={<ProtectedRoute allowedRoles={['cm', 'admin']}><ImpostazioniPage /></ProtectedRoute>} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App
