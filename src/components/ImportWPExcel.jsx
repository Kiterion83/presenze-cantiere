// ImportWPExcel.jsx - Import Work Packages da file Excel
import { useState, useRef } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import * as XLSX from 'xlsx'

export default function ImportWPExcel({ onClose, onSuccess, discipline = [], fasiWorkflow = [], squadre = [] }) {
  const { progetto } = useAuth()
  const progettoId = progetto?.id
  const fileInputRef = useRef(null)

  const [step, setStep] = useState(1) // 1: upload, 2: preview, 3: mapping, 4: importing, 5: done
  const [file, setFile] = useState(null)
  const [rawData, setRawData] = useState([])
  const [headers, setHeaders] = useState([])
  const [mapping, setMapping] = useState({})
  const [importing, setImporting] = useState(false)
  const [progress, setProgress] = useState({ current: 0, total: 0 })
  const [results, setResults] = useState({ success: 0, errors: [], warnings: [] })
  const [previewRows, setPreviewRows] = useState([])

  // Campi disponibili per mapping
  const availableFields = [
    { key: 'codice', label: 'Codice WP *', required: true, example: 'WP-P-001' },
    { key: 'nome', label: 'Nome WP *', required: true, example: 'Prefab Area A03' },
    { key: 'descrizione', label: 'Descrizione', required: false, example: 'Descrizione dettagliata...' },
    { key: 'squadra', label: 'Squadra', required: false, example: 'Squadra Alpha' },
    { key: 'data_inizio', label: 'Data Inizio', required: false, example: '2025-01-15' },
    { key: 'data_fine', label: 'Data Fine', required: false, example: '2025-02-28' },
    { key: 'priorita', label: 'Priorità (0-10)', required: false, example: '5' },
    { key: 'componenti', label: 'Componenti (separati da virgola)', required: false, example: 'SP-0001, SP-0002, SP-0003' },
    { key: 'fasi', label: 'Fasi (separate da virgola)', required: false, example: 'Prefab, Montaggio, Test' },
  ]

  // Gestione upload file
  const handleFileSelect = async (e) => {
    const selectedFile = e.target.files[0]
    if (!selectedFile) return

    setFile(selectedFile)

    try {
      const data = await readExcelFile(selectedFile)
      if (data.length === 0) {
        alert('Il file è vuoto')
        return
      }

      const headers = Object.keys(data[0])
      setHeaders(headers)
      setRawData(data)
      setPreviewRows(data.slice(0, 5))

      // Auto-mapping intelligente
      const autoMapping = {}
      headers.forEach(header => {
        const headerLower = header.toLowerCase().trim()
        
        if (headerLower.includes('codice') || headerLower === 'code' || headerLower === 'wp') {
          autoMapping.codice = header
        } else if (headerLower.includes('nome') || headerLower === 'name' || headerLower === 'title') {
          autoMapping.nome = header
        } else if (headerLower.includes('descr')) {
          autoMapping.descrizione = header
        } else if (headerLower.includes('squadra') || headerLower.includes('team') || headerLower.includes('crew')) {
          autoMapping.squadra = header
        } else if (headerLower.includes('inizio') || headerLower.includes('start')) {
          autoMapping.data_inizio = header
        } else if (headerLower.includes('fine') || headerLower.includes('end')) {
          autoMapping.data_fine = header
        } else if (headerLower.includes('prior')) {
          autoMapping.priorita = header
        } else if (headerLower.includes('component') || headerLower.includes('item') || headerLower.includes('spool')) {
          autoMapping.componenti = header
        } else if (headerLower.includes('fasi') || headerLower.includes('phase') || headerLower.includes('attivita')) {
          autoMapping.fasi = header
        }
      })
      setMapping(autoMapping)

      setStep(2)
    } catch (error) {
      console.error('Errore lettura file:', error)
      alert('Errore nella lettura del file: ' + error.message)
    }
  }

  // Leggi file Excel
  const readExcelFile = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target.result)
          const workbook = XLSX.read(data, { type: 'array', cellDates: true })
          const firstSheet = workbook.Sheets[workbook.SheetNames[0]]
          const jsonData = XLSX.utils.sheet_to_json(firstSheet, { defval: '' })
          resolve(jsonData)
        } catch (err) {
          reject(err)
        }
      }
      reader.onerror = reject
      reader.readAsArrayBuffer(file)
    })
  }

  // Esegui import
  const handleImport = async () => {
    if (!mapping.codice || !mapping.nome) {
      alert('Devi mappare almeno Codice e Nome')
      return
    }

    setStep(4)
    setImporting(true)
    setProgress({ current: 0, total: rawData.length })

    const results = { success: 0, errors: [], warnings: [] }

    for (let i = 0; i < rawData.length; i++) {
      const row = rawData[i]
      setProgress({ current: i + 1, total: rawData.length })

      try {
        // Estrai valori dal mapping
        const codice = String(row[mapping.codice] || '').trim().toUpperCase()
        const nome = String(row[mapping.nome] || '').trim()

        if (!codice || !nome) {
          results.warnings.push(`Riga ${i + 2}: Codice o nome mancante, saltata`)
          continue
        }

        // Verifica se esiste già
        const { data: existing } = await supabase
          .from('work_packages')
          .select('id')
          .eq('progetto_id', progettoId)
          .eq('codice', codice)
          .single()

        if (existing) {
          results.warnings.push(`Riga ${i + 2}: WP "${codice}" già esistente, saltato`)
          continue
        }

        // Trova squadra
        let squadraId = null
        if (mapping.squadra && row[mapping.squadra]) {
          const squadraNome = String(row[mapping.squadra]).trim().toLowerCase()
          const squadra = squadre.find(s => s.nome.toLowerCase() === squadraNome)
          if (squadra) {
            squadraId = squadra.id
          } else {
            results.warnings.push(`Riga ${i + 2}: Squadra "${row[mapping.squadra]}" non trovata`)
          }
        }

        // Parse date
        let dataInizio = null
        let dataFine = null
        if (mapping.data_inizio && row[mapping.data_inizio]) {
          dataInizio = parseDate(row[mapping.data_inizio])
        }
        if (mapping.data_fine && row[mapping.data_fine]) {
          dataFine = parseDate(row[mapping.data_fine])
        }

        // Priorità
        let priorita = 0
        if (mapping.priorita && row[mapping.priorita]) {
          priorita = parseInt(row[mapping.priorita]) || 0
        }

        // Colore casuale
        const colori = ['#3B82F6', '#22C55E', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16']
        const colore = colori[i % colori.length]

        // Inserisci WP
        const { data: newWP, error: wpError } = await supabase
          .from('work_packages')
          .insert({
            progetto_id: progettoId,
            codice,
            nome,
            descrizione: mapping.descrizione ? String(row[mapping.descrizione] || '').trim() : null,
            squadra_id: squadraId,
            data_inizio_pianificata: dataInizio,
            data_fine_pianificata: dataFine,
            priorita,
            colore,
            stato: 'pianificato'
          })
          .select()
          .single()

        if (wpError) throw wpError

        // Gestisci componenti
        if (mapping.componenti && row[mapping.componenti]) {
          const compCodici = String(row[mapping.componenti])
            .split(/[,;|]/)
            .map(c => c.trim().toUpperCase())
            .filter(c => c)

          for (const compCodice of compCodici) {
            const { data: comp } = await supabase
              .from('componenti')
              .select('id')
              .eq('progetto_id', progettoId)
              .eq('codice', compCodice)
              .single()

            if (comp) {
              await supabase.from('work_package_componenti').insert({
                work_package_id: newWP.id,
                componente_id: comp.id,
                ordine: 0
              })
            } else {
              results.warnings.push(`WP ${codice}: Componente "${compCodice}" non trovato`)
            }
          }
        }

        // Gestisci fasi
        if (mapping.fasi && row[mapping.fasi]) {
          const fasiNomi = String(row[mapping.fasi])
            .split(/[,;|]/)
            .map(f => f.trim().toLowerCase())
            .filter(f => f)

          let ordine = 0
          for (const faseNome of fasiNomi) {
            const fase = fasiWorkflow.find(f => f.nome.toLowerCase() === faseNome)
            if (fase) {
              await supabase.from('work_package_fasi').insert({
                work_package_id: newWP.id,
                fase_workflow_id: fase.id,
                ordine: ordine++
              })
            } else {
              results.warnings.push(`WP ${codice}: Fase "${faseNome}" non trovata`)
            }
          }
        }

        results.success++
      } catch (error) {
        console.error(`Errore riga ${i + 2}:`, error)
        results.errors.push(`Riga ${i + 2}: ${error.message}`)
      }
    }

    setResults(results)
    setImporting(false)
    setStep(5)
  }

  // Parse date helper
  const parseDate = (value) => {
    if (!value) return null
    
    // Se è già una data
    if (value instanceof Date) {
      return value.toISOString().split('T')[0]
    }
    
    // Prova vari formati
    const str = String(value).trim()
    
    // ISO format
    if (/^\d{4}-\d{2}-\d{2}/.test(str)) {
      return str.substring(0, 10)
    }
    
    // DD/MM/YYYY o DD-MM-YYYY
    const match = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/)
    if (match) {
      return `${match[3]}-${match[2].padStart(2, '0')}-${match[1].padStart(2, '0')}`
    }
    
    // Prova Date.parse
    const parsed = new Date(value)
    if (!isNaN(parsed.getTime())) {
      return parsed.toISOString().split('T')[0]
    }
    
    return null
  }

  // Download template
  const handleDownloadTemplate = () => {
    const template = [
      {
        'Codice': 'WP-P-001',
        'Nome': 'Prefab Area A03',
        'Descrizione': 'Descrizione del work package',
        'Squadra': 'Squadra Alpha',
        'Data Inizio': '2025-01-15',
        'Data Fine': '2025-02-28',
        'Priorità': 5,
        'Componenti': 'SP-0001, SP-0002, SP-0003',
        'Fasi': 'Prefab, Montaggio'
      },
      {
        'Codice': 'WP-P-002',
        'Nome': 'Montaggio Area B01',
        'Descrizione': '',
        'Squadra': 'Squadra Beta',
        'Data Inizio': '2025-02-01',
        'Data Fine': '2025-03-15',
        'Priorità': 3,
        'Componenti': 'SUP-0001, SUP-0002',
        'Fasi': 'Montaggio, Test'
      }
    ]

    const ws = XLSX.utils.json_to_sheet(template)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Work Packages')
    XLSX.writeFile(wb, 'template_work_packages.xlsx')
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b bg-gradient-to-r from-green-600 to-emerald-600 text-white">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-xl font-bold">📥 Import Work Packages da Excel</h2>
              <p className="text-white/80 text-sm mt-1">
                {step === 1 && 'Carica il file Excel con i Work Packages'}
                {step === 2 && 'Anteprima dati caricati'}
                {step === 3 && 'Mappa le colonne ai campi'}
                {step === 4 && 'Importazione in corso...'}
                {step === 5 && 'Importazione completata'}
              </p>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-lg">✕</button>
          </div>
          
          {/* Progress steps */}
          <div className="flex items-center gap-2 mt-4">
            {[1, 2, 3, 4, 5].map(s => (
              <div key={s} className={`flex items-center ${s < 5 ? 'flex-1' : ''}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                  s === step ? 'bg-white text-green-600' :
                  s < step ? 'bg-green-400 text-white' : 'bg-white/30 text-white'
                }`}>
                  {s < step ? '✓' : s}
                </div>
                {s < 5 && <div className={`flex-1 h-1 mx-2 rounded ${s < step ? 'bg-green-400' : 'bg-white/30'}`} />}
              </div>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Step 1: Upload */}
          {step === 1 && (
            <div className="space-y-6">
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-gray-300 rounded-xl p-12 text-center cursor-pointer hover:border-green-400 hover:bg-green-50 transition-colors"
              >
                <input 
                  ref={fileInputRef}
                  type="file" 
                  accept=".xlsx,.xls,.csv"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <p className="text-5xl mb-4">📄</p>
                <p className="text-lg font-medium text-gray-700">Clicca per caricare un file Excel</p>
                <p className="text-sm text-gray-500 mt-2">Formati supportati: .xlsx, .xls, .csv</p>
              </div>

              <div className="bg-blue-50 rounded-xl p-4">
                <h4 className="font-medium text-blue-800 mb-2">💡 Suggerimento</h4>
                <p className="text-sm text-blue-700 mb-3">
                  Scarica il template Excel per vedere il formato consigliato dei dati.
                </p>
                <button 
                  onClick={handleDownloadTemplate}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700"
                >
                  📥 Scarica Template
                </button>
              </div>

              <div className="bg-gray-50 rounded-xl p-4">
                <h4 className="font-medium text-gray-700 mb-2">Colonne supportate:</h4>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm">
                  {availableFields.map(f => (
                    <div key={f.key} className="flex items-center gap-2">
                      <span className={f.required ? 'text-red-500' : 'text-gray-400'}>
                        {f.required ? '●' : '○'}
                      </span>
                      <span>{f.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Preview */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium">📊 Anteprima dati ({rawData.length} righe)</h3>
                  <p className="text-sm text-gray-500">File: {file?.name}</p>
                </div>
              </div>

              <div className="overflow-x-auto border rounded-xl">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-2 text-left text-gray-500">#</th>
                      {headers.map(h => (
                        <th key={h} className="px-3 py-2 text-left font-medium">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {previewRows.map((row, i) => (
                      <tr key={i} className="hover:bg-gray-50">
                        <td className="px-3 py-2 text-gray-400">{i + 1}</td>
                        {headers.map(h => (
                          <td key={h} className="px-3 py-2 truncate max-w-[200px]">
                            {String(row[h] || '')}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {rawData.length > 5 && (
                <p className="text-sm text-gray-500 text-center">
                  ... e altre {rawData.length - 5} righe
                </p>
              )}
            </div>
          )}

          {/* Step 3: Mapping */}
          {step === 3 && (
            <div className="space-y-4">
              <div className="bg-amber-50 rounded-xl p-4 mb-4">
                <p className="text-sm text-amber-700">
                  <strong>🔗 Mapping colonne:</strong> Associa le colonne del tuo file ai campi del sistema.
                  I campi con * sono obbligatori.
                </p>
              </div>

              <div className="grid gap-3">
                {availableFields.map(field => (
                  <div key={field.key} className="flex items-center gap-4 p-3 bg-gray-50 rounded-xl">
                    <div className="w-48">
                      <p className="font-medium">
                        {field.label}
                        {field.required && <span className="text-red-500 ml-1">*</span>}
                      </p>
                      <p className="text-xs text-gray-500">Es: {field.example}</p>
                    </div>
                    <span className="text-gray-400">→</span>
                    <select
                      value={mapping[field.key] || ''}
                      onChange={e => setMapping({ ...mapping, [field.key]: e.target.value })}
                      className={`flex-1 px-3 py-2 border rounded-lg ${
                        field.required && !mapping[field.key] ? 'border-red-300 bg-red-50' : ''
                      }`}
                    >
                      <option value="">-- Non mappato --</option>
                      {headers.map(h => (
                        <option key={h} value={h}>{h}</option>
                      ))}
                    </select>
                    {mapping[field.key] && (
                      <span className="text-green-500">✓</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Step 4: Importing */}
          {step === 4 && (
            <div className="text-center py-12">
              <div className="animate-spin w-16 h-16 border-4 border-green-200 border-t-green-600 rounded-full mx-auto mb-6"></div>
              <h3 className="text-xl font-medium mb-2">Importazione in corso...</h3>
              <p className="text-gray-500 mb-4">
                {progress.current} / {progress.total} righe elaborate
              </p>
              <div className="w-64 h-3 bg-gray-200 rounded-full mx-auto overflow-hidden">
                <div 
                  className="h-full bg-green-500 transition-all duration-300"
                  style={{ width: `${progress.total > 0 ? (progress.current / progress.total) * 100 : 0}%` }}
                />
              </div>
            </div>
          )}

          {/* Step 5: Results */}
          {step === 5 && (
            <div className="space-y-6">
              {/* Success banner */}
              <div className={`p-6 rounded-xl text-center ${
                results.success > 0 ? 'bg-green-50' : 'bg-red-50'
              }`}>
                <p className="text-5xl mb-4">{results.success > 0 ? '✅' : '❌'}</p>
                <h3 className="text-2xl font-bold mb-2">
                  {results.success} Work Package importati
                </h3>
                {results.errors.length > 0 && (
                  <p className="text-red-600">{results.errors.length} errori</p>
                )}
                {results.warnings.length > 0 && (
                  <p className="text-amber-600">{results.warnings.length} avvisi</p>
                )}
              </div>

              {/* Warnings */}
              {results.warnings.length > 0 && (
                <div className="bg-amber-50 rounded-xl p-4">
                  <h4 className="font-medium text-amber-800 mb-2">⚠️ Avvisi ({results.warnings.length})</h4>
                  <div className="max-h-40 overflow-y-auto space-y-1 text-sm text-amber-700">
                    {results.warnings.map((w, i) => (
                      <p key={i}>{w}</p>
                    ))}
                  </div>
                </div>
              )}

              {/* Errors */}
              {results.errors.length > 0 && (
                <div className="bg-red-50 rounded-xl p-4">
                  <h4 className="font-medium text-red-800 mb-2">❌ Errori ({results.errors.length})</h4>
                  <div className="max-h-40 overflow-y-auto space-y-1 text-sm text-red-700">
                    {results.errors.map((e, i) => (
                      <p key={i}>{e}</p>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t bg-gray-50 flex justify-between">
          <button
            onClick={() => {
              if (step === 1) onClose()
              else if (step === 5) onClose()
              else setStep(step - 1)
            }}
            className="px-4 py-2 bg-gray-200 rounded-xl hover:bg-gray-300"
          >
            {step === 1 || step === 5 ? 'Chiudi' : '← Indietro'}
          </button>

          {step < 4 && (
            <button
              onClick={() => {
                if (step === 3) handleImport()
                else setStep(step + 1)
              }}
              disabled={step === 3 && (!mapping.codice || !mapping.nome)}
              className="px-6 py-2 bg-green-600 text-white rounded-xl hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              {step === 3 ? '🚀 Avvia Import' : 'Continua →'}
            </button>
          )}

          {step === 5 && (
            <button
              onClick={() => {
                onSuccess?.()
                onClose()
              }}
              className="px-6 py-2 bg-green-600 text-white rounded-xl hover:bg-green-700"
            >
              ✓ Fatto
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
