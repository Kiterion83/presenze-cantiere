import { useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'

// Pages
import LoginPage from './pages/LoginPage'
import HomePage from './pages/HomePage'
import CheckinPage from './pages/CheckinPage'
import CalendarioPage from './pages/CalendarioPage'
import FeriePage from './pages/FeriePage'
import TeamPage from './pages/TeamPage'
import RapportinoPage from './pages/RapportinoPage'
import DocumentiPage from './pages/DocumentiPage'
import NotifichePage from './pages/NotifichePage'
import TrasferimentiPage from './pages/TrasferimentiPage'
import StatistichePage from './pages/StatistichePage'
import DashboardPage from './pages/DashboardPage'
import ImpostazioniPage from './pages/ImpostazioniPage'
import MenuPage from './pages/MenuPage'
// NUOVE PAGINE CONSTRUCTION
import ActivitiesPage from './pages/ActivitiesPage'
import WarehousePage from './pages/WarehousePage'
import ComponentiPage from './pages/ComponentiPage'
import PianificazionePage from './pages/PianificazionePage'
import ForemanPage from './pages/ForemanPage'
import OreComponentiPage from './pages/OreComponentiPage'

// Components
import Layout from './components/Layout'

// Protected Route Component - AGGIORNATO con supporto requiredAccess
function ProtectedRoute({ children, minRole, requiredAccess }) {
  const { user, loading, isAtLeast, canAccess } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-900 to-blue-700 rounded-2xl flex items-center justify-center shadow-lg mx-auto mb-4 animate-pulse">
            <span className="text-amber-400 font-bold text-lg">PTS</span>
          </div>
          <p className="text-gray-500">Caricamento...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  // Check special access (for warehouse, activities, etc.)
  if (requiredAccess && canAccess && !canAccess(requiredAccess)) {
    return <Navigate to="/" replace />
  }

  // Check minimum role
  if (minRole && !isAtLeast(minRole)) {
    return <Navigate to="/" replace />
  }

  return <Layout>{children}</Layout>
}

// App Routes
function AppRoutes() {
  const { user, loading } = useAuth()

  // Set document title
  useEffect(() => {
    document.title = 'PTS - Project Tracking System'
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-900 to-blue-700 rounded-2xl flex items-center justify-center shadow-lg mx-auto mb-4 animate-pulse">
            <span className="text-amber-400 font-bold text-lg">PTS</span>
          </div>
          <p className="text-gray-500">Caricamento...</p>
        </div>
      </div>
    )
  }

  return (
    <Routes>
      {/* Public Routes */}
      <Route 
        path="/login" 
        element={user ? <Navigate to="/" replace /> : <LoginPage />} 
      />

      {/* Protected Routes - All Users */}
      <Route path="/" element={<ProtectedRoute><HomePage /></ProtectedRoute>} />
      <Route path="/checkin" element={<ProtectedRoute><CheckinPage /></ProtectedRoute>} />
      <Route path="/calendario" element={<ProtectedRoute><CalendarioPage /></ProtectedRoute>} />
      <Route path="/ferie" element={<ProtectedRoute><FeriePage /></ProtectedRoute>} />
      <Route path="/menu" element={<ProtectedRoute><MenuPage /></ProtectedRoute>} />

      {/* Protected Routes - Foreman+ */}
      <Route path="/team" element={<ProtectedRoute minRole="foreman"><TeamPage /></ProtectedRoute>} />
      <Route path="/rapportino" element={<ProtectedRoute minRole="foreman"><RapportinoPage /></ProtectedRoute>} />
      <Route path="/documenti" element={<ProtectedRoute minRole="foreman"><DocumentiPage /></ProtectedRoute>} />
      <Route path="/notifiche" element={<ProtectedRoute minRole="foreman"><NotifichePage /></ProtectedRoute>} />
      <Route path="/trasferimenti" element={<ProtectedRoute minRole="foreman"><TrasferimentiPage /></ProtectedRoute>} />

      {/* NUOVE ROUTES - Construction Module */}
      <Route path="/activities" element={<ProtectedRoute requiredAccess="activities"><ActivitiesPage /></ProtectedRoute>} />
      <Route path="/warehouse" element={<ProtectedRoute requiredAccess="warehouse"><WarehousePage /></ProtectedRoute>} />
      <Route path="/componenti" element={<ProtectedRoute requiredAccess="componenti"><ComponentiPage /></ProtectedRoute>} />
      <Route path="/pianificazione" element={<ProtectedRoute requiredAccess="pianificazione"><PianificazionePage /></ProtectedRoute>} />
      <Route path="/foreman" element={<ProtectedRoute requiredAccess="foreman"><ForemanPage /></ProtectedRoute>} />
      <Route path="/ore-componenti" element={<ProtectedRoute requiredAccess="ore-componenti"><OreComponentiPage /></ProtectedRoute>} />

      {/* Protected Routes - Supervisor+ */}
      <Route path="/statistiche" element={<ProtectedRoute minRole="supervisor"><StatistichePage /></ProtectedRoute>} />
      <Route path="/dashboard" element={<ProtectedRoute minRole="supervisor"><DashboardPage /></ProtectedRoute>} />

      {/* Protected Routes - Admin */}
      <Route path="/impostazioni" element={<ProtectedRoute minRole="admin"><ImpostazioniPage /></ProtectedRoute>} />

      {/* Catch all */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

// Main App Component
export default function App() {
  return (
    <Router>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </Router>
  )
}
