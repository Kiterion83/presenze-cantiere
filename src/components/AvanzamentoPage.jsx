// AvanzamentoPage.jsx - Dashboard Avanzamento Construction
import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useI18n } from '../contexts/I18nContext'
import { supabase } from '../lib/supabase'

export default function AvanzamentoPage() {
  const { progetto } = useAuth()
  const { language } = useI18n()
  const progettoId = progetto?.id

  const [loading, setLoading] = useState(true)
  const [data, setData] = useState({
    workPackages: [],
    azioni: [],
    componenti: [],
    squadre: [],
    discipline: []
  })
  const [stats, setStats] = useState({})
  const [selectedPeriod, setSelectedPeriod] = useState('all') // all, month, week
  const [selectedSquadra, setSelectedSquadra] = useState('')

  // Helper settimana
  function getWeekNumber(date) {
    const d = new Date(date)
    d.setHours(0, 0, 0, 0)
    d.setDate(d.getDate() + 4 - (d.getDay() || 7))
    const yearStart = new Date(d.getFullYear(), 0, 1)
    return Math.ceil((((d - yearStart) / 86400000) + 1) / 7)
  }

  const currentWeek = getWeekNumber(new Date())
  const currentYear = new Date().getFullYear()

  // Load data
  const loadData = useCallback(async () => {
    if (!progettoId) return
    setLoading(true)

    try {
      // Work Packages con conteggi
      const { data: wpData } = await supabase
        .from('work_packages')
        .select('*')
        .eq('progetto_id', progettoId)

      // Arricchisci WP con avanzamento
      const enrichedWP = await Promise.all((wpData || []).map(async (wp) => {
        // Componenti totali del WP
        const { data: compWP } = await supabase
          .from('work_package_componenti')
          .select('componente_id')
          .eq('work_package_id', wp.id)
        
        const totaleComponenti = compWP?.length || 0

        // Componenti completati (da pianificazione)
        const { data: pianComp } = await supabase
          .from('work_package_pianificazione_componenti')
          .select('id, completato')
          .eq('completato', true)
          .in('pianificazione_id', 
            (await supabase.from('work_package_pianificazione').select('id').eq('work_package_id', wp.id)).data?.map(p => p.id) || []
          )
        
        const completati = pianComp?.length || 0
        const percentuale = totaleComponenti > 0 ? Math.round((completati / totaleComponenti) * 100) : 0

        // Squadra
        let squadra = null
        if (wp.squadra_id) {
          const { data: sq } = await supabase.from('squadre').select('id, nome').eq('id', wp.squadra_id).single()
          squadra = sq
        }

        return {
          ...wp,
          squadra,
          totale_componenti: totaleComponenti,
          completati,
          percentuale
        }
      }))

      // Azioni
      const { data: azioniData } = await supabase
        .from('azioni')
        .select('*')
        .eq('progetto_id', progettoId)

      // Componenti totali progetto
      const { data: compData } = await supabase
        .from('componenti')
        .select('id, disciplina_id')
        .eq('progetto_id', progettoId)

      // Squadre
      const { data: squadreData } = await supabase
        .from('squadre')
        .select('*')
        .eq('progetto_id', progettoId)

      // Discipline
      const { data: discData } = await supabase
        .from('discipline')
        .select('*')
        .eq('progetto_id', progettoId)
        .eq('attivo', true)

      setData({
        workPackages: enrichedWP,
        azioni: azioniData || [],
        componenti: compData || [],
        squadre: squadreData || [],
        discipline: discData || []
      })

      // Calcola statistiche
      calculateStats(enrichedWP, azioniData || [], compData || [])

    } catch (error) {
      console.error('Errore caricamento:', error)
    } finally {
      setLoading(false)
    }
  }, [progettoId])

  const calculateStats = (wps, azioni, componenti) => {
    // WP stats
    const wpTotale = wps.length
    const wpPianificati = wps.filter(w => w.stato === 'pianificato').length
    const wpInCorso = wps.filter(w => w.stato === 'in_corso').length
    const wpCompletati = wps.filter(w => w.stato === 'completato').length
    const wpBloccati = wps.filter(w => w.stato === 'bloccato').length

    // Avanzamento medio
    const avanzamentoMedio = wps.length > 0 
      ? Math.round(wps.reduce((sum, wp) => sum + wp.percentuale, 0) / wps.length) 
      : 0

    // Componenti stats
    const compTotali = componenti.length
    const compInWP = wps.reduce((sum, wp) => sum + wp.totale_componenti, 0)
    const compCompletati = wps.reduce((sum, wp) => sum + wp.completati, 0)
    const compLiberi = compTotali - compInWP

    // Azioni stats
    const azioniTotale = azioni.length
    const azioniDaFare = azioni.filter(a => a.stato === 'da_fare').length
    const azioniInCorso = azioni.filter(a => a.stato === 'in_corso').length
    const azioniCompletate = azioni.filter(a => a.stato === 'completato').length

    // Per squadra
    const perSquadra = {}
    wps.forEach(wp => {
      const sqNome = wp.squadra?.nome || 'Non assegnato'
      if (!perSquadra[sqNome]) {
        perSquadra[sqNome] = { wp: 0, componenti: 0, completati: 0, percentuale: 0 }
      }
      perSquadra[sqNome].wp++
      perSquadra[sqNome].componenti += wp.totale_componenti
      perSquadra[sqNome].completati += wp.completati
    })
    Object.keys(perSquadra).forEach(sq => {
      perSquadra[sq].percentuale = perSquadra[sq].componenti > 0 
        ? Math.round((perSquadra[sq].completati / perSquadra[sq].componenti) * 100)
        : 0
    })

    setStats({
      wp: { totale: wpTotale, pianificati: wpPianificati, inCorso: wpInCorso, completati: wpCompletati, bloccati: wpBloccati },
      avanzamentoMedio,
      componenti: { totali: compTotali, inWP: compInWP, completati: compCompletati, liberi: compLiberi },
      azioni: { totale: azioniTotale, daFare: azioniDaFare, inCorso: azioniInCorso, completate: azioniCompletate },
      perSquadra
    })
  }

  useEffect(() => {
    loadData()
  }, [loadData])

  // Filtra WP
  const filteredWP = data.workPackages.filter(wp => {
    if (selectedSquadra && wp.squadra_id !== selectedSquadra) return false
    return true
  })

  // Componenti per grafico a torta stati WP
  const wpStatiData = [
    { label: 'Pianificati', value: stats.wp?.pianificati || 0, color: '#9CA3AF' },
    { label: 'In Corso', value: stats.wp?.inCorso || 0, color: '#F59E0B' },
    { label: 'Completati', value: stats.wp?.completati || 0, color: '#22C55E' },
    { label: 'Bloccati', value: stats.wp?.bloccati || 0, color: '#EF4444' }
  ].filter(d => d.value > 0)

  // Simple Pie Chart component
  const PieChart = ({ data, size = 160 }) => {
    if (!data || data.length === 0) return <div className="text-gray-400 text-center py-8">Nessun dato</div>
    
    const total = data.reduce((sum, d) => sum + d.value, 0)
    let cumulativePercent = 0
    
    const getCoordinatesForPercent = (percent) => {
      const x = Math.cos(2 * Math.PI * percent)
      const y = Math.sin(2 * Math.PI * percent)
      return [x, y]
    }

    return (
      <div className="flex items-center gap-4">
        <svg width={size} height={size} viewBox="-1 -1 2 2" style={{ transform: 'rotate(-90deg)' }}>
          {data.map((slice, i) => {
            const [startX, startY] = getCoordinatesForPercent(cumulativePercent)
            const slicePercent = slice.value / total
            cumulativePercent += slicePercent
            const [endX, endY] = getCoordinatesForPercent(cumulativePercent)
            const largeArcFlag = slicePercent > 0.5 ? 1 : 0
            const pathData = [
              `M ${startX} ${startY}`,
              `A 1 1 0 ${largeArcFlag} 1 ${endX} ${endY}`,
              `L 0 0`
            ].join(' ')
            return <path key={i} d={pathData} fill={slice.color} />
          })}
        </svg>
        <div className="space-y-1">
          {data.map((d, i) => (
            <div key={i} className="flex items-center gap-2 text-sm">
              <div className="w-3 h-3 rounded" style={{ backgroundColor: d.color }} />
              <span className="text-gray-600">{d.label}</span>
              <span className="font-bold">{d.value}</span>
              <span className="text-gray-400">({Math.round(d.value / total * 100)}%)</span>
            </div>
          ))}
        </div>
      </div>
    )
  }

  // Progress Bar component
  const ProgressBar = ({ value, max = 100, color = '#3B82F6', height = 8, showLabel = true }) => {
    const percent = max > 0 ? Math.min((value / max) * 100, 100) : 0
    return (
      <div className="flex items-center gap-2 w-full">
        <div className="flex-1 bg-gray-200 rounded-full overflow-hidden" style={{ height }}>
          <div 
            className="h-full rounded-full transition-all duration-500" 
            style={{ width: `${percent}%`, backgroundColor: color }}
          />
        </div>
        {showLabel && <span className="text-sm font-medium w-12 text-right">{Math.round(percent)}%</span>}
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-emerald-600 to-teal-600 rounded-2xl p-6 text-white">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              📊 {language === 'it' ? 'Dashboard Avanzamento' : 'Progress Dashboard'}
            </h1>
            <p className="text-white/80 mt-1">
              {language === 'it' ? 'Monitoraggio in tempo reale dei Work Packages' : 'Real-time Work Packages monitoring'}
            </p>
          </div>
          <div className="flex gap-2">
            <select value={selectedSquadra} onChange={e => setSelectedSquadra(e.target.value)}
              className="px-3 py-2 bg-white/20 rounded-lg text-white text-sm">
              <option value="" className="text-gray-800">{language === 'it' ? 'Tutte le squadre' : 'All teams'}</option>
              {data.squadre.map(s => <option key={s.id} value={s.id} className="text-gray-800">{s.nome}</option>)}
            </select>
            <button onClick={loadData} className="px-4 py-2 bg-white/20 rounded-lg hover:bg-white/30 transition-colors">
              🔄
            </button>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
          <div className="bg-white/20 rounded-xl p-4 text-center">
            <p className="text-4xl font-bold">{stats.avanzamentoMedio || 0}%</p>
            <p className="text-sm text-white/80 mt-1">{language === 'it' ? 'Avanzamento Medio' : 'Avg Progress'}</p>
          </div>
          <div className="bg-white/20 rounded-xl p-4 text-center">
            <p className="text-4xl font-bold">{stats.wp?.totale || 0}</p>
            <p className="text-sm text-white/80 mt-1">Work Packages</p>
          </div>
          <div className="bg-white/20 rounded-xl p-4 text-center">
            <p className="text-4xl font-bold">{stats.componenti?.completati || 0}<span className="text-xl">/{stats.componenti?.inWP || 0}</span></p>
            <p className="text-sm text-white/80 mt-1">{language === 'it' ? 'Componenti Completati' : 'Components Done'}</p>
          </div>
          <div className="bg-white/20 rounded-xl p-4 text-center">
            <p className="text-4xl font-bold">{stats.azioni?.inCorso || 0}</p>
            <p className="text-sm text-white/80 mt-1">{language === 'it' ? 'Azioni in Corso' : 'Actions In Progress'}</p>
          </div>
        </div>
      </div>

      {/* Grid principale */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Grafico Stati WP */}
        <div className="bg-white rounded-2xl shadow-sm border p-6">
          <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
            📋 {language === 'it' ? 'Stato Work Packages' : 'Work Packages Status'}
          </h3>
          <PieChart data={wpStatiData} />
        </div>

        {/* Avanzamento per Squadra */}
        <div className="bg-white rounded-2xl shadow-sm border p-6">
          <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
            👷 {language === 'it' ? 'Avanzamento per Squadra' : 'Progress by Team'}
          </h3>
          <div className="space-y-4">
            {Object.entries(stats.perSquadra || {}).map(([squadra, dati]) => (
              <div key={squadra}>
                <div className="flex justify-between items-center mb-1">
                  <span className="font-medium text-gray-700">{squadra}</span>
                  <span className="text-sm text-gray-500">{dati.completati}/{dati.componenti} comp.</span>
                </div>
                <ProgressBar 
                  value={dati.percentuale} 
                  color={dati.percentuale >= 80 ? '#22C55E' : dati.percentuale >= 50 ? '#F59E0B' : '#3B82F6'} 
                />
              </div>
            ))}
            {Object.keys(stats.perSquadra || {}).length === 0 && (
              <p className="text-gray-400 text-center py-4">Nessuna squadra assegnata</p>
            )}
          </div>
        </div>

        {/* Riepilogo Azioni */}
        <div className="bg-white rounded-2xl shadow-sm border p-6">
          <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
            ⚡ {language === 'it' ? 'Azioni Parallele' : 'Parallel Actions'}
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gray-50 rounded-xl p-4 text-center">
              <p className="text-3xl font-bold text-gray-600">{stats.azioni?.daFare || 0}</p>
              <p className="text-sm text-gray-500">{language === 'it' ? 'Da Fare' : 'To Do'}</p>
            </div>
            <div className="bg-amber-50 rounded-xl p-4 text-center">
              <p className="text-3xl font-bold text-amber-600">{stats.azioni?.inCorso || 0}</p>
              <p className="text-sm text-amber-700">{language === 'it' ? 'In Corso' : 'In Progress'}</p>
            </div>
            <div className="bg-green-50 rounded-xl p-4 text-center">
              <p className="text-3xl font-bold text-green-600">{stats.azioni?.completate || 0}</p>
              <p className="text-sm text-green-700">{language === 'it' ? 'Completate' : 'Completed'}</p>
            </div>
            <div className="bg-blue-50 rounded-xl p-4 text-center">
              <p className="text-3xl font-bold text-blue-600">{stats.azioni?.totale || 0}</p>
              <p className="text-sm text-blue-700">{language === 'it' ? 'Totale' : 'Total'}</p>
            </div>
          </div>
        </div>

        {/* Componenti Overview */}
        <div className="bg-white rounded-2xl shadow-sm border p-6">
          <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
            📦 {language === 'it' ? 'Componenti Progetto' : 'Project Components'}
          </h3>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-600">{language === 'it' ? 'Assegnati a WP' : 'Assigned to WP'}</span>
                <span className="font-medium">{stats.componenti?.inWP || 0} / {stats.componenti?.totali || 0}</span>
              </div>
              <ProgressBar value={stats.componenti?.inWP || 0} max={stats.componenti?.totali || 1} color="#3B82F6" />
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-600">{language === 'it' ? 'Completati' : 'Completed'}</span>
                <span className="font-medium">{stats.componenti?.completati || 0} / {stats.componenti?.inWP || 0}</span>
              </div>
              <ProgressBar value={stats.componenti?.completati || 0} max={stats.componenti?.inWP || 1} color="#22C55E" />
            </div>
            <div className="pt-2 border-t">
              <div className="flex justify-between">
                <span className="text-gray-500">{language === 'it' ? 'Componenti liberi' : 'Free components'}</span>
                <span className="font-bold text-amber-600">{stats.componenti?.liberi || 0}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Lista WP con Progress */}
      <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
        <div className="p-4 border-b bg-gray-50">
          <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
            📋 {language === 'it' ? 'Dettaglio Work Packages' : 'Work Packages Detail'}
            <span className="text-sm font-normal text-gray-500">({filteredWP.length})</span>
          </h3>
        </div>
        
        {filteredWP.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            <p className="text-5xl mb-4">📋</p>
            <p>{language === 'it' ? 'Nessun Work Package' : 'No Work Packages'}</p>
          </div>
        ) : (
          <div className="divide-y">
            {filteredWP
              .sort((a, b) => b.percentuale - a.percentuale)
              .map(wp => (
              <div key={wp.id} className="p-4 hover:bg-gray-50 transition-colors">
                <div className="flex items-center gap-4">
                  {/* Colore e info */}
                  <div className="w-2 h-16 rounded-full flex-shrink-0" style={{ backgroundColor: wp.colore || '#3B82F6' }} />
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono font-bold text-blue-700">{wp.codice}</span>
                      <span className="font-medium text-gray-800">{wp.nome}</span>
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                        wp.stato === 'completato' ? 'bg-green-100 text-green-700' :
                        wp.stato === 'in_corso' ? 'bg-amber-100 text-amber-700' :
                        wp.stato === 'bloccato' ? 'bg-red-100 text-red-700' :
                        'bg-gray-100 text-gray-600'
                      }`}>{wp.stato}</span>
                    </div>
                    
                    <div className="flex items-center gap-4 mt-1 text-sm text-gray-500">
                      {wp.squadra && <span>👷 {wp.squadra.nome}</span>}
                      <span>📦 {wp.completati}/{wp.totale_componenti} comp.</span>
                    </div>
                    
                    {/* Progress bar */}
                    <div className="mt-2">
                      <ProgressBar 
                        value={wp.percentuale} 
                        color={wp.percentuale >= 100 ? '#22C55E' : wp.percentuale >= 50 ? '#F59E0B' : '#3B82F6'}
                        height={6}
                      />
                    </div>
                  </div>
                  
                  {/* Percentuale grande */}
                  <div className={`text-3xl font-bold ${
                    wp.percentuale >= 100 ? 'text-green-600' :
                    wp.percentuale >= 50 ? 'text-amber-600' :
                    'text-blue-600'
                  }`}>
                    {wp.percentuale}%
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Settimana Corrente Info */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl border border-blue-200 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-blue-800 flex items-center gap-2">
              📅 {language === 'it' ? 'Settimana Corrente' : 'Current Week'}
            </h3>
            <p className="text-blue-600 text-2xl font-bold mt-1">
              CW{String(currentWeek).padStart(2, '0')} / {currentYear}
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm text-blue-600">
              {language === 'it' ? 'Azioni questa settimana' : 'Actions this week'}
            </p>
            <p className="text-3xl font-bold text-blue-800">
              {data.azioni.filter(a => a.anno === currentYear && a.settimana === currentWeek).length}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
