import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'

export default function DashboardPage() {
  const { assegnazione, progetto, isAtLeast } = useAuth()
  const [loading, setLoading] = useState(true)
  const [periodo, setPeriodo] = useState('mese')
  const [data, setData] = useState({
    presenzePerGiorno: [],
    orePerSettimana: [],
    orePerDitta: [],
    topPresenze: [],
    assenzePerTipo: [],
    andamentoMensile: [],
    totali: { presenze: 0, ore: 0, straordinari: 0, assenze: 0 }
  })

  useEffect(() => {
    if (assegnazione?.progetto_id) loadData()
  }, [assegnazione?.progetto_id, periodo])

  const getDateRange = () => {
    const oggi = new Date()
    let dataInizio = new Date()
    switch (periodo) {
      case 'settimana': dataInizio.setDate(oggi.getDate() - 7); break
      case 'mese': dataInizio.setMonth(oggi.getMonth() - 1); break
      case 'trimestre': dataInizio.setMonth(oggi.getMonth() - 3); break
      case 'anno': dataInizio.setFullYear(oggi.getFullYear() - 1); break
    }
    return { inizio: dataInizio.toISOString().split('T')[0], fine: oggi.toISOString().split('T')[0] }
  }

  const loadData = async () => {
    setLoading(true)
    const { inizio, fine } = getDateRange()

    // Presenze
    const { data: presenze } = await supabase
      .from('presenze')
      .select('*, persona:persone(nome, cognome), assegnazione:assegnazioni_progetto(ditta:ditte(nome))')
      .eq('progetto_id', assegnazione.progetto_id)
      .gte('data', inizio)
      .lte('data', fine)

    // Assenze
    const { data: assenze } = await supabase
      .from('richieste_assenze')
      .select('*')
      .eq('progetto_id', assegnazione.progetto_id)
      .eq('stato', 'approvata')
      .gte('data_inizio', inizio)
      .lte('data_fine', fine)

    if (presenze) {
      // Presenze per giorno della settimana
      const giorniCount = [0, 0, 0, 0, 0, 0, 0]
      presenze.forEach(p => {
        const giorno = new Date(p.data).getDay()
        giorniCount[giorno]++
      })

      // Ore per settimana (ultime 8 settimane)
      const orePerSettimana = []
      for (let i = 7; i >= 0; i--) {
        const settimanaInizio = new Date()
        settimanaInizio.setDate(settimanaInizio.getDate() - (i * 7))
        const settimanaFine = new Date(settimanaInizio)
        settimanaFine.setDate(settimanaFine.getDate() + 6)
        
        let oreTotali = 0
        presenze.forEach(p => {
          const dataP = new Date(p.data)
          if (dataP >= settimanaInizio && dataP <= settimanaFine) {
            oreTotali += (parseFloat(p.ore_ordinarie) || 0) + (parseFloat(p.ore_straordinarie) || 0)
          }
        })
        orePerSettimana.push({
          label: `S${8 - i}`,
          ore: Math.round(oreTotali)
        })
      }

      // Ore per ditta
      const ditteOre = {}
      presenze.forEach(p => {
        const ditta = p.assegnazione?.ditta?.nome || 'Committente'
        if (!ditteOre[ditta]) ditteOre[ditta] = { ordinarie: 0, straordinarie: 0 }
        ditteOre[ditta].ordinarie += parseFloat(p.ore_ordinarie) || 0
        ditteOre[ditta].straordinarie += parseFloat(p.ore_straordinarie) || 0
      })

      // Top presenze
      const personePresenze = {}
      presenze.forEach(p => {
        const key = p.persona_id
        if (!personePresenze[key]) {
          personePresenze[key] = { nome: `${p.persona?.nome} ${p.persona?.cognome}`, presenze: 0, ore: 0 }
        }
        personePresenze[key].presenze++
        personePresenze[key].ore += (parseFloat(p.ore_ordinarie) || 0) + (parseFloat(p.ore_straordinarie) || 0)
      })

      // Assenze per tipo
      const assenzeCount = { ferie: 0, permesso: 0, malattia: 0, rol: 0, altro: 0 }
      assenze?.forEach(a => {
        if (assenzeCount[a.tipo] !== undefined) assenzeCount[a.tipo]++
      })

      // Andamento mensile (ultimi 6 mesi)
      const andamentoMensile = []
      for (let i = 5; i >= 0; i--) {
        const mese = new Date()
        mese.setMonth(mese.getMonth() - i)
        const meseStr = mese.toISOString().slice(0, 7)
        
        let oreOrd = 0, oreStra = 0, count = 0
        presenze.forEach(p => {
          if (p.data.startsWith(meseStr)) {
            oreOrd += parseFloat(p.ore_ordinarie) || 0
            oreStra += parseFloat(p.ore_straordinarie) || 0
            count++
          }
        })
        
        andamentoMensile.push({
          mese: mese.toLocaleDateString('it-IT', { month: 'short' }),
          ordinarie: Math.round(oreOrd),
          straordinarie: Math.round(oreStra),
          presenze: count
        })
      }

      // Totali
      let totOre = 0, totStra = 0
      presenze.forEach(p => {
        totOre += parseFloat(p.ore_ordinarie) || 0
        totStra += parseFloat(p.ore_straordinarie) || 0
      })

      setData({
        presenzePerGiorno: giorniCount,
        orePerSettimana,
        orePerDitta: Object.entries(ditteOre).map(([nome, ore]) => ({ nome, ...ore })),
        topPresenze: Object.values(personePresenze).sort((a, b) => b.ore - a.ore).slice(0, 10),
        assenzePerTipo: Object.entries(assenzeCount).map(([tipo, count]) => ({ tipo, count })),
        andamentoMensile,
        totali: {
          presenze: presenze.length,
          ore: Math.round(totOre),
          straordinari: Math.round(totStra),
          assenze: assenze?.length || 0
        }
      })
    }

    setLoading(false)
  }

  const giorniSettimana = ['Dom', 'Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab']
  const maxPresenze = Math.max(...data.presenzePerGiorno, 1)
  const maxOreSettimana = Math.max(...data.orePerSettimana.map(s => s.ore), 1)
  const maxAndamento = Math.max(...data.andamentoMensile.map(m => m.ordinarie + m.straordinarie), 1)

  const colors = ['#3B82F6', '#22C55E', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16']

  if (loading) {
    return (
      <div className="p-4 lg:p-8 flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-gray-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-500">Caricamento dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 lg:p-8">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">📊 Dashboard Avanzata</h1>
          <p className="text-gray-500">{progetto?.nome}</p>
        </div>
        <select
          value={periodo}
          onChange={(e) => setPeriodo(e.target.value)}
          className="px-4 py-2 border rounded-xl bg-white"
        >
          <option value="settimana">Ultima settimana</option>
          <option value="mese">Ultimo mese</option>
          <option value="trimestre">Ultimo trimestre</option>
          <option value="anno">Ultimo anno</option>
        </select>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-5 text-white">
          <p className="text-blue-100 text-sm">Presenze Totali</p>
          <p className="text-3xl font-bold">{data.totali.presenze}</p>
        </div>
        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-2xl p-5 text-white">
          <p className="text-green-100 text-sm">Ore Ordinarie</p>
          <p className="text-3xl font-bold">{data.totali.ore}h</p>
        </div>
        <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl p-5 text-white">
          <p className="text-orange-100 text-sm">Straordinari</p>
          <p className="text-3xl font-bold">{data.totali.straordinari}h</p>
        </div>
        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl p-5 text-white">
          <p className="text-purple-100 text-sm">Assenze</p>
          <p className="text-3xl font-bold">{data.totali.assenze}</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6 mb-6">
        {/* Andamento Mensile */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border">
          <h3 className="font-semibold text-gray-800 mb-4">📈 Andamento Ore (6 mesi)</h3>
          <div className="h-48 flex items-end gap-2">
            {data.andamentoMensile.map((m, i) => (
              <div key={i} className="flex-1 flex flex-col items-center">
                <div className="w-full flex flex-col" style={{ height: '160px' }}>
                  <div 
                    className="w-full bg-orange-400 rounded-t"
                    style={{ height: `${(m.straordinarie / maxAndamento) * 100}%` }}
                  />
                  <div 
                    className="w-full bg-blue-500"
                    style={{ height: `${(m.ordinarie / maxAndamento) * 100}%` }}
                  />
                </div>
                <p className="text-xs text-gray-500 mt-2">{m.mese}</p>
              </div>
            ))}
          </div>
          <div className="flex gap-4 mt-4 text-xs justify-center">
            <span className="flex items-center gap-1"><span className="w-3 h-3 bg-blue-500 rounded"></span> Ordinarie</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 bg-orange-400 rounded"></span> Straordinarie</span>
          </div>
        </div>

        {/* Ore per Settimana */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border">
          <h3 className="font-semibold text-gray-800 mb-4">📅 Ore per Settimana</h3>
          <div className="h-48 flex items-end gap-2">
            {data.orePerSettimana.map((s, i) => (
              <div key={i} className="flex-1 flex flex-col items-center">
                <div 
                  className="w-full bg-gradient-to-t from-green-500 to-green-400 rounded-t transition-all"
                  style={{ height: `${(s.ore / maxOreSettimana) * 160}px` }}
                />
                <p className="text-xs text-gray-500 mt-2">{s.label}</p>
                <p className="text-xs font-medium">{s.ore}h</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6 mb-6">
        {/* Presenze per Giorno */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border">
          <h3 className="font-semibold text-gray-800 mb-4">📊 Presenze per Giorno</h3>
          <div className="h-40 flex items-end gap-2">
            {data.presenzePerGiorno.map((count, i) => (
              <div key={i} className="flex-1 flex flex-col items-center">
                <div 
                  className="w-full bg-blue-500 rounded-t transition-all"
                  style={{ height: `${(count / maxPresenze) * 120}px`, minHeight: count > 0 ? '4px' : '0' }}
                />
                <p className="text-xs text-gray-500 mt-2">{giorniSettimana[i]}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Ore per Ditta */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border">
          <h3 className="font-semibold text-gray-800 mb-4">🏢 Ore per Ditta</h3>
          <div className="space-y-3">
            {data.orePerDitta.length === 0 ? (
              <p className="text-gray-400 text-center py-4">Nessun dato</p>
            ) : (
              data.orePerDitta.slice(0, 5).map((d, i) => {
                const totale = d.ordinarie + d.straordinarie
                const maxTot = Math.max(...data.orePerDitta.map(x => x.ordinarie + x.straordinarie), 1)
                return (
                  <div key={i}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="font-medium truncate">{d.nome}</span>
                      <span className="text-gray-500">{Math.round(totale)}h</span>
                    </div>
                    <div className="h-3 bg-gray-100 rounded-full overflow-hidden flex">
                      <div className="h-full bg-blue-500" style={{ width: `${(d.ordinarie / maxTot) * 100}%` }} />
                      <div className="h-full bg-orange-400" style={{ width: `${(d.straordinarie / maxTot) * 100}%` }} />
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>

        {/* Assenze per Tipo */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border">
          <h3 className="font-semibold text-gray-800 mb-4">🏖️ Assenze per Tipo</h3>
          <div className="space-y-3">
            {data.assenzePerTipo.map((a, i) => {
              const icons = { ferie: '🏖️', permesso: '📋', malattia: '🏥', rol: '⏰', altro: '📌' }
              const labels = { ferie: 'Ferie', permesso: 'Permessi', malattia: 'Malattia', rol: 'ROL', altro: 'Altro' }
              const colori = ['bg-purple-500', 'bg-blue-500', 'bg-red-500', 'bg-yellow-500', 'bg-gray-500']
              const maxAss = Math.max(...data.assenzePerTipo.map(x => x.count), 1)
              return (
                <div key={i} className="flex items-center gap-3">
                  <span className="text-xl">{icons[a.tipo]}</span>
                  <div className="flex-1">
                    <div className="flex justify-between text-sm mb-1">
                      <span>{labels[a.tipo]}</span>
                      <span className="font-medium">{a.count}</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div className={`h-full ${colori[i]} rounded-full`} style={{ width: `${(a.count / maxAss) * 100}%` }} />
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Top Lavoratori */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border">
        <h3 className="font-semibold text-gray-800 mb-4">🏆 Top 10 Lavoratori per Ore</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left text-sm text-gray-500 border-b">
                <th className="pb-3 pr-4">#</th>
                <th className="pb-3 pr-4">Nome</th>
                <th className="pb-3 pr-4 text-right">Presenze</th>
                <th className="pb-3 text-right">Ore Totali</th>
              </tr>
            </thead>
            <tbody>
              {data.topPresenze.map((p, i) => (
                <tr key={i} className="border-b last:border-0">
                  <td className="py-3 pr-4">
                    <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white ${i === 0 ? 'bg-yellow-500' : i === 1 ? 'bg-gray-400' : i === 2 ? 'bg-amber-600' : 'bg-blue-400'}`}>
                      {i + 1}
                    </span>
                  </td>
                  <td className="py-3 pr-4 font-medium">{p.nome}</td>
                  <td className="py-3 pr-4 text-right text-gray-600">{p.presenze}</td>
                  <td className="py-3 text-right font-semibold text-blue-600">{Math.round(p.ore)}h</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
