import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { useNavigate } from 'react-router-dom'

export default function HomePage() {
  const { persona, progetto, assegnazione, isAtLeast } = useAuth()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [dashboard, setDashboard] = useState({
    miaPresenzaOggi: null,
    presenzeOggi: 0,
    presenzeSettimana: 0,
    oreSettimana: 0,
    richiestePendenti: 0,
    approvazioni: 0,
    meteoOggi: null,
    ultimaAttivita: [],
    prossimiEventi: []
  })

  useEffect(() => {
    if (persona?.id && assegnazione?.progetto_id) {
      loadDashboard()
    }
  }, [persona?.id, assegnazione?.progetto_id])

  const loadDashboard = async () => {
    setLoading(true)
    const oggi = new Date().toISOString().split('T')[0]
    const inizioSettimana = new Date()
    inizioSettimana.setDate(inizioSettimana.getDate() - 7)

    // La mia presenza oggi
    const { data: miaPresenza } = await supabase
      .from('presenze')
      .select('*')
      .eq('persona_id', persona.id)
      .eq('data', oggi)
      .single()

    // Presenze oggi (tutti)
    const { data: presenzeOggi, count: countOggi } = await supabase
      .from('presenze')
      .select('*', { count: 'exact' })
      .eq('progetto_id', assegnazione.progetto_id)
      .eq('data', oggi)

    // Presenze settimana
    const { data: presenzeSettimana } = await supabase
      .from('presenze')
      .select('*')
      .eq('progetto_id', assegnazione.progetto_id)
      .gte('data', inizioSettimana.toISOString().split('T')[0])
      .not('ora_uscita', 'is', null)

    // Calcola ore settimana
    let oreSettimana = 0
    presenzeSettimana?.forEach(p => {
      if (p.ora_entrata && p.ora_uscita) {
        const entrata = new Date(`2000-01-01T${p.ora_entrata}`)
        const uscita = new Date(`2000-01-01T${p.ora_uscita}`)
        oreSettimana += (uscita - entrata) / (1000 * 60 * 60)
      }
    })

    // Richieste ferie pendenti (mie)
    const { count: richiestePendenti } = await supabase
      .from('richieste_assenze')
      .select('*', { count: 'exact', head: true })
      .eq('persona_id', persona.id)
      .eq('stato', 'in_attesa')

    // Approvazioni da fare (se supervisor+)
    let approvazioni = 0
    if (isAtLeast('supervisor')) {
      const { count: countApp } = await supabase
        .from('richieste_assenze')
        .select('*', { count: 'exact', head: true })
        .eq('progetto_id', assegnazione.progetto_id)
        .eq('stato', 'in_attesa')
      approvazioni = countApp || 0
    }

    // Ultima attività (ultime 5 presenze)
    const { data: ultimaAttivita } = await supabase
      .from('presenze')
      .select('*, persona:persone(nome, cognome)')
      .eq('progetto_id', assegnazione.progetto_id)
      .order('created_at', { ascending: false })
      .limit(5)

    // Prossime ferie approvate
    const { data: prossimiEventi } = await supabase
      .from('richieste_assenze')
      .select('*, persona:persone(nome, cognome)')
      .eq('progetto_id', assegnazione.progetto_id)
      .eq('stato', 'approvata')
      .gte('data_inizio', oggi)
      .order('data_inizio')
      .limit(5)

    // Meteo (simulato - puoi integrare API vera)
    const meteo = await fetchMeteo()

    setDashboard({
      miaPresenzaOggi: miaPresenza,
      presenzeOggi: countOggi || 0,
      presenzeSettimana: presenzeSettimana?.length || 0,
      oreSettimana: Math.round(oreSettimana),
      richiestePendenti: richiestePendenti || 0,
      approvazioni,
      meteoOggi: meteo,
      ultimaAttivita: ultimaAttivita || [],
      prossimiEventi: prossimiEventi || []
    })

    setLoading(false)
  }

  const fetchMeteo = async () => {
    // Coordinate Parma
    const lat = progetto?.latitudine || 44.8015
    const lon = progetto?.longitudine || 10.3279
    try {
      const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code&timezone=Europe/Rome`)
      const data = await res.json()
      return {
        temp: Math.round(data.current?.temperature_2m || 0),
        code: data.current?.weather_code || 0
      }
    } catch {
      return null
    }
  }

  const getMeteoIcon = (code) => {
    if (code === 0) return '☀️'
    if (code <= 3) return '⛅'
    if (code <= 48) return '🌫️'
    if (code <= 67) return '🌧️'
    if (code <= 77) return '🌨️'
    if (code <= 82) return '🌧️'
    if (code <= 86) return '❄️'
    if (code >= 95) return '⛈️'
    return '🌤️'
  }

  const getOraCorrente = () => {
    const ore = new Date().getHours()
    if (ore < 12) return 'Buongiorno'
    if (ore < 18) return 'Buon pomeriggio'
    return 'Buonasera'
  }

  const quickActions = [
    { label: 'Check-in', emoji: '📍', path: '/checkin', color: 'bg-blue-500' },
    { label: 'Calendario', emoji: '📅', path: '/calendario', color: 'bg-green-500' },
    { label: 'Ferie', emoji: '🏖️', path: '/ferie', color: 'bg-purple-500' },
    ...(isAtLeast('foreman') ? [{ label: 'Rapportino', emoji: '📝', path: '/rapportino', color: 'bg-orange-500' }] : []),
    ...(isAtLeast('supervisor') ? [{ label: 'Notifiche', emoji: '🔔', path: '/notifiche', color: 'bg-red-500' }] : []),
  ]

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-gray-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-500">Caricamento dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 lg:p-8 space-y-6">
      {/* Header con saluto e meteo */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-2xl p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-blue-100">{getOraCorrente()}</p>
            <h1 className="text-2xl font-bold">{persona?.nome} {persona?.cognome}</h1>
            <p className="text-blue-200 mt-1">{progetto?.nome}</p>
          </div>
          {dashboard.meteoOggi && (
            <div className="text-center">
              <p className="text-4xl">{getMeteoIcon(dashboard.meteoOggi.code)}</p>
              <p className="text-2xl font-bold">{dashboard.meteoOggi.temp}°C</p>
            </div>
          )}
        </div>

        {/* Stato presenza oggi */}
        <div className="mt-4 p-3 bg-white/10 rounded-xl">
          {dashboard.miaPresenzaOggi ? (
            <div className="flex items-center gap-3">
              <span className="text-2xl">{dashboard.miaPresenzaOggi.ora_uscita ? '✅' : '🟢'}</span>
              <div>
                <p className="font-medium">
                  {dashboard.miaPresenzaOggi.ora_uscita ? 'Giornata completata' : 'Sei in cantiere'}
                </p>
                <p className="text-sm text-blue-200">
                  Entrata: {dashboard.miaPresenzaOggi.ora_entrata}
                  {dashboard.miaPresenzaOggi.ora_uscita && ` • Uscita: ${dashboard.miaPresenzaOggi.ora_uscita}`}
                </p>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <span className="text-2xl">⚪</span>
              <div>
                <p className="font-medium">Non hai ancora registrato l'entrata</p>
                <button onClick={() => navigate('/checkin')} className="text-sm text-blue-200 hover:text-white underline">
                  Vai al check-in →
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-3 lg:grid-cols-5 gap-3">
        {quickActions.map(action => (
          <button
            key={action.path}
            onClick={() => navigate(action.path)}
            className={`${action.color} text-white rounded-2xl p-4 flex flex-col items-center gap-2 hover:opacity-90 transition-opacity`}
          >
            <span className="text-2xl">{action.emoji}</span>
            <span className="text-sm font-medium">{action.label}</span>
          </button>
        ))}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-5 shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-3xl font-bold text-blue-600">{dashboard.presenzeOggi}</p>
              <p className="text-sm text-gray-500">Presenti oggi</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center text-2xl">👥</div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-3xl font-bold text-green-600">{dashboard.oreSettimana}</p>
              <p className="text-sm text-gray-500">Ore settimana</p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center text-2xl">⏱️</div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-3xl font-bold text-purple-600">{dashboard.richiestePendenti}</p>
              <p className="text-sm text-gray-500">Mie richieste</p>
            </div>
            <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center text-2xl">📋</div>
          </div>
        </div>

        {isAtLeast('supervisor') && (
          <div 
            className="bg-white rounded-2xl p-5 shadow-sm border cursor-pointer hover:border-red-300 transition-colors"
            onClick={() => navigate('/notifiche')}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-3xl font-bold text-red-600">{dashboard.approvazioni}</p>
                <p className="text-sm text-gray-500">Da approvare</p>
              </div>
              <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center text-2xl">🔔</div>
            </div>
          </div>
        )}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Ultima Attività */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border">
          <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <span>📍</span> Ultima Attività
          </h3>
          <div className="space-y-3">
            {dashboard.ultimaAttivita.length === 0 ? (
              <p className="text-gray-400 text-center py-4">Nessuna attività recente</p>
            ) : (
              dashboard.ultimaAttivita.map((att, i) => (
                <div key={i} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold ${att.ora_uscita ? 'bg-green-500' : 'bg-blue-500'}`}>
                    {att.persona?.nome?.[0]}{att.persona?.cognome?.[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-800 truncate">{att.persona?.nome} {att.persona?.cognome}</p>
                    <p className="text-xs text-gray-500">
                      {new Date(att.data).toLocaleDateString('it-IT')} • {att.ora_entrata}
                      {att.ora_uscita && ` - ${att.ora_uscita}`}
                    </p>
                  </div>
                  <span className="text-lg">{att.ora_uscita ? '✅' : '🟢'}</span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Prossime Assenze */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border">
          <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <span>🗓️</span> Prossime Assenze
          </h3>
          <div className="space-y-3">
            {dashboard.prossimiEventi.length === 0 ? (
              <p className="text-gray-400 text-center py-4">Nessuna assenza programmata</p>
            ) : (
              dashboard.prossimiEventi.map((ev, i) => (
                <div key={i} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                  <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center text-xl">
                    {ev.tipo === 'ferie' ? '🏖️' : ev.tipo === 'malattia' ? '🏥' : '📋'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-800 truncate">{ev.persona?.nome} {ev.persona?.cognome}</p>
                    <p className="text-xs text-gray-500">
                      {new Date(ev.data_inizio).toLocaleDateString('it-IT')}
                      {ev.data_inizio !== ev.data_fine && ` → ${new Date(ev.data_fine).toLocaleDateString('it-IT')}`}
                    </p>
                  </div>
                  <span className="px-2 py-1 text-xs font-medium bg-purple-100 text-purple-700 rounded-full capitalize">{ev.tipo}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Footer con info progetto */}
      <div className="bg-gray-50 rounded-2xl p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-2xl">🏗️</span>
          <div>
            <p className="font-medium text-gray-800">{progetto?.nome}</p>
            <p className="text-sm text-gray-500">{progetto?.citta || 'Località non specificata'}</p>
          </div>
        </div>
        <button 
          onClick={() => navigate('/impostazioni')} 
          className="text-blue-600 hover:text-blue-700 text-sm font-medium"
        >
          Impostazioni →
        </button>
      </div>
    </div>
  )
}
