// ImpedimentoModal.jsx - Gestione impedimenti e note attività
import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'

const TIPI_IMPEDIMENTO = [
  { value: 'materiale_mancante', label: 'Materiale mancante', icon: '📦', color: '#F59E0B' },
  { value: 'area_occupata', label: 'Area occupata', icon: '🚧', color: '#EF4444' },
  { value: 'attesa_permessi', label: 'Attesa permessi', icon: '📋', color: '#8B5CF6' },
  { value: 'attivita_propedeutica', label: 'Attività propedeutica', icon: '⚙️', color: '#3B82F6' },
  { value: 'condizioni_meteo', label: 'Condizioni meteo', icon: '🌧️', color: '#06B6D4' },
  { value: 'risorse_non_disponibili', label: 'Risorse non disponibili', icon: '👷', color: '#EC4899' },
  { value: 'problema_tecnico', label: 'Problema tecnico', icon: '🔧', color: '#6B7280' },
  { value: 'altro', label: 'Altro', icon: '❓', color: '#9CA3AF' }
]

const URGENZE = [
  { value: 'bassa', label: 'Bassa', color: '#22C55E' },
  { value: 'media', label: 'Media', color: '#F59E0B' },
  { value: 'alta', label: 'Alta', color: '#EF4444' },
  { value: 'critica', label: 'Critica', color: '#7C2D12' }
]

export default function ImpedimentoModal({ 
  onClose, 
  onSave,
  // Uno di questi sarà valorizzato
  pianificazioneComponenteId = null,
  azioneId = null,
  workPackageId = null,
  // Info contesto
  componenteCodice = '',
  wpCodice = '',
  azioneTitolo = '',
  // Impedimento esistente (per edit)
  impedimentoEsistente = null
}) {
  const { persona, progetto } = useAuth()
  const progettoId = progetto?.id

  const [loading, setLoading] = useState(false)
  const [loadingNotes, setLoadingNotes] = useState(true)
  const [saving, setSaving] = useState(false)
  const [impedimento, setImpedimento] = useState(null)
  const [note, setNote] = useState([])
  const [nuovaNota, setNuovaNota] = useState('')
  
  // Form impedimento
  const [form, setForm] = useState({
    tipo: 'materiale_mancante',
    titolo: '',
    descrizione: '',
    urgenza: 'media',
    assegnato_a: '',
    data_prevista_risoluzione: ''
  })

  // Carica dati esistenti
  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    setLoadingNotes(true)
    
    try {
      // Se c'è già un impedimento, caricalo
      if (impedimentoEsistente) {
        setImpedimento(impedimentoEsistente)
        setForm({
          tipo: impedimentoEsistente.tipo || 'altro',
          titolo: impedimentoEsistente.titolo || '',
          descrizione: impedimentoEsistente.descrizione || '',
          urgenza: impedimentoEsistente.urgenza || 'media',
          assegnato_a: impedimentoEsistente.assegnato_a || '',
          data_prevista_risoluzione: impedimentoEsistente.data_prevista_risoluzione || ''
        })
        
        // Carica note
        const { data: noteData } = await supabase
          .from('note_attivita')
          .select('*, autore:persone(nome, cognome)')
          .eq('impedimento_id', impedimentoEsistente.id)
          .order('created_at', { ascending: true })
        setNote(noteData || [])
      } else {
        // Cerca impedimento esistente per questo riferimento
        let query = supabase.from('impedimenti').select('*').eq('risolto', false)
        
        if (pianificazioneComponenteId) {
          query = query.eq('pianificazione_componente_id', pianificazioneComponenteId)
        } else if (azioneId) {
          query = query.eq('azione_id', azioneId)
        } else if (workPackageId) {
          query = query.eq('work_package_id', workPackageId)
        }
        
        const { data } = await query.single()
        
        if (data) {
          setImpedimento(data)
          setForm({
            tipo: data.tipo || 'altro',
            titolo: data.titolo || '',
            descrizione: data.descrizione || '',
            urgenza: data.urgenza || 'media',
            assegnato_a: data.assegnato_a || '',
            data_prevista_risoluzione: data.data_prevista_risoluzione || ''
          })
          
          // Carica note
          const { data: noteData } = await supabase
            .from('note_attivita')
            .select('*, autore:persone(nome, cognome)')
            .eq('impedimento_id', data.id)
            .order('created_at', { ascending: true })
          setNote(noteData || [])
        }
      }
    } catch (error) {
      // Nessun impedimento esistente
    } finally {
      setLoading(false)
      setLoadingNotes(false)
    }
  }

  // Salva impedimento
  const handleSaveImpedimento = async () => {
    if (!form.titolo.trim()) {
      alert('Inserisci un titolo per l\'impedimento')
      return
    }
    
    setSaving(true)
    try {
      const payload = {
        progetto_id: progettoId,
        tipo: form.tipo,
        titolo: form.titolo,
        descrizione: form.descrizione || null,
        urgenza: form.urgenza,
        assegnato_a: form.assegnato_a || null,
        data_prevista_risoluzione: form.data_prevista_risoluzione || null,
        segnalato_da: persona?.id,
        pianificazione_componente_id: pianificazioneComponenteId,
        azione_id: azioneId,
        work_package_id: workPackageId
      }
      
      let result
      if (impedimento) {
        // Update
        const { data, error } = await supabase
          .from('impedimenti')
          .update(payload)
          .eq('id', impedimento.id)
          .select()
          .single()
        if (error) throw error
        result = data
      } else {
        // Insert
        const { data, error } = await supabase
          .from('impedimenti')
          .insert(payload)
          .select()
          .single()
        if (error) throw error
        result = data
        
        // Aggiorna stato bloccato sul riferimento
        if (pianificazioneComponenteId) {
          await supabase
            .from('work_package_pianificazione_componenti')
            .update({ bloccato: true, impedimento_id: result.id })
            .eq('id', pianificazioneComponenteId)
        } else if (azioneId) {
          await supabase
            .from('azioni')
            .update({ bloccato: true, impedimento_id: result.id })
            .eq('id', azioneId)
        }
      }
      
      setImpedimento(result)
      onSave?.({ type: 'blocked', impedimento: result })
      
    } catch (error) {
      console.error('Errore:', error)
      alert('Errore: ' + error.message)
    } finally {
      setSaving(false)
    }
  }

  // Risolvi impedimento
  const handleRisolvi = async () => {
    if (!impedimento) return
    
    const noteRisoluzione = prompt('Note di risoluzione (opzionale):')
    
    setSaving(true)
    try {
      await supabase
        .from('impedimenti')
        .update({ 
          risolto: true, 
          data_risoluzione: new Date().toISOString().split('T')[0],
          note_risoluzione: noteRisoluzione || null
        })
        .eq('id', impedimento.id)
      
      // Sblocca il riferimento
      if (pianificazioneComponenteId) {
        await supabase
          .from('work_package_pianificazione_componenti')
          .update({ bloccato: false, impedimento_id: null })
          .eq('id', pianificazioneComponenteId)
      } else if (azioneId) {
        await supabase
          .from('azioni')
          .update({ bloccato: false, impedimento_id: null })
          .eq('id', azioneId)
      }
      
      onSave?.({ type: 'resolved' })
      onClose()
      
    } catch (error) {
      console.error('Errore:', error)
      alert('Errore: ' + error.message)
    } finally {
      setSaving(false)
    }
  }

  // Aggiungi nota
  const handleAddNota = async () => {
    if (!nuovaNota.trim()) return
    
    try {
      const payload = {
        progetto_id: progettoId,
        testo: nuovaNota.trim(),
        autore_id: persona?.id,
        impedimento_id: impedimento?.id,
        pianificazione_componente_id: pianificazioneComponenteId,
        azione_id: azioneId,
        work_package_id: workPackageId
      }
      
      const { data, error } = await supabase
        .from('note_attivita')
        .insert(payload)
        .select('*, autore:persone(nome, cognome)')
        .single()
      
      if (error) throw error
      
      setNote([...note, data])
      setNuovaNota('')
      
    } catch (error) {
      console.error('Errore:', error)
    }
  }

  // Contesto
  const titoloContesto = componenteCodice 
    ? `Componente ${componenteCodice}` 
    : azioneTitolo 
      ? `Azione: ${azioneTitolo}`
      : wpCodice 
        ? `Work Package ${wpCodice}`
        : 'Attività'

  const tipoSelezionato = TIPI_IMPEDIMENTO.find(t => t.value === form.tipo)

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b bg-gradient-to-r from-red-600 to-orange-600 text-white">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-xl font-bold flex items-center gap-2">
                🚫 {impedimento ? 'Gestione Impedimento' : 'Segnala Impedimento'}
              </h2>
              <p className="text-white/80 text-sm mt-1">{titoloContesto}</p>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-lg">✕</button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {loading ? (
            <div className="text-center py-8">Caricamento...</div>
          ) : (
            <>
              {/* Form Impedimento */}
              <div className="space-y-4">
                {/* Tipo impedimento - Visual selector */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Tipo di blocco</label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    {TIPI_IMPEDIMENTO.map(tipo => (
                      <button
                        key={tipo.value}
                        type="button"
                        onClick={() => setForm({ ...form, tipo: tipo.value })}
                        className={`p-3 rounded-xl border-2 text-center transition-all ${
                          form.tipo === tipo.value 
                            ? 'border-red-500 bg-red-50' 
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <span className="text-2xl block mb-1">{tipo.icon}</span>
                        <span className="text-xs">{tipo.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Titolo */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Titolo *</label>
                  <input
                    type="text"
                    value={form.titolo}
                    onChange={e => setForm({ ...form, titolo: e.target.value })}
                    placeholder="Es: Canalina 100x50 non disponibile"
                    className="w-full px-4 py-2 border rounded-xl"
                  />
                </div>

                {/* Descrizione */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Descrizione</label>
                  <textarea
                    value={form.descrizione}
                    onChange={e => setForm({ ...form, descrizione: e.target.value })}
                    placeholder="Dettagli aggiuntivi..."
                    rows={2}
                    className="w-full px-4 py-2 border rounded-xl resize-none"
                  />
                </div>

                {/* Urgenza e Assegnato a */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Urgenza</label>
                    <div className="flex gap-1">
                      {URGENZE.map(u => (
                        <button
                          key={u.value}
                          type="button"
                          onClick={() => setForm({ ...form, urgenza: u.value })}
                          className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
                            form.urgenza === u.value 
                              ? 'text-white' 
                              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                          }`}
                          style={form.urgenza === u.value ? { backgroundColor: u.color } : {}}
                        >
                          {u.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Assegnato a</label>
                    <input
                      type="text"
                      value={form.assegnato_a}
                      onChange={e => setForm({ ...form, assegnato_a: e.target.value })}
                      placeholder="Es: Ufficio Acquisti"
                      className="w-full px-4 py-2 border rounded-xl"
                    />
                  </div>
                </div>

                {/* Data prevista */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Data prevista risoluzione</label>
                  <input
                    type="date"
                    value={form.data_prevista_risoluzione}
                    onChange={e => setForm({ ...form, data_prevista_risoluzione: e.target.value })}
                    className="w-full px-4 py-2 border rounded-xl"
                  />
                </div>

                {/* Pulsante salva impedimento */}
                <div className="flex gap-2">
                  <button
                    onClick={handleSaveImpedimento}
                    disabled={saving || !form.titolo.trim()}
                    className="flex-1 py-3 bg-red-600 text-white rounded-xl font-medium hover:bg-red-700 disabled:bg-gray-300"
                  >
                    {saving ? '⏳ Salvataggio...' : impedimento ? '💾 Aggiorna Blocco' : '🚫 Blocca Attività'}
                  </button>
                  {impedimento && (
                    <button
                      onClick={handleRisolvi}
                      disabled={saving}
                      className="px-6 py-3 bg-green-600 text-white rounded-xl font-medium hover:bg-green-700"
                    >
                      ✅ Risolvi
                    </button>
                  )}
                </div>
              </div>

              {/* Sezione Note/Commenti */}
              <div className="border-t pt-6">
                <h3 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
                  💬 Note e Aggiornamenti
                  {note.length > 0 && <span className="text-xs bg-gray-200 px-2 py-0.5 rounded-full">{note.length}</span>}
                </h3>
                
                {/* Lista note */}
                {loadingNotes ? (
                  <div className="text-center py-4 text-gray-400">Caricamento note...</div>
                ) : note.length === 0 ? (
                  <div className="text-center py-4 text-gray-400">Nessuna nota</div>
                ) : (
                  <div className="space-y-3 max-h-48 overflow-y-auto mb-4">
                    {note.map(n => (
                      <div key={n.id} className="p-3 bg-gray-50 rounded-xl">
                        <div className="flex justify-between items-start mb-1">
                          <span className="font-medium text-sm text-gray-700">
                            {n.autore?.nome} {n.autore?.cognome}
                          </span>
                          <span className="text-xs text-gray-400">
                            {new Date(n.created_at).toLocaleString('it-IT', { 
                              day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' 
                            })}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600">{n.testo}</p>
                      </div>
                    ))}
                  </div>
                )}
                
                {/* Form nuova nota */}
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={nuovaNota}
                    onChange={e => setNuovaNota(e.target.value)}
                    onKeyPress={e => e.key === 'Enter' && handleAddNota()}
                    placeholder="Aggiungi un commento..."
                    className="flex-1 px-4 py-2 border rounded-xl"
                  />
                  <button
                    onClick={handleAddNota}
                    disabled={!nuovaNota.trim()}
                    className="px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:bg-gray-300"
                  >
                    📤
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t bg-gray-50">
          <button onClick={onClose} className="w-full py-2 bg-gray-200 rounded-xl hover:bg-gray-300">
            Chiudi
          </button>
        </div>
      </div>
    </div>
  )
}

// Export costanti per uso esterno
export { TIPI_IMPEDIMENTO, URGENZE }
