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
    console.log('AuthProvider: inizializzazione...')
    
    const checkSession = async () => {
      try {
        console.log('AuthProvider: controllo sessione...')
        const { data: { session }, error } = await supabase.auth.getSession()
        
        if (error) {
          console.error('AuthProvider: errore getSession:', error)
          setLoading(false)
          return
        }
        
        console.log('AuthProvider: sessione =', session ? 'presente' : 'nulla')
        
        if (session?.user) {
          setUser(session.user)
          console.log('AuthProvider: user impostato, carico persona...')
          await loadPersona(session.user.id)
        } else {
          console.log('AuthProvider: nessuna sessione')
        }
      } catch (error) {
        console.error('AuthProvider: eccezione in checkSession:', error)
      } finally {
        console.log('AuthProvider: loading = false')
        setLoading(false)
      }
    }

    checkSession()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('AuthProvider: auth event =', event)
        
        if (session?.user) {
          setUser(session.user)
          await loadPersona(session.user.id)
        } else {
          setUser(null)
          setPersona(null)
          setAssegnazione(null)
          setProgetto(null)
        }
        
        setLoading(false)
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  const loadPersona = async (authUserId) => {
    try {
      console.log('loadPersona: inizio per', authUserId)
      
      // Carica persona
      const { data: personaData, error: personaError } = await supabase
        .from('persone')
        .select('*')
        .eq('auth_user_id', authUserId)
        .single()

      if (personaError) {
        console.error('loadPersona: errore caricamento persona:', personaError)
        return
      }

      console.log('loadPersona: persona trovata =', personaData?.nome)
      setPersona(personaData)

      // Carica assegnazione attiva
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

      if (assegnazioneError) {
        console.error('loadPersona: errore caricamento assegnazione:', assegnazioneError)
        return
      }

      console.log('loadPersona: assegnazione trovata, ruolo =', assegnazioneData?.ruolo)
      setAssegnazione(assegnazioneData)
      setProgetto(assegnazioneData?.progetto || null)

    } catch (error) {
      console.error('loadPersona: eccezione:', error)
    }
  }

  const signIn = async (email, password) => {
    setLoading(true)
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setLoading(false)
      throw error
    }
    return data
  }

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
    setProgetto(null)
    setLoading(false)
  }

  // Funzione isAtLeast sicura
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
    // Shortcut sicuri con fallback
    ruolo: assegnazione?.ruolo || null,
    progettoId: assegnazione?.progetto_id || null,
    ditta: assegnazione?.ditta || null
  }

  console.log('AuthProvider render: loading=', loading, 'user=', user?.email, 'ruolo=', value.ruolo)

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}
