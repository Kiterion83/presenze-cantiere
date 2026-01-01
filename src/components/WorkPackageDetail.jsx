// WorkPackageDetail.jsx - Dettaglio WP con pianificazione settimanale
import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'

// Helper per settimane
const getWeekNumber = (date) => {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() + 4 - (d.getDay() || 7))
  const yearStart = new Date(d.getFullYear(), 0, 1)
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7)
}

const getWeeksInYear = (year) => {
  const d = new Date(year, 11, 31)
  return getWeekNumber(d) === 1 ? 52 : getWeekNumber(d)
}

const getWeekDates = (year, week) => {
  const simple = new Date(year, 0, 1 + (week - 1) * 7)
  const dow = simple.getDay()
  const start = new Date(simple)
  start.setDate(simple.getDate() - dow + 1)
  const end = new Date(start)
  end.setDate(start.getDate() + 6)
  return { start, end }
}

export default function WorkPackageDetail({ wp, onClose, onUpdate, language = 'it' }) {
  const [activeTab, setActiveTab] = useState('overview')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState(null)
  
  // Dati WP
  const [fasi, setFasi] = useState([])
  const [componentiWP, setComponentiWP] = useState([])
  const [pianificazione, setPianificazione] = useState([])
  const [documenti, setDocumenti] = useState([])
  
  // Stato pianificazione
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  const [selectedWeek, setSelectedWeek] = useState(getWeekNumber(new Date()))
  const [selectedFase, setSelectedFase] = useState(null)
  const [showPlanModal, setShowPlanModal] = useState(false)
  const [planningComponents, setPlanningComponents] = useState([])
  
  // Upload
  const [uploading, setUploading] = useState(false)

  useEffect(() => {
    loadWPData()
  }, [wp.id])

  const loadWPData = async () => {
    setLoading(true)
    try {
      // Fasi del WP
      const { data: fasiData } = await supabase
        .from('work_package_fasi')
        .select('*, fase:fasi_workflow(*)')
        .eq('work_package_id', wp.id)
        .order('ordine')
      setFasi(fasiData || [])
      if (fasiData?.length > 0 && !selectedFase) {
        setSelectedFase(fasiData[0].fase_workflow_id)
      }
      
      // Componenti del WP
      const { data: compData } = await supabase
        .from('work_package_componenti')
        .select('*, componente:componenti(id, codice, stato)')
        .eq('work_package_id', wp.id)
        .order('ordine')
      setComponentiWP(compData || [])
      
      // Pianificazione
      const { data: planData } = await supabase
        .from('work_package_pianificazione')
        .select(`
          *,
          fase:fasi_workflow(id, nome, icona, colore),
          componenti:work_package_pianificazione_componenti(
            id, componente_id, completato, completato_at,
            componente:componenti(id, codice)
          )
        `)
        .eq('work_package_id', wp.id)
        .order('anno')
        .order('settimana')
      setPianificazione(planData || [])
      
      // Documenti
      const { data: docData } = await supabase
        .from('work_package_documenti')
        .select('*')
        .eq('work_package_id', wp.id)
        .order('created_at', { ascending: false })
      setDocumenti(docData || [])
      
    } catch (error) {
      console.error('Errore:', error)
    } finally {
      setLoading(false)
    }
  }

  // Calcola avanzamento
  const getAvanzamento = () => {
    const totalComp = componentiWP.length
    if (totalComp === 0) return { percent: 0, completed: 0, total: 0 }
    
    const completedSet = new Set()
    pianificazione.forEach(p => {
      p.componenti?.forEach(c => {
        if (c.completato) completedSet.add(c.componente_id)
      })
    })
    
    return {
      percent: Math.round((completedSet.size / totalComp) * 100),
      completed: completedSet.size,
      total: totalComp
    }
  }

  // Avanzamento per fase
  const getAvanzamentoFase = (faseId) => {
    const fasePlan = pianificazione.filter(p => p.fase_workflow_id === faseId)
    let total = 0, completed = 0
    fasePlan.forEach(p => {
      p.componenti?.forEach(c => {
        total++
        if (c.completato) completed++
      })
    })
    return { total, completed, percent: total > 0 ? Math.round((completed / total) * 100) : 0 }
  }

  // Componenti non ancora pianificati per una fase
  const getUnplannedComponents = (faseId) => {
    const plannedIds = new Set()
    pianificazione
      .filter(p => p.fase_workflow_id === faseId)
      .forEach(p => {
        p.componenti?.forEach(c => plannedIds.add(c.componente_id))
      })
    return componentiWP.filter(c => !plannedIds.has(c.componente_id))
  }

  // Apri modal pianificazione
  const openPlanModal = (faseId, year, week) => {
    setSelectedFase(faseId)
    setSelectedYear(year)
    setSelectedWeek(week)
    
    // Pre-seleziona componenti già pianificati per questa settimana/fase
    const existing = pianificazione.find(
      p => p.fase_workflow_id === faseId && p.anno === year && p.settimana === week
    )
    setPlanningComponents(existing?.componenti?.map(c => c.componente_id) || [])
    setShowPlanModal(true)
  }

  // Salva pianificazione settimana
  const savePlanWeek = async () => {
    setSaving(true)
    try {
      // Trova o crea record pianificazione
      let planId
      const existing = pianificazione.find(
        p => p.fase_workflow_id === selectedFase && p.anno === selectedYear && p.settimana === selectedWeek
      )
      
      if (existing) {
        planId = existing.id
        // Rimuovi componenti vecchi
        await supabase
          .from('work_package_pianificazione_componenti')
          .delete()
          .eq('pianificazione_id', planId)
      } else {
        // Crea nuovo
        const { data, error } = await supabase
          .from('work_package_pianificazione')
          .insert({
            work_package_id: wp.id,
            fase_workflow_id: selectedFase,
            anno: selectedYear,
            settimana: selectedWeek
          })
          .select()
          .single()
        if (error) throw error
        planId = data.id
      }
      
      // Inserisci componenti
      if (planningComponents.length > 0) {
        const rows = planningComponents.map(cId => ({
          pianificazione_id: planId,
          componente_id: cId,
          completato: false
        }))
        await supabase.from('work_package_pianificazione_componenti').insert(rows)
      }
      
      setShowPlanModal(false)
      await loadWPData()
      setMessage({ type: 'success', text: language === 'it' ? 'Pianificazione salvata!' : 'Planning saved!' })
      
    } catch (error) {
      console.error('Errore:', error)
      setMessage({ type: 'error', text: error.message })
    } finally {
      setSaving(false)
    }
  }

  // Toggle completamento componente
  const toggleComplete = async (planCompId, currentValue) => {
    try {
      await supabase
        .from('work_package_pianificazione_componenti')
        .update({ 
          completato: !currentValue,
          completato_at: !currentValue ? new Date().toISOString() : null
        })
        .eq('id', planCompId)
      
      await loadWPData()
    } catch (error) {
      console.error('Errore:', error)
    }
  }

  // Upload documento
  const handleFileUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    
    setUploading(true)
    try {
      // Upload a Supabase Storage
      const fileName = `${wp.id}/${Date.now()}_${file.name}`
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('documenti')
        .upload(fileName, file)
      
      if (uploadError) throw uploadError
      
      // Ottieni URL pubblico
      const { data: urlData } = supabase.storage
        .from('documenti')
        .getPublicUrl(fileName)
      
      // Salva record
      await supabase.from('work_package_documenti').insert({
        work_package_id: wp.id,
        nome: file.name,
        file_path: fileName,
        file_url: urlData.publicUrl,
        file_size: file.size,
        mime_type: file.type
      })
      
      await loadWPData()
      setMessage({ type: 'success', text: language === 'it' ? 'Documento caricato!' : 'Document uploaded!' })
      
    } catch (error) {
      console.error('Errore upload:', error)
      setMessage({ type: 'error', text: error.message })
    } finally {
      setUploading(false)
    }
  }

  // Elimina documento
  const deleteDocument = async (doc) => {
    if (!confirm(language === 'it' ? 'Eliminare documento?' : 'Delete document?')) return
    try {
      if (doc.file_path) {
        await supabase.storage.from('documenti').remove([doc.file_path])
      }
      await supabase.from('work_package_documenti').delete().eq('id', doc.id)
      await loadWPData()
    } catch (error) {
      console.error('Errore:', error)
    }
  }

  const avanzamento = getAvanzamento()
  const tabs = [
    { id: 'overview', label: language === 'it' ? 'Panoramica' : 'Overview', icon: '📊' },
    { id: 'planning', label: language === 'it' ? 'Pianificazione' : 'Planning', icon: '📅' },
    { id: 'documents', label: language === 'it' ? 'Documenti' : 'Documents', icon: '📎' }
  ]

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white rounded-2xl p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-5xl max-h-[95vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-4 border-b bg-gradient-to-r from-blue-600 to-purple-600 text-white">
          <div className="flex justify-between items-start">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono font-bold text-xl">{wp.codice}</span>
                <span className={`px-2 py-0.5 rounded text-xs ${
                  wp.stato === 'completato' ? 'bg-green-500' :
                  wp.stato === 'in_corso' ? 'bg-amber-500' :
                  wp.stato === 'bloccato' ? 'bg-red-500' :
                  'bg-white/30'
                }`}>{wp.stato}</span>
              </div>
              <h3 className="text-lg font-medium mt-1">{wp.nome}</h3>
              {wp.descrizione && <p className="text-sm text-white/80 mt-1">{wp.descrizione}</p>}
            </div>
            <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-lg">✕</button>
          </div>
          
          {/* Progress bar */}
          <div className="mt-4">
            <div className="flex justify-between text-sm mb-1">
              <span>{language === 'it' ? 'Avanzamento' : 'Progress'}</span>
              <span>{avanzamento.completed}/{avanzamento.total} ({avanzamento.percent}%)</span>
            </div>
            <div className="h-2 bg-white/30 rounded-full overflow-hidden">
              <div className="h-full bg-white rounded-full transition-all" style={{ width: `${avanzamento.percent}%` }}></div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                activeTab === tab.id 
                  ? 'border-b-2 border-blue-600 text-blue-600' 
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>

        {/* Messaggio */}
        {message && (
          <div className={`mx-4 mt-4 p-3 rounded-lg ${message.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
            {message.text}
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {/* Tab: Panoramica */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Info base */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-3 bg-gray-50 rounded-xl">
                  <p className="text-xs text-gray-500">{language === 'it' ? 'Squadra' : 'Team'}</p>
                  <p className="font-medium">{wp.squadra?.nome || '-'}</p>
                </div>
                <div className="p-3 bg-gray-50 rounded-xl">
                  <p className="text-xs text-gray-500">Foreman</p>
                  <p className="font-medium">{wp.foreman ? `${wp.foreman.nome} ${wp.foreman.cognome}` : '-'}</p>
                </div>
                <div className="p-3 bg-gray-50 rounded-xl">
                  <p className="text-xs text-gray-500">{language === 'it' ? 'Inizio' : 'Start'}</p>
                  <p className="font-medium">{wp.data_inizio_pianificata ? new Date(wp.data_inizio_pianificata).toLocaleDateString() : '-'}</p>
                </div>
                <div className="p-3 bg-gray-50 rounded-xl">
                  <p className="text-xs text-gray-500">{language === 'it' ? 'Fine' : 'End'}</p>
                  <p className="font-medium">{wp.data_fine_pianificata ? new Date(wp.data_fine_pianificata).toLocaleDateString() : '-'}</p>
                </div>
              </div>

              {/* Fasi con avanzamento */}
              <div>
                <h4 className="font-medium mb-3">{language === 'it' ? 'Fasi Workflow' : 'Workflow Phases'}</h4>
                <div className="space-y-2">
                  {fasi.length === 0 ? (
                    <p className="text-gray-500 text-sm">{language === 'it' ? 'Nessuna fase selezionata' : 'No phases selected'}</p>
                  ) : (
                    fasi.map((f, idx) => {
                      const av = getAvanzamentoFase(f.fase_workflow_id)
                      return (
                        <div key={f.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                          <span className="w-6 h-6 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center text-sm font-bold">{idx + 1}</span>
                          <span className="text-xl">{f.fase?.icona}</span>
                          <span className="font-medium flex-1">{f.fase?.nome}</span>
                          <div className="text-right">
                            <span className="text-sm text-gray-500">{av.completed}/{av.total}</span>
                            <div className="w-24 h-1.5 bg-gray-200 rounded-full mt-1">
                              <div className="h-full rounded-full transition-all" 
                                style={{ width: `${av.percent}%`, backgroundColor: f.fase?.colore || '#3B82F6' }}></div>
                            </div>
                          </div>
                        </div>
                      )
                    })
                  )}
                </div>
              </div>

              {/* Componenti */}
              <div>
                <h4 className="font-medium mb-3">{language === 'it' ? 'Componenti' : 'Components'} ({componentiWP.length})</h4>
                <div className="max-h-48 overflow-y-auto bg-gray-50 rounded-xl p-3">
                  <div className="flex flex-wrap gap-1">
                    {componentiWP.map(c => (
                      <span key={c.id} className="px-2 py-1 bg-white border rounded text-xs font-mono">
                        {c.componente?.codice}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Tab: Pianificazione */}
          {activeTab === 'planning' && (
            <div className="space-y-4">
              {/* Selettore Settimana */}
              <div className="flex items-center gap-4 p-3 bg-gray-50 rounded-xl">
                <select value={selectedYear} onChange={e => setSelectedYear(parseInt(e.target.value))}
                  className="px-3 py-2 border rounded-lg">
                  {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
                </select>
                <select value={selectedWeek} onChange={e => setSelectedWeek(parseInt(e.target.value))}
                  className="px-3 py-2 border rounded-lg">
                  {Array.from({ length: getWeeksInYear(selectedYear) }, (_, i) => i + 1).map(w => {
                    const { start, end } = getWeekDates(selectedYear, w)
                    return (
                      <option key={w} value={w}>
                        CW{String(w).padStart(2, '0')} ({start.toLocaleDateString()} - {end.toLocaleDateString()})
                      </option>
                    )
                  })}
                </select>
                <span className="text-sm text-gray-500">
                  {selectedWeek === getWeekNumber(new Date()) && selectedYear === new Date().getFullYear() 
                    ? `✨ ${language === 'it' ? 'Settimana corrente' : 'Current week'}` 
                    : ''}
                </span>
              </div>

              {/* Pianificazione per fase */}
              {fasi.map(f => {
                const fasePlan = pianificazione.find(
                  p => p.fase_workflow_id === f.fase_workflow_id && p.anno === selectedYear && p.settimana === selectedWeek
                )
                const unplanned = getUnplannedComponents(f.fase_workflow_id)
                
                return (
                  <div key={f.id} className="border rounded-xl overflow-hidden">
                    <div className="p-3 bg-gray-50 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">{f.fase?.icona}</span>
                        <span className="font-medium">{f.fase?.nome}</span>
                        {fasePlan?.componenti?.length > 0 && (
                          <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs">
                            {fasePlan.componenti.filter(c => c.completato).length}/{fasePlan.componenti.length}
                          </span>
                        )}
                      </div>
                      <button
                        onClick={() => openPlanModal(f.fase_workflow_id, selectedYear, selectedWeek)}
                        className="px-3 py-1 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700"
                      >
                        + {language === 'it' ? 'Pianifica' : 'Plan'}
                      </button>
                    </div>
                    
                    {fasePlan?.componenti?.length > 0 ? (
                      <div className="p-3 grid grid-cols-2 md:grid-cols-4 gap-2">
                        {fasePlan.componenti.map(pc => (
                          <button
                            key={pc.id}
                            onClick={() => toggleComplete(pc.id, pc.completato)}
                            className={`p-2 rounded-lg text-left text-sm transition-all ${
                              pc.completato 
                                ? 'bg-green-100 border-green-300 border' 
                                : 'bg-white border hover:bg-gray-50'
                            }`}
                          >
                            <span className="font-mono">{pc.componente?.codice}</span>
                            {pc.completato && <span className="ml-1">✅</span>}
                          </button>
                        ))}
                      </div>
                    ) : (
                      <div className="p-4 text-center text-gray-400 text-sm">
                        {language === 'it' ? 'Nessun componente pianificato per questa settimana' : 'No components planned for this week'}
                      </div>
                    )}
                    
                    {unplanned.length > 0 && (
                      <div className="px-3 pb-3">
                        <p className="text-xs text-amber-600">
                          ⚠️ {unplanned.length} {language === 'it' ? 'componenti non ancora pianificati' : 'components not yet planned'}
                        </p>
                      </div>
                    )}
                  </div>
                )
              })}

              {fasi.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <p className="text-4xl mb-2">📅</p>
                  <p>{language === 'it' ? 'Seleziona prima le fasi nel WP' : 'Select phases in WP first'}</p>
                </div>
              )}
            </div>
          )}

          {/* Tab: Documenti */}
          {activeTab === 'documents' && (
            <div className="space-y-4">
              {/* Upload */}
              <div className="border-2 border-dashed rounded-xl p-6 text-center">
                <input 
                  type="file" 
                  id="doc-upload" 
                  className="hidden" 
                  onChange={handleFileUpload}
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.dwg,.png,.jpg,.jpeg"
                />
                <label htmlFor="doc-upload" className="cursor-pointer">
                  <p className="text-4xl mb-2">📄</p>
                  <p className="text-gray-600">
                    {uploading 
                      ? (language === 'it' ? 'Caricamento...' : 'Uploading...') 
                      : (language === 'it' ? 'Clicca per caricare documento' : 'Click to upload document')}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">PDF, DOC, XLS, DWG, immagini</p>
                </label>
              </div>

              {/* Lista documenti */}
              <div className="space-y-2">
                {documenti.length === 0 ? (
                  <p className="text-center text-gray-500 py-4">{language === 'it' ? 'Nessun documento' : 'No documents'}</p>
                ) : (
                  documenti.map(doc => (
                    <div key={doc.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                      <span className="text-2xl">
                        {doc.mime_type?.includes('pdf') ? '📕' :
                         doc.mime_type?.includes('image') ? '🖼️' :
                         doc.mime_type?.includes('sheet') || doc.mime_type?.includes('excel') ? '📊' :
                         '📄'}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{doc.nome}</p>
                        <p className="text-xs text-gray-500">
                          {doc.file_size ? `${Math.round(doc.file_size / 1024)} KB` : ''} • 
                          {new Date(doc.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <a href={doc.file_url} target="_blank" rel="noopener noreferrer"
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg">
                        ⬇️
                      </a>
                      <button onClick={() => deleteDocument(doc)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg">
                        🗑️
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t bg-gray-50 flex justify-end">
          <button onClick={onClose} className="px-4 py-2 bg-gray-200 rounded-xl">
            {language === 'it' ? 'Chiudi' : 'Close'}
          </button>
        </div>
      </div>

      {/* Modal Pianifica Componenti */}
      {showPlanModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
            <div className="p-4 border-b">
              <h4 className="font-bold">
                {language === 'it' ? 'Pianifica Componenti' : 'Plan Components'} - CW{String(selectedWeek).padStart(2, '0')} {selectedYear}
              </h4>
              <p className="text-sm text-gray-500">
                {fasi.find(f => f.fase_workflow_id === selectedFase)?.fase?.nome}
              </p>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {componentiWP.map(c => (
                  <button
                    key={c.componente_id}
                    onClick={() => {
                      setPlanningComponents(prev => 
                        prev.includes(c.componente_id) 
                          ? prev.filter(id => id !== c.componente_id)
                          : [...prev, c.componente_id]
                      )
                    }}
                    className={`p-2 rounded-lg text-sm transition-all ${
                      planningComponents.includes(c.componente_id)
                        ? 'bg-blue-100 ring-2 ring-blue-500'
                        : 'bg-gray-50 hover:bg-gray-100'
                    }`}
                  >
                    <span className="font-mono">{c.componente?.codice}</span>
                  </button>
                ))}
              </div>
            </div>
            
            <div className="p-4 border-t flex items-center justify-between">
              <span className="text-sm text-gray-500">
                {planningComponents.length} {language === 'it' ? 'selezionati' : 'selected'}
              </span>
              <div className="flex gap-2">
                <button onClick={() => setShowPlanModal(false)} className="px-4 py-2 bg-gray-200 rounded-xl">
                  {language === 'it' ? 'Annulla' : 'Cancel'}
                </button>
                <button onClick={savePlanWeek} disabled={saving} className="px-4 py-2 bg-blue-600 text-white rounded-xl">
                  {saving ? '...' : (language === 'it' ? 'Salva' : 'Save')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
