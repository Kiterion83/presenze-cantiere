import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useI18n } from '../contexts/I18nContext'
import { supabase } from '../lib/supabase'

export default function AIInsightsPage() {
  const { progetto } = useAuth()
  const { t } = useI18n()
  
  const [loading, setLoading] = useState(true)
  const [analyzing, setAnalyzing] = useState(false)
  const [insights, setInsights] = useState([])
  const [metrics, setMetrics] = useState({})
  const [lastAnalysis, setLastAnalysis] = useState(null)

  // Carica dati e genera insights
  const analyzeProject = useCallback(async () => {
    if (!progetto?.id) return
    setAnalyzing(true)

    try {
      // Raccogli tutti i dati necessari
      const oggi = new Date()
      
      // 1. Ore lavorate
      const { data: oreData } = await supabase
        .from('ore_componenti')
        .select('ore, data_lavoro, componente_id')
        .eq('progetto_id', progetto.id)

      // 2. Materiali
      const { data: materialiData } = await supabase
        .from('componenti')
        .select('id, stato, ore_budget, disciplina_id, created_at, discipline(nome)')
        .eq('progetto_id', progetto.id)

      // 3. Presenze
      const { data: presenzeData } = await supabase
        .from('presenze')
        .select('data, persona_id, ore_ordinarie, ore_straordinario')
        .eq('progetto_id', progetto.id)
        .gte('data', new Date(oggi.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])

      // 4. Pianificazioni
      const { data: pianData } = await supabase
        .from('pianificazione_cw')
        .select('anno, settimana, azione, componente_id')
        .eq('progetto_id', progetto.id)

      // Calcola metriche
      const oreTotali = oreData?.reduce((sum, o) => sum + (o.ore || 0), 0) || 0
      const oreBudget = materialiData?.reduce((sum, m) => sum + (m.ore_budget || 0), 0) || 0
      const materialiTotali = materialiData?.length || 0
      const materialiCompletati = materialiData?.filter(m => m.stato === 'completato').length || 0
      const materialiInCorso = materialiData?.filter(m => ['in_warehouse', 'at_site', 'in_progress'].includes(m.stato)).length || 0

      // Calcola velocità (ultimi 30 giorni)
      const oreUltimi30gg = oreData?.filter(o => {
        const d = new Date(o.data_lavoro)
        return d >= new Date(oggi.getTime() - 30 * 24 * 60 * 60 * 1000)
      }).reduce((sum, o) => sum + (o.ore || 0), 0) || 0

      // Produttività media
      const produttivitaMedia = materialiCompletati > 0 ? oreTotali / materialiCompletati : 0

      // Ore medie giornaliere
      const giorniLavorati = new Set(presenzeData?.map(p => p.data)).size || 1
      const oreMediaGiornaliere = oreUltimi30gg / Math.min(giorniLavorati, 22)

      // Trend settimana corrente vs precedente
      const currentWeek = getWeekNumber(oggi)
      const oreSettimanaCorrente = oreData?.filter(o => {
        const d = new Date(o.data_lavoro)
        return getWeekNumber(d) === currentWeek && d.getFullYear() === oggi.getFullYear()
      }).reduce((sum, o) => sum + (o.ore || 0), 0) || 0

      const oreSettimanaPrecedente = oreData?.filter(o => {
        const d = new Date(o.data_lavoro)
        return getWeekNumber(d) === currentWeek - 1 && d.getFullYear() === oggi.getFullYear()
      }).reduce((sum, o) => sum + (o.ore || 0), 0) || 0

      const trendSettimana = oreSettimanaPrecedente > 0 
        ? ((oreSettimanaCorrente - oreSettimanaPrecedente) / oreSettimanaPrecedente * 100)
        : 0

      // Materiali per disciplina
      const materialiPerDisciplina = {}
      materialiData?.forEach(m => {
        const disc = m.discipline?.nome || 'N/D'
        if (!materialiPerDisciplina[disc]) {
          materialiPerDisciplina[disc] = { totali: 0, completati: 0 }
        }
        materialiPerDisciplina[disc].totali++
        if (m.stato === 'completato') materialiPerDisciplina[disc].completati++
      })

      // Salva metriche
      setMetrics({
        oreTotali: Math.round(oreTotali),
        oreBudget: Math.round(oreBudget),
        percentualeBudget: oreBudget > 0 ? Math.round((oreTotali / oreBudget) * 100) : 0,
        materialiTotali,
        materialiCompletati,
        materialiInCorso,
        percentualeCompletamento: materialiTotali > 0 ? Math.round((materialiCompletati / materialiTotali) * 100) : 0,
        produttivitaMedia: Math.round(produttivitaMedia * 10) / 10,
        oreMediaGiornaliere: Math.round(oreMediaGiornaliere * 10) / 10,
        trendSettimana: Math.round(trendSettimana),
        materialiPerDisciplina
      })

      // Genera insights AI
      const generatedInsights = generateInsights({
        oreTotali,
        oreBudget,
        materialiTotali,
        materialiCompletati,
        materialiInCorso,
        produttivitaMedia,
        oreMediaGiornaliere,
        trendSettimana,
        materialiPerDisciplina,
        presenzeCount: presenzeData?.length || 0,
        pianificazioniCount: pianData?.length || 0,
        progetto
      })

      setInsights(generatedInsights)
      setLastAnalysis(new Date())

    } catch (error) {
      console.error('Errore analisi:', error)
    } finally {
      setLoading(false)
      setAnalyzing(false)
    }
  }, [progetto?.id])

  useEffect(() => {
    analyzeProject()
  }, [analyzeProject])

  // Genera insights basati sui dati
  function generateInsights(data) {
    const insights = []

    // 1. BUDGET ORE
    if (data.oreBudget > 0) {
      const percentuale = (data.oreTotali / data.oreBudget) * 100
      
      if (percentuale > 100) {
        insights.push({
          id: 'budget_exceeded',
          type: 'critical',
          category: 'Budget',
          title: '🚨 Budget Ore Superato',
          description: `Hai superato il budget ore del ${Math.round(percentuale - 100)}%. Sono state lavorate ${data.oreTotali.toLocaleString()} ore su un budget di ${data.oreBudget.toLocaleString()}.`,
          recommendation: 'Considera una revisione urgente del budget o una rinegoziazione con il cliente. Analizza dove sono state spese le ore in eccesso.',
          impact: 'high',
          metric: `${Math.round(percentuale)}%`
        })
      } else if (percentuale > 85) {
        insights.push({
          id: 'budget_warning',
          type: 'warning',
          category: 'Budget',
          title: '⚠️ Budget Ore Quasi Esaurito',
          description: `Hai utilizzato ${Math.round(percentuale)}% del budget ore. Restano circa ${Math.round(data.oreBudget - data.oreTotali)} ore.`,
          recommendation: 'Monitora attentamente le ore rimanenti e prioritizza le attività critiche.',
          impact: 'medium',
          metric: `${Math.round(percentuale)}%`
        })
      } else if (percentuale < 30 && data.materialiCompletati / data.materialiTotali > 0.5) {
        insights.push({
          id: 'budget_efficient',
          type: 'success',
          category: 'Budget',
          title: '✅ Ottima Efficienza Budget',
          description: `Hai completato oltre il 50% dei materiali usando solo ${Math.round(percentuale)}% del budget ore.`,
          recommendation: 'Continua così! Considera di documentare le best practices per progetti futuri.',
          impact: 'positive',
          metric: `${Math.round(percentuale)}%`
        })
      }
    }

    // 2. PRODUTTIVITÀ
    if (data.produttivitaMedia > 0) {
      if (data.trendSettimana < -20) {
        insights.push({
          id: 'productivity_drop',
          type: 'warning',
          category: 'Produttività',
          title: '📉 Calo Produttività',
          description: `La produttività di questa settimana è calata del ${Math.abs(data.trendSettimana)}% rispetto alla settimana precedente.`,
          recommendation: 'Verifica se ci sono blocchi, attese materiali, o problemi nel team. Considera una riunione di allineamento.',
          impact: 'medium',
          metric: `${data.trendSettimana}%`
        })
      } else if (data.trendSettimana > 20) {
        insights.push({
          id: 'productivity_up',
          type: 'success',
          category: 'Produttività',
          title: '📈 Produttività in Crescita',
          description: `La produttività è aumentata del ${data.trendSettimana}% questa settimana!`,
          recommendation: 'Ottimo lavoro! Identifica cosa sta funzionando bene per replicarlo.',
          impact: 'positive',
          metric: `+${data.trendSettimana}%`
        })
      }
    }

    // 3. AVANZAMENTO MATERIALI
    const percentualeAvanzamento = data.materialiTotali > 0 
      ? (data.materialiCompletati / data.materialiTotali) * 100 
      : 0
    const percentualeBudgetUsato = data.oreBudget > 0 
      ? (data.oreTotali / data.oreBudget) * 100 
      : 0

    if (percentualeBudgetUsato > percentualeAvanzamento + 20) {
      insights.push({
        id: 'progress_mismatch',
        type: 'critical',
        category: 'Avanzamento',
        title: '🔴 Discrepanza Ore/Avanzamento',
        description: `Hai usato ${Math.round(percentualeBudgetUsato)}% del budget ore ma completato solo ${Math.round(percentualeAvanzamento)}% dei materiali.`,
        recommendation: 'C\'è una discrepanza significativa. Analizza le cause: rilavorazioni, complessità impreviste, o inefficienze?',
        impact: 'high',
        metric: `${Math.round(percentualeBudgetUsato - percentualeAvanzamento)}% gap`
      })
    }

    // 4. MATERIALI IN CORSO
    if (data.materialiInCorso > data.materialiCompletati && data.materialiInCorso > 10) {
      insights.push({
        id: 'wip_high',
        type: 'info',
        category: 'Work in Progress',
        title: '📦 Alto WIP',
        description: `Ci sono ${data.materialiInCorso} materiali in lavorazione contro ${data.materialiCompletati} completati.`,
        recommendation: 'Un WIP alto può indicare colli di bottiglia. Considera di focalizzarti sul completamento prima di iniziare nuovi materiali.',
        impact: 'medium',
        metric: `${data.materialiInCorso} WIP`
      })
    }

    // 5. DISCIPLINE
    Object.entries(data.materialiPerDisciplina).forEach(([disc, values]) => {
      const percentuale = values.totali > 0 ? (values.completati / values.totali) * 100 : 0
      
      if (percentuale < 30 && values.totali >= 10) {
        insights.push({
          id: `discipline_slow_${disc}`,
          type: 'info',
          category: 'Discipline',
          title: `🔧 ${disc}: Avanzamento Lento`,
          description: `La disciplina ${disc} ha completato solo ${Math.round(percentuale)}% dei materiali (${values.completati}/${values.totali}).`,
          recommendation: `Verifica se ci sono blocchi specifici per ${disc}. Potrebbe essere necessario allocare più risorse.`,
          impact: 'low',
          metric: `${Math.round(percentuale)}%`
        })
      } else if (percentuale > 80 && values.totali >= 5) {
        insights.push({
          id: `discipline_good_${disc}`,
          type: 'success',
          category: 'Discipline',
          title: `✅ ${disc}: Ottimo Avanzamento`,
          description: `La disciplina ${disc} ha completato ${Math.round(percentuale)}% dei materiali!`,
          recommendation: 'Considera di spostare risorse da questa disciplina ad altre più lente.',
          impact: 'positive',
          metric: `${Math.round(percentuale)}%`
        })
      }
    })

    // 6. PREVISIONE COMPLETAMENTO
    if (data.materialiCompletati > 0 && data.oreTotali > 0) {
      const velocitaMaterialiSett = data.materialiCompletati / Math.max(1, Math.ceil((new Date() - new Date(data.progetto?.data_inizio || new Date())) / (7 * 24 * 60 * 60 * 1000)))
      const materialiRimanenti = data.materialiTotali - data.materialiCompletati
      const settimaneStimate = velocitaMaterialiSett > 0 ? Math.ceil(materialiRimanenti / velocitaMaterialiSett) : 0
      
      if (settimaneStimate > 12) {
        insights.push({
          id: 'completion_late',
          type: 'warning',
          category: 'Previsione',
          title: '🗓️ Completamento Stimato Lontano',
          description: `A questo ritmo, servono ancora circa ${settimaneStimate} settimane per completare il progetto.`,
          recommendation: 'Considera di aumentare le risorse o rivedere lo scope per rispettare le scadenze.',
          impact: 'medium',
          metric: `${settimaneStimate} sett.`
        })
      }
    }

    // 7. PIANIFICAZIONE
    if (data.pianificazioniCount < data.materialiTotali * 0.3) {
      insights.push({
        id: 'planning_low',
        type: 'info',
        category: 'Pianificazione',
        title: '📅 Pianificazione Incompleta',
        description: `Solo ${Math.round((data.pianificazioniCount / data.materialiTotali) * 100)}% dei materiali sono stati pianificati nelle settimane.`,
        recommendation: 'Una pianificazione dettagliata aiuta a prevenire ritardi. Assegna i materiali alle settimane di lavoro.',
        impact: 'low',
        metric: `${data.pianificazioniCount} pianificati`
      })
    }

    // 8. PRESENZE
    if (data.oreMediaGiornaliere < 6) {
      insights.push({
        id: 'attendance_low',
        type: 'info',
        category: 'Presenze',
        title: '👥 Ore Medie Basse',
        description: `La media giornaliera è di ${data.oreMediaGiornaliere.toFixed(1)} ore negli ultimi 30 giorni.`,
        recommendation: 'Verifica le assenze, i permessi, o se ci sono problemi di staffing.',
        impact: 'low',
        metric: `${data.oreMediaGiornaliere.toFixed(1)} h/giorno`
      })
    }

    // Ordina per impatto
    const impactOrder = { high: 0, medium: 1, low: 2, positive: 3 }
    insights.sort((a, b) => (impactOrder[a.impact] || 99) - (impactOrder[b.impact] || 99))

    return insights
  }

  function getWeekNumber(d) {
    const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()))
    const dayNum = date.getUTCDay() || 7
    date.setUTCDate(date.getUTCDate() + 4 - dayNum)
    const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1))
    return Math.ceil((((date - yearStart) / 86400000) + 1) / 7)
  }

  // Stili per tipo insight
  const insightStyles = {
    critical: {
      bg: 'bg-red-50',
      border: 'border-red-200',
      icon: '🚨',
      badge: 'bg-red-100 text-red-700'
    },
    warning: {
      bg: 'bg-amber-50',
      border: 'border-amber-200',
      icon: '⚠️',
      badge: 'bg-amber-100 text-amber-700'
    },
    info: {
      bg: 'bg-blue-50',
      border: 'border-blue-200',
      icon: '💡',
      badge: 'bg-blue-100 text-blue-700'
    },
    success: {
      bg: 'bg-green-50',
      border: 'border-green-200',
      icon: '✅',
      badge: 'bg-green-100 text-green-700'
    }
  }

  if (loading) {
    return (
      <div className="p-8 flex flex-col items-center justify-center min-h-[400px]">
        <div className="relative">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-200"></div>
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-600 border-t-transparent absolute top-0"></div>
        </div>
        <p className="mt-4 text-gray-600 animate-pulse">🤖 Analisi AI in corso...</p>
      </div>
    )
  }

  return (
    <div className="p-4 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            🤖 AI Insights
          </h1>
          <p className="text-gray-500">{progetto?.nome}</p>
        </div>

        <div className="flex items-center gap-3">
          {lastAnalysis && (
            <span className="text-sm text-gray-500">
              Ultima analisi: {lastAnalysis.toLocaleTimeString('it-IT')}
            </span>
          )}
          <button
            onClick={analyzeProject}
            disabled={analyzing}
            className={`px-4 py-2 rounded-xl flex items-center gap-2 transition-all ${
              analyzing 
                ? 'bg-gray-100 text-gray-400 cursor-wait' 
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            {analyzing ? (
              <>
                <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                Analisi...
              </>
            ) : (
              <>
                🔄 Riesegui Analisi
              </>
            )}
          </button>
        </div>
      </div>

      {/* Metriche Rapide */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <MetricCard 
          label="Budget Ore" 
          value={`${metrics.percentualeBudget || 0}%`}
          color={metrics.percentualeBudget > 100 ? 'red' : metrics.percentualeBudget > 85 ? 'amber' : 'green'}
        />
        <MetricCard 
          label="Completamento" 
          value={`${metrics.percentualeCompletamento || 0}%`}
          color={metrics.percentualeCompletamento > 60 ? 'green' : 'amber'}
        />
        <MetricCard 
          label="Trend Sett." 
          value={`${metrics.trendSettimana >= 0 ? '+' : ''}${metrics.trendSettimana || 0}%`}
          color={metrics.trendSettimana >= 0 ? 'green' : 'red'}
        />
        <MetricCard 
          label="Produttività" 
          value={`${metrics.produttivitaMedia || 0} h/mat`}
          color="blue"
        />
        <MetricCard 
          label="Ore Media/Giorno" 
          value={`${metrics.oreMediaGiornaliere || 0} h`}
          color="gray"
        />
      </div>

      {/* Insights */}
      <div className="space-y-4">
        <h2 className="font-semibold text-gray-800 flex items-center gap-2">
          <span className="text-xl">💡</span>
          Insights ({insights.length})
        </h2>

        {insights.length === 0 ? (
          <div className="bg-white rounded-2xl border p-8 text-center">
            <span className="text-6xl">🎉</span>
            <h3 className="mt-4 font-semibold text-gray-700">Nessun problema rilevato!</h3>
            <p className="text-gray-500 mt-2">Il progetto procede senza criticità significative.</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {insights.map((insight, idx) => {
              const style = insightStyles[insight.type] || insightStyles.info
              
              return (
                <div 
                  key={insight.id || idx}
                  className={`${style.bg} ${style.border} border-2 rounded-2xl p-5 transition-all hover:shadow-md`}
                >
                  <div className="flex items-start gap-4">
                    <span className="text-3xl">{style.icon}</span>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-bold text-gray-800">{insight.title}</h3>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${style.badge}`}>
                          {insight.category}
                        </span>
                        {insight.metric && (
                          <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                            {insight.metric}
                          </span>
                        )}
                      </div>
                      <p className="text-gray-600 mt-2">{insight.description}</p>
                      <div className="mt-3 p-3 bg-white/50 rounded-xl">
                        <p className="text-sm">
                          <span className="font-semibold text-gray-700">💡 Raccomandazione: </span>
                          {insight.recommendation}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Azioni Suggerite */}
      <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-2xl p-6 border border-indigo-200">
        <h3 className="font-semibold text-indigo-800 mb-4 flex items-center gap-2">
          <span>🎯</span> Azioni Prioritarie
        </h3>
        <div className="grid lg:grid-cols-3 gap-4">
          {insights.filter(i => i.impact === 'high').slice(0, 3).map((insight, idx) => (
            <div key={idx} className="bg-white rounded-xl p-4 shadow-sm">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-lg">{insightStyles[insight.type]?.icon}</span>
                <span className="font-medium text-gray-800 text-sm">{insight.category}</span>
              </div>
              <p className="text-sm text-gray-600">{insight.recommendation}</p>
            </div>
          ))}
          {insights.filter(i => i.impact === 'high').length === 0 && (
            <div className="lg:col-span-3 text-center text-indigo-600">
              <span className="text-2xl">✨</span>
              <p className="mt-2">Nessuna azione urgente richiesta</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// Componente Metrica Rapida
function MetricCard({ label, value, color }) {
  const colorClasses = {
    red: 'bg-red-100 text-red-700 border-red-200',
    amber: 'bg-amber-100 text-amber-700 border-amber-200',
    green: 'bg-green-100 text-green-700 border-green-200',
    blue: 'bg-blue-100 text-blue-700 border-blue-200',
    gray: 'bg-gray-100 text-gray-700 border-gray-200',
  }

  return (
    <div className={`rounded-xl p-4 border ${colorClasses[color] || colorClasses.gray}`}>
      <p className="text-xs font-medium opacity-70">{label}</p>
      <p className="text-xl font-bold mt-1">{value}</p>
    </div>
  )
}
