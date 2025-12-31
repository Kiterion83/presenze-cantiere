import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext({})

export const useAuth = () => useContext(AuthContext)

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [persona, setPersona] = useState(null)
  const [assegnazioni, setAssegnazioni] = useState([]) // Assegnazioni reali dell'utente
  const [tuttiProgetti, setTuttiProgetti] = useState([]) // TUTTI i progetti (per admin)
  const [assegnazione, setAssegnazione] = useState(null) // Assegnazione corrente
  const [progetto, setProgetto] = useState(null)
  const [loading, setLoading] = useState(true)
  const [testRoleOverride, setTestRoleOverride] = useState(null)

  useEffect(() => {
    const savedTestRole = sessionStorage.getItem('test_role_override')
    if (savedTestRole) {
      setTestRoleOverride(savedTestRole)
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user)
        loadPersona(session.user.id)
      } else {
        setLoading(false)
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        setUser(session.user)
        loadPersona(session.user.id)
      } else {
        setUser(null)
        setPersona(null)
        setAssegnazioni([])
        setTuttiProgetti([])
        setAssegnazione(null)
        setProgetto(null)
        setLoading(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const loadPersona = async (authUserId) => {
    try {
      const { data: p, error: e1 } = await supabase
        .from('persone')
        .select('*')
        .eq('auth_user_id', authUserId)
        .single()

      if (e1 || !p) {
        setLoading(false)
        return
      }

      setPersona(p)

      // Carica le assegnazioni dell'utente
      const { data: allAssegnazioni, error: e2 } = await supabase
        .from('assegnazioni_progetto')
        .select('*, progetto:progetti(*), ditta:ditte(*), dipartimento:dipartimenti(*)')
        .eq('persona_id', p.id)
        .eq('attivo', true)
        .order('created_at', { ascending: false })

      // Verifica se l'utente è admin in almeno un progetto
      const isAdminSomewhere = allAssegnazioni?.some(a => a.ruolo === 'admin')

      // Se è admin, carica TUTTI i progetti
      let progettiDisponibili = []
      if (isAdminSomewhere) {
        const { data: allProjects } = await supabase
          .from('progetti')
          .select('*')
          .eq('stato', 'attivo')
          .order('nome')
        
        setTuttiProgetti(allProjects || [])
        
        // Per admin, crea assegnazioni "virtuali" per progetti non assegnati
        progettiDisponibili = (allProjects || []).map(proj => {
          const realAssegnazione = allAssegnazioni?.find(a => a.progetto_id === proj.id)
          if (realAssegnazione) {
            return realAssegnazione
          }
          // Assegnazione virtuale per admin
          return {
            id: `virtual-${proj.id}`,
            persona_id: p.id,
            progetto_id: proj.id,
            progetto: proj,
            ruolo: 'admin', // Admin su tutti i progetti
            attivo: true,
            ditta: null,
            dipartimento: null,
            isVirtual: true // Flag per identificare assegnazioni virtuali
          }
        })
      } else {
        progettiDisponibili = allAssegnazioni || []
      }

      setAssegnazioni(progettiDisponibili)

      if (progettiDisponibili.length > 0) {
        // Recupera progetto salvato o usa il primo
        const savedProgettoId = localStorage.getItem('selected_progetto_id')
        const savedAssegnazione = savedProgettoId 
          ? progettiDisponibili.find(a => a.progetto_id === savedProgettoId)
          : null

        const activeAssegnazione = savedAssegnazione || progettiDisponibili[0]
        setAssegnazione(activeAssegnazione)
        setProgetto(activeAssegnazione.progetto)
      }
    } catch (err) {
      console.error('Errore:', err)
    } finally {
      setLoading(false)
    }
  }

  // Funzione per cambiare progetto
  const cambiaProgetto = (progettoId) => {
    const nuovaAssegnazione = assegnazioni.find(a => a.progetto_id === progettoId)
    if (nuovaAssegnazione) {
      setAssegnazione(nuovaAssegnazione)
      setProgetto(nuovaAssegnazione.progetto)
      localStorage.setItem('selected_progetto_id', progettoId)
    }
  }

  const signIn = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
    return data
  }

  const signOut = async () => {
    sessionStorage.removeItem('test_role_override')
    localStorage.removeItem('selected_progetto_id')
    setTestRoleOverride(null)
    await supabase.auth.signOut()
    setUser(null)
    setPersona(null)
    setAssegnazioni([])
    setTuttiProgetti([])
    setAssegnazione(null)
    setProgetto(null)
  }

  const setTestRole = (role) => {
    if (role) {
      sessionStorage.setItem('test_role_override', role)
      setTestRoleOverride(role)
    } else {
      sessionStorage.removeItem('test_role_override')
      setTestRoleOverride(null)
    }
  }

  const effectiveRole = testRoleOverride || assegnazione?.ruolo || null

  // AGGIORNATO: Gerarchia ruoli con warehouse e engineer
  const isAtLeast = (role) => {
    if (!effectiveRole) return false
    const hierarchy = ['helper', 'warehouse', 'office', 'foreman', 'engineer', 'dept_manager', 'supervisor', 'cm', 'pm', 'admin']
    return hierarchy.indexOf(effectiveRole) >= hierarchy.indexOf(role)
  }

  const isRole = (role) => {
    return effectiveRole === role
  }

  const isOfficePath = () => {
    return effectiveRole === 'office' || effectiveRole === 'dept_manager'
  }

  const getPercorso = () => {
    if (effectiveRole === 'office' || effectiveRole === 'dept_manager') {
      return 'office'
    }
    return 'site'
  }

  const canApproveDirectly = () => {
    return effectiveRole === 'cm' || effectiveRole === 'pm' || effectiveRole === 'admin'
  }

  // Verifica se l'utente è admin globale (admin in almeno un progetto)
  const isGlobalAdmin = () => {
    return assegnazioni.some(a => a.ruolo === 'admin' && !a.isVirtual)
  }

  // NUOVO: Verifica accesso a pagine speciali (per warehouse, activities, construction)
  const canAccess = (page) => {
    if (!effectiveRole) return false
    
    const pagePermissions = {
      // Activities: foreman+ e ruoli superiori
      'activities': ['foreman', 'engineer', 'dept_manager', 'supervisor', 'cm', 'pm', 'admin'],
      // Warehouse: solo warehouse e ruoli di gestione (cm, pm, admin)
      'warehouse': ['warehouse', 'cm', 'pm', 'admin'],
      // Construction settings: engineer e ruoli superiori di gestione
      'construction': ['engineer', 'cm', 'pm', 'admin'],
      // Componenti: engineer+ per gestione, foreman può solo visualizzare (gestito separatamente)
      'componenti': ['engineer', 'dept_manager', 'supervisor', 'cm', 'pm', 'admin'],
      // Pianificazione CW: engineer+ può pianificare, foreman può visualizzare
      'pianificazione': ['foreman', 'engineer', 'dept_manager', 'supervisor', 'cm', 'pm', 'admin'],
      // Foreman mobile view: foreman e superiori
      'foreman': ['foreman', 'engineer', 'dept_manager', 'supervisor', 'cm', 'pm', 'admin'],
      // Ore componenti: foreman può registrare, engineer+ può vedere report completo
      'ore-componenti': ['foreman', 'engineer', 'dept_manager', 'supervisor', 'cm', 'pm', 'admin']
    }

    const allowedRoles = pagePermissions[page]
    if (!allowedRoles) return isAtLeast('helper') // Default: tutti

    return allowedRoles.includes(effectiveRole)
  }

  const value = {
    user,
    persona,
    assegnazioni,
    tuttiProgetti,
    assegnazione,
    progetto,
    loading,
    signIn,
    signOut,
    isAtLeast,
    isRole,
    isOfficePath,
    getPercorso,
    canApproveDirectly,
    isGlobalAdmin,
    canAccess,  // NUOVO
    setTestRole,
    testRoleOverride,
    cambiaProgetto,
    ruolo: effectiveRole,
    realRuolo: assegnazione?.ruolo || null,
    progettoId: assegnazione?.progetto_id || null,
    ditta: assegnazione?.ditta || null,
    dipartimento: assegnazione?.dipartimento || null
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}
