import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'

// Componente per gestire i flussi di approvazione
export default function FlussiTab() {
  const { assegnazione } = useAuth()
  const [flussi, setFlussi] = useState([])
  const [tipiFlsso, setTipiFlusso] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedTipo, setSelectedTipo] = useState('ferie')
  const [editingStep, setEditingStep] = useState(null)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState(null)

  // Ruoli disponibili per approvazione
  const ruoliApprovatori = [
    { value: 'foreman', label: 'Foreman' },
    { value: 'supervisor', label: 'Supervisor' },
    { value: 'cm', label: 'Construction Manager' },
    { value: 'pm', label: 'Project Manager' },
    { value: 'dept_manager', label: 'Dept Manager' },
    { value: 'admin', label: 'Admin' },
  ]

  // Ruoli richiedenti
  const ruoliRichiedenti = {
    ferie: [
      { value: 'helper', label: 'Helper', percorso: 'site' },
      { value: 'foreman', label: 'Foreman', percorso: 'site' },
      { value: 'supervisor', label: 'Supervisor', percorso: 'site' },
      { value: 'cm', label: 'CM', percorso: 'site' },
      { value: 'office', label: 'Office', percorso: 'office' },
      { value: 'dept_manager', label: 'Dept Manager', percorso: 'office' },
    ],
    trasferimenti: [
      { value: 'foreman', label: 'Foreman', percorso: 'site' },
      { value: 'supervisor', label: 'Supervisor', percorso: 'site' },
      { value: 'cm', label: 'CM (diretto)', percorso: 'site' },
    ],
    rapportini: [
      { value: 'foreman', label: 'Foreman', percorso: 'site' },
    ]
  }

  useEffect(() => {
    if (assegnazione?.progetto_id) {
      loadData()
    }
  }, [assegnazione?.progetto_id])

  const loadData = async () => {
    setLoading(true)
    
    // Carica tipi flusso
    const { data: tipi } = await supabase
      .from('tipi_flusso')
      .select('*')
      .order('codice')
    setTipiFlusso(tipi || [])

    // Carica flussi con step
    const { data: f } = await supabase
      .from('flussi_approvazione')
      .select('*, steps:step_flusso(*)')
      .eq('progetto_id', assegnazione.progetto_id)
      .order('tipo_flusso')
      .order('ruolo_richiedente')
    
    setFlussi(f || [])
    setLoading(false)
  }

  // Filtra flussi per tipo selezionato
  const flussiTipo = flussi.filter(f => f.tipo_flusso === selectedTipo)

  // Raggruppa per percorso
  const flussiSite = flussiTipo.filter(f => f.percorso === 'site')
  const flussiOffice = flussiTipo.filter(f => f.percorso === 'office')

  // Toggle step attivo
  const toggleStep = async (stepId, attivo) => {
    setSaving(true)
    try {
      await supabase
        .from('step_flusso')
        .update({ attivo: !attivo })
        .eq('id', stepId)
      loadData()
    } catch (err) {
      setMessage({ type: 'error', text: err.message })
    } finally {
      setSaving(false)
    }
  }

  // Toggle step obbligatorio
  const toggleObbligatorio = async (stepId, obbligatorio) => {
    setSaving(true)
    try {
      await supabase
        .from('step_flusso')
        .update({ obbligatorio: !obbligatorio })
        .eq('id', stepId)
      loadData()
    } catch (err) {
      setMessage({ type: 'error', text: err.message })
    } finally {
      setSaving(false)
    }
  }

  // Toggle flusso attivo
  const toggleFlusso = async (flussoId, attivo) => {
    setSaving(true)
    try {
      await supabase
        .from('flussi_approvazione')
        .update({ attivo: !attivo })
        .eq('id', flussoId)
      loadData()
    } catch (err) {
      setMessage({ type: 'error', text: err.message })
    } finally {
      setSaving(false)
    }
  }

  // Aggiungi nuovo step a un flusso
  const addStep = async (flussoId) => {
    const flusso = flussi.find(f => f.id === flussoId)
    const maxOrdine = flusso?.steps?.length > 0 
      ? Math.max(...flusso.steps.map(s => s.ordine)) 
      : 0

    setSaving(true)
    try {
      await supabase.from('step_flusso').insert({
        flusso_id: flussoId,
        ordine: maxOrdine + 1,
        ruolo_approvatore: 'supervisor',
        obbligatorio: true,
        attivo: true
      })
      loadData()
    } catch (err) {
      setMessage({ type: 'error', text: err.message })
    } finally {
      setSaving(false)
    }
  }

  // Cambia ruolo approvatore
  const changeRuoloApprovatore = async (stepId, nuovoRuolo) => {
    setSaving(true)
    try {
      await supabase
        .from('step_flusso')
        .update({ ruolo_approvatore: nuovoRuolo })
        .eq('id', stepId)
      loadData()
    } catch (err) {
      setMessage({ type: 'error', text: err.message })
    } finally {
      setSaving(false)
    }
  }

  // Elimina step
  const deleteStep = async (stepId) => {
    if (!confirm('Eliminare questo step?')) return
    setSaving(true)
    try {
      await supabase.from('step_flusso').delete().eq('id', stepId)
      loadData()
    } catch (err) {
      setMessage({ type: 'error', text: err.message })
    } finally {
      setSaving(false)
    }
  }

  // Componente per visualizzare un singolo flusso
  const FlussoCard = ({ flusso }) => {
    const steps = (flusso.steps || []).sort((a, b) => a.ordine - b.ordine)
    
    return (
      <div className={`border rounded-xl p-4 ${flusso.attivo ? 'bg-white' : 'bg-gray-100 opacity-60'}`}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-lg">
              {flusso.ruolo_richiedente === 'helper' && '👷'}
              {flusso.ruolo_richiedente === 'foreman' && '👨‍🔧'}
              {flusso.ruolo_richiedente === 'supervisor' && '👨‍💼'}
              {flusso.ruolo_richiedente === 'cm' && '🏗️'}
              {flusso.ruolo_richiedente === 'office' && '💼'}
              {flusso.ruolo_richiedente === 'dept_manager' && '📊'}
            </span>
            <span className="font-medium text-gray-800 capitalize">
              {flusso.ruolo_richiedente.replace('_', ' ')}
            </span>
            <span className={`px-2 py-0.5 text-xs rounded-full ${flusso.percorso === 'site' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>
              {flusso.percorso}
            </span>
          </div>
          <button
            onClick={() => toggleFlusso(flusso.id, flusso.attivo)}
            className={`px-3 py-1 rounded-lg text-sm font-medium ${flusso.attivo ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-600'}`}
          >
            {flusso.attivo ? '✅ Attivo' : '⏸️ Disattivo'}
          </button>
        </div>

        {flusso.descrizione && (
          <p className="text-sm text-gray-500 mb-3">{flusso.descrizione}</p>
        )}

        {/* Steps */}
        <div className="space-y-2">
          {steps.length === 0 ? (
            <p className="text-sm text-gray-400 italic">
              {flusso.ruolo_richiedente === 'cm' && selectedTipo === 'trasferimenti' 
                ? '👑 Approvazione diretta (nessuno step)' 
                : 'Nessuno step configurato'}
            </p>
          ) : (
            steps.map((step, idx) => (
              <div 
                key={step.id} 
                className={`flex items-center gap-3 p-2 rounded-lg ${step.attivo ? 'bg-gray-50' : 'bg-gray-200 opacity-50'}`}
              >
                <span className="w-6 h-6 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center text-sm font-medium">
                  {idx + 1}
                </span>
                
                <select
                  value={step.ruolo_approvatore}
                  onChange={(e) => changeRuoloApprovatore(step.id, e.target.value)}
                  className="flex-1 px-2 py-1 border rounded-lg text-sm"
                  disabled={!flusso.attivo}
                >
                  {ruoliApprovatori.map(r => (
                    <option key={r.value} value={r.value}>{r.label}</option>
                  ))}
                </select>

                <button
                  onClick={() => toggleObbligatorio(step.id, step.obbligatorio)}
                  className={`px-2 py-1 rounded text-xs font-medium ${step.obbligatorio ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}
                  disabled={!flusso.attivo}
                >
                  {step.obbligatorio ? 'Obbligatorio' : 'Opzionale'}
                </button>

                <button
                  onClick={() => toggleStep(step.id, step.attivo)}
                  className={`px-2 py-1 rounded text-xs ${step.attivo ? 'text-gray-500' : 'text-green-600'}`}
                  disabled={!flusso.attivo}
                >
                  {step.attivo ? '⏸️' : '▶️'}
                </button>

                <button
                  onClick={() => deleteStep(step.id)}
                  className="text-red-500 hover:text-red-700"
                  disabled={!flusso.attivo}
                >
                  🗑️
                </button>
              </div>
            ))
          )}
        </div>

        {/* Aggiungi Step */}
        {flusso.attivo && !(flusso.ruolo_richiedente === 'cm' && selectedTipo === 'trasferimenti') && (
          <button
            onClick={() => addStep(flusso.id)}
            className="mt-3 w-full py-2 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-blue-400 hover:text-blue-600"
          >
            + Aggiungi Step
          </button>
        )}
      </div>
    )
  }

  if (loading) {
    return <div className="text-center py-8 text-gray-500">Caricamento flussi...</div>
  }

  return (
    <div className="bg-white rounded-xl p-6 shadow-sm border">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-gray-800">🔄 Flussi di Approvazione</h2>
        <p className="text-sm text-gray-500">Configura i workflow di approvazione per ferie, trasferimenti e rapportini</p>
      </div>

      {message && (
        <div className={`mb-4 p-3 rounded-xl ${message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
          {message.text}
        </div>
      )}

      {/* Selettore Tipo */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        {[
          { value: 'ferie', label: '🏖️ Ferie', desc: 'Richieste assenze' },
          { value: 'trasferimenti', label: '🔄 Trasferimenti', desc: 'Spostamenti risorse' },
          { value: 'rapportini', label: '📝 Rapportini', desc: 'Firme giornaliere' },
        ].map(tipo => (
          <button
            key={tipo.value}
            onClick={() => setSelectedTipo(tipo.value)}
            className={`px-4 py-3 rounded-xl font-medium whitespace-nowrap transition-all ${
              selectedTipo === tipo.value 
                ? 'bg-blue-600 text-white shadow-lg' 
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {tipo.label}
          </button>
        ))}
      </div>

      {/* Info Box */}
      <div className="mb-6 p-4 bg-blue-50 rounded-xl border border-blue-200">
        <h4 className="font-semibold text-blue-800 mb-2">ℹ️ Come funziona</h4>
        <ul className="text-sm text-blue-700 space-y-1">
          <li>• Ogni ruolo richiedente ha un proprio percorso di approvazione</li>
          <li>• Gli step <span className="font-medium text-red-600">obbligatori</span> devono essere approvati</li>
          <li>• Gli step <span className="font-medium text-yellow-600">opzionali</span> possono essere saltati</li>
          <li>• Disattivare un flusso significa che le richieste vengono approvate automaticamente</li>
        </ul>
      </div>

      {/* Flussi Site */}
      {flussiSite.length > 0 && (
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-700 mb-3 flex items-center gap-2">
            <span className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">🏗️</span>
            Percorso Cantiere (Site)
          </h3>
          <div className="grid gap-4">
            {flussiSite.map(f => <FlussoCard key={f.id} flusso={f} />)}
          </div>
        </div>
      )}

      {/* Flussi Office */}
      {flussiOffice.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-gray-700 mb-3 flex items-center gap-2">
            <span className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">💼</span>
            Percorso Ufficio (Office)
          </h3>
          <div className="grid gap-4">
            {flussiOffice.map(f => <FlussoCard key={f.id} flusso={f} />)}
          </div>
        </div>
      )}

      {flussiTipo.length === 0 && (
        <div className="text-center py-8 text-gray-400">
          <p className="text-4xl mb-2">📋</p>
          <p>Nessun flusso configurato per questo tipo</p>
        </div>
      )}

      {/* Note */}
      <div className="mt-6 p-4 bg-amber-50 rounded-xl border border-amber-200">
        <h4 className="font-semibold text-amber-800 mb-2">⚠️ Note Importanti</h4>
        <ul className="text-sm text-amber-700 space-y-1">
          <li>• Le modifiche sono immediate e influenzano le nuove richieste</li>
          <li>• Le richieste già in corso mantengono il flusso originale</li>
          <li>• I CM possono approvare i trasferimenti direttamente (senza workflow)</li>
        </ul>
      </div>
    </div>
  )
}
