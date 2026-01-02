import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import FirmaDigitale from '../components/FirmaDigitale'
import ImpedimentoModal from '../components/ImpedimentoModal'

export default function RapportinoPage() {
  const { persona, assegnazione, progetto, isAtLeast } = useAuth()
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [rapportino, setRapportino] = useState(null)
  const [presenze, setPresenze] = useState([])
  const [attivita, setAttivita] = useState([])
  const [centriCosto, setCentriCosto] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [showFirma, setShowFirma] = useState(false)
  const [tipoFirma, setTipoFirma] = useState(null)
  const [formData, setFormData] = useState({ centro_costo_id: '', descrizione: '', ore: '', quantita: '', note: '' })
  const [centroCostoSelezionato, setCentroCostoSelezionato] = useState(null)

  // NUOVO: Stati per Work Packages e Componenti
  const [workPackages, setWorkPackages] = useState([])
  const [wpComponenti, setWpComponenti] = useState({}) // { wpId: [componenti] }
  const [loadingWP, setLoadingWP] = useState(false)
  const [showWPSection, setShowWPSection] = useState(true)
  
  // Stato per modal impedimento
  const [showImpedimento, setShowImpedimento] = useState(null) // { pianCompId, compCodice, wpCodice }

  // Helper settimana
  function getWeekNumber(date) {
    const d = new Date(date)
    d.setHours(0, 0, 0, 0)
    d.setDate(d.getDate() + 4 - (d.getDay() || 7))
    const yearStart = new Date(d.getFullYear(), 0, 1)
    return Math.ceil((((d - yearStart) / 86400000) + 1) / 7)
  }

  const currentWeek = getWeekNumber(new Date(selectedDate))
  const currentYear = new Date(selectedDate).getFullYear()

  useEffect(() => {
    if (assegnazione?.progetto_id) loadData()
  }, [assegnazione?.progetto_id, selectedDate])

  const loadData = async () => {
    setLoading(true)
    const { data: cc } = await supabase
      .from('centri_costo')
      .select('*, unita_misura:unita_misura(id, codice, nome)')
      .eq('progetto_id', assegnazione.progetto_id)
      .order('codice')
    setCentriCosto(cc || [])

    const { data: rap } = await supabase.from('rapportini').select('*').eq('progetto_id', assegnazione.progetto_id).eq('data', selectedDate).single()
    setRapportino(rap || null)

    if (rap) {
      const { data: att } = await supabase
        .from('attivita_rapportino')
        .select('*, centro_costo:centri_costo(codice, nome, descrizione, unita_misura:unita_misura(codice, nome), budget_ore, budget_quantita)')
        .eq('rapportino_id', rap.id)
        .order('created_at')
      setAttivita(att || [])
    } else {
      setAttivita([])
    }

    const { data: pres } = await supabase
      .from('presenze')
      .select('*, persona:persone(nome, cognome)')
      .eq('progetto_id', assegnazione.progetto_id)
      .eq('data', selectedDate)
    setPresenze(pres || [])
    
    // NUOVO: Carica Work Packages
    await loadWorkPackages()
    
    setLoading(false)
  }

  // NUOVO: Carica Work Packages assegnati al foreman
  const loadWorkPackages = async () => {
    if (!persona?.id || !assegnazione?.progetto_id) return
    setLoadingWP(true)
    
    try {
      // Carica WP dove il foreman è assegnato o della sua squadra
      const { data: wpData } = await supabase
        .from('work_packages')
        .select('*, squadra:squadre(id, nome)')
        .eq('progetto_id', assegnazione.progetto_id)
        .in('stato', ['pianificato', 'in_corso'])
        .or(`foreman_id.eq.${persona.id}`)
      
      // Per ogni WP, carica i componenti pianificati per questa settimana
      const wpWithComponents = {}
      
      for (const wp of (wpData || [])) {
        // Trova pianificazioni per questa settimana
        const { data: pianificazioni } = await supabase
          .from('work_package_pianificazione')
          .select('id')
          .eq('work_package_id', wp.id)
          .eq('anno', currentYear)
          .eq('settimana', currentWeek)
        
        if (pianificazioni && pianificazioni.length > 0) {
          const pianIds = pianificazioni.map(p => p.id)
          
          // Carica componenti pianificati
          const { data: pianComp } = await supabase
            .from('work_package_pianificazione_componenti')
            .select(`
              id,
              completato,
              completato_at,
              bloccato,
              impedimento_id,
              componente:componenti(id, codice),
              pianificazione:work_package_pianificazione(
                id,
                fase:fasi_workflow(id, nome, icona, colore)
              )
            `)
            .in('pianificazione_id', pianIds)
            .order('created_at')
          
          if (pianComp && pianComp.length > 0) {
            wpWithComponents[wp.id] = {
              wp,
              componenti: pianComp
            }
          }
        }
      }
      
      setWorkPackages(wpData || [])
      setWpComponenti(wpWithComponents)
    } catch (error) {
      console.error('Errore caricamento WP:', error)
    } finally {
      setLoadingWP(false)
    }
  }

  // NUOVO: Toggle completamento componente
  const handleToggleComponente = async (pianCompId, currentValue) => {
    try {
      const { error } = await supabase
        .from('work_package_pianificazione_componenti')
        .update({ 
          completato: !currentValue,
          completato_at: !currentValue ? new Date().toISOString() : null
        })
        .eq('id', pianCompId)
      
      if (error) throw error
      
      // Ricarica WP
      await loadWorkPackages()
      setMessage({ type: 'success', text: !currentValue ? 'Componente completato!' : 'Completamento rimosso' })
      setTimeout(() => setMessage(null), 2000)
    } catch (error) {
      console.error('Errore:', error)
      setMessage({ type: 'error', text: error.message })
    }
  }

  const getOrCreateRapportino = async () => {
    if (rapportino) return rapportino
    const { data, error } = await supabase.from('rapportini').insert({ progetto_id: assegnazione.progetto_id, data: selectedDate, compilato_da: persona.id, stato: 'bozza' }).select().single()
    if (error) throw error
    setRapportino(data)
    return data
  }

  const handleCentroCostoChange = (ccId) => {
    setFormData({ ...formData, centro_costo_id: ccId })
    const cc = centriCosto.find(c => c.id === ccId)
    setCentroCostoSelezionato(cc)
  }

  const calcolaResa = () => {
    const ore = parseFloat(formData.ore) || 0
    const qty = parseFloat(formData.quantita) || 0
    if (ore > 0 && qty > 0) return (qty / ore).toFixed(2)
    return null
  }

  const handleAddAttivita = async () => {
    if (!formData.descrizione || !formData.ore) { 
      setMessage({ type: 'error', text: 'Descrizione e ore obbligatorie' })
      return 
    }
    setSaving(true)
    setMessage(null)
    try {
      const rap = await getOrCreateRapportino()
      const unitaMisura = centroCostoSelezionato?.unita_misura?.codice || null
      
      await supabase.from('attivita_rapportino').insert({ 
        rapportino_id: rap.id, 
        centro_costo_id: formData.centro_costo_id || null, 
        descrizione: formData.descrizione, 
        ore: parseFloat(formData.ore), 
        quantita: formData.quantita ? parseFloat(formData.quantita) : null, 
        unita_misura: unitaMisura, 
        note: formData.note || null 
      })
      
      setMessage({ type: 'success', text: 'Attività aggiunta!' })
      setFormData({ centro_costo_id: '', descrizione: '', ore: '', quantita: '', note: '' })
      setCentroCostoSelezionato(null)
      setShowForm(false)
      loadData()
    } catch (err) { 
      setMessage({ type: 'error', text: err.message }) 
    } finally { 
      setSaving(false) 
    }
  }

  const handleDeleteAttivita = async (id) => {
    if (!confirm('Eliminare questa attività?')) return
    await supabase.from('attivita_rapportino').delete().eq('id', id)
    loadData()
  }

  const handleChangeStato = async (nuovoStato) => {
    if (!rapportino) return
    await supabase.from('rapportini').update({ stato: nuovoStato }).eq('id', rapportino.id)
    loadData()
  }

  const handleOpenFirma = (tipo) => {
    setTipoFirma(tipo)
    setShowFirma(true)
  }

  const handleSaveFirma = async (firmaDataUrl) => {
    if (!rapportino) return
    setSaving(true)
    
    try {
      const updateData = {}
      if (tipoFirma === 'caposquadra') {
        updateData.firma_caposquadra = firmaDataUrl
        updateData.firma_caposquadra_data = new Date().toISOString()
      } else if (tipoFirma === 'supervisore') {
        updateData.firma_supervisore = firmaDataUrl
        updateData.firma_supervisore_data = new Date().toISOString()
        updateData.stato = 'approvato'
      }
      
      await supabase.from('rapportini').update(updateData).eq('id', rapportino.id)
      setMessage({ type: 'success', text: 'Firma salvata!' })
      loadData()
    } catch (err) {
      setMessage({ type: 'error', text: err.message })
    } finally {
      setSaving(false)
      setShowFirma(false)
      setTipoFirma(null)
    }
  }

  const totaleOre = attivita.reduce((s, a) => s + (parseFloat(a.ore) || 0), 0)
  
  const calcolaOrePresenza = (p) => {
    if (p.ore_ordinarie || p.ore_straordinarie) {
      return (parseFloat(p.ore_ordinarie || 0) + parseFloat(p.ore_straordinarie || 0))
    }
    if (p.ora_checkin && p.ora_checkout) {
      const checkin = new Date(`2000-01-01T${p.ora_checkin}`)
      const checkout = new Date(`2000-01-01T${p.ora_checkout}`)
      return (checkout - checkin) / (1000 * 60 * 60)
    }
    return 0
  }
  const totaleOrePresenze = presenze.reduce((s, p) => s + calcolaOrePresenza(p), 0)

  const statoColors = { bozza: 'bg-gray-100 text-gray-700', inviato: 'bg-blue-100 text-blue-700', approvato: 'bg-green-100 text-green-700', rifiutato: 'bg-red-100 text-red-700' }

  // NUOVO: Conta componenti per WP
  const countWPStats = () => {
    let totale = 0, completati = 0, bloccati = 0
    Object.values(wpComponenti).forEach(({ componenti }) => {
      totale += componenti.length
      completati += componenti.filter(c => c.completato).length
      bloccati += componenti.filter(c => c.bloccato).length
    })
    return { totale, completati, bloccati }
  }
  const wpStats = countWPStats()

  return (
    <div className="p-4 lg:p-8">
      {/* Modal Firma */}
      {showFirma && (
        <FirmaDigitale
          titolo={tipoFirma === 'caposquadra' ? 'Firma Caposquadra' : 'Firma Supervisore'}
          onSave={handleSaveFirma}
          onCancel={() => { setShowFirma(false); setTipoFirma(null) }}
        />
      )}

      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">📝 Rapportino</h1>
          <p className="text-gray-500">{progetto?.nome}</p>
        </div>
        <div className="flex items-center gap-3">
          <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="px-4 py-2 border rounded-xl" />
          {rapportino && <span className={`px-3 py-1 rounded-full text-sm font-medium ${statoColors[rapportino.stato]}`}>{rapportino.stato}</span>}
        </div>
      </div>

      {message && <div className={`mb-4 p-4 rounded-xl ${message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>{message.text}</div>}

      {loading ? (
        <div className="text-center py-12 text-gray-500">Caricamento...</div>
      ) : (
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {/* Form Attività */}
            {(!rapportino || rapportino.stato === 'bozza') && (
              showForm ? (
                <div className="bg-white rounded-xl p-6 shadow-sm border">
                  <h3 className="font-semibold text-gray-700 mb-4">➕ Nuova Attività</h3>
                  <div className="grid gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Centro di Costo</label>
                      <select 
                        value={formData.centro_costo_id} 
                        onChange={(e) => handleCentroCostoChange(e.target.value)} 
                        className="w-full px-4 py-3 border rounded-xl"
                      >
                        <option value="">Seleziona centro di costo...</option>
                        {centriCosto.map(cc => (
                          <option key={cc.id} value={cc.id}>
                            [{cc.codice}] {cc.nome || cc.descrizione} {cc.unita_misura ? `(${cc.unita_misura.codice})` : ''}
                          </option>
                        ))}
                      </select>
                    </div>
                    
                    {centroCostoSelezionato && (
                      <div className="p-3 bg-blue-50 rounded-xl text-sm">
                        <p className="text-blue-700">
                          <span className="font-medium">Unità di misura:</span>{' '}
                          {centroCostoSelezionato.unita_misura 
                            ? `${centroCostoSelezionato.unita_misura.nome} (${centroCostoSelezionato.unita_misura.codice})`
                            : 'Non definita'}
                        </p>
                        {centroCostoSelezionato.budget_quantita > 0 && centroCostoSelezionato.budget_ore > 0 && (
                          <p className="text-xs text-blue-600 mt-1">
                            Budget: {centroCostoSelezionato.budget_quantita} {centroCostoSelezionato.unita_misura?.codice} 
                            {' '}in {centroCostoSelezionato.budget_ore}h 
                            {' '}(resa target: {(centroCostoSelezionato.budget_quantita / centroCostoSelezionato.budget_ore).toFixed(2)} {centroCostoSelezionato.unita_misura?.codice}/h)
                          </p>
                        )}
                      </div>
                    )}
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Descrizione *</label>
                      <input 
                        type="text" 
                        value={formData.descrizione} 
                        onChange={(e) => setFormData({...formData, descrizione: e.target.value})} 
                        placeholder="Descrizione attività" 
                        className="w-full px-4 py-3 border rounded-xl" 
                      />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Ore *</label>
                        <input 
                          type="number" 
                          value={formData.ore} 
                          onChange={(e) => setFormData({...formData, ore: e.target.value})} 
                          placeholder="Es: 8" 
                          step="0.5" 
                          className="w-full px-4 py-3 border rounded-xl" 
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Quantità 
                          <span className="text-gray-400 font-normal text-xs ml-1">(opzionale)</span>
                        </label>
                        <div className="flex gap-2">
                          <input 
                            type="number" 
                            value={formData.quantita} 
                            onChange={(e) => setFormData({...formData, quantita: e.target.value})} 
                            placeholder="Es: 50" 
                            step="0.001" 
                            className="flex-1 px-4 py-3 border rounded-xl" 
                          />
                          {centroCostoSelezionato?.unita_misura && (
                            <span className="px-3 py-3 bg-gray-100 rounded-xl text-gray-600 font-medium text-sm">
                              {centroCostoSelezionato.unita_misura.codice}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    {calcolaResa() && (
                      <div className="p-3 bg-green-50 rounded-xl">
                        <p className="text-sm text-green-700">
                          <span className="font-medium">📊 Resa:</span>{' '}
                          {calcolaResa()} {centroCostoSelezionato?.unita_misura?.codice || ''}/h
                          {centroCostoSelezionato?.budget_ore > 0 && centroCostoSelezionato?.budget_quantita > 0 && (
                            <span className="ml-2 text-green-600">
                              (target: {(centroCostoSelezionato.budget_quantita / centroCostoSelezionato.budget_ore).toFixed(2)})
                            </span>
                          )}
                        </p>
                      </div>
                    )}
                    
                    {!formData.quantita && formData.ore && (
                      <div className="p-3 bg-amber-50 rounded-xl">
                        <p className="text-sm text-amber-700">
                          <span className="font-medium">💰 Lavoro in economia:</span>{' '}
                          Registrazione solo ore, senza quantità
                        </p>
                      </div>
                    )}
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Note</label>
                      <textarea 
                        value={formData.note} 
                        onChange={(e) => setFormData({...formData, note: e.target.value})} 
                        placeholder="Note aggiuntive..." 
                        rows={2}
                        className="w-full px-4 py-3 border rounded-xl resize-none" 
                      />
                    </div>
                    
                    <div className="flex gap-2 pt-2">
                      <button 
                        onClick={() => { setShowForm(false); setCentroCostoSelezionato(null); setFormData({ centro_costo_id: '', descrizione: '', ore: '', quantita: '', note: '' }) }} 
                        className="px-4 py-2 bg-gray-200 rounded-xl hover:bg-gray-300"
                      >
                        Annulla
                      </button>
                      <button 
                        onClick={handleAddAttivita} 
                        disabled={saving} 
                        className="px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50"
                      >
                        {saving ? '⏳ Salvataggio...' : '💾 Aggiungi'}
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <button 
                  onClick={() => setShowForm(true)} 
                  className="w-full p-4 border-2 border-dashed border-gray-300 rounded-xl text-gray-500 hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                >
                  ➕ Aggiungi Attività
                </button>
              )
            )}

            {/* Lista Attività */}
            <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
              <div className="p-4 border-b flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-gray-700">📋 Attività del Giorno</h3>
                  <p className="text-sm text-gray-500">{attivita.length} attività</p>
                </div>
                {rapportino && rapportino.stato === 'bozza' && attivita.length > 0 && (
                  <button onClick={() => handleChangeStato('inviato')} className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm">📤 Invia</button>
                )}
              </div>
              {attivita.length === 0 ? (
                <div className="p-8 text-center text-gray-400">Nessuna attività registrata</div>
              ) : (
                <div className="divide-y">
                  {attivita.map(att => (
                    <div key={att.id} className="p-4 hover:bg-gray-50">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="font-medium">{att.descrizione}</p>
                            {att.centro_costo && (
                              <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-xs rounded-full">
                                {att.centro_costo.codice}
                              </span>
                            )}
                          </div>
                          <div className="flex flex-wrap gap-3 text-sm text-gray-600">
                            <span>⏱️ {att.ore}h</span>
                            {att.quantita ? (
                              <>
                                <span>📦 {att.quantita} {att.unita_misura || ''}</span>
                                <span className="text-green-600 font-medium">
                                  📈 {(att.quantita / att.ore).toFixed(2)} {att.unita_misura || ''}/h
                                </span>
                              </>
                            ) : (
                              <span className="text-amber-600">💰 Economia</span>
                            )}
                          </div>
                          {att.note && <p className="text-xs text-gray-500 mt-1">📝 {att.note}</p>}
                        </div>
                        {(!rapportino || rapportino.stato === 'bozza') && (
                          <button onClick={() => handleDeleteAttivita(att.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg">🗑️</button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {attivita.length > 0 && (
                <div className="p-4 bg-gray-50 border-t">
                  <div className="flex justify-between font-semibold">
                    <span>Totale Ore</span>
                    <span>{totaleOre}h</span>
                  </div>
                </div>
              )}
            </div>

            {/* ═══════════════════════════════════════════════════════════════ */}
            {/* NUOVA SEZIONE: Completamento Componenti Work Packages */}
            {/* ═══════════════════════════════════════════════════════════════ */}
            {Object.keys(wpComponenti).length > 0 && (
              <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
                <div 
                  className="p-4 border-b flex items-center justify-between cursor-pointer hover:bg-gray-50"
                  onClick={() => setShowWPSection(!showWPSection)}
                >
                  <div>
                    <h3 className="font-semibold text-gray-700 flex items-center gap-2">
                      📦 Completamento Componenti
                      <span className="text-xs font-normal bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">
                        CW{String(currentWeek).padStart(2, '0')}
                      </span>
                      {wpStats.bloccati > 0 && (
                        <span className="text-xs font-normal bg-red-100 text-red-700 px-2 py-0.5 rounded-full">
                          🚫 {wpStats.bloccati} bloccati
                        </span>
                      )}
                    </h3>
                    <p className="text-sm text-gray-500">
                      {wpStats.completati}/{wpStats.totale} componenti completati questa settimana
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    {/* Progress mini */}
                    <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-green-500 transition-all" 
                        style={{ width: `${wpStats.totale > 0 ? (wpStats.completati / wpStats.totale) * 100 : 0}%` }}
                      />
                    </div>
                    <span className="text-lg">{showWPSection ? '▼' : '▶'}</span>
                  </div>
                </div>
                
                {showWPSection && (
                  <div className="divide-y">
                    {Object.entries(wpComponenti).map(([wpId, { wp, componenti }]) => {
                      const wpCompletati = componenti.filter(c => c.completato).length
                      const wpTotale = componenti.length
                      
                      // Raggruppa per fase
                      const perFase = {}
                      componenti.forEach(c => {
                        const faseNome = c.pianificazione?.fase?.nome || 'Senza fase'
                        const faseIcona = c.pianificazione?.fase?.icona || '📦'
                        const faseColore = c.pianificazione?.fase?.colore || '#9CA3AF'
                        if (!perFase[faseNome]) {
                          perFase[faseNome] = { icona: faseIcona, colore: faseColore, componenti: [] }
                        }
                        perFase[faseNome].componenti.push(c)
                      })
                      
                      return (
                        <div key={wpId} className="p-4">
                          {/* Header WP */}
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <div className="w-3 h-10 rounded" style={{ backgroundColor: wp.colore || '#3B82F6' }} />
                              <div>
                                <span className="font-mono font-bold text-blue-700">{wp.codice}</span>
                                <span className="ml-2 text-gray-700">{wp.nome}</span>
                              </div>
                            </div>
                            <div className="text-sm text-gray-500">
                              <span className={`font-medium ${wpCompletati === wpTotale ? 'text-green-600' : ''}`}>
                                {wpCompletati}/{wpTotale}
                              </span>
                              {wpCompletati === wpTotale && <span className="ml-1">✅</span>}
                            </div>
                          </div>
                          
                          {/* Componenti per fase */}
                          <div className="space-y-3 ml-5">
                            {Object.entries(perFase).map(([faseNome, { icona, colore, componenti: faseComp }]) => (
                              <div key={faseNome}>
                                <div className="flex items-center gap-2 mb-2">
                                  <span>{icona}</span>
                                  <span className="text-sm font-medium text-gray-600">{faseNome}</span>
                                  <span className="text-xs text-gray-400">
                                    ({faseComp.filter(c => c.completato).length}/{faseComp.length})
                                  </span>
                                </div>
                                <div className="flex flex-wrap gap-2 ml-6">
                                  {faseComp.map(comp => (
                                    <div key={comp.id} className="flex items-center gap-1">
                                      {/* Pulsante principale componente */}
                                      <button
                                        onClick={() => !comp.bloccato && handleToggleComponente(comp.id, comp.completato)}
                                        disabled={comp.bloccato}
                                        className={`px-3 py-1.5 rounded-lg text-sm font-mono transition-all ${
                                          comp.bloccato
                                            ? 'bg-red-100 text-red-700 ring-2 ring-red-400 cursor-not-allowed'
                                            : comp.completato
                                              ? 'bg-green-100 text-green-700 ring-2 ring-green-500'
                                              : 'bg-gray-100 text-gray-600 hover:bg-blue-50 hover:text-blue-600'
                                        }`}
                                      >
                                        {comp.bloccato && <span className="mr-1">🚫</span>}
                                        {comp.completato && !comp.bloccato && <span className="mr-1">✓</span>}
                                        {comp.componente?.codice || '???'}
                                      </button>
                                      
                                      {/* Pulsante blocca/sblocca */}
                                      <button
                                        onClick={() => setShowImpedimento({
                                          pianCompId: comp.id,
                                          compCodice: comp.componente?.codice,
                                          wpCodice: wp.codice,
                                          bloccato: comp.bloccato,
                                          impedimentoId: comp.impedimento_id
                                        })}
                                        className={`p-1 rounded text-xs transition-all ${
                                          comp.bloccato 
                                            ? 'bg-red-100 text-red-600 hover:bg-red-200' 
                                            : 'bg-gray-100 text-gray-400 hover:bg-amber-100 hover:text-amber-600'
                                        }`}
                                        title={comp.bloccato ? 'Gestisci blocco' : 'Segnala impedimento'}
                                      >
                                        {comp.bloccato ? '⚠️' : '🚫'}
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
                
                {/* Footer con info */}
                <div className="p-3 bg-purple-50 border-t text-xs text-purple-600 flex items-center gap-2">
                  <span>💡</span>
                  <span>Clicca sui componenti per segnarli come completati. I dati vengono salvati automaticamente.</span>
                </div>
              </div>
            )}

            {/* Messaggio se non ci sono WP pianificati questa settimana */}
            {Object.keys(wpComponenti).length === 0 && !loadingWP && workPackages.length > 0 && (
              <div className="bg-gray-50 rounded-xl border border-dashed p-6 text-center text-gray-500">
                <p className="text-lg mb-1">📦 Nessun componente pianificato</p>
                <p className="text-sm">Non ci sono componenti pianificati per la settimana CW{String(currentWeek).padStart(2, '0')}</p>
              </div>
            )}

            {/* Sezione Firme */}
            {rapportino && attivita.length > 0 && (
              <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
                <div className="p-4 border-b">
                  <h3 className="font-semibold text-gray-700">✍️ Firme</h3>
                </div>
                <div className="p-4 grid lg:grid-cols-2 gap-4">
                  {/* Firma Caposquadra */}
                  <div className={`p-4 rounded-xl border-2 ${rapportino.firma_caposquadra ? 'border-green-200 bg-green-50' : 'border-dashed border-gray-200'}`}>
                    <p className="font-medium text-gray-700 mb-2">👷 Caposquadra</p>
                    {rapportino.firma_caposquadra ? (
                      <div>
                        <img src={rapportino.firma_caposquadra} alt="Firma" className="h-16 object-contain" />
                        <p className="text-xs text-gray-500 mt-2">
                          Firmato: {new Date(rapportino.firma_caposquadra_data).toLocaleString('it-IT')}
                        </p>
                      </div>
                    ) : (
                      isAtLeast('foreman') && rapportino.stato !== 'bozza' && (
                        <button
                          onClick={() => handleOpenFirma('caposquadra')}
                          className="w-full py-3 bg-blue-100 text-blue-700 rounded-xl font-medium hover:bg-blue-200"
                        >
                          ✍️ Firma come Caposquadra
                        </button>
                      )
                    )}
                    {!rapportino.firma_caposquadra && rapportino.stato === 'bozza' && (
                      <p className="text-sm text-gray-400">Invia il rapportino per firmare</p>
                    )}
                  </div>

                  {/* Firma Supervisore */}
                  <div className={`p-4 rounded-xl border-2 ${rapportino.firma_supervisore ? 'border-green-200 bg-green-50' : 'border-dashed border-gray-200'}`}>
                    <p className="font-medium text-gray-700 mb-2">📋 Supervisore</p>
                    {rapportino.firma_supervisore ? (
                      <div>
                        <img src={rapportino.firma_supervisore} alt="Firma" className="h-16 object-contain" />
                        <p className="text-xs text-gray-500 mt-2">
                          Firmato: {new Date(rapportino.firma_supervisore_data).toLocaleString('it-IT')}
                        </p>
                      </div>
                    ) : (
                      isAtLeast('supervisor') && rapportino.firma_caposquadra && (
                        <button
                          onClick={() => handleOpenFirma('supervisore')}
                          className="w-full py-3 bg-green-100 text-green-700 rounded-xl font-medium hover:bg-green-200"
                        >
                          ✍️ Firma e Approva
                        </button>
                      )
                    )}
                    {!rapportino.firma_supervisore && !rapportino.firma_caposquadra && rapportino.stato !== 'bozza' && (
                      <p className="text-sm text-gray-400">In attesa firma caposquadra</p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Colonna Presenze */}
          <div>
            <div className="bg-white rounded-xl shadow-sm border">
              <div className="p-4 border-b">
                <h3 className="font-semibold text-gray-700">👷 Presenze</h3>
                <p className="text-sm text-gray-500">{presenze.length} persone • {totaleOrePresenze.toFixed(1)}h</p>
              </div>
              {presenze.length === 0 ? (
                <div className="p-4 text-center text-gray-400">Nessuna presenza registrata</div>
              ) : (
                <div className="divide-y max-h-96 overflow-y-auto">
                  {presenze.map(p => (
                    <div key={p.id} className="p-3 flex items-center justify-between">
                      <div>
                        <p className="font-medium">{p.persona?.nome} {p.persona?.cognome}</p>
                        <p className="text-xs text-gray-500">
                          {p.ora_checkin?.substring(0,5) || p.ora_entrata} - {p.ora_checkout?.substring(0,5) || p.ora_uscita || 'In corso'}
                        </p>
                      </div>
                      <p className="font-semibold">{calcolaOrePresenza(p).toFixed(1)}h</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Riepilogo Rapportino */}
            {rapportino && (
              <div className="bg-white rounded-xl shadow-sm border mt-4 p-4">
                <h3 className="font-semibold text-gray-700 mb-3">📊 Riepilogo</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Stato</span>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statoColors[rapportino.stato]}`}>{rapportino.stato}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Attività</span>
                    <span className="font-medium">{attivita.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Ore attività</span>
                    <span className="font-medium">{totaleOre}h</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Ore presenze</span>
                    <span className="font-medium">{totaleOrePresenze.toFixed(1)}h</span>
                  </div>
                  {wpStats.totale > 0 && (
                    <>
                      <div className="flex justify-between pt-2 border-t">
                        <span className="text-gray-500">Componenti WP</span>
                        <span className="font-medium text-purple-600">{wpStats.completati}/{wpStats.totale}</span>
                      </div>
                    </>
                  )}
                  <div className="flex justify-between pt-2 border-t">
                    <span className="text-gray-500">Firma CS</span>
                    <span>{rapportino.firma_caposquadra ? '✅' : '⏳'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Firma Sup.</span>
                    <span>{rapportino.firma_supervisore ? '✅' : '⏳'}</span>
                  </div>
                </div>
              </div>
            )}

            {/* NUOVO: Mini riepilogo WP */}
            {wpStats.totale > 0 && (
              <div className="bg-purple-50 rounded-xl border border-purple-200 mt-4 p-4">
                <h3 className="font-semibold text-purple-800 mb-2 flex items-center gap-2">
                  📦 Work Packages
                  <span className="text-xs bg-purple-200 px-2 py-0.5 rounded">CW{String(currentWeek).padStart(2, '0')}</span>
                </h3>
                <div className="space-y-2">
                  {Object.entries(wpComponenti).map(([wpId, { wp, componenti }]) => {
                    const done = componenti.filter(c => c.completato).length
                    const total = componenti.length
                    const pct = total > 0 ? Math.round((done / total) * 100) : 0
                    return (
                      <div key={wpId} className="flex items-center gap-2">
                        <div className="w-2 h-6 rounded" style={{ backgroundColor: wp.colore || '#3B82F6' }} />
                        <span className="text-sm font-mono text-purple-700">{wp.codice}</span>
                        <div className="flex-1 h-2 bg-purple-200 rounded-full overflow-hidden">
                          <div className="h-full bg-purple-600" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="text-xs text-purple-600 font-medium">{pct}%</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal Impedimento */}
      {showImpedimento && (
        <ImpedimentoModal
          onClose={() => setShowImpedimento(null)}
          onSave={async () => {
            await loadWorkPackages()
            setShowImpedimento(null)
          }}
          pianificazioneComponenteId={showImpedimento.pianCompId}
          componenteCodice={showImpedimento.compCodice}
          wpCodice={showImpedimento.wpCodice}
        />
      )}
    </div>
  )
}
