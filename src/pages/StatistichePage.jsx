import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { BarChart3, Clock, Users, TrendingUp, Loader2, ChevronDown, ChevronUp } from 'lucide-react'

export default function StatistichePage() {
  const { assegnazione, progetto } = useAuth()
  const [loading, setLoading] = useState(true)
  const [centriCosto, setCentriCosto] = useState([])
  const [totali, setTotali] = useState({ ore: 0, presenze: 0 })
  const [expanded, setExpanded] = useState(null)

  useEffect(() => {
    loadStats()
  }, [])

  const loadStats = async () => {
    try {
      const { data: ccData } = await supabase
        .from('centri_costo')
        .select('*, unita_misura:unita_misura_id(simbolo)')
        .eq('progetto_id', assegnazione.progetto_id)
        .eq('stato', 'attivo')
        .order('ordine')

      const ccWithStats = await Promise.all((ccData || []).map(async (cc) => {
        const { data: rapportini } = await supabase
          .from('rapportini')
          .select('id')
          .eq('centro_costo_id', cc.id)

        let oreTotali = 0
        if (rapportini?.length > 0) {
          const { data: ore } = await supabase
            .from('ore_lavorate')
            .select('ore_ordinarie, ore_straordinario')
            .in('rapportino_id', rapportini.map(r => r.id))
          oreTotali = (ore || []).reduce((s, o) => s + (o.ore_ordinarie || 0) + (o.ore_straordinario || 0), 0)
        }

        const { data: progress } = await supabase
          .from('progress_fisico')
          .select('quantita_fatta')
          .eq('centro_costo_id', cc.id)
        const qtaFatta = (progress || []).reduce((s, p) => s + (p.quantita_fatta || 0), 0)

        return {
          ...cc,
          ore_spese: oreTotali,
          quantita_fatta: qtaFatta,
          perc: cc.budget_quantita ? Math.round((qtaFatta / cc.budget_quantita) * 100) : 0,
          resa: oreTotali > 0 ? (qtaFatta / oreTotali).toFixed(2) : '-'
        }
      }))

      setCentriCosto(ccWithStats)

      const oggi = new Date().toISOString().split('T')[0]
      const { count } = await supabase
        .from('presenze')
        .select('*', { count: 'exact', head: true })
        .eq('progetto_id', assegnazione.progetto_id)
        .eq('data', oggi)

      const oreTotal = ccWithStats.reduce((s, cc) => s + cc.ore_spese, 0)
      setTotali({ ore: oreTotal, presenze: count || 0 })

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

      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white rounded-xl p-4 border">
          <div className="flex items-center gap-2 text-gray-500 mb-1">
            <Clock size={16} />
            <span className="text-xs">Ore Totali</span>
          </div>
          <p className="text-2xl font-bold">{totali.ore.toLocaleString()}</p>
        </div>
        <div className="bg-white rounded-xl p-4 border">
          <div className="flex items-center gap-2 text-gray-500 mb-1">
            <Users size={16} />
            <span className="text-xs">Presenti Oggi</span>
          </div>
          <p className="text-2xl font-bold">{totali.presenze}</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border overflow-hidden">
        <div className="p-4 border-b">
          <h2 className="font-semibold">Avanzamento Centri di Costo</h2>
        </div>
        <div className="divide-y">
          {centriCosto.map(cc => (
            <div key={cc.id} className="p-4">
              <button
                type="button"
                onClick={() => setExpanded(expanded === cc.id ? null : cc.id)}
                className="w-full text-left"
              >
                <div className="flex justify-between items-center mb-2">
                  <div>
                    <p className="font-medium">{cc.codice}</p>
                    <p className="text-xs text-gray-500">{cc.nome}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold">{cc.perc}%</span>
                    {expanded === cc.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </div>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div 
                    className={`h-full ${cc.perc >= 100 ? 'bg-green-500' : cc.perc >= 50 ? 'bg-blue-500' : 'bg-gray-300'}`}
                    style={{ width: `${Math.min(cc.perc, 100)}%` }}
                  />
                </div>
              </button>
              {expanded === cc.id && (
                <div className="mt-3 pt-3 border-t grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-gray-500">Quantità</p>
                    <p className="font-medium">{cc.quantita_fatta} / {cc.budget_quantita || '-'} {cc.unita_misura?.simbolo}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Ore</p>
                    <p className="font-medium">{cc.ore_spese} / {cc.budget_ore || '-'} h</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Resa</p>
                    <p className="font-medium">{cc.resa} {cc.unita_misura?.simbolo}/h</p>
                  </div>
                </div>
              )}
            </div>
          ))}
          {centriCosto.length === 0 && (
            <p className="p-8 text-center text-gray-500">Nessun centro di costo</p>
          )}
        </div>
      </div>
    </div>
  )
}
