import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { BarChart3, Clock, Users, Building, Loader2, ChevronDown, ChevronUp } from 'lucide-react'

export default function StatistichePage() {
  const { assegnazione, progetto } = useAuth()
  const [loading, setLoading] = useState(true)
  const [centriCosto, setCentriCosto] = useState([])
  const [orePerDitta, setOrePerDitta] = useState([])
  const [totali, setTotali] = useState({ ore: 0, straordinario: 0, presenze: 0 })
  const [expanded, setExpanded] = useState(null)

  useEffect(() => {
    loadStats()
  }, [])

  const loadStats = async () => {
    try {
      const progettoId = assegnazione.progetto_id

      // 1. Centri di Costo con progress
      const { data: ccData } = await supabase
        .from('centri_costo')
        .select('*, unita_misura:unita_misura_id(simbolo), unita_misura_secondaria:unita_misura_secondaria_id(simbolo)')
        .eq('progetto_id', progettoId)
        .eq('stato', 'attivo')
        .order('ordine')

      const ccWithStats = await Promise.all((ccData || []).map(async (cc) => {
        const { data: rapportini } = await supabase
          .from('rapportini')
          .select('id')
          .eq('centro_costo_id', cc.id)

        let oreOrd = 0, oreStra = 0
        if (rapportini?.length > 0) {
          const { data: ore } = await supabase
            .from('ore_lavorate')
            .select('ore_ordinarie, ore_straordinario')
            .in('rapportino_id', rapportini.map(r => r.id))
          oreOrd = (ore || []).reduce((s, o) => s + (o.ore_ordinarie || 0), 0)
          oreStra = (ore || []).reduce((s, o) => s + (o.ore_straordinario || 0), 0)
        }

        const { data: progress } = await supabase
          .from('progress_fisico')
          .select('quantita_fatta, quantita_secondaria_fatta')
          .eq('centro_costo_id', cc.id)
        const qtaFatta = (progress || []).reduce((s, p) => s + (p.quantita_fatta || 0), 0)
        const qtaSecFatta = (progress || []).reduce((s, p) => s + (p.quantita_secondaria_fatta || 0), 0)

        const oreTot = oreOrd + oreStra
        return {
          ...cc,
          ore_ordinarie: oreOrd,
          ore_straordinario: oreStra,
          ore_totali: oreTot,
          quantita_fatta: qtaFatta,
          quantita_sec_fatta: qtaSecFatta,
          perc: cc.budget_quantita ? Math.round((qtaFatta / cc.budget_quantita) * 100) : 0,
          perc_ore: cc.budget_ore ? Math.round((oreTot / cc.budget_ore) * 100) : 0,
          resa: oreTot > 0 ? (qtaFatta / oreTot).toFixed(2) : '-'
        }
      }))
      setCentriCosto(ccWithStats)

      // 2. Ore per Ditta
      const { data: ditte } = await supabase.from('ditte').select('id, ragione_sociale, codice').eq('attiva', true)
      
      const ditteConOre = await Promise.all((ditte || []).map(async (ditta) => {
        const { data: assegnazioni } = await supabase
          .from('assegnazioni_progetto')
          .select('persona_id')
          .eq('ditta_id', ditta.id)
          .eq('progetto_id', progettoId)
          .eq('attivo', true)

        const personaIds = (assegnazioni || []).map(a => a.persona_id)
        if (personaIds.length === 0) return { ...ditta, ore: 0, persone: 0 }

        const { data: oreData } = await supabase
          .from('ore_lavorate')
          .select('ore_ordinarie, ore_straordinario')
          .in('persona_id', personaIds)

        const oreTot = (oreData || []).reduce((s, o) => s + (o.ore_ordinarie || 0) + (o.ore_straordinario || 0), 0)
        return { ...ditta, ore: oreTot, persone: personaIds.length }
      }))
      setOrePerDitta(ditteConOre.filter(d => d.ore > 0 || d.persone > 0).sort((a, b) => b.ore - a.ore))

      // 3. Totali
      const oggi = new Date().toISOString().split('T')[0]
      const { count } = await supabase
        .from('presenze')
        .select('*', { count: 'exact', head: true })
        .eq('progetto_id', progettoId)
        .eq('data', oggi)

      const oreTotal = ccWithStats.reduce((s, cc) => s + cc.ore_ordinarie, 0)
      const oreStraTotal = ccWithStats.reduce((s, cc) => s + cc.ore_straordinario, 0)
      setTotali({ ore: oreTotal, straordinario: oreStraTotal, presenze: count || 0 })

    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="animate-spin text-blue-600" size={32} /></div>
  }

  return (
    <div className="p-4 space-y-4 pb-24">
      <div>
        <h1 className="text-xl font-bold text-gray-800">Statistiche</h1>
        <p className="text-sm text-gray-500">{progetto?.nome}</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-white rounded-xl p-3 border">
          <div className="flex items-center gap-1 text-gray-500 mb-1">
            <Clock size={14} />
            <span className="text-xs">Ore Tot.</span>
          </div>
          <p className="text-lg font-bold">{(totali.ore + totali.straordinario).toLocaleString()}</p>
          <p className="text-xs text-orange-500">+{totali.straordinario} str.</p>
        </div>
        <div className="bg-white rounded-xl p-3 border">
          <div className="flex items-center gap-1 text-gray-500 mb-1">
            <Users size={14} />
            <span className="text-xs">Oggi</span>
          </div>
          <p className="text-lg font-bold">{totali.presenze}</p>
        </div>
        <div className="bg-white rounded-xl p-3 border">
          <div className="flex items-center gap-1 text-gray-500 mb-1">
            <BarChart3 size={14} />
            <span className="text-xs">C.Costo</span>
          </div>
          <p className="text-lg font-bold">{centriCosto.length}</p>
        </div>
      </div>

      {/* Ore per Ditta */}
      {orePerDitta.length > 0 && (
        <div className="bg-white rounded-xl border overflow-hidden">
          <div className="p-3 border-b bg-gray-50">
            <h2 className="font-semibold flex items-center gap-2"><Building size={18} /> Ore per Ditta</h2>
          </div>
          <div className="divide-y">
            {orePerDitta.map(d => (
              <div key={d.id} className="p-3 flex justify-between items-center">
                <div>
                  <p className="font-medium text-sm">{d.ragione_sociale}</p>
                  <p className="text-xs text-gray-500">{d.persone} persone</p>
                </div>
                <p className="font-bold">{d.ore.toLocaleString()} h</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Progress Centri di Costo */}
      <div className="bg-white rounded-xl border overflow-hidden">
        <div className="p-3 border-b bg-gray-50">
          <h2 className="font-semibold">Avanzamento Centri di Costo</h2>
        </div>
        <div className="divide-y">
          {centriCosto.map(cc => (
            <div key={cc.id} className="p-3">
              <button type="button" onClick={() => setExpanded(expanded === cc.id ? null : cc.id)} className="w-full text-left">
                <div className="flex justify-between items-center mb-2">
                  <div>
                    <p className="font-medium text-sm">{cc.codice}</p>
                    <p className="text-xs text-gray-500">{cc.nome}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold">{cc.perc}%</span>
                    {expanded === cc.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </div>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div className={`h-full ${cc.perc >= 100 ? 'bg-green-500' : cc.perc >= 50 ? 'bg-blue-500' : 'bg-yellow-500'}`} style={{ width: `${Math.min(cc.perc, 100)}%` }} />
                </div>
              </button>
              {expanded === cc.id && (
                <div className="mt-3 pt-3 border-t grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <p className="text-gray-500 text-xs">Quantità</p>
                    <p className="font-medium">{cc.quantita_fatta} / {cc.budget_quantita || '-'} {cc.unita_misura?.simbolo}</p>
                  </div>
                  <div>
                    <p className="text-gray-500 text-xs">Ore</p>
                    <p className="font-medium">{cc.ore_totali} / {cc.budget_ore || '-'} h ({cc.perc_ore}%)</p>
                  </div>
                  {cc.budget_quantita_secondaria > 0 && (
                    <div>
                      <p className="text-gray-500 text-xs">Qta Secondaria</p>
                      <p className="font-medium">{cc.quantita_sec_fatta} / {cc.budget_quantita_secondaria} {cc.unita_misura_secondaria?.simbolo}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-gray-500 text-xs">Resa</p>
                    <p className="font-medium">{cc.resa} {cc.unita_misura?.simbolo}/h</p>
                  </div>
                </div>
              )}
            </div>
          ))}
          {centriCosto.length === 0 && <p className="p-6 text-center text-gray-500">Nessun centro di costo</p>}
        </div>
      </div>
    </div>
  )
}
