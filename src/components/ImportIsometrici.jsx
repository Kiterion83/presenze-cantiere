// ImportIsometrici.jsx - Import Excel/CSV per Isometrici e componenti piping
import { useState, useCallback } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import * as XLSX from 'xlsx'

export default function ImportIsometrici({ onClose, onSuccess }) {
  const { progettoId } = useAuth()
  
  // Stati
  const [step, setStep] = useState(1) // 1: upload, 2: mapping, 3: preview, 4: result
  const [importType, setImportType] = useState('isometrici') // isometrici, spool, supporti, saldature, accoppiamenti
  const [file, setFile] = useState(null)
  const [headers, setHeaders] = useState([])
  const [data, setData] = useState([])
  const [mapping, setMapping] = useState({})
  const [errors, setErrors] = useState([])
  const [importing, setImporting] = useState(false)
  const [results, setResults] = useState(null)
  
  // Configurazione campi per tipo di import
  const fieldConfigs = {
    isometrici: {
      title: 'Isometrici',
      emoji: '📐',
      fields: [
        { key: 'codice', label: 'Codice Isometrico *', required: true, example: 'ISO-PIP-001' },
        { key: 'linea', label: 'Numero Linea', example: '6"-HC-1001-A1A' },
        { key: 'diametro', label: 'Diametro', example: '6"' },
        { key: 'schedule', label: 'Schedule', example: 'SCH40' },
        { key: 'materiale', label: 'Materiale', example: 'A106 Gr.B' },
        { key: 'classe_rating', label: 'Classe/Rating', example: '150#' },
        { key: 'fluido', label: 'Fluido', example: 'Hydrocarbon' },
        { key: 'temperatura_design', label: 'Temp. Design', example: '150°C' },
        { key: 'pressione_design', label: 'Press. Design', example: '15 bar' },
        { key: 'pid_ref', label: 'P&ID Rif.', example: 'PID-001' },
        { key: 'area', label: 'Area', example: 'A01' },
        { key: 'revisione', label: 'Revisione', example: '0' },
        { key: 'descrizione', label: 'Descrizione', example: '' },
      ]
    },
    spool: {
      title: 'Spool',
      emoji: '🔩',
      fields: [
        { key: 'isometrico_codice', label: 'Codice Isometrico *', required: true, example: 'ISO-PIP-001' },
        { key: 'codice', label: 'Codice Spool *', required: true, example: 'SP-001' },
        { key: 'mark_number', label: 'Mark Number', example: 'MK-001' },
        { key: 'descrizione', label: 'Descrizione', example: '' },
        { key: 'peso_kg', label: 'Peso (kg)', example: '150' },
        { key: 'lunghezza_mm', label: 'Lunghezza (mm)', example: '3000' },
        { key: 'diametro', label: 'Diametro', example: '6"' },
        { key: 'status_materiale', label: 'Status', example: 'missing' },
      ]
    },
    supporti: {
      title: 'Supporti',
      emoji: '🔧',
      fields: [
        { key: 'isometrico_codice', label: 'Codice Isometrico *', required: true, example: 'ISO-PIP-001' },
        { key: 'spool_codice', label: 'Codice Spool (opz.)', example: 'SP-001' },
        { key: 'codice', label: 'Codice Supporto *', required: true, example: 'HGR-001' },
        { key: 'tipo', label: 'Tipo', example: 'HGR' },
        { key: 'descrizione', label: 'Descrizione', example: '' },
        { key: 'carico_kg', label: 'Carico (kg)', example: '500' },
        { key: 'specifica', label: 'Specifica', example: '' },
        { key: 'status_materiale', label: 'Status', example: 'missing' },
      ]
    },
    saldature: {
      title: 'Saldature',
      emoji: '⚡',
      fields: [
        { key: 'isometrico_codice', label: 'Codice Isometrico *', required: true, example: 'ISO-PIP-001' },
        { key: 'numero_saldatura', label: 'N. Saldatura *', required: true, example: 'WLD-001' },
        { key: 'tipo_collegamento', label: 'Tipo *', required: true, example: 'spool-spool' },
        { key: 'elemento_1_codice', label: 'Elemento 1 *', required: true, example: 'SP-001' },
        { key: 'elemento_2_codice', label: 'Elemento 2 *', required: true, example: 'SP-002' },
        { key: 'diametro', label: 'Diametro', example: '6"' },
        { key: 'spessore', label: 'Spessore', example: '7.11mm' },
        { key: 'wps', label: 'WPS', example: 'WPS-001' },
        { key: 'ndt_tipo', label: 'NDT Tipo', example: 'RT' },
        { key: 'ndt_percentuale', label: 'NDT %', example: '10' },
      ]
    },
    accoppiamenti: {
      title: 'Accoppiamenti Flangiati',
      emoji: '🔗',
      fields: [
        { key: 'isometrico_codice', label: 'Codice Isometrico *', required: true, example: 'ISO-PIP-001' },
        { key: 'codice', label: 'Codice Giunto *', required: true, example: 'JNT-001' },
        { key: 'ident_code', label: 'Ident Code', example: 'IC-001' },
        { key: 'tipo', label: 'Tipo *', required: true, example: 'flangia-flangia' },
        { key: 'flangia_1_codice', label: 'Flangia 1', example: 'FLG-001' },
        { key: 'flangia_2_codice', label: 'Flangia 2', example: 'FLG-002' },
        { key: 'equipment_tag', label: 'Equipment Tag', example: 'P-101' },
        { key: 'dimensione', label: 'Dimensione', example: '6"' },
        { key: 'rating', label: 'Rating', example: '150#' },
        { key: 'facing', label: 'Facing', example: 'RF' },
      ]
    }
  }

  const currentConfig = fieldConfigs[importType]

  // Gestione file upload
  const handleFileUpload = useCallback(async (e) => {
    const uploadedFile = e.target.files[0]
    if (!uploadedFile) return

    setFile(uploadedFile)
    setErrors([])

    try {
      const reader = new FileReader()
      reader.onload = (evt) => {
        const bstr = evt.target.result
        const wb = XLSX.read(bstr, { type: 'binary' })
        const wsname = wb.SheetNames[0]
        const ws = wb.Sheets[wsname]
        const jsonData = XLSX.utils.sheet_to_json(ws, { header: 1 })

        if (jsonData.length < 2) {
          setErrors([{ row: 0, message: 'Il file deve contenere almeno una riga di intestazione e una di dati' }])
          return
        }

        const fileHeaders = jsonData[0].map(h => String(h || '').trim())
        const fileData = jsonData.slice(1).filter(row => row.some(cell => cell !== null && cell !== undefined && cell !== ''))

        setHeaders(fileHeaders)
        setData(fileData)

        // Auto-mapping intelligente
        const autoMapping = {}
        currentConfig.fields.forEach(field => {
          const matchIndex = fileHeaders.findIndex(h => {
            const headerLower = h.toLowerCase()
            const fieldLower = field.key.toLowerCase()
            const labelLower = field.label.toLowerCase().replace(' *', '')
            return headerLower === fieldLower || 
                   headerLower === labelLower ||
                   headerLower.includes(fieldLower) ||
                   fieldLower.includes(headerLower)
          })
          if (matchIndex !== -1) {
            autoMapping[field.key] = matchIndex
          }
        })
        setMapping(autoMapping)

        setStep(2)
      }
      reader.readAsBinaryString(uploadedFile)
    } catch (error) {
      console.error('Errore lettura file:', error)
      setErrors([{ row: 0, message: 'Errore nella lettura del file' }])
    }
  }, [currentConfig])

  // Validazione dati
  const validateData = useCallback(() => {
    const validationErrors = []
    const requiredFields = currentConfig.fields.filter(f => f.required)

    data.forEach((row, rowIndex) => {
      requiredFields.forEach(field => {
        const colIndex = mapping[field.key]
        if (colIndex === undefined || !row[colIndex] || String(row[colIndex]).trim() === '') {
          validationErrors.push({
            row: rowIndex + 2,
            message: `Campo "${field.label}" mancante`
          })
        }
      })

      // Validazioni specifiche per tipo
      if (importType === 'saldature') {
        const tipo = row[mapping.tipo_collegamento]
        if (tipo && !['spool-spool', 'spool-fitting', 'fitting-fitting'].includes(tipo)) {
          validationErrors.push({
            row: rowIndex + 2,
            message: `Tipo collegamento "${tipo}" non valido (usa: spool-spool, spool-fitting, fitting-fitting)`
          })
        }
      }

      if (importType === 'accoppiamenti') {
        const tipo = row[mapping.tipo]
        if (tipo && !['flangia-flangia', 'flangia-equipment', 'flangia-orifice-flangia'].includes(tipo)) {
          validationErrors.push({
            row: rowIndex + 2,
            message: `Tipo "${tipo}" non valido (usa: flangia-flangia, flangia-equipment, flangia-orifice-flangia)`
          })
        }
      }
    })

    setErrors(validationErrors)
    setStep(3)
  }, [data, mapping, currentConfig, importType])

  // Esecuzione import
  const executeImport = useCallback(async () => {
    setImporting(true)
    const importResults = { imported: 0, updated: 0, skipped: 0, errors: [] }

    try {
      // Cache per lookup isometrici e spool
      const { data: existingIso } = await supabase
        .from('isometrici')
        .select('id, codice')
        .eq('progetto_id', progettoId)

      const isoMap = {}
      existingIso?.forEach(iso => { isoMap[iso.codice.toUpperCase()] = iso.id })

      // Cache spool per supporti e saldature
      let spoolMap = {}
      if (['supporti', 'saldature'].includes(importType)) {
        const { data: existingSpool } = await supabase.from('spool').select('id, codice, isometrico_id')
        existingSpool?.forEach(s => { spoolMap[`${s.isometrico_id}-${s.codice.toUpperCase()}`] = s.id })
      }

      for (let i = 0; i < data.length; i++) {
        const row = data[i]
        
        try {
          if (importType === 'isometrici') {
            // Import isometrici
            const codice = String(row[mapping.codice] || '').trim()
            if (!codice) {
              importResults.skipped++
              continue
            }

            const payload = {
              progetto_id: progettoId,
              codice,
              linea: row[mapping.linea] || null,
              diametro: row[mapping.diametro] || null,
              schedule: row[mapping.schedule] || null,
              materiale: row[mapping.materiale] || null,
              classe_rating: row[mapping.classe_rating] || null,
              fluido: row[mapping.fluido] || null,
              temperatura_design: row[mapping.temperatura_design] || null,
              pressione_design: row[mapping.pressione_design] || null,
              pid_ref: row[mapping.pid_ref] || null,
              area: row[mapping.area] || null,
              revisione: row[mapping.revisione] || '0',
              descrizione: row[mapping.descrizione] || null,
            }

            // Upsert basato su codice
            const existing = isoMap[codice.toUpperCase()]
            if (existing) {
              await supabase.from('isometrici').update(payload).eq('id', existing)
              importResults.updated++
            } else {
              const { data: newIso } = await supabase.from('isometrici').insert(payload).select().single()
              if (newIso) isoMap[codice.toUpperCase()] = newIso.id
              importResults.imported++
            }

          } else if (importType === 'spool') {
            // Import spool
            const isoCodice = String(row[mapping.isometrico_codice] || '').trim().toUpperCase()
            const codice = String(row[mapping.codice] || '').trim()
            
            if (!isoCodice || !codice) {
              importResults.skipped++
              continue
            }

            const isoId = isoMap[isoCodice]
            if (!isoId) {
              importResults.errors.push({ row: i + 2, message: `Isometrico "${isoCodice}" non trovato` })
              continue
            }

            const payload = {
              isometrico_id: isoId,
              codice,
              mark_number: row[mapping.mark_number] || null,
              descrizione: row[mapping.descrizione] || null,
              peso_kg: row[mapping.peso_kg] ? parseFloat(row[mapping.peso_kg]) : null,
              lunghezza_mm: row[mapping.lunghezza_mm] ? parseFloat(row[mapping.lunghezza_mm]) : null,
              diametro: row[mapping.diametro] || null,
              status_materiale: row[mapping.status_materiale] || 'missing',
            }

            // Upsert basato su isometrico_id + codice
            const { data: existing } = await supabase
              .from('spool')
              .select('id')
              .eq('isometrico_id', isoId)
              .eq('codice', codice)
              .single()

            if (existing) {
              await supabase.from('spool').update(payload).eq('id', existing.id)
              importResults.updated++
            } else {
              const { data: newSpool } = await supabase.from('spool').insert(payload).select().single()
              if (newSpool) spoolMap[`${isoId}-${codice.toUpperCase()}`] = newSpool.id
              importResults.imported++
            }

          } else if (importType === 'supporti') {
            // Import supporti
            const isoCodice = String(row[mapping.isometrico_codice] || '').trim().toUpperCase()
            const codice = String(row[mapping.codice] || '').trim()
            
            if (!isoCodice || !codice) {
              importResults.skipped++
              continue
            }

            const isoId = isoMap[isoCodice]
            if (!isoId) {
              importResults.errors.push({ row: i + 2, message: `Isometrico "${isoCodice}" non trovato` })
              continue
            }

            // Trova spool se specificato
            let spoolId = null
            const spoolCodice = row[mapping.spool_codice]
            if (spoolCodice) {
              spoolId = spoolMap[`${isoId}-${String(spoolCodice).toUpperCase()}`]
            }

            const payload = {
              isometrico_id: isoId,
              spool_id: spoolId,
              codice,
              tipo: row[mapping.tipo] || null,
              descrizione: row[mapping.descrizione] || null,
              carico_kg: row[mapping.carico_kg] ? parseFloat(row[mapping.carico_kg]) : null,
              specifica: row[mapping.specifica] || null,
              status_materiale: row[mapping.status_materiale] || 'missing',
            }

            const { data: existing } = await supabase
              .from('supporti')
              .select('id')
              .eq('isometrico_id', isoId)
              .eq('codice', codice)
              .single()

            if (existing) {
              await supabase.from('supporti').update(payload).eq('id', existing.id)
              importResults.updated++
            } else {
              await supabase.from('supporti').insert(payload)
              importResults.imported++
            }

          } else if (importType === 'saldature') {
            // Import saldature
            const isoCodice = String(row[mapping.isometrico_codice] || '').trim().toUpperCase()
            const numero = String(row[mapping.numero_saldatura] || '').trim()
            
            if (!isoCodice || !numero) {
              importResults.skipped++
              continue
            }

            const isoId = isoMap[isoCodice]
            if (!isoId) {
              importResults.errors.push({ row: i + 2, message: `Isometrico "${isoCodice}" non trovato` })
              continue
            }

            const tipoCollegamento = row[mapping.tipo_collegamento] || 'spool-spool'
            const [tipo1, tipo2] = tipoCollegamento.split('-')

            const payload = {
              isometrico_id: isoId,
              numero_saldatura: numero,
              tipo_collegamento: tipoCollegamento,
              elemento_1_tipo: tipo1,
              elemento_1_codice: row[mapping.elemento_1_codice] || null,
              elemento_2_tipo: tipo2,
              elemento_2_codice: row[mapping.elemento_2_codice] || null,
              diametro: row[mapping.diametro] || null,
              spessore: row[mapping.spessore] || null,
              wps: row[mapping.wps] || null,
              ndt_required: !!row[mapping.ndt_tipo],
              ndt_tipo: row[mapping.ndt_tipo] || null,
              ndt_percentuale: row[mapping.ndt_percentuale] ? parseInt(row[mapping.ndt_percentuale]) : null,
            }

            const { data: existing } = await supabase
              .from('saldature')
              .select('id')
              .eq('isometrico_id', isoId)
              .eq('numero_saldatura', numero)
              .single()

            if (existing) {
              await supabase.from('saldature').update(payload).eq('id', existing.id)
              importResults.updated++
            } else {
              await supabase.from('saldature').insert(payload)
              importResults.imported++
            }

          } else if (importType === 'accoppiamenti') {
            // Import accoppiamenti flangiati
            const isoCodice = String(row[mapping.isometrico_codice] || '').trim().toUpperCase()
            const codice = String(row[mapping.codice] || '').trim()
            
            if (!isoCodice || !codice) {
              importResults.skipped++
              continue
            }

            const isoId = isoMap[isoCodice]
            if (!isoId) {
              importResults.errors.push({ row: i + 2, message: `Isometrico "${isoCodice}" non trovato` })
              continue
            }

            const payload = {
              isometrico_id: isoId,
              codice,
              ident_code: row[mapping.ident_code] || null,
              tipo: row[mapping.tipo] || 'flangia-flangia',
              flangia_1_codice: row[mapping.flangia_1_codice] || null,
              flangia_2_codice: row[mapping.flangia_2_codice] || null,
              equipment_tag: row[mapping.equipment_tag] || null,
              dimensione: row[mapping.dimensione] || null,
              rating: row[mapping.rating] || null,
              facing: row[mapping.facing] || null,
            }

            const { data: existing } = await supabase
              .from('accoppiamenti_flangiati')
              .select('id')
              .eq('isometrico_id', isoId)
              .eq('codice', codice)
              .single()

            if (existing) {
              await supabase.from('accoppiamenti_flangiati').update(payload).eq('id', existing.id)
              importResults.updated++
            } else {
              await supabase.from('accoppiamenti_flangiati').insert(payload)
              importResults.imported++
            }
          }

        } catch (rowError) {
          importResults.errors.push({ row: i + 2, message: rowError.message })
        }
      }

      setResults(importResults)
      setStep(4)
      if (onSuccess) onSuccess()

    } catch (error) {
      console.error('Errore import:', error)
      setErrors([{ row: 0, message: error.message }])
    } finally {
      setImporting(false)
    }
  }, [data, mapping, progettoId, importType, onSuccess])

  // Download template
  const downloadTemplate = () => {
    const templateData = [
      currentConfig.fields.map(f => f.label.replace(' *', '')),
      currentConfig.fields.map(f => f.example)
    ]
    
    const ws = XLSX.utils.aoa_to_sheet(templateData)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Template')
    XLSX.writeFile(wb, `template_${importType}.xlsx`)
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold">📥 Import {currentConfig.title}</h2>
              <p className="text-blue-100 text-sm mt-1">Importa dati da Excel o CSV</p>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-lg">✕</button>
          </div>

          {/* Steps indicator */}
          <div className="flex items-center gap-2 mt-4">
            {['Upload', 'Mapping', 'Verifica', 'Risultato'].map((label, idx) => (
              <div key={idx} className="flex items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                  step > idx + 1 ? 'bg-green-500' : step === idx + 1 ? 'bg-white text-blue-600' : 'bg-white/30'
                }`}>
                  {step > idx + 1 ? '✓' : idx + 1}
                </div>
                <span className={`ml-2 text-sm ${step === idx + 1 ? 'text-white' : 'text-blue-200'}`}>{label}</span>
                {idx < 3 && <div className="w-8 h-0.5 bg-white/30 mx-2" />}
              </div>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Step 1: Upload */}
          {step === 1 && (
            <div className="space-y-6">
              {/* Tipo import */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Tipo di dati da importare</label>
                <div className="grid grid-cols-5 gap-2">
                  {Object.entries(fieldConfigs).map(([key, config]) => (
                    <button
                      key={key}
                      onClick={() => setImportType(key)}
                      className={`p-3 rounded-xl border-2 text-center transition-all ${
                        importType === key
                          ? 'border-blue-500 bg-blue-50 text-blue-700'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="text-2xl mb-1">{config.emoji}</div>
                      <div className="text-sm font-medium">{config.title}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Upload area */}
              <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center">
                <div className="text-5xl mb-4">📄</div>
                <h3 className="text-lg font-medium mb-2">Carica file Excel o CSV</h3>
                <p className="text-gray-500 mb-4">Trascina qui il file o clicca per selezionare</p>
                
                <input
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={handleFileUpload}
                  className="hidden"
                  id="file-upload"
                />
                <label
                  htmlFor="file-upload"
                  className="inline-block px-6 py-3 bg-blue-600 text-white rounded-xl cursor-pointer hover:bg-blue-700"
                >
                  Seleziona File
                </label>

                {file && (
                  <div className="mt-4 p-3 bg-green-50 rounded-lg inline-flex items-center gap-2">
                    <span className="text-green-600">✓</span>
                    <span className="text-green-700">{file.name}</span>
                  </div>
                )}
              </div>

              {/* Template download */}
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                <div>
                  <p className="font-medium">📋 Scarica template</p>
                  <p className="text-sm text-gray-500">Template Excel con colonne corrette per {currentConfig.title}</p>
                </div>
                <button
                  onClick={downloadTemplate}
                  className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300"
                >
                  ⬇️ Download
                </button>
              </div>

              {errors.length > 0 && (
                <div className="p-4 bg-red-50 rounded-xl text-red-700">
                  {errors.map((e, i) => <p key={i}>{e.message}</p>)}
                </div>
              )}
            </div>
          )}

          {/* Step 2: Mapping */}
          {step === 2 && (
            <div className="space-y-6">
              <div className="bg-blue-50 p-4 rounded-xl">
                <p className="text-blue-700">
                  <strong>File:</strong> {file?.name} | <strong>Righe:</strong> {data.length} | <strong>Colonne:</strong> {headers.length}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {currentConfig.fields.map(field => (
                  <div key={field.key} className="flex items-center gap-3">
                    <span className={`w-40 text-sm ${field.required ? 'font-medium' : 'text-gray-600'}`}>
                      {field.label}
                    </span>
                    <select
                      value={mapping[field.key] ?? ''}
                      onChange={e => setMapping({
                        ...mapping,
                        [field.key]: e.target.value === '' ? undefined : parseInt(e.target.value)
                      })}
                      className={`flex-1 px-3 py-2 border rounded-lg text-sm ${
                        field.required && mapping[field.key] === undefined ? 'border-red-300 bg-red-50' : ''
                      }`}
                    >
                      <option value="">-- Non mappare --</option>
                      {headers.map((h, i) => (
                        <option key={i} value={i}>{h}</option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>

              {/* Preview */}
              <div>
                <h4 className="font-medium mb-2">Anteprima (prime 5 righe):</h4>
                <div className="overflow-x-auto border rounded-lg">
                  <table className="w-full text-xs">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-2 py-1 text-left">#</th>
                        {headers.map((h, i) => (
                          <th key={i} className="px-2 py-1 text-left truncate max-w-32">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {data.slice(0, 5).map((row, i) => (
                        <tr key={i} className="border-t">
                          <td className="px-2 py-1 text-gray-400">{i + 2}</td>
                          {headers.map((_, j) => (
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

          {/* Step 3: Preview/Validation */}
          {step === 3 && (
            <div className="space-y-6">
              {errors.length > 0 ? (
                <div className="p-4 bg-red-50 rounded-xl">
                  <h4 className="font-medium text-red-800 mb-2">⚠️ Trovati {errors.length} errori:</h4>
                  <ul className="text-sm text-red-700 max-h-60 overflow-y-auto space-y-1">
                    {errors.slice(0, 20).map((err, i) => (
                      <li key={i}>Riga {err.row}: {err.message}</li>
                    ))}
                    {errors.length > 20 && <li>... e altri {errors.length - 20} errori</li>}
                  </ul>
                </div>
              ) : (
                <div className="p-4 bg-green-50 rounded-xl">
                  <h4 className="font-medium text-green-800">✅ Validazione completata</h4>
                  <p className="text-green-700">{data.length} righe pronte per l'import</p>
                </div>
              )}

              <div className="p-4 bg-blue-50 rounded-xl">
                <h4 className="font-medium text-blue-800 mb-2">Riepilogo mapping:</h4>
                <div className="grid grid-cols-2 gap-2 text-sm text-blue-700">
                  {Object.entries(mapping).map(([key, index]) => {
                    const field = currentConfig.fields.find(f => f.key === key)
                    return (
                      <div key={key}>
                        {field?.label}: <strong>{headers[index]}</strong>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Step 4: Results */}
          {step === 4 && results && (
            <div className="text-center py-8">
              <div className="text-6xl mb-4">🎉</div>
              <h3 className="text-xl font-semibold mb-6">Import completato!</h3>
              
              <div className="grid grid-cols-4 gap-4 max-w-lg mx-auto mb-6">
                <div className="bg-green-50 rounded-lg p-4">
                  <div className="text-2xl font-bold text-green-600">{results.imported}</div>
                  <div className="text-sm text-green-700">Nuovi</div>
                </div>
                <div className="bg-blue-50 rounded-lg p-4">
                  <div className="text-2xl font-bold text-blue-600">{results.updated}</div>
                  <div className="text-sm text-blue-700">Aggiornati</div>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="text-2xl font-bold text-gray-600">{results.skipped}</div>
                  <div className="text-sm text-gray-700">Saltati</div>
                </div>
                <div className="bg-red-50 rounded-lg p-4">
                  <div className="text-2xl font-bold text-red-600">{results.errors.length}</div>
                  <div className="text-sm text-red-700">Errori</div>
                </div>
              </div>

              {results.errors.length > 0 && (
                <div className="bg-red-50 rounded-lg p-4 text-left max-w-lg mx-auto">
                  <h4 className="font-medium text-red-800 mb-2">Errori durante l'import:</h4>
                  <ul className="text-sm text-red-700 max-h-40 overflow-y-auto">
                    {results.errors.map((err, i) => (
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
              if (step > 1 && step < 4) setStep(step - 1)
              else onClose()
            }}
            className="px-4 py-2 border rounded-lg hover:bg-gray-100"
          >
            {step === 1 || step === 4 ? 'Chiudi' : '← Indietro'}
          </button>

          {step === 2 && (
            <button
              onClick={validateData}
              disabled={currentConfig.fields.filter(f => f.required).some(f => mapping[f.key] === undefined)}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              Verifica dati →
            </button>
          )}

          {step === 3 && (
            <button
              onClick={executeImport}
              disabled={importing || errors.length > 0}
              className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
            >
              {importing ? 'Importazione in corso...' : `Importa ${data.length} righe`}
            </button>
          )}

          {step === 4 && (
            <button
              onClick={onClose}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Chiudi
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
