import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { 
  Settings, 
  Clock, 
  Cloud, 
  MapPin, 
  Bell,
  Save,
  Loader2,
  ChevronDown,
  ChevronUp
} from 'lucide-react'

export default function ImpostazioniPage() {
  const { assegnazione, progetto } = useAuth()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [impostazioni, setImpostazioni] = useState(null)
  const [turni, setTurni] = useState([])
  const [expandedSection, setExpandedSection] = useState('orari')
  const [message, setMessage] = useState({ type: '', text: '' })

  useEffect(() => {
    loadImpostazioni()
  }, [])

  const loadImpostazioni = async () => {
    try {
      // Carica impostazioni progetto
      const { data: impData } = await supabase
        .from('impostazioni_progetto')
        .select('*')
        .eq('progetto_id', assegnazione.progetto_id)
        .single()

      setImpostazioni(impData)

      // Carica turni
      const { data: turniData } = await supabase
        .from('turni')
        .select('*')
        .eq('progetto_id', assegnazione.progetto_id)
        .eq('attivo', true)
        .order('codice')

      setTurni(turniData || [])

    } catch (error) {
      console.error('Error loading impostazioni:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    setMessage({ type: '', text: '' })

    try {
      const { error } = await supabase
        .from('impostazioni_progetto')
        .update(impostazioni)
        .eq('id', impostazioni.id)

      if (error) throw error

      setMessage({ type: 'success', text: 'Impostazioni salvate!' })

    } catch (error) {
      console.error('Save error:', error)
      setMessage({ type: 'error', text: error.message || 'Errore durante il salvataggio' })
    } finally {
      setSaving(false)
    }
  }

  const updateImpostazione = (key, value) => {
    setImpostazioni(prev => ({
      ...prev,
      [key]: value
    }))
  }

  const Section = ({ id, icon: Icon, title, children }) => {
    const isExpanded = expandedSection === id
    
    return (
      <div className="card">
        <button
          onClick={() => setExpandedSection(isExpanded ? null : id)}
          className="w-full flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gray-100 rounded-lg">
              <Icon className="text-gray-600" size={20} />
            </div>
            <span className="font-medium text-gray-800">{title}</span>
          </div>
          {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
        </button>
        
        {isExpanded && (
          <div className="mt-4 pt-4 border-t border-gray-100">
            {children}
          </div>
        )}
      </div>
    )
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
      <div>
        <h1 className="text-xl font-bold text-gray-800">Impostazioni</h1>
        <p className="text-sm text-gray-500">{progetto?.nome}</p>
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

      {/* Sections */}
      <div className="space-y-3">
        {/* Orari e Turni */}
        <Section id="orari" icon={Clock} title="Orari e Turni">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Turno Default
              </label>
              <select
                value={impostazioni?.turno_default_id || ''}
                onChange={(e) => updateImpostazione('turno_default_id', e.target.value)}
                className="input"
              >
                <option value="">Seleziona turno...</option>
                {turni.map(t => (
                  <option key={t.id} value={t.id}>
                    {t.nome} ({t.ora_inizio} - {t.ora_fine})
                  </option>
                ))}
              </select>
            </div>

            <div className="bg-gray-50 rounded-lg p-3">
              <h4 className="text-sm font-medium text-gray-700 mb-2">Turni configurati</h4>
              {turni.map(t => (
                <div key={t.id} className="flex justify-between text-sm py-1">
                  <span>{t.nome}</span>
                  <span className="text-gray-500">
                    {t.ora_inizio?.slice(0,5)} - {t.ora_fine?.slice(0,5)} ({t.ore_standard}h)
                  </span>
                </div>
              ))}
            </div>
          </div>
        </Section>

        {/* Soglie Meteo */}
        <Section id="meteo" icon={Cloud} title="Soglie Meteo">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Vento Warning (km/h)
              </label>
              <input
                type="number"
                value={impostazioni?.vento_warning_kmh || 30}
                onChange={(e) => updateImpostazione('vento_warning_kmh', parseFloat(e.target.value))}
                className="input"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Vento Stop (km/h)
              </label>
              <input
                type="number"
                value={impostazioni?.vento_stop_kmh || 50}
                onChange={(e) => updateImpostazione('vento_stop_kmh', parseFloat(e.target.value))}
                className="input"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Pioggia Warning (mm/h)
              </label>
              <input
                type="number"
                value={impostazioni?.pioggia_warning_mm || 2}
                onChange={(e) => updateImpostazione('pioggia_warning_mm', parseFloat(e.target.value))}
                className="input"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Temperatura Minima (°C)
              </label>
              <input
                type="number"
                value={impostazioni?.temperatura_min_celsius || 0}
                onChange={(e) => updateImpostazione('temperatura_min_celsius', parseFloat(e.target.value))}
                className="input"
              />
            </div>
          </div>
        </Section>

        {/* GPS */}
        <Section id="gps" icon={MapPin} title="GPS e Check-in">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tolleranza GPS (metri)
              </label>
              <input
                type="number"
                value={impostazioni?.tolleranza_gps_metri || 50}
                onChange={(e) => updateImpostazione('tolleranza_gps_metri', parseInt(e.target.value))}
                className="input"
              />
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-700">Check-out GPS obbligatorio</span>
              <input
                type="checkbox"
                checked={impostazioni?.checkout_gps_obbligatorio || false}
                onChange={(e) => updateImpostazione('checkout_gps_obbligatorio', e.target.checked)}
                className="w-5 h-5 text-primary-600"
              />
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-700">Consenti check-in fuori zona</span>
              <input
                type="checkbox"
                checked={impostazioni?.consenti_checkin_fuori_zona ?? true}
                onChange={(e) => updateImpostazione('consenti_checkin_fuori_zona', e.target.checked)}
                className="w-5 h-5 text-primary-600"
              />
            </div>
          </div>
        </Section>

        {/* Notifiche */}
        <Section id="notifiche" icon={Bell} title="Notifiche">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Alert scadenza documenti (giorni prima)
              </label>
              <input
                type="number"
                value={impostazioni?.alert_scadenza_documenti_giorni || 30}
                onChange={(e) => updateImpostazione('alert_scadenza_documenti_giorni', parseInt(e.target.value))}
                className="input"
              />
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-700">Notifica rapportino mancante</span>
              <input
                type="checkbox"
                checked={impostazioni?.notifica_rapportino_mancante ?? true}
                onChange={(e) => updateImpostazione('notifica_rapportino_mancante', e.target.checked)}
                className="w-5 h-5 text-primary-600"
              />
            </div>
          </div>
        </Section>
      </div>

      {/* Save button */}
      <button
        onClick={handleSave}
        disabled={saving}
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
            Salva Impostazioni
          </>
        )}
      </button>
    </div>
  )
}
