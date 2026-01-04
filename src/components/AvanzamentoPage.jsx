// AvanzamentoPage.jsx - Dashboard Avanzamento Construction COMPLETA
// Include: Work Packages, Test Packages, Azioni Parallele
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
    testPackages: [],
    azioni: [],
    componenti: [],
    squadre: [],
    punch: []
  })
  const [stats, setStats] = useState({})
  const [selectedSquadra, setSelectedSquadra] = useState('')
  const [activeSection, setActiveSection] = useState('overview') // overview, wp, tp, azioni

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
      // ============ WORK PACKAGES ============
      const { data: wpData } = await supabase
        .from('work_packages')
        .select(`
          *,
          squadra:squadre(id, nome)
        `)
        .eq('progetto_id', progettoId)

      // Arricchisci WP con conteggi componenti
      const enrichedWP = await Promise.all((wpData || []).map(async (wp) => {
        const { count: totaleComponenti } = await supabase
          .from('work_package_componenti')
          .select('*', { count: 'exact', head: true })
          .eq('work_package_id', wp.id)

        // Componenti completati tramite pianificazione
        const { data: pianIds } = await supabase
          .from('work_package_pianificazione')
          .select('id')
          .eq('work_package_id', wp.id)
        
        let completati = 0
        if (pianIds && pianIds.length > 0) {
          const { count } = await supabase
            .from('work_package_pianificazione_componenti')
            .select('*', { count: 'exact', head: true })
            .eq('completato', true)
            .in('pianificazione_id', pianIds.map(p => p.id))
          completati = count || 0
        }

        const percentuale = totaleComponenti > 0 ? Math.round((completati / totaleComponenti) * 100) : 0

        return {
          ...wp,
          totale_componenti: totaleComponenti || 0,
          completati,
          percentuale
        }
      }))

      // ============ TEST PACKAGES ============
      const { data: tpData } = await supabase
        .from('test_packages')
        .select(`
          *,
          fase_corrente:test_package_fasi(id, nome, ordine)
        `)
        .eq('progetto_id', progettoId)

      // Conta fasi totali (sono sempre le stesse per tutti i TP)
      const { count: totaleFasiGlobale } = await supabase
        .from('test_package_fasi')
        .select('*', { count: 'exact', head: true })

      // Arricchisci TP con conteggi fasi e punch
      const enrichedTP = await Promise.all((tpData || []).map(async (tp) => {
        // Fasi completate per questo TP
        const { count: fasiCompletate } = await supabase
          .from('test_package_avanzamento')
          .select('*', { count: 'exact', head: true })
          .eq('test_package_id', tp.id)
          .eq('stato', 'approved')

        // Punch aperti
        const { count: punchAperti } = await supabase
          .from('test_package_punch')
          .select('*', { count: 'exact', head: true })
          .eq('test_package_id', tp.id)
          .neq('stato', 'closed')

        const totaleFasi = totaleFasiGlobale || 11
        const percentualeFasi = totaleFasi > 0 ? Math.round(((fasiCompletate || 0) / totaleFasi) * 100) : 0

        return {
          ...tp,
          totale_fasi: totaleFasi,
          fasi_completate: fasiCompletate || 0,
          punch_aperti: punchAperti || 0,
          percentuale_fasi: percentualeFasi
        }
      }))

      // Punch totali aperti
      const tpIds = (tpData || []).map(t => t.id)
      let punchData = []
      if (tpIds.length > 0) {
        const { data: pd } = await supabase
          .from('test_package_punch')
          .select('*, test_package:test_packages(codice)')
          .in('test_package_id', tpIds)
          .neq('stato', 'closed')
        punchData = pd || []
      }

      // ============ AZIONI ============
      const { data: azioniData } = await supabase
        .from('azioni')
        .select('*')
        .eq('progetto_id', progettoId)

      // ============ ALTRI DATI ============
      const { data: compData } = await supabase
        .from('componenti')
        .select('id, disciplina_id')
        .eq('progetto_id', progettoId)

      const { data: squadreData } = await supabase
        .from('squadre')
        .select('*')
        .eq('progetto_id', progettoId)

      setData({
        workPackages: enrichedWP,
        testPackages: enrichedTP,
        azioni: azioniData || [],
        componenti: compData || [],
        squadre: squadreData || [],
        punch: punchData
      })

      // Calcola statistiche
      calculateStats(enrichedWP, enrichedTP, azioniData || [], compData || [], punchData)

    } catch (error) {
      console.error('Errore caricamento:', error)
    } finally {
      setLoading(false)
    }
  }, [progettoId])

  const calculateStats = (wps, tps, azioni, componenti, punch) => {
    // ========== WP STATS ==========
    const wpTotale = wps.length
    const wpPianificati = wps.filter(w => w.stato === 'pianificato').length
    const wpInCorso = wps.filter(w => w.stato === 'in_corso').length
    const wpCompletati = wps.filter(w => w.stato === 'completato').length
    const wpBloccati = wps.filter(w => w.stato === 'bloccato').length

    const wpAvanzamentoMedio = wps.length > 0 
      ? Math.round(wps.reduce((sum, wp) => sum + wp.percentuale, 0) / wps.length) 
      : 0

    // ========== TP STATS ==========
    const tpTotale = tps.length
    const tpPianificati = tps.filter(t => t.stato === 'planned').length
    const tpInCorso = tps.filter(t => t.stato === 'in_progress').length
    const tpPassed = tps.filter(t => t.stato === 'passed').length
    const tpFailed = tps.filter(t => t.stato === 'failed').length
    const tpOnHold = tps.filter(t => t.stato === 'on_hold').length

    const tpAvanzamentoMedio = tps.length > 0
      ? Math.round(tps.reduce((sum, tp) => sum + tp.percentuale_fasi, 0) / tps.length)
      : 0

    const punchTotali = punch?.length || 0
    const punchCritici = punch?.filter(p => p.priorita === 'A').length || 0

    // ========== AZIONI STATS ==========
    const azioniTotale = azioni.length
    const azioniPending = azioni.filter(a => a.stato === 'pending' || a.stato === 'da_fare').length
    const azioniInCorso = azioni.filter(a => a.stato === 'in_progress' || a.stato === 'in_corso').length
    const azioniCompletate = azioni.filter(a => a.stato === 'completed' || a.stato === 'completato').length
    const azioniBloccate = azioni.filter(a => a.stato === 'blocked' || a.stato === 'bloccato').length

    // ========== COMPONENTI STATS ==========
    const compTotali = componenti.length
    const compInWP = wps.reduce((sum, wp) => sum + wp.totale_componenti, 0)
    const compCompletati = wps.reduce((sum, wp) => sum + wp.completati, 0)
    const compLiberi = Math.max(0, compTotali - compInWP)

    // ========== PER SQUADRA ==========
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

    // ========== AVANZAMENTO GLOBALE ==========
    // Media pesata: WP 50%, TP 30%, Azioni 20%
    const azioniPerc = azioniTotale > 0 ? Math.round((azioniCompletate / azioniTotale) * 100) : 0
    const avanzamentoGlobale = Math.round(
      (wpAvanzamentoMedio * 0.5) + 
      (tpAvanzamentoMedio * 0.3) + 
      (azioniPerc * 0.2)
    )

    setStats({
      avanzamentoGlobale,
      wp: { 
        totale: wpTotale, 
        pianificati: wpPianificati, 
        inCorso: wpInCorso, 
        completati: wpCompletati, 
        bloccati: wpBloccati,
        avanzamentoMedio: wpAvanzamentoMedio
      },
      tp: {
        totale: tpTotale,
        pianificati: tpPianificati,
        inCorso: tpInCorso,
        passed: tpPassed,
        failed: tpFailed,
        onHold: tpOnHold,
        avanzamentoMedio: tpAvanzamentoMedio,
        punchAperti: punchTotali,
        punchCritici
      },
      azioni: { 
        totale: azioniTotale, 
        pending: azioniPending, 
        inCorso: azioniInCorso, 
        completate: azioniCompletate,
        bloccate: azioniBloccate
      },
      componenti: { totali: compTotali, inWP: compInWP, completati: compCompletati, liberi: compLiberi },
      perSquadra
    })
  }

  useEffect(() => {
    loadData()
  }, [loadData])

  // Filtra WP per squadra
  const filteredWP = selectedSquadra
    ? data.workPackages.filter(wp => wp.squadra?.id === selectedSquadra)
    : data.workPackages

  // Loading
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-500">Caricamento dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header con Avanzamento Globale */}
      <div className="bg-gradient-to-r from-emerald-600 to-teal-600 rounded-2xl p-6 text-white">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              📊 Dashboard Avanzamento
            </h1>
            <p className="text-emerald-100">
              {language === 'it' ? 'Monitoraggio completo: WP + Test Packages + Azioni' : 'Complete monitoring: WP + Test Packages + Actions'}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <select
              value={selectedSquadra}
              onChange={(e) => setSelectedSquadra(e.target.value)}
              className="px-4 py-2 rounded-xl bg-white/20 text-white border border-white/30 focus:outline-none"
            >
              <option value="" className="text-gray-800">{language === 'it' ? 'Tutte le squadre' : 'All teams'}</option>
              {data.squadre.map(sq => (
                <option key={sq.id} value={sq.id} className="text-gray-800">{sq.nome}</option>
              ))}
            </select>
            <button onClick={loadData} className="p-2 bg-white/20 rounded-xl hover:bg-white/30 transition-colors">
              🔄
            </button>
          </div>
        </div>

        {/* KPI Cards Principali */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
          <div className="bg-white/20 backdrop-blur rounded-xl p-4 text-center">
            <p className="text-4xl font-bold">{stats.avanzamentoGlobale || 0}%</p>
            <p className="text-emerald-100 text-sm">Avanzamento Globale</p>
          </div>
          <div className="bg-white/20 backdrop-blur rounded-xl p-4 text-center">
            <p className="text-4xl font-bold">{stats.wp?.totale || 0}</p>
            <p className="text-emerald-100 text-sm">Work Packages</p>
          </div>
          <div className="bg-white/20 backdrop-blur rounded-xl p-4 text-center">
            <p className="text-4xl font-bold">
              {stats.tp?.passed || 0}<span className="text-xl opacity-70">/{stats.tp?.totale || 0}</span>
            </p>
            <p className="text-emerald-100 text-sm">Test Packages</p>
          </div>
          <div className="bg-white/20 backdrop-blur rounded-xl p-4 text-center">
            <p className="text-4xl font-bold">{stats.azioni?.totale || 0}</p>
            <p className="text-emerald-100 text-sm">Azioni Totali</p>
          </div>
          <div className="bg-white/20 backdrop-blur rounded-xl p-4 text-center">
            <p className="text-4xl font-bold text-green-300">{stats.azioni?.completate || 0}</p>
            <p className="text-emerald-100 text-sm">Azioni Completate</p>
          </div>
          <div className={`backdrop-blur rounded-xl p-4 text-center ${stats.tp?.punchAperti > 0 ? 'bg-amber-500/40' : 'bg-white/20'}`}>
            <p className="text-4xl font-bold">{stats.tp?.punchAperti || 0}</p>
            <p className="text-emerald-100 text-sm">
              {stats.tp?.punchCritici > 0 && <span className="text-red-200">⚠️ {stats.tp.punchCritici} critici • </span>}
              Punch Aperti
            </p>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex gap-2 border-b overflow-x-auto">
        {[
          { id: 'overview', label: '📊 Overview' },
          { id: 'wp', label: `📦 Work Packages (${stats.wp?.totale || 0})` },
          { id: 'tp', label: `🧪 Test Packages (${stats.tp?.totale || 0})` },
          { id: 'azioni', label: `⚡ Azioni (${stats.azioni?.totale || 0})` },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveSection(tab.id)}
            className={`px-4 py-3 font-medium transition-colors whitespace-nowrap ${
              activeSection === tab.id
                ? 'text-emerald-600 border-b-2 border-emerald-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ========== OVERVIEW TAB ========== */}
      {activeSection === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* WP Overview */}
          <div className="bg-white rounded-2xl shadow-sm border p-6">
            <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
              📦 Work Packages
              <span className="text-sm font-normal text-gray-500">({stats.wp?.avanzamentoMedio || 0}% medio)</span>
            </h3>
            <div className="grid grid-cols-4 gap-2 mb-4">
              <StatBox value={stats.wp?.pianificati || 0} label="Pianificati" color="gray" />
              <StatBox value={stats.wp?.inCorso || 0} label="In Corso" color="amber" />
              <StatBox value={stats.wp?.completati || 0} label="Completati" color="green" />
              <StatBox value={stats.wp?.bloccati || 0} label="Bloccati" color="red" />
            </div>
            <ProgressBar value={stats.wp?.avanzamentoMedio || 0} color="#10B981" />
          </div>

          {/* TP Overview */}
          <div className="bg-white rounded-2xl shadow-sm border p-6">
            <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
              🧪 Test Packages
              <span className="text-sm font-normal text-gray-500">({stats.tp?.avanzamentoMedio || 0}% medio)</span>
            </h3>
            <div className="grid grid-cols-4 gap-2 mb-4">
              <StatBox value={stats.tp?.pianificati || 0} label="Planned" color="gray" />
              <StatBox value={stats.tp?.inCorso || 0} label="In Test" color="purple" />
              <StatBox value={stats.tp?.passed || 0} label="Passed" color="green" />
              <StatBox value={(stats.tp?.failed || 0) + (stats.tp?.onHold || 0)} label="Failed/Hold" color="red" />
            </div>
            <ProgressBar value={stats.tp?.avanzamentoMedio || 0} color="#8B5CF6" />
          </div>

          {/* Azioni Overview */}
          <div className="bg-white rounded-2xl shadow-sm border p-6">
            <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
              ⚡ Azioni Parallele
            </h3>
            <div className="grid grid-cols-4 gap-2">
              <StatBox value={stats.azioni?.pending || 0} label="Da Fare" color="gray" />
              <StatBox value={stats.azioni?.inCorso || 0} label="In Corso" color="blue" />
              <StatBox value={stats.azioni?.completate || 0} label="Completate" color="green" />
              <StatBox value={stats.azioni?.bloccate || 0} label="Bloccate" color="red" />
            </div>
          </div>

          {/* Avanzamento Squadre */}
          <div className="bg-white rounded-2xl shadow-sm border p-6">
            <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
              👷 Avanzamento per Squadra
            </h3>
            <div className="space-y-3">
              {Object.entries(stats.perSquadra || {}).map(([squadra, dati]) => (
                <div key={squadra}>
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-medium text-gray-700">{squadra}</span>
                    <span className="text-sm text-gray-500">{dati.completati}/{dati.componenti} comp. • {dati.percentuale}%</span>
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

          {/* Componenti Overview */}
          <div className="bg-white rounded-2xl shadow-sm border p-6 lg:col-span-2">
            <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
              📦 Componenti Progetto
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-600">Assegnati a WP</span>
                  <span className="font-medium">{stats.componenti?.inWP || 0} / {stats.componenti?.totali || 0}</span>
                </div>
                <ProgressBar value={stats.componenti?.inWP || 0} max={stats.componenti?.totali || 1} color="#3B82F6" />
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-600">Completati</span>
                  <span className="font-medium">{stats.componenti?.completati || 0} / {stats.componenti?.inWP || 0}</span>
                </div>
                <ProgressBar value={stats.componenti?.completati || 0} max={stats.componenti?.inWP || 1} color="#22C55E" />
              </div>
              <div className="flex items-center justify-center">
                <div className="text-center">
                  <p className="text-3xl font-bold text-amber-600">{stats.componenti?.liberi || 0}</p>
                  <p className="text-sm text-gray-500">Componenti liberi</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========== WP TAB ========== */}
      {activeSection === 'wp' && (
        <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
          <div className="p-4 border-b bg-gray-50">
            <h3 className="text-lg font-bold text-gray-800">📦 Dettaglio Work Packages</h3>
          </div>
          {filteredWP.length === 0 ? (
            <div className="p-12 text-center text-gray-500">
              <p className="text-5xl mb-4">📦</p>
              <p>Nessun Work Package</p>
            </div>
          ) : (
            <div className="divide-y">
              {filteredWP.sort((a, b) => b.percentuale - a.percentuale).map(wp => (
                <div key={wp.id} className="p-4 hover:bg-gray-50">
                  <div className="flex items-center gap-4">
                    <div className="w-2 h-16 rounded-full flex-shrink-0" style={{ backgroundColor: wp.colore || '#3B82F6' }} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono font-bold text-blue-700">{wp.codice}</span>
                        <span className="font-medium text-gray-800 truncate">{wp.nome}</span>
                        <StatusBadge stato={wp.stato} />
                      </div>
                      <div className="flex items-center gap-4 mt-1 text-sm text-gray-500">
                        {wp.squadra && <span>👷 {wp.squadra.nome}</span>}
                        <span>📦 {wp.completati}/{wp.totale_componenti} comp.</span>
                      </div>
                      <div className="mt-2">
                        <ProgressBar value={wp.percentuale} color={wp.percentuale >= 100 ? '#22C55E' : '#3B82F6'} height={6} />
                      </div>
                    </div>
                    <div className={`text-3xl font-bold flex-shrink-0 ${wp.percentuale >= 100 ? 'text-green-600' : 'text-blue-600'}`}>
                      {wp.percentuale}%
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ========== TP TAB ========== */}
      {activeSection === 'tp' && (
        <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
          <div className="p-4 border-b bg-gray-50">
            <h3 className="text-lg font-bold text-gray-800">🧪 Dettaglio Test Packages</h3>
          </div>
          {data.testPackages.length === 0 ? (
            <div className="p-12 text-center text-gray-500">
              <p className="text-5xl mb-4">🧪</p>
              <p>Nessun Test Package</p>
            </div>
          ) : (
            <div className="divide-y">
              {data.testPackages.map(tp => (
                <div key={tp.id} className="p-4 hover:bg-gray-50">
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-white text-xl flex-shrink-0 ${
                      tp.stato === 'passed' ? 'bg-green-500' :
                      tp.stato === 'failed' ? 'bg-red-500' :
                      tp.stato === 'in_progress' ? 'bg-purple-500' :
                      'bg-gray-400'
                    }`}>
                      {tp.tipo === 'hydrotest' ? '💧' : tp.tipo === 'pneumatic' ? '💨' : '🧪'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono font-bold text-purple-700">{tp.codice}</span>
                        <span className="font-medium text-gray-800 truncate">{tp.nome}</span>
                        <TPStatusBadge stato={tp.stato} />
                      </div>
                      <div className="flex items-center gap-4 mt-1 text-sm text-gray-500 flex-wrap">
                        <span>📋 Fase: {tp.fase_corrente?.nome || 'N/A'}</span>
                        <span>✅ {tp.fasi_completate}/{tp.totale_fasi} fasi</span>
                        {tp.punch_aperti > 0 && (
                          <span className="text-amber-600 font-medium">⚠️ {tp.punch_aperti} punch</span>
                        )}
                      </div>
                      <div className="mt-2">
                        <ProgressBar value={tp.percentuale_fasi} color="#8B5CF6" height={6} />
                      </div>
                    </div>
                    <div className={`text-3xl font-bold flex-shrink-0 ${tp.stato === 'passed' ? 'text-green-600' : 'text-purple-600'}`}>
                      {tp.percentuale_fasi}%
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ========== AZIONI TAB ========== */}
      {activeSection === 'azioni' && (
        <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
          <div className="p-4 border-b bg-gray-50">
            <h3 className="text-lg font-bold text-gray-800">⚡ Azioni Parallele</h3>
          </div>
          {data.azioni.length === 0 ? (
            <div className="p-12 text-center text-gray-500">
              <p className="text-5xl mb-4">⚡</p>
              <p>Nessuna azione</p>
            </div>
          ) : (
            <div className="divide-y">
              {data.azioni.sort((a, b) => {
                const order = { blocked: 0, bloccato: 0, in_progress: 1, in_corso: 1, pending: 2, da_fare: 2, completed: 3, completato: 3 }
                return (order[a.stato] ?? 4) - (order[b.stato] ?? 4)
              }).map(azione => (
                <div key={azione.id} className="p-4 hover:bg-gray-50">
                  <div className="flex items-center gap-4">
                    <AzioneStatusIcon stato={azione.stato} />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-800">{azione.titolo || azione.descrizione}</p>
                      <div className="flex items-center gap-3 mt-1 text-sm text-gray-500 flex-wrap">
                        {azione.settimana && azione.anno && (
                          <span>📅 CW{String(azione.settimana).padStart(2, '0')}/{azione.anno}</span>
                        )}
                        {azione.squadra && <span>👷 {azione.squadra}</span>}
                        {azione.responsabile && <span>👤 {azione.responsabile}</span>}
                      </div>
                    </div>
                    <AzioneStatusBadge stato={azione.stato} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Footer Info */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl border border-blue-200 p-4">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <span className="text-2xl">📅</span>
            <div>
              <p className="font-bold text-blue-800">CW{String(currentWeek).padStart(2, '0')} / {currentYear}</p>
              <p className="text-sm text-blue-600">Settimana corrente</p>
            </div>
          </div>
          <div className="text-right text-sm text-gray-500">
            Ultimo aggiornamento: {new Date().toLocaleTimeString('it-IT')}
          </div>
        </div>
      </div>
    </div>
  )
}

// ========== COMPONENTI HELPER ==========

function StatBox({ value, label, color }) {
  const colors = {
    gray: 'bg-gray-100 text-gray-700',
    amber: 'bg-amber-100 text-amber-700',
    green: 'bg-green-100 text-green-700',
    red: 'bg-red-100 text-red-700',
    blue: 'bg-blue-100 text-blue-700',
    purple: 'bg-purple-100 text-purple-700'
  }
  return (
    <div className={`rounded-xl p-3 text-center ${colors[color] || colors.gray}`}>
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-xs">{label}</p>
    </div>
  )
}

function ProgressBar({ value, color = '#3B82F6', height = 8, max = 100 }) {
  const percentage = max > 0 ? Math.min((value / max) * 100, 100) : 0
  return (
    <div className="w-full bg-gray-200 rounded-full overflow-hidden" style={{ height }}>
      <div 
        className="h-full rounded-full transition-all duration-500"
        style={{ width: `${percentage}%`, backgroundColor: color }}
      />
    </div>
  )
}

function StatusBadge({ stato }) {
  const config = {
    pianificato: { bg: 'bg-gray-100', text: 'text-gray-700', label: 'Pianificato' },
    in_corso: { bg: 'bg-amber-100', text: 'text-amber-700', label: 'In Corso' },
    completato: { bg: 'bg-green-100', text: 'text-green-700', label: 'Completato' },
    bloccato: { bg: 'bg-red-100', text: 'text-red-700', label: 'Bloccato' }
  }
  const c = config[stato] || config.pianificato
  return <span className={`px-2 py-0.5 rounded text-xs font-medium ${c.bg} ${c.text}`}>{c.label}</span>
}

function TPStatusBadge({ stato }) {
  const config = {
    planned: { bg: 'bg-gray-100', text: 'text-gray-700', label: 'Planned' },
    in_progress: { bg: 'bg-purple-100', text: 'text-purple-700', label: 'In Test' },
    passed: { bg: 'bg-green-100', text: 'text-green-700', label: '✓ Passed' },
    failed: { bg: 'bg-red-100', text: 'text-red-700', label: '✗ Failed' },
    on_hold: { bg: 'bg-amber-100', text: 'text-amber-700', label: 'On Hold' }
  }
  const c = config[stato] || config.planned
  return <span className={`px-2 py-0.5 rounded text-xs font-medium ${c.bg} ${c.text}`}>{c.label}</span>
}

function AzioneStatusIcon({ stato }) {
  const config = {
    pending: { bg: 'bg-gray-200', icon: '⏳' },
    da_fare: { bg: 'bg-gray-200', icon: '⏳' },
    in_progress: { bg: 'bg-blue-100', icon: '🔄' },
    in_corso: { bg: 'bg-blue-100', icon: '🔄' },
    completed: { bg: 'bg-green-100', icon: '✅' },
    completato: { bg: 'bg-green-100', icon: '✅' },
    blocked: { bg: 'bg-red-100', icon: '🚫' },
    bloccato: { bg: 'bg-red-100', icon: '🚫' }
  }
  const c = config[stato] || config.pending
  return (
    <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${c.bg}`}>
      <span className="text-xl">{c.icon}</span>
    </div>
  )
}

function AzioneStatusBadge({ stato }) {
  const config = {
    pending: { bg: 'bg-gray-100', text: 'text-gray-600', label: 'Da Fare' },
    da_fare: { bg: 'bg-gray-100', text: 'text-gray-600', label: 'Da Fare' },
    in_progress: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'In Corso' },
    in_corso: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'In Corso' },
    completed: { bg: 'bg-green-100', text: 'text-green-700', label: 'Completata' },
    completato: { bg: 'bg-green-100', text: 'text-green-700', label: 'Completata' },
    blocked: { bg: 'bg-red-100', text: 'text-red-700', label: 'Bloccata' },
    bloccato: { bg: 'bg-red-100', text: 'text-red-700', label: 'Bloccata' }
  }
  const c = config[stato] || config.pending
  return <span className={`px-3 py-1 rounded-full text-xs font-medium ${c.bg} ${c.text}`}>{c.label}</span>
}
