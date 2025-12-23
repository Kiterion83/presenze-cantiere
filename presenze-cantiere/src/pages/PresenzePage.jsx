/**
 * Pagina PresenzePage
 * Matrice presenze mensile con calendario
 */

import { useState, useEffect } from 'react'
import { ChevronLeft, ChevronRight, Users, Clock, Calendar } from 'lucide-react'
import { SimpleCard, StatCard } from '../components/ui/Card'
import Badge from '../components/ui/Badge'
import Modal from '../components/ui/Modal'
import Button from '../components/ui/Button'
import { MESI, GIORNI_SETTIMANA } from '../lib/constants'
import { giorniDelMese, formatData, oggi } from '../lib/utils'

// Dati mock per demo
const OPERAI_MOCK = [
  { id: 1, nome: 'Franco Neri', specializzazione: 'Saldatore' },
  { id: 2, nome: 'Antonio Gialli', specializzazione: 'Tubista' },
  { id: 3, nome: 'Marco Blu', specializzazione: 'Elettricista' },
  { id: 4, nome: 'Paolo Viola', specializzazione: 'Meccanico' },
  { id: 5, nome: 'Luca Verde', specializzazione: 'Carpentiere' },
]

// Genera presenze mock casuali
const generaPresenzeMock = (operai, anno, mese) => {
  const presenze = {}
  const giorni = giorniDelMese(anno, mese)
  
  operai.forEach(op => {
    presenze[op.id] = {}
    giorni.forEach(g => {
      const giorno = g.getDay()
      // Salta domenica
      if (giorno === 0) return
      
      // Random presenza (80% probabilità)
      if (Math.random() > 0.2) {
        const ore = 8
        const straordinario = Math.random() > 0.7 ? Math.floor(Math.random() * 3) + 1 : 0
        presenze[op.id][g.toISOString().split('T')[0]] = {
          ore,
          straordinario,
          totale: ore + straordinario,
        }
      }
    })
  })
  
  return presenze
}

export default function PresenzePage({ utente }) {
  // State
  const [anno, setAnno] = useState(new Date().getFullYear())
  const [mese, setMese] = useState(new Date().getMonth())
  const [presenze, setPresenze] = useState({})
  const [modalGiorno, setModalGiorno] = useState(null)

  // Carica presenze quando cambia mese
  useEffect(() => {
    const dati = generaPresenzeMock(OPERAI_MOCK, anno, mese)
    setPresenze(dati)
  }, [anno, mese])

  // Navigazione mese
  const mesePrecedente = () => {
    if (mese === 0) {
      setMese(11)
      setAnno(anno - 1)
    } else {
      setMese(mese - 1)
    }
  }

  const meseProssimo = () => {
    if (mese === 11) {
      setMese(0)
      setAnno(anno + 1)
    } else {
      setMese(mese + 1)
    }
  }

  // Giorni del mese corrente
  const giorni = giorniDelMese(anno, mese)

  // Calcola statistiche
  const calcolaStats = () => {
    let totaleOre = 0
    let giorniLavorati = 0
    const giorniSet = new Set()

    Object.values(presenze).forEach(opPresenze => {
      Object.entries(opPresenze).forEach(([data, p]) => {
        totaleOre += p.totale
        giorniSet.add(data)
      })
    })

    giorniLavorati = giorniSet.size

    return { totaleOre, giorniLavorati }
  }

  const stats = calcolaStats()

  // Colore cella in base alle ore
  const getColoreCella = (ore) => {
    if (!ore) return 'bg-gray-100'
    if (ore > 8) return 'bg-amber-200'
    return 'bg-green-200'
  }

  // Calcola totali per operaio
  const getTotaliOperaio = (operaioId) => {
    const opPresenze = presenze[operaioId] || {}
    let giorni = 0
    let ore = 0
    
    Object.values(opPresenze).forEach(p => {
      giorni++
      ore += p.totale
    })
    
    return { giorni, ore }
  }

  // Calcola presenti per giorno
  const getPresentiGiorno = (data) => {
    const dataStr = data.toISOString().split('T')[0]
    let count = 0
    
    Object.values(presenze).forEach(opPresenze => {
      if (opPresenze[dataStr]) count++
    })
    
    return count
  }

  return (
    <div className="space-y-6">
      {/* Header con navigazione mese */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h2 className="text-xl font-bold text-gray-900">Matrice Presenze</h2>
        
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={mesePrecedente}>
            <ChevronLeft size={20} />
          </Button>
          <span className="px-4 py-2 font-semibold text-gray-900 min-w-[180px] text-center">
            {MESI[mese]} {anno}
          </span>
          <Button variant="secondary" size="sm" onClick={meseProssimo}>
            <ChevronRight size={20} />
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          title="Operai"
          value={OPERAI_MOCK.length}
          icon={<Users size={24} />}
        />
        <StatCard
          title="Giorni Lavorati"
          value={stats.giorniLavorati}
          icon={<Calendar size={24} />}
        />
        <StatCard
          title="Ore Totali"
          value={`${stats.totaleOre}h`}
          icon={<Clock size={24} />}
        />
        <StatCard
          title="Media Ore/Giorno"
          value={stats.giorniLavorati > 0 ? `${Math.round(stats.totaleOre / stats.giorniLavorati)}h` : '-'}
          icon={<Clock size={24} />}
        />
      </div>

      {/* Legenda */}
      <div className="flex flex-wrap gap-4 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-green-200" />
          <span>≤ 8 ore</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-amber-200" />
          <span>&gt; 8 ore (straordinario)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-gray-100" />
          <span>Assente</span>
        </div>
      </div>

      {/* Matrice */}
      <SimpleCard className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr>
              <th className="sticky left-0 bg-white px-3 py-2 text-left font-semibold text-gray-900 border-b min-w-[150px]">
                Operaio
              </th>
              {giorni.map(g => {
                const isOggi = g.toISOString().split('T')[0] === oggi()
                const isDomenica = g.getDay() === 0
                return (
                  <th
                    key={g.toISOString()}
                    className={`px-1 py-2 text-center font-medium border-b min-w-[40px] ${
                      isOggi ? 'bg-blue-100' : isDomenica ? 'bg-gray-50' : ''
                    }`}
                  >
                    <div className="text-xs text-gray-500">
                      {GIORNI_SETTIMANA[g.getDay()]}
                    </div>
                    <div className={isOggi ? 'text-blue-600 font-bold' : ''}>
                      {g.getDate()}
                    </div>
                  </th>
                )
              })}
              <th className="px-3 py-2 text-center font-semibold text-gray-900 border-b border-l bg-gray-50">
                Giorni
              </th>
              <th className="px-3 py-2 text-center font-semibold text-gray-900 border-b bg-gray-50">
                Ore
              </th>
            </tr>
          </thead>
          <tbody>
            {OPERAI_MOCK.map(operaio => {
              const totali = getTotaliOperaio(operaio.id)
              return (
                <tr key={operaio.id} className="hover:bg-gray-50">
                  <td className="sticky left-0 bg-white px-3 py-2 border-b">
                    <div className="font-medium text-gray-900">{operaio.nome}</div>
                    <div className="text-xs text-gray-500">{operaio.specializzazione}</div>
                  </td>
                  {giorni.map(g => {
                    const dataStr = g.toISOString().split('T')[0]
                    const p = presenze[operaio.id]?.[dataStr]
                    const isDomenica = g.getDay() === 0
                    const isOggi = dataStr === oggi()
                    
                    return (
                      <td
                        key={dataStr}
                        className={`px-1 py-2 text-center border-b ${
                          isOggi ? 'bg-blue-50' : ''
                        }`}
                      >
                        {!isDomenica && (
                          <button
                            onClick={() => setModalGiorno({ data: g, operaio, presenza: p })}
                            className={`w-8 h-8 rounded text-xs font-medium transition-colors hover:ring-2 hover:ring-blue-400 ${
                              getColoreCella(p?.totale)
                            }`}
                          >
                            {p ? p.totale : '-'}
                          </button>
                        )}
                      </td>
                    )
                  })}
                  <td className="px-3 py-2 text-center border-b border-l bg-gray-50 font-medium">
                    {totali.giorni}
                  </td>
                  <td className="px-3 py-2 text-center border-b bg-gray-50 font-medium">
                    {totali.ore}h
                  </td>
                </tr>
              )
            })}
          </tbody>
          <tfoot>
            <tr className="bg-gray-100">
              <td className="sticky left-0 bg-gray-100 px-3 py-2 font-semibold">
                Presenti/giorno
              </td>
              {giorni.map(g => {
                const isDomenica = g.getDay() === 0
                const presenti = getPresentiGiorno(g)
                return (
                  <td
                    key={g.toISOString()}
                    className="px-1 py-2 text-center font-medium"
                  >
                    {!isDomenica && presenti > 0 ? presenti : '-'}
                  </td>
                )
              })}
              <td className="px-3 py-2 border-l" />
              <td className="px-3 py-2" />
            </tr>
          </tfoot>
        </table>
      </SimpleCard>

      {/* Modal dettaglio giorno */}
      {modalGiorno && (
        <Modal
          isOpen={true}
          onClose={() => setModalGiorno(null)}
          title={`Dettaglio ${formatData(modalGiorno.data, { weekday: 'long', day: 'numeric', month: 'long' })}`}
          size="sm"
        >
          <div className="space-y-4">
            <div>
              <p className="text-sm text-gray-500">Operaio</p>
              <p className="font-semibold">{modalGiorno.operaio.nome}</p>
              <p className="text-sm text-gray-500">{modalGiorno.operaio.specializzazione}</p>
            </div>
            
            {modalGiorno.presenza ? (
              <>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">Ordinarie</p>
                    <p className="text-xl font-bold">{modalGiorno.presenza.ore}h</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Straordinario</p>
                    <p className="text-xl font-bold text-amber-600">{modalGiorno.presenza.straordinario}h</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Totale</p>
                    <p className="text-xl font-bold text-blue-600">{modalGiorno.presenza.totale}h</p>
                  </div>
                </div>
                <Badge variant="success" dot>Presente</Badge>
              </>
            ) : (
              <Badge variant="default" dot>Assente</Badge>
            )}
          </div>
        </Modal>
      )}
    </div>
  )
}
