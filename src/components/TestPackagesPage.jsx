import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useI18n } from '../contexts/I18nContext'
import { supabase } from '../lib/supabase'

export default function TestPackagesPage() {
  const { progettoId, progetto, isAtLeast } = useAuth()
  const { t } = useI18n()
  
  // === STATE ===
  const [testPackages, setTestPackages] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  
  // Dati di supporto
  const [discipline, setDiscipline] = useState([])
  const [squadre, setSquadre] = useState([])
  const [persone, setPersone] = useState([])
  const [testTipi, setTestTipi] = useState([])
  const [fasi, setFasi] = useState([])
  const [componenti, setComponenti] = useState([])
  
  // UI State
  const [showForm, setShowForm] = useState(false)
  const [editingTP, setEditingTP] = useState(null)
  const [showDetail, setShowDetail] = useState(null)
  const [activeTab, setActiveTab] = useState('overview')
  
  // Filtri
  const [searchTerm, setSearchTerm] = useState('')
  const [filterTipo, setFilterTipo] = useState('')
  const [filterStato, setFilterStato] = useState('')
  const [filterSquadra, setFilterSquadra] = useState('')
  
  // Form state
  const [form, setForm] = useState({
    codice: '',
    nome: '',
    descrizione: '',
    tipo: 'hydrotest',
    pressione_test: '',
    pressione_design: '',
    temperatura_test: '',
    fluido_test: 'water',
    durata_holding_minuti: 60,
    volume_stimato: '',
    sistema: '',
    linea_riferimento: '',
    p_and_id_riferimento: '',
    isometrico_riferimento: '',
    procedura_id: '',
    limite_da: '',
    limite_a: '',
    data_inizio_pianificata: '',
    data_fine_pianificata: '',
    disciplina_id: '',
    squadra_id: '',
    foreman_id: '',
    qc_inspector_id: '',
    client_witness_required: false,
    predecessore_id: '',
    work_package_riferimento_id: '',
    priorita: 'normale',
    colore: '#8B5CF6',
    note: ''
  })
  
  // Componenti selezionati per il TP
  const [selectedComponenti, setSelectedComponenti] = useState([])
  const [showComponentiModal, setShowComponentiModal] = useState(false)

  // === LOAD DATA ===
  const loadTestPackages = useCallback(async () => {
    if (!progettoId) return
    try {
      const { data, error } = await supabase
        .from('test_packages')
        .select(`
          *,
          disciplina:discipline(id, nome, codice, icona, colore),
          squadra:squadre(id, nome, colore),
          foreman:persone!test_packages_foreman_id_fkey(id, nome, cognome),
          fase_corrente:test_package_fasi(id, nome, codice, icona, colore, ordine)
        `)
        .eq('progetto_id', progettoId)
        .order('created_at', { ascending: false })
      
      if (error) throw error
      
      // Conta componenti e punch per ogni TP
      const enrichedTP = await Promise.all((data || []).map(async (tp) => {
        const [{ count: compCount }, { count: punchCount }] = await Promise.all([
          supabase.from('test_package_componenti').select('*', { count: 'exact', head: true }).eq('test_package_id', tp.id),
          supabase.from('test_package_punch').select('*', { count: 'exact', head: true }).eq('test_package_id', tp.id).neq('stato', 'closed')
        ])
        return { ...tp, componenti_count: compCount || 0, punch_count: punchCount || 0 }
      }))
      
      setTestPackages(enrichedTP)
    } catch (error) {
      console.error('Errore caricamento TP:', error)
    }
  }, [progettoId])

  const loadSupportData = useCallback(async () => {
    if (!progettoId) return
    try {
      // Discipline
      const { data: discData } = await supabase
        .from('discipline')
        .select('*')
        .eq('progetto_id', progettoId)
        .eq('attivo', true)
        .order('ordine')
      setDiscipline(discData || [])
      
      // Squadre
      const { data: sqData } = await supabase
        .from('squadre')
        .select('*')
        .eq('progetto_id', progettoId)
        .eq('attivo', true)
      setSquadre(sqData || [])
      
      // Persone (globale)
      const { data: persData } = await supabase
        .from('persone')
        .select('*')
        .eq('attivo', true)
        .order('cognome')
      setPersone(persData || [])
      
      // Tipi di test
      const { data: tipiData } = await supabase
        .from('test_tipi')
        .select('*')
        .eq('attivo', true)
        .order('ordine')
      setTestTipi(tipiData || [])
      
      // Fasi workflow
      const { data: fasiData } = await supabase
        .from('test_package_fasi')
        .select('*')
        .eq('progetto_id', progettoId)
        .eq('attivo', true)
        .order('ordine')
      setFasi(fasiData || [])
      
      // Componenti per selezione
      const { data: compData } = await supabase
        .from('componenti')
        .select('*')
        .eq('progetto_id', progettoId)
        .order('codice')
      setComponenti(compData || [])
      
    } catch (error) {
      console.error('Errore caricamento dati supporto:', error)
    }
  }, [progettoId])

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      await Promise.all([loadTestPackages(), loadSupportData()])
      setLoading(false)
    }
    load()
  }, [loadTestPackages, loadSupportData])

  // === FILTERS ===
  const filteredTP = testPackages.filter(tp => {
    if (searchTerm && !tp.codice.toLowerCase().includes(searchTerm.toLowerCase()) && 
        !tp.nome.toLowerCase().includes(searchTerm.toLowerCase())) return false
    if (filterTipo && tp.tipo !== filterTipo) return false
    if (filterStato && tp.stato !== filterStato) return false
    if (filterSquadra && tp.squadra_id !== filterSquadra) return false
    return true
  })

  // === FORM HANDLERS ===
  const resetForm = () => {
    setForm({
      codice: '',
      nome: '',
      descrizione: '',
      tipo: 'hydrotest',
      pressione_test: '',
      pressione_design: '',
      temperatura_test: '',
      fluido_test: 'water',
      durata_holding_minuti: 60,
      volume_stimato: '',
      sistema: '',
      linea_riferimento: '',
      p_and_id_riferimento: '',
      isometrico_riferimento: '',
      procedura_id: '',
      limite_da: '',
      limite_a: '',
      data_inizio_pianificata: '',
      data_fine_pianificata: '',
      disciplina_id: '',
      squadra_id: '',
      foreman_id: '',
      qc_inspector_id: '',
      client_witness_required: false,
      predecessore_id: '',
      work_package_riferimento_id: '',
      priorita: 'normale',
      colore: '#8B5CF6',
      note: ''
    })
    setSelectedComponenti([])
    setEditingTP(null)
  }

  const handleNewTP = () => {
    resetForm()
    // Auto-genera codice
    const nextNum = testPackages.length + 1
    setForm(f => ({ ...f, codice: `TP-${String(nextNum).padStart(3, '0')}` }))
    // Imposta disciplina Commissioning se esiste
    const commDisciplina = discipline.find(d => d.codice === 'COM')
    if (commDisciplina) {
      setForm(f => ({ ...f, disciplina_id: commDisciplina.id }))
    }
    setShowForm(true)
  }

  const handleEditTP = (tp) => {
    setForm({
      codice: tp.codice || '',
      nome: tp.nome || '',
      descrizione: tp.descrizione || '',
      tipo: tp.tipo || 'hydrotest',
      pressione_test: tp.pressione_test || '',
      pressione_design: tp.pressione_design || '',
      temperatura_test: tp.temperatura_test || '',
      fluido_test: tp.fluido_test || 'water',
      durata_holding_minuti: tp.durata_holding_minuti || 60,
      volume_stimato: tp.volume_stimato || '',
      sistema: tp.sistema || '',
      linea_riferimento: tp.linea_riferimento || '',
      p_and_id_riferimento: tp.p_and_id_riferimento || '',
      isometrico_riferimento: tp.isometrico_riferimento || '',
      procedura_id: tp.procedura_id || '',
      limite_da: tp.limite_da || '',
      limite_a: tp.limite_a || '',
      data_inizio_pianificata: tp.data_inizio_pianificata || '',
      data_fine_pianificata: tp.data_fine_pianificata || '',
      disciplina_id: tp.disciplina_id || '',
      squadra_id: tp.squadra_id || '',
      foreman_id: tp.foreman_id || '',
      qc_inspector_id: tp.qc_inspector_id || '',
      client_witness_required: tp.client_witness_required || false,
      predecessore_id: tp.predecessore_id || '',
      work_package_riferimento_id: tp.work_package_riferimento_id || '',
      priorita: tp.priorita || 'normale',
      colore: tp.colore || '#8B5CF6',
      note: tp.note || ''
    })
    setEditingTP(tp)
    setShowForm(true)
    
    // Carica componenti esistenti
    loadTPComponenti(tp.id)
  }

  const loadTPComponenti = async (tpId) => {
    const { data } = await supabase
      .from('test_package_componenti')
      .select('*, componente:componenti(*)')
      .eq('test_package_id', tpId)
    setSelectedComponenti(data || [])
  }

  const handleTipoChange = (tipo) => {
    setForm(f => ({ ...f, tipo }))
    // Auto-compila valori default dal tipo
    const tipoInfo = testTipi.find(t => t.codice === tipo.toUpperCase())
    if (tipoInfo) {
      setForm(f => ({
        ...f,
        tipo,
        pressione_test: tipoInfo.pressione_default || f.pressione_test,
        durata_holding_minuti: tipoInfo.durata_default_minuti || f.durata_holding_minuti,
        fluido_test: tipoInfo.fluido_default || f.fluido_test
      }))
    }
  }

  // === SAVE ===
  const handleSave = async () => {
    if (!form.codice || !form.nome) {
      alert('Codice e Nome sono obbligatori')
      return
    }
    
    setSaving(true)
    try {
      const payload = {
        progetto_id: progettoId,
        codice: form.codice,
        nome: form.nome,
        descrizione: form.descrizione || null,
        tipo: form.tipo,
        pressione_test: form.pressione_test ? parseFloat(form.pressione_test) : null,
        pressione_design: form.pressione_design ? parseFloat(form.pressione_design) : null,
        temperatura_test: form.temperatura_test ? parseFloat(form.temperatura_test) : null,
        fluido_test: form.fluido_test || null,
        durata_holding_minuti: form.durata_holding_minuti ? parseInt(form.durata_holding_minuti) : null,
        volume_stimato: form.volume_stimato ? parseFloat(form.volume_stimato) : null,
        sistema: form.sistema || null,
        linea_riferimento: form.linea_riferimento || null,
        p_and_id_riferimento: form.p_and_id_riferimento || null,
        isometrico_riferimento: form.isometrico_riferimento || null,
        procedura_id: form.procedura_id || null,
        limite_da: form.limite_da || null,
        limite_a: form.limite_a || null,
        data_inizio_pianificata: form.data_inizio_pianificata || null,
        data_fine_pianificata: form.data_fine_pianificata || null,
        disciplina_id: form.disciplina_id || null,
        squadra_id: form.squadra_id || null,
        foreman_id: form.foreman_id || null,
        qc_inspector_id: form.qc_inspector_id || null,
        client_witness_required: form.client_witness_required,
        predecessore_id: form.predecessore_id || null,
        work_package_riferimento_id: form.work_package_riferimento_id || null,
        priorita: form.priorita,
        colore: form.colore,
        note: form.note || null
      }
      
      // Imposta fase iniziale se nuovo
      if (!editingTP) {
        const faseIniziale = fasi.find(f => f.is_iniziale) || fasi[0]
        if (faseIniziale) {
          payload.fase_corrente_id = faseIniziale.id
        }
        payload.stato = 'draft'
      }
      
      let tpId
      if (editingTP) {
        const { error } = await supabase
          .from('test_packages')
          .update(payload)
          .eq('id', editingTP.id)
        if (error) throw error
        tpId = editingTP.id
      } else {
        const { data, error } = await supabase
          .from('test_packages')
          .insert(payload)
          .select()
          .single()
        if (error) throw error
        tpId = data.id
      }
      
      // Pianificazione automatica CW
      if (form.data_inizio_pianificata && form.data_fine_pianificata) {
        await pianificaTP(tpId, form.data_inizio_pianificata, form.data_fine_pianificata)
      }
      
      await loadTestPackages()
      setShowForm(false)
      resetForm()
    } catch (error) {
      console.error('Errore salvataggio:', error)
      alert('Errore: ' + error.message)
    } finally {
      setSaving(false)
    }
  }

  // === PIANIFICAZIONE CW ===
  const getWeekNumber = (date) => {
    const d = new Date(date)
    d.setHours(0, 0, 0, 0)
    d.setDate(d.getDate() + 4 - (d.getDay() || 7))
    const yearStart = new Date(d.getFullYear(), 0, 1)
    return Math.ceil((((d - yearStart) / 86400000) + 1) / 7)
  }

  const getWeeksInRange = (startDate, endDate) => {
    const weeks = []
    const start = new Date(startDate)
    const end = new Date(endDate)
    const current = new Date(start)
    
    while (current <= end) {
      const year = current.getFullYear()
      const week = getWeekNumber(current)
      const key = `${year}-${week}`
      
      if (!weeks.find(w => `${w.year}-${w.week}` === key)) {
        weeks.push({ year, week })
      }
      current.setDate(current.getDate() + 7)
    }
    
    // Assicurati che l'ultima settimana sia inclusa
    const endYear = end.getFullYear()
    const endWeek = getWeekNumber(end)
    if (!weeks.find(w => w.year === endYear && w.week === endWeek)) {
      weeks.push({ year: endYear, week: endWeek })
    }
    
    return weeks
  }

  const pianificaTP = async (tpId, dataInizio, dataFine) => {
    // Rimuovi pianificazioni esistenti
    await supabase
      .from('pianificazione_cw')
      .delete()
      .eq('test_package_id', tpId)
    
    // Calcola settimane
    const weeks = getWeeksInRange(dataInizio, dataFine)
    
    // Inserisci nuove pianificazioni
    for (const { year, week } of weeks) {
      await supabase
        .from('pianificazione_cw')
        .insert({
          progetto_id: progettoId,
          test_package_id: tpId,
          anno: year,
          settimana: week,
          stato: 'pianificato'
        })
    }
  }

  // === DELETE ===
  const handleDelete = async (tp) => {
    if (!confirm(`Eliminare ${tp.codice} - ${tp.nome}?`)) return
    
    try {
      // Elimina pianificazioni
      await supabase.from('pianificazione_cw').delete().eq('test_package_id', tp.id)
      // Elimina componenti
      await supabase.from('test_package_componenti').delete().eq('test_package_id', tp.id)
      // Elimina TP
      const { error } = await supabase.from('test_packages').delete().eq('id', tp.id)
      if (error) throw error
      
      await loadTestPackages()
      setShowDetail(null)
    } catch (error) {
      console.error('Errore eliminazione:', error)
      alert('Errore: ' + error.message)
    }
  }

  // === STATO CHANGE ===
  const handleStatoChange = async (tp, nuovoStato) => {
    try {
      const { error } = await supabase
        .from('test_packages')
        .update({ stato: nuovoStato })
        .eq('id', tp.id)
      if (error) throw error
      await loadTestPackages()
    } catch (error) {
      console.error('Errore cambio stato:', error)
    }
  }

  // === HELPERS ===
  const getStatoBadge = (stato) => {
    const badges = {
      draft: { bg: 'bg-gray-100', text: 'text-gray-700', label: 'Bozza' },
      planned: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Pianificato' },
      ready: { bg: 'bg-indigo-100', text: 'text-indigo-700', label: 'Pronto' },
      in_progress: { bg: 'bg-amber-100', text: 'text-amber-700', label: 'In Corso' },
      holding: { bg: 'bg-purple-100', text: 'text-purple-700', label: 'In Tenuta' },
      passed: { bg: 'bg-green-100', text: 'text-green-700', label: 'Superato' },
      failed: { bg: 'bg-red-100', text: 'text-red-700', label: 'Fallito' },
      on_hold: { bg: 'bg-orange-100', text: 'text-orange-700', label: 'Sospeso' },
      cancelled: { bg: 'bg-gray-100', text: 'text-gray-500', label: 'Annullato' }
    }
    return badges[stato] || badges.draft
  }

  const getTipoIcon = (tipo) => {
    const icons = {
      hydrotest: '💧',
      pneumatic: '💨',
      leak_test: '🔍',
      functional: '⚙️',
      electrical: '⚡',
      loop_check: '🔄',
      cleaning: '🧹',
      drying: '☀️'
    }
    return icons[tipo] || '🧪'
  }

  const getPrioritaBadge = (priorita) => {
    const badges = {
      bassa: { bg: 'bg-gray-100', text: 'text-gray-600' },
      normale: { bg: 'bg-blue-100', text: 'text-blue-600' },
      alta: { bg: 'bg-orange-100', text: 'text-orange-600' },
      urgente: { bg: 'bg-red-100', text: 'text-red-600' }
    }
    return badges[priorita] || badges.normale
  }

  // === RENDER ===
  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-500">Caricamento Test Packages...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            🧪 Test Packages & Commissioning
          </h1>
          <p className="text-gray-500">{progetto?.nome}</p>
        </div>
        
        <div className="flex items-center gap-3">
          {isAtLeast('foreman') && (
            <button
              onClick={handleNewTP}
              className="px-4 py-2 bg-purple-600 text-white rounded-xl font-medium hover:bg-purple-700 transition-colors flex items-center gap-2"
            >
              <span>+</span>
              <span>Nuovo TP</span>
            </button>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <p className="text-2xl font-bold text-gray-800">{testPackages.length}</p>
          <p className="text-sm text-gray-500">Totale</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <p className="text-2xl font-bold text-blue-600">{testPackages.filter(t => t.stato === 'planned').length}</p>
          <p className="text-sm text-gray-500">Pianificati</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <p className="text-2xl font-bold text-amber-600">{testPackages.filter(t => ['in_progress', 'holding'].includes(t.stato)).length}</p>
          <p className="text-sm text-gray-500">In Corso</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <p className="text-2xl font-bold text-green-600">{testPackages.filter(t => t.stato === 'passed').length}</p>
          <p className="text-sm text-gray-500">Completati</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 mb-6">
        <div className="flex flex-wrap gap-3">
          <input
            type="text"
            placeholder="🔍 Cerca codice o nome..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1 min-w-[200px] px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          />
          
          <select
            value={filterTipo}
            onChange={(e) => setFilterTipo(e.target.value)}
            className="px-4 py-2 border border-gray-200 rounded-lg"
          >
            <option value="">Tutti i tipi</option>
            {testTipi.map(tipo => (
              <option key={tipo.codice} value={tipo.codice.toLowerCase()}>
                {tipo.icona} {tipo.nome}
              </option>
            ))}
          </select>
          
          <select
            value={filterStato}
            onChange={(e) => setFilterStato(e.target.value)}
            className="px-4 py-2 border border-gray-200 rounded-lg"
          >
            <option value="">Tutti gli stati</option>
            <option value="draft">Bozza</option>
            <option value="planned">Pianificato</option>
            <option value="ready">Pronto</option>
            <option value="in_progress">In Corso</option>
            <option value="holding">In Tenuta</option>
            <option value="passed">Superato</option>
            <option value="failed">Fallito</option>
          </select>
          
          <select
            value={filterSquadra}
            onChange={(e) => setFilterSquadra(e.target.value)}
            className="px-4 py-2 border border-gray-200 rounded-lg"
          >
            <option value="">Tutte le squadre</option>
            {squadre.map(sq => (
              <option key={sq.id} value={sq.id}>{sq.nome}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Test Packages List */}
      {filteredTP.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center shadow-sm border border-gray-100">
          <span className="text-6xl mb-4 block">🧪</span>
          <h3 className="text-xl font-semibold text-gray-800 mb-2">Nessun Test Package</h3>
          <p className="text-gray-500 mb-6">Crea il primo Test Package per pianificare i collaudi</p>
          {isAtLeast('foreman') && (
            <button
              onClick={handleNewTP}
              className="px-6 py-3 bg-purple-600 text-white rounded-xl font-medium hover:bg-purple-700 transition-colors"
            >
              + Crea Test Package
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {filteredTP.map(tp => {
            const statoBadge = getStatoBadge(tp.stato)
            const prioritaBadge = getPrioritaBadge(tp.priorita)
            
            return (
              <div
                key={tp.id}
                className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => setShowDetail(tp)}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  {/* Left: Info */}
                  <div className="flex items-start gap-4">
                    <div 
                      className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl"
                      style={{ backgroundColor: `${tp.colore}20` }}
                    >
                      {getTipoIcon(tp.tipo)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-bold text-gray-800">{tp.codice}</h3>
                        <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${statoBadge.bg} ${statoBadge.text}`}>
                          {statoBadge.label}
                        </span>
                        {tp.priorita !== 'normale' && (
                          <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${prioritaBadge.bg} ${prioritaBadge.text}`}>
                            {tp.priorita}
                          </span>
                        )}
                      </div>
                      <p className="text-gray-600">{tp.nome}</p>
                      <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                        {tp.data_inizio_pianificata && (
                          <span>📅 {new Date(tp.data_inizio_pianificata).toLocaleDateString('it-IT')} - {new Date(tp.data_fine_pianificata).toLocaleDateString('it-IT')}</span>
                        )}
                        {tp.pressione_test && (
                          <span>⏲️ {tp.pressione_test} bar</span>
                        )}
                        {tp.squadra && (
                          <span>👥 {tp.squadra.nome}</span>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {/* Right: Stats */}
                  <div className="flex items-center gap-4">
                    <div className="text-center">
                      <p className="text-lg font-bold text-gray-800">{tp.componenti_count}</p>
                      <p className="text-xs text-gray-500">Componenti</p>
                    </div>
                    {tp.punch_count > 0 && (
                      <div className="text-center">
                        <p className="text-lg font-bold text-amber-600">{tp.punch_count}</p>
                        <p className="text-xs text-gray-500">Punch</p>
                      </div>
                    )}
                    <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => handleEditTP(tp)}
                        className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
                        title="Modifica"
                      >
                        ✏️
                      </button>
                      {isAtLeast('supervisor') && (
                        <button
                          onClick={() => handleDelete(tp)}
                          className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                          title="Elimina"
                        >
                          🗑️
                        </button>
                      )}
                    </div>
                  </div>
                </div>
                
                {/* Progress bar per fasi */}
                {tp.fase_corrente && (
                  <div className="mt-4 pt-4 border-t border-gray-100">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-500">Fase:</span>
                      <span className="text-sm font-medium" style={{ color: tp.fase_corrente.colore }}>
                        {tp.fase_corrente.icona} {tp.fase_corrente.nome}
                      </span>
                      <span className="text-xs text-gray-400">({tp.fase_corrente.ordine}/11)</span>
                    </div>
                    <div className="w-full h-2 bg-gray-100 rounded-full mt-2">
                      <div 
                        className="h-full rounded-full transition-all"
                        style={{ 
                          width: `${(tp.fase_corrente.ordine / 11) * 100}%`,
                          backgroundColor: tp.fase_corrente.colore 
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center overflow-y-auto p-4">
          <div className="bg-white rounded-2xl w-full max-w-4xl my-8 shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-xl font-bold text-gray-800">
                {editingTP ? `✏️ Modifica ${editingTP.codice}` : '➕ Nuovo Test Package'}
              </h2>
              <button
                onClick={() => { setShowForm(false); resetForm() }}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                ✕
              </button>
            </div>
            
            {/* Form Body */}
            <div className="p-6 max-h-[70vh] overflow-y-auto">
              {/* Identificazione */}
              <div className="mb-6">
                <h3 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
                  🏷️ Identificazione
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Codice *</label>
                    <input
                      type="text"
                      value={form.codice}
                      onChange={(e) => setForm({ ...form, codice: e.target.value })}
                      placeholder="HT-001"
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Nome *</label>
                    <input
                      type="text"
                      value={form.nome}
                      onChange={(e) => setForm({ ...form, nome: e.target.value })}
                      placeholder="Hydrotest Linea Nord"
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Descrizione</label>
                    <textarea
                      value={form.descrizione}
                      onChange={(e) => setForm({ ...form, descrizione: e.target.value })}
                      rows={2}
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                </div>
              </div>

              {/* Tipo e Parametri */}
              <div className="mb-6 p-4 bg-purple-50 rounded-xl border border-purple-200">
                <h3 className="font-semibold text-purple-700 mb-3 flex items-center gap-2">
                  🧪 Tipo Test e Parametri
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Tipo Test *</label>
                    <select
                      value={form.tipo}
                      onChange={(e) => handleTipoChange(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg"
                    >
                      {testTipi.map(tipo => (
                        <option key={tipo.codice} value={tipo.codice.toLowerCase()}>
                          {tipo.icona} {tipo.nome}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Pressione Test (bar)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={form.pressione_test}
                      onChange={(e) => setForm({ ...form, pressione_test: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Pressione Design (bar)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={form.pressione_design}
                      onChange={(e) => setForm({ ...form, pressione_design: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Fluido Test</label>
                    <select
                      value={form.fluido_test}
                      onChange={(e) => setForm({ ...form, fluido_test: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg"
                    >
                      <option value="water">💧 Acqua</option>
                      <option value="nitrogen">💨 Azoto</option>
                      <option value="air">🌬️ Aria</option>
                      <option value="helium">🎈 Elio</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Durata Holding (min)</label>
                    <input
                      type="number"
                      value={form.durata_holding_minuti}
                      onChange={(e) => setForm({ ...form, durata_holding_minuti: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Volume Stimato (L)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={form.volume_stimato}
                      onChange={(e) => setForm({ ...form, volume_stimato: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg"
                    />
                  </div>
                </div>
              </div>

              {/* Riferimenti Tecnici */}
              <div className="mb-6">
                <h3 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
                  📐 Riferimenti Tecnici
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Sistema</label>
                    <input
                      type="text"
                      value={form.sistema}
                      onChange={(e) => setForm({ ...form, sistema: e.target.value })}
                      placeholder="es. Fuel Gas System"
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Linea Riferimento</label>
                    <input
                      type="text"
                      value={form.linea_riferimento}
                      onChange={(e) => setForm({ ...form, linea_riferimento: e.target.value })}
                      placeholder="es. FG-001-A"
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Da (limite)</label>
                    <input
                      type="text"
                      value={form.limite_da}
                      onChange={(e) => setForm({ ...form, limite_da: e.target.value })}
                      placeholder="es. Valve V-1001"
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">A (limite)</label>
                    <input
                      type="text"
                      value={form.limite_a}
                      onChange={(e) => setForm({ ...form, limite_a: e.target.value })}
                      placeholder="es. Flange F-2010"
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">P&ID Riferimento</label>
                    <input
                      type="text"
                      value={form.p_and_id_riferimento}
                      onChange={(e) => setForm({ ...form, p_and_id_riferimento: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Procedura ID</label>
                    <input
                      type="text"
                      value={form.procedura_id}
                      onChange={(e) => setForm({ ...form, procedura_id: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg"
                    />
                  </div>
                </div>
              </div>

              {/* Pianificazione */}
              <div className="mb-6 p-4 bg-blue-50 rounded-xl border border-blue-200">
                <h3 className="font-semibold text-blue-700 mb-3 flex items-center gap-2">
                  📅 Pianificazione
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Data Inizio</label>
                    <input
                      type="date"
                      value={form.data_inizio_pianificata}
                      onChange={(e) => setForm({ ...form, data_inizio_pianificata: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Data Fine</label>
                    <input
                      type="date"
                      value={form.data_fine_pianificata}
                      onChange={(e) => setForm({ ...form, data_fine_pianificata: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg"
                    />
                  </div>
                </div>
                {form.data_inizio_pianificata && form.data_fine_pianificata && (
                  <div className="mt-3 p-3 bg-white rounded-lg border border-blue-200">
                    <p className="text-sm text-blue-700">
                      📆 Settimane pianificate: {getWeeksInRange(form.data_inizio_pianificata, form.data_fine_pianificata)
                        .map(w => `CW${String(w.week).padStart(2, '0')}`).join(', ')}
                    </p>
                  </div>
                )}
              </div>

              {/* Assegnazioni */}
              <div className="mb-6">
                <h3 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
                  👥 Assegnazioni
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Disciplina</label>
                    <select
                      value={form.disciplina_id}
                      onChange={(e) => setForm({ ...form, disciplina_id: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg"
                    >
                      <option value="">- Seleziona -</option>
                      {discipline.map(d => (
                        <option key={d.id} value={d.id}>{d.icona} {d.nome}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Squadra</label>
                    <select
                      value={form.squadra_id}
                      onChange={(e) => setForm({ ...form, squadra_id: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg"
                    >
                      <option value="">- Seleziona -</option>
                      {squadre.map(sq => (
                        <option key={sq.id} value={sq.id}>{sq.nome}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Foreman</label>
                    <select
                      value={form.foreman_id}
                      onChange={(e) => setForm({ ...form, foreman_id: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg"
                    >
                      <option value="">- Seleziona -</option>
                      {persone.map(p => (
                        <option key={p.id} value={p.id}>{p.cognome} {p.nome}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">QC Inspector</label>
                    <select
                      value={form.qc_inspector_id}
                      onChange={(e) => setForm({ ...form, qc_inspector_id: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg"
                    >
                      <option value="">- Seleziona -</option>
                      {persone.map(p => (
                        <option key={p.id} value={p.id}>{p.cognome} {p.nome}</option>
                      ))}
                    </select>
                  </div>
                  <div className="sm:col-span-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={form.client_witness_required}
                        onChange={(e) => setForm({ ...form, client_witness_required: e.target.checked })}
                        className="w-5 h-5 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                      />
                      <span className="text-sm text-gray-700">👁️ Richiede Witness Cliente</span>
                    </label>
                  </div>
                </div>
              </div>

              {/* Priorità e Colore */}
              <div className="mb-6">
                <h3 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
                  🎨 Aspetto
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Priorità</label>
                    <select
                      value={form.priorita}
                      onChange={(e) => setForm({ ...form, priorita: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg"
                    >
                      <option value="bassa">🟢 Bassa</option>
                      <option value="normale">🔵 Normale</option>
                      <option value="alta">🟠 Alta</option>
                      <option value="urgente">🔴 Urgente</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Colore</label>
                    <div className="flex gap-2">
                      {['#3B82F6', '#22C55E', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4'].map(color => (
                        <button
                          key={color}
                          type="button"
                          onClick={() => setForm({ ...form, colore: color })}
                          className={`w-8 h-8 rounded-full border-2 transition-transform ${form.colore === color ? 'scale-110 border-gray-800' : 'border-transparent'}`}
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Note */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Note</label>
                <textarea
                  value={form.note}
                  onChange={(e) => setForm({ ...form, note: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg"
                  placeholder="Note aggiuntive..."
                />
              </div>
            </div>
            
            {/* Footer */}
            <div className="flex justify-end gap-3 p-6 border-t bg-gray-50 rounded-b-2xl">
              <button
                onClick={() => { setShowForm(false); resetForm() }}
                className="px-6 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Annulla
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-6 py-2 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition-colors disabled:opacity-50"
              >
                {saving ? 'Salvataggio...' : (editingTP ? 'Salva Modifiche' : 'Crea Test Package')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {showDetail && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center overflow-y-auto p-4">
          <div className="bg-white rounded-2xl w-full max-w-4xl my-8 shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b" style={{ backgroundColor: `${showDetail.colore}10` }}>
              <div className="flex items-center gap-4">
                <div 
                  className="w-14 h-14 rounded-xl flex items-center justify-center text-3xl"
                  style={{ backgroundColor: `${showDetail.colore}20` }}
                >
                  {getTipoIcon(showDetail.tipo)}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-bold text-gray-800">{showDetail.codice}</h2>
                    <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${getStatoBadge(showDetail.stato).bg} ${getStatoBadge(showDetail.stato).text}`}>
                      {getStatoBadge(showDetail.stato).label}
                    </span>
                  </div>
                  <p className="text-gray-600">{showDetail.nome}</p>
                </div>
              </div>
              <button
                onClick={() => setShowDetail(null)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                ✕
              </button>
            </div>
            
            {/* Tabs */}
            <div className="flex border-b">
              {[
                { id: 'overview', label: '📋 Overview', icon: '📋' },
                { id: 'fasi', label: '📈 Fasi', icon: '📈' },
                { id: 'componenti', label: '🔩 Componenti', icon: '🔩' },
                { id: 'punch', label: '⚠️ Punch', icon: '⚠️' }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                    activeTab === tab.id 
                      ? 'text-purple-600 border-b-2 border-purple-600 bg-purple-50' 
                      : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
            
            {/* Tab Content */}
            <div className="p-6 max-h-[60vh] overflow-y-auto">
              {activeTab === 'overview' && (
                <div className="space-y-6">
                  {/* Info Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div className="bg-gray-50 rounded-lg p-3">
                      <p className="text-xs text-gray-500 mb-1">Tipo Test</p>
                      <p className="font-medium">{getTipoIcon(showDetail.tipo)} {showDetail.tipo}</p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-3">
                      <p className="text-xs text-gray-500 mb-1">Pressione Test</p>
                      <p className="font-medium">{showDetail.pressione_test || '-'} bar</p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-3">
                      <p className="text-xs text-gray-500 mb-1">Durata Holding</p>
                      <p className="font-medium">{showDetail.durata_holding_minuti || '-'} min</p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-3">
                      <p className="text-xs text-gray-500 mb-1">Fluido</p>
                      <p className="font-medium">{showDetail.fluido_test || '-'}</p>
                    </div>
                  </div>
                  
                  {/* Riferimenti */}
                  {(showDetail.sistema || showDetail.linea_riferimento) && (
                    <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
                      <h4 className="font-semibold text-blue-700 mb-2">📐 Riferimenti Tecnici</h4>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        {showDetail.sistema && (
                          <div><span className="text-gray-500">Sistema:</span> <span className="font-medium">{showDetail.sistema}</span></div>
                        )}
                        {showDetail.linea_riferimento && (
                          <div><span className="text-gray-500">Linea:</span> <span className="font-medium">{showDetail.linea_riferimento}</span></div>
                        )}
                        {showDetail.limite_da && (
                          <div><span className="text-gray-500">Da:</span> <span className="font-medium">{showDetail.limite_da}</span></div>
                        )}
                        {showDetail.limite_a && (
                          <div><span className="text-gray-500">A:</span> <span className="font-medium">{showDetail.limite_a}</span></div>
                        )}
                      </div>
                    </div>
                  )}
                  
                  {/* Assegnazioni */}
                  <div className="bg-gray-50 rounded-xl p-4">
                    <h4 className="font-semibold text-gray-700 mb-2">👥 Assegnazioni</h4>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div><span className="text-gray-500">Disciplina:</span> <span className="font-medium">{showDetail.disciplina?.nome || '-'}</span></div>
                      <div><span className="text-gray-500">Squadra:</span> <span className="font-medium">{showDetail.squadra?.nome || '-'}</span></div>
                      <div><span className="text-gray-500">Foreman:</span> <span className="font-medium">{showDetail.foreman ? `${showDetail.foreman.nome} ${showDetail.foreman.cognome}` : '-'}</span></div>
                      <div><span className="text-gray-500">Witness Cliente:</span> <span className="font-medium">{showDetail.client_witness_required ? '✅ Richiesto' : '❌ No'}</span></div>
                    </div>
                  </div>
                  
                  {/* Azioni rapide */}
                  <div className="flex flex-wrap gap-2">
                    {showDetail.stato === 'draft' && (
                      <button
                        onClick={() => handleStatoChange(showDetail, 'planned')}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
                      >
                        📅 Pianifica
                      </button>
                    )}
                    {showDetail.stato === 'planned' && (
                      <button
                        onClick={() => handleStatoChange(showDetail, 'ready')}
                        className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700"
                      >
                        ✅ Segna Pronto
                      </button>
                    )}
                    {showDetail.stato === 'ready' && (
                      <button
                        onClick={() => handleStatoChange(showDetail, 'in_progress')}
                        className="px-4 py-2 bg-amber-600 text-white rounded-lg text-sm font-medium hover:bg-amber-700"
                      >
                        ▶️ Inizia Test
                      </button>
                    )}
                    {showDetail.stato === 'in_progress' && (
                      <>
                        <button
                          onClick={() => handleStatoChange(showDetail, 'passed')}
                          className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700"
                        >
                          ✅ Test Superato
                        </button>
                        <button
                          onClick={() => handleStatoChange(showDetail, 'failed')}
                          className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700"
                        >
                          ❌ Test Fallito
                        </button>
                      </>
                    )}
                    <button
                      onClick={() => { handleEditTP(showDetail); setShowDetail(null) }}
                      className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-300"
                    >
                      ✏️ Modifica
                    </button>
                  </div>
                </div>
              )}
              
              {activeTab === 'fasi' && (
                <div className="space-y-3">
                  {fasi.map((fase, idx) => {
                    const isCurrentOrPast = showDetail.fase_corrente && fase.ordine <= showDetail.fase_corrente.ordine
                    const isCurrent = showDetail.fase_corrente?.id === fase.id
                    
                    return (
                      <div 
                        key={fase.id}
                        className={`flex items-center gap-4 p-4 rounded-xl border-2 transition-all ${
                          isCurrent ? 'border-purple-500 bg-purple-50' : 
                          isCurrentOrPast ? 'border-green-200 bg-green-50' : 'border-gray-100 bg-gray-50'
                        }`}
                      >
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold ${
                          isCurrent ? 'bg-purple-500' : isCurrentOrPast ? 'bg-green-500' : 'bg-gray-300'
                        }`}>
                          {isCurrentOrPast ? '✓' : idx + 1}
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-gray-800">{fase.icona} {fase.nome}</p>
                          <p className="text-xs text-gray-500">{fase.descrizione}</p>
                          <div className="flex gap-2 mt-1">
                            {fase.richiede_firma_qc && (
                              <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full">QC</span>
                            )}
                            {fase.richiede_witness && (
                              <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-xs rounded-full">Witness</span>
                            )}
                          </div>
                        </div>
                        {isCurrent && (
                          <span className="px-3 py-1 bg-purple-600 text-white text-xs font-medium rounded-full">
                            In corso
                          </span>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
              
              {activeTab === 'componenti' && (
                <div className="text-center py-8 text-gray-500">
                  <span className="text-4xl mb-4 block">🔩</span>
                  <p>Gestione componenti disponibile nella prossima versione</p>
                  <p className="text-sm mt-2">{showDetail.componenti_count} componenti assegnati</p>
                </div>
              )}
              
              {activeTab === 'punch' && (
                <div className="text-center py-8 text-gray-500">
                  <span className="text-4xl mb-4 block">⚠️</span>
                  <p>Gestione punch list disponibile nella prossima versione</p>
                  <p className="text-sm mt-2">{showDetail.punch_count} punch aperti</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
