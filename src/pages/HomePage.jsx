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
  Cloud,
  Wind,
  Droplets,
  AlertTriangle,
  CheckCircle,
  ArrowLeftRight
} from 'lucide-react'

export default function HomePage() {
  const { persona, assegnazione, progetto, isAtLeast } = useAuth()
  const [presenzaOggi, setPresenzaOggi] = useState(null)
  const [stats, setStats] = useState({ presenti: 0, totale: 0 })
  const [meteo, setMeteo] = useState(null)
  const [loading, setLoading] = useState(true)

  const oggi = new Date().toISOString().split('T')[0]
  const oraCorrente = new Date().toLocaleTimeString('it-IT', { 
    hour: '2-digit', 
    minute: '2-digit' 
  })

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      // Carica presenza di oggi
      const { data: presenza } = await supabase
        .from('presenze')
        .select('*')
        .eq('persona_id', persona.id)
        .eq('progetto_id', assegnazione.progetto_id)
        .eq('data', oggi)
        .single()

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

      // Meteo placeholder (in produzione userai un'API vera)
      setMeteo({
        temperatura: 8,
        vento: 15,
        pioggia: 0,
        descrizione: 'Parzialmente nuvoloso',
        alert: null
      })

    } catch (error) {
      console.error('Error loading data:', error)
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

  return (
    <div className="p-4 space-y-4">
      {/* Greeting Card */}
      <div className="card bg-gradient-to-r from-primary-600 to-primary-700 text-white">
        <h2 className="text-xl font-bold">
          {getGreeting()}, {persona?.nome}!
        </h2>
        <p className="text-primary-100 text-sm mt-1">
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
        <div className="card">
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
            <div className="mt-3 flex items-center gap-2 text-warning-600 bg-warning-50 p-2 rounded-lg">
              <AlertTriangle size={18} />
              <span className="text-sm font-medium">{meteo.alert}</span>
            </div>
          )}
        </div>
      )}

      {/* Stats Card */}
      <div className="card">
        <h3 className="text-sm font-medium text-gray-500 mb-3">Presenze oggi</h3>
        <div className="flex items-end gap-2">
          <span className="text-3xl font-bold text-gray-800">{stats.presenti}</span>
          <span className="text-gray-400 mb-1">/ {stats.totale}</span>
        </div>
        <div className="mt-2 h-2 bg-gray-100 rounded-full overflow-hidden">
          <div 
            className="h-full bg-primary-500 rounded-full transition-all"
            style={{ width: `${(stats.presenti / stats.totale) * 100}%` }}
          />
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-3">
        <Link 
          to="/checkin" 
          className="card hover:shadow-md transition-shadow flex flex-col items-center py-6"
        >
          <div className="p-3 bg-primary-50 rounded-xl mb-2">
            <MapPin className="text-primary-600" size={28} />
          </div>
          <span className="font-medium text-gray-800">Check-in</span>
          <span className="text-xs text-gray-500">GPS + Meteo</span>
        </Link>

        {isAtLeast('foreman') && (
          <Link 
            to="/rapportino" 
            className="card hover:shadow-md transition-shadow flex flex-col items-center py-6"
          >
            <div className="p-3 bg-success-50 rounded-xl mb-2">
              <ClipboardList className="text-success-600" size={28} />
            </div>
            <span className="font-medium text-gray-800">Rapportino</span>
            <span className="text-xs text-gray-500">Ore e attività</span>
          </Link>
        )}

        <Link 
          to="/team" 
          className="card hover:shadow-md transition-shadow flex flex-col items-center py-6"
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
            className="card hover:shadow-md transition-shadow flex flex-col items-center py-6"
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
      <div className="card bg-gray-50 border-0">
        <p className="text-xs text-gray-500 text-center">
          {progetto?.indirizzo}, {progetto?.citta}
        </p>
      </div>
    </div>
  )
}
