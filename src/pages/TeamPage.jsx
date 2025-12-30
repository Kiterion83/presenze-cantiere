import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'

export default function TeamPage() {
  const { persona, assegnazione, progetto, isAtLeast } = useAuth()
  
  const [members, setMembers] = useState([])
  const [todayPresenze, setTodayPresenze] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedMember, setSelectedMember] = useState(null)
  const [filter, setFilter] = useState('all') // all, present, absent

  useEffect(() => {
    if (assegnazione?.progetto_id) {
      loadTeam()
      loadTodayPresenze()
    }
  }, [assegnazione?.progetto_id])

  const loadTeam = async () => {
    setLoading(true)
    
    // Carica membri del progetto
    const { data, error } = await supabase
      .from('assegnazioni_progetto')
      .select(`
        *,
        persona:persone(*),
        ditta:ditte(nome),
        squadra:squadre(nome)
      `)
      .eq('progetto_id', assegnazione.progetto_id)
      .eq('attivo', true)
      .order('ruolo')

    if (!error) {
      setMembers(data || [])
    }
    setLoading(false)
  }

  const loadTodayPresenze = async () => {
    const today = new Date().toISOString().split('T')[0]
    
    const { data, error } = await supabase
      .from('presenze')
      .select('*')
      .eq('progetto_id', assegnazione.progetto_id)
      .eq('data', today)

    if (!error) {
      setTodayPresenze(data || [])
    }
  }

  // Ottieni presenza di oggi per una persona
  const getPresenza = (personaId) => {
    return todayPresenze.find(p => p.persona_id === personaId)
  }

  // Stato presenza
  const getPresenzaStatus = (personaId) => {
    const presenza = getPresenza(personaId)
    if (!presenza) return { status: 'absent', label: 'Assente', color: 'gray' }
    if (presenza.ora_uscita) return { status: 'left', label: 'Uscito', color: 'blue' }
    if (presenza.ora_entrata) return { status: 'present', label: 'In cantiere', color: 'green' }
    if (presenza.stato === 'ferie') return { status: 'ferie', label: 'Ferie', color: 'purple' }
    if (presenza.stato === 'malattia') return { status: 'malattia', label: 'Malattia', color: 'red' }
    return { status: 'absent', label: 'Assente', color: 'gray' }
  }

  // Filtro membri
  const filteredMembers = members.filter(m => {
    if (filter === 'all') return true
    const status = getPresenzaStatus(m.persona.id).status
    if (filter === 'present') return status === 'present'
    if (filter === 'absent') return status === 'absent' || status === 'left'
    return true
  })

  // Raggruppa per ruolo
  const groupedMembers = filteredMembers.reduce((acc, m) => {
    const ruolo = m.ruolo || 'altro'
    if (!acc[ruolo]) acc[ruolo] = []
    acc[ruolo].push(m)
    return acc
  }, {})

  // Ordine ruoli
  const ruoloOrder = ['admin', 'cm', 'supervisor', 'foreman', 'office', 'helper']
  const sortedRoles = Object.keys(groupedMembers).sort((a, b) => 
    ruoloOrder.indexOf(a) - ruoloOrder.indexOf(b)
  )

  // Label ruoli
  const ruoloLabels = {
    admin: 'Amministratori',
    cm: 'Construction Manager',
    supervisor: 'Supervisori',
    foreman: 'Capisquadra',
    office: 'Impiegati',
    helper: 'Operai'
  }

  // Stats
  const stats = {
    totale: members.length,
    presenti: members.filter(m => getPresenzaStatus(m.persona.id).status === 'present').length,
    usciti: members.filter(m => getPresenzaStatus(m.persona.id).status === 'left').length,
    assenti: members.filter(m => ['absent', 'ferie', 'malattia'].includes(getPresenzaStatus(m.persona.id).status)).length,
  }

  return (
    <div className="p-4 lg:p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">👥 Team</h1>
          <p className="text-gray-500">{progetto?.nome}</p>
        </div>
        <button
          onClick={() => { loadTeam(); loadTodayPresenze(); }}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          🔄
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <p className="text-3xl font-bold text-gray-800">{stats.totale}</p>
          <p className="text-sm text-gray-500">Totale Team</p>
        </div>
        <div className="bg-green-50 rounded-xl p-4 border border-green-100">
          <p className="text-3xl font-bold text-green-600">{stats.presenti}</p>
          <p className="text-sm text-green-600">In cantiere</p>
        </div>
        <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
          <p className="text-3xl font-bold text-blue-600">{stats.usciti}</p>
          <p className="text-sm text-blue-600">Usciti oggi</p>
        </div>
        <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
          <p className="text-3xl font-bold text-gray-500">{stats.assenti}</p>
          <p className="text-sm text-gray-500">Assenti</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        {[
          { value: 'all', label: 'Tutti' },
          { value: 'present', label: '🟢 Presenti' },
          { value: 'absent', label: '⚪ Assenti' },
        ].map(f => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={`px-4 py-2 rounded-xl font-medium whitespace-nowrap transition-colors ${
              filter === f.value
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-8 text-gray-500">Caricamento...</div>
      ) : (
        <div className="space-y-6">
          {sortedRoles.map(ruolo => (
            <div key={ruolo}>
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
                {ruoloLabels[ruolo] || ruolo} ({groupedMembers[ruolo].length})
              </h2>
              <div className="grid gap-3 lg:grid-cols-2">
                {groupedMembers[ruolo].map(member => {
                  const presenzaInfo = getPresenzaStatus(member.persona.id)
                  const presenza = getPresenza(member.persona.id)
                  
                  return (
                    <div
                      key={member.id}
                      onClick={() => setSelectedMember(selectedMember?.id === member.id ? null : member)}
                      className={`bg-white rounded-xl p-4 shadow-sm border cursor-pointer transition-all ${
                        selectedMember?.id === member.id 
                          ? 'border-blue-300 ring-2 ring-blue-100' 
                          : 'border-gray-100 hover:border-gray-200'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        {/* Avatar */}
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center font-semibold ${
                          presenzaInfo.color === 'green' ? 'bg-green-100 text-green-600' :
                          presenzaInfo.color === 'blue' ? 'bg-blue-100 text-blue-600' :
                          presenzaInfo.color === 'purple' ? 'bg-purple-100 text-purple-600' :
                          presenzaInfo.color === 'red' ? 'bg-red-100 text-red-600' :
                          'bg-gray-100 text-gray-500'
                        }`}>
                          {member.persona.nome?.[0]}{member.persona.cognome?.[0]}
                        </div>
                        
                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-800 truncate">
                            {member.persona.nome} {member.persona.cognome}
                          </p>
                          <p className="text-sm text-gray-500 truncate">
                            {member.ditta?.nome || 'Committente'}
                            {member.squadra && ` • ${member.squadra.nome}`}
                          </p>
                        </div>

                        {/* Status */}
                        <div className="text-right">
                          <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${
                            presenzaInfo.color === 'green' ? 'bg-green-100 text-green-700' :
                            presenzaInfo.color === 'blue' ? 'bg-blue-100 text-blue-700' :
                            presenzaInfo.color === 'purple' ? 'bg-purple-100 text-purple-700' :
                            presenzaInfo.color === 'red' ? 'bg-red-100 text-red-700' :
                            'bg-gray-100 text-gray-600'
                          }`}>
                            {presenzaInfo.label}
                          </span>
                          {presenza?.ora_entrata && (
                            <p className="text-xs text-gray-400 mt-1">
                              {presenza.ora_entrata}
                              {presenza.ora_uscita && ` - ${presenza.ora_uscita}`}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Expanded Details */}
                      {selectedMember?.id === member.id && (
                        <div className="mt-4 pt-4 border-t border-gray-100">
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <p className="text-gray-500">Telefono</p>
                              <p className="font-medium">
                                {member.persona.telefono || '-'}
                              </p>
                            </div>
                            <div>
                              <p className="text-gray-500">Email</p>
                              <p className="font-medium truncate">
                                {member.persona.email || '-'}
                              </p>
                            </div>
                            {presenza && (
                              <>
                                <div>
                                  <p className="text-gray-500">Ore oggi</p>
                                  <p className="font-medium">
                                    {presenza.ore_ordinarie || 0}h + {presenza.ore_straordinarie || 0}h str.
                                  </p>
                                </div>
                                {presenza.note && (
                                  <div className="col-span-2">
                                    <p className="text-gray-500">Note</p>
                                    <p className="font-medium">{presenza.note}</p>
                                  </div>
                                )}
                              </>
                            )}
                          </div>
                          
                          {/* Actions */}
                          {isAtLeast('supervisor') && (
                            <div className="flex gap-2 mt-4">
                              <button className="flex-1 py-2 bg-blue-50 text-blue-600 rounded-lg text-sm font-medium hover:bg-blue-100">
                                📞 Chiama
                              </button>
                              <button className="flex-1 py-2 bg-gray-50 text-gray-600 rounded-lg text-sm font-medium hover:bg-gray-100">
                                📋 Storico
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
