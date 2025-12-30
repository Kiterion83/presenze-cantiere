import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext({})

export const useAuth = () => useContext(AuthContext)

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [persona, setPersona] = useState(null)
  const [assegnazione, setAssegnazione] = useState(null)
  const [progetto, setProgetto] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Check sessione iniziale
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user)
        loadPersona(session.user.id)
      } else {
        setLoading(false)
      }
    })

    // Listener per cambi auth
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
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
      // Carica persona
      const { data: p, error: e1 } = await supabase
        .from('persone')
        .select('*')
        .eq('auth_user_id', authUserId)
        .single()

      if (e1 || !p) {
        console.error('Errore caricamento persona:', e1)
        setLoading(false)
        return
      }

      setPersona(p)

      // Carica assegnazione attiva
      const { data: a, error: e2 } = await supabase
        .from('assegnazioni_progetto')
        .select('*, progetto:progetti(*), ditta:ditte(*)')
        .eq('persona_id', p.id)
        .eq('attivo', true)
        .limit(1)
        .single()

      if (!e2 && a) {
        setAssegnazione(a)
        setProgetto(a.progetto)
      }
    } catch (err) {
      console.error('Eccezione loadPersona:', err)
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

  // Helper: verifica gerarchia ruoli
  const isAtLeast = (role) => {
    const currentRole = assegnazione?.ruolo
    if (!currentRole) return false
    
    const hierarchy = ['helper', 'office', 'foreman', 'supervisor', 'cm', 'admin']
    const userLevel = hierarchy.indexOf(currentRole)
    const requiredLevel = hierarchy.indexOf(role)
    
    return userLevel >= requiredLevel
  }

  const value = {
    user,
    persona,
    assegnazione,
    progetto,
    loading,
    signIn,
    signOut,
    isAtLeast,
    // Shortcuts
    ruolo: assegnazione?.ruolo || null,
    progettoId: assegnazione?.progetto_id || null,
    ditta: assegnazione?.ditta || null
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}
