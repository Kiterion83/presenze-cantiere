import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'

export default function TeamPage() {
  const { assegnazione, progetto, isAtLeast } = useAuth()
  const [members, setMembers] = useState([])
  const [todayPresenze, setTodayPresenze] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [selectedMember, setSelectedMember] = useState(null)

  useEffect(() => {
    if (assegnazione?.progetto_id) {
      loadTeam()
      loadTodayPresenze()
    }
  }, [assegnazione?.progetto_id])

  const loadTeam = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('assegnazioni_progetto')
      .select('*, persona:persone(*), ditta:ditte(nome), squadra:squadre(nome)')
      .eq('progetto_id', assegnazione.progetto_id)
      .eq('attivo', true)
      .order('ruolo')
    setMembers(data || [])
    setLoading(false)
  }

  const loadTodayPresenze = async () => {
    const today = new Date().toISOString().split('T')[0]
    const { data } = await supabase
      .from('presenze')
      .select('*')
      .eq('progetto_id', assegnazione.progetto_id)
      .eq('data', today)
    setTodayPresenze(data || [])
  }

  const getPresenza = (personaId) => todayPresenze.find(p => p.persona_id === personaId)

  const getStatus = (personaId) => {
    const p = getPresenza(personaId)
    if (!p) return { status: 'absent', label: 'Assente', color: 'gray' }
    if (p.ora_uscita) return { status: 'left', label: 'Uscito', color: 'blue' }
    if (p.ora_entrata) return { status: 'present', label: 'In cantiere', color: 'green' }
    return { status: 'absent', label: 'Assente', color: 'gray' }
  }

  const filteredMembers = members.filter(m => {
    if (filter === 'all') return true
    const s = getStatus(m.persona.id).status
    if (filter === 'present') return s === 'present'
    if (filter === 'absent') return s === 'absent' || s === 'left'
    return true
  })

  const grouped = filteredMembers.reduce((acc, m) => {
    const r = m.ruolo || 'altro'
    if (!acc[r]) acc[r] = []
    acc[r].push(m)
    return acc
  }, {})

  const order = ['admin', 'cm', 'supervisor', 'foreman', 'office', 'helper']
  const sortedRoles = Object.keys(grouped).sort((a, b) => order.indexOf(a) - order.indexOf(b))
  const labels = { admin: 'Admin', cm: 'Construction Manager', supervisor: 'Supervisori', foreman: 'Capisquadra', office: 'Impiegati', helper: 'Operai' }

  const stats = {
    totale: members.length,
    presenti: members.filter(m => getStatus(m.persona.id).status === 'present').length,
    usciti: members.filter(m => getStatus(m.persona.id).status === 'left').length,
  }

  return (
    <div className="p-4 lg:p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">👥 Team</h1>
          <p className="text-gray-500">{progetto?.nome}</p>
        </div>
        <button onClick={() => { loadTeam(); loadTodayPresenze() }} className="p-2 hover:bg-gray-100 rounded-lg">🔄</button>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl p-4 shadow-sm border"><p className="text-2xl font-bold">{stats.totale}</p><p className="text-sm text-gray-500">Totale</p></div>
        <div className="bg-green-50 rounded-xl p-4 border-green-100"><p className="text-2xl font-bold text-green-600">{stats.presenti}</p><p className="text-sm text-green-600">Presenti</p></div>
        <div className="bg-blue-50 rounded-xl p-4 border-blue-100"><p className="text-2xl font-bold text-blue-600">{stats.usciti}</p><p className="text-sm text-blue-600">Usciti</p></div>
      </div>

      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        {[{ value: 'all', label: 'Tutti' }, { value: 'present', label: '🟢 Presenti' }, { value: 'absent', label: '⚪ Assenti' }].map(f => (
          <button key={f.value} onClick={() => setFilter(f.value)} className={`px-4 py-2 rounded-xl font-medium whitespace-nowrap ${filter === f.value ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 border'}`}>
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
              <h2 className="text-sm font-semibold text-gray-500 uppercase mb-3">{labels[ruolo] || ruolo} ({grouped[ruolo].length})</h2>
              <div className="grid gap-3 lg:grid-cols-2">
                {grouped[ruolo].map(member => {
                  const info = getStatus(member.persona.id)
                  const p = getPresenza(member.persona.id)
                  return (
                    <div key={member.id} onClick={() => setSelectedMember(selectedMember?.id === member.id ? null : member)}
                      className={`bg-white rounded-xl p-4 shadow-sm border cursor-pointer ${selectedMember?.id === member.id ? 'border-blue-300 ring-2 ring-blue-100' : 'hover:border-gray-200'}`}>
                      <div className="flex items-center gap-3">
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center font-semibold ${info.color === 'green' ? 'bg-green-100 text-green-600' : info.color === 'blue' ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-500'}`}>
                          {member.persona.nome?.[0]}{member.persona.cognome?.[0]}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-800 truncate">{member.persona.nome} {member.persona.cognome}</p>
                          <p className="text-sm text-gray-500 truncate">{member.ditta?.nome || 'Committente'}</p>
                        </div>
                        <div className="text-right">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${info.color === 'green' ? 'bg-green-100 text-green-700' : info.color === 'blue' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}`}>
                            {info.label}
                          </span>
                          {p?.ora_entrata && <p className="text-xs text-gray-400 mt-1">{p.ora_entrata}{p.ora_uscita && ` - ${p.ora_uscita}`}</p>}
                        </div>
                      </div>
                      {selectedMember?.id === member.id && (
                        <div className="mt-4 pt-4 border-t grid grid-cols-2 gap-4 text-sm">
                          <div><p className="text-gray-500">Telefono</p><p className="font-medium">{member.persona.telefono || '-'}</p></div>
                          <div><p className="text-gray-500">Email</p><p className="font-medium truncate">{member.persona.email || '-'}</p></div>
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
