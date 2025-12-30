import { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { supabase } from './lib/supabase'

// ============================================
// LOGIN PAGE
// ============================================
function LoginPage() {
  const [email, setEmail] = useState('giuseppe.pasquale@outlook.com')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) throw error
      window.location.href = '/'
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
            <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500' }}>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{ width: '100%', padding: '12px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '16px', boxSizing: 'border-box' }}
              required
            />
          </div>
          
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500' }}>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{ width: '100%', padding: '12px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '16px', boxSizing: 'border-box' }}
              required
            />
          </div>

          {error && (
            <div style={{ background: '#fee2e2', color: '#dc2626', padding: '12px', borderRadius: '8px', marginBottom: '16px' }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{ width: '100%', padding: '12px', background: loading ? '#93c5fd' : '#2563eb', color: 'white', border: 'none', borderRadius: '8px', fontSize: '16px', fontWeight: '600', cursor: loading ? 'not-allowed' : 'pointer' }}
          >
            {loading ? 'Accesso...' : 'Accedi'}
          </button>
        </form>
      </div>
    </div>
  )
}

// ============================================
// HOME PAGE
// ============================================
function HomePage() {
  const [user, setUser] = useState(null)
  const [persona, setPersona] = useState(null)
  const [assegnazione, setAssegnazione] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session) {
        window.location.href = '/login'
        return
      }

      setUser(session.user)

      const { data: p } = await supabase
        .from('persone')
        .select('*')
        .eq('auth_user_id', session.user.id)
        .single()

      if (p) {
        setPersona(p)

        const { data: a } = await supabase
          .from('assegnazioni_progetto')
          .select('*, progetto:progetti(*)')
          .eq('persona_id', p.id)
          .eq('attivo', true)
          .single()

        if (a) setAssegnazione(a)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  if (loading) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <p>⏳ Caricamento...</p>
      </div>
    )
  }

  return (
    <div style={{ padding: '20px', fontFamily: 'sans-serif' }}>
      <h1 style={{ color: '#2563eb' }}>🏗️ Presenze Cantiere</h1>
      
      <div style={{ background: '#dbeafe', padding: '16px', borderRadius: '8px', marginBottom: '16px' }}>
        <p><strong>👤 Utente:</strong> {user?.email}</p>
        <p><strong>📛 Nome:</strong> {persona?.nome} {persona?.cognome}</p>
        <p><strong>🎭 Ruolo:</strong> {assegnazione?.ruolo || 'N/A'}</p>
        <p><strong>🏗️ Progetto:</strong> {assegnazione?.progetto?.nome || 'N/A'}</p>
      </div>

      <div style={{ background: '#d1fae5', padding: '16px', borderRadius: '8px', marginBottom: '16px', textAlign: 'center' }}>
        <p style={{ margin: 0, fontWeight: 'bold', color: '#059669' }}>✅ App funzionante!</p>
      </div>

      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
        <a href="/checkin" style={{ padding: '12px 24px', background: '#3b82f6', color: 'white', borderRadius: '8px', textDecoration: 'none' }}>📍 Check-in</a>
        <a href="/team" style={{ padding: '12px 24px', background: '#8b5cf6', color: 'white', borderRadius: '8px', textDecoration: 'none' }}>👥 Team</a>
        <button onClick={handleLogout} style={{ padding: '12px 24px', background: '#ef4444', color: 'white', borderRadius: '8px', border: 'none', cursor: 'pointer' }}>🚪 Logout</button>
      </div>
    </div>
  )
}

// ============================================
// APP
// ============================================
function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/*" element={<HomePage />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
