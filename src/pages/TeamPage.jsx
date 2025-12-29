import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { 
  Users, 
  Search, 
  Phone, 
  Mail,
  Building,
  User,
  Loader2,
  CheckCircle,
  XCircle
} from 'lucide-react'

export default function TeamPage() {
  const { assegnazione } = useAuth()
  const [loading, setLoading] = useState(true)
  const [team, setTeam] = useState([])
  const [presenzeOggi, setPresenzeOggi] = useState({})
  const [search, setSearch] = useState('')
  const [filterRuolo, setFilterRuolo] = useState('tutti')

  const oggi = new Date().toISOString().split('T')[0]

  useEffect(() => {
    loadTeam()
  }, [])

  const loadTeam = async () => {
    try {
      // Carica team del progetto
      const { data: teamData } = await supabase
        .from('assegnazioni_progetto')
        .select(`
          *,
          persona:persone(*),
          ditta:ditte(ragione_sociale)
        `)
        .eq('progetto_id', assegnazione.progetto_id)
        .eq('attivo', true)
        .order('ruolo')

      setTeam(teamData || [])

      // Carica presenze di oggi
      const { data: presenzeData } = await supabase
        .from('presenze')
        .select('persona_id, ora_checkin')
        .eq('progetto_id', assegnazione.progetto_id)
        .eq('data', oggi)

      const presenzeMap = {}
      presenzeData?.forEach(p => {
        presenzeMap[p.persona_id] = p.ora_checkin
      })
      setPresenzeOggi(presenzeMap)

    } catch (error) {
      console.error('Error loading team:', error)
    } finally {
      setLoading(false)
    }
  }

  const getRuoloLabel = (ruolo) => {
    const labels = {
      admin: 'Admin',
      cm: 'Construction Manager',
      supervisor: 'Supervisor',
      foreman: 'Capo Squadra',
      helper: 'Operatore',
      office: 'Impiegato'
    }
    return labels[ruolo] || ruolo
  }

  const getRuoloColor = (ruolo) => {
    const colors = {
      admin: 'bg-purple-100 text-purple-800',
      cm: 'bg-blue-100 text-blue-800',
      supervisor: 'bg-green-100 text-green-800',
      foreman: 'bg-orange-100 text-orange-800',
      helper: 'bg-gray-100 text-gray-800',
      office: 'bg-pink-100 text-pink-800'
    }
    return colors[ruolo] || 'bg-gray-100 text-gray-800'
  }

  // Filtra team
  const filteredTeam = team.filter(member => {
    const matchSearch = 
      member.persona.nome.toLowerCase().includes(search.toLowerCase()) ||
      member.persona.cognome.toLowerCase().includes(search.toLowerCase())
    
    const matchRuolo = filterRuolo === 'tutti' || member.ruolo === filterRuolo
    
    return matchSearch && matchRuolo
  })

  // Raggruppa per ruolo
  const teamByRuolo = filteredTeam.reduce((acc, member) => {
    if (!acc[member.ruolo]) acc[member.ruolo] = []
    acc[member.ruolo].push(member)
    return acc
  }, {})

  const ruoloOrder = ['cm', 'supervisor', 'foreman', 'helper', 'office', 'admin']

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="animate-spin text-primary-600" size={32} />
      </div>
    )
  }

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-xl font-bold text-gray-800">Team Progetto</h1>
        <p className="text-sm text-gray-500">{team.length} persone assegnate</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="card text-center">
          <p className="text-2xl font-bold text-success-600">
            {Object.keys(presenzeOggi).length}
          </p>
          <p className="text-xs text-gray-500">Presenti oggi</p>
        </div>
        <div className="card text-center">
          <p className="text-2xl font-bold text-gray-400">
            {team.length - Object.keys(presenzeOggi).length}
          </p>
          <p className="text-xs text-gray-500">Assenti</p>
        </div>
      </div>

      {/* Search & Filter */}
      <div className="space-y-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="text"
            placeholder="Cerca per nome..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input pl-10"
          />
        </div>
        
        <div className="flex gap-2 overflow-x-auto pb-2">
          <button
            onClick={() => setFilterRuolo('tutti')}
            className={`px-3 py-1 rounded-full text-sm whitespace-nowrap ${
              filterRuolo === 'tutti' ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-600'
            }`}
          >
            Tutti
          </button>
          {ruoloOrder.filter(r => team.some(m => m.ruolo === r)).map(ruolo => (
            <button
              key={ruolo}
              onClick={() => setFilterRuolo(ruolo)}
              className={`px-3 py-1 rounded-full text-sm whitespace-nowrap ${
                filterRuolo === ruolo ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-600'
              }`}
            >
              {getRuoloLabel(ruolo)}
            </button>
          ))}
        </div>
      </div>

      {/* Team list */}
      <div className="space-y-4">
        {ruoloOrder.filter(r => teamByRuolo[r]).map(ruolo => (
          <div key={ruolo}>
            <h3 className="text-sm font-medium text-gray-500 mb-2 flex items-center gap-2">
              <User size={14} />
              {getRuoloLabel(ruolo)} ({teamByRuolo[ruolo].length})
            </h3>
            
            <div className="space-y-2">
              {teamByRuolo[ruolo].map(member => (
                <div key={member.id} className="card">
                  <div className="flex items-start gap-3">
                    {/* Avatar */}
                    <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                      <span className="text-gray-600 font-medium">
                        {member.persona.nome[0]}{member.persona.cognome[0]}
                      </span>
                    </div>
                    
                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium text-gray-800">
                          {member.persona.nome} {member.persona.cognome}
                        </h4>
                        {presenzeOggi[member.persona_id] ? (
                          <CheckCircle className="text-success-500" size={16} />
                        ) : (
                          <XCircle className="text-gray-300" size={16} />
                        )}
                      </div>
                      
                      <p className="text-sm text-gray-500">{member.qualifica}</p>
                      
                      {member.ditta && (
                        <p className="text-xs text-gray-400 flex items-center gap-1 mt-1">
                          <Building size={12} />
                          {member.ditta.ragione_sociale}
                        </p>
                      )}
                    </div>

                    {/* Badge ruolo */}
                    <span className={`badge ${getRuoloColor(member.ruolo)}`}>
                      {member.badge_number}
                    </span>
                  </div>

                  {/* Contact */}
                  <div className="flex gap-2 mt-3">
                    {member.persona.telefono && (
                      <a
                        href={`tel:${member.persona.telefono}`}
                        className="btn-ghost text-sm py-1 flex items-center gap-1"
                      >
                        <Phone size={14} />
                        Chiama
                      </a>
                    )}
                    {member.persona.email && (
                      <a
                        href={`mailto:${member.persona.email}`}
                        className="btn-ghost text-sm py-1 flex items-center gap-1"
                      >
                        <Mail size={14} />
                        Email
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
