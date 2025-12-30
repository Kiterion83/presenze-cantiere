import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { 
  MapPin, 
  ClipboardList, 
  Users, 
  Clock,
  Sun,
  Wind,
  Droplets,
  AlertTriangle,
  CheckCircle,
  ArrowLeftRight
} from 'lucide-react'

export default function HomePage() {
  const { persona, assegnazione, progetto, isAtLeast, user } = useAuth()
  const [presenzaOggi, setPresenzaOggi] = useState(null)
  const [stats, setStats] = useState({ presenti: 0, totale: 0 })
  const [meteo, setMeteo] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const oggi = new Date().toISOString().split('T')[0]

  useEffect(() => {
    console.log('HomePage mounted')
    console.log('User:', user)
    console.log('Persona:', persona)
    console.log('Assegnazione:', assegnazione)
    
    // Aspetta che i dati siano caricati
    const timer = setTimeout(() => {
      if (persona && assegnazione) {
        loadData()
      } else {
        setLoading(false)
        if (!persona) {
          setError('Persona non trovata nel database')
        } else if (!assegnazione) {
          setError('Nessuna assegnazione attiva trovata')
        }
      }
    }, 500)

    return () => clearTimeout(timer)
  }, [persona, assegnazione])

  const loadData = async () => {
    console.log('Loading data...')
    
    try {
      // Carica presenza di oggi
      const { data: presenza, error: errPresenza } = await supabase
        .from('presenze')
        .select('*')
        .eq('persona_id', persona.id)
        .eq('progetto_id', assegnazione.progetto_id)
        .eq('data', oggi)
        .maybeSingle()

      console.log('Presenza:', presenza, errPresenza)
      setPresenzaOggi(presenza)

      // Carica statistiche presenze oggi
      const { count: presenti } = await supabase
        .from('presenze')
        .select('*', { count: 'exact', head: true })
        .eq('progetto_id', assegnazione.progetto_id)
        .eq('data', oggi)

      const { count: totale } = await supabase
        .from('assegnazioni_progetto')
        .select('*', { count: 'exact', head: true })
        .eq('progetto_id', assegnazione.progetto_id)
        .eq('attivo', true)

      setStats({ presenti: presenti || 0, totale: totale || 0 })

      // Meteo placeholder
      setMeteo({
        temperatura: 8,
        vento: 15,
        pioggia: 0,
        descrizione: 'Parzialmente nuvoloso',
        alert: null
      })

    } catch (err) {
      console.error('Error loading data:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const getGreeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return 'Buongiorno'
    if (hour < 18) return 'Buon pomeriggio'
    return 'Buonasera'
  }

  // Loading state
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <p className="text-gray-500 text-sm">Caricamento...</p>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="p-4">
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <h2 className="text-red-800 font-bold mb-2">Errore</h2>
          <p className="text-red-600 text-sm">{error}</p>
          <p className="text-red-500 text-xs mt-2">
            User ID: {user?.id || 'non disponibile'}
          </p>
        </div>
      </div>
    )
  }

  // No persona state
  if (!persona) {
    return (
      <div className="p-4">
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
          <h2 className="text-yellow-800 font-bold mb-2">Configurazione incompleta</h2>
          <p className="text-yellow-600 text-sm">
            Il tuo account non è collegato a una persona nel sistema.
          </p>
          <p className="text-yellow-500 text-xs mt-2">
            Contatta l'amministratore.
          </p>
        </div>
      </div>
    )
  }

  // No assegnazione state
  if (!assegnazione) {
    return (
      <div className="p-4">
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
          <h2 className="text-yellow-800 font-bold mb-2">Nessun progetto assegnato</h2>
          <p className="text-yellow-600 text-sm">
            Ciao {persona.nome}! Non hai ancora un progetto attivo assegnato.
          </p>
          <p className="text-yellow-500 text-xs mt-2">
            Contatta l'amministratore per essere assegnato a un progetto.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 space-y-4">
      {/* Greeting Card */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl p-4">
        <h2 className="text-xl font-bold">
          {getGreeting()}, {persona?.nome || 'Utente'}!
        </h2>
        <p className="text-blue-100 text-sm mt-1">
          {new Date().toLocaleDateString('it-IT', { 
            weekday: 'long', 
            day: 'numeric', 
            month: 'long' 
          })}
        </p>
        
        {/* Stato presenza */}
        <div className="mt-4 flex items-center gap-2">
          {presenzaOggi ? (
            <>
              <CheckCircle className="text-green-300" size={20} />
              <span className="text-sm">
                Check-in effettuato alle {presenzaOggi.ora_checkin?.slice(0, 5)}
              </span>
            </>
          ) : (
            <>
              <Clock className="text-yellow-300" size={20} />
              <span className="text-sm">Check-in non effettuato</span>
            </>
          )}
        </div>
      </div>

      {/* Meteo Card */}
      {meteo && (
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-50 rounded-lg">
                {meteo.pioggia > 0 ? (
                  <Droplets className="text-blue-500" size={24} />
                ) : (
                  <Sun className="text-yellow-500" size={24} />
                )}
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-800">
                  {meteo.temperatura}°C
                </p>
                <p className="text-sm text-gray-500">{meteo.descrizione}</p>
              </div>
            </div>
            
            <div className="text-right text-sm text-gray-500">
              <div className="flex items-center gap-1 justify-end">
                <Wind size={14} />
                <span>{meteo.vento} km/h</span>
              </div>
              <div className="flex items-center gap-1 justify-end mt-1">
                <Droplets size={14} />
                <span>{meteo.pioggia} mm</span>
              </div>
            </div>
          </div>

          {meteo.alert && (
            <div className="mt-3 flex items-center gap-2 text-amber-600 bg-amber-50 p-2 rounded-lg">
              <AlertTriangle size={18} />
              <span className="text-sm font-medium">{meteo.alert}</span>
            </div>
          )}
        </div>
      )}

      {/* Stats Card */}
      <div className="bg-white rounded-xl p-4 shadow-sm">
        <h3 className="text-sm font-medium text-gray-500 mb-3">Presenze oggi</h3>
        <div className="flex items-end gap-2">
          <span className="text-3xl font-bold text-gray-800">{stats.presenti}</span>
          <span className="text-gray-400 mb-1">/ {stats.totale}</span>
        </div>
        <div className="mt-2 h-2 bg-gray-100 rounded-full overflow-hidden">
          <div 
            className="h-full bg-blue-500 rounded-full transition-all"
            style={{ width: `${stats.totale > 0 ? (stats.presenti / stats.totale) * 100 : 0}%` }}
          />
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-3">
        <Link 
          to="/checkin" 
          className="bg-white rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow flex flex-col items-center py-6"
        >
          <div className="p-3 bg-blue-50 rounded-xl mb-2">
            <MapPin className="text-blue-600" size={28} />
          </div>
          <span className="font-medium text-gray-800">Check-in</span>
          <span className="text-xs text-gray-500">GPS + Meteo</span>
        </Link>

        {isAtLeast('foreman') && (
          <Link 
            to="/rapportino" 
            className="bg-white rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow flex flex-col items-center py-6"
          >
            <div className="p-3 bg-green-50 rounded-xl mb-2">
              <ClipboardList className="text-green-600" size={28} />
            </div>
            <span className="font-medium text-gray-800">Rapportino</span>
            <span className="text-xs text-gray-500">Ore e attività</span>
          </Link>
        )}

        <Link 
          to="/team" 
          className="bg-white rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow flex flex-col items-center py-6"
        >
          <div className="p-3 bg-purple-50 rounded-xl mb-2">
            <Users className="text-purple-600" size={28} />
          </div>
          <span className="font-medium text-gray-800">Team</span>
          <span className="text-xs text-gray-500">Squadra</span>
        </Link>

        {isAtLeast('foreman') && (
          <Link 
            to="/trasferimenti" 
            className="bg-white rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow flex flex-col items-center py-6"
          >
            <div className="p-3 bg-orange-50 rounded-xl mb-2">
              <ArrowLeftRight className="text-orange-600" size={28} />
            </div>
            <span className="font-medium text-gray-800">Trasferimenti</span>
            <span className="text-xs text-gray-500">Risorse</span>
          </Link>
        )}
      </div>

      {/* Info progetto */}
      <div className="bg-gray-50 rounded-xl p-4">
        <p className="text-xs text-gray-500 text-center">
          {progetto?.indirizzo || 'Indirizzo'}, {progetto?.citta || 'Città'}
        </p>
      </div>
    </div>
  )
}
