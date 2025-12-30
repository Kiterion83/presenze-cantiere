import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'

// Layout
import Layout from './components/Layout'

// Pages
import LoginPage from './pages/LoginPage'
import HomePage from './pages/HomePage'

// Placeholder Pages (da implementare)
function PlaceholderPage({ title, emoji }) {
  return (
    <div className="p-4 lg:p-8">
      <div className="bg-white rounded-xl p-8 text-center shadow-sm border border-gray-100">
        <span className="text-6xl block mb-4">{emoji}</span>
        <h1 className="text-2xl font-bold text-gray-800 mb-2">{title}</h1>
        <p className="text-gray-500">Pagina in costruzione...</p>
      </div>
    </div>
  )
}

const CheckinPage = () => <PlaceholderPage title="Check-in" emoji="📍" />
const CalendarioPage = () => <PlaceholderPage title="Calendario" emoji="📅" />
const TeamPage = () => <PlaceholderPage title="Team" emoji="👥" />
const RapportinoPage = () => <PlaceholderPage title="Rapportino" emoji="📝" />
const StatistichePage = () => <PlaceholderPage title="Statistiche" emoji="📊" />
const ImpostazioniPage = () => <PlaceholderPage title="Impostazioni" emoji="⚙️" />
const MenuPage = () => <PlaceholderPage title="Menu" emoji="☰" />

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
function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()
  
  if (loading) return <LoadingScreen />
  if (!user) return <Navigate to="/login" replace />
  
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
          
          {/* Protected */}
          <Route path="/" element={<ProtectedRoute><HomePage /></ProtectedRoute>} />
          <Route path="/checkin" element={<ProtectedRoute><CheckinPage /></ProtectedRoute>} />
          <Route path="/calendario" element={<ProtectedRoute><CalendarioPage /></ProtectedRoute>} />
          <Route path="/team" element={<ProtectedRoute><TeamPage /></ProtectedRoute>} />
          <Route path="/rapportino" element={<ProtectedRoute><RapportinoPage /></ProtectedRoute>} />
          <Route path="/statistiche" element={<ProtectedRoute><StatistichePage /></ProtectedRoute>} />
          <Route path="/impostazioni" element={<ProtectedRoute><ImpostazioniPage /></ProtectedRoute>} />
          <Route path="/menu" element={<ProtectedRoute><MenuPage /></ProtectedRoute>} />
          
          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}

export default App
