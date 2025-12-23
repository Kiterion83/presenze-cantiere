/**
 * Pagina StatistichePage
 * Dashboard con grafici budget vs speso e trend
 */

import { useState, useEffect } from 'react'
import { BarChart3, TrendingUp, PieChart, AlertTriangle, CheckCircle } from 'lucide-react'
import { SimpleCard, StatCard } from '../components/ui/Card'
import Badge from '../components/ui/Badge'
import BudgetChart, { BudgetIndicatore } from '../components/charts/BudgetChart'
import TrendChart from '../components/charts/TrendChart'
import { CENTRI_COSTO, BUDGET_TOTALE, SOGLIE_BUDGET, COLORI_GRAFICO } from '../lib/constants'
import { percentuale } from '../lib/utils'
import { getOrePerCentroCosto, getTrendSettimanale } from '../lib/supabase'
import {
  PieChart as RePieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from 'recharts'

export default function StatistichePage({ utente }) {
  const [oreSpese, setOreSpese] = useState([])
  const [trend, setTrend] = useState([])
  const [loading, setLoading] = useState(true)

  // Carica dati
  useEffect(() => {
    loadDati()
  }, [])

  const loadDati = async () => {
    setLoading(true)
    
    const [oreResult, trendResult] = await Promise.all([
      getOrePerCentroCosto(),
      getTrendSettimanale(),
    ])
    
    setOreSpese(oreResult.data || [])
    setTrend(trendResult.data || [])
    setLoading(false)
  }

  // Calcola statistiche
  const calcolaStats = () => {
    const totaleSpeso = oreSpese.reduce((sum, o) => sum + o.ore_spese, 0)
    const perc = percentuale(totaleSpeso, BUDGET_TOTALE)
    
    // Conta fasi per stato
    let fasiOk = 0
    let fasiAttenzione = 0
    let fasiOver = 0
    
    CENTRI_COSTO.forEach(cc => {
      const speso = oreSpese.find(o => o.codice === cc.codice)?.ore_spese || 0
      const p = percentuale(speso, cc.budgetOre)
      
      if (p >= 100) fasiOver++
      else if (p >= SOGLIE_BUDGET.OK) fasiAttenzione++
      else fasiOk++
    })
    
    return { totaleSpeso, percentuale: perc, fasiOk, fasiAttenzione, fasiOver }
  }

  const stats = calcolaStats()

  // Dati per grafico torta
  const dataTorta = CENTRI_COSTO.map((cc, i) => ({
    name: cc.codice,
    fase: cc.fase,
    value: oreSpese.find(o => o.codice === cc.codice)?.ore_spese || 0,
  })).filter(d => d.value > 0)

  // Colori torta
  const COLORI_TORTA = [
    '#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6',
    '#06b6d4', '#ec4899', '#14b8a6', '#f97316', '#6366f1',
    '#84cc16', '#a855f7',
  ]

  // Tabella dettagliata
  const datiTabella = CENTRI_COSTO.map(cc => {
    const speso = oreSpese.find(o => o.codice === cc.codice)?.ore_spese || 0
    const perc = percentuale(speso, cc.budgetOre)
    const stato = perc >= 100 ? 'over' : perc >= SOGLIE_BUDGET.OK ? 'attenzione' : 'ok'
    
    return {
      ...cc,
      speso,
      percentuale: perc,
      stato,
      rimanente: Math.max(0, cc.budgetOre - speso),
    }
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-500">Caricamento statistiche...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900">Dashboard Statistiche</h2>
        <button
          onClick={loadDati}
          className="text-sm text-blue-600 hover:text-blue-700"
        >
          ↻ Aggiorna dati
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          title="Budget Totale"
          value={`${BUDGET_TOTALE}h`}
          icon={<BarChart3 size={24} />}
        />
        <StatCard
          title="Ore Spese"
          value={`${stats.totaleSpeso}h`}
          subtitle={`${stats.percentuale}% del budget`}
          icon={<TrendingUp size={24} />}
        />
        <StatCard
          title="Ore Rimanenti"
          value={`${BUDGET_TOTALE - stats.totaleSpeso}h`}
          icon={<BarChart3 size={24} />}
        />
        <StatCard
          title="Fasi Over Budget"
          value={stats.fasiOver}
          subtitle={stats.fasiOver > 0 ? 'Attenzione!' : 'Tutto OK'}
          icon={stats.fasiOver > 0 ? <AlertTriangle size={24} /> : <CheckCircle size={24} />}
        />
      </div>

      {/* Barra avanzamento totale */}
      <SimpleCard>
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <h3 className="font-semibold text-gray-900">Avanzamento Budget Totale</h3>
            <span className={`text-lg font-bold ${
              stats.percentuale >= 100 ? 'text-red-600' :
              stats.percentuale >= SOGLIE_BUDGET.OK ? 'text-amber-600' : 'text-green-600'
            }`}>
              {stats.percentuale}%
            </span>
          </div>
          <div className="h-4 bg-gray-200 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-500 ${
                stats.percentuale >= 100 ? 'bg-red-500' :
                stats.percentuale >= SOGLIE_BUDGET.OK ? 'bg-amber-500' : 'bg-green-500'
              }`}
              style={{ width: `${Math.min(100, stats.percentuale)}%` }}
            />
          </div>
          <div className="flex justify-between text-sm text-gray-500">
            <span>{stats.totaleSpeso}h spese</span>
            <span>{BUDGET_TOTALE - stats.totaleSpeso}h rimanenti</span>
          </div>
        </div>
      </SimpleCard>

      {/* Grafici */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Budget vs Speso */}
        <SimpleCard>
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <BarChart3 size={20} />
            Budget vs Speso per Fase
          </h3>
          <BudgetChart oreSpese={oreSpese} />
        </SimpleCard>

        {/* Torta distribuzione */}
        <SimpleCard>
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <PieChart size={20} />
            Distribuzione Ore per Fase
          </h3>
          <div className="h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <RePieChart>
                <Pie
                  data={dataTorta}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={120}
                  label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                >
                  {dataTorta.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORI_TORTA[index % COLORI_TORTA.length]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value, name, props) => [`${value}h`, props.payload.fase]}
                />
              </RePieChart>
            </ResponsiveContainer>
          </div>
        </SimpleCard>
      </div>

      {/* Trend settimanale */}
      <SimpleCard>
        <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <TrendingUp size={20} />
          Trend Ore Settimanali
        </h3>
        <TrendChart dati={trend} budgetGiornaliero={48} />
      </SimpleCard>

      {/* Tabella dettagliata */}
      <SimpleCard>
        <h3 className="font-semibold text-gray-900 mb-4">Dettaglio per Centro di Costo</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="px-4 py-3 text-left font-semibold">Codice</th>
                <th className="px-4 py-3 text-left font-semibold">Fase</th>
                <th className="px-4 py-3 text-right font-semibold">Budget</th>
                <th className="px-4 py-3 text-right font-semibold">Speso</th>
                <th className="px-4 py-3 text-right font-semibold">Rimanente</th>
                <th className="px-4 py-3 text-center font-semibold">Avanzamento</th>
                <th className="px-4 py-3 text-center font-semibold">Stato</th>
              </tr>
            </thead>
            <tbody>
              {datiTabella.map(row => (
                <tr key={row.codice} className="border-b hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono text-gray-600">{row.codice}</td>
                  <td className="px-4 py-3">{row.fase}</td>
                  <td className="px-4 py-3 text-right">{row.budgetOre}h</td>
                  <td className="px-4 py-3 text-right font-medium">{row.speso}h</td>
                  <td className="px-4 py-3 text-right text-gray-500">{row.rimanente}h</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className={`h-full ${
                            row.stato === 'over' ? 'bg-red-500' :
                            row.stato === 'attenzione' ? 'bg-amber-500' : 'bg-green-500'
                          }`}
                          style={{ width: `${Math.min(100, row.percentuale)}%` }}
                        />
                      </div>
                      <span className="text-xs w-10 text-right">{row.percentuale}%</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <Badge
                      variant={row.stato === 'over' ? 'danger' : row.stato === 'attenzione' ? 'warning' : 'success'}
                      size="sm"
                    >
                      {row.stato === 'over' ? 'OVER' : row.stato === 'attenzione' ? 'ATT' : 'OK'}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-gray-100 font-semibold">
                <td className="px-4 py-3" colSpan={2}>TOTALE</td>
                <td className="px-4 py-3 text-right">{BUDGET_TOTALE}h</td>
                <td className="px-4 py-3 text-right">{stats.totaleSpeso}h</td>
                <td className="px-4 py-3 text-right">{BUDGET_TOTALE - stats.totaleSpeso}h</td>
                <td className="px-4 py-3 text-center">{stats.percentuale}%</td>
                <td className="px-4 py-3" />
              </tr>
            </tfoot>
          </table>
        </div>
      </SimpleCard>

      {/* Indicatori rapidi */}
      <SimpleCard>
        <h3 className="font-semibold text-gray-900 mb-4">Indicatori Budget</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {datiTabella.slice(0, 6).map(row => (
            <BudgetIndicatore
              key={row.codice}
              codice={row.codice}
              fase={row.fase}
              budget={row.budgetOre}
              speso={row.speso}
            />
          ))}
        </div>
      </SimpleCard>
    </div>
  )
}
