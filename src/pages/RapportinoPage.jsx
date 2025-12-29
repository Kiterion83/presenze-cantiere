import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { ClipboardList, Save, Loader2, Check, AlertCircle, Calendar, Users, Package } from 'lucide-react'

export default function RapportinoPage() {
  const { persona, assegnazione, progetto } = useAuth()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState({ type: '', text: '' })
  
  const [data, setData] = useState(new Date().toISOString().split('T')[0])
  const [centriCosto, setCentriCosto] = useState([])
  const [centroCostoId, setCentroCostoId] = useState('')
  const [centroSelezionato, setCentroSelezionato] = useState(null)
  const [squadra, setSquadra] = useState([])
  const [orePersone, setOrePersone] = useState({})
  const [descrizione, setDescrizione] = useState('')
  
  // Progress fisico
  const [quantitaFatta, setQuantitaFatta] = useState('')
  const [quantitaSecFatta, setQuantitaSecFatta] = useState('')
  const [noteProgress, setNoteProgress] = useState('')

  useEffect(() => { loadData() }, [])

  useEffect(() => {
    if (centroCostoId) {
      const cc = centriCosto.find(c => c.id === centroCostoId)
      setCentroSelezionato(cc)
    } else {
      setCentroSelezionato(null)
    }
  }, [centroCostoId, centriCosto])

  const loadData = async () => {
    try {
      // Centri costo
      const { data: ccData } = await supabase
        .from('centri_costo')
        .select('*, unita_misura:unita_misura_id(nome, simbolo), unita_misura_sec:unita_misura_secondaria_id(nome, simbolo)')
        .eq('progetto_id', assegnazione.progetto_id)
        .eq('stato', 'attivo')
        .order('ordine')
      setCentriCosto(ccData || [])

      // Squadra (persone che riportano a me)
      const { data: team } = await supabase
        .from('assegnazioni_progetto')
        .select('*, persona:persone(*)')
        .eq('progetto_id', assegnazione.progetto_id)
        .eq('riporta_a_id', assegnazione.id)
        .eq('attivo', true)
      
      const squadraCompleta = [
        { id: assegnazione.id, persona: persona, persona_id: persona.id, ruolo: assegnazione.ruolo },
        ...(team || []).map(t => ({ id: t.id, persona: t.persona, persona_id: t.persona_id, ruolo: t.ruolo }))
      ]
      setSquadra(squadraCompleta)

      // Init ore
      const initOre = {}
      squadraCompleta.forEach(m => {
        initOre[m.persona_id] = { ordinarie: 0, straordinario: 0, tipo: 'presente' }
      })
      setOrePersone(initOre)

    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleOreChange = (personaId, field, value) => {
    setOrePersone(prev => ({
      ...prev,
      [personaId]: { ...prev[personaId], [field]: value }
    }))
  }

  const handleSave = async () => {
    if (!centroCostoId) {
      setMessage({ type: 'error', text: 'Seleziona un centro di costo' })
      return
    }

    setSaving(true)
    setMessage({ type: '', text: '' })

    try {
      // 1. Crea rapportino
      const { data: rapportino, error: errRap } = await supabase
        .from('rapportini')
        .insert({
          foreman_persona_id: persona.id,
          progetto_id: assegnazione.progetto_id,
          centro_costo_id: centroCostoId,
          data: data,
          descrizione_attivita: descrizione || null,
          stato: 'bozza',
          firmato: false
        })
        .select()
        .single()

      if (errRap) throw errRap

      // 2. Inserisci ore lavorate
      const oreToInsert = Object.entries(orePersone)
        .filter(([_, ore]) => ore.ordinarie > 0 || ore.straordinario > 0 || ore.tipo !== 'presente')
        .map(([personaId, ore]) => ({
          rapportino_id: rapportino.id,
          persona_id: personaId,
          ore_ordinarie: parseFloat(ore.ordinarie) || 0,
          ore_straordinario: parseFloat(ore.straordinario) || 0,
          tipo_presenza: ore.tipo
        }))

      if (oreToInsert.length > 0) {
        const { error: errOre } = await supabase.from('ore_lavorate').insert(oreToInsert)
        if (errOre) throw errOre
      }

      // 3. Inserisci progress fisico (se compilato)
      if (quantitaFatta && parseFloat(quantitaFatta) > 0) {
        const { error: errProg } = await supabase.from('progress_fisico').insert({
          centro_costo_id: centroCostoId,
          rapportino_id: rapportino.id,
          inserito_da_persona_id: persona.id,
          data: data,
          quantita_fatta: parseFloat(quantitaFatta),
          quantita_secondaria_fatta: quantitaSecFatta ? parseFloat(quantitaSecFatta) : null,
          note: noteProgress || null
        })
        if (errProg) throw errProg
      }

      setMessage({ type: 'success', text: 'Rapportino salvato!' })
      
      // Reset form
      setDescrizione('')
      setQuantitaFatta('')
      setQuantitaSecFatta('')
      setNoteProgress('')
      const initOre = {}
      squadra.forEach(m => { initOre[m.persona_id] = { ordinarie: 0, straordinario: 0, tipo: 'presente' } })
      setOrePersone(initOre)

    } catch (error) {
      console.error('Save error:', error)
      setMessage({ type: 'error', text: error.message })
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="animate-spin text-blue-600" size={32} /></div>

  return (
    <div className="p-4 space-y-4 pb-24">
      <div>
        <h1 className="text-xl font-bold text-gray-800">Rapportino</h1>
        <p className="text-sm text-gray-500">{progetto?.nome}</p>
      </div>

      {message.text && (
        <div className={`p-3 rounded-lg flex items-center gap-2 ${message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
          {message.type === 'success' ? <Check size={18} /> : <AlertCircle size={18} />}
          {message.text}
        </div>
      )}

      {/* Data e Centro Costo */}
      <div className="bg-white rounded-xl border p-4 space-y-3">
        <div className="flex items-center gap-2 text-gray-700 font-medium"><Calendar size={18} /> Data e Attività</div>
        
        <input type="date" value={data} onChange={(e) => setData(e.target.value)} className="w-full px-3 py-2 border rounded-lg" />
        
        <select value={centroCostoId} onChange={(e) => setCentroCostoId(e.target.value)} className="w-full px-3 py-2 border rounded-lg">
          <option value="">Seleziona Centro di Costo...</option>
          {centriCosto.map(cc => (
            <option key={cc.id} value={cc.id}>{cc.codice} - {cc.nome}</option>
          ))}
        </select>

        <textarea 
          placeholder="Descrizione attività svolte..." 
          value={descrizione} 
          onChange={(e) => setDescrizione(e.target.value)} 
          className="w-full px-3 py-2 border rounded-lg h-20 resize-none"
        />
      </div>

      {/* Ore Squadra */}
      <div className="bg-white rounded-xl border p-4 space-y-3">
        <div className="flex items-center gap-2 text-gray-700 font-medium"><Users size={18} /> Ore Squadra</div>
        
        {squadra.map(m => (
          <div key={m.persona_id} className="border rounded-lg p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-medium text-sm">{m.persona.nome} {m.persona.cognome}</span>
              <select 
                value={orePersone[m.persona_id]?.tipo || 'presente'} 
                onChange={(e) => handleOreChange(m.persona_id, 'tipo', e.target.value)}
                className="text-xs px-2 py-1 border rounded"
              >
                <option value="presente">Presente</option>
                <option value="assente">Assente</option>
                <option value="malattia">Malattia</option>
                <option value="permesso">Permesso</option>
                <option value="ferie">Ferie</option>
              </select>
            </div>
            
            {orePersone[m.persona_id]?.tipo === 'presente' && (
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-gray-500">Ordinarie</label>
                  <input 
                    type="number" 
                    min="0" 
                    max="12" 
                    step="0.5"
                    value={orePersone[m.persona_id]?.ordinarie || ''} 
                    onChange={(e) => handleOreChange(m.persona_id, 'ordinarie', e.target.value)}
                    className="w-full px-2 py-1 border rounded text-center"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500">Straordinario</label>
                  <input 
                    type="number" 
                    min="0" 
                    max="8" 
                    step="0.5"
                    value={orePersone[m.persona_id]?.straordinario || ''} 
                    onChange={(e) => handleOreChange(m.persona_id, 'straordinario', e.target.value)}
                    className="w-full px-2 py-1 border rounded text-center"
                    placeholder="0"
                  />
                </div>
              </div>
            )}
          </div>
        ))}

        {squadra.length === 0 && (
          <p className="text-center text-gray-500 py-4">Nessun membro nella squadra</p>
        )}
      </div>

      {/* Progress Fisico */}
      {centroSelezionato && (
        <div className="bg-white rounded-xl border p-4 space-y-3">
          <div className="flex items-center gap-2 text-gray-700 font-medium"><Package size={18} /> Progress Fisico</div>
          
          <div className="bg-blue-50 rounded-lg p-3 text-sm">
            <p className="font-medium text-blue-800">{centroSelezionato.codice}</p>
            <p className="text-blue-600">Budget: {centroSelezionato.budget_quantita || '-'} {centroSelezionato.unita_misura?.simbolo || ''}</p>
            {centroSelezionato.budget_quantita_secondaria > 0 && (
              <p className="text-blue-600">Budget 2: {centroSelezionato.budget_quantita_secondaria} {centroSelezionato.unita_misura_sec?.simbolo || ''}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Quantità fatta ({centroSelezionato.unita_misura?.simbolo || 'unità'})
            </label>
            <input 
              type="number" 
              step="0.01"
              value={quantitaFatta} 
              onChange={(e) => setQuantitaFatta(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg"
              placeholder={`Es: 50 ${centroSelezionato.unita_misura?.simbolo || ''}`}
            />
          </div>

          {centroSelezionato.budget_quantita_secondaria > 0 && (
            <div>
              <label className="block text-sm font-medium mb-1">
                Quantità secondaria ({centroSelezionato.unita_misura_sec?.simbolo || 'unità'})
              </label>
              <input 
                type="number" 
                step="0.01"
                value={quantitaSecFatta} 
                onChange={(e) => setQuantitaSecFatta(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg"
                placeholder={`Es: 25 ${centroSelezionato.unita_misura_sec?.simbolo || ''}`}
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium mb-1">Note progress</label>
            <input 
              type="text" 
              value={noteProgress} 
              onChange={(e) => setNoteProgress(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg"
              placeholder="Es: Completate isometrie 101-105"
            />
          </div>
        </div>
      )}

      {/* Salva */}
      <button 
        type="button" 
        onClick={handleSave} 
        disabled={saving || !centroCostoId}
        className="w-full py-4 bg-blue-600 text-white rounded-xl font-medium flex items-center justify-center gap-2 disabled:opacity-50"
      >
        {saving ? <Loader2 size={20} className="animate-spin" /> : <Save size={20} />}
        Salva Rapportino
      </button>
    </div>
  )
}
