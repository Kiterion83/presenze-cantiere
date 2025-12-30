import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext({})

export const useAuth = () => useContext(AuthContext)

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [persona, setPersona] = useState(null)
  const [assegnazione, setAssegnazione] = useState(null)
  const [loading, setLoading] = useState(true)
  const [testRoleOverride, setTestRoleOverride] = useState(null)

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

    // Carica eventuale role override da sessionStorage
    const savedRole = sessionStorage.getItem('test_role_override')
    if (savedRole) {
      setTestRoleOverride(savedRole)
    }

    checkSession()

    // Ascolta cambiamenti auth
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth event:', event)
        
        // Ricarica role override ad ogni cambio auth
        const roleOverride = sessionStorage.getItem('test_role_override')
        if (roleOverride) {
          setTestRoleOverride(roleOverride)
        }
        
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
    
    // Ricarica role override prima del login
    const roleOverride = sessionStorage.getItem('test_role_override')
    if (roleOverride) {
      setTestRoleOverride(roleOverride)
    }
    
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
    
    // Rimuovi role override al logout
    sessionStorage.removeItem('test_role_override')
    setTestRoleOverride(null)
    
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

  // Ruolo effettivo (con override per test)
  const getEffectiveRole = () => {
    if (testRoleOverride) {
      return testRoleOverride
    }
    return assegnazione?.ruolo
  }

  // Verifica ruolo (usa ruolo effettivo)
  const hasRole = (roles) => {
    const effectiveRole = getEffectiveRole()
    if (!effectiveRole) return false
    if (typeof roles === 'string') {
      return effectiveRole === roles
    }
    return roles.includes(effectiveRole)
  }

  // Verifica se è almeno un certo ruolo (gerarchia)
  const isAtLeast = (role) => {
    const effectiveRole = getEffectiveRole()
    if (!effectiveRole) return false
    
    const hierarchy = ['helper', 'office', 'foreman', 'supervisor', 'cm', 'admin']
    const userLevel = hierarchy.indexOf(effectiveRole)
    const requiredLevel = hierarchy.indexOf(role)
    
    return userLevel >= requiredLevel
  }

  // Verifica se è in test mode
  const isTestMode = () => {
    return !!testRoleOverride
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
    isTestMode,
    // Shortcut per ruolo (usa ruolo effettivo)
    ruolo: getEffectiveRole(),
    ruoloReale: assegnazione?.ruolo, // Ruolo reale dal DB
    progettoId: assegnazione?.progetto_id,
    progetto: assegnazione?.progetto,
    ditta: assegnazione?.ditta,
    testRoleOverride
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}
