import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'

export default function StatistichePage() {
  const { assegnazione, progetto } = useAuth()
  const [period, setPeriod] = useState('month')
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState(null)
  const [presenzeData, setPresenzeData] = useState([])
  const [topWorkers, setTopWorkers] = useState([])

  useEffect(() => {
    if (assegnazione?.progetto_id) loadStats()
  }, [assegnazione?.progetto_id, period])

  const getDateRange = () => {
    const today = new Date()
    let startDate
    if (period === 'week') {
      const day = today.getDay()
      const diff = today.getDate() - day + (day === 0 ? -6 : 1)
      startDate = new Date(today.setDate(diff))
    } else if (period === 'month') {
      startDate = new Date(today.getFullYear(), today.getMonth(), 1)
    } else {
      startDate = new Date(today.getFullYear(), 0, 1)
    }
    return { start: startDate.toISOString().split('T')[0], end: new Date().toISOString().split('T')[0] }
  }

  const loadStats = async () => {
    setLoading(true)
    const { start, end } = getDateRange()

    const { data: presenze } = await supabase
      .from('presenze')
      .select('*, persona:persone(nome, cognome)')
      .eq('progetto_id', assegnazione.progetto_id)
      .gte('data', start)
      .lte('data', end)

    if (!presenze) { setLoading(false); return }

    const oreOrd = presenze.reduce((s, p) => s + parseFloat(p.ore_ordinarie || 0), 0)
    const oreStr = presenze.reduce((s, p) => s + parseFloat(p.ore_straordinarie || 0), 0)
    const giorni = new Set(presenze.map(p => p.data)).size
    const persone = new Set(presenze.map(p => p.persona_id)).size

    setStats({
      oreOrdinarie: oreOrd,
      oreStraordinarie: oreStr,
      oreTotali: oreOrd + oreStr,
      giorniLavorati: giorni,
      personeUniche: persone,
      mediaOreGiorno: giorni > 0 ? ((oreOrd + oreStr) / giorni).toFixed(1) : 0
    })

    const byDay = presenze.reduce((acc, p) => {
      if (!acc[p.data]) acc[p.data] = { data: p.data, ore: 0 }
      acc[p.data].ore += parseFloat(p.ore_ordinarie || 0) + parseFloat(p.ore_straordinarie || 0)
      return acc
    }, {})
    setPresenzeData(Object.values(byDay).sort((a, b) => a.data.localeCompare(b.data)))

    const byWorker = presenze.reduce((acc, p) => {
      if (!acc[p.persona_id]) acc[p.persona_id] = { persona: p.persona, ore: 0, giorni: 0 }
      acc[p.persona_id].ore += parseFloat(p.ore_ordinarie || 0) + parseFloat(p.ore_straordinarie || 0)
      acc[p.persona_id].giorni += 1
      return acc
    }, {})
    setTopWorkers(Object.values(byWorker).sort((a, b) => b.ore - a.ore).slice(0, 10))

    setLoading(false)
  }

  const BarChart = ({ data }) => {
    if (!data?.length) return null
    const max = Math.max(...data.map(d => d.ore))
    return (
      <div className="flex items-end gap-1 h-40">
        {data.slice(-14).map((d, i) => (
          <div key={i} className="flex-1 flex flex-col items-center">
            <div className="w-full bg-blue-500 rounded-t hover:bg-blue-600" style={{ height: `${(d.ore / max) * 100}%`, minHeight: d.ore > 0 ? '4px' : '0' }} title={`${d.data}: ${d.ore.toFixed(1)}h`} />
            <span className="text-xs text-gray-400 mt-1">{new Date(d.data).getDate()}</span>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="p-4 lg:p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">📊 Statistiche</h1>
        <p className="text-gray-500">{progetto?.nome}</p>
      </div>

      <div className="flex gap-2 mb-6">
        {[{ value: 'week', label: 'Settimana' }, { value: 'month', label: 'Mese' }, { value: 'year', label: 'Anno' }].map(p => (
          <button key={p.value} onClick={() => setPeriod(p.value)} className={`px-4 py-2 rounded-xl font-medium ${period === p.value ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 border'}`}>
            {p.label}
          </button>
        ))}
      </div>

      {loading ? <div className="text-center py-8 text-gray-500">Caricamento...</div> : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-xl p-4 shadow-sm border">
              <p className="text-3xl font-bold">{stats?.oreTotali?.toFixed(0) || 0}</p>
              <p className="text-sm text-gray-500">Ore Totali</p>
            </div>
            <div className="bg-white rounded-xl p-4 shadow-sm border">
              <p className="text-3xl font-bold text-blue-600">{stats?.giorniLavorati || 0}</p>
              <p className="text-sm text-gray-500">Giorni Lavorati</p>
            </div>
            <div className="bg-white rounded-xl p-4 shadow-sm border">
              <p className="text-3xl font-bold text-green-600">{stats?.personeUniche || 0}</p>
              <p className="text-sm text-gray-500">Persone Attive</p>
            </div>
            <div className="bg-white rounded-xl p-4 shadow-sm border">
              <p className="text-3xl font-bold text-orange-600">{stats?.oreStraordinarie?.toFixed(0) || 0}</p>
              <p className="text-sm text-gray-500">Ore Straordinario</p>
            </div>
          </div>

          <div className="grid lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl p-4 shadow-sm border">
              <h3 className="font-semibold text-gray-700 mb-4">📈 Ore per Giorno</h3>
              {presenzeData.length > 0 ? <BarChart data={presenzeData} /> : <div className="h-40 flex items-center justify-center text-gray-400">Nessun dato</div>}
            </div>

            <div className="bg-white rounded-xl p-4 shadow-sm border">
              <h3 className="font-semibold text-gray-700 mb-4">🏆 Top Lavoratori</h3>
              {topWorkers.length > 0 ? (
                <div className="space-y-3">
                  {topWorkers.map((w, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${i === 0 ? 'bg-yellow-100 text-yellow-700' : i === 1 ? 'bg-gray-100 text-gray-700' : i === 2 ? 'bg-orange-100 text-orange-700' : 'bg-gray-50 text-gray-500'}`}>
                        {i + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{w.persona?.nome} {w.persona?.cognome}</p>
                        <p className="text-xs text-gray-500">{w.giorni} giorni</p>
                      </div>
                      <p className="font-semibold">{w.ore.toFixed(1)}h</p>
                    </div>
                  ))}
                </div>
              ) : <div className="text-center text-gray-400 py-8">Nessun dato</div>}
            </div>

            <div className="bg-white rounded-xl p-4 shadow-sm border">
              <h3 className="font-semibold text-gray-700 mb-4">⏱️ Distribuzione Ore</h3>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-1"><span className="text-gray-500">Ordinarie</span><span className="font-medium">{stats?.oreOrdinarie?.toFixed(1)}h</span></div>
                  <div className="h-4 bg-gray-100 rounded-full overflow-hidden"><div className="h-full bg-blue-500 rounded-full" style={{ width: `${stats?.oreTotali > 0 ? (stats.oreOrdinarie / stats.oreTotali) * 100 : 0}%` }} /></div>
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1"><span className="text-gray-500">Straordinario</span><span className="font-medium">{stats?.oreStraordinarie?.toFixed(1)}h</span></div>
                  <div className="h-4 bg-gray-100 rounded-full overflow-hidden"><div className="h-full bg-orange-500 rounded-full" style={{ width: `${stats?.oreTotali > 0 ? (stats.oreStraordinarie / stats.oreTotali) * 100 : 0}%` }} /></div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl p-4 shadow-sm border">
              <h3 className="font-semibold text-gray-700 mb-4">📤 Esporta</h3>
              <div className="space-y-3">
                <button className="w-full py-3 bg-green-50 text-green-700 rounded-xl font-medium hover:bg-green-100">📊 Excel (coming soon)</button>
                <button className="w-full py-3 bg-red-50 text-red-700 rounded-xl font-medium hover:bg-red-100">📄 PDF (coming soon)</button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
