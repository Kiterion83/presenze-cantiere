import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { 
  BarChart3, 
  TrendingUp, 
  Clock, 
  Users,
  Wrench,
  Zap,
  Package,
  Loader2,
  ChevronDown,
  ChevronUp,
  Calendar
} from 'lucide-react'

export default function StatistichePage() {
  const { assegnazione, progetto } = useAuth()
  const [loading, setLoading] = useState(true)
  const [centriCosto, setCentriCosto] = useState([])
  const [orePerDitta, setOrePerDitta] = useState([])
  const [oreSettimanali, setOreSettimanali] = useState([])
  const [totali, setTotali] = useState({
    ore_totali: 0,
    ore_straordinario: 0,
    presenze_oggi: 0,
    rapportini_settimana: 0
  })
  const [expandedCC, setExpandedCC] = useState(null)
  const [periodo, setPeriodo] = useState('settimana')

  useEffect(() => {
    loadStatistiche()
  }, [periodo])

  const loadStatistiche = async () => {
    setLoading(true)
    try {
      const progettoId = assegnazione.progetto_id

      // 1. Progress per Centro di Costo
      const { data: ccData } = await supabase
        .from('centri_costo')
        .select(`
          *,
          unita_misura:unita_misura_id(nome, simbolo),
          unita_misura_secondaria:unita_misura_secondaria_id(nome, simbolo)
        `)
        .eq('progetto_id', progettoId)
        .eq('stato', 'attivo')
        .order('ordine')

      // Per ogni CC, calcola ore spese e quantità fatta
      const ccConStats = await Promise.all((ccData || []).map(async (cc) => {
        // Ore spese
        const { data: oreData } = await supabase
          .from('ore_lavorate')
          .select('ore_ordinarie, ore_straordinario, rapportino:rapportino_id(centro_costo_id)')
          .eq('rapportino.centro_costo_id', cc.id)

        const oreTotali = (oreData || []).reduce((sum, o) => 
          sum + (o.ore_ordinarie || 0) + (o.ore_straordinario || 0), 0)

        // Progress fisico
        const { data: progressData } = await supabase
          .from('progress_fisico')
          .select('quantita_fatta, quantita_secondaria_fatta')
          .eq('centro_costo_id', cc.id)

        const quantitaFatta = (progressData || []).reduce((sum, p) => 
          sum + (p.quantita_fatta || 0), 0)
        const quantitaSecFatta = (progressData || []).reduce((sum, p) => 
          sum + (p.quantita_secondaria_fatta || 0), 0)

        return {
          ...cc,
          ore_spese: oreTotali,
          perc_ore: cc.budget_ore ? Math.round((oreTotali / cc.budget_ore) * 100) : 0,
          quantita_fatta: quantitaFatta,
          quantita_sec_fatta: quantitaSecFatta,
          perc_quantita: cc.budget_quantita ? Math.round((quantitaFatta / cc.budget_quantita) * 100) : 0,
          resa: oreTotali > 0 ? (quantitaFatta / oreTotali).toFixed(2) : '-'
        }
      }))

      setCentriCosto(ccConStats)

      // 2. Ore per Ditta
      const { data: ditteData } = await supabase
        .from('ditte')
        .select('id, ragione_sociale, codice')
        .eq('attiva', true)

      const ditteConOre = await Promise.all((ditteData || []).map(async (ditta) => {
        const { data: assegnazioni } = await supabase
          .from('assegnazioni_progetto')
          .select('persona_id')
          .eq('ditta_id', ditta.id)
          .eq('progetto_id', progettoId)

        const personaIds = (assegnazioni || []).map(a => a.persona_id)
        
        if (personaIds.length === 0) return { ...ditta, ore: 0, persone: 0 }

        const { data: oreData } = await supabase
          .from('ore_lavorate')
          .select('ore_ordinarie, ore_straordinario')
          .in('persona_id', personaIds)

        const oreTotali = (oreData || []).reduce((sum, o) => 
          sum + (o.ore_ordinarie || 0) + (o.ore_straordinario || 0), 0)

        return {
          ...ditta,
          ore: oreTotali,
          persone: personaIds.length
        }
      }))

      setOrePerDitta(ditteConOre.filter(d => d.ore > 0).sort((a, b) => b.ore - a.ore))

      // 3. Totali
      const oggi = new Date().toISOString().split('T')[0]
      const inizioSettimana = new Date()
      inizioSettimana.setDate(inizioSettimana.getDate() - inizioSettimana.getDay() + 1)

      const { count: presenzeOggi } = await supabase
        .from('presenze')
        .select('*', { count: 'exact', head: true })
        .eq('progetto_id', progettoId)
        .eq('data', oggi)

      const { count: rapportiniSettimana } = await supabase
        .from('rapportini')
        .select('*', { count: 'exact', head: true })
        .eq('progetto_id', progettoId)
        .gte('data', inizioSettimana.toISOString().split('T')[0])

      const { data: tutteOre } = await supabase
        .from('ore_lavorate')
        .select('ore_ordinarie, ore_straordinario')

      const oreTot = (tutteOre || []).reduce((sum, o) => sum + (o.ore_ordinarie || 0), 0)
      const oreStra = (tutteOre || []).reduce((sum, o) => sum + (o.ore_straordinario || 0), 0)

      setTotali({
        ore_totali: oreTot + oreStra,
        ore_straordinario: oreStra,
        presenze_oggi: presenzeOggi || 0,
        rapportini_settimana: rapportiniSettimana || 0
      })

    } catch (error) {
      console.error('Error loading stats:', error)
    } finally {
      setLoading(false)
    }
  }

  const getProgressColor = (perc) => {
    if (perc >= 100) return 'bg-green-500'
    if (perc >= 75) return 'bg-blue-500'
    if (perc >= 50) return 'bg-yellow-500'
    return 'bg-gray-300'
  }

  const getCCIcon = (codice) => {
    if (codice?.includes('PIP')) return <Wrench className="text-orange-500" size={20} />
    if (codice?.includes('ELE') || codice?.includes('INS')) return <Zap className="text-yellow-500" size={20} />
    if (codice?.includes('EQP')) return <Package className="text-blue-500" size={20} />
    return <BarChart3 className="text-gray-500" size={20} />
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="animate-spin text-blue-600" size={32} />
      </div>
    )
  }

  return (
    <div className="p-4 space-y-4 pb-24">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-gray-800">Statistiche</h1>
        <p className="text-sm text-gray-500">{progetto?.nome}</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
          <div className="flex items-center gap-2 text-gray-500 mb-1">
            <Clock size={16} />
            <span className="text-xs">Ore Totali</span>
          </div>
          <p className="text-2xl font-bold text-gray-800">{totali.ore_totali.toLocaleString()}</p>
          <p className="text-xs text-orange-500">+{totali.ore_straordinario} straord.</p>
        </div>

        <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
          <div className="flex items-center gap-2 text-gray-500 mb-1">
            <Users size={16} />
            <span className="text-xs">Presenti Oggi</span>
          </div>
          <p className="text-2xl font-bold text-gray-800">{totali.presenze_oggi}</p>
        </div>

        <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
          <div className="flex items-center gap-2 text-gray-500 mb-1">
            <BarChart3 size={16} />
            <span className="text-xs">Rapportini Sett.</span>
          </div>
          <p className="text-2xl font-bold text-gray-800">{totali.rapportini_settimana}</p>
        </div>

        <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
          <div className="flex items-center gap-2 text-gray-500 mb-1">
            <TrendingUp size={16} />
            <span className="text-xs">Centri Costo</span>
          </div>
          <p className="text-2xl font-bold text-gray-800">{centriCosto.length}</p>
        </div>
      </div>

      {/* Progress per Centro di Costo */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-800">Avanzamento Centri di Costo</h2>
        </div>

        <div className="divide-y divide-gray-50">
          {centriCosto.map(cc => (
            <div key={cc.id} className="p-4">
              <button
                type="button"
                onClick={() => setExpandedCC(expandedCC === cc.id ? null : cc.id)}
                className="w-full text-left"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {getCCIcon(cc.codice)}
                    <div>
                      <p className="font-medium text-gray-800">{cc.codice}</p>
                      <p className="text-xs text-gray-500">{cc.nome}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-gray-800">{cc.perc_quantita}%</span>
                    {expandedCC === cc.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </div>
                </div>

                {/* Progress bar */}
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div 
                    className={`h-full ${getProgressColor(cc.perc_quantita)} transition-all`}
                    style={{ width: `${Math.min(cc.perc_quantita, 100)}%` }}
                  />
                </div>
              </button>

              {/* Dettagli espansi */}
              {expandedCC === cc.id && (
                <div className="mt-4 pt-4 border-t border-gray-100 grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-500">Quantità</p>
                    <p className="font-medium">
                      {cc.quantita_fatta.toLocaleString()} / {cc.budget_quantita?.toLocaleString() || '-'} {cc.unita_misura?.simbolo}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-500">Ore</p>
                    <p className="font-medium">
                      {cc.ore_spese.toLocaleString()} / {cc.budget_ore?.toLocaleString() || '-'} h
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-500">Resa</p>
                    <p className="font-medium">{cc.resa} {cc.unita_misura?.simbolo}/h</p>
                  </div>
                  <div>
                    <p className="text-gray-500">% Ore Usate</p>
                    <p className="font-medium">{cc.perc_ore}%</p>
                  </div>
                  {cc.budget_quantita_secondaria > 0 && (
                    <div className="col-span-2">
                      <p className="text-gray-500">Quantità Sec.</p>
                      <p className="font-medium">
                        {cc.quantita_sec_fatta.toLocaleString()} / {cc.budget_quantita_secondaria?.toLocaleString()} {cc.unita_misura_secondaria?.simbolo}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}

          {centriCosto.length === 0 && (
            <div className="p-8 text-center text-gray-500">
              Nessun centro di costo configurato
            </div>
          )}
        </div>
      </div>

      {/* Ore per Ditta */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-800">Ore per Ditta</h2>
        </div>

        <div className="divide-y divide-gray-50">
          {orePerDitta.map(ditta => (
            <div key={ditta.id} className="p-4 flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-800">{ditta.ragione_sociale}</p>
                <p className="text-xs text-gray-500">{ditta.persone} persone</p>
              </div>
              <div className="text-right">
                <p className="font-bold text-gray-800">{ditta.ore.toLocaleString()} h</p>
              </div>
            </div>
          ))}

          {orePerDitta.length === 0 && (
            <div className="p-8 text-center text-gray-500">
              Nessuna ora registrata
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
