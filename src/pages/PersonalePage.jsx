import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { Users, Plus, Edit2, Search, X, Save, Loader2, Check, AlertCircle, UserPlus, Building } from 'lucide-react'

export default function PersonalePage() {
  const { assegnazione, isAtLeast } = useAuth()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [persone, setPersone] = useState([])
  const [ditte, setDitte] = useState([])
  const [progetti, setProgetti] = useState([])
  const [search, setSearch] = useState('')
  const [filterRuolo, setFilterRuolo] = useState('tutti')
  const [message, setMessage] = useState({ type: '', text: '' })
  const [showForm, setShowForm] = useState(false)
  const [editingPersona, setEditingPersona] = useState(null)
  const [formMode, setFormMode] = useState('persona')
  const [form, setForm] = useState({
    nome: '', cognome: '', email: '', telefono: '', codice_fiscale: '',
    progetto_id: '', ditta_id: '', ruolo: 'helper', qualifica: '', badge_number: ''
  })

  useEffect(() => { loadData() }, [])

  const loadData = async () => {
    try {
      const { data: personeData } = await supabase
        .from('persone')
        .select(`*, assegnazioni:assegnazioni_progetto(*, progetto:progetti(id, nome, codice), ditta:ditte(id, ragione_sociale))`)
        .eq('attivo', true)
        .order('cognome')
      setPersone(personeData || [])

      const { data: ditteData } = await supabase.from('ditte').select('*').eq('attiva', true).order('ragione_sociale')
      setDitte(ditteData || [])

      const { data: progettiData } = await supabase.from('progetti').select('*').eq('stato', 'attivo').order('nome')
      setProgetti(progettiData || [])
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setForm({ nome: '', cognome: '', email: '', telefono: '', codice_fiscale: '', progetto_id: assegnazione.progetto_id, ditta_id: '', ruolo: 'helper', qualifica: '', badge_number: '' })
    setEditingPersona(null)
    setShowForm(false)
    setFormMode('persona')
  }

  const handleEdit = (persona) => {
    setForm({ nome: persona.nome, cognome: persona.cognome, email: persona.email || '', telefono: persona.telefono || '', codice_fiscale: persona.codice_fiscale || '', progetto_id: assegnazione.progetto_id, ditta_id: '', ruolo: 'helper', qualifica: '', badge_number: '' })
    setEditingPersona(persona)
    setFormMode('persona')
    setShowForm(true)
  }

  const handleAddAssegnazione = (persona) => {
    setForm({ ...form, nome: persona.nome, cognome: persona.cognome, progetto_id: assegnazione.progetto_id, ditta_id: '', ruolo: 'helper', qualifica: '', badge_number: '' })
    setEditingPersona(persona)
    setFormMode('assegnazione')
    setShowForm(true)
  }

  const handleSave = async () => {
    if (!form.nome || !form.cognome) {
      setMessage({ type: 'error', text: 'Nome e cognome obbligatori' })
      return
    }
    setSaving(true)
    setMessage({ type: '', text: '' })

    try {
      let personaId = editingPersona?.id

      if (formMode === 'persona') {
        const personaData = { nome: form.nome, cognome: form.cognome, email: form.email || null, telefono: form.telefono || null, codice_fiscale: form.codice_fiscale || null, attivo: true }
        if (editingPersona) {
          await supabase.from('persone').update(personaData).eq('id', editingPersona.id)
        } else {
          const { data } = await supabase.from('persone').insert(personaData).select().single()
          personaId = data.id
        }
      }

      if ((formMode === 'assegnazione' || !editingPersona) && form.progetto_id && form.ditta_id) {
        await supabase.from('assegnazioni_progetto').insert({
          persona_id: personaId,
          progetto_id: form.progetto_id,
          ditta_id: form.ditta_id,
          ruolo: form.ruolo,
          qualifica: form.qualifica || null,
          badge_number: form.badge_number || null,
          attivo: true
        })
      }

      setMessage({ type: 'success', text: 'Salvato!' })
      resetForm()
      loadData()
    } catch (error) {
      setMessage({ type: 'error', text: error.message })
    } finally {
      setSaving(false)
    }
  }

  const handleDisattivaAssegnazione = async (assId) => {
    if (!confirm('Disattivare questa assegnazione?')) return
    await supabase.from('assegnazioni_progetto').update({ attivo: false, data_fine: new Date().toISOString().split('T')[0] }).eq('id', assId)
    loadData()
  }

  const getRuoloLabel = (r) => ({ admin: 'Admin', cm: 'CM', supervisor: 'Supervisor', foreman: 'Foreman', helper: 'Operatore', office: 'Ufficio' }[r] || r)
  const getRuoloColor = (r) => ({ admin: 'bg-purple-100 text-purple-700', cm: 'bg-blue-100 text-blue-700', supervisor: 'bg-green-100 text-green-700', foreman: 'bg-orange-100 text-orange-700', helper: 'bg-gray-100 text-gray-700', office: 'bg-pink-100 text-pink-700' }[r] || 'bg-gray-100')

  const filtered = persone.filter(p => {
    const matchSearch = `${p.nome} ${p.cognome} ${p.email || ''}`.toLowerCase().includes(search.toLowerCase())
    if (filterRuolo === 'tutti') return matchSearch
    return matchSearch && p.assegnazioni?.some(a => a.ruolo === filterRuolo && a.attivo)
  })

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="animate-spin text-blue-600" size={32} /></div>

  return (
    <div className="p-4 space-y-4 pb-24">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-800">Gestione Personale</h1>
          <p className="text-sm text-gray-500">{persone.length} persone</p>
        </div>
        <button type="button" onClick={() => { resetForm(); setShowForm(true); }} className="flex items-center gap-1 px-3 py-2 bg-blue-600 text-white rounded-lg text-sm">
          <UserPlus size={18} /> Nuovo
        </button>
      </div>

      {message.text && (
        <div className={`p-3 rounded-lg flex items-center gap-2 ${message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
          {message.type === 'success' ? <Check size={18} /> : <AlertCircle size={18} />}
          {message.text}
        </div>
      )}

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
        <input type="text" placeholder="Cerca..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full pl-10 pr-4 py-2 border rounded-lg" />
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {['tutti', 'cm', 'supervisor', 'foreman', 'helper'].map(r => (
          <button key={r} type="button" onClick={() => setFilterRuolo(r)} className={`px-3 py-1 rounded-full text-sm whitespace-nowrap ${filterRuolo === r ? 'bg-blue-600 text-white' : 'bg-gray-100'}`}>
            {r === 'tutti' ? 'Tutti' : getRuoloLabel(r)}
          </button>
        ))}
      </div>

      <div className="space-y-2">
        {filtered.map(p => (
          <div key={p.id} className="bg-white rounded-xl border p-3">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center text-sm font-medium">{p.nome[0]}{p.cognome[0]}</div>
                <div>
                  <h3 className="font-medium">{p.nome} {p.cognome}</h3>
                  {p.email && <p className="text-xs text-gray-500">{p.email}</p>}
                </div>
              </div>
              <div className="flex gap-1">
                <button type="button" onClick={() => handleEdit(p)} className="p-1.5 hover:bg-gray-100 rounded"><Edit2 size={16} /></button>
                <button type="button" onClick={() => handleAddAssegnazione(p)} className="p-1.5 hover:bg-green-50 text-green-600 rounded"><Plus size={16} /></button>
              </div>
            </div>
            {p.assegnazioni?.filter(a => a.attivo).length > 0 && (
              <div className="mt-2 pt-2 border-t space-y-1">
                {p.assegnazioni.filter(a => a.attivo).map(a => (
                  <div key={a.id} className="flex items-center justify-between bg-gray-50 rounded p-2 text-sm">
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${getRuoloColor(a.ruolo)}`}>{getRuoloLabel(a.ruolo)}</span>
                      <span className="text-gray-600">{a.progetto?.nome}</span>
                    </div>
                    <button type="button" onClick={() => handleDisattivaAssegnazione(a.id)} className="text-xs text-red-500 hover:underline">Rimuovi</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
        {filtered.length === 0 && <p className="text-center text-gray-500 py-8">Nessuna persona trovata</p>}
      </div>

      {/* Modal Form */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center">
          <div className="bg-white w-full max-h-[85vh] overflow-y-auto rounded-t-2xl">
            <div className="sticky top-0 bg-white border-b p-4 flex justify-between items-center">
              <h2 className="font-bold">{formMode === 'assegnazione' ? 'Nuova Assegnazione' : editingPersona ? 'Modifica' : 'Nuova Persona'}</h2>
              <button type="button" onClick={resetForm}><X size={24} /></button>
            </div>
            <div className="p-4 space-y-3">
              {formMode === 'persona' && (
                <>
                  <div className="grid grid-cols-2 gap-2">
                    <input type="text" placeholder="Nome *" value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} className="px-3 py-2 border rounded-lg" />
                    <input type="text" placeholder="Cognome *" value={form.cognome} onChange={(e) => setForm({ ...form, cognome: e.target.value })} className="px-3 py-2 border rounded-lg" />
                  </div>
                  <input type="email" placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="w-full px-3 py-2 border rounded-lg" />
                  <input type="tel" placeholder="Telefono" value={form.telefono} onChange={(e) => setForm({ ...form, telefono: e.target.value })} className="w-full px-3 py-2 border rounded-lg" />
                  <input type="text" placeholder="Codice Fiscale" value={form.codice_fiscale} onChange={(e) => setForm({ ...form, codice_fiscale: e.target.value.toUpperCase() })} className="w-full px-3 py-2 border rounded-lg" maxLength={16} />
                  {!editingPersona && <p className="text-sm text-gray-500 font-medium pt-2">Assegnazione (opzionale)</p>}
                </>
              )}
              {(formMode === 'assegnazione' || !editingPersona) && (
                <>
                  <select value={form.progetto_id} onChange={(e) => setForm({ ...form, progetto_id: e.target.value })} className="w-full px-3 py-2 border rounded-lg">
                    <option value="">Seleziona Progetto...</option>
                    {progetti.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
                  </select>
                  <select value={form.ditta_id} onChange={(e) => setForm({ ...form, ditta_id: e.target.value })} className="w-full px-3 py-2 border rounded-lg">
                    <option value="">Seleziona Ditta...</option>
                    {ditte.map(d => <option key={d.id} value={d.id}>{d.ragione_sociale}</option>)}
                  </select>
                  <select value={form.ruolo} onChange={(e) => setForm({ ...form, ruolo: e.target.value })} className="w-full px-3 py-2 border rounded-lg">
                    <option value="helper">Operatore</option>
                    <option value="foreman">Foreman</option>
                    <option value="supervisor">Supervisor</option>
                    <option value="cm">Construction Manager</option>
                    <option value="office">Ufficio</option>
                    {isAtLeast('admin') && <option value="admin">Admin</option>}
                  </select>
                  <input type="text" placeholder="Qualifica" value={form.qualifica} onChange={(e) => setForm({ ...form, qualifica: e.target.value })} className="w-full px-3 py-2 border rounded-lg" />
                  <input type="text" placeholder="Badge" value={form.badge_number} onChange={(e) => setForm({ ...form, badge_number: e.target.value })} className="w-full px-3 py-2 border rounded-lg" />
                </>
              )}
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={resetForm} className="flex-1 py-3 bg-gray-200 rounded-lg">Annulla</button>
                <button type="button" onClick={handleSave} disabled={saving} className="flex-1 py-3 bg-blue-600 text-white rounded-lg flex items-center justify-center gap-2">
                  {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />} Salva
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
