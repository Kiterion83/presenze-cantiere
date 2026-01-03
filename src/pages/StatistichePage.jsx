import { useState, useEffect, useCallback, useMemo } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useI18n } from '../contexts/I18nContext'
import { supabase } from '../lib/supabase'
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts'

export default function StatistichePage() {
  const { progetto } = useAuth()
  const { t } = useI18n()
  
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState('month') // week, month, quarter, year
  const [activeSection, setActiveSection] = useState('overview')
  
  // Dati
  const [stats, setStats] = useState({
    presenze: { totali: 0, oggi: 0, settimana: 0 },
    ore: { totali: 0, budget: 0, percentuale: 0 },
    materiali: { totali: 0, completati: 0, inCorso: 0, percentuale: 0 },
    produttivita: { attuale: 0, target: 100, trend: 0 }
  })
  const [trendData, setTrendData] = useState([])
  const [disciplineData, setDisciplineData] = useState([])
  const [previsioni, setPrevisioni] = useState({})
  const [oreGiornaliere, setOreGiornaliere] = useState([])
  const [materialiPerStato, setMaterialiPerStato] = useState([])

  // Colori grafici
  const COLORS = ['#3B82F6', '#22C55E', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16']

  // Carica tutti i dati
  const loadData = useCallback(async () => {
    if (!progetto?.id) return
    setLoading(true)

    try {
      const oggi = new Date()
      const inizioSettimana = new Date(oggi)
      inizioSettimana.setDate(oggi.getDate() - oggi.getDay() + 1)
      
      const inizioMese = new Date(oggi.getFullYear(), oggi.getMonth(), 1)
      
      // 1. PRESENZE
      const { count: presenzeOggi } = await supabase
        .from('presenze')
        .select('*', { count: 'exact', head: true })
        .eq('progetto_id', progetto.id)
        .gte('data', oggi.toISOString().split('T')[0])

      const { count: presenzeSettimana } = await supabase
        .from('presenze')
        .select('*', { count: 'exact', head: true })
        .eq('progetto_id', progetto.id)
        .gte('data', inizioSettimana.toISOString().split('T')[0])

      const { count: presenzeTotali } = await supabase
        .from('presenze')
        .select('*', { count: 'exact', head: true })
        .eq('progetto_id', progetto.id)

      // 2. ORE LAVORATE
      const { data: oreData } = await supabase
        .from('ore_componenti')
        .select('ore, data_lavoro')
        .eq('progetto_id', progetto.id)

      const oreTotali = oreData?.reduce((sum, r) => sum + (r.ore || 0), 0) || 0

      // 3. MATERIALI/COMPONENTI
      const { data: materialiData } = await supabase
        .from('componenti')
        .select('stato, disciplina_id, discipline(nome, colore)')
        .eq('progetto_id', progetto.id)

      const materialiTotali = materialiData?.length || 0
      const materialiCompletati = materialiData?.filter(m => m.stato === 'completato').length || 0
      const materialiInCorso = materialiData?.filter(m => ['in_warehouse', 'at_site', 'in_progress'].includes(m.stato)).length || 0

      // 4. ORE BUDGET da componenti
      const { data: budgetData } = await supabase
        .from('componenti')
        .select('ore_budget')
        .eq('progetto_id', progetto.id)

      const oreBudget = budgetData?.reduce((sum, c) => sum + (c.ore_budget || 0), 0) || 0

      // 5. TREND SETTIMANALE (ultime 12 settimane)
      const trendWeeks = []
      for (let i = 11; i >= 0; i--) {
        const weekStart = new Date(oggi)
        weekStart.setDate(oggi.getDate() - oggi.getDay() + 1 - (i * 7))
        const weekEnd = new Date(weekStart)
        weekEnd.setDate(weekStart.getDate() + 6)
        
        const weekOre = oreData?.filter(o => {
          const d = new Date(o.data_lavoro)
          return d >= weekStart && d <= weekEnd
        }).reduce((sum, o) => sum + (o.ore || 0), 0) || 0

        const weekNum = getWeekNumber(weekStart)
        trendWeeks.push({
          name: `CW${weekNum}`,
          ore: Math.round(weekOre),
          budget: Math.round(oreBudget / 52), // Budget settimanale stimato
        })
      }
      setTrendData(trendWeeks)

      // 6. ORE PER DISCIPLINA
      const { data: orePerDisciplina } = await supabase
        .from('ore_componenti')
        .select(`
          ore,
          componenti!inner(disciplina_id, discipline(nome, colore))
        `)
        .eq('progetto_id', progetto.id)

      const disciplineMap = {}
      orePerDisciplina?.forEach(o => {
        const disc = o.componenti?.discipline?.nome || 'N/D'
        const color = o.componenti?.discipline?.colore || '#6B7280'
        if (!disciplineMap[disc]) {
          disciplineMap[disc] = { name: disc, ore: 0, color }
        }
        disciplineMap[disc].ore += o.ore || 0
      })
      setDisciplineData(Object.values(disciplineMap))

      // 7. MATERIALI PER STATO (Pie chart)
      const statiCount = {}
      materialiData?.forEach(m => {
        const stato = m.stato || 'da_ordinare'
        statiCount[stato] = (statiCount[stato] || 0) + 1
      })
      setMaterialiPerStato(Object.entries(statiCount).map(([name, value], i) => ({
        name: formatStato(name),
        value,
        color: COLORS[i % COLORS.length]
      })))

      // 8. ORE GIORNALIERE (ultimi 30 giorni)
      const oreGiorn = []
      for (let i = 29; i >= 0; i--) {
        const day = new Date(oggi)
        day.setDate(oggi.getDate() - i)
        const dayStr = day.toISOString().split('T')[0]
        
        const dayOre = oreData?.filter(o => o.data_lavoro === dayStr)
          .reduce((sum, o) => sum + (o.ore || 0), 0) || 0
        
        oreGiorn.push({
          date: day.toLocaleDateString('it-IT', { day: '2-digit', month: 'short' }),
          ore: Math.round(dayOre),
        })
      }
      setOreGiornaliere(oreGiorn)

      // 9. CALCOLA PREVISIONI
      const produttivitaMedia = oreTotali > 0 && materialiCompletati > 0 
        ? oreTotali / materialiCompletati 
        : 10 // default

      const materialiRimanenti = materialiTotali - materialiCompletati
      const oreStimate = materialiRimanenti * produttivitaMedia
      
      // Velocità media (materiali/settimana)
      const settimanePassate = Math.max(1, Math.ceil((oggi - new Date(progetto.data_inizio || oggi)) / (7 * 24 * 60 * 60 * 1000)))
      const velocitaMedia = materialiCompletati / settimanePassate
      const settimaneRimanenti = velocitaMedia > 0 ? Math.ceil(materialiRimanenti / velocitaMedia) : 0
      
      const dataFineStimata = new Date(oggi)
      dataFineStimata.setDate(oggi.getDate() + (settimaneRimanenti * 7))

      setPrevisioni({
        oreRimanenti: Math.round(oreStimate),
        settimaneRimanenti,
        dataFineStimata: dataFineStimata.toLocaleDateString('it-IT'),
        velocitaMedia: velocitaMedia.toFixed(1),
        produttivitaMedia: produttivitaMedia.toFixed(1)
      })

      // SET STATS
      setStats({
        presenze: {
          totali: presenzeTotali || 0,
          oggi: presenzeOggi || 0,
          settimana: presenzeSettimana || 0
        },
        ore: {
          totali: Math.round(oreTotali),
          budget: Math.round(oreBudget),
          percentuale: oreBudget > 0 ? Math.round((oreTotali / oreBudget) * 100) : 0
        },
        materiali: {
          totali: materialiTotali,
          completati: materialiCompletati,
          inCorso: materialiInCorso,
          percentuale: materialiTotali > 0 ? Math.round((materialiCompletati / materialiTotali) * 100) : 0
        },
        produttivita: {
          attuale: oreBudget > 0 ? Math.round((oreTotali / oreBudget) * 100) : 0,
          target: 100,
          trend: trendWeeks.length >= 2 
            ? Math.round(((trendWeeks[trendWeeks.length-1].ore - trendWeeks[trendWeeks.length-2].ore) / Math.max(1, trendWeeks[trendWeeks.length-2].ore)) * 100)
            : 0
        }
      })

    } catch (error) {
      console.error('Errore caricamento statistiche:', error)
    } finally {
      setLoading(false)
    }
  }, [progetto?.id])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Helper functions
  function getWeekNumber(d) {
    const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()))
    const dayNum = date.getUTCDay() || 7
    date.setUTCDate(date.getUTCDate() + 4 - dayNum)
    const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1))
    return Math.ceil((((date - yearStart) / 86400000) + 1) / 7)
  }

  function formatStato(stato) {
    const map = {
      'da_ordinare': 'Da Ordinare',
      'ordinato': 'Ordinato',
      'in_warehouse': 'In Warehouse',
      'at_site': 'Al Site',
      'in_progress': 'In Lavorazione',
      'completato': 'Completato'
    }
    return map[stato] || stato
  }

  // Sections menu
  const sections = [
    { id: 'overview', label: 'Overview', emoji: '📊' },
    { id: 'ore', label: 'Ore Lavoro', emoji: '⏱️' },
    { id: 'materiali', label: 'Materiali', emoji: '📦' },
    { id: 'previsioni', label: 'Previsioni', emoji: '🔮' },
  ]

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="p-4 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            📊 {t('statisticsTitle')}
          </h1>
          <p className="text-gray-500">{progetto?.nome}</p>
        </div>

        {/* Period Selector */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">Periodo:</span>
          <div className="flex bg-gray-100 rounded-lg p-1">
            {['week', 'month', 'quarter', 'year'].map(p => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  period === p ? 'bg-white shadow text-blue-600' : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                {p === 'week' ? 'Settimana' : p === 'month' ? 'Mese' : p === 'quarter' ? 'Trimestre' : 'Anno'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Sub Navigation */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {sections.map(s => (
          <button
            key={s.id}
            onClick={() => setActiveSection(s.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl whitespace-nowrap transition-all ${
              activeSection === s.id
                ? 'bg-blue-600 text-white shadow-lg'
                : 'bg-white text-gray-600 hover:bg-gray-50 border'
            }`}
          >
            <span>{s.emoji}</span>
            <span className="font-medium">{s.label}</span>
          </button>
        ))}
      </div>

      {/* OVERVIEW SECTION */}
      {activeSection === 'overview' && (
        <div className="space-y-6">
          {/* KPI Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <KPICard
              title="Presenze Oggi"
              value={stats.presenze.oggi}
              subtitle={`${stats.presenze.settimana} questa settimana`}
              icon="👥"
              color="blue"
            />
            <KPICard
              title="Ore Lavorate"
              value={stats.ore.totali.toLocaleString()}
              subtitle={`${stats.ore.percentuale}% del budget`}
              icon="⏱️"
              color="green"
              progress={stats.ore.percentuale}
            />
            <KPICard
              title="Materiali Completati"
              value={`${stats.materiali.completati}/${stats.materiali.totali}`}
              subtitle={`${stats.materiali.percentuale}% completato`}
              icon="📦"
              color="amber"
              progress={stats.materiali.percentuale}
            />
            <KPICard
              title="Produttività"
              value={`${stats.produttivita.attuale}%`}
              subtitle={stats.produttivita.trend >= 0 ? `↑ ${stats.produttivita.trend}%` : `↓ ${Math.abs(stats.produttivita.trend)}%`}
              icon="📈"
              color={stats.produttivita.trend >= 0 ? 'green' : 'red'}
              trend={stats.produttivita.trend}
            />
          </div>

          {/* Charts Row */}
          <div className="grid lg:grid-cols-2 gap-6">
            {/* Trend Ore */}
            <div className="bg-white rounded-2xl shadow-sm border p-6">
              <h3 className="font-semibold text-gray-800 mb-4">📈 Trend Ore Lavorate</h3>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={trendData}>
                  <defs>
                    <linearGradient id="colorOre" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Legend />
                  <Area type="monotone" dataKey="ore" stroke="#3B82F6" fill="url(#colorOre)" name="Ore Effettive" />
                  <Line type="monotone" dataKey="budget" stroke="#EF4444" strokeDasharray="5 5" name="Budget" />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Materiali per Stato */}
            <div className="bg-white rounded-2xl shadow-sm border p-6">
              <h3 className="font-semibold text-gray-800 mb-4">📦 Materiali per Stato</h3>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={materialiPerStato}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {materialiPerStato.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Discipline Breakdown */}
          <div className="bg-white rounded-2xl shadow-sm border p-6">
            <h3 className="font-semibold text-gray-800 mb-4">🔧 Ore per Disciplina</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={disciplineData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis type="number" tick={{ fontSize: 12 }} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 12 }} width={100} />
                <Tooltip />
                <Bar dataKey="ore" name="Ore">
                  {disciplineData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color || COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* ORE SECTION */}
      {activeSection === 'ore' && (
        <div className="space-y-6">
          {/* KPIs Ore */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <KPICard title="Ore Totali" value={stats.ore.totali.toLocaleString()} icon="⏱️" color="blue" />
            <KPICard title="Ore Budget" value={stats.ore.budget.toLocaleString()} icon="🎯" color="gray" />
            <KPICard title="Ore Rimanenti" value={(stats.ore.budget - stats.ore.totali).toLocaleString()} icon="⏳" color="amber" />
            <KPICard 
              title="% Completamento" 
              value={`${stats.ore.percentuale}%`} 
              icon="📊" 
              color={stats.ore.percentuale > 100 ? 'red' : 'green'}
              progress={Math.min(stats.ore.percentuale, 100)}
            />
          </div>

          {/* Grafico Ore Giornaliere */}
          <div className="bg-white rounded-2xl shadow-sm border p-6">
            <h3 className="font-semibold text-gray-800 mb-4">📅 Ore Giornaliere (ultimi 30 giorni)</h3>
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={oreGiornaliere}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} angle={-45} textAnchor="end" height={60} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="ore" fill="#3B82F6" radius={[4, 4, 0, 0]} name="Ore" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Confronto Budget vs Actual */}
          <div className="bg-white rounded-2xl shadow-sm border p-6">
            <h3 className="font-semibold text-gray-800 mb-4">📊 Budget vs Actual per Settimana</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Legend />
                <Bar dataKey="ore" fill="#3B82F6" name="Ore Effettive" radius={[4, 4, 0, 0]} />
                <Bar dataKey="budget" fill="#E5E7EB" name="Budget" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* MATERIALI SECTION */}
      {activeSection === 'materiali' && (
        <div className="space-y-6">
          {/* KPIs Materiali */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <KPICard title="Totale Materiali" value={stats.materiali.totali} icon="📦" color="blue" />
            <KPICard title="Completati" value={stats.materiali.completati} icon="✅" color="green" />
            <KPICard title="In Lavorazione" value={stats.materiali.inCorso} icon="🔧" color="amber" />
            <KPICard 
              title="% Completamento" 
              value={`${stats.materiali.percentuale}%`} 
              icon="📈" 
              color="blue"
              progress={stats.materiali.percentuale}
            />
          </div>

          {/* Distribuzione Materiali */}
          <div className="grid lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-2xl shadow-sm border p-6">
              <h3 className="font-semibold text-gray-800 mb-4">🥧 Distribuzione per Stato</h3>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={materialiPerStato}
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    dataKey="value"
                    label={({ name, value }) => `${name}: ${value}`}
                  >
                    {materialiPerStato.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border p-6">
              <h3 className="font-semibold text-gray-800 mb-4">📊 Per Disciplina</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={disciplineData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Bar dataKey="ore" name="Ore Lavorate">
                    {disciplineData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color || COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Progress Bar per Stato */}
          <div className="bg-white rounded-2xl shadow-sm border p-6">
            <h3 className="font-semibold text-gray-800 mb-4">📈 Avanzamento Dettagliato</h3>
            <div className="space-y-4">
              {materialiPerStato.map((stato, i) => (
                <div key={i}>
                  <div className="flex justify-between mb-1">
                    <span className="text-sm font-medium text-gray-700">{stato.name}</span>
                    <span className="text-sm text-gray-500">{stato.value} ({stats.materiali.totali > 0 ? Math.round((stato.value / stats.materiali.totali) * 100) : 0}%)</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div
                      className="h-3 rounded-full transition-all duration-500"
                      style={{ 
                        width: `${stats.materiali.totali > 0 ? (stato.value / stats.materiali.totali) * 100 : 0}%`,
                        backgroundColor: stato.color 
                      }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* PREVISIONI SECTION */}
      {activeSection === 'previsioni' && (
        <div className="space-y-6">
          {/* Alert Previsione */}
          <div className={`rounded-2xl p-6 ${
            stats.ore.percentuale > 100 
              ? 'bg-red-50 border-2 border-red-200' 
              : 'bg-green-50 border-2 border-green-200'
          }`}>
            <div className="flex items-start gap-4">
              <span className="text-4xl">{stats.ore.percentuale > 100 ? '⚠️' : '✅'}</span>
              <div>
                <h3 className={`font-bold text-lg ${stats.ore.percentuale > 100 ? 'text-red-700' : 'text-green-700'}`}>
                  {stats.ore.percentuale > 100 
                    ? 'Attenzione: Budget Ore Superato!' 
                    : 'Progetto in linea con le previsioni'}
                </h3>
                <p className={`mt-1 ${stats.ore.percentuale > 100 ? 'text-red-600' : 'text-green-600'}`}>
                  {stats.ore.percentuale > 100 
                    ? `Hai utilizzato ${stats.ore.percentuale}% del budget ore. Considera una revisione della pianificazione.`
                    : `Hai utilizzato ${stats.ore.percentuale}% del budget ore. Procedi così!`}
                </p>
              </div>
            </div>
          </div>

          {/* KPIs Previsioni */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <KPICard 
              title="Ore Stimate Rimanenti" 
              value={previsioni.oreRimanenti?.toLocaleString() || '0'} 
              icon="⏳" 
              color="blue" 
            />
            <KPICard 
              title="Settimane Rimanenti" 
              value={previsioni.settimaneRimanenti || '0'} 
              icon="📅" 
              color="amber" 
            />
            <KPICard 
              title="Data Fine Stimata" 
              value={previsioni.dataFineStimata || '-'} 
              icon="🏁" 
              color="green" 
            />
            <KPICard 
              title="Velocità Media" 
              value={`${previsioni.velocitaMedia || 0} mat/sett`} 
              icon="🚀" 
              color="purple" 
            />
          </div>

          {/* Grafico Previsione */}
          <div className="bg-white rounded-2xl shadow-sm border p-6">
            <h3 className="font-semibold text-gray-800 mb-4">🔮 Proiezione Completamento</h3>
            <div className="relative pt-4">
              {/* Timeline */}
              <div className="h-4 bg-gray-200 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-green-500 to-blue-500 transition-all duration-1000"
                  style={{ width: `${stats.materiali.percentuale}%` }}
                ></div>
              </div>
              <div className="flex justify-between mt-2 text-sm text-gray-500">
                <span>Inizio</span>
                <span className="font-medium text-blue-600">{stats.materiali.percentuale}% completato</span>
                <span>Fine: {previsioni.dataFineStimata}</span>
              </div>
            </div>
          </div>

          {/* Dettagli Previsione */}
          <div className="grid lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-2xl shadow-sm border p-6">
              <h3 className="font-semibold text-gray-800 mb-4">📊 Metriche Chiave</h3>
              <div className="space-y-4">
                <MetricRow label="Produttività Media" value={`${previsioni.produttivitaMedia} ore/materiale`} />
                <MetricRow label="Velocità Completamento" value={`${previsioni.velocitaMedia} materiali/settimana`} />
                <MetricRow label="Materiali Rimanenti" value={stats.materiali.totali - stats.materiali.completati} />
                <MetricRow label="Ore Budget Rimanenti" value={(stats.ore.budget - stats.ore.totali).toLocaleString()} />
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border p-6">
              <h3 className="font-semibold text-gray-800 mb-4">💡 Suggerimenti</h3>
              <div className="space-y-3">
                {stats.ore.percentuale > 90 && (
                  <SuggestionCard 
                    type="warning" 
                    text="Il budget ore è quasi esaurito. Considera una revisione." 
                  />
                )}
                {stats.materiali.percentuale < 50 && stats.ore.percentuale > 60 && (
                  <SuggestionCard 
                    type="alert" 
                    text="Le ore consumate sono alte rispetto all'avanzamento materiali." 
                  />
                )}
                {stats.produttivita.trend < 0 && (
                  <SuggestionCard 
                    type="info" 
                    text="La produttività è in calo. Verifica eventuali blocchi." 
                  />
                )}
                {stats.produttivita.trend >= 0 && stats.ore.percentuale < 80 && (
                  <SuggestionCard 
                    type="success" 
                    text="Ottimo lavoro! Il progetto procede bene." 
                  />
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// COMPONENTI HELPER
// ═══════════════════════════════════════════════════════════════════════════

function KPICard({ title, value, subtitle, icon, color, progress, trend }) {
  const colorClasses = {
    blue: 'bg-blue-50 border-blue-200 text-blue-700',
    green: 'bg-green-50 border-green-200 text-green-700',
    amber: 'bg-amber-50 border-amber-200 text-amber-700',
    red: 'bg-red-50 border-red-200 text-red-700',
    purple: 'bg-purple-50 border-purple-200 text-purple-700',
    gray: 'bg-gray-50 border-gray-200 text-gray-700',
  }

  const progressColors = {
    blue: 'bg-blue-500',
    green: 'bg-green-500',
    amber: 'bg-amber-500',
    red: 'bg-red-500',
    purple: 'bg-purple-500',
    gray: 'bg-gray-500',
  }

  return (
    <div className={`rounded-2xl border-2 p-4 ${colorClasses[color] || colorClasses.blue}`}>
      <div className="flex items-start justify-between">
        <span className="text-2xl">{icon}</span>
        {trend !== undefined && (
          <span className={`text-xs font-medium px-2 py-1 rounded-full ${
            trend >= 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
          }`}>
            {trend >= 0 ? '↑' : '↓'} {Math.abs(trend)}%
          </span>
        )}
      </div>
      <p className="text-2xl font-bold mt-2">{value}</p>
      <p className="text-sm font-medium mt-1">{title}</p>
      {subtitle && <p className="text-xs opacity-70 mt-1">{subtitle}</p>}
      {progress !== undefined && (
        <div className="mt-3 h-2 bg-white/50 rounded-full overflow-hidden">
          <div 
            className={`h-full ${progressColors[color] || progressColors.blue} transition-all duration-500`}
            style={{ width: `${Math.min(progress, 100)}%` }}
          ></div>
        </div>
      )}
    </div>
  )
}

function MetricRow({ label, value }) {
  return (
    <div className="flex justify-between items-center py-2 border-b border-gray-100 last:border-0">
      <span className="text-gray-600">{label}</span>
      <span className="font-semibold text-gray-800">{value}</span>
    </div>
  )
}

function SuggestionCard({ type, text }) {
  const styles = {
    success: 'bg-green-50 border-green-200 text-green-700',
    warning: 'bg-amber-50 border-amber-200 text-amber-700',
    alert: 'bg-red-50 border-red-200 text-red-700',
    info: 'bg-blue-50 border-blue-200 text-blue-700',
  }
  const icons = {
    success: '✅',
    warning: '⚠️',
    alert: '🚨',
    info: '💡',
  }

  return (
    <div className={`p-3 rounded-xl border ${styles[type]}`}>
      <span className="mr-2">{icons[type]}</span>
      {text}
    </div>
  )
}
