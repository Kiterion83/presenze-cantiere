import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useI18n } from '../contexts/I18nContext'
import { supabase } from '../lib/supabase'
import TestPackageDocumenti from './TestPackageDocumenti'

export default function TestPackagesPage() {
  const { progettoId, progetto, isAtLeast, persona } = useAuth()
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
  
  // === STATI PER COMPONENTI TAB ===
  const [tpComponenti, setTpComponenti] = useState([])
  const [loadingComponenti, setLoadingComponenti] = useState(false)
  const [componenteSearch, setComponenteSearch] = useState('')
  
  // === STATI PER AVANZAMENTO FASI ===
  const [tpAvanzamenti, setTpAvanzamenti] = useState([])
  const [loadingFasi, setLoadingFasi] = useState(false)
  const [showFirmaModal, setShowFirmaModal] = useState(false)
  const [selectedFase, setSelectedFase] = useState(null)
  const [firmaForm, setFirmaForm] = useState({
    note: '',
    esito: 'approved'
  })
  
  // === STATI PER PUNCH LIST ===
  const [tpPunch, setTpPunch] = useState([])
  const [loadingPunch, setLoadingPunch] = useState(false)
  const [showPunchForm, setShowPunchForm] = useState(false)
  const [editingPunch, setEditingPunch] = useState(null)
  const [punchForm, setPunchForm] = useState({
    titolo: '',
    descrizione: '',
    categoria: 'general',
    priorita: 'medium',
    assegnato_a_id: '',
    componente_id: ''
  })

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
      const { data: discData } = await supabase.from('discipline').select('*').eq('progetto_id', progettoId).eq('attivo', true).order('ordine')
      setDiscipline(discData || [])
      
      const { data: sqData } = await supabase.from('squadre').select('*').eq('progetto_id', progettoId).eq('attivo', true)
      setSquadre(sqData || [])
      
      const { data: persData } = await supabase.from('persone').select('*').eq('attivo', true).order('cognome')
      setPersone(persData || [])
      
      const { data: tipiData } = await supabase.from('test_tipi').select('*').eq('attivo', true).order('ordine')
      setTestTipi(tipiData || [])
      
      const { data: fasiData } = await supabase.from('test_package_fasi').select('*').eq('progetto_id', progettoId).eq('attivo', true).order('ordine')
      setFasi(fasiData || [])
      
      const { data: compData } = await supabase.from('componenti').select('*').eq('progetto_id', progettoId).order('codice')
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

  // === LOAD DETAIL DATA ===
  const loadTPComponenti = async (tpId) => {
    setLoadingComponenti(true)
    try {
      const { data } = await supabase
        .from('test_package_componenti')
        .select('*, componente:componenti(*)')
        .eq('test_package_id', tpId)
        .order('created_at')
      setTpComponenti(data || [])
    } catch (e) {
      console.error('Errore caricamento componenti:', e)
    } finally {
      setLoadingComponenti(false)
    }
  }

  const loadTPAvanzamenti = async (tpId) => {
    setLoadingFasi(true)
    try {
      const { data } = await supabase
        .from('test_package_avanzamento')
        .select(`
          *,
          fase:test_package_fasi(*),
          firmato_da:persone!test_package_avanzamento_firmato_da_fkey(id, nome, cognome)
        `)
        .eq('test_package_id', tpId)
        .order('created_at')
      setTpAvanzamenti(data || [])
    } catch (e) {
      console.error('Errore caricamento avanzamenti:', e)
    } finally {
      setLoadingFasi(false)
    }
  }

  const loadTPPunch = async (tpId) => {
    setLoadingPunch(true)
    try {
      const { data } = await supabase
        .from('test_package_punch')
        .select(`
          *,
          creato_da:persone!test_package_punch_creato_da_fkey(id, nome, cognome),
          assegnato_a:persone!test_package_punch_assegnato_a_id_fkey(id, nome, cognome),
          componente:componenti(id, codice, descrizione)
        `)
        .eq('test_package_id', tpId)
        .order('created_at', { ascending: false })
      setTpPunch(data || [])
    } catch (e) {
      console.error('Errore caricamento punch:', e)
    } finally {
      setLoadingPunch(false)
    }
  }

  // Load tab data when switching
  useEffect(() => {
    if (showDetail) {
      if (activeTab === 'componenti') loadTPComponenti(showDetail.id)
      if (activeTab === 'fasi') loadTPAvanzamenti(showDetail.id)
      if (activeTab === 'punch') loadTPPunch(showDetail.id)
    }
  }, [activeTab, showDetail])

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
      codice: '', nome: '', descrizione: '', tipo: 'hydrotest',
      pressione_test: '', pressione_design: '', temperatura_test: '',
      fluido_test: 'water', durata_holding_minuti: 60, volume_stimato: '',
      sistema: '', linea_riferimento: '', p_and_id_riferimento: '',
      isometrico_riferimento: '', procedura_id: '', limite_da: '', limite_a: '',
      data_inizio_pianificata: '', data_fine_pianificata: '',
      disciplina_id: '', squadra_id: '', foreman_id: '', qc_inspector_id: '',
      client_witness_required: false, predecessore_id: '', work_package_riferimento_id: '',
      priorita: 'normale', colore: '#8B5CF6', note: ''
    })
    setSelectedComponenti([])
    setEditingTP(null)
  }

  const handleNewTP = () => {
    resetForm()
    const nextNum = testPackages.length + 1
    setForm(f => ({ ...f, codice: `TP-${String(nextNum).padStart(3, '0')}` }))
    const commDisciplina = discipline.find(d => d.codice === 'COM')
    if (commDisciplina) setForm(f => ({ ...f, disciplina_id: commDisciplina.id }))
    setShowForm(true)
  }

  const handleEditTP = (tp) => {
    setForm({
      codice: tp.codice || '', nome: tp.nome || '', descrizione: tp.descrizione || '',
      tipo: tp.tipo || 'hydrotest', pressione_test: tp.pressione_test || '',
      pressione_design: tp.pressione_design || '', temperatura_test: tp.temperatura_test || '',
      fluido_test: tp.fluido_test || 'water', durata_holding_minuti: tp.durata_holding_minuti || 60,
      volume_stimato: tp.volume_stimato || '', sistema: tp.sistema || '',
      linea_riferimento: tp.linea_riferimento || '', p_and_id_riferimento: tp.p_and_id_riferimento || '',
      isometrico_riferimento: tp.isometrico_riferimento || '', procedura_id: tp.procedura_id || '',
      limite_da: tp.limite_da || '', limite_a: tp.limite_a || '',
      data_inizio_pianificata: tp.data_inizio_pianificata || '', data_fine_pianificata: tp.data_fine_pianificata || '',
      disciplina_id: tp.disciplina_id || '', squadra_id: tp.squadra_id || '',
      foreman_id: tp.foreman_id || '', qc_inspector_id: tp.qc_inspector_id || '',
      client_witness_required: tp.client_witness_required || false, predecessore_id: tp.predecessore_id || '',
      work_package_riferimento_id: tp.work_package_riferimento_id || '', priorita: tp.priorita || 'normale',
      colore: tp.colore || '#8B5CF6', note: tp.note || ''
    })
    setEditingTP(tp)
    setShowForm(true)
  }

  const handleTipoChange = (tipo) => {
    setForm(f => ({ ...f, tipo }))
    const tipoInfo = testTipi.find(t => t.codice === tipo.toUpperCase())
    if (tipoInfo) {
      setForm(f => ({
        ...f, tipo, pressione_test: tipoInfo.pressione_default || f.pressione_test,
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
        progetto_id: progettoId, codice: form.codice, nome: form.nome,
        descrizione: form.descrizione || null, tipo: form.tipo,
        pressione_test: form.pressione_test ? parseFloat(form.pressione_test) : null,
        pressione_design: form.pressione_design ? parseFloat(form.pressione_design) : null,
        temperatura_test: form.temperatura_test ? parseFloat(form.temperatura_test) : null,
        fluido_test: form.fluido_test || null,
        durata_holding_minuti: form.durata_holding_minuti ? parseInt(form.durata_holding_minuti) : null,
        volume_stimato: form.volume_stimato ? parseFloat(form.volume_stimato) : null,
        sistema: form.sistema || null, linea_riferimento: form.linea_riferimento || null,
        p_and_id_riferimento: form.p_and_id_riferimento || null,
        isometrico_riferimento: form.isometrico_riferimento || null,
        procedura_id: form.procedura_id || null, limite_da: form.limite_da || null,
        limite_a: form.limite_a || null, data_inizio_pianificata: form.data_inizio_pianificata || null,
        data_fine_pianificata: form.data_fine_pianificata || null,
        disciplina_id: form.disciplina_id || null, squadra_id: form.squadra_id || null,
        foreman_id: form.foreman_id || null, qc_inspector_id: form.qc_inspector_id || null,
        client_witness_required: form.client_witness_required,
        predecessore_id: form.predecessore_id || null,
        work_package_riferimento_id: form.work_package_riferimento_id || null,
        priorita: form.priorita, colore: form.colore, note: form.note || null
      }
      
      if (!editingTP) {
        const faseIniziale = fasi.find(f => f.is_iniziale) || fasi[0]
        if (faseIniziale) payload.fase_corrente_id = faseIniziale.id
        payload.stato = form.data_inizio_pianificata ? 'planned' : 'draft'
      }
      
      let tpId
      if (editingTP) {
        const { error } = await supabase.from('test_packages').update(payload).eq('id', editingTP.id)
        if (error) throw error
        tpId = editingTP.id
      } else {
        const { data, error } = await supabase.from('test_packages').insert(payload).select().single()
        if (error) throw error
        tpId = data.id
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

  // === DELETE ===
  const handleDelete = async (tp) => {
    if (!confirm(`Eliminare ${tp.codice} - ${tp.nome}?`)) return
    try {
      await supabase.from('pianificazione_cw').delete().eq('test_package_id', tp.id)
      await supabase.from('test_package_componenti').delete().eq('test_package_id', tp.id)
      await supabase.from('test_package_punch').delete().eq('test_package_id', tp.id)
      await supabase.from('test_package_avanzamento').delete().eq('test_package_id', tp.id)
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
      const { error } = await supabase.from('test_packages').update({ stato: nuovoStato }).eq('id', tp.id)
      if (error) throw error
      await loadTestPackages()
      if (showDetail?.id === tp.id) {
        setShowDetail({ ...showDetail, stato: nuovoStato })
      }
    } catch (error) {
      console.error('Errore cambio stato:', error)
    }
  }

  // === COMPONENTI HANDLERS ===
  const handleAddComponente = async (componenteId) => {
    if (!showDetail) return
    try {
      const exists = tpComponenti.find(c => c.componente_id === componenteId)
      if (exists) {
        alert('Componente già aggiunto')
        return
      }
      const { error } = await supabase.from('test_package_componenti').insert({
        test_package_id: showDetail.id,
        componente_id: componenteId,
        ruolo: 'included'
      })
      if (error) throw error
      await loadTPComponenti(showDetail.id)
      await loadTestPackages()
    } catch (e) {
      console.error('Errore aggiunta componente:', e)
      alert('Errore: ' + e.message)
    }
  }

  const handleRemoveComponente = async (tpcId) => {
    if (!confirm('Rimuovere componente dal Test Package?')) return
    try {
      const { error } = await supabase.from('test_package_componenti').delete().eq('id', tpcId)
      if (error) throw error
      await loadTPComponenti(showDetail.id)
      await loadTestPackages()
    } catch (e) {
      console.error('Errore rimozione:', e)
    }
  }

  const handleComponenteRuoloChange = async (tpcId, ruolo) => {
    try {
      const { error } = await supabase.from('test_package_componenti').update({ ruolo }).eq('id', tpcId)
      if (error) throw error
      await loadTPComponenti(showDetail.id)
    } catch (e) {
      console.error('Errore cambio ruolo:', e)
    }
  }

  // === FASI AVANZAMENTO HANDLERS ===
  const handleAvanzaFase = (fase) => {
    setSelectedFase(fase)
    setFirmaForm({ note: '', esito: 'approved' })
    setShowFirmaModal(true)
  }

  const handleConfermaFase = async () => {
    if (!selectedFase || !showDetail) return
    setSaving(true)
    try {
      // Inserisci avanzamento
      const { error: avanzError } = await supabase.from('test_package_avanzamento').insert({
        test_package_id: showDetail.id,
        fase_id: selectedFase.id,
        stato: firmaForm.esito,
        note: firmaForm.note || null,
        firmato_da: persona?.id,
        data_firma: new Date().toISOString()
      })
      if (avanzError) throw avanzError

      // Trova prossima fase
      if (firmaForm.esito === 'approved') {
        const currentIndex = fasi.findIndex(f => f.id === selectedFase.id)
        const nextFase = fasi[currentIndex + 1]
        
        if (nextFase) {
          await supabase.from('test_packages').update({ fase_corrente_id: nextFase.id }).eq('id', showDetail.id)
        } else {
          // Ultima fase completata
          await supabase.from('test_packages').update({ 
            fase_corrente_id: selectedFase.id,
            stato: 'passed'
          }).eq('id', showDetail.id)
        }
      }

      setShowFirmaModal(false)
      await loadTPAvanzamenti(showDetail.id)
      await loadTestPackages()
      
      // Aggiorna showDetail
      const { data: updated } = await supabase.from('test_packages')
        .select('*, fase_corrente:test_package_fasi(*)')
        .eq('id', showDetail.id)
        .single()
      if (updated) setShowDetail({ ...showDetail, ...updated })
      
    } catch (e) {
      console.error('Errore avanzamento:', e)
      alert('Errore: ' + e.message)
    } finally {
      setSaving(false)
    }
  }

  // === PUNCH LIST HANDLERS ===
  const resetPunchForm = () => {
    setPunchForm({
      titolo: '', descrizione: '', categoria: 'general',
      priorita: 'medium', assegnato_a_id: '', componente_id: ''
    })
    setEditingPunch(null)
  }

  const handleNewPunch = () => {
    resetPunchForm()
    setShowPunchForm(true)
  }

  const handleEditPunch = (punch) => {
    setPunchForm({
      titolo: punch.titolo || '',
      descrizione: punch.descrizione || '',
      categoria: punch.categoria || 'general',
      priorita: punch.priorita || 'medium',
      assegnato_a_id: punch.assegnato_a_id || '',
      componente_id: punch.componente_id || ''
    })
    setEditingPunch(punch)
    setShowPunchForm(true)
  }

  const handleSavePunch = async () => {
    if (!punchForm.titolo) {
      alert('Titolo obbligatorio')
      return
    }
    setSaving(true)
    try {
      const payload = {
        test_package_id: showDetail.id,
        titolo: punchForm.titolo,
        descrizione: punchForm.descrizione || null,
        categoria: punchForm.categoria,
        priorita: punchForm.priorita,
        assegnato_a_id: punchForm.assegnato_a_id || null,
        componente_id: punchForm.componente_id || null
      }

      if (editingPunch) {
        const { error } = await supabase.from('test_package_punch').update(payload).eq('id', editingPunch.id)
        if (error) throw error
      } else {
        payload.creato_da = persona?.id
        payload.stato = 'open'
        const { error } = await supabase.from('test_package_punch').insert(payload)
        if (error) throw error
      }

      setShowPunchForm(false)
      resetPunchForm()
      await loadTPPunch(showDetail.id)
      await loadTestPackages()
    } catch (e) {
      console.error('Errore salvataggio punch:', e)
      alert('Errore: ' + e.message)
    } finally {
      setSaving(false)
    }
  }

  const handlePunchStatusChange = async (punch, newStatus) => {
    try {
      const update = { stato: newStatus }
      if (newStatus === 'closed') {
        update.chiuso_da = persona?.id
        update.data_chiusura = new Date().toISOString()
      }
      const { error } = await supabase.from('test_package_punch').update(update).eq('id', punch.id)
      if (error) throw error
      await loadTPPunch(showDetail.id)
      await loadTestPackages()
    } catch (e) {
      console.error('Errore cambio stato punch:', e)
    }
  }

  const handleDeletePunch = async (punch) => {
    if (!confirm('Eliminare questo punch item?')) return
    try {
      const { error } = await supabase.from('test_package_punch').delete().eq('id', punch.id)
      if (error) throw error
      await loadTPPunch(showDetail.id)
      await loadTestPackages()
    } catch (e) {
      console.error('Errore eliminazione punch:', e)
    }
  }

  // === HELPERS ===
  const getStatoBadge = (stato) => {
    const badges = {
      draft: { bg: 'bg-gray-100', text: 'text-gray-700', label: 'Bozza' },
      planned: { bg: 'bg-cyan-100', text: 'text-cyan-700', label: 'Pianificato' },
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
      hydrotest: '💧', pneumatic: '💨', leak_test: '🔍', functional: '⚙️',
      electrical: '⚡', loop_check: '🔄', cleaning: '🧹', drying: '☀️'
    }
    return icons[tipo] || '🧪'
  }

  const getPrioritaBadge = (priorita) => {
    const badges = {
      low: { bg: 'bg-gray-100', text: 'text-gray-600', label: 'Bassa' },
      medium: { bg: 'bg-blue-100', text: 'text-blue-600', label: 'Media' },
      high: { bg: 'bg-orange-100', text: 'text-orange-600', label: 'Alta' },
      critical: { bg: 'bg-red-100', text: 'text-red-600', label: 'Critica' }
    }
    return badges[priorita] || badges.medium
  }

  const getPunchStatoBadge = (stato) => {
    const badges = {
      open: { bg: 'bg-red-100', text: 'text-red-700', label: 'Aperto' },
      in_progress: { bg: 'bg-amber-100', text: 'text-amber-700', label: 'In Corso' },
      resolved: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Risolto' },
      closed: { bg: 'bg-green-100', text: 'text-green-700', label: 'Chiuso' }
    }
    return badges[stato] || badges.open
  }

  // Componenti filtrati per ricerca
  const filteredComponenti = componenti.filter(c => {
    if (!componenteSearch) return true
    return c.codice?.toLowerCase().includes(componenteSearch.toLowerCase()) ||
           c.descrizione?.toLowerCase().includes(componenteSearch.toLowerCase())
  })

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
        
        {isAtLeast('cm') && (
          <button
            onClick={handleNewTP}
            className="px-4 py-2 bg-purple-600 text-white rounded-xl font-medium hover:bg-purple-700 flex items-center gap-2"
          >
            + Nuovo TP
          </button>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl p-4 shadow-sm border">
          <p className="text-2xl font-bold text-gray-800">{testPackages.length}</p>
          <p className="text-sm text-gray-500">Totale</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border">
          <p className="text-2xl font-bold text-cyan-600">{testPackages.filter(t => t.stato === 'planned').length}</p>
          <p className="text-sm text-gray-500">Pianificati</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border">
          <p className="text-2xl font-bold text-amber-600">{testPackages.filter(t => ['in_progress', 'holding'].includes(t.stato)).length}</p>
          <p className="text-sm text-gray-500">In Corso</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border">
          <p className="text-2xl font-bold text-green-600">{testPackages.filter(t => t.stato === 'passed').length}</p>
          <p className="text-sm text-gray-500">Completati</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl p-4 shadow-sm border mb-6">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1">
            <input
              type="text"
              placeholder="🔍 Cerca codice o nome..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 border rounded-lg"
            />
          </div>
          <select value={filterTipo} onChange={(e) => setFilterTipo(e.target.value)} className="px-4 py-2 border rounded-lg">
            <option value="">Tutti i tipi</option>
            <option value="hydrotest">💧 Hydrotest</option>
            <option value="pneumatic">💨 Pneumatic</option>
            <option value="leak_test">🔍 Leak Test</option>
            <option value="loop_check">🔄 Loop Check</option>
          </select>
          <select value={filterStato} onChange={(e) => setFilterStato(e.target.value)} className="px-4 py-2 border rounded-lg">
            <option value="">Tutti gli stati</option>
            <option value="draft">Bozza</option>
            <option value="planned">Pianificato</option>
            <option value="ready">Pronto</option>
            <option value="in_progress">In Corso</option>
            <option value="passed">Superato</option>
            <option value="failed">Fallito</option>
          </select>
          <select value={filterSquadra} onChange={(e) => setFilterSquadra(e.target.value)} className="px-4 py-2 border rounded-lg">
            <option value="">Tutte le squadre</option>
            {squadre.map(s => <option key={s.id} value={s.id}>{s.nome}</option>)}
          </select>
        </div>
      </div>

      {/* TP List */}
      {filteredTP.length === 0 ? (
        <div className="bg-white rounded-xl p-12 text-center shadow-sm border">
          <div className="text-6xl mb-4">🧪</div>
          <h3 className="text-xl font-semibold text-gray-700 mb-2">Nessun Test Package</h3>
          <p className="text-gray-500">Crea il primo Test Package per iniziare</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredTP.map(tp => (
            <div 
              key={tp.id}
              className="bg-white rounded-xl shadow-sm border hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => { setShowDetail(tp); setActiveTab('overview') }}
            >
              <div className="p-4">
                <div className="flex items-start gap-4">
                  <div 
                    className="w-14 h-14 rounded-xl flex items-center justify-center text-2xl flex-shrink-0"
                    style={{ backgroundColor: `${tp.colore}20` }}
                  >
                    {getTipoIcon(tp.tipo)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-bold text-gray-800">{tp.codice}</h3>
                      <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${getStatoBadge(tp.stato).bg} ${getStatoBadge(tp.stato).text}`}>
                        {getStatoBadge(tp.stato).label}
                      </span>
                      {tp.priorita === 'alta' && <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-orange-100 text-orange-600">alta</span>}
                    </div>
                    <p className="text-gray-600">{tp.nome}</p>
                    <div className="flex items-center gap-4 mt-2 text-sm text-gray-500 flex-wrap">
                      {tp.data_inizio_pianificata && (
                        <span>📅 {new Date(tp.data_inizio_pianificata).toLocaleDateString('it-IT')} - {tp.data_fine_pianificata ? new Date(tp.data_fine_pianificata).toLocaleDateString('it-IT') : '?'}</span>
                      )}
                      {tp.pressione_test && <span>⏲️ {tp.pressione_test} bar</span>}
                      {tp.durata_holding_minuti && <span>⏱️ {tp.durata_holding_minuti} min</span>}
                      {tp.squadra && <span>👥 {tp.squadra.nome}</span>}
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="text-sm text-gray-500">{tp.componenti_count} comp.</div>
                    {tp.punch_count > 0 && (
                      <div className="text-sm text-red-500 font-medium">{tp.punch_count} punch</div>
                    )}
                  </div>
                </div>
                {/* Progress bar fasi */}
                {fasi.length > 0 && (
                  <div className="mt-3 pt-3 border-t">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500">Fase:</span>
                      <span className="text-xs font-medium">{tp.fase_corrente?.icona} {tp.fase_corrente?.nome || 'N/D'}</span>
                      <span className="text-xs text-gray-400">({tp.fase_corrente?.ordine || 0}/{fasi.length})</span>
                      <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-purple-500 rounded-full transition-all"
                          style={{ width: `${((tp.fase_corrente?.ordine || 0) / fasi.length) * 100}%` }}
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ==================== CREATE/EDIT FORM MODAL ==================== */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center overflow-y-auto p-4">
          <div className="bg-white rounded-2xl w-full max-w-4xl my-8 shadow-2xl">
            <div className="p-6 border-b bg-purple-50">
              <h2 className="text-xl font-bold text-purple-800">
                {editingTP ? `✏️ Modifica ${editingTP.codice}` : '➕ Nuovo Test Package'}
              </h2>
            </div>
            
            <div className="p-6 max-h-[70vh] overflow-y-auto space-y-6">
              {/* Info Base */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Codice *</label>
                  <input type="text" value={form.codice} onChange={e => setForm({...form, codice: e.target.value.toUpperCase()})} className="w-full px-3 py-2 border rounded-lg" />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium mb-1">Nome *</label>
                  <input type="text" value={form.nome} onChange={e => setForm({...form, nome: e.target.value})} className="w-full px-3 py-2 border rounded-lg" />
                </div>
              </div>

              {/* Tipo Test e Parametri */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Tipo Test</label>
                  <select value={form.tipo} onChange={e => handleTipoChange(e.target.value)} className="w-full px-3 py-2 border rounded-lg">
                    <option value="hydrotest">💧 Hydrotest</option>
                    <option value="pneumatic">💨 Pneumatic</option>
                    <option value="leak_test">🔍 Leak Test</option>
                    <option value="functional">⚙️ Functional</option>
                    <option value="loop_check">🔄 Loop Check</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Pressione Test (bar)</label>
                  <input type="number" value={form.pressione_test} onChange={e => setForm({...form, pressione_test: e.target.value})} className="w-full px-3 py-2 border rounded-lg" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Durata Hold (min)</label>
                  <input type="number" value={form.durata_holding_minuti} onChange={e => setForm({...form, durata_holding_minuti: e.target.value})} className="w-full px-3 py-2 border rounded-lg" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Fluido</label>
                  <select value={form.fluido_test} onChange={e => setForm({...form, fluido_test: e.target.value})} className="w-full px-3 py-2 border rounded-lg">
                    <option value="water">Acqua</option>
                    <option value="nitrogen">Azoto</option>
                    <option value="air">Aria</option>
                    <option value="helium">Elio</option>
                  </select>
                </div>
              </div>

              {/* Riferimenti Tecnici */}
              <div className="bg-blue-50 rounded-xl p-4">
                <h4 className="font-medium text-blue-800 mb-3">📐 Riferimenti Tecnici</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div><label className="block text-sm font-medium mb-1">Sistema</label><input type="text" value={form.sistema} onChange={e => setForm({...form, sistema: e.target.value})} className="w-full px-3 py-2 border rounded-lg" placeholder="es. Fuel Gas" /></div>
                  <div><label className="block text-sm font-medium mb-1">Linea</label><input type="text" value={form.linea_riferimento} onChange={e => setForm({...form, linea_riferimento: e.target.value})} className="w-full px-3 py-2 border rounded-lg" placeholder="es. FG-001-A" /></div>
                  <div><label className="block text-sm font-medium mb-1">Da (limite)</label><input type="text" value={form.limite_da} onChange={e => setForm({...form, limite_da: e.target.value})} className="w-full px-3 py-2 border rounded-lg" placeholder="es. V-1001" /></div>
                  <div><label className="block text-sm font-medium mb-1">A (limite)</label><input type="text" value={form.limite_a} onChange={e => setForm({...form, limite_a: e.target.value})} className="w-full px-3 py-2 border rounded-lg" placeholder="es. F-2010" /></div>
                </div>
              </div>

              {/* Date */}
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium mb-1">📅 Data Inizio Pianificata</label><input type="date" value={form.data_inizio_pianificata} onChange={e => setForm({...form, data_inizio_pianificata: e.target.value})} className="w-full px-3 py-2 border rounded-lg" /></div>
                <div><label className="block text-sm font-medium mb-1">📅 Data Fine Pianificata</label><input type="date" value={form.data_fine_pianificata} onChange={e => setForm({...form, data_fine_pianificata: e.target.value})} className="w-full px-3 py-2 border rounded-lg" /></div>
              </div>

              {/* Assegnazioni */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div><label className="block text-sm font-medium mb-1">Disciplina</label><select value={form.disciplina_id} onChange={e => setForm({...form, disciplina_id: e.target.value})} className="w-full px-3 py-2 border rounded-lg"><option value="">Seleziona...</option>{discipline.map(d => <option key={d.id} value={d.id}>{d.icona} {d.nome}</option>)}</select></div>
                <div><label className="block text-sm font-medium mb-1">Squadra</label><select value={form.squadra_id} onChange={e => setForm({...form, squadra_id: e.target.value})} className="w-full px-3 py-2 border rounded-lg"><option value="">Seleziona...</option>{squadre.map(s => <option key={s.id} value={s.id}>{s.nome}</option>)}</select></div>
                <div><label className="block text-sm font-medium mb-1">Foreman</label><select value={form.foreman_id} onChange={e => setForm({...form, foreman_id: e.target.value})} className="w-full px-3 py-2 border rounded-lg"><option value="">Seleziona...</option>{persone.map(p => <option key={p.id} value={p.id}>{p.nome} {p.cognome}</option>)}</select></div>
                <div className="flex items-center pt-6"><label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={form.client_witness_required} onChange={e => setForm({...form, client_witness_required: e.target.checked})} className="w-4 h-4" /><span className="text-sm">Witness Cliente Richiesto</span></label></div>
              </div>

              {/* Note */}
              <div>
                <label className="block text-sm font-medium mb-1">Note</label>
                <textarea value={form.note} onChange={e => setForm({...form, note: e.target.value})} className="w-full px-3 py-2 border rounded-lg" rows="2" />
              </div>
            </div>

            <div className="flex justify-end gap-3 p-6 border-t bg-gray-50 rounded-b-2xl">
              <button onClick={() => { setShowForm(false); resetForm() }} className="px-6 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">Annulla</button>
              <button onClick={handleSave} disabled={saving} className="px-6 py-2 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 disabled:opacity-50">
                {saving ? 'Salvataggio...' : (editingTP ? 'Salva Modifiche' : 'Crea Test Package')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================== DETAIL MODAL ==================== */}
      {showDetail && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center overflow-y-auto p-4">
          <div className="bg-white rounded-2xl w-full max-w-5xl my-8 shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b" style={{ backgroundColor: `${showDetail.colore}10` }}>
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-xl flex items-center justify-center text-3xl" style={{ backgroundColor: `${showDetail.colore}20` }}>
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
              <button onClick={() => setShowDetail(null)} className="p-2 hover:bg-gray-100 rounded-lg">✕</button>
            </div>
            
            {/* Tabs */}
            <div className="flex border-b overflow-x-auto">
              {[
                { id: 'overview', label: '📋 Overview' },
                { id: 'fasi', label: `📈 Fasi (${fasi.length})` },
                { id: 'documenti', label: '📄 Documenti' },
                { id: 'componenti', label: `🔩 Componenti (${showDetail.componenti_count})` },
                { id: 'punch', label: `⚠️ Punch (${showDetail.punch_count})` }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex-1 min-w-[100px] px-4 py-3 text-sm font-medium transition-colors ${
                    activeTab === tab.id ? 'text-purple-600 border-b-2 border-purple-600 bg-purple-50' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
            
            {/* Tab Content */}
            <div className="p-6 max-h-[60vh] overflow-y-auto">
              {/* ========== OVERVIEW TAB ========== */}
              {activeTab === 'overview' && (
                <div className="space-y-6">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div className="bg-gray-50 rounded-lg p-3"><p className="text-xs text-gray-500 mb-1">Tipo Test</p><p className="font-medium">{getTipoIcon(showDetail.tipo)} {showDetail.tipo}</p></div>
                    <div className="bg-gray-50 rounded-lg p-3"><p className="text-xs text-gray-500 mb-1">Pressione Test</p><p className="font-medium">{showDetail.pressione_test || '-'} bar</p></div>
                    <div className="bg-gray-50 rounded-lg p-3"><p className="text-xs text-gray-500 mb-1">Durata Holding</p><p className="font-medium">{showDetail.durata_holding_minuti || '-'} min</p></div>
                    <div className="bg-gray-50 rounded-lg p-3"><p className="text-xs text-gray-500 mb-1">Fluido</p><p className="font-medium">{showDetail.fluido_test || '-'}</p></div>
                  </div>
                  
                  {(showDetail.sistema || showDetail.linea_riferimento) && (
                    <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
                      <h4 className="font-semibold text-blue-700 mb-2">📐 Riferimenti Tecnici</h4>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        {showDetail.sistema && <div><span className="text-gray-500">Sistema:</span> <span className="font-medium">{showDetail.sistema}</span></div>}
                        {showDetail.linea_riferimento && <div><span className="text-gray-500">Linea:</span> <span className="font-medium">{showDetail.linea_riferimento}</span></div>}
                        {showDetail.limite_da && <div><span className="text-gray-500">Da:</span> <span className="font-medium">{showDetail.limite_da}</span></div>}
                        {showDetail.limite_a && <div><span className="text-gray-500">A:</span> <span className="font-medium">{showDetail.limite_a}</span></div>}
                      </div>
                    </div>
                  )}
                  
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
                    {showDetail.stato === 'draft' && isAtLeast('cm') && (
                      <button onClick={() => handleStatoChange(showDetail, 'planned')} className="px-4 py-2 bg-cyan-600 text-white rounded-lg text-sm font-medium hover:bg-cyan-700">📅 Pianifica</button>
                    )}
                    {showDetail.stato === 'planned' && isAtLeast('foreman') && (
                      <button onClick={() => handleStatoChange(showDetail, 'ready')} className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700">✅ Segna Pronto</button>
                    )}
                    {showDetail.stato === 'ready' && isAtLeast('foreman') && (
                      <button onClick={() => handleStatoChange(showDetail, 'in_progress')} className="px-4 py-2 bg-amber-600 text-white rounded-lg text-sm font-medium hover:bg-amber-700">▶️ Inizia Test</button>
                    )}
                    {showDetail.stato === 'in_progress' && isAtLeast('foreman') && (
                      <>
                        <button onClick={() => handleStatoChange(showDetail, 'passed')} className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700">✅ Test Superato</button>
                        <button onClick={() => handleStatoChange(showDetail, 'failed')} className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700">❌ Test Fallito</button>
                      </>
                    )}
                    {isAtLeast('cm') && (
                      <button onClick={() => { handleEditTP(showDetail); setShowDetail(null) }} className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-300">✏️ Modifica</button>
                    )}
                    {isAtLeast('cm') && (
                      <button onClick={() => handleDelete(showDetail)} className="px-4 py-2 bg-red-100 text-red-700 rounded-lg text-sm font-medium hover:bg-red-200">🗑️ Elimina</button>
                    )}
                  </div>
                </div>
              )}

              {/* ========== FASI TAB ========== */}
              {activeTab === 'fasi' && (
                <div className="space-y-3">
                  {loadingFasi ? (
                    <div className="text-center py-8"><div className="animate-spin w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full mx-auto"></div></div>
                  ) : fasi.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">Nessuna fase configurata</div>
                  ) : (
                    fasi.map((fase, idx) => {
                      const avanzamento = tpAvanzamenti.find(a => a.fase_id === fase.id)
                      const isCompleted = avanzamento?.stato === 'approved'
                      const isCurrent = showDetail.fase_corrente?.id === fase.id
                      const isNext = !isCurrent && !isCompleted && fasi.findIndex(f => f.id === showDetail.fase_corrente?.id) === idx - 1
                      
                      return (
                        <div 
                          key={fase.id}
                          className={`flex items-center gap-4 p-4 rounded-xl border-2 transition-all ${
                            isCurrent ? 'border-purple-500 bg-purple-50' : 
                            isCompleted ? 'border-green-200 bg-green-50' : 'border-gray-100 bg-gray-50'
                          }`}
                        >
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold ${
                            isCompleted ? 'bg-green-500' : isCurrent ? 'bg-purple-500' : 'bg-gray-300'
                          }`}>
                            {isCompleted ? '✓' : idx + 1}
                          </div>
                          <div className="flex-1">
                            <p className="font-medium text-gray-800">{fase.icona} {fase.nome}</p>
                            <p className="text-xs text-gray-500">{fase.descrizione}</p>
                            <div className="flex gap-2 mt-1 flex-wrap">
                              {fase.richiede_firma_qc && <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full">QC</span>}
                              {fase.richiede_witness && <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-xs rounded-full">Witness</span>}
                            </div>
                            {avanzamento && (
                              <p className="text-xs text-gray-400 mt-1">
                                ✓ Firmato da {avanzamento.firmato_da?.nome} {avanzamento.firmato_da?.cognome} il {new Date(avanzamento.data_firma).toLocaleDateString('it-IT')}
                              </p>
                            )}
                          </div>
                          {isCurrent && isAtLeast('foreman') && (
                            <button
                              onClick={() => handleAvanzaFase(fase)}
                              className="px-4 py-2 bg-purple-600 text-white text-sm font-medium rounded-lg hover:bg-purple-700"
                            >
                              ✅ Completa Fase
                            </button>
                          )}
                          {isCurrent && <span className="px-3 py-1 bg-purple-600 text-white text-xs font-medium rounded-full">In corso</span>}
                          {isCompleted && <span className="px-3 py-1 bg-green-600 text-white text-xs font-medium rounded-full">✓ Completata</span>}
                        </div>
                      )
                    })
                  )}
                </div>
              )}

              {/* ========== DOCUMENTI TAB ========== */}
              {activeTab === 'documenti' && (
                <TestPackageDocumenti 
                  testPackageId={showDetail.id}
                  testPackageCode={showDetail.codice}
                  canEdit={isAtLeast('foreman')}
                />
              )}

              {/* ========== COMPONENTI TAB ========== */}
              {activeTab === 'componenti' && (
                <div className="space-y-4">
                  {/* Barra azioni */}
                  {isAtLeast('cm') && (
                    <div className="flex gap-4">
                      <input
                        type="text"
                        placeholder="🔍 Cerca componente..."
                        value={componenteSearch}
                        onChange={e => setComponenteSearch(e.target.value)}
                        className="flex-1 px-4 py-2 border rounded-lg"
                      />
                    </div>
                  )}

                  {/* Componenti disponibili (da aggiungere) */}
                  {isAtLeast('cm') && componenteSearch && (
                    <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
                      <h4 className="font-medium text-blue-700 mb-2">Aggiungi Componente</h4>
                      <div className="max-h-40 overflow-y-auto space-y-1">
                        {filteredComponenti.slice(0, 10).map(comp => {
                          const alreadyAdded = tpComponenti.find(c => c.componente_id === comp.id)
                          return (
                            <div key={comp.id} className="flex items-center justify-between p-2 bg-white rounded-lg">
                              <div>
                                <span className="font-mono text-sm font-medium">{comp.codice}</span>
                                <span className="text-sm text-gray-500 ml-2">{comp.descrizione}</span>
                              </div>
                              {alreadyAdded ? (
                                <span className="text-xs text-green-600">✓ Aggiunto</span>
                              ) : (
                                <button onClick={() => handleAddComponente(comp.id)} className="px-3 py-1 bg-blue-600 text-white text-xs rounded-lg hover:bg-blue-700">+ Aggiungi</button>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  {/* Lista componenti TP */}
                  {loadingComponenti ? (
                    <div className="text-center py-8"><div className="animate-spin w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full mx-auto"></div></div>
                  ) : tpComponenti.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <span className="text-4xl mb-4 block">🔩</span>
                      <p>Nessun componente assegnato</p>
                      {isAtLeast('cm') && <p className="text-sm mt-2">Cerca e aggiungi componenti sopra</p>}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {tpComponenti.map(tpc => (
                        <div key={tpc.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl hover:bg-gray-100">
                          <div className="flex items-center gap-3">
                            <span className="text-xl">🔩</span>
                            <div>
                              <span className="font-mono font-medium">{tpc.componente?.codice}</span>
                              <p className="text-sm text-gray-500">{tpc.componente?.descrizione}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <select
                              value={tpc.ruolo || 'included'}
                              onChange={e => handleComponenteRuoloChange(tpc.id, e.target.value)}
                              className="px-2 py-1 text-xs border rounded"
                              disabled={!isAtLeast('cm')}
                            >
                              <option value="included">Incluso</option>
                              <option value="boundary">Limite</option>
                              <option value="excluded">Escluso</option>
                            </select>
                            {isAtLeast('cm') && (
                              <button onClick={() => handleRemoveComponente(tpc.id)} className="p-1 text-red-500 hover:bg-red-50 rounded">🗑️</button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* ========== PUNCH TAB ========== */}
              {activeTab === 'punch' && (
                <div className="space-y-4">
                  {/* Barra azioni */}
                  {isAtLeast('foreman') && (
                    <div className="flex justify-end">
                      <button onClick={handleNewPunch} className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700">+ Nuovo Punch</button>
                    </div>
                  )}

                  {/* Lista punch */}
                  {loadingPunch ? (
                    <div className="text-center py-8"><div className="animate-spin w-8 h-8 border-4 border-red-500 border-t-transparent rounded-full mx-auto"></div></div>
                  ) : tpPunch.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <span className="text-4xl mb-4 block">✅</span>
                      <p>Nessun punch item - Ottimo!</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {tpPunch.map(punch => (
                        <div key={punch.id} className={`p-4 rounded-xl border-l-4 ${punch.stato === 'closed' ? 'bg-green-50 border-green-500' : punch.priorita === 'critical' ? 'bg-red-50 border-red-500' : punch.priorita === 'high' ? 'bg-orange-50 border-orange-500' : 'bg-gray-50 border-gray-300'}`}>
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <h4 className="font-medium">{punch.titolo}</h4>
                                <span className={`px-2 py-0.5 text-xs rounded-full ${getPunchStatoBadge(punch.stato).bg} ${getPunchStatoBadge(punch.stato).text}`}>
                                  {getPunchStatoBadge(punch.stato).label}
                                </span>
                                <span className={`px-2 py-0.5 text-xs rounded-full ${getPrioritaBadge(punch.priorita).bg} ${getPrioritaBadge(punch.priorita).text}`}>
                                  {getPrioritaBadge(punch.priorita).label}
                                </span>
                              </div>
                              {punch.descrizione && <p className="text-sm text-gray-600 mt-1">{punch.descrizione}</p>}
                              <div className="flex gap-4 mt-2 text-xs text-gray-500">
                                {punch.componente && <span>🔩 {punch.componente.codice}</span>}
                                {punch.assegnato_a && <span>👤 {punch.assegnato_a.nome} {punch.assegnato_a.cognome}</span>}
                                <span>📅 {new Date(punch.created_at).toLocaleDateString('it-IT')}</span>
                              </div>
                            </div>
                            {isAtLeast('foreman') && punch.stato !== 'closed' && (
                              <div className="flex gap-1">
                                <button onClick={() => handleEditPunch(punch)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded">✏️</button>
                                {punch.stato === 'open' && (
                                  <button onClick={() => handlePunchStatusChange(punch, 'in_progress')} className="p-1.5 text-amber-600 hover:bg-amber-50 rounded" title="In Lavorazione">🔧</button>
                                )}
                                {(punch.stato === 'in_progress' || punch.stato === 'resolved') && (
                                  <button onClick={() => handlePunchStatusChange(punch, 'closed')} className="p-1.5 text-green-600 hover:bg-green-50 rounded" title="Chiudi">✅</button>
                                )}
                                {isAtLeast('cm') && (
                                  <button onClick={() => handleDeletePunch(punch)} className="p-1.5 text-red-600 hover:bg-red-50 rounded">🗑️</button>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ==================== FIRMA FASE MODAL ==================== */}
      {showFirmaModal && selectedFase && (
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md">
            <div className="p-6 border-b bg-purple-50">
              <h3 className="text-lg font-bold text-purple-800">✅ Completa Fase: {selectedFase.nome}</h3>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Esito</label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" checked={firmaForm.esito === 'approved'} onChange={() => setFirmaForm({...firmaForm, esito: 'approved'})} className="w-4 h-4" />
                    <span className="text-green-600 font-medium">✅ Approvato</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" checked={firmaForm.esito === 'rejected'} onChange={() => setFirmaForm({...firmaForm, esito: 'rejected'})} className="w-4 h-4" />
                    <span className="text-red-600 font-medium">❌ Rifiutato</span>
                  </label>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Note (opzionale)</label>
                <textarea value={firmaForm.note} onChange={e => setFirmaForm({...firmaForm, note: e.target.value})} className="w-full px-3 py-2 border rounded-lg" rows="3" placeholder="Note sulla firma..." />
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-sm text-gray-600">👤 Firmato da: <strong>{persona?.nome} {persona?.cognome}</strong></p>
                <p className="text-sm text-gray-600">📅 Data: <strong>{new Date().toLocaleDateString('it-IT')}</strong></p>
              </div>
            </div>
            <div className="flex justify-end gap-3 p-4 border-t">
              <button onClick={() => setShowFirmaModal(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">Annulla</button>
              <button onClick={handleConfermaFase} disabled={saving} className="px-4 py-2 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 disabled:opacity-50">
                {saving ? 'Salvataggio...' : 'Conferma Firma'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================== PUNCH FORM MODAL ==================== */}
      {showPunchForm && (
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md">
            <div className="p-6 border-b bg-red-50">
              <h3 className="text-lg font-bold text-red-800">{editingPunch ? '✏️ Modifica Punch' : '⚠️ Nuovo Punch Item'}</h3>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Titolo *</label>
                <input type="text" value={punchForm.titolo} onChange={e => setPunchForm({...punchForm, titolo: e.target.value})} className="w-full px-3 py-2 border rounded-lg" placeholder="Descrizione breve del problema..." />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Descrizione</label>
                <textarea value={punchForm.descrizione} onChange={e => setPunchForm({...punchForm, descrizione: e.target.value})} className="w-full px-3 py-2 border rounded-lg" rows="2" placeholder="Dettagli..." />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Categoria</label>
                  <select value={punchForm.categoria} onChange={e => setPunchForm({...punchForm, categoria: e.target.value})} className="w-full px-3 py-2 border rounded-lg">
                    <option value="general">Generale</option>
                    <option value="safety">Sicurezza</option>
                    <option value="quality">Qualità</option>
                    <option value="documentation">Documentazione</option>
                    <option value="mechanical">Meccanico</option>
                    <option value="electrical">Elettrico</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Priorità</label>
                  <select value={punchForm.priorita} onChange={e => setPunchForm({...punchForm, priorita: e.target.value})} className="w-full px-3 py-2 border rounded-lg">
                    <option value="low">🟢 Bassa</option>
                    <option value="medium">🟡 Media</option>
                    <option value="high">🟠 Alta</option>
                    <option value="critical">🔴 Critica</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Assegnato a</label>
                <select value={punchForm.assegnato_a_id} onChange={e => setPunchForm({...punchForm, assegnato_a_id: e.target.value})} className="w-full px-3 py-2 border rounded-lg">
                  <option value="">Non assegnato</option>
                  {persone.map(p => <option key={p.id} value={p.id}>{p.nome} {p.cognome}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Componente collegato</label>
                <select value={punchForm.componente_id} onChange={e => setPunchForm({...punchForm, componente_id: e.target.value})} className="w-full px-3 py-2 border rounded-lg">
                  <option value="">Nessuno</option>
                  {tpComponenti.map(c => <option key={c.componente_id} value={c.componente_id}>{c.componente?.codice} - {c.componente?.descrizione}</option>)}
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-3 p-4 border-t">
              <button onClick={() => { setShowPunchForm(false); resetPunchForm() }} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">Annulla</button>
              <button onClick={handleSavePunch} disabled={saving} className="px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 disabled:opacity-50">
                {saving ? 'Salvataggio...' : (editingPunch ? 'Salva Modifiche' : 'Crea Punch')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
