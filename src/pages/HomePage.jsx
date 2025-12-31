import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'

export default function HomePage() {
  const { persona, progetto, assegnazione, ruolo, isAtLeast } = useAuth()
  const [stats, setStats] = useState({
    presentiOggi: 0,
    oreTotaliSettimana: 0,
    mieRichieste: 0
  })
  const [loading, setLoading] = useState(true)
  
  // Popup state
  const [popupType, setPopupType] = useState(null) // 'presenti' | 'ore' | 'richieste'
  const [popupData, setPopupData] = useState([])
  const [loadingPopup, setLoadingPopup] = useState(false)

  useEffect(() => {
    if (assegnazione?.progetto_id) {
      loadStats()
    }
  }, [assegnazione?.progetto_id])

  const loadStats = async () => {
    setLoading(true)
    try {
      const oggi = new Date().toISOString().split('T')[0]
      
      // Presenti oggi (check-in di oggi)
      const { count: presenti } = await supabase
        .from('presenze')
        .select('*', { count: 'exact', head: true })
        .eq('progetto_id', assegnazione.progetto_id)
        .eq('data', oggi)

      // Ore settimana (per l'utente corrente)
      const inizioSettimana = getInizioSettimana()
      const { data: oreData } = await supabase
        .from('presenze')
        .select('ora_checkin, ora_checkout')
        .eq('persona_id', persona?.id)
        .eq('progetto_id', assegnazione.progetto_id)
        .gte('data', inizioSettimana)
        .lte('data', oggi)

      let oreTotali = 0
      oreData?.forEach(p => {
        if (p.ora_checkin && p.ora_checkout) {
          const checkin = parseTime(p.ora_checkin)
          const checkout = parseTime(p.ora_checkout)
          if (checkout > checkin) {
            oreTotali += (checkout - checkin) / (1000 * 60 * 60)
          }
        }
      })

      // Mie richieste in attesa
      const { count: richieste } = await supabase
        .from('richieste_ferie')
        .select('*', { count: 'exact', head: true })
        .eq('persona_id', persona?.id)
        .eq('stato', 'in_attesa')

      setStats({
        presentiOggi: presenti || 0,
        oreTotaliSettimana: Math.round(oreTotali * 10) / 10,
        mieRichieste: richieste || 0
      })
    } catch (err) {
      console.error('Errore caricamento stats:', err)
    }
    setLoading(false)
  }

  const getInizioSettimana = () => {
    const oggi = new Date()
    const giorno = oggi.getDay()
    const diff = oggi.getDate() - giorno + (giorno === 0 ? -6 : 1)
    const lunedi = new Date(oggi.setDate(diff))
    return lunedi.toISOString().split('T')[0]
  }

  const parseTime = (timeStr) => {
    const [h, m, s] = timeStr.split(':').map(Number)
    return new Date(2000, 0, 1, h, m, s || 0).getTime()
  }

  // Funzioni per aprire popup
  const openPresentiPopup = async () => {
    setPopupType('presenti')
    setLoadingPopup(true)
    
    const oggi = new Date().toISOString().split('T')[0]
    const { data } = await supabase
      .from('presenze')
      .select('*, persona:persone(nome, cognome)')
      .eq('progetto_id', assegnazione.progetto_id)
      .eq('data', oggi)
      .order('ora_checkin')

    setPopupData(data || [])
    setLoadingPopup(false)
  }

  const openOrePopup = async () => {
    setPopupType('ore')
    setLoadingPopup(true)
    
    const oggi = new Date().toISOString().split('T')[0]
    const inizioSettimana = getInizioSettimana()
    
    const { data } = await supabase
      .from('presenze')
      .select('data, ora_checkin, ora_checkout')
      .eq('persona_id', persona?.id)
      .eq('progetto_id', assegnazione.progetto_id)
      .gte('data', inizioSettimana)
      .lte('data', oggi)
      .order('data', { ascending: false })

    // Calcola ore per ogni giorno
    const dettagli = data?.map(p => {
      let ore = 0
      if (p.ora_checkin && p.ora_checkout) {
        const checkin = parseTime(p.ora_checkin)
        const checkout = parseTime(p.ora_checkout)
        if (checkout > checkin) {
          ore = (checkout - checkin) / (1000 * 60 * 60)
        }
      }
      return { ...p, ore: Math.round(ore * 10) / 10 }
    }) || []

    setPopupData(dettagli)
    setLoadingPopup(false)
  }

  const openRichiestePopup = async () => {
    setPopupType('richieste')
    setLoadingPopup(true)
    
    const { data } = await supabase
      .from('richieste_ferie')
      .select('*')
      .eq('persona_id', persona?.id)
      .eq('stato', 'in_attesa')
      .order('data_inizio')

    setPopupData(data || [])
    setLoadingPopup(false)
  }

  const closePopup = () => {
    setPopupType(null)
    setPopupData([])
  }

  const formatTime = (timeStr) => {
    if (!timeStr) return '-'
    return timeStr.substring(0, 5)
  }

  const formatDate = (dateStr) => {
    if (!dateStr) return '-'
    return new Date(dateStr).toLocaleDateString('it-IT', { weekday: 'short', day: 'numeric', month: 'short' })
  }

  return (
    <div className="p-4 lg:p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-800">
          Ciao, {persona?.nome || 'Utente'}! 👋
        </h1>
        <p className="text-gray-500">{progetto?.nome}</p>
      </div>

      {/* KPI Cards - Cliccabili */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        {/* Presenti oggi */}
        <button 
          onClick={openPresentiPopup}
          className="bg-white rounded-2xl p-6 shadow-sm border hover:shadow-md transition-shadow text-left"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className={`text-4xl font-bold ${loading ? 'text-gray-300' : 'text-blue-600'}`}>
                {loading ? '-' : stats.presentiOggi}
              </p>
              <p className="text-gray-600 mt-1">Presenti oggi</p>
            </div>
            <div className="w-14 h-14 bg-blue-100 rounded-2xl flex items-center justify-center">
              <span className="text-2xl">👥</span>
            </div>
          </div>
        </button>

        {/* Ore settimana */}
        <button 
          onClick={openOrePopup}
          className="bg-white rounded-2xl p-6 shadow-sm border hover:shadow-md transition-shadow text-left"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className={`text-4xl font-bold ${loading ? 'text-gray-300' : 'text-green-600'}`}>
                {loading ? '-' : stats.oreTotaliSettimana}
              </p>
              <p className="text-gray-600 mt-1">Ore settimana</p>
            </div>
            <div className="w-14 h-14 bg-green-100 rounded-2xl flex items-center justify-center">
              <span className="text-2xl">⏱️</span>
            </div>
          </div>
        </button>

        {/* Mie richieste */}
        <button 
          onClick={openRichiestePopup}
          className="bg-white rounded-2xl p-6 shadow-sm border hover:shadow-md transition-shadow text-left"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className={`text-4xl font-bold ${loading ? 'text-gray-300' : 'text-purple-600'}`}>
                {loading ? '-' : stats.mieRichieste}
              </p>
              <p className="text-gray-600 mt-1">Mie richieste</p>
            </div>
            <div className="w-14 h-14 bg-purple-100 rounded-2xl flex items-center justify-center">
              <span className="text-2xl">📋</span>
            </div>
          </div>
        </button>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border mb-8">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Azioni rapide</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Link to="/checkin" className="flex flex-col items-center gap-2 p-4 bg-blue-50 rounded-xl hover:bg-blue-100 transition-colors">
            <span className="text-3xl">📍</span>
            <span className="text-sm font-medium text-blue-700">Check-in</span>
          </Link>
          <Link to="/rapportino" className="flex flex-col items-center gap-2 p-4 bg-green-50 rounded-xl hover:bg-green-100 transition-colors">
            <span className="text-3xl">📝</span>
            <span className="text-sm font-medium text-green-700">Rapportino</span>
          </Link>
          <Link to="/ferie" className="flex flex-col items-center gap-2 p-4 bg-amber-50 rounded-xl hover:bg-amber-100 transition-colors">
            <span className="text-3xl">🏖️</span>
            <span className="text-sm font-medium text-amber-700">Ferie</span>
          </Link>
          <Link to="/calendario" className="flex flex-col items-center gap-2 p-4 bg-purple-50 rounded-xl hover:bg-purple-100 transition-colors">
            <span className="text-3xl">📅</span>
            <span className="text-sm font-medium text-purple-700">Calendario</span>
          </Link>
        </div>
      </div>

      {/* Info Ruolo */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-6 border border-blue-100">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow-sm">
            <span className="text-2xl">
              {ruolo === 'admin' ? '👑' : ruolo === 'cm' || ruolo === 'pm' ? '👔' : ruolo === 'supervisor' ? '🎖️' : ruolo === 'foreman' ? '👷' : '🧑‍💼'}
            </span>
          </div>
          <div>
            <p className="font-semibold text-gray-800">
              {ruolo === 'admin' ? 'Amministratore' : 
               ruolo === 'pm' ? 'Project Manager' :
               ruolo === 'cm' ? 'Construction Manager' :
               ruolo === 'supervisor' ? 'Supervisore' :
               ruolo === 'dept_manager' ? 'Responsabile Dipartimento' :
               ruolo === 'foreman' ? 'Caposquadra' :
               ruolo === 'office' ? 'Impiegato' : 'Operatore'}
            </p>
            <p className="text-sm text-gray-600">{assegnazione?.ditta?.ragione_sociale || progetto?.nome}</p>
          </div>
        </div>
      </div>

      {/* POPUP Modal */}
      {popupType && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={closePopup}>
          <div className="bg-white rounded-2xl max-w-lg w-full max-h-[80vh] overflow-hidden" onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div className="p-4 border-b flex items-center justify-between bg-gray-50">
              <h3 className="font-semibold text-lg">
                {popupType === 'presenti' && '👥 Presenti Oggi'}
                {popupType === 'ore' && '⏱️ Ore Questa Settimana'}
                {popupType === 'richieste' && '📋 Mie Richieste in Attesa'}
              </h3>
              <button onClick={closePopup} className="p-2 hover:bg-gray-200 rounded-lg">✕</button>
            </div>

            {/* Content */}
            <div className="p-4 overflow-y-auto max-h-[60vh]">
              {loadingPopup ? (
                <div className="text-center py-8 text-gray-500">Caricamento...</div>
              ) : popupData.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  <p className="text-4xl mb-2">📭</p>
                  <p>Nessun dato</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {/* Presenti oggi */}
                  {popupType === 'presenti' && popupData.map((p, i) => (
                    <div key={i} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                      <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center font-bold text-blue-600">
                        {p.persona?.nome?.[0]}{p.persona?.cognome?.[0]}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium">{p.persona?.nome} {p.persona?.cognome}</p>
                        <p className="text-xs text-gray-500">
                          Entrata: {formatTime(p.ora_checkin)}
                          {p.ora_checkout && ` • Uscita: ${formatTime(p.ora_checkout)}`}
                        </p>
                      </div>
                      {!p.ora_checkout && (
                        <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full">In cantiere</span>
                      )}
                    </div>
                  ))}

                  {/* Ore settimana */}
                  {popupType === 'ore' && popupData.map((p, i) => (
                    <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                      <div>
                        <p className="font-medium">{formatDate(p.data)}</p>
                        <p className="text-xs text-gray-500">
                          {formatTime(p.ora_checkin)} - {formatTime(p.ora_checkout)}
                        </p>
                      </div>
                      <span className="text-lg font-bold text-green-600">{p.ore}h</span>
                    </div>
                  ))}

                  {/* Richieste */}
                  {popupType === 'richieste' && popupData.map((r, i) => (
                    <div key={i} className="p-3 bg-gray-50 rounded-xl">
                      <div className="flex items-center justify-between mb-1">
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          r.tipo === 'ferie' ? 'bg-blue-100 text-blue-700' :
                          r.tipo === 'permesso' ? 'bg-amber-100 text-amber-700' :
                          'bg-gray-100 text-gray-700'
                        }`}>
                          {r.tipo === 'ferie' ? '🏖️ Ferie' : r.tipo === 'permesso' ? '⏰ Permesso' : r.tipo}
                        </span>
                        <span className="text-xs text-gray-500">{formatDate(r.created_at)}</span>
                      </div>
                      <p className="text-sm">
                        {formatDate(r.data_inizio)}
                        {r.data_fine !== r.data_inizio && ` → ${formatDate(r.data_fine)}`}
                      </p>
                      {r.note && <p className="text-xs text-gray-500 mt-1">{r.note}</p>}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t bg-gray-50">
              {popupType === 'presenti' && isAtLeast('foreman') && (
                <Link to="/team" className="block w-full text-center py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700">
                  Vai al Team
                </Link>
              )}
              {popupType === 'ore' && (
                <Link to="/calendario" className="block w-full text-center py-2 bg-green-600 text-white rounded-xl hover:bg-green-700">
                  Vai al Calendario
                </Link>
              )}
              {popupType === 'richieste' && (
                <Link to="/ferie" className="block w-full text-center py-2 bg-purple-600 text-white rounded-xl hover:bg-purple-700">
                  Gestisci Richieste
                </Link>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
