import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'

export default function StatistichePage() {
  const { assegnazione, progetto } = useAuth()
  
  const [period, setPeriod] = useState('month') // week, month, year
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState(null)
  const [presenzeData, setPresenzeData] = useState([])
  const [topWorkers, setTopWorkers] = useState([])

  useEffect(() => {
    if (assegnazione?.progetto_id) {
      loadStats()
    }
  }, [assegnazione?.progetto_id, period])

  const getDateRange = () => {
    const today = new Date()
    let startDate, endDate

    if (period === 'week') {
      const dayOfWeek = today.getDay()
      const diff = today.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1)
      startDate = new Date(today.setDate(diff))
      endDate = new Date()
    } else if (period === 'month') {
      startDate = new Date(today.getFullYear(), today.getMonth(), 1)
      endDate = new Date()
    } else {
      startDate = new Date(today.getFullYear(), 0, 1)
      endDate = new Date()
    }

    return {
      start: startDate.toISOString().split('T')[0],
      end: endDate.toISOString().split('T')[0]
    }
  }

  const loadStats = async () => {
    setLoading(true)
    const { start, end } = getDateRange()

    // Carica presenze del periodo
    const { data: presenze, error } = await supabase
      .from('presenze')
      .select(`
        *,
        persona:persone(nome, cognome)
      `)
      .eq('progetto_id', assegnazione.progetto_id)
      .gte('data', start)
      .lte('data', end)

    if (error) {
      console.error(error)
      setLoading(false)
      return
    }

    // Calcola statistiche
    const oreOrdinarie = presenze.reduce((sum, p) => sum + parseFloat(p.ore_ordinarie || 0), 0)
    const oreStraordinarie = presenze.reduce((sum, p) => sum + parseFloat(p.ore_straordinarie || 0), 0)
    const giorniLavorati = new Set(presenze.map(p => p.data)).size
    const personeUniche = new Set(presenze.map(p => p.persona_id)).size

    setStats({
      oreOrdinarie,
      oreStraordinarie,
      oreTotali: oreOrdinarie + oreStraordinarie,
      giorniLavorati,
      personeUniche,
      mediaOreGiorno: giorniLavorati > 0 ? ((oreOrdinarie + oreStraordinarie) / giorniLavorati).toFixed(1) : 0,
      mediaPersoneGiorno: giorniLavorati > 0 ? (presenze.length / giorniLavorati).toFixed(1) : 0
    })

    // Raggruppa per giorno per grafico
    const byDay = presenze.reduce((acc, p) => {
      if (!acc[p.data]) acc[p.data] = { data: p.data, ore: 0, persone: 0 }
      acc[p.data].ore += parseFloat(p.ore_ordinarie || 0) + parseFloat(p.ore_straordinarie || 0)
      acc[p.data].persone += 1
      return acc
    }, {})
    setPresenzeData(Object.values(byDay).sort((a, b) => a.data.localeCompare(b.data)))

    // Top workers
    const byWorker = presenze.reduce((acc, p) => {
      const key = p.persona_id
      if (!acc[key]) {
        acc[key] = {
          persona: p.persona,
          ore: 0,
          giorni: 0
        }
      }
      acc[key].ore += parseFloat(p.ore_ordinarie || 0) + parseFloat(p.ore_straordinarie || 0)
      acc[key].giorni += 1
      return acc
    }, {})
    setTopWorkers(
      Object.values(byWorker)
        .sort((a, b) => b.ore - a.ore)
        .slice(0, 10)
    )

    setLoading(false)
  }

  // Simple bar chart component
  const BarChart = ({ data, maxValue }) => {
    if (!data || data.length === 0) return null
    
    const max = maxValue || Math.max(...data.map(d => d.ore))
    
    return (
      <div className="flex items-end gap-1 h-40">
        {data.slice(-14).map((d, i) => (
          <div key={i} className="flex-1 flex flex-col items-center">
            <div 
              className="w-full bg-blue-500 rounded-t transition-all hover:bg-blue-600"
              style={{ height: `${(d.ore / max) * 100}%`, minHeight: d.ore > 0 ? '4px' : '0' }}
              title={`${d.data}: ${d.ore.toFixed(1)}h`}
            />
            <span className="text-xs text-gray-400 mt-1 rotate-45 origin-left">
              {new Date(d.data).getDate()}
            </span>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="p-4 lg:p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">📊 Statistiche</h1>
          <p className="text-gray-500">{progetto?.nome}</p>
        </div>
      </div>

      {/* Period Selector */}
      <div className="flex gap-2 mb-6">
        {[
          { value: 'week', label: 'Settimana' },
          { value: 'month', label: 'Mese' },
          { value: 'year', label: 'Anno' },
        ].map(p => (
          <button
            key={p.value}
            onClick={() => setPeriod(p.value)}
            className={`px-4 py-2 rounded-xl font-medium transition-colors ${
              period === p.value
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-8 text-gray-500">Caricamento...</div>
      ) : (
        <>
          {/* Stats Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
              <p className="text-3xl font-bold text-gray-800">
                {stats?.oreTotali?.toFixed(0) || 0}
              </p>
              <p className="text-sm text-gray-500">Ore Totali</p>
              <div className="mt-2 text-xs text-gray-400">
                {stats?.oreOrdinarie?.toFixed(0)}h ord. + {stats?.oreStraordinarie?.toFixed(0)}h str.
              </div>
            </div>
            <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
              <p className="text-3xl font-bold text-blue-600">{stats?.giorniLavorati || 0}</p>
              <p className="text-sm text-gray-500">Giorni Lavorati</p>
              <div className="mt-2 text-xs text-gray-400">
                Media {stats?.mediaOreGiorno}h/giorno
              </div>
            </div>
            <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
              <p className="text-3xl font-bold text-green-600">{stats?.personeUniche || 0}</p>
              <p className="text-sm text-gray-500">Persone Attive</p>
              <div className="mt-2 text-xs text-gray-400">
                Media {stats?.mediaPersoneGiorno}/giorno
              </div>
            </div>
            <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
              <p className="text-3xl font-bold text-orange-600">
                {stats?.oreStraordinarie?.toFixed(0) || 0}
              </p>
              <p className="text-sm text-gray-500">Ore Straordinario</p>
              <div className="mt-2 text-xs text-gray-400">
                {stats?.oreTotali > 0 ? ((stats?.oreStraordinarie / stats?.oreTotali) * 100).toFixed(1) : 0}% del totale
              </div>
            </div>
          </div>

          <div className="grid lg:grid-cols-2 gap-6">
            {/* Chart */}
            <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
              <h3 className="font-semibold text-gray-700 mb-4">📈 Ore per Giorno</h3>
              {presenzeData.length > 0 ? (
                <BarChart data={presenzeData} />
              ) : (
                <div className="h-40 flex items-center justify-center text-gray-400">
                  Nessun dato disponibile
                </div>
              )}
            </div>

            {/* Top Workers */}
            <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
              <h3 className="font-semibold text-gray-700 mb-4">🏆 Top Lavoratori</h3>
              {topWorkers.length > 0 ? (
                <div className="space-y-3">
                  {topWorkers.map((w, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                        i === 0 ? 'bg-yellow-100 text-yellow-700' :
                        i === 1 ? 'bg-gray-100 text-gray-700' :
                        i === 2 ? 'bg-orange-100 text-orange-700' :
                        'bg-gray-50 text-gray-500'
                      }`}>
                        {i + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-800 truncate">
                          {w.persona?.nome} {w.persona?.cognome}
                        </p>
                        <p className="text-xs text-gray-500">{w.giorni} giorni</p>
                      </div>
                      <p className="font-semibold text-gray-800">{w.ore.toFixed(1)}h</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center text-gray-400 py-8">
                  Nessun dato disponibile
                </div>
              )}
            </div>

            {/* Ore per Tipo */}
            <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
              <h3 className="font-semibold text-gray-700 mb-4">⏱️ Distribuzione Ore</h3>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-500">Ore Ordinarie</span>
                    <span className="font-medium">{stats?.oreOrdinarie?.toFixed(1)}h</span>
                  </div>
                  <div className="h-4 bg-gray-100 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-blue-500 rounded-full"
                      style={{ width: `${stats?.oreTotali > 0 ? (stats.oreOrdinarie / stats.oreTotali) * 100 : 0}%` }}
                    />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-500">Straordinario</span>
                    <span className="font-medium">{stats?.oreStraordinarie?.toFixed(1)}h</span>
                  </div>
                  <div className="h-4 bg-gray-100 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-orange-500 rounded-full"
                      style={{ width: `${stats?.oreTotali > 0 ? (stats.oreStraordinarie / stats.oreTotali) * 100 : 0}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Export */}
            <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
              <h3 className="font-semibold text-gray-700 mb-4">📤 Esporta Dati</h3>
              <div className="space-y-3">
                <button className="w-full py-3 bg-green-50 text-green-700 rounded-xl font-medium hover:bg-green-100 transition-colors flex items-center justify-center gap-2">
                  📊 Esporta Excel
                </button>
                <button className="w-full py-3 bg-red-50 text-red-700 rounded-xl font-medium hover:bg-red-100 transition-colors flex items-center justify-center gap-2">
                  📄 Esporta PDF
                </button>
              </div>
              <p className="text-xs text-gray-400 mt-3 text-center">
                Funzionalità in arrivo...
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
