import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'

export default function StatistichePage() {
  const { assegnazione, progetto } = useAuth()
  const [loading, setLoading] = useState(true)
  const [periodo, setPeriodo] = useState('settimana')
  const [stats, setStats] = useState({
    totaleOre: 0,
    totalePresenze: 0,
    mediaOreGiorno: 0,
    personePiuPresenti: [],
    presenzePerGiorno: [],
    orePerDitta: [],
    assenze: { ferie: 0, permessi: 0, malattia: 0 }
  })
  const [exporting, setExporting] = useState(false)

  useEffect(() => {
    if (assegnazione?.progetto_id) loadStats()
  }, [assegnazione?.progetto_id, periodo])

  const getDateRange = () => {
    const oggi = new Date()
    let dataInizio = new Date()
    
    switch (periodo) {
      case 'settimana':
        dataInizio.setDate(oggi.getDate() - 7)
        break
      case 'mese':
        dataInizio.setMonth(oggi.getMonth() - 1)
        break
      case 'trimestre':
        dataInizio.setMonth(oggi.getMonth() - 3)
        break
      case 'anno':
        dataInizio.setFullYear(oggi.getFullYear() - 1)
        break
    }
    
    return {
      inizio: dataInizio.toISOString().split('T')[0],
      fine: oggi.toISOString().split('T')[0]
    }
  }

  const loadStats = async () => {
    setLoading(true)
    const { inizio, fine } = getDateRange()

    const { data: presenze } = await supabase
      .from('presenze')
      .select('*, persona:persone(nome, cognome), assegnazione:assegnazioni_progetto(ditta:ditte(nome))')
      .eq('progetto_id', assegnazione.progetto_id)
      .gte('data', inizio)
      .lte('data', fine)
      .not('ora_uscita', 'is', null)

    const { data: assenze } = await supabase
      .from('richieste_assenze')
      .select('*')
      .eq('progetto_id', assegnazione.progetto_id)
      .eq('stato', 'approvata')
      .gte('data_inizio', inizio)
      .lte('data_fine', fine)

    if (presenze) {
      let totaleMinuti = 0
      presenze.forEach(p => {
        if (p.ora_entrata && p.ora_uscita) {
          const entrata = new Date(`2000-01-01T${p.ora_entrata}`)
          const uscita = new Date(`2000-01-01T${p.ora_uscita}`)
          totaleMinuti += (uscita - entrata) / (1000 * 60)
        }
      })

      const presenzePerPersona = {}
      presenze.forEach(p => {
        const key = p.persona_id
        if (!presenzePerPersona[key]) {
          presenzePerPersona[key] = { nome: `${p.persona?.nome} ${p.persona?.cognome}`, count: 0, minuti: 0 }
        }
        presenzePerPersona[key].count++
        if (p.ora_entrata && p.ora_uscita) {
          const entrata = new Date(`2000-01-01T${p.ora_entrata}`)
          const uscita = new Date(`2000-01-01T${p.ora_uscita}`)
          presenzePerPersona[key].minuti += (uscita - entrata) / (1000 * 60)
        }
      })

      const orePerDitta = {}
      presenze.forEach(p => {
        const ditta = p.assegnazione?.ditta?.nome || 'Committente'
        if (!orePerDitta[ditta]) orePerDitta[ditta] = 0
        if (p.ora_entrata && p.ora_uscita) {
          const entrata = new Date(`2000-01-01T${p.ora_entrata}`)
          const uscita = new Date(`2000-01-01T${p.ora_uscita}`)
          orePerDitta[ditta] += (uscita - entrata) / (1000 * 60 * 60)
        }
      })

      const presenzePerGiorno = [0, 0, 0, 0, 0, 0, 0]
      presenze.forEach(p => {
        const giorno = new Date(p.data).getDay()
        presenzePerGiorno[giorno]++
      })

      const conteggioAssenze = { ferie: 0, permessi: 0, malattia: 0 }
      assenze?.forEach(a => {
        if (a.tipo === 'ferie') conteggioAssenze.ferie++
        else if (a.tipo === 'permesso') conteggioAssenze.permessi++
        else if (a.tipo === 'malattia') conteggioAssenze.malattia++
      })

      const giorniUnici = [...new Set(presenze.map(p => p.data))].length

      setStats({
        totaleOre: Math.round(totaleMinuti / 60),
        totalePresenze: presenze.length,
        mediaOreGiorno: giorniUnici > 0 ? Math.round(totaleMinuti / 60 / giorniUnici * 10) / 10 : 0,
        personePiuPresenti: Object.values(presenzePerPersona)
          .sort((a, b) => b.count - a.count)
          .slice(0, 5)
          .map(p => ({ ...p, ore: Math.round(p.minuti / 60 * 10) / 10 })),
        presenzePerGiorno,
        orePerDitta: Object.entries(orePerDitta).map(([nome, ore]) => ({ nome, ore: Math.round(ore * 10) / 10 })),
        assenze: conteggioAssenze
      })
    }

    setLoading(false)
  }

  const exportToCSV = () => {
    setExporting(true)
    const { inizio, fine } = getDateRange()
    
    let csv = `Statistiche Presenze - ${progetto?.nome}\n`
    csv += `Periodo: ${periodo} (${inizio} - ${fine})\n\n`
    csv += `RIEPILOGO\nTotale Ore,${stats.totaleOre}\nTotale Presenze,${stats.totalePresenze}\nMedia Ore/Giorno,${stats.mediaOreGiorno}\n\n`
    csv += `ASSENZE\nFerie,${stats.assenze.ferie}\nPermessi,${stats.assenze.permessi}\nMalattia,${stats.assenze.malattia}\n\n`
    csv += `TOP 5 PRESENZE\nNome,Presenze,Ore\n`
    stats.personePiuPresenti.forEach(p => { csv += `${p.nome},${p.count},${p.ore}\n` })
    csv += `\nORE PER DITTA\nDitta,Ore\n`
    stats.orePerDitta.forEach(d => { csv += `${d.nome},${d.ore}\n` })
    
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `statistiche_${progetto?.codice || 'progetto'}_${inizio}_${fine}.csv`
    link.click()
    setExporting(false)
  }

  const exportToPDF = () => {
    setExporting(true)
    const { inizio, fine } = getDateRange()
    
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Statistiche</title>
    <style>body{font-family:Arial,sans-serif;padding:40px;color:#333}h1{color:#2563eb;border-bottom:2px solid #2563eb;padding-bottom:10px}h2{color:#1e40af;margin-top:30px}.info{color:#666;margin-bottom:30px}.stats-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:20px;margin:20px 0}.stat-box{background:#f3f4f6;padding:20px;border-radius:8px;text-align:center}.stat-value{font-size:32px;font-weight:bold;color:#2563eb}.stat-label{color:#666;margin-top:5px}table{width:100%;border-collapse:collapse;margin-top:15px}th,td{padding:12px;text-align:left;border-bottom:1px solid #e5e7eb}th{background:#f9fafb;font-weight:600}.footer{margin-top:50px;text-align:center;color:#999;font-size:12px}</style></head>
    <body><h1>📊 Statistiche Presenze</h1>
    <p class="info"><strong>Progetto:</strong> ${progetto?.nome}<br><strong>Periodo:</strong> ${periodo} (${new Date(inizio).toLocaleDateString('it-IT')} - ${new Date(fine).toLocaleDateString('it-IT')})<br><strong>Generato:</strong> ${new Date().toLocaleString('it-IT')}</p>
    <div class="stats-grid"><div class="stat-box"><div class="stat-value">${stats.totaleOre}</div><div class="stat-label">Ore Totali</div></div><div class="stat-box"><div class="stat-value">${stats.totalePresenze}</div><div class="stat-label">Presenze</div></div><div class="stat-box"><div class="stat-value">${stats.mediaOreGiorno}</div><div class="stat-label">Media Ore/Giorno</div></div></div>
    <h2>🏖️ Assenze</h2><table><tr><th>Tipo</th><th>Quantità</th></tr><tr><td>Ferie</td><td>${stats.assenze.ferie}</td></tr><tr><td>Permessi</td><td>${stats.assenze.permessi}</td></tr><tr><td>Malattia</td><td>${stats.assenze.malattia}</td></tr></table>
    <h2>🏆 Top 5</h2><table><tr><th>Nome</th><th>Presenze</th><th>Ore</th></tr>${stats.personePiuPresenti.map(p=>`<tr><td>${p.nome}</td><td>${p.count}</td><td>${p.ore}</td></tr>`).join('')}</table>
    <h2>🏢 Ore per Ditta</h2><table><tr><th>Ditta</th><th>Ore</th></tr>${stats.orePerDitta.map(d=>`<tr><td>${d.nome}</td><td>${d.ore}</td></tr>`).join('')}</table>
    <div class="footer">Presenze Cantiere</div></body></html>`
    
    const win = window.open('', '_blank')
    win.document.write(html)
    win.document.close()
    setTimeout(() => { win.print(); setExporting(false) }, 250)
  }

  const exportDetailedExcel = async () => {
    setExporting(true)
    const { inizio, fine } = getDateRange()
    
    const { data: presenze } = await supabase
      .from('presenze')
      .select('*, persona:persone(nome, cognome), assegnazione:assegnazioni_progetto(ditta:ditte(nome), squadra:squadre(nome))')
      .eq('progetto_id', assegnazione.progetto_id)
      .gte('data', inizio)
      .lte('data', fine)
      .order('data', { ascending: false })
    
    let csv = `Data,Nome,Cognome,Ditta,Squadra,Entrata,Uscita,Ore,Note\n`
    presenze?.forEach(p => {
      let ore = ''
      if (p.ora_entrata && p.ora_uscita) {
        const e = new Date(`2000-01-01T${p.ora_entrata}`)
        const u = new Date(`2000-01-01T${p.ora_uscita}`)
        ore = ((u - e) / (1000 * 60 * 60)).toFixed(2)
      }
      csv += `${p.data},${p.persona?.nome||''},${p.persona?.cognome||''},${p.assegnazione?.ditta?.nome||'Committente'},${p.assegnazione?.squadra?.nome||'-'},${p.ora_entrata||''},${p.ora_uscita||''},${ore},"${p.note||''}"\n`
    })
    
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `presenze_dettaglio_${inizio}_${fine}.csv`
    link.click()
    setExporting(false)
  }

  const giorniSettimana = ['Dom', 'Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab']
  const maxPresenze = Math.max(...stats.presenzePerGiorno, 1)

  return (
    <div className="p-4 lg:p-8">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">📊 Statistiche</h1>
          <p className="text-gray-500">{progetto?.nome}</p>
        </div>
        
        <div className="flex flex-wrap gap-2">
          <select value={periodo} onChange={(e) => setPeriodo(e.target.value)} className="px-4 py-2 border rounded-xl bg-white">
            <option value="settimana">Ultima settimana</option>
            <option value="mese">Ultimo mese</option>
            <option value="trimestre">Ultimo trimestre</option>
            <option value="anno">Ultimo anno</option>
          </select>
          
          <div className="flex gap-2">
            <button onClick={exportToCSV} disabled={exporting||loading} className="px-4 py-2 bg-green-600 text-white rounded-xl font-medium hover:bg-green-700 disabled:bg-green-300">📥 CSV</button>
            <button onClick={exportToPDF} disabled={exporting||loading} className="px-4 py-2 bg-red-600 text-white rounded-xl font-medium hover:bg-red-700 disabled:bg-red-300">📄 PDF</button>
            <button onClick={exportDetailedExcel} disabled={exporting||loading} className="px-4 py-2 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 disabled:bg-blue-300">📋 Dettaglio</button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="w-12 h-12 border-4 border-gray-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-500">Caricamento...</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-2xl p-6 shadow-sm border">
              <p className="text-3xl font-bold text-blue-600">{stats.totaleOre}</p>
              <p className="text-gray-500">Ore Totali</p>
            </div>
            <div className="bg-white rounded-2xl p-6 shadow-sm border">
              <p className="text-3xl font-bold text-green-600">{stats.totalePresenze}</p>
              <p className="text-gray-500">Presenze</p>
            </div>
            <div className="bg-white rounded-2xl p-6 shadow-sm border">
              <p className="text-3xl font-bold text-purple-600">{stats.mediaOreGiorno}</p>
              <p className="text-gray-500">Media Ore/Giorno</p>
            </div>
            <div className="bg-white rounded-2xl p-6 shadow-sm border">
              <p className="text-3xl font-bold text-orange-600">{stats.assenze.ferie + stats.assenze.permessi + stats.assenze.malattia}</p>
              <p className="text-gray-500">Assenze</p>
            </div>
          </div>

          <div className="grid lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-2xl p-6 shadow-sm border">
              <h3 className="font-semibold text-gray-800 mb-4">📅 Presenze per Giorno</h3>
              <div className="flex items-end justify-between h-40 gap-2">
                {stats.presenzePerGiorno.map((count, i) => (
                  <div key={i} className="flex-1 flex flex-col items-center">
                    <div className="w-full bg-blue-500 rounded-t-lg transition-all" style={{ height: `${(count / maxPresenze) * 100}%`, minHeight: count > 0 ? '8px' : '0' }} />
                    <p className="text-xs text-gray-500 mt-2">{giorniSettimana[i]}</p>
                    <p className="text-xs font-medium">{count}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-2xl p-6 shadow-sm border">
              <h3 className="font-semibold text-gray-800 mb-4">🏆 Top 5 Presenze</h3>
              <div className="space-y-3">
                {stats.personePiuPresenti.length === 0 ? <p className="text-gray-400 text-center py-4">Nessun dato</p> : stats.personePiuPresenti.map((p, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-white ${i === 0 ? 'bg-yellow-500' : i === 1 ? 'bg-gray-400' : i === 2 ? 'bg-amber-600' : 'bg-blue-400'}`}>{i + 1}</div>
                    <div className="flex-1"><p className="font-medium text-gray-800">{p.nome}</p><p className="text-xs text-gray-500">{p.ore} ore</p></div>
                    <div className="text-right"><p className="font-bold text-blue-600">{p.count}</p><p className="text-xs text-gray-400">presenze</p></div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-2xl p-6 shadow-sm border">
              <h3 className="font-semibold text-gray-800 mb-4">🏢 Ore per Ditta</h3>
              <div className="space-y-3">
                {stats.orePerDitta.length === 0 ? <p className="text-gray-400 text-center py-4">Nessun dato</p> : stats.orePerDitta.map((d, i) => {
                  const maxOre = Math.max(...stats.orePerDitta.map(x => x.ore), 1)
                  const colors = ['bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-orange-500', 'bg-pink-500']
                  return (
                    <div key={i}>
                      <div className="flex justify-between text-sm mb-1"><span className="font-medium">{d.nome}</span><span className="text-gray-500">{d.ore}h</span></div>
                      <div className="h-3 bg-gray-100 rounded-full overflow-hidden"><div className={`h-full ${colors[i % colors.length]} rounded-full`} style={{ width: `${(d.ore / maxOre) * 100}%` }} /></div>
                    </div>
                  )
                })}
              </div>
            </div>

            <div className="bg-white rounded-2xl p-6 shadow-sm border">
              <h3 className="font-semibold text-gray-800 mb-4">🏖️ Assenze Approvate</h3>
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center p-4 bg-purple-50 rounded-xl"><p className="text-2xl font-bold text-purple-600">{stats.assenze.ferie}</p><p className="text-xs text-gray-500">Ferie</p></div>
                <div className="text-center p-4 bg-blue-50 rounded-xl"><p className="text-2xl font-bold text-blue-600">{stats.assenze.permessi}</p><p className="text-xs text-gray-500">Permessi</p></div>
                <div className="text-center p-4 bg-red-50 rounded-xl"><p className="text-2xl font-bold text-red-600">{stats.assenze.malattia}</p><p className="text-xs text-gray-500">Malattia</p></div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
