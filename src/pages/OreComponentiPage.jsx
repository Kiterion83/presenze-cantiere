import { useState, useEffect, useMemo } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'

export default function OreComponentiPage() {
  const { progettoId, progetto, persona, isAtLeast } = useAuth()
  
  // Dati
  const [oreComponenti, setOreComponenti] = useState([])
  const [componenti, setComponenti] = useState([])
  const [discipline, setDiscipline] = useState([])
  const [fasiWorkflow, setFasiWorkflow] = useState([])
  const [persone, setPersone] = useState([])
  const [pianificazioni, setPianificazioni] = useState([])
  const [loading, setLoading] = useState(true)
  
  // Vista
  const [vistaAttiva, setVistaAttiva] = useState('registra') // 'registra', 'report', 'dettaglio'
  
  // Filtri report
  const [filtri, setFiltri] = useState({
    disciplina: '',
    dataInizio: '',
    dataFine: '',
    componente: '',
    persona: ''
  })
  
  // Form registrazione
  const [showRegistraModal, setShowRegistraModal] = useState(false)
  const [registraForm, setRegistraForm] = useState({
    componente_id: '',
    ore: '',
    attivita_svolta: '',
    fase_id: '',
    quantita_lavorata: '',
    unita_misura: '',
    data_lavoro: new Date().toISOString().split('T')[0],
    persona_id: '',
    pianificazione_id: ''
  })
  
  // Selezione multipla per registrazione batch
  const [showBatchModal, setShowBatchModal] = useState(false)
  const [selectedComponentIds, setSelectedComponentIds] = useState([])
  const [batchForm, setBatchForm] = useState({
    ore_per_componente: '',
    attivita_svolta: '',
    data_lavoro: new Date().toISOString().split('T')[0]
  })
  
  // Dettaglio componente
  const [selectedComponente, setSelectedComponente] = useState(null)
  const [dettaglioOre, setDettaglioOre] = useState([])

  // ══════════════════════════════════════════════════════════════════════
  // CARICAMENTO DATI
  // ══════════════════════════════════════════════════════════════════════

  useEffect(() => {
    if (progettoId) {
      loadData()
    }
  }, [progettoId])
  
  const loadData = async () => {
    setLoading(true)
    try {
      const [
        { data: oreData },
        { data: compData },
        { data: discData },
        { data: fasiData },
        { data: persData },
        { data: pianData }
      ] = await Promise.all([
        // Ore registrate
        supabase
          .from('ore_componenti')
          .select(`
            *,
            componente:componenti(id, codice, descrizione, disciplina:discipline(nome, colore, icona)),
            fase:fasi_workflow(nome, icona),
            persona:persone(nome, cognome)
          `)
          .eq('progetto_id', progettoId)
          .order('data_lavoro', { ascending: false })
          .limit(500),
        // Componenti
        supabase
          .from('componenti')
          .select(`
            id, codice, descrizione, stato, ore_budget, quantita, unita_misura,
            disciplina:discipline(id, nome, codice, icona, colore),
            tipo:tipi_componente(id, nome, icona)
          `)
          .eq('progetto_id', progettoId)
          .order('codice'),
        // Discipline
        supabase
          .from('discipline')
          .select('*')
          .eq('progetto_id', progettoId)
          .eq('attivo', true)
          .order('ordine'),
        // Fasi workflow
        supabase
          .from('fasi_workflow')
          .select('*')
          .eq('attivo', true)
          .order('ordine'),
        // Persone (per assegnazione)
        supabase
          .from('persone')
          .select('id, nome, cognome, ruolo')
          .eq('progetto_id', progettoId)
          .eq('attivo', true)
          .order('cognome'),
        // Pianificazioni CW corrente
        supabase
          .from('pianificazione_cw')
          .select('id, anno, settimana, componente_id, azione')
          .eq('progetto_id', progettoId)
          .neq('stato', 'completato')
      ])
      
      setOreComponenti(oreData || [])
      setComponenti(compData || [])
      setDiscipline(discData || [])
      setFasiWorkflow(fasiData || [])
      setPersone(persData || [])
      setPianificazioni(pianData || [])
    } catch (error) {
      console.error('Errore caricamento:', error)
    } finally {
      setLoading(false)
    }
  }

  // ══════════════════════════════════════════════════════════════════════
  // STATISTICHE E REPORT
  // ══════════════════════════════════════════════════════════════════════
  
  // Calcola ore per componente
  const reportComponenti = useMemo(() => {
    const report = {}
    
    componenti.forEach(c => {
      report[c.id] = {
        componente: c,
        ore_budget: c.ore_budget || 0,
        ore_actual: 0,
        num_registrazioni: 0,
        persone: new Set(),
        prima_data: null,
        ultima_data: null
      }
    })
    
    oreComponenti.forEach(oc => {
      if (report[oc.componente_id]) {
        report[oc.componente_id].ore_actual += parseFloat(oc.ore) || 0
        report[oc.componente_id].num_registrazioni++
        if (oc.persona_id) report[oc.componente_id].persone.add(oc.persona_id)
        
        const data = new Date(oc.data_lavoro)
        if (!report[oc.componente_id].prima_data || data < report[oc.componente_id].prima_data) {
          report[oc.componente_id].prima_data = data
        }
        if (!report[oc.componente_id].ultima_data || data > report[oc.componente_id].ultima_data) {
          report[oc.componente_id].ultima_data = data
        }
      }
    })
    
    return Object.values(report).map(r => ({
      ...r,
      num_persone: r.persone.size,
      percentuale: r.ore_budget > 0 ? Math.round((r.ore_actual / r.ore_budget) * 100) : null
    }))
  }, [componenti, oreComponenti])
  
  // Filtra report
  const reportFiltrato = useMemo(() => {
    return reportComponenti.filter(r => {
      if (filtri.disciplina && r.componente.disciplina?.id !== filtri.disciplina) return false
      if (filtri.componente) {
        const search = filtri.componente.toLowerCase()
        if (!r.componente.codice.toLowerCase().includes(search) &&
            !r.componente.descrizione?.toLowerCase().includes(search)) return false
      }
      return true
    })
  }, [reportComponenti, filtri])
  
  // Statistiche globali
  const stats = useMemo(() => {
    const totaleOre = oreComponenti.reduce((sum, oc) => sum + (parseFloat(oc.ore) || 0), 0)
    const totaleComponenti = new Set(oreComponenti.map(oc => oc.componente_id)).size
    const totaleBudget = componenti.reduce((sum, c) => sum + (parseFloat(c.ore_budget) || 0), 0)
    
    // Per disciplina
    const perDisciplina = {}
    reportComponenti.forEach(r => {
      const disc = r.componente.disciplina?.nome || 'N/D'
      if (!perDisciplina[disc]) {
        perDisciplina[disc] = { ore: 0, budget: 0, colore: r.componente.disciplina?.colore }
      }
      perDisciplina[disc].ore += r.ore_actual
      perDisciplina[disc].budget += r.ore_budget
    })
    
    return {
      totaleOre: Math.round(totaleOre * 10) / 10,
      totaleComponenti,
      totaleBudget: Math.round(totaleBudget * 10) / 10,
      percentualeGlobale: totaleBudget > 0 ? Math.round((totaleOre / totaleBudget) * 100) : 0,
      perDisciplina
    }
  }, [oreComponenti, componenti, reportComponenti])

  // ══════════════════════════════════════════════════════════════════════
  // AZIONI
  // ══════════════════════════════════════════════════════════════════════
  
  const openRegistraModal = (componenteId = '') => {
    setRegistraForm({
      componente_id: componenteId,
      ore: '',
      attivita_svolta: '',
      fase_id: '',
      quantita_lavorata: '',
      unita_misura: '',
      data_lavoro: new Date().toISOString().split('T')[0],
      persona_id: persona?.id || '',
      pianificazione_id: ''
    })
    setShowRegistraModal(true)
  }
  
  const handleRegistra = async () => {
    if (!registraForm.componente_id) {
      alert('Seleziona un componente')
      return
    }
    if (!registraForm.ore || parseFloat(registraForm.ore) <= 0) {
      alert('Inserisci le ore lavorate')
      return
    }
    
    try {
      const { error } = await supabase
        .from('ore_componenti')
        .insert({
          progetto_id: progettoId,
          componente_id: registraForm.componente_id,
          ore: parseFloat(registraForm.ore),
          attivita_svolta: registraForm.attivita_svolta || null,
          fase_id: registraForm.fase_id || null,
          quantita_lavorata: registraForm.quantita_lavorata ? parseFloat(registraForm.quantita_lavorata) : null,
          unita_misura: registraForm.unita_misura || null,
          data_lavoro: registraForm.data_lavoro,
          persona_id: registraForm.persona_id || persona?.id,
          pianificazione_id: registraForm.pianificazione_id || null,
          created_by: persona?.id
        })
      
      if (error) throw error
      
      setShowRegistraModal(false)
      loadData()
    } catch (error) {
      console.error('Errore registrazione:', error)
      alert('Errore: ' + error.message)
    }
  }
  
  const openBatchModal = () => {
    setSelectedComponentIds([])
    setBatchForm({
      ore_per_componente: '',
      attivita_svolta: '',
      data_lavoro: new Date().toISOString().split('T')[0]
    })
    setShowBatchModal(true)
  }
  
  const handleBatchRegistra = async () => {
    if (selectedComponentIds.length === 0) {
      alert('Seleziona almeno un componente')
      return
    }
    if (!batchForm.ore_per_componente || parseFloat(batchForm.ore_per_componente) <= 0) {
      alert('Inserisci le ore per componente')
      return
    }
    
    try {
      const inserts = selectedComponentIds.map(compId => ({
        progetto_id: progettoId,
        componente_id: compId,
        ore: parseFloat(batchForm.ore_per_componente),
        attivita_svolta: batchForm.attivita_svolta || null,
        data_lavoro: batchForm.data_lavoro,
        persona_id: persona?.id,
        created_by: persona?.id
      }))
      
      const { error } = await supabase
        .from('ore_componenti')
        .insert(inserts)
      
      if (error) throw error
      
      setShowBatchModal(false)
      loadData()
    } catch (error) {
      console.error('Errore registrazione batch:', error)
      alert('Errore: ' + error.message)
    }
  }
  
  const openDettaglio = async (componente) => {
    setSelectedComponente(componente)
    setVistaAttiva('dettaglio')
    
    // Carica dettaglio ore per questo componente
    const { data } = await supabase
      .from('ore_componenti')
      .select(`
        *,
        fase:fasi_workflow(nome, icona),
        persona:persone(nome, cognome)
      `)
      .eq('componente_id', componente.id)
      .order('data_lavoro', { ascending: false })
    
    setDettaglioOre(data || [])
  }
  
  const deleteOreRecord = async (id) => {
    if (!confirm('Eliminare questa registrazione?')) return
    
    try {
      const { error } = await supabase
        .from('ore_componenti')
        .delete()
        .eq('id', id)
      
      if (error) throw error
      
      // Ricarica dettaglio
      if (selectedComponente) {
        openDettaglio(selectedComponente)
      }
      loadData()
    } catch (error) {
      console.error('Errore eliminazione:', error)
      alert('Errore: ' + error.message)
    }
  }
  
  const updateOreBudget = async (componenteId, oreBudget) => {
    try {
      const { error } = await supabase
        .from('componenti')
        .update({ ore_budget: oreBudget ? parseFloat(oreBudget) : null })
        .eq('id', componenteId)
      
      if (error) throw error
      loadData()
    } catch (error) {
      console.error('Errore aggiornamento budget:', error)
    }
  }

  // ══════════════════════════════════════════════════════════════════════
  // RENDER
  // ══════════════════════════════════════════════════════════════════════

  if (loading) {
    return (
      <div className="p-4 flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
          <p className="text-gray-500">Caricamento...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">⏱️ Ore Componenti</h1>
            <p className="text-gray-600 mt-1">{progetto?.nome}</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={openBatchModal}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              📦 Registra multipli
            </button>
            <button
              onClick={() => openRegistraModal()}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              ➕ Registra ore
            </button>
          </div>
        </div>
      </div>
      
      {/* Tab navigazione */}
      <div className="bg-white rounded-xl border shadow-sm mb-6">
        <div className="flex border-b">
          {[
            { key: 'registra', label: 'Registrazioni Recenti', emoji: '📝' },
            { key: 'report', label: 'Report per Componente', emoji: '📊' }
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => { setVistaAttiva(tab.key); setSelectedComponente(null); }}
              className={`flex-1 py-3 text-center font-medium transition-colors ${
                vistaAttiva === tab.key || (vistaAttiva === 'dettaglio' && tab.key === 'report')
                  ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                  : 'text-gray-500 hover:bg-gray-50'
              }`}
            >
              {tab.emoji} {tab.label}
            </button>
          ))}
        </div>
      </div>
      
      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <div className="bg-white rounded-xl p-4 border shadow-sm">
          <div className="text-3xl font-bold text-blue-600">{stats.totaleOre}h</div>
          <div className="text-sm text-gray-500">Ore registrate</div>
        </div>
        <div className="bg-white rounded-xl p-4 border shadow-sm">
          <div className="text-3xl font-bold text-gray-900">{stats.totaleComponenti}</div>
          <div className="text-sm text-gray-500">Componenti lavorati</div>
        </div>
        <div className="bg-white rounded-xl p-4 border shadow-sm">
          <div className="text-3xl font-bold text-green-600">{stats.totaleBudget}h</div>
          <div className="text-sm text-gray-500">Budget totale</div>
        </div>
        <div className="bg-white rounded-xl p-4 border shadow-sm">
          <div className="text-3xl font-bold text-orange-600">{stats.percentualeGlobale}%</div>
          <div className="text-sm text-gray-500">Utilizzo budget</div>
          <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
            <div 
              className={`h-2 rounded-full transition-all ${
                stats.percentualeGlobale > 100 ? 'bg-red-500' : 'bg-green-500'
              }`}
              style={{ width: `${Math.min(stats.percentualeGlobale, 100)}%` }}
            ></div>
          </div>
        </div>
      </div>
      
      {/* Ore per disciplina */}
      {Object.keys(stats.perDisciplina).length > 0 && (
        <div className="bg-white rounded-xl border shadow-sm p-4 mb-6">
          <h3 className="font-semibold text-gray-700 mb-3">📊 Ore per Disciplina</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {Object.entries(stats.perDisciplina).map(([nome, data]) => {
              const perc = data.budget > 0 ? Math.round((data.ore / data.budget) * 100) : 0
              return (
                <div key={nome} className="flex items-center gap-3">
                  <div className="flex-1">
                    <div className="flex justify-between text-sm mb-1">
                      <span className="font-medium">{nome}</span>
                      <span className="text-gray-500">
                        {Math.round(data.ore)}h / {Math.round(data.budget)}h
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full transition-all ${perc > 100 ? 'bg-red-500' : ''}`}
                        style={{ 
                          width: `${Math.min(perc, 100)}%`, 
                          backgroundColor: perc <= 100 ? (data.colore || '#3B82F6') : undefined 
                        }}
                      ></div>
                    </div>
                  </div>
                  <span className={`text-sm font-medium w-12 text-right ${perc > 100 ? 'text-red-600' : ''}`}>
                    {perc}%
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}
      
      {/* ══════════════════════════════════════════════════════════════════════
          VISTA: Registrazioni Recenti
          ══════════════════════════════════════════════════════════════════════ */}
      {vistaAttiva === 'registra' && (
        <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
          <div className="p-4 border-b bg-gray-50">
            <h3 className="font-semibold">📝 Ultime Registrazioni</h3>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Data</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Componente</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Attività</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Persona</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Ore</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Azioni</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {oreComponenti.slice(0, 50).map(oc => (
                  <tr key={oc.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm">
                      {new Date(oc.data_lavoro).toLocaleDateString('it-IT')}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span 
                          className="w-8 h-8 rounded-lg flex items-center justify-center text-sm"
                          style={{ backgroundColor: (oc.componente?.disciplina?.colore || '#6B7280') + '20' }}
                        >
                          {oc.componente?.disciplina?.icona || '📦'}
                        </span>
                        <div>
                          <div className="font-mono text-sm font-medium">{oc.componente?.codice}</div>
                          <div className="text-xs text-gray-500 truncate max-w-xs">{oc.componente?.descrizione}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {oc.fase?.icona} {oc.attivita_svolta || oc.fase?.nome || '-'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {oc.persona ? `${oc.persona.nome} ${oc.persona.cognome}` : '-'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="font-semibold text-blue-600">{oc.ore}h</span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => deleteOreRecord(oc.id)}
                        className="p-1.5 text-red-600 hover:bg-red-50 rounded"
                        title="Elimina"
                      >
                        🗑️
                      </button>
                    </td>
                  </tr>
                ))}
                {oreComponenti.length === 0 && (
                  <tr>
                    <td colSpan="6" className="px-4 py-12 text-center text-gray-500">
                      Nessuna registrazione. Clicca "Registra ore" per iniziare.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
      
      {/* ══════════════════════════════════════════════════════════════════════
          VISTA: Report per Componente
          ══════════════════════════════════════════════════════════════════════ */}
      {vistaAttiva === 'report' && (
        <div>
          {/* Filtri */}
          <div className="bg-white rounded-xl border shadow-sm p-4 mb-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Cerca componente</label>
                <input
                  type="text"
                  value={filtri.componente}
                  onChange={e => setFiltri({...filtri, componente: e.target.value})}
                  placeholder="Codice o descrizione..."
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Disciplina</label>
                <select
                  value={filtri.disciplina}
                  onChange={e => setFiltri({...filtri, disciplina: e.target.value})}
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                >
                  <option value="">Tutte</option>
                  {discipline.map(d => (
                    <option key={d.id} value={d.id}>{d.icona} {d.nome}</option>
                  ))}
                </select>
              </div>
              <div className="flex items-end">
                <button
                  onClick={() => setFiltri({ disciplina: '', dataInizio: '', dataFine: '', componente: '', persona: '' })}
                  className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg text-sm"
                >
                  Pulisci filtri
                </button>
              </div>
            </div>
          </div>
          
          {/* Tabella report */}
          <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Componente</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Disciplina</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Budget</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Actual</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase">%</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Reg.</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Azioni</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {reportFiltrato.map(r => (
                    <tr key={r.componente.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="font-mono text-sm font-medium">{r.componente.codice}</div>
                        <div className="text-xs text-gray-500 truncate max-w-xs">{r.componente.descrizione}</div>
                      </td>
                      <td className="px-4 py-3">
                        <span 
                          className="text-xs px-2 py-1 rounded-full"
                          style={{ 
                            backgroundColor: (r.componente.disciplina?.colore || '#6B7280') + '20',
                            color: r.componente.disciplina?.colore || '#6B7280'
                          }}
                        >
                          {r.componente.disciplina?.icona} {r.componente.disciplina?.nome}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <input
                          type="number"
                          value={r.ore_budget || ''}
                          onChange={e => updateOreBudget(r.componente.id, e.target.value)}
                          className="w-20 px-2 py-1 border rounded text-right text-sm"
                          placeholder="0"
                          step="0.5"
                        />
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className={`font-semibold ${r.percentuale && r.percentuale > 100 ? 'text-red-600' : 'text-blue-600'}`}>
                          {r.ore_actual.toFixed(1)}h
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {r.percentuale !== null ? (
                          <div className="flex items-center gap-2">
                            <div className="w-16 bg-gray-200 rounded-full h-2">
                              <div 
                                className={`h-2 rounded-full ${r.percentuale > 100 ? 'bg-red-500' : 'bg-green-500'}`}
                                style={{ width: `${Math.min(r.percentuale, 100)}%` }}
                              ></div>
                            </div>
                            <span className={`text-xs font-medium ${r.percentuale > 100 ? 'text-red-600' : ''}`}>
                              {r.percentuale}%
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right text-sm text-gray-500">
                        {r.num_registrazioni}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => openDettaglio(r.componente)}
                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded mr-1"
                          title="Dettaglio"
                        >
                          📋
                        </button>
                        <button
                          onClick={() => openRegistraModal(r.componente.id)}
                          className="p-1.5 text-green-600 hover:bg-green-50 rounded"
                          title="Aggiungi ore"
                        >
                          ➕
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
      
      {/* ══════════════════════════════════════════════════════════════════════
          VISTA: Dettaglio Componente
          ══════════════════════════════════════════════════════════════════════ */}
      {vistaAttiva === 'dettaglio' && selectedComponente && (
        <div>
          {/* Breadcrumb */}
          <button
            onClick={() => setVistaAttiva('report')}
            className="mb-4 text-blue-600 hover:underline flex items-center gap-1"
          >
            ← Torna al report
          </button>
          
          {/* Info componente */}
          <div className="bg-white rounded-xl border shadow-sm p-4 mb-4">
            <div className="flex items-center gap-4">
              <span 
                className="text-3xl w-14 h-14 rounded-xl flex items-center justify-center"
                style={{ backgroundColor: (selectedComponente.disciplina?.colore || '#6B7280') + '20' }}
              >
                {selectedComponente.disciplina?.icona || '📦'}
              </span>
              <div className="flex-1">
                <div className="font-mono text-xl font-bold">{selectedComponente.codice}</div>
                <div className="text-gray-500">{selectedComponente.descrizione}</div>
                <div className="flex gap-4 mt-2 text-sm">
                  <span className="text-blue-600 font-semibold">
                    {dettaglioOre.reduce((sum, o) => sum + parseFloat(o.ore), 0).toFixed(1)}h registrate
                  </span>
                  {selectedComponente.ore_budget && (
                    <span className="text-gray-500">
                      Budget: {selectedComponente.ore_budget}h
                    </span>
                  )}
                </div>
              </div>
              <button
                onClick={() => openRegistraModal(selectedComponente.id)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                ➕ Aggiungi ore
              </button>
            </div>
          </div>
          
          {/* Lista ore */}
          <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
            <div className="p-4 border-b bg-gray-50">
              <h3 className="font-semibold">Storico registrazioni</h3>
            </div>
            <div className="divide-y">
              {dettaglioOre.map(oc => (
                <div key={oc.id} className="p-4 hover:bg-gray-50 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="text-center">
                      <div className="text-lg font-bold text-blue-600">{oc.ore}h</div>
                      <div className="text-xs text-gray-500">
                        {new Date(oc.data_lavoro).toLocaleDateString('it-IT')}
                      </div>
                    </div>
                    <div>
                      {oc.attivita_svolta && (
                        <div className="font-medium">{oc.fase?.icona} {oc.attivita_svolta}</div>
                      )}
                      {oc.persona && (
                        <div className="text-sm text-gray-500">
                          👤 {oc.persona.nome} {oc.persona.cognome}
                        </div>
                      )}
                      {oc.quantita_lavorata && (
                        <div className="text-sm text-gray-500">
                          📏 {oc.quantita_lavorata} {oc.unita_misura}
                        </div>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => deleteOreRecord(oc.id)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded"
                  >
                    🗑️
                  </button>
                </div>
              ))}
              {dettaglioOre.length === 0 && (
                <div className="p-8 text-center text-gray-500">
                  Nessuna registrazione per questo componente
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      
      {/* ══════════════════════════════════════════════════════════════════════
          MODAL: Registra ore
          ══════════════════════════════════════════════════════════════════════ */}
      {showRegistraModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-hidden">
            <div className="p-4 border-b flex items-center justify-between">
              <h2 className="text-lg font-semibold">⏱️ Registra Ore</h2>
              <button onClick={() => setShowRegistraModal(false)} className="p-2 hover:bg-gray-100 rounded-lg">✕</button>
            </div>
            
            <div className="p-4 overflow-y-auto max-h-[calc(90vh-140px)] space-y-4">
              {/* Componente */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Componente *</label>
                <select
                  value={registraForm.componente_id}
                  onChange={e => setRegistraForm({...registraForm, componente_id: e.target.value})}
                  className="w-full px-3 py-2 border rounded-lg"
                >
                  <option value="">Seleziona componente...</option>
                  {componenti.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.codice} - {c.descrizione || c.tipo?.nome}
                    </option>
                  ))}
                </select>
              </div>
              
              {/* Ore */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Ore lavorate *</label>
                <input
                  type="number"
                  value={registraForm.ore}
                  onChange={e => setRegistraForm({...registraForm, ore: e.target.value})}
                  className="w-full px-3 py-2 border rounded-lg"
                  placeholder="Es. 4.5"
                  step="0.5"
                  min="0"
                />
              </div>
              
              {/* Data */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Data lavoro</label>
                <input
                  type="date"
                  value={registraForm.data_lavoro}
                  onChange={e => setRegistraForm({...registraForm, data_lavoro: e.target.value})}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
              
              {/* Attività */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Attività svolta</label>
                <input
                  type="text"
                  value={registraForm.attivita_svolta}
                  onChange={e => setRegistraForm({...registraForm, attivita_svolta: e.target.value})}
                  className="w-full px-3 py-2 border rounded-lg"
                  placeholder="Es. Fit-up, Welding, Erection..."
                />
                <div className="flex flex-wrap gap-1 mt-2">
                  {['Fit-up', 'Welding', 'Erection', 'Painting', 'NDT', 'Testing'].map(att => (
                    <button
                      key={att}
                      type="button"
                      onClick={() => setRegistraForm({...registraForm, attivita_svolta: att})}
                      className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs hover:bg-gray-200"
                    >
                      {att}
                    </button>
                  ))}
                </div>
              </div>
              
              {/* Fase */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Fase workflow</label>
                <select
                  value={registraForm.fase_id}
                  onChange={e => setRegistraForm({...registraForm, fase_id: e.target.value})}
                  className="w-full px-3 py-2 border rounded-lg"
                >
                  <option value="">Nessuna</option>
                  {fasiWorkflow.map(f => (
                    <option key={f.id} value={f.id}>{f.icona} {f.nome}</option>
                  ))}
                </select>
              </div>
              
              {/* Quantità lavorata */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Quantità lavorata</label>
                  <input
                    type="number"
                    value={registraForm.quantita_lavorata}
                    onChange={e => setRegistraForm({...registraForm, quantita_lavorata: e.target.value})}
                    className="w-full px-3 py-2 border rounded-lg"
                    placeholder="Es. 5"
                    step="0.1"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Unità</label>
                  <input
                    type="text"
                    value={registraForm.unita_misura}
                    onChange={e => setRegistraForm({...registraForm, unita_misura: e.target.value})}
                    className="w-full px-3 py-2 border rounded-lg"
                    placeholder="m, pz, kg..."
                  />
                </div>
              </div>
              
              {/* Persona */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Persona</label>
                <select
                  value={registraForm.persona_id}
                  onChange={e => setRegistraForm({...registraForm, persona_id: e.target.value})}
                  className="w-full px-3 py-2 border rounded-lg"
                >
                  <option value="">Seleziona...</option>
                  {persone.map(p => (
                    <option key={p.id} value={p.id}>{p.cognome} {p.nome}</option>
                  ))}
                </select>
              </div>
            </div>
            
            <div className="p-4 border-t bg-gray-50 flex justify-end gap-3">
              <button
                onClick={() => setShowRegistraModal(false)}
                className="px-4 py-2 border rounded-lg hover:bg-gray-100"
              >
                Annulla
              </button>
              <button
                onClick={handleRegistra}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Registra
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* ══════════════════════════════════════════════════════════════════════
          MODAL: Registra multipli
          ══════════════════════════════════════════════════════════════════════ */}
      {showBatchModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
            <div className="p-4 border-b flex items-center justify-between">
              <h2 className="text-lg font-semibold">📦 Registra Ore - Multipli</h2>
              <button onClick={() => setShowBatchModal(false)} className="p-2 hover:bg-gray-100 rounded-lg">✕</button>
            </div>
            
            <div className="p-4 overflow-y-auto max-h-[calc(90vh-200px)]">
              {/* Form comune */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4 p-3 bg-gray-50 rounded-lg">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Ore per componente *</label>
                  <input
                    type="number"
                    value={batchForm.ore_per_componente}
                    onChange={e => setBatchForm({...batchForm, ore_per_componente: e.target.value})}
                    className="w-full px-3 py-2 border rounded-lg text-sm"
                    placeholder="Es. 2"
                    step="0.5"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Attività</label>
                  <input
                    type="text"
                    value={batchForm.attivita_svolta}
                    onChange={e => setBatchForm({...batchForm, attivita_svolta: e.target.value})}
                    className="w-full px-3 py-2 border rounded-lg text-sm"
                    placeholder="Es. Fit-up"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Data</label>
                  <input
                    type="date"
                    value={batchForm.data_lavoro}
                    onChange={e => setBatchForm({...batchForm, data_lavoro: e.target.value})}
                    className="w-full px-3 py-2 border rounded-lg text-sm"
                  />
                </div>
              </div>
              
              {/* Lista componenti */}
              <div className="mb-2 flex items-center justify-between">
                <span className="text-sm text-gray-600">
                  {selectedComponentIds.length} selezionati
                </span>
                <button
                  onClick={() => {
                    if (selectedComponentIds.length === componenti.length) {
                      setSelectedComponentIds([])
                    } else {
                      setSelectedComponentIds(componenti.map(c => c.id))
                    }
                  }}
                  className="text-sm text-blue-600 hover:underline"
                >
                  {selectedComponentIds.length === componenti.length ? 'Deseleziona tutti' : 'Seleziona tutti'}
                </button>
              </div>
              
              <div className="border rounded-lg max-h-80 overflow-y-auto">
                {componenti.map(c => (
                  <label
                    key={c.id}
                    className={`flex items-center gap-3 p-3 border-b last:border-b-0 cursor-pointer hover:bg-gray-50 ${
                      selectedComponentIds.includes(c.id) ? 'bg-blue-50' : ''
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedComponentIds.includes(c.id)}
                      onChange={() => {
                        setSelectedComponentIds(prev =>
                          prev.includes(c.id)
                            ? prev.filter(id => id !== c.id)
                            : [...prev, c.id]
                        )
                      }}
                      className="rounded"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="font-mono text-sm font-medium truncate">{c.codice}</div>
                      <div className="text-xs text-gray-500 truncate">{c.descrizione || c.tipo?.nome}</div>
                    </div>
                    <span
                      className="text-xs px-2 py-1 rounded-full whitespace-nowrap"
                      style={{
                        backgroundColor: (c.disciplina?.colore || '#6B7280') + '20',
                        color: c.disciplina?.colore || '#6B7280'
                      }}
                    >
                      {c.disciplina?.nome}
                    </span>
                  </label>
                ))}
              </div>
            </div>
            
            <div className="p-4 border-t bg-gray-50 flex justify-between items-center">
              <span className="text-sm text-gray-600">
                Totale: {selectedComponentIds.length * (parseFloat(batchForm.ore_per_componente) || 0)}h
              </span>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowBatchModal(false)}
                  className="px-4 py-2 border rounded-lg hover:bg-gray-100"
                >
                  Annulla
                </button>
                <button
                  onClick={handleBatchRegistra}
                  disabled={selectedComponentIds.length === 0 || !batchForm.ore_per_componente}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  Registra {selectedComponentIds.length} componenti
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
