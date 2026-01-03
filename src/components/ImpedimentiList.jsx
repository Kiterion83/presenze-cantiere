// ImpedimentiList.jsx - Lista impedimenti con export per report cliente
import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import ImpedimentoModal, { TIPI_IMPEDIMENTO, URGENZE } from './ImpedimentoModal'
import * as XLSX from 'xlsx'

export default function ImpedimentiList({ onClose }) {
  const { progetto } = useAuth()
  const progettoId = progetto?.id

  const [impedimenti, setImpedimenti] = useState([])
  const [loading, setLoading] = useState(true)
  const [filterTipo, setFilterTipo] = useState('')
  const [filterUrgenza, setFilterUrgenza] = useState('')
  const [filterStato, setFilterStato] = useState('aperti') // aperti, risolti, tutti
  const [selectedImpedimento, setSelectedImpedimento] = useState(null)
  const [showDetail, setShowDetail] = useState(false)

  useEffect(() => {
    loadImpedimenti()
  }, [progettoId])

  const loadImpedimenti = async () => {
    if (!progettoId) return
    setLoading(true)

    try {
      const { data, error } = await supabase
        .from('impedimenti')
        .select(`
          *,
          segnalatore:persone!segnalato_da(nome, cognome),
          work_package:work_packages(codice, nome),
          azione:azioni(titolo)
        `)
        .eq('progetto_id', progettoId)
        .order('created_at', { ascending: false })

      if (error) throw error

      // Per ogni impedimento, carica info componente se presente
      const enriched = await Promise.all((data || []).map(async (imp) => {
        let componente = null
        if (imp.pianificazione_componente_id) {
          const { data: compData } = await supabase
            .from('work_package_pianificazione_componenti')
            .select(`
              componente:componenti(codice),
              pianificazione:work_package_pianificazione(
                work_package:work_packages(codice, nome)
              )
            `)
            .eq('id', imp.pianificazione_componente_id)
            .single()
          
          if (compData) {
            componente = compData.componente
            if (!imp.work_package && compData.pianificazione?.work_package) {
              imp.work_package = compData.pianificazione.work_package
            }
          }
        }
        
        // Conta note
        const { count } = await supabase
          .from('note_attivita')
          .select('id', { count: 'exact' })
          .eq('impedimento_id', imp.id)
        
        // Calcola giorni blocco
        const dataInizio = new Date(imp.data_inizio)
        const dataFine = imp.data_risoluzione ? new Date(imp.data_risoluzione) : new Date()
        const giorniBlocco = Math.ceil((dataFine - dataInizio) / (1000 * 60 * 60 * 24))
        
        return {
          ...imp,
          componente,
          num_note: count || 0,
          giorni_blocco: giorniBlocco
        }
      }))

      setImpedimenti(enriched)
    } catch (error) {
      console.error('Errore:', error)
    } finally {
      setLoading(false)
    }
  }

  // Filtri
  const filteredImpedimenti = impedimenti.filter(imp => {
    if (filterStato === 'aperti' && imp.risolto) return false
    if (filterStato === 'risolti' && !imp.risolto) return false
    if (filterTipo && imp.tipo !== filterTipo) return false
    if (filterUrgenza && imp.urgenza !== filterUrgenza) return false
    return true
  })

  // Stats
  const stats = {
    totaleAperti: impedimenti.filter(i => !i.risolto).length,
    critici: impedimenti.filter(i => !i.risolto && i.urgenza === 'critica').length,
    alti: impedimenti.filter(i => !i.risolto && i.urgenza === 'alta').length,
    risoltiSettimana: impedimenti.filter(i => {
      if (!i.risolto || !i.data_risoluzione) return false
      const dataRis = new Date(i.data_risoluzione)
      const oggi = new Date()
      const diffGiorni = Math.ceil((oggi - dataRis) / (1000 * 60 * 60 * 24))
      return diffGiorni <= 7
    }).length
  }

  // Export Excel
  const handleExportExcel = () => {
    const dataExport = filteredImpedimenti.map(imp => {
      const tipo = TIPI_IMPEDIMENTO.find(t => t.value === imp.tipo)
      const urgenza = URGENZE.find(u => u.value === imp.urgenza)
      
      return {
        'Data Segnalazione': new Date(imp.data_inizio).toLocaleDateString('it-IT'),
        'Tipo': tipo?.label || imp.tipo,
        'Urgenza': urgenza?.label || imp.urgenza,
        'Titolo': imp.titolo,
        'Descrizione': imp.descrizione || '',
        'Work Package': imp.work_package?.codice || '',
        'Componente': imp.componente?.codice || '',
        'Azione': imp.azione?.titolo || '',
        'Assegnato a': imp.assegnato_a || '',
        'Segnalato da': imp.segnalatore ? `${imp.segnalatore.nome} ${imp.segnalatore.cognome}` : '',
        'Giorni Blocco': imp.giorni_blocco,
        'Data Prev. Risoluzione': imp.data_prevista_risoluzione ? new Date(imp.data_prevista_risoluzione).toLocaleDateString('it-IT') : '',
        'Stato': imp.risolto ? 'Risolto' : 'Aperto',
        'Data Risoluzione': imp.data_risoluzione ? new Date(imp.data_risoluzione).toLocaleDateString('it-IT') : '',
        'Note Risoluzione': imp.note_risoluzione || '',
        'N. Commenti': imp.num_note
      }
    })

    const ws = XLSX.utils.json_to_sheet(dataExport)
    
    // Larghezza colonne
    ws['!cols'] = [
      { wch: 15 }, // Data
      { wch: 20 }, // Tipo
      { wch: 10 }, // Urgenza
      { wch: 40 }, // Titolo
      { wch: 50 }, // Descrizione
      { wch: 12 }, // WP
      { wch: 12 }, // Componente
      { wch: 30 }, // Azione
      { wch: 20 }, // Assegnato
      { wch: 20 }, // Segnalato
      { wch: 12 }, // Giorni
      { wch: 15 }, // Data prev
      { wch: 10 }, // Stato
      { wch: 15 }, // Data ris
      { wch: 40 }, // Note ris
      { wch: 12 }, // Commenti
    ]

    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Impedimenti')
    
    const oggi = new Date().toISOString().split('T')[0]
    XLSX.writeFile(wb, `impedimenti_${progetto?.nome || 'progetto'}_${oggi}.xlsx`)
  }

  // Export PDF (HTML printable)
  const handleExportPDF = () => {
    const printWindow = window.open('', '_blank')
    
    const oggi = new Date().toLocaleDateString('it-IT', { 
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' 
    })
    
    // Calcola settimana
    const getWeekNumber = (date) => {
      const d = new Date(date)
      d.setHours(0, 0, 0, 0)
      d.setDate(d.getDate() + 4 - (d.getDay() || 7))
      const yearStart = new Date(d.getFullYear(), 0, 1)
      return Math.ceil((((d - yearStart) / 86400000) + 1) / 7)
    }
    const cw = getWeekNumber(new Date())
    const year = new Date().getFullYear()

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Report Impedimenti - ${progetto?.nome}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: Arial, sans-serif; padding: 20px; font-size: 12px; }
          .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #333; padding-bottom: 20px; }
          .header h1 { font-size: 24px; margin-bottom: 5px; }
          .header p { color: #666; }
          .stats { display: flex; gap: 20px; margin-bottom: 30px; }
          .stat-box { flex: 1; padding: 15px; border: 1px solid #ddd; border-radius: 8px; text-align: center; }
          .stat-box.critical { border-color: #dc2626; background: #fef2f2; }
          .stat-box h3 { font-size: 28px; margin-bottom: 5px; }
          .stat-box p { font-size: 11px; color: #666; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; vertical-align: top; }
          th { background: #f3f4f6; font-weight: bold; }
          tr:nth-child(even) { background: #f9fafb; }
          .urgenza-critica { color: #7c2d12; font-weight: bold; }
          .urgenza-alta { color: #dc2626; }
          .urgenza-media { color: #d97706; }
          .urgenza-bassa { color: #16a34a; }
          .badge { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 10px; }
          .badge-aperto { background: #fef2f2; color: #dc2626; }
          .badge-risolto { background: #f0fdf4; color: #16a34a; }
          .footer { margin-top: 30px; text-align: center; font-size: 10px; color: #999; border-top: 1px solid #ddd; padding-top: 15px; }
          @media print {
            body { padding: 0; }
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>🚧 Report Impedimenti</h1>
          <p><strong>${progetto?.nome}</strong> - Settimana CW${String(cw).padStart(2, '0')}/${year}</p>
          <p>Generato il ${oggi}</p>
        </div>
        
        <div class="stats">
          <div class="stat-box ${stats.critici > 0 ? 'critical' : ''}">
            <h3>${stats.totaleAperti}</h3>
            <p>Impedimenti Aperti</p>
          </div>
          <div class="stat-box">
            <h3>${stats.critici}</h3>
            <p>Critici</p>
          </div>
          <div class="stat-box">
            <h3>${stats.alti}</h3>
            <p>Alta Priorità</p>
          </div>
          <div class="stat-box">
            <h3>${stats.risoltiSettimana}</h3>
            <p>Risolti questa settimana</p>
          </div>
        </div>
        
        <h2>📋 Dettaglio Impedimenti Aperti</h2>
        <table>
          <thead>
            <tr>
              <th style="width:80px">Data</th>
              <th style="width:100px">Tipo</th>
              <th style="width:70px">Urgenza</th>
              <th>Descrizione</th>
              <th style="width:100px">Riferimento</th>
              <th style="width:120px">Assegnato</th>
              <th style="width:60px">Giorni</th>
            </tr>
          </thead>
          <tbody>
            ${filteredImpedimenti.filter(i => !i.risolto).map(imp => {
              const tipo = TIPI_IMPEDIMENTO.find(t => t.value === imp.tipo)
              return `
                <tr>
                  <td>${new Date(imp.data_inizio).toLocaleDateString('it-IT')}</td>
                  <td>${tipo?.icon || ''} ${tipo?.label || imp.tipo}</td>
                  <td class="urgenza-${imp.urgenza}">${imp.urgenza.toUpperCase()}</td>
                  <td>
                    <strong>${imp.titolo}</strong>
                    ${imp.descrizione ? `<br><small>${imp.descrizione}</small>` : ''}
                  </td>
                  <td>
                    ${imp.work_package?.codice || ''}
                    ${imp.componente?.codice ? `<br><small>${imp.componente.codice}</small>` : ''}
                    ${imp.azione?.titolo ? `<br><small>${imp.azione.titolo}</small>` : ''}
                  </td>
                  <td>${imp.assegnato_a || '-'}</td>
                  <td style="text-align:center"><strong>${imp.giorni_blocco}</strong></td>
                </tr>
              `
            }).join('')}
          </tbody>
        </table>
        
        ${filteredImpedimenti.filter(i => i.risolto).length > 0 ? `
          <h2 style="margin-top:30px">✅ Impedimenti Risolti (ultimi 7 giorni)</h2>
          <table>
            <thead>
              <tr>
                <th style="width:80px">Risolto</th>
                <th style="width:100px">Tipo</th>
                <th>Descrizione</th>
                <th style="width:100px">Riferimento</th>
                <th style="width:60px">Durata</th>
              </tr>
            </thead>
            <tbody>
              ${filteredImpedimenti.filter(i => i.risolto).slice(0, 10).map(imp => {
                const tipo = TIPI_IMPEDIMENTO.find(t => t.value === imp.tipo)
                return `
                  <tr>
                    <td>${new Date(imp.data_risoluzione).toLocaleDateString('it-IT')}</td>
                    <td>${tipo?.icon || ''} ${tipo?.label || imp.tipo}</td>
                    <td><strong>${imp.titolo}</strong></td>
                    <td>${imp.work_package?.codice || ''} ${imp.componente?.codice || ''}</td>
                    <td style="text-align:center">${imp.giorni_blocco} gg</td>
                  </tr>
                `
              }).join('')}
            </tbody>
          </table>
        ` : ''}
        
        <div class="footer">
          <p>Report generato automaticamente da Presenze Cantiere</p>
          <p>Per domande contattare il Construction Manager</p>
        </div>
        
        <script>
          window.onload = function() { window.print(); }
        </script>
      </body>
      </html>
    `
    
    printWindow.document.write(html)
    printWindow.document.close()
  }

  const getTipoInfo = (tipo) => TIPI_IMPEDIMENTO.find(t => t.value === tipo) || { icon: '❓', label: tipo, color: '#9CA3AF' }
  const getUrgenzaInfo = (urgenza) => URGENZE.find(u => u.value === urgenza) || { label: urgenza, color: '#9CA3AF' }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b bg-gradient-to-r from-red-600 to-orange-600 text-white">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-xl font-bold">🚧 Impedimenti e Blocchi</h2>
              <p className="text-white/80 text-sm mt-1">{progetto?.nome}</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleExportExcel}
                className="px-4 py-2 bg-white/20 rounded-lg hover:bg-white/30 text-sm font-medium"
              >
                📊 Excel
              </button>
              <button
                onClick={handleExportPDF}
                className="px-4 py-2 bg-white/20 rounded-lg hover:bg-white/30 text-sm font-medium"
              >
                📄 PDF
              </button>
              <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-lg ml-2">✕</button>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-4 gap-4 mt-4">
            <div className="bg-white/20 rounded-xl p-3 text-center">
              <p className="text-3xl font-bold">{stats.totaleAperti}</p>
              <p className="text-xs text-white/80">Aperti</p>
            </div>
            <div className={`rounded-xl p-3 text-center ${stats.critici > 0 ? 'bg-red-900' : 'bg-white/20'}`}>
              <p className="text-3xl font-bold">{stats.critici}</p>
              <p className="text-xs text-white/80">Critici</p>
            </div>
            <div className="bg-white/20 rounded-xl p-3 text-center">
              <p className="text-3xl font-bold">{stats.alti}</p>
              <p className="text-xs text-white/80">Alta Priorità</p>
            </div>
            <div className="bg-white/20 rounded-xl p-3 text-center">
              <p className="text-3xl font-bold">{stats.risoltiSettimana}</p>
              <p className="text-xs text-white/80">Risolti (7gg)</p>
            </div>
          </div>
        </div>

        {/* Filtri */}
        <div className="p-4 border-b bg-gray-50 flex flex-wrap gap-4 items-center">
          <div className="flex gap-1">
            {['aperti', 'risolti', 'tutti'].map(s => (
              <button
                key={s}
                onClick={() => setFilterStato(s)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  filterStato === s ? 'bg-red-600 text-white' : 'bg-white border hover:bg-gray-50'
                }`}
              >
                {s === 'aperti' ? '🔴 Aperti' : s === 'risolti' ? '✅ Risolti' : '📋 Tutti'}
              </button>
            ))}
          </div>
          <select
            value={filterTipo}
            onChange={e => setFilterTipo(e.target.value)}
            className="px-3 py-1.5 border rounded-lg text-sm"
          >
            <option value="">Tutti i tipi</option>
            {TIPI_IMPEDIMENTO.map(t => (
              <option key={t.value} value={t.value}>{t.icon} {t.label}</option>
            ))}
          </select>
          <select
            value={filterUrgenza}
            onChange={e => setFilterUrgenza(e.target.value)}
            className="px-3 py-1.5 border rounded-lg text-sm"
          >
            <option value="">Tutte le urgenze</option>
            {URGENZE.map(u => (
              <option key={u.value} value={u.value}>{u.label}</option>
            ))}
          </select>
          <span className="ml-auto text-sm text-gray-500">
            {filteredImpedimenti.length} risultati
          </span>
        </div>

        {/* Lista */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="text-center py-12">Caricamento...</div>
          ) : filteredImpedimenti.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <p className="text-5xl mb-4">✅</p>
              <p className="text-lg font-medium">Nessun impedimento</p>
            </div>
          ) : (
            <div className="divide-y">
              {filteredImpedimenti.map(imp => {
                const tipo = getTipoInfo(imp.tipo)
                const urgenza = getUrgenzaInfo(imp.urgenza)
                
                return (
                  <div 
                    key={imp.id} 
                    className={`p-4 hover:bg-gray-50 cursor-pointer ${imp.risolto ? 'opacity-60' : ''}`}
                    onClick={() => { setSelectedImpedimento(imp); setShowDetail(true) }}
                  >
                    <div className="flex items-start gap-4">
                      {/* Icona tipo */}
                      <div 
                        className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0"
                        style={{ backgroundColor: tipo.color + '20' }}
                      >
                        {tipo.icon}
                      </div>
                      
                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-gray-800">{imp.titolo}</span>
                          <span 
                            className="px-2 py-0.5 rounded text-xs font-medium text-white"
                            style={{ backgroundColor: urgenza.color }}
                          >
                            {urgenza.label}
                          </span>
                          {imp.risolto && (
                            <span className="px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-700">
                              ✅ Risolto
                            </span>
                          )}
                        </div>
                        
                        <div className="flex flex-wrap gap-3 mt-1 text-sm text-gray-500">
                          <span>📅 {new Date(imp.data_inizio).toLocaleDateString('it-IT')}</span>
                          {imp.work_package && <span>📋 {imp.work_package.codice}</span>}
                          {imp.componente && <span>📦 {imp.componente.codice}</span>}
                          {imp.azione && <span>⚡ {imp.azione.titolo}</span>}
                          {imp.assegnato_a && <span>👤 {imp.assegnato_a}</span>}
                          {imp.num_note > 0 && <span>💬 {imp.num_note}</span>}
                        </div>
                        
                        {imp.descrizione && (
                          <p className="text-sm text-gray-400 mt-1 line-clamp-1">{imp.descrizione}</p>
                        )}
                      </div>
                      
                      {/* Giorni blocco */}
                      <div className={`text-center px-3 py-2 rounded-xl ${
                        imp.risolto ? 'bg-green-50' :
                        imp.giorni_blocco > 7 ? 'bg-red-50' :
                        imp.giorni_blocco > 3 ? 'bg-amber-50' : 'bg-gray-50'
                      }`}>
                        <p className={`text-2xl font-bold ${
                          imp.risolto ? 'text-green-600' :
                          imp.giorni_blocco > 7 ? 'text-red-600' :
                          imp.giorni_blocco > 3 ? 'text-amber-600' : 'text-gray-600'
                        }`}>
                          {imp.giorni_blocco}
                        </p>
                        <p className="text-xs text-gray-500">giorni</p>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t bg-gray-50 flex justify-between items-center">
          <p className="text-sm text-gray-500">
            💡 Clicca su un impedimento per vedere i dettagli e aggiungere note
          </p>
          <button onClick={onClose} className="px-4 py-2 bg-gray-200 rounded-xl hover:bg-gray-300">
            Chiudi
          </button>
        </div>
      </div>

      {/* Modal dettaglio */}
      {showDetail && selectedImpedimento && (
        <ImpedimentoModal
          onClose={() => { setShowDetail(false); setSelectedImpedimento(null) }}
          onSave={() => { loadImpedimenti(); setShowDetail(false); setSelectedImpedimento(null) }}
          impedimentoEsistente={selectedImpedimento}
          pianificazioneComponenteId={selectedImpedimento.pianificazione_componente_id}
          azioneId={selectedImpedimento.azione_id}
          workPackageId={selectedImpedimento.work_package_id}
          componenteCodice={selectedImpedimento.componente?.codice}
          wpCodice={selectedImpedimento.work_package?.codice}
          azioneTitolo={selectedImpedimento.azione?.titolo}
        />
      )}
    </div>
  )
}
