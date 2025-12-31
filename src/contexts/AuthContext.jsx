import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext({})

export const useAuth = () => useContext(AuthContext)

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [persona, setPersona] = useState(null)
  const [assegnazioni, setAssegnazioni] = useState([])
  const [assegnazione, setAssegnazione] = useState(null)
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

      const { data: allAssegnazioni, error: e2 } = await supabase
        .from('assegnazioni_progetto')
        .select('*, progetto:progetti(*), ditta:ditte(*), dipartimento:dipartimenti(*)')
        .eq('persona_id', p.id)
        .eq('attivo', true)
        .order('created_at', { ascending: false })

      if (!e2 && allAssegnazioni && allAssegnazioni.length > 0) {
        setAssegnazioni(allAssegnazioni)

        const savedProgettoId = localStorage.getItem('selected_progetto_id')
        const savedAssegnazione = savedProgettoId 
          ? allAssegnazioni.find(a => a.progetto_id === savedProgettoId)
          : null

        const activeAssegnazione = savedAssegnazione || allAssegnazioni[0]
        setAssegnazione(activeAssegnazione)
        setProgetto(activeAssegnazione.progetto)
      }
    } catch (err) {
      console.error('Errore:', err)
    } finally {
      setLoading(false)
    }
  }

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

  // GERARCHIA RUOLI AGGIORNATA con warehouse e engineer
  // helper < warehouse/office/foreman < engineer/supervisor/dept_manager < cm < pm < admin
  const isAtLeast = (role) => {
    if (!effectiveRole) return false
    const hierarchy = ['helper', 'warehouse', 'office', 'foreman', 'engineer', 'dept_manager', 'supervisor', 'cm', 'pm', 'admin']
    return hierarchy.indexOf(effectiveRole) >= hierarchy.indexOf(role)
  }

  // Verifica se è esattamente un ruolo
  const isRole = (role) => {
    return effectiveRole === role
  }

  // Verifica se è un ruolo office (percorso ufficio)
  const isOfficePath = () => {
    return effectiveRole === 'office' || effectiveRole === 'dept_manager'
  }

  // Funzione per determinare il percorso (site o office)
  const getPercorso = () => {
    if (effectiveRole === 'office' || effectiveRole === 'dept_manager') {
      return 'office'
    }
    return 'site'
  }

  // Può approvare trasferimenti direttamente (CM senza workflow)
  const canApproveDirectly = () => {
    return effectiveRole === 'cm' || effectiveRole === 'pm' || effectiveRole === 'admin'
  }

  // Verifica se può accedere a pagine specifiche
  const canAccess = (page) => {
    const pagePermissions = {
      warehouse: ['warehouse', 'cm', 'pm', 'admin'],
      activities: ['foreman', 'engineer', 'supervisor', 'dept_manager', 'cm', 'pm', 'admin'],
      construction: ['engineer', 'cm', 'pm', 'admin'],
    }
    
    if (pagePermissions[page]) {
      return pagePermissions[page].includes(effectiveRole)
    }
    return true
  }

  const value = {
    user,
    persona,
    assegnazioni,
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
    canAccess,
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
