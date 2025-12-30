import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from './lib/supabase'

// ============================================
// AUTH CONTEXT INLINE
// ============================================
const AuthContext = createContext({})
const useAuth = () => useContext(AuthContext)

function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [persona, setPersona] = useState(null)
  const [assegnazione, setAssegnazione] = useState(null)
  const [progetto, setProgetto] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    console.log('AUTH: init')
    
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      console.log('AUTH: session =', session ? 'YES' : 'NO', error || '')
      if (session?.user) {
        setUser(session.user)
        loadPersona(session.user.id)
      } else {
        setLoading(false)
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('AUTH: event =', event)
      if (session?.user) {
        setUser(session.user)
        loadPersona(session.user.id)
      } else {
        setUser(null)
        setPersona(null)
        setAssegnazione(null)
        setProgetto(null)
        setLoading(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const loadPersona = async (authUserId) => {
    try {
      console.log('AUTH: loadPersona for', authUserId)
      
      const { data: p, error: e1 } = await supabase
        .from('persone')
        .select('*')
        .eq('auth_user_id', authUserId)
        .single()

      if (e1) {
        console.error('AUTH: persona error', e1)
        setLoading(false)
        return
      }

      console.log('AUTH: persona =', p?.nome)
      setPersona(p)

      const { data: a, error: e2 } = await supabase
        .from('assegnazioni_progetto')
        .select('*, progetto:progetti(*), ditta:ditte(*)')
        .eq('persona_id', p.id)
        .eq('attivo', true)
        .limit(1)
        .single()

      if (!e2 && a) {
        console.log('AUTH: assegnazione =', a?.ruolo)
        setAssegnazione(a)
        setProgetto(a.progetto)
      }
    } catch (err) {
      console.error('AUTH: exception', err)
    } finally {
      setLoading(false)
    }
  }

  const signIn = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
    return data
  }

  const signOut = async () => {
    await supabase.auth.signOut()
    setUser(null)
    setPersona(null)
    setAssegnazione(null)
    setProgetto(null)
  }

  return (
    <AuthContext.Provider value={{ 
      user, persona, assegnazione, progetto, loading, signIn, signOut,
      ruolo: assegnazione?.ruolo 
    }}>
      {children}
    </AuthContext.Provider>
  )
}

// ============================================
// LOGIN PAGE INLINE
// ============================================
function LoginPage() {
  const [email, setEmail] = useState('giuseppe.pasquale@outlook.com')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { signIn } = useAuth()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await signIn(email, password)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ 
      minHeight: '100vh', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center',
      background: '#f3f4f6',
      padding: '20px'
    }}>
      <div style={{ 
        background: 'white', 
        padding: '32px', 
        borderRadius: '12px',
        boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
        width: '100%',
        maxWidth: '400px'
      }}>
        <h1 style={{ textAlign: 'center', marginBottom: '24px' }}>
          🏗️ Presenze Cantiere
        </h1>
        
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500' }}>
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{
                width: '100%',
                padding: '12px',
                border: '1px solid #d1d5db',
                borderRadius: '8px',
                fontSize: '16px',
                boxSizing: 'border-box'
              }}
              required
            />
          </div>
          
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500' }}>
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{
                width: '100%',
                padding: '12px',
                border: '1px solid #d1d5db',
                borderRadius: '8px',
                fontSize: '16px',
                boxSizing: 'border-box'
              }}
              required
            />
          </div>

          {error && (
            <div style={{ 
              background: '#fee2e2', 
              color: '#dc2626', 
              padding: '12px', 
              borderRadius: '8px',
              marginBottom: '16px'
            }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '12px',
              background: loading ? '#93c5fd' : '#2563eb',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: '600',
              cursor: loading ? 'not-allowed' : 'pointer'
            }}
          >
            {loading ? 'Accesso...' : 'Accedi'}
          </button>
        </form>
      </div>
    </div>
  )
}

// ============================================
// HOME PAGE INLINE
// ============================================
function HomePage() {
  const { user, persona, assegnazione, progetto, signOut } = useAuth()

  const handleLogout = async () => {
    await signOut()
    window.location.href = '/login'
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
        <p><strong>User:</strong> {user?.email || 'NULL'}</p>
        <p><strong>Persona:</strong> {persona?.nome || 'NULL'} {persona?.cognome || ''}</p>
        <p><strong>Ruolo:</strong> {assegnazione?.ruolo || 'NULL'}</p>
        <p><strong>Progetto:</strong> {progetto?.nome || 'NULL'}</p>
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

      <button 
        onClick={handleLogout}
        style={{ 
          padding: '12px 24px', 
          background: '#ef4444', 
          color: 'white', 
          borderRadius: '8px',
          border: 'none',
          cursor: 'pointer',
          fontSize: '16px'
        }}
      >
        🚪 Logout
      </button>
    </div>
  )
}

// ============================================
// LOADING SCREEN
// ============================================
function LoadingScreen() {
  return (
    <div style={{ 
      minHeight: '100vh', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center' 
    }}>
      <p>⏳ Caricamento...</p>
    </div>
  )
}

// ============================================
// ROUTE GUARDS
// ============================================
function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <LoadingScreen />
  if (!user) return <Navigate to="/login" replace />
  return children
}

function PublicRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <LoadingScreen />
  if (user) return <Navigate to="/" replace />
  return children
}

// ============================================
// APP
// ============================================
function App() {
  console.log('APP: render')
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
          <Route path="/" element={<ProtectedRoute><HomePage /></ProtectedRoute>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}

export default App
