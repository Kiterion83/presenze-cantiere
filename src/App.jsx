import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import Layout from './components/Layout'
import LoadingScreen from './components/LoadingScreen'

// Pages
import LoginPage from './pages/LoginPage'
import HomePage from './pages/HomePage'
import CheckInPage from './pages/CheckInPage'
import TeamPage from './pages/TeamPage'
import RapportinoPage from './pages/RapportinoPage'
import StatistichePage from './pages/StatistichePage'
import TrasferimentiPage from './pages/TrasferimentiPage'
import PersonalePage from './pages/PersonalePage'
import ImpostazioniPage from './pages/ImpostazioniPage'
import FeriePage from './pages/FeriePage'

// Protected Route Component
function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()

  if (loading) {
    return <LoadingScreen />
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  return children
}

// Public Route Component (redirect if logged in)
function PublicRoute({ children }) {
  const { user, loading } = useAuth()

  if (loading) {
    return <LoadingScreen />
  }

  if (user) {
    return <Navigate to="/" replace />
  }

  return children
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public Routes */}
          <Route
            path="/login"
            element={
              <PublicRoute>
                <LoginPage />
              </PublicRoute>
            }
          />

          {/* Protected Routes */}
          <Route
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route path="/" element={<HomePage />} />
            <Route path="/checkin" element={<CheckInPage />} />
            <Route path="/team" element={<TeamPage />} />
            <Route path="/rapportino" element={<RapportinoPage />} />
            <Route path="/statistiche" element={<StatistichePage />} />
            <Route path="/trasferimenti" element={<TrasferimentiPage />} />
            <Route path="/personale" element={<PersonalePage />} />
            <Route path="/impostazioni" element={<ImpostazioniPage />} />
            <Route path="/ferie" element={<FeriePage />} />
          </Route>

          {/* Catch all - redirect to home */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}

export default App
