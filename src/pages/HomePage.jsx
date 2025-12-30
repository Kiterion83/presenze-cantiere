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
  ArrowLeftRight,
  BarChart3,
  Settings,
  Building2,
  UserCog,
  Calendar,
  FileText,
  TrendingUp,
  UserCheck,
  Briefcase,
  FolderOpen
} from 'lucide-react'

export default function HomePage() {
  const { persona, assegnazione, progetto, ruolo, isAtLeast, testRoleOverride } = useAuth()
  const [presenzaOggi, setPresenzaOggi] = useState(null)
  const [stats, setStats] = useState({ presenti: 0, totale: 0 })
  const [meteo, setMeteo] = useState(null)
  const [loading, setLoading] = useState(true)
  const [adminStats, setAdminStats] = useState(null)

  const oggi = new Date().toISOString().split('T')[0]

  useEffect(() => {
    loadData()
  }, [ruolo])

  const loadData = async () => {
    try {
      // Carica presenza di oggi (per tutti)
      if (persona?.id && assegnazione?.progetto_id) {
        const { data: presenza } = await supabase
          .from('presenze')
          .select('*')
          .eq('persona_id', persona.id)
          .eq('progetto_id', assegnazione.progetto_id)
          .eq('data', oggi)
          .single()

        setPresenzaOggi(presenza)
      }

      // Carica statistiche presenze oggi
      if (assegnazione?.progetto_id) {
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
      }

      // Statistiche Admin/CM: tutti i progetti
      if (isAtLeast('cm')) {
        const { count: totaleProgetti } = await supabase
          .from('progetti')
          .select('*', { count: 'exact', head: true })

        const { count: totalePersone } = await supabase
          .from('persone')
          .select('*', { count: 'exact', head: true })

        const { count: rapportiniOggi } = await supabase
          .from('rapportini')
          .select('*', { count: 'exact', head: true })
          .eq('data', oggi)

        setAdminStats({
          progetti: totaleProgetti || 0,
          persone: totalePersone || 0,
          rapportiniOggi: rapportiniOggi || 0
        })
      }

      // Meteo placeholder
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

  const getRoleBadgeColor = () => {
    switch (ruolo) {
      case 'admin': return 'bg-red-100 text-red-700'
      case 'cm': return 'bg-purple-100 text-purple-700'
      case 'supervisor': return 'bg-blue-100 text-blue-700'
      case 'foreman': return 'bg-green-100 text-green-700'
      case 'office': return 'bg-yellow-100 text-yellow-700'
      default: return 'bg-gray-100 text-gray-700'
    }
  }

  // ============================================
  // DASHBOARD ADMIN
  // ============================================
  const AdminDashboard = () => (
    <>
      {/* KPI Cards */}
      <div className="grid grid-cols-3 gap-3">
        <div className="card bg-gradient-to-br from-blue-500 to-blue-600 text-white">
          <Building2 size={24} className="mb-2 opacity-80" />
          <p className="text-2xl font-bold">{adminStats?.progetti || 0}</p>
          <p className="text-xs opacity-80">Progetti</p>
        </div>
        <div className="card bg-gradient-to-br from-green-500 to-green-600 text-white">
          <Users size={24} className="mb-2 opacity-80" />
          <p className="text-2xl font-bold">{adminStats?.persone || 0}</p>
          <p className="text-xs opacity-80">Persone</p>
        </div>
        <div className="card bg-gradient-to-br from-orange-500 to-orange-600 text-white">
          <ClipboardList size={24} className="mb-2 opacity-80" />
          <p className="text-2xl font-bold">{adminStats?.rapportiniOggi || 0}</p>
          <p className="text-xs opacity-80">Rapportini oggi</p>
        </div>
      </div>

      {/* Quick Actions Admin */}
      <div className="card">
        <h3 className="font-semibold text-gray-700 mb-3">Azioni Rapide</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <Link to="/impostazioni" className="flex flex-col items-center p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition">
            <Settings className="text-gray-600 mb-1" size={24} />
            <span className="text-xs text-gray-600">Impostazioni</span>
          </Link>
          <Link to="/personale" className="flex flex-col items-center p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition">
            <UserCog className="text-gray-600 mb-1" size={24} />
            <span className="text-xs text-gray-600">Personale</span>
          </Link>
          <Link to="/statistiche" className="flex flex-col items-center p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition">
            <BarChart3 className="text-gray-600 mb-1" size={24} />
            <span className="text-xs text-gray-600">Statistiche</span>
          </Link>
          <Link to="/trasferimenti" className="flex flex-col items-center p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition">
            <ArrowLeftRight className="text-gray-600 mb-1" size={24} />
            <span className="text-xs text-gray-600">Trasferimenti</span>
          </Link>
        </div>
      </div>

      {/* Presenze Progetto Corrente */}
      <PresenzaCard />
    </>
  )

  // ============================================
  // DASHBOARD CM
  // ============================================
  const CMDashboard = () => (
    <>
      {/* KPI Progetto */}
      <div className="grid grid-cols-2 gap-3">
        <div className="card">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-50 rounded-lg">
              <UserCheck className="text-blue-600" size={24} />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-800">{stats.presenti}/{stats.totale}</p>
              <p className="text-xs text-gray-500">Presenti oggi</p>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-50 rounded-lg">
              <ClipboardList className="text-green-600" size={24} />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-800">{adminStats?.rapportiniOggi || 0}</p>
              <p className="text-xs text-gray-500">Rapportini oggi</p>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions CM */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <QuickActionCard to="/team" icon={Users} label="Team" sublabel="Gestisci" color="purple" />
        <QuickActionCard to="/rapportino" icon={ClipboardList} label="Rapportini" sublabel="Verifica" color="green" />
        <QuickActionCard to="/statistiche" icon={BarChart3} label="Statistiche" sublabel="Analizza" color="blue" />
        <QuickActionCard to="/impostazioni" icon={Settings} label="Impostazioni" sublabel="Configura" color="gray" />
      </div>

      <MeteoCard />
    </>
  )

  // ============================================
  // DASHBOARD SUPERVISOR
  // ============================================
  const SupervisorDashboard = () => (
    <>
      <PresenzaCard />
      <MeteoCard />
      
      {/* Quick Actions Supervisor */}
      <div className="grid grid-cols-2 gap-3">
        <QuickActionCard to="/team" icon={Users} label="Team" sublabel="Supervisiona" color="purple" />
        <QuickActionCard to="/rapportino" icon={ClipboardList} label="Rapportino" sublabel="Controlla" color="green" />
        <QuickActionCard to="/statistiche" icon={BarChart3} label="Statistiche" sublabel="Monitora" color="blue" />
        <QuickActionCard to="/personale" icon={UserCog} label="Personale" sublabel="Gestisci" color="orange" />
      </div>
    </>
  )

  // ============================================
  // DASHBOARD FOREMAN
  // ============================================
  const ForemanDashboard = () => (
    <>
      {/* Stato Check-in */}
      <CheckInStatusCard />
      
      <MeteoCard />

      {/* Quick Actions Foreman */}
      <div className="grid grid-cols-2 gap-3">
        <QuickActionCard to="/checkin" icon={MapPin} label="Check-in" sublabel="GPS + Meteo" color="primary" large />
        <QuickActionCard to="/rapportino" icon={ClipboardList} label="Rapportino" sublabel="Compila" color="green" large />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <QuickActionCard to="/team" icon={Users} label="Squadra" sublabel="Vedi" color="purple" />
        <QuickActionCard to="/trasferimenti" icon={ArrowLeftRight} label="Trasferimenti" sublabel="Gestisci" color="orange" />
      </div>

      <PresenzaCard compact />
    </>
  )

  // ============================================
  // DASHBOARD HELPER
  // ============================================
  const HelperDashboard = () => (
    <>
      {/* Stato Check-in Grande */}
      <CheckInStatusCard large />
      
      <MeteoCard />

      {/* Azione principale: Check-in */}
      <Link 
        to="/checkin" 
        className="card bg-gradient-to-r from-primary-500 to-primary-600 text-white hover:shadow-lg transition-all"
      >
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold">
              {presenzaOggi ? 'Effettua Check-out' : 'Effettua Check-in'}
            </h3>
            <p className="text-sm text-primary-100">
              {presenzaOggi ? 'Registra la tua uscita' : 'Registra la tua presenza'}
            </p>
          </div>
          <MapPin size={40} className="opacity-80" />
        </div>
      </Link>

      {/* Info rapide */}
      <div className="grid grid-cols-2 gap-3">
        <Link to="/team" className="card hover:shadow-md transition">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-50 rounded-lg">
              <Users className="text-purple-600" size={20} />
            </div>
            <div>
              <p className="font-medium text-gray-800">Team</p>
              <p className="text-xs text-gray-500">{stats.presenti} presenti</p>
            </div>
          </div>
        </Link>
        <div className="card">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-50 rounded-lg">
              <Clock className="text-blue-600" size={20} />
            </div>
            <div>
              <p className="font-medium text-gray-800">Ore oggi</p>
              <p className="text-xs text-gray-500">
                {presenzaOggi ? calcOre(presenzaOggi.ora_checkin, presenzaOggi.ora_checkout) : '0h 0m'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  )

  // ============================================
  // DASHBOARD OFFICE
  // ============================================
  const OfficeDashboard = () => (
    <>
      <PresenzaCard />
      
      {/* Quick Actions Office */}
      <div className="grid grid-cols-2 gap-3">
        <QuickActionCard to="/statistiche" icon={BarChart3} label="Statistiche" sublabel="Report" color="blue" large />
        <QuickActionCard to="/team" icon={Users} label="Personale" sublabel="Anagrafica" color="purple" large />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <QuickActionCard to="/checkin" icon={MapPin} label="Check-in" sublabel="Presenza" color="primary" />
        <QuickActionCard to="/rapportino" icon={FileText} label="Documenti" sublabel="Archivio" color="gray" />
      </div>
    </>
  )

  // ============================================
  // COMPONENTI RIUTILIZZABILI
  // ============================================
  
  const CheckInStatusCard = ({ large = false }) => (
    <div className={`card ${presenzaOggi ? 'bg-green-50 border-green-200' : 'bg-yellow-50 border-yellow-200'} border`}>
      <div className="flex items-center gap-3">
        {presenzaOggi ? (
          <>
            <CheckCircle className="text-green-600" size={large ? 32 : 24} />
            <div>
              <p className={`font-semibold text-green-800 ${large ? 'text-lg' : ''}`}>
                Check-in effettuato
              </p>
              <p className="text-sm text-green-600">
                Entrata: {presenzaOggi.ora_checkin?.slice(0, 5)}
                {presenzaOggi.ora_checkout && ` • Uscita: ${presenzaOggi.ora_checkout?.slice(0, 5)}`}
              </p>
            </div>
          </>
        ) : (
          <>
            <Clock className="text-yellow-600" size={large ? 32 : 24} />
            <div>
              <p className={`font-semibold text-yellow-800 ${large ? 'text-lg' : ''}`}>
                Check-in non effettuato
              </p>
              <p className="text-sm text-yellow-600">
                Registra la tua presenza
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  )

  const PresenzaCard = ({ compact = false }) => (
    <div className="card">
      <h3 className="text-sm font-medium text-gray-500 mb-2">Presenze oggi nel progetto</h3>
      <div className="flex items-end gap-2">
        <span className={`font-bold text-gray-800 ${compact ? 'text-2xl' : 'text-3xl'}`}>{stats.presenti}</span>
        <span className="text-gray-400 mb-1">/ {stats.totale}</span>
      </div>
      <div className="mt-2 h-2 bg-gray-100 rounded-full overflow-hidden">
        <div 
          className="h-full bg-primary-500 rounded-full transition-all"
          style={{ width: `${stats.totale > 0 ? (stats.presenti / stats.totale) * 100 : 0}%` }}
        />
      </div>
    </div>
  )

  const MeteoCard = () => meteo && (
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
            <p className="text-2xl font-bold text-gray-800">{meteo.temperatura}°C</p>
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
        <div className="mt-3 flex items-center gap-2 text-amber-700 bg-amber-50 p-2 rounded-lg">
          <AlertTriangle size={18} />
          <span className="text-sm font-medium">{meteo.alert}</span>
        </div>
      )}
    </div>
  )

  const QuickActionCard = ({ to, icon: Icon, label, sublabel, color, large = false }) => {
    const colorClasses = {
      primary: 'bg-primary-50 text-primary-600',
      green: 'bg-green-50 text-green-600',
      blue: 'bg-blue-50 text-blue-600',
      purple: 'bg-purple-50 text-purple-600',
      orange: 'bg-orange-50 text-orange-600',
      gray: 'bg-gray-50 text-gray-600',
    }

    return (
      <Link 
        to={to}
        className={`card hover:shadow-md transition-shadow flex flex-col items-center ${large ? 'py-6' : 'py-4'}`}
      >
        <div className={`p-3 rounded-xl mb-2 ${colorClasses[color]}`}>
          <Icon size={large ? 28 : 24} />
        </div>
        <span className="font-medium text-gray-800">{label}</span>
        <span className="text-xs text-gray-500">{sublabel}</span>
      </Link>
    )
  }

  // Helper per calcolo ore
  const calcOre = (checkin, checkout) => {
    if (!checkin) return '0h 0m'
    const start = new Date(`2000-01-01T${checkin}`)
    const end = checkout ? new Date(`2000-01-01T${checkout}`) : new Date()
    const diff = (end - start) / 1000 / 60 // minuti
    const ore = Math.floor(diff / 60)
    const minuti = Math.floor(diff % 60)
    return `${ore}h ${minuti}m`
  }

  // ============================================
  // RENDER PRINCIPALE
  // ============================================
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
      </div>
    )
  }

  return (
    <div className="p-4 space-y-4 max-w-2xl mx-auto">
      {/* Greeting Card */}
      <div className="card bg-gradient-to-r from-primary-600 to-primary-700 text-white">
        <div className="flex items-start justify-between">
          <div>
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
          </div>
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getRoleBadgeColor()}`}>
            {ruolo?.toUpperCase()}
          </span>
        </div>
        
        {/* Info progetto */}
        <div className="mt-3 pt-3 border-t border-primary-500/30">
          <p className="text-sm text-primary-100">
            <Building2 size={14} className="inline mr-1" />
            {progetto?.nome || 'Nessun progetto'}
          </p>
        </div>
      </div>

      {/* Test Mode Banner */}
      {testRoleOverride && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-center gap-2">
          <AlertTriangle className="text-amber-600" size={18} />
          <span className="text-sm text-amber-700">
            <strong>Test Mode:</strong> Stai visualizzando come <strong>{ruolo}</strong>
          </span>
        </div>
      )}

      {/* Dashboard per ruolo */}
      {ruolo === 'admin' && <AdminDashboard />}
      {ruolo === 'cm' && <CMDashboard />}
      {ruolo === 'supervisor' && <SupervisorDashboard />}
      {ruolo === 'foreman' && <ForemanDashboard />}
      {ruolo === 'helper' && <HelperDashboard />}
      {ruolo === 'office' && <OfficeDashboard />}

      {/* Fallback se ruolo non riconosciuto */}
      {!['admin', 'cm', 'supervisor', 'foreman', 'helper', 'office'].includes(ruolo) && (
        <HelperDashboard />
      )}

      {/* Footer Info */}
      <div className="card bg-gray-50 border-0">
        <p className="text-xs text-gray-500 text-center">
          {progetto?.indirizzo}, {progetto?.citta}
        </p>
      </div>
    </div>
  )
}
