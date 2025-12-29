import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext({})

export const useAuth = () => useContext(AuthContext)

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [persona, setPersona] = useState(null)
  const [assegnazione, setAssegnazione] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Controlla sessione esistente
    const checkSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        
        if (session?.user) {
          setUser(session.user)
          await loadPersona(session.user.id)
        }
      } catch (error) {
        console.error('Error checking session:', error)
      } finally {
        setLoading(false)
      }
    }

    checkSession()

    // Ascolta cambiamenti auth
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth event:', event)
        
        if (session?.user) {
          setUser(session.user)
          await loadPersona(session.user.id)
        } else {
          setUser(null)
          setPersona(null)
          setAssegnazione(null)
        }
        
        setLoading(false)
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  // Carica dati persona dal database
  const loadPersona = async (authUserId) => {
    try {
      // Carica persona
      const { data: personaData, error: personaError } = await supabase
        .from('persone')
        .select('*')
        .eq('auth_user_id', authUserId)
        .single()

      if (personaError) {
        console.error('Error loading persona:', personaError)
        return
      }

      setPersona(personaData)

      // Carica assegnazione attiva (prima che trova)
      const { data: assegnazioneData, error: assegnazioneError } = await supabase
        .from('assegnazioni_progetto')
        .select(`
          *,
          progetto:progetti(*),
          ditta:ditte(*)
        `)
        .eq('persona_id', personaData.id)
        .eq('attivo', true)
        .limit(1)
        .single()

      if (!assegnazioneError && assegnazioneData) {
        setAssegnazione(assegnazioneData)
      }

    } catch (error) {
      console.error('Error in loadPersona:', error)
    }
  }

  // Login
  const signIn = async (email, password) => {
    setLoading(true)
    
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    })

    if (error) {
      setLoading(false)
      throw error
    }

    return data
  }

  // Logout
  const signOut = async () => {
    setLoading(true)
    
    const { error } = await supabase.auth.signOut()
    
    if (error) {
      setLoading(false)
      throw error
    }

    setUser(null)
    setPersona(null)
    setAssegnazione(null)
    setLoading(false)
  }

  // Verifica ruolo
  const hasRole = (roles) => {
    if (!assegnazione) return false
    if (typeof roles === 'string') {
      return assegnazione.ruolo === roles
    }
    return roles.includes(assegnazione.ruolo)
  }

  // Verifica se è almeno un certo ruolo (gerarchia)
  const isAtLeast = (role) => {
    if (!assegnazione) return false
    
    const hierarchy = ['helper', 'foreman', 'supervisor', 'cm', 'admin']
    const userLevel = hierarchy.indexOf(assegnazione.ruolo)
    const requiredLevel = hierarchy.indexOf(role)
    
    return userLevel >= requiredLevel
  }

  const value = {
    user,
    persona,
    assegnazione,
    loading,
    signIn,
    signOut,
    hasRole,
    isAtLeast,
    // Shortcut per ruolo
    ruolo: assegnazione?.ruolo,
    progettoId: assegnazione?.progetto_id,
    progetto: assegnazione?.progetto,
    ditta: assegnazione?.ditta
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}
