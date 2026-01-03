import { useState, useEffect, useMemo } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import * as XLSX from 'xlsx'

export default function MaterialiPage() {
  const { progettoId, progetto, persona, isAtLeast } = useAuth()
  
  // Dati
  const [componenti, setComponenti] = useState([])
  const [discipline, setDiscipline] = useState([])
  const [tipiComponente, setTipiComponente] = useState([])
  const [workPackages, setWorkPackages] = useState([])
  const [fasiWorkflow, setFasiWorkflow] = useState([])
  const [squadre, setSquadre] = useState([])
  const [aree, setAree] = useState([])
  const [loading, setLoading] = useState(true)
  
  // Filtri
  const [filtri, setFiltri] = useState({
    disciplina: '',
    tipo: '',
    stato: '',
    ricerca: '',
    cw_anno: new Date().getFullYear(),
    cw_settimana: ''
  })
  
  // Selezione
  const [selectedIds, setSelectedIds] = useState([])
  
  // Modali
  const [showFormModal, setShowFormModal] = useState(false)
  const [showImportModal, setShowImportModal] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [editingComponente, setEditingComponente] = useState(null)
  
  // Form nuovo/modifica
  const [formData, setFormData] = useState({
    codice: '',
    descrizione: '',
    disciplina_id: '',
    tipo_componente_id: '',
    work_package_id: '',
    quantita: 1,
    unita_misura: 'pz',
    peso_kg: '',
    dimensioni: '',
    materiale: '',
    specifica: '',
    disegno_riferimento: '',
    fornitore: '',
    numero_ordine: '',
    cw_arrivo_site_anno: new Date().getFullYear(),
    cw_arrivo_site_settimana: '',
    cw_lavoro_anno: new Date().getFullYear(),
    cw_lavoro_settimana: '',
    priorita: 0,
    note: ''
  })
  
  // Import
  const [importStep, setImportStep] = useState(1)
  const [importFile, setImportFile] = useState(null)
  const [importData, setImportData] = useState([])
  const [importHeaders, setImportHeaders] = useState([])
  const [columnMapping, setColumnMapping] = useState({})
  const [importErrors, setImportErrors] = useState([])
  const [importResults, setImportResults] = useState(null)
  const [importing, setImporting] = useState(false)
  
  // Paginazione
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(50)
  
  // Stati disponibili
  const statiComponente = [
    { value: 'da_ordinare', label: 'Da ordinare', color: 'bg-gray-100 text-gray-700' },
    { value: 'ordinato', label: 'Ordinato', color: 'bg-yellow-100 text-yellow-700' },
    { value: 'in_transito', label: 'In transito', color: 'bg-blue-100 text-blue-700' },
    { value: 'in_warehouse', label: 'In warehouse', color: 'bg-purple-100 text-purple-700' },
    { value: 'at_site', label: 'At site', color: 'bg-indigo-100 text-indigo-700' },
    { value: 'in_lavorazione', label: 'In lavorazione', color: 'bg-cyan-100 text-cyan-700' },
    { value: 'completato', label: 'Completato', color: 'bg-green-100 text-green-700' },
    { value: 'bloccato', label: 'Bloccato', color: 'bg-red-100 text-red-700' }
  ]
  
  // Mapping colonne predefinite per import
  const campiImport = [
    { key: 'codice', label: 'Codice *', required: true },
    { key: 'descrizione', label: 'Descrizione' },
    { key: 'disciplina_codice', label: 'Disciplina (codice)' },
    { key: 'tipo_nome', label: 'Tipo componente' },
    { key: 'quantita', label: 'Quantità' },
    { key: 'unita_misura', label: 'Unità misura' },
    { key: 'peso_kg', label: 'Peso (kg)' },
    { key: 'dimensioni', label: 'Dimensioni' },
    { key: 'materiale', label: 'Materiale' },
    { key: 'specifica', label: 'Specifica' },
    { key: 'disegno_riferimento', label: 'Disegno rif.' },
    { key: 'fornitore', label: 'Fornitore' },
    { key: 'numero_ordine', label: 'N. Ordine' },
    { key: 'work_package_codice', label: 'Work Package' },
    { key: 'cw_lavoro', label: 'CW Lavoro (es. 2025-05)' },
    { key: 'priorita', label: 'Priorità' },
    { key: 'note', label: 'Note' }
  ]

  // Carica dati
  useEffect(() => {
    if (progettoId) {
      loadData()
    }
  }, [progettoId])
  
  const loadData = async () => {
    setLoading(true)
    try {
      // Carica tutto in parallelo
      const [
        { data: compData },
        { data: discData },
        { data: tipiData },
        { data: wpData },
        { data: fasiData },
        { data: squadreData },
        { data: areeData }
      ] = await Promise.all([
        supabase
          .from('componenti')
          .select(`
            *,
            disciplina:discipline(id, nome, codice, icona, colore),
            tipo:tipi_componente(id, nome, icona),
            work_package:work_packages(id, codice, nome),
            fase:fasi_workflow(id, nome, icona, colore),
            squadra:squadre(id, nome)
          `)
          .eq('progetto_id', progettoId)
          .order('created_at', { ascending: false }),
        supabase
          .from('discipline')
          .select('*')
          .eq('progetto_id', progettoId)
          .eq('attivo', true)
          .order('ordine'),
        supabase
          .from('tipi_componente')
          .select('*, disciplina:discipline(id, nome)')
          .eq('attivo', true),
        supabase
          .from('work_packages')
          .select('*')
          .eq('progetto_id', progettoId)
          .order('codice'),
        supabase
          .from('fasi_workflow')
          .select('*, disciplina:discipline(id)')
          .eq('attivo', true)
          .order('ordine'),
        supabase
          .from('squadre')
          .select('*')
          .eq('progetto_id', progettoId)
          .eq('attiva', true),
        supabase
          .from('aree_lavoro')
          .select('*')
          .eq('progetto_id', progettoId)
      ])
      
      setComponenti(compData || [])
      setDiscipline(discData || [])
      setTipiComponente(tipiData || [])
      setWorkPackages(wpData || [])
      setFasiWorkflow(fasiData || [])
      setSquadre(squadreData || [])
      setAree(areeData || [])
    } catch (error) {
      console.error('Errore caricamento:', error)
    } finally {
      setLoading(false)
    }
  }
  
  // Filtra componenti
  const componentiFiltrati = useMemo(() => {
    return componenti.filter(c => {
      if (filtri.disciplina && c.disciplina_id !== filtri.disciplina) return false
      if (filtri.tipo && c.tipo_componente_id !== filtri.tipo) return false
      if (filtri.stato && c.stato !== filtri.stato) return false
      if (filtri.cw_settimana && (c.cw_lavoro_settimana !== parseInt(filtri.cw_settimana) || c.cw_lavoro_anno !== filtri.cw_anno)) return false
      if (filtri.ricerca) {
        const search = filtri.ricerca.toLowerCase()
        if (!c.codice?.toLowerCase().includes(search) && 
            !c.descrizione?.toLowerCase().includes(search)) return false
      }
      return true
    })
  }, [componenti, filtri])
  
  // Paginazione
  const totalPages = Math.ceil(componentiFiltrati.length / perPage)
  const componentiPaginati = componentiFiltrati.slice((page - 1) * perPage, page * perPage)
  
  // Statistiche
  const stats = useMemo(() => {
    const byStato = {}
    const byDisciplina = {}
    componenti.forEach(c => {
      byStato[c.stato] = (byStato[c.stato] || 0) + 1
      const discNome = c.disciplina?.nome || 'N/D'
      byDisciplina[discNome] = (byDisciplina[discNome] || 0) + 1
    })
    return { byStato, byDisciplina, totale: componenti.length }
  }, [componenti])
  
  // Tipi filtrati per disciplina selezionata
  const tipiFiltrati = useMemo(() => {
    if (!formData.disciplina_id) return []
    return tipiComponente.filter(t => {
      // Trova la disciplina del tipo
      const disc = discipline.find(d => d.id === formData.disciplina_id)
      return t.disciplina?.id === formData.disciplina_id || 
             tipiComponente.some(tc => tc.id === t.id && tc.disciplina_id === formData.disciplina_id)
    })
  }, [tipiComponente, formData.disciplina_id, discipline])
  
  // ══════════════════════════════════════════════════════════════════════
  // CRUD MANUALE
  // ══════════════════════════════════════════════════════════════════════
  
  const openNewForm = () => {
    setEditingComponente(null)
    setFormData({
      codice: '',
      descrizione: '',
      disciplina_id: discipline[0]?.id || '',
      tipo_componente_id: '',
      work_package_id: '',
      quantita: 1,
      unita_misura: 'pz',
      peso_kg: '',
      dimensioni: '',
      materiale: '',
      specifica: '',
      disegno_riferimento: '',
      fornitore: '',
      numero_ordine: '',
      cw_arrivo_site_anno: new Date().getFullYear(),
      cw_arrivo_site_settimana: '',
      cw_lavoro_anno: new Date().getFullYear(),
      cw_lavoro_settimana: '',
      priorita: 0,
      note: ''
    })
    setShowFormModal(true)
  }
  
  const openEditForm = (componente) => {
    setEditingComponente(componente)
    setFormData({
      codice: componente.codice || '',
      descrizione: componente.descrizione || '',
      disciplina_id: componente.disciplina_id || '',
      tipo_componente_id: componente.tipo_componente_id || '',
      work_package_id: componente.work_package_id || '',
      quantita: componente.quantita || 1,
      unita_misura: componente.unita_misura || 'pz',
      peso_kg: componente.peso_kg || '',
      dimensioni: componente.dimensioni || '',
      materiale: componente.materiale || '',
      specifica: componente.specifica || '',
      disegno_riferimento: componente.disegno_riferimento || '',
      fornitore: componente.fornitore || '',
      numero_ordine: componente.numero_ordine || '',
      cw_arrivo_site_anno: componente.cw_arrivo_site_anno || new Date().getFullYear(),
      cw_arrivo_site_settimana: componente.cw_arrivo_site_settimana || '',
      cw_lavoro_anno: componente.cw_lavoro_anno || new Date().getFullYear(),
      cw_lavoro_settimana: componente.cw_lavoro_settimana || '',
      priorita: componente.priorita || 0,
      note: componente.note || ''
    })
    setShowFormModal(true)
  }
  
  const handleSaveComponente = async () => {
    if (!formData.codice.trim()) {
      alert('Il codice è obbligatorio')
      return
    }
    if (!formData.disciplina_id) {
      alert('Seleziona una disciplina')
      return
    }
    if (!formData.tipo_componente_id) {
      alert('Seleziona un tipo componente')
      return
    }
    
    const payload = {
      progetto_id: progettoId,
      codice: formData.codice.trim(),
      descrizione: formData.descrizione?.trim() || null,
      disciplina_id: formData.disciplina_id,
      tipo_componente_id: formData.tipo_componente_id,
      work_package_id: formData.work_package_id || null,
      quantita: parseFloat(formData.quantita) || 1,
      unita_misura: formData.unita_misura || 'pz',
      peso_kg: formData.peso_kg ? parseFloat(formData.peso_kg) : null,
      dimensioni: formData.dimensioni?.trim() || null,
      materiale: formData.materiale?.trim() || null,
      specifica: formData.specifica?.trim() || null,
      disegno_riferimento: formData.disegno_riferimento?.trim() || null,
      fornitore: formData.fornitore?.trim() || null,
      numero_ordine: formData.numero_ordine?.trim() || null,
      cw_arrivo_site_anno: formData.cw_arrivo_site_settimana ? parseInt(formData.cw_arrivo_site_anno) : null,
      cw_arrivo_site_settimana: formData.cw_arrivo_site_settimana ? parseInt(formData.cw_arrivo_site_settimana) : null,
      cw_lavoro_anno: formData.cw_lavoro_settimana ? parseInt(formData.cw_lavoro_anno) : null,
      cw_lavoro_settimana: formData.cw_lavoro_settimana ? parseInt(formData.cw_lavoro_settimana) : null,
      priorita: parseInt(formData.priorita) || 0,
      note: formData.note?.trim() || null
    }
    
    try {
      if (editingComponente) {
        // Update
        const { error } = await supabase
          .from('componenti')
          .update(payload)
          .eq('id', editingComponente.id)
        
        if (error) throw error
      } else {
        // Insert
        payload.created_by = persona?.id
        payload.stato = 'da_ordinare'
        
        const { error } = await supabase
          .from('componenti')
          .insert(payload)
        
        if (error) throw error
      }
      
      setShowFormModal(false)
      loadData()
    } catch (error) {
      console.error('Errore salvataggio:', error)
      alert('Errore: ' + (error.message || 'Salvataggio fallito'))
    }
  }
  
  const handleDeleteSelected = async () => {
    if (selectedIds.length === 0) return
    
    try {
      const { error } = await supabase
        .from('componenti')
        .delete()
        .in('id', selectedIds)
      
      if (error) throw error
      
      setSelectedIds([])
      setShowDeleteConfirm(false)
      loadData()
    } catch (error) {
      console.error('Errore eliminazione:', error)
      alert('Errore: ' + error.message)
    }
  }
  
  const handleDeleteSingle = async (id) => {
    if (!confirm('Eliminare questo componente?')) return
    
    try {
      const { error } = await supabase
        .from('componenti')
        .delete()
        .eq('id', id)
      
      if (error) throw error
      loadData()
    } catch (error) {
      console.error('Errore eliminazione:', error)
      alert('Errore: ' + error.message)
    }
  }
  
  // ══════════════════════════════════════════════════════════════════════
  // IMPORT EXCEL/CSV
  // ══════════════════════════════════════════════════════════════════════
  
  const openImportModal = () => {
    setImportStep(1)
    setImportFile(null)
    setImportData([])
    setImportHeaders([])
    setColumnMapping({})
    setImportErrors([])
    setImportResults(null)
    setShowImportModal(true)
  }
  
  const handleFileUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    
    setImportFile(file)
    
    try {
      const data = await file.arrayBuffer()
      const workbook = XLSX.read(data)
      const sheetName = workbook.SheetNames[0]
      const worksheet = workbook.Sheets[sheetName]
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 })
      
      if (jsonData.length < 2) {
        alert('Il file deve contenere almeno una riga di intestazione e una riga di dati')
        return
      }
      
      const headers = jsonData[0].map(h => String(h || '').trim())
      const rows = jsonData.slice(1).filter(row => row.some(cell => cell !== null && cell !== ''))
      
      setImportHeaders(headers)
      setImportData(rows)
      
      // Auto-mapping basato su nomi simili
      const autoMapping = {}
      campiImport.forEach(campo => {
        const headerIndex = headers.findIndex(h => 
          h.toLowerCase().includes(campo.key.toLowerCase()) ||
          h.toLowerCase().includes(campo.label.toLowerCase().replace(' *', ''))
        )
        if (headerIndex >= 0) {
          autoMapping[campo.key] = headerIndex
        }
      })
      setColumnMapping(autoMapping)
      
      setImportStep(2)
    } catch (error) {
      console.error('Errore lettura file:', error)
      alert('Errore nella lettura del file')
    }
  }
  
  const validateImportData = () => {
    const errors = []
    const codiciVisti = new Set()
    
    // Verifica mapping codice (obbligatorio)
    if (columnMapping.codice === undefined) {
      errors.push({ row: 0, message: 'Colonna "Codice" non mappata (obbligatoria)' })
      setImportErrors(errors)
      return false
    }
    
    importData.forEach((row, index) => {
      const codice = row[columnMapping.codice]?.toString().trim()
      
      if (!codice) {
        errors.push({ row: index + 2, message: 'Codice mancante' })
      } else if (codiciVisti.has(codice)) {
        errors.push({ row: index + 2, message: `Codice duplicato nel file: ${codice}` })
      } else {
        codiciVisti.add(codice)
      }
      
      // Verifica CW formato
      if (columnMapping.cw_lavoro !== undefined) {
        const cwValue = row[columnMapping.cw_lavoro]?.toString().trim()
        if (cwValue && !/^\d{4}-\d{1,2}$/.test(cwValue)) {
          errors.push({ row: index + 2, message: `CW formato non valido: ${cwValue} (usa YYYY-WW)` })
        }
      }
    })
    
    setImportErrors(errors)
    setImportStep(3)
    return errors.length === 0
  }
  
  const executeImport = async () => {
    setImporting(true)
    const results = { imported: 0, updated: 0, errors: [] }
    
    try {
      // Prepara lookup per disciplina, tipo, work_package
      const discLookup = {}
      discipline.forEach(d => {
        discLookup[d.codice?.toLowerCase()] = d.id
        discLookup[d.nome?.toLowerCase()] = d.id
      })
      
      const tipoLookup = {}
      tipiComponente.forEach(t => {
        tipoLookup[t.nome?.toLowerCase()] = t.id
      })
      
      const wpLookup = {}
      workPackages.forEach(wp => {
        wpLookup[wp.codice?.toLowerCase()] = wp.id
      })
      
      // Codici esistenti
      const codiciEsistenti = new Map()
      componenti.forEach(c => codiciEsistenti.set(c.codice.toLowerCase(), c.id))
      
      for (let i = 0; i < importData.length; i++) {
        const row = importData[i]
        const codice = row[columnMapping.codice]?.toString().trim()
        
        if (!codice) continue
        
        try {
          // Risolvi disciplina
          let disciplina_id = null
          if (columnMapping.disciplina_codice !== undefined) {
            const discValue = row[columnMapping.disciplina_codice]?.toString().trim().toLowerCase()
            disciplina_id = discLookup[discValue]
          }
          if (!disciplina_id && discipline.length > 0) {
            disciplina_id = discipline[0].id // Default prima disciplina
          }
          
          // Risolvi tipo
          let tipo_id = null
          if (columnMapping.tipo_nome !== undefined) {
            const tipoValue = row[columnMapping.tipo_nome]?.toString().trim().toLowerCase()
            tipo_id = tipoLookup[tipoValue]
          }
          if (!tipo_id) {
            // Cerca primo tipo della disciplina
            const tipoDefault = tipiComponente.find(t => 
              t.disciplina?.id === disciplina_id || t.disciplina_id === disciplina_id
            )
            tipo_id = tipoDefault?.id
          }
          
          if (!tipo_id) {
            results.errors.push({ row: i + 2, message: `Tipo componente non trovato per: ${codice}` })
            continue
          }
          
          // Risolvi work package
          let wp_id = null
          if (columnMapping.work_package_codice !== undefined) {
            const wpValue = row[columnMapping.work_package_codice]?.toString().trim().toLowerCase()
            wp_id = wpLookup[wpValue]
          }
          
          // Parse CW
          let cw_anno = null, cw_settimana = null
          if (columnMapping.cw_lavoro !== undefined) {
            const cwValue = row[columnMapping.cw_lavoro]?.toString().trim()
            if (cwValue) {
              const match = cwValue.match(/^(\d{4})-(\d{1,2})$/)
              if (match) {
                cw_anno = parseInt(match[1])
                cw_settimana = parseInt(match[2])
              }
            }
          }
          
          const payload = {
            progetto_id: progettoId,
            codice,
            descrizione: columnMapping.descrizione !== undefined ? row[columnMapping.descrizione]?.toString().trim() || null : null,
            disciplina_id,
            tipo_componente_id: tipo_id,
            work_package_id: wp_id,
            quantita: columnMapping.quantita !== undefined ? parseFloat(row[columnMapping.quantita]) || 1 : 1,
            unita_misura: columnMapping.unita_misura !== undefined ? row[columnMapping.unita_misura]?.toString().trim() || 'pz' : 'pz',
            peso_kg: columnMapping.peso_kg !== undefined ? parseFloat(row[columnMapping.peso_kg]) || null : null,
            dimensioni: columnMapping.dimensioni !== undefined ? row[columnMapping.dimensioni]?.toString().trim() || null : null,
            materiale: columnMapping.materiale !== undefined ? row[columnMapping.materiale]?.toString().trim() || null : null,
            specifica: columnMapping.specifica !== undefined ? row[columnMapping.specifica]?.toString().trim() || null : null,
            disegno_riferimento: columnMapping.disegno_riferimento !== undefined ? row[columnMapping.disegno_riferimento]?.toString().trim() || null : null,
            fornitore: columnMapping.fornitore !== undefined ? row[columnMapping.fornitore]?.toString().trim() || null : null,
            numero_ordine: columnMapping.numero_ordine !== undefined ? row[columnMapping.numero_ordine]?.toString().trim() || null : null,
            cw_lavoro_anno: cw_anno,
            cw_lavoro_settimana: cw_settimana,
            priorita: columnMapping.priorita !== undefined ? parseInt(row[columnMapping.priorita]) || 0 : 0,
            note: columnMapping.note !== undefined ? row[columnMapping.note]?.toString().trim() || null : null
          }
          
          const esistenteId = codiciEsistenti.get(codice.toLowerCase())
          
          if (esistenteId) {
            // Update
            const { error } = await supabase
              .from('componenti')
              .update(payload)
              .eq('id', esistenteId)
            
            if (error) throw error
            results.updated++
          } else {
            // Insert
            payload.stato = 'da_ordinare'
            payload.created_by = persona?.id
            
            const { error } = await supabase
              .from('componenti')
              .insert(payload)
            
            if (error) throw error
            results.imported++
          }
        } catch (error) {
          results.errors.push({ row: i + 2, message: error.message })
        }
      }
      
      // Log import
      await supabase.from('import_componenti_log').insert({
        progetto_id: progettoId,
        tipo_import: 'componenti',
        nome_file: importFile?.name,
        tipo_file: importFile?.name.split('.').pop(),
        righe_totali: importData.length,
        righe_importate: results.imported,
        righe_aggiornate: results.updated,
        righe_errore: results.errors.length,
        errori: results.errors,
        mapping_colonne: columnMapping,
        persona_id: persona?.id
      })
      
      setImportResults(results)
      setImportStep(4)
      loadData()
    } catch (error) {
      console.error('Errore import:', error)
      alert('Errore durante l\'import: ' + error.message)
    } finally {
      setImporting(false)
    }
  }
  
  // ══════════════════════════════════════════════════════════════════════
  // EXPORT
  // ══════════════════════════════════════════════════════════════════════
  
  const handleExport = () => {
    const exportData = componentiFiltrati.map(c => ({
      'Codice': c.codice,
      'Descrizione': c.descrizione,
      'Disciplina': c.disciplina?.nome,
      'Tipo': c.tipo?.nome,
      'Stato': c.stato,
      'Quantità': c.quantita,
      'Unità': c.unita_misura,
      'Work Package': c.work_package?.codice,
      'CW Lavoro': c.cw_lavoro_anno && c.cw_lavoro_settimana ? `${c.cw_lavoro_anno}-${c.cw_lavoro_settimana}` : '',
      'Fornitore': c.fornitore,
      'N. Ordine': c.numero_ordine,
      'Materiale': c.materiale,
      'Peso (kg)': c.peso_kg,
      'Note': c.note
    }))
    
    const ws = XLSX.utils.json_to_sheet(exportData)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Componenti')
    XLSX.writeFile(wb, `componenti_${progetto?.codice || 'export'}_${new Date().toISOString().slice(0,10)}.xlsx`)
  }
  
  // ══════════════════════════════════════════════════════════════════════
  // SELEZIONE
  // ══════════════════════════════════════════════════════════════════════
  
  const toggleSelectAll = () => {
    if (selectedIds.length === componentiPaginati.length) {
      setSelectedIds([])
    } else {
      setSelectedIds(componentiPaginati.map(c => c.id))
    }
  }
  
  const toggleSelect = (id) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    )
  }

  // ══════════════════════════════════════════════════════════════════════
  // RENDER
  // ══════════════════════════════════════════════════════════════════════

  if (loading) {
    return (
      <div className="p-4 flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
          <p className="text-gray-500">Caricamento componenti...</p>
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
            <h1 className="text-2xl font-bold text-gray-900">📦 Gestione Materiali</h1>
            <p className="text-gray-600 mt-1">{progetto?.nome}</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleExport}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 flex items-center gap-2"
            >
              📤 Export
            </button>
            <button
              onClick={openImportModal}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
            >
              📥 Import Excel
            </button>
            <button
              onClick={openNewForm}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
            >
              ➕ Nuovo
            </button>
          </div>
        </div>
      </div>
      
      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3 mb-6">
        <div className="bg-white rounded-xl p-4 border shadow-sm">
          <div className="text-2xl font-bold text-gray-900">{stats.totale}</div>
          <div className="text-sm text-gray-500">Totale</div>
        </div>
        {statiComponente.slice(0, 5).map(stato => (
          <div key={stato.value} className="bg-white rounded-xl p-4 border shadow-sm">
            <div className="text-2xl font-bold text-gray-900">{stats.byStato[stato.value] || 0}</div>
            <div className={`text-xs px-2 py-0.5 rounded inline-block ${stato.color}`}>{stato.label}</div>
          </div>
        ))}
      </div>
      
      {/* Filtri */}
      <div className="bg-white rounded-xl p-4 border shadow-sm mb-4">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Ricerca</label>
            <input
              type="text"
              value={filtri.ricerca}
              onChange={e => setFiltri({...filtri, ricerca: e.target.value})}
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
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Tipo</label>
            <select
              value={filtri.tipo}
              onChange={e => setFiltri({...filtri, tipo: e.target.value})}
              className="w-full px-3 py-2 border rounded-lg text-sm"
            >
              <option value="">Tutti</option>
              {tipiComponente.map(t => (
                <option key={t.id} value={t.id}>{t.icona} {t.nome}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Stato</label>
            <select
              value={filtri.stato}
              onChange={e => setFiltri({...filtri, stato: e.target.value})}
              className="w-full px-3 py-2 border rounded-lg text-sm"
            >
              <option value="">Tutti</option>
              {statiComponente.map(s => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">CW Anno</label>
            <input
              type="number"
              value={filtri.cw_anno}
              onChange={e => setFiltri({...filtri, cw_anno: parseInt(e.target.value)})}
              className="w-full px-3 py-2 border rounded-lg text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">CW Settimana</label>
            <input
              type="number"
              value={filtri.cw_settimana}
              onChange={e => setFiltri({...filtri, cw_settimana: e.target.value})}
              placeholder="1-53"
              min="1"
              max="53"
              className="w-full px-3 py-2 border rounded-lg text-sm"
            />
          </div>
        </div>
        
        {/* Azioni selezione */}
        {selectedIds.length > 0 && (
          <div className="mt-4 pt-4 border-t flex items-center gap-4">
            <span className="text-sm text-gray-600">{selectedIds.length} selezionati</span>
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="px-3 py-1.5 bg-red-100 text-red-700 rounded-lg text-sm hover:bg-red-200"
            >
              🗑️ Elimina selezionati
            </button>
            <button
              onClick={() => setSelectedIds([])}
              className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg text-sm hover:bg-gray-200"
            >
              ✕ Deseleziona
            </button>
          </div>
        )}
      </div>
      
      {/* Tabella */}
      <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-3 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={selectedIds.length === componentiPaginati.length && componentiPaginati.length > 0}
                    onChange={toggleSelectAll}
                    className="rounded"
                  />
                </th>
                <th className="px-3 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Codice</th>
                <th className="px-3 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Descrizione</th>
                <th className="px-3 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Disciplina</th>
                <th className="px-3 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Tipo</th>
                <th className="px-3 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Stato</th>
                <th className="px-3 py-3 text-left text-xs font-semibold text-gray-600 uppercase">CW</th>
                <th className="px-3 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Qtà</th>
                <th className="px-3 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Azioni</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {componentiPaginati.length === 0 ? (
                <tr>
                  <td colSpan="9" className="px-4 py-12 text-center text-gray-500">
                    {componentiFiltrati.length === 0 && componenti.length === 0 ? (
                      <div>
                        <p className="text-lg mb-2">Nessun componente</p>
                        <p className="text-sm">Inizia aggiungendo componenti manualmente o importando da Excel</p>
                      </div>
                    ) : (
                      <p>Nessun componente corrisponde ai filtri</p>
                    )}
                  </td>
                </tr>
              ) : (
                componentiPaginati.map(c => {
                  const statoInfo = statiComponente.find(s => s.value === c.stato) || statiComponente[0]
                  return (
                    <tr key={c.id} className={`hover:bg-gray-50 ${selectedIds.includes(c.id) ? 'bg-blue-50' : ''}`}>
                      <td className="px-3 py-3">
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(c.id)}
                          onChange={() => toggleSelect(c.id)}
                          className="rounded"
                        />
                      </td>
                      <td className="px-3 py-3">
                        <span className="font-mono text-sm font-medium text-gray-900">{c.codice}</span>
                      </td>
                      <td className="px-3 py-3 text-sm text-gray-600 max-w-xs truncate">{c.descrizione || '-'}</td>
                      <td className="px-3 py-3">
                        <span 
                          className="text-xs px-2 py-1 rounded-full"
                          style={{ backgroundColor: c.disciplina?.colore + '20', color: c.disciplina?.colore }}
                        >
                          {c.disciplina?.icona} {c.disciplina?.nome}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-sm text-gray-600">
                        {c.tipo?.icona} {c.tipo?.nome}
                      </td>
                      <td className="px-3 py-3">
                        <span className={`text-xs px-2 py-1 rounded-full ${statoInfo.color}`}>
                          {statoInfo.label}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-sm text-gray-600">
                        {c.cw_lavoro_anno && c.cw_lavoro_settimana ? (
                          <span className="font-mono">{c.cw_lavoro_anno}-W{String(c.cw_lavoro_settimana).padStart(2, '0')}</span>
                        ) : '-'}
                      </td>
                      <td className="px-3 py-3 text-sm text-gray-600">
                        {c.quantita} {c.unita_misura}
                      </td>
                      <td className="px-3 py-3 text-right">
                        <button
                          onClick={() => openEditForm(c)}
                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"
                          title="Modifica"
                        >
                          ✏️
                        </button>
                        <button
                          onClick={() => handleDeleteSingle(c.id)}
                          className="p-1.5 text-red-600 hover:bg-red-50 rounded ml-1"
                          title="Elimina"
                        >
                          🗑️
                        </button>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
        
        {/* Paginazione */}
        {totalPages > 1 && (
          <div className="px-4 py-3 border-t bg-gray-50 flex items-center justify-between">
            <div className="text-sm text-gray-600">
              {componentiFiltrati.length} componenti totali
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1 border rounded text-sm disabled:opacity-50"
              >
                ←
              </button>
              <span className="text-sm">
                Pagina {page} di {totalPages}
              </span>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-3 py-1 border rounded text-sm disabled:opacity-50"
              >
                →
              </button>
              <select
                value={perPage}
                onChange={e => { setPerPage(parseInt(e.target.value)); setPage(1) }}
                className="px-2 py-1 border rounded text-sm ml-2"
              >
                <option value="25">25</option>
                <option value="50">50</option>
                <option value="100">100</option>
                <option value="200">200</option>
              </select>
            </div>
          </div>
        )}
      </div>
      
      {/* ══════════════════════════════════════════════════════════════════════
          MODAL: Nuovo/Modifica Componente
          ══════════════════════════════════════════════════════════════════════ */}
      {showFormModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
            <div className="p-4 border-b flex items-center justify-between">
              <h2 className="text-lg font-semibold">
                {editingComponente ? '✏️ Modifica Componente' : '➕ Nuovo Componente'}
              </h2>
              <button onClick={() => setShowFormModal(false)} className="p-2 hover:bg-gray-100 rounded-lg">✕</button>
            </div>
            
            <div className="p-4 overflow-y-auto max-h-[calc(90vh-140px)]">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Codice */}
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Codice *</label>
                  <input
                    type="text"
                    value={formData.codice}
                    onChange={e => setFormData({...formData, codice: e.target.value})}
                    className="w-full px-3 py-2 border rounded-lg"
                    placeholder="Es. P21000-01-SP001"
                  />
                </div>
                
                {/* Descrizione */}
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Descrizione</label>
                  <input
                    type="text"
                    value={formData.descrizione}
                    onChange={e => setFormData({...formData, descrizione: e.target.value})}
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
                
                {/* Disciplina */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Disciplina *</label>
                  <select
                    value={formData.disciplina_id}
                    onChange={e => setFormData({...formData, disciplina_id: e.target.value, tipo_componente_id: ''})}
                    className="w-full px-3 py-2 border rounded-lg"
                  >
                    <option value="">Seleziona...</option>
                    {discipline.map(d => (
                      <option key={d.id} value={d.id}>{d.icona} {d.nome}</option>
                    ))}
                  </select>
                </div>
                
                {/* Tipo */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tipo *</label>
                  <select
                    value={formData.tipo_componente_id}
                    onChange={e => setFormData({...formData, tipo_componente_id: e.target.value})}
                    className="w-full px-3 py-2 border rounded-lg"
                    disabled={!formData.disciplina_id}
                  >
                    <option value="">Seleziona...</option>
                    {tipiComponente
                      .filter(t => !formData.disciplina_id || t.disciplina?.id === formData.disciplina_id)
                      .map(t => (
                        <option key={t.id} value={t.id}>{t.icona} {t.nome}</option>
                      ))}
                  </select>
                </div>
                
                {/* Work Package */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Work Package</label>
                  <select
                    value={formData.work_package_id}
                    onChange={e => setFormData({...formData, work_package_id: e.target.value})}
                    className="w-full px-3 py-2 border rounded-lg"
                  >
                    <option value="">Nessuno</option>
                    {workPackages.map(wp => (
                      <option key={wp.id} value={wp.id}>{wp.codice} - {wp.nome}</option>
                    ))}
                  </select>
                </div>
                
                {/* Quantità + Unità */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Quantità</label>
                    <input
                      type="number"
                      value={formData.quantita}
                      onChange={e => setFormData({...formData, quantita: e.target.value})}
                      className="w-full px-3 py-2 border rounded-lg"
                      min="0"
                      step="0.001"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Unità</label>
                    <input
                      type="text"
                      value={formData.unita_misura}
                      onChange={e => setFormData({...formData, unita_misura: e.target.value})}
                      className="w-full px-3 py-2 border rounded-lg"
                      placeholder="pz, m, kg..."
                    />
                  </div>
                </div>
                
                {/* Separatore */}
                <div className="sm:col-span-2 border-t pt-4 mt-2">
                  <h3 className="text-sm font-semibold text-gray-600 mb-3">📅 Pianificazione CW</h3>
                </div>
                
                {/* CW Arrivo Site */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Anno Arrivo</label>
                    <input
                      type="number"
                      value={formData.cw_arrivo_site_anno}
                      onChange={e => setFormData({...formData, cw_arrivo_site_anno: e.target.value})}
                      className="w-full px-3 py-2 border rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">CW Arrivo</label>
                    <input
                      type="number"
                      value={formData.cw_arrivo_site_settimana}
                      onChange={e => setFormData({...formData, cw_arrivo_site_settimana: e.target.value})}
                      className="w-full px-3 py-2 border rounded-lg"
                      placeholder="1-53"
                      min="1"
                      max="53"
                    />
                  </div>
                </div>
                
                {/* CW Lavoro */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Anno Lavoro</label>
                    <input
                      type="number"
                      value={formData.cw_lavoro_anno}
                      onChange={e => setFormData({...formData, cw_lavoro_anno: e.target.value})}
                      className="w-full px-3 py-2 border rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">CW Lavoro</label>
                    <input
                      type="number"
                      value={formData.cw_lavoro_settimana}
                      onChange={e => setFormData({...formData, cw_lavoro_settimana: e.target.value})}
                      className="w-full px-3 py-2 border rounded-lg"
                      placeholder="1-53"
                      min="1"
                      max="53"
                    />
                  </div>
                </div>
                
                {/* Separatore */}
                <div className="sm:col-span-2 border-t pt-4 mt-2">
                  <h3 className="text-sm font-semibold text-gray-600 mb-3">📋 Dati Tecnici (opzionali)</h3>
                </div>
                
                {/* Peso */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Peso (kg)</label>
                  <input
                    type="number"
                    value={formData.peso_kg}
                    onChange={e => setFormData({...formData, peso_kg: e.target.value})}
                    className="w-full px-3 py-2 border rounded-lg"
                    step="0.001"
                  />
                </div>
                
                {/* Dimensioni */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Dimensioni</label>
                  <input
                    type="text"
                    value={formData.dimensioni}
                    onChange={e => setFormData({...formData, dimensioni: e.target.value})}
                    className="w-full px-3 py-2 border rounded-lg"
                    placeholder='Es. 6" x 3m'
                  />
                </div>
                
                {/* Materiale */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Materiale</label>
                  <input
                    type="text"
                    value={formData.materiale}
                    onChange={e => setFormData({...formData, materiale: e.target.value})}
                    className="w-full px-3 py-2 border rounded-lg"
                    placeholder="Es. CS, SS316, ..."
                  />
                </div>
                
                {/* Specifica */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Specifica</label>
                  <input
                    type="text"
                    value={formData.specifica}
                    onChange={e => setFormData({...formData, specifica: e.target.value})}
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
                
                {/* Disegno */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Disegno rif.</label>
                  <input
                    type="text"
                    value={formData.disegno_riferimento}
                    onChange={e => setFormData({...formData, disegno_riferimento: e.target.value})}
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
                
                {/* Priorità */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Priorità</label>
                  <input
                    type="number"
                    value={formData.priorita}
                    onChange={e => setFormData({...formData, priorita: e.target.value})}
                    className="w-full px-3 py-2 border rounded-lg"
                    min="0"
                  />
                </div>
                
                {/* Separatore */}
                <div className="sm:col-span-2 border-t pt-4 mt-2">
                  <h3 className="text-sm font-semibold text-gray-600 mb-3">🚚 Acquisti (opzionali)</h3>
                </div>
                
                {/* Fornitore */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Fornitore</label>
                  <input
                    type="text"
                    value={formData.fornitore}
                    onChange={e => setFormData({...formData, fornitore: e.target.value})}
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
                
                {/* Numero ordine */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">N. Ordine</label>
                  <input
                    type="text"
                    value={formData.numero_ordine}
                    onChange={e => setFormData({...formData, numero_ordine: e.target.value})}
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
                
                {/* Note */}
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Note</label>
                  <textarea
                    value={formData.note}
                    onChange={e => setFormData({...formData, note: e.target.value})}
                    className="w-full px-3 py-2 border rounded-lg"
                    rows="2"
                  />
                </div>
              </div>
            </div>
            
            <div className="p-4 border-t bg-gray-50 flex justify-end gap-3">
              <button
                onClick={() => setShowFormModal(false)}
                className="px-4 py-2 border rounded-lg hover:bg-gray-100"
              >
                Annulla
              </button>
              <button
                onClick={handleSaveComponente}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                {editingComponente ? 'Salva Modifiche' : 'Crea Componente'}
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* ══════════════════════════════════════════════════════════════════════
          MODAL: Import Excel
          ══════════════════════════════════════════════════════════════════════ */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
            <div className="p-4 border-b flex items-center justify-between">
              <h2 className="text-lg font-semibold">📥 Import da Excel/CSV</h2>
              <button onClick={() => setShowImportModal(false)} className="p-2 hover:bg-gray-100 rounded-lg">✕</button>
            </div>
            
            {/* Progress Steps */}
            <div className="px-6 py-4 border-b bg-gray-50">
              <div className="flex items-center justify-between max-w-xl mx-auto">
                {['Upload', 'Mapping', 'Verifica', 'Risultati'].map((step, i) => (
                  <div key={step} className="flex items-center">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                      importStep > i + 1 ? 'bg-green-500 text-white' :
                      importStep === i + 1 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-500'
                    }`}>
                      {importStep > i + 1 ? '✓' : i + 1}
                    </div>
                    <span className={`ml-2 text-sm ${importStep === i + 1 ? 'font-medium' : 'text-gray-500'}`}>{step}</span>
                    {i < 3 && <div className={`w-12 h-0.5 mx-3 ${importStep > i + 1 ? 'bg-green-500' : 'bg-gray-200'}`}></div>}
                  </div>
                ))}
              </div>
            </div>
            
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-220px)]">
              {/* Step 1: Upload */}
              {importStep === 1 && (
                <div className="text-center py-8">
                  <div className="max-w-md mx-auto">
                    <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 hover:border-blue-400 transition-colors">
                      <input
                        type="file"
                        accept=".xlsx,.xls,.csv"
                        onChange={handleFileUpload}
                        className="hidden"
                        id="file-upload"
                      />
                      <label htmlFor="file-upload" className="cursor-pointer">
                        <div className="text-5xl mb-4">📄</div>
                        <p className="text-lg font-medium text-gray-700 mb-2">Trascina o clicca per caricare</p>
                        <p className="text-sm text-gray-500">Formati supportati: .xlsx, .xls, .csv</p>
                      </label>
                    </div>
                    
                    <div className="mt-6 text-left bg-blue-50 rounded-lg p-4">
                      <h4 className="font-medium text-blue-800 mb-2">💡 Suggerimenti</h4>
                      <ul className="text-sm text-blue-700 space-y-1">
                        <li>• La prima riga deve contenere le intestazioni</li>
                        <li>• La colonna "Codice" è obbligatoria</li>
                        <li>• I componenti esistenti verranno aggiornati</li>
                        <li>• Formato CW: YYYY-WW (es. 2025-05)</li>
                      </ul>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Step 2: Mapping */}
              {importStep === 2 && (
                <div>
                  <div className="mb-4 p-3 bg-green-50 rounded-lg">
                    <p className="text-green-800">
                      ✅ File caricato: <strong>{importFile?.name}</strong> ({importData.length} righe trovate)
                    </p>
                  </div>
                  
                  <h3 className="font-medium mb-4">Mappa le colonne del file ai campi del sistema:</h3>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {campiImport.map(campo => (
                      <div key={campo.key} className="flex items-center gap-3">
                        <span className={`text-sm w-40 ${campo.required ? 'font-medium' : ''}`}>
                          {campo.label}
                        </span>
                        <select
                          value={columnMapping[campo.key] ?? ''}
                          onChange={e => setColumnMapping({
                            ...columnMapping, 
                            [campo.key]: e.target.value === '' ? undefined : parseInt(e.target.value)
                          })}
                          className={`flex-1 px-3 py-2 border rounded-lg text-sm ${
                            campo.required && columnMapping[campo.key] === undefined ? 'border-red-300' : ''
                          }`}
                        >
                          <option value="">-- Non mappare --</option>
                          {importHeaders.map((h, i) => (
                            <option key={i} value={i}>{h}</option>
                          ))}
                        </select>
                      </div>
                    ))}
                  </div>
                  
                  {/* Preview primi dati */}
                  <div className="mt-6">
                    <h4 className="font-medium mb-2">Anteprima prime 5 righe:</h4>
                    <div className="overflow-x-auto border rounded-lg">
                      <table className="w-full text-xs">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-2 py-1 text-left">#</th>
                            {importHeaders.map((h, i) => (
                              <th key={i} className="px-2 py-1 text-left truncate max-w-32">{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {importData.slice(0, 5).map((row, i) => (
                            <tr key={i} className="border-t">
                              <td className="px-2 py-1 text-gray-400">{i + 2}</td>
                              {importHeaders.map((_, j) => (
                                <td key={j} className="px-2 py-1 truncate max-w-32">{row[j]}</td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Step 3: Validazione */}
              {importStep === 3 && (
                <div>
                  {importErrors.length > 0 ? (
                    <div className="mb-4 p-4 bg-red-50 rounded-lg">
                      <h4 className="font-medium text-red-800 mb-2">⚠️ Trovati {importErrors.length} errori:</h4>
                      <ul className="text-sm text-red-700 max-h-60 overflow-y-auto">
                        {importErrors.map((err, i) => (
                          <li key={i}>Riga {err.row}: {err.message}</li>
                        ))}
                      </ul>
                    </div>
                  ) : (
                    <div className="mb-4 p-4 bg-green-50 rounded-lg">
                      <h4 className="font-medium text-green-800">✅ Validazione completata</h4>
                      <p className="text-green-700">{importData.length} righe pronte per l'import</p>
                    </div>
                  )}
                  
                  <div className="bg-blue-50 rounded-lg p-4">
                    <h4 className="font-medium text-blue-800 mb-2">Riepilogo mapping:</h4>
                    <ul className="text-sm text-blue-700 grid grid-cols-2 gap-1">
                      {Object.entries(columnMapping).map(([key, index]) => {
                        const campo = campiImport.find(c => c.key === key)
                        return (
                          <li key={key}>
                            {campo?.label}: <strong>{importHeaders[index]}</strong>
                          </li>
                        )
                      })}
                    </ul>
                  </div>
                </div>
              )}
              
              {/* Step 4: Risultati */}
              {importStep === 4 && importResults && (
                <div className="text-center py-8">
                  <div className="text-6xl mb-4">🎉</div>
                  <h3 className="text-xl font-semibold mb-6">Import completato!</h3>
                  
                  <div className="grid grid-cols-3 gap-4 max-w-md mx-auto mb-6">
                    <div className="bg-green-50 rounded-lg p-4">
                      <div className="text-2xl font-bold text-green-600">{importResults.imported}</div>
                      <div className="text-sm text-green-700">Nuovi</div>
                    </div>
                    <div className="bg-blue-50 rounded-lg p-4">
                      <div className="text-2xl font-bold text-blue-600">{importResults.updated}</div>
                      <div className="text-sm text-blue-700">Aggiornati</div>
                    </div>
                    <div className="bg-red-50 rounded-lg p-4">
                      <div className="text-2xl font-bold text-red-600">{importResults.errors.length}</div>
                      <div className="text-sm text-red-700">Errori</div>
                    </div>
                  </div>
                  
                  {importResults.errors.length > 0 && (
                    <div className="bg-red-50 rounded-lg p-4 text-left max-w-md mx-auto">
                      <h4 className="font-medium text-red-800 mb-2">Errori durante l'import:</h4>
                      <ul className="text-sm text-red-700 max-h-40 overflow-y-auto">
                        {importResults.errors.map((err, i) => (
                          <li key={i}>Riga {err.row}: {err.message}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
            
            {/* Footer */}
            <div className="p-4 border-t bg-gray-50 flex justify-between">
              <button
                onClick={() => {
                  if (importStep > 1 && importStep < 4) setImportStep(importStep - 1)
                  else setShowImportModal(false)
                }}
                className="px-4 py-2 border rounded-lg hover:bg-gray-100"
              >
                {importStep === 1 || importStep === 4 ? 'Chiudi' : '← Indietro'}
              </button>
              
              {importStep === 2 && (
                <button
                  onClick={validateImportData}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Verifica dati →
                </button>
              )}
              
              {importStep === 3 && (
                <button
                  onClick={executeImport}
                  disabled={importing}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                >
                  {importing ? 'Importazione in corso...' : `Importa ${importData.length} righe`}
                </button>
              )}
              
              {importStep === 4 && (
                <button
                  onClick={() => setShowImportModal(false)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Chiudi
                </button>
              )}
            </div>
          </div>
        </div>
      )}
      
      {/* ══════════════════════════════════════════════════════════════════════
          MODAL: Conferma eliminazione
          ══════════════════════════════════════════════════════════════════════ */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 max-w-sm w-full">
            <div className="text-center">
              <div className="text-5xl mb-4">⚠️</div>
              <h3 className="text-lg font-semibold mb-2">Conferma eliminazione</h3>
              <p className="text-gray-600 mb-6">
                Stai per eliminare <strong>{selectedIds.length}</strong> componenti. Questa azione non può essere annullata.
              </p>
              <div className="flex gap-3 justify-center">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="px-4 py-2 border rounded-lg hover:bg-gray-100"
                >
                  Annulla
                </button>
                <button
                  onClick={handleDeleteSelected}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                >
                  Elimina
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
