import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'

// Layout
import Layout from './components/Layout'

// Pages
import LoginPage from './pages/LoginPage'
import HomePage from './pages/HomePage'
import CheckinPage from './pages/CheckinPage'
import CalendarioPage from './pages/CalendarioPage'
import TeamPage from './pages/TeamPage'
import RapportinoPage from './pages/RapportinoPage'
import StatistichePage from './pages/StatistichePage'
import ImpostazioniPage from './pages/ImpostazioniPage'

// Menu Page per mobile (lista completa)
function MenuPage() {
  const { signOut, isAtLeast } = useAuth()
  
  const menuItems = [
    { path: '/', label: 'Home', emoji: '🏠', show: true },
    { path: '/checkin', label: 'Check-in', emoji: '📍', show: true },
    { path: '/calendario', label: 'Calendario', emoji: '📅', show: true },
    { path: '/team', label: 'Team', emoji: '👥', show: isAtLeast('foreman') },
    { path: '/rapportino', label: 'Rapportino', emoji: '📝', show: isAtLeast('foreman') },
    { path: '/statistiche', label: 'Statistiche', emoji: '📊', show: isAtLeast('supervisor') },
    { path: '/impostazioni', label: 'Impostazioni', emoji: '⚙️', show: isAtLeast('cm') },
  ].filter(item => item.show)

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">☰ Menu</h1>
      <div className="space-y-2">
        {menuItems.map(item => (
          <a
            key={item.path}
            href={item.path}
            className="flex items-center gap-4 p-4 bg-white rounded-xl shadow-sm border border-gray-100 hover:bg-gray-50 transition-colors"
          >
            <span className="text-2xl">{item.emoji}</span>
            <span className="font-medium text-gray-700">{item.label}</span>
          </a>
        ))}
        <button
          onClick={signOut}
          className="w-full flex items-center gap-4 p-4 bg-red-50 rounded-xl border border-red-100 hover:bg-red-100 transition-colors mt-4"
        >
          <span className="text-2xl">🚪</span>
          <span className="font-medium text-red-600">Esci</span>
        </button>
      </div>
    </div>
  )
}

// Loading Screen
function LoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-gray-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4" />
        <p className="text-gray-500">Caricamento...</p>
      </div>
    </div>
  )
}

// Protected Route con Layout
function ProtectedRoute({ children, minRole }) {
  const { user, loading, isAtLeast } = useAuth()
  
  if (loading) return <LoadingScreen />
  if (!user) return <Navigate to="/login" replace />
  if (minRole && !isAtLeast(minRole)) return <Navigate to="/" replace />
  
  return <Layout>{children}</Layout>
}

// Public Route
function PublicRoute({ children }) {
  const { user, loading } = useAuth()
  
  if (loading) return <LoadingScreen />
  if (user) return <Navigate to="/" replace />
  
  return children
}

// App
function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public */}
          <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
          
          {/* Protected - Everyone */}
          <Route path="/" element={<ProtectedRoute><HomePage /></ProtectedRoute>} />
          <Route path="/checkin" element={<ProtectedRoute><CheckinPage /></ProtectedRoute>} />
          <Route path="/calendario" element={<ProtectedRoute><CalendarioPage /></ProtectedRoute>} />
          <Route path="/menu" element={<ProtectedRoute><MenuPage /></ProtectedRoute>} />
          
          {/* Protected - Foreman+ */}
          <Route path="/team" element={<ProtectedRoute minRole="foreman"><TeamPage /></ProtectedRoute>} />
          <Route path="/rapportino" element={<ProtectedRoute minRole="foreman"><RapportinoPage /></ProtectedRoute>} />
          
          {/* Protected - Supervisor+ */}
          <Route path="/statistiche" element={<ProtectedRoute minRole="supervisor"><StatistichePage /></ProtectedRoute>} />
          
          {/* Protected - CM+ */}
          <Route path="/impostazioni" element={<ProtectedRoute minRole="cm"><ImpostazioniPage /></ProtectedRoute>} />
          
          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}

export default App
