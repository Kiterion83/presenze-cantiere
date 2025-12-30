import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import LoginPage from './pages/LoginPage'

// Componente Home inline ultra-semplice
function SimpleHome() {
  const auth = useAuth()
  
  if (auth?.loading) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <p>Caricamento...</p>
      </div>
    )
  }

  const handleLogout = async () => {
    try {
      await auth?.signOut()
      window.location.href = '/login'
    } catch (e) {
      console.error(e)
    }
  }

  return (
    <div style={{ padding: '20px', fontFamily: 'sans-serif' }}>
      <h1 style={{ color: '#2563eb' }}>🏗️ Presenze Cantiere</h1>
      
      <div style={{ 
        background: '#fef3c7', 
        border: '1px solid #f59e0b', 
        borderRadius: '8px', 
        padding: '16px',
        marginBottom: '16px'
      }}>
        <h3 style={{ margin: '0 0 8px 0' }}>🔍 Debug Info</h3>
        <p><strong>User:</strong> {auth?.user?.email || 'NULL'}</p>
        <p><strong>Persona:</strong> {auth?.persona?.nome || 'NULL'} {auth?.persona?.cognome || ''}</p>
        <p><strong>Ruolo:</strong> {auth?.assegnazione?.ruolo || 'NULL'}</p>
        <p><strong>Progetto:</strong> {auth?.progetto?.nome || 'NULL'}</p>
      </div>

      <div style={{ 
        background: '#d1fae5', 
        border: '1px solid #10b981', 
        borderRadius: '8px', 
        padding: '16px',
        marginBottom: '16px',
        textAlign: 'center'
      }}>
        <p style={{ margin: 0, fontWeight: 'bold', color: '#059669' }}>
          ✅ App funzionante!
        </p>
      </div>

      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
        <a href="/checkin" style={{ 
          padding: '12px 24px', 
          background: '#3b82f6', 
          color: 'white', 
          borderRadius: '8px',
          textDecoration: 'none'
        }}>
          📍 Check-in
        </a>
        <a href="/team" style={{ 
          padding: '12px 24px', 
          background: '#8b5cf6', 
          color: 'white', 
          borderRadius: '8px',
          textDecoration: 'none'
        }}>
          👥 Team
        </a>
        <button 
          onClick={handleLogout}
          style={{ 
            padding: '12px 24px', 
            background: '#ef4444', 
            color: 'white', 
            borderRadius: '8px',
            border: 'none',
            cursor: 'pointer'
          }}
        >
          🚪 Logout
        </button>
      </div>
    </div>
  )
}

// Loading semplice
function LoadingScreen() {
  return (
    <div style={{ 
      minHeight: '100vh', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center' 
    }}>
      <p>Caricamento...</p>
    </div>
  )
}

// Protected Route
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

// Public Route
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
          <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
          <Route path="/" element={<ProtectedRoute><SimpleHome /></ProtectedRoute>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}

export default App
