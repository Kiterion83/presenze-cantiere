import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { 
  ClipboardList, 
  Users, 
  Clock, 
  Save, 
  Loader2,
  ChevronDown,
  ChevronUp,
  Check
} from 'lucide-react'

export default function RapportinoPage() {
  const { persona, assegnazione } = useAuth()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [squadra, setSquadra] = useState([])
  const [centriCosto, setCentriCosto] = useState([])
  const [selectedCC, setSelectedCC] = useState(null)
  const [orePersonale, setOrePersonale] = useState({})
  const [message, setMessage] = useState({ type: '', text: '' })

  const oggi = new Date().toISOString().split('T')[0]

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      // Carica squadra (persone che riportano a questo foreman)
      const { data: squadraData } = await supabase
        .from('assegnazioni_progetto')
        .select(`
          *,
          persona:persone(*)
        `)
        .eq('progetto_id', assegnazione.progetto_id)
        .eq('riporta_a_id', assegnazione.id)
        .eq('attivo', true)

      setSquadra(squadraData || [])

      // Inizializza ore
      const oreInit = {}
      squadraData?.forEach(s => {
        oreInit[s.persona_id] = { ordinarie: 8, straordinario: 0, tipo: 'presente' }
      })
      setOrePersonale(oreInit)

      // Carica centri di costo
      const { data: ccData } = await supabase
        .from('centri_costo')
        .select('*')
        .eq('progetto_id', assegnazione.progetto_id)
        .eq('stato', 'attivo')
        .order('ordine')

      setCentriCosto(ccData || [])
      if (ccData?.length > 0) {
        setSelectedCC(ccData[0])
      }

    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }

  const updateOre = (personaId, field, value) => {
    setOrePersonale(prev => ({
      ...prev,
      [personaId]: {
        ...prev[personaId],
        [field]: value
      }
    }))
  }

  const handleSave = async () => {
    if (!selectedCC) {
      setMessage({ type: 'error', text: 'Seleziona un centro di costo' })
      return
    }

    setSaving(true)
    setMessage({ type: '', text: '' })

    try {
      // Crea rapportino
      const { data: rapportino, error: rapportinoError } = await supabase
        .from('rapportini')
        .insert({
          foreman_persona_id: persona.id,
          progetto_id: assegnazione.progetto_id,
          centro_costo_id: selectedCC.id,
          data: oggi,
          stato: 'bozza'
        })
        .select()
        .single()

      if (rapportinoError) throw rapportinoError

      // Inserisci ore lavorate
      const oreLavorate = Object.entries(orePersonale).map(([personaId, ore]) => ({
        rapportino_id: rapportino.id,
        persona_id: personaId,
        ore_ordinarie: ore.ordinarie,
        ore_straordinario: ore.straordinario,
        tipo_presenza: ore.tipo
      }))

      const { error: oreError } = await supabase
        .from('ore_lavorate')
        .insert(oreLavorate)

      if (oreError) throw oreError

      setMessage({ type: 'success', text: 'Rapportino salvato con successo!' })

    } catch (error) {
      console.error('Save error:', error)
      setMessage({ type: 'error', text: error.message || 'Errore durante il salvataggio' })
    } finally {
      setSaving(false)
    }
  }

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
        <h1 className="text-xl font-bold text-gray-800">Rapportino</h1>
        <p className="text-sm text-gray-500">
          {new Date().toLocaleDateString('it-IT', { 
            weekday: 'long', 
            day: 'numeric', 
            month: 'long' 
          })}
        </p>
      </div>

      {/* Message */}
      {message.text && (
        <div className={`card ${
          message.type === 'success' ? 'bg-success-50 text-success-700' : 
          message.type === 'error' ? 'bg-danger-50 text-danger-700' : ''
        }`}>
          {message.text}
        </div>
      )}

      {/* Centro di costo selector */}
      <div className="card">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Centro di Costo
        </label>
        <select
          value={selectedCC?.id || ''}
          onChange={(e) => {
            const cc = centriCosto.find(c => c.id === e.target.value)
            setSelectedCC(cc)
          }}
          className="input"
        >
          <option value="">Seleziona...</option>
          {centriCosto.map(cc => (
            <option key={cc.id} value={cc.id}>
              {cc.codice} - {cc.nome}
            </option>
          ))}
        </select>
      </div>

      {/* Squadra */}
      <div className="card">
        <h3 className="font-medium text-gray-800 mb-3 flex items-center gap-2">
          <Users size={18} />
          Squadra ({squadra.length} persone)
        </h3>

        {squadra.length === 0 ? (
          <p className="text-gray-500 text-sm">
            Nessuna persona assegnata alla tua squadra.
          </p>
        ) : (
          <div className="space-y-3">
            {squadra.map(({ persona: p, persona_id }) => (
              <div key={persona_id} className="border border-gray-100 rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-gray-800">
                    {p.nome} {p.cognome}
                  </span>
                  <select
                    value={orePersonale[persona_id]?.tipo || 'presente'}
                    onChange={(e) => updateOre(persona_id, 'tipo', e.target.value)}
                    className="text-sm border rounded px-2 py-1"
                  >
                    <option value="presente">Presente</option>
                    <option value="assente">Assente</option>
                    <option value="malattia">Malattia</option>
                    <option value="permesso">Permesso</option>
                    <option value="ferie">Ferie</option>
                  </select>
                </div>

                {orePersonale[persona_id]?.tipo === 'presente' && (
                  <div className="flex gap-4 mt-2">
                    <div className="flex-1">
                      <label className="text-xs text-gray-500">Ordinarie</label>
                      <input
                        type="number"
                        min="0"
                        max="12"
                        step="0.5"
                        value={orePersonale[persona_id]?.ordinarie || 0}
                        onChange={(e) => updateOre(persona_id, 'ordinarie', parseFloat(e.target.value))}
                        className="input mt-1 text-center"
                      />
                    </div>
                    <div className="flex-1">
                      <label className="text-xs text-gray-500">Straordinario</label>
                      <input
                        type="number"
                        min="0"
                        max="8"
                        step="0.5"
                        value={orePersonale[persona_id]?.straordinario || 0}
                        onChange={(e) => updateOre(persona_id, 'straordinario', parseFloat(e.target.value))}
                        className="input mt-1 text-center"
                      />
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Summary */}
      <div className="card bg-gray-50">
        <div className="flex justify-between text-sm">
          <span className="text-gray-500">Ore ordinarie totali</span>
          <span className="font-medium">
            {Object.values(orePersonale)
              .filter(o => o.tipo === 'presente')
              .reduce((sum, o) => sum + (o.ordinarie || 0), 0)} h
          </span>
        </div>
        <div className="flex justify-between text-sm mt-1">
          <span className="text-gray-500">Ore straordinario totali</span>
          <span className="font-medium">
            {Object.values(orePersonale)
              .filter(o => o.tipo === 'presente')
              .reduce((sum, o) => sum + (o.straordinario || 0), 0)} h
          </span>
        </div>
      </div>

      {/* Save button */}
      <button
        onClick={handleSave}
        disabled={saving || squadra.length === 0}
        className="btn-primary w-full py-3 flex items-center justify-center gap-2"
      >
        {saving ? (
          <>
            <Loader2 className="animate-spin" size={20} />
            Salvataggio...
          </>
        ) : (
          <>
            <Save size={20} />
            Salva Rapportino
          </>
        )}
      </button>
    </div>
  )
}
