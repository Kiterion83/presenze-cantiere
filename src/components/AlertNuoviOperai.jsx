import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'

/**
 * Widget che mostra alert per operai senza squadra assegnata
 * Da includere nella HomePage o nel Layout
 */
export default function AlertNuoviOperai() {
  const { progettoId, isAtLeast } = useAuth()
  const [operaiSenzaSquadra, setOperaiSenzaSquadra] = useState([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [squadre, setSquadre] = useState([])
  const [selectedOperaio, setSelectedOperaio] = useState(null)
  const [selectedSquadra, setSelectedSquadra] = useState('')
  const [saving, setSaving] = useState(false)

  // Carica operai senza squadra
  useEffect(() => {
    if (!progettoId || !isAtLeast('foreman')) return
    loadOperaiSenzaSquadra()
  }, [progettoId])

  const loadOperaiSenzaSquadra = async () => {
    try {
      // Trova tutte le persone assegnate al progetto
      const { data: assegnazioni } = await supabase
        .from('assegnazioni')
        .select(`
          persona_id,
          persona:persone(id, nome, cognome),
          created_at
        `)
        .eq('progetto_id', progettoId)
        .eq('attivo', true)

      if (!assegnazioni || assegnazioni.length === 0) {
        setOperaiSenzaSquadra([])
        setLoading(false)
        return
      }

      const personaIds = assegnazioni.map(a => a.persona_id)

      // Trova chi ha già una squadra
      const { data: conSquadra } = await supabase
        .from('assegnazioni_squadra')
        .select('persona_id')
        .in('persona_id', personaIds)
        .eq('attivo', true)

      const idsConSquadra = new Set(conSquadra?.map(s => s.persona_id) || [])

      // Filtra chi non ha squadra
      const senzaSquadra = assegnazioni
        .filter(a => !idsConSquadra.has(a.persona_id) && a.persona)
        .map(a => ({
          ...a.persona,
          data_assegnazione: a.created_at
        }))
        .sort((a, b) => new Date(b.data_assegnazione) - new Date(a.data_assegnazione))

      setOperaiSenzaSquadra(senzaSquadra)

      // Carica squadre per assegnazione rapida
      const { data: sq } = await supabase
        .from('squadre')
        .select('id, nome')
        .eq('progetto_id', progettoId)
        .eq('attivo', true)
        .order('nome')

      setSquadre(sq || [])
    } catch (e) {
      console.error('Errore caricamento operai senza squadra:', e)
    } finally {
      setLoading(false)
    }
  }

  // Assegna operaio a squadra
  const handleAssegna = async () => {
    if (!selectedOperaio || !selectedSquadra) return

    setSaving(true)
    try {
      const { error } = await supabase
        .from('assegnazioni_squadra')
        .insert({
          squadra_id: selectedSquadra,
          persona_id: selectedOperaio.id,
          ruolo_squadra: 'operaio',
          attivo: true
        })

      if (error) throw error

      // Rimuovi dalla lista locale
      setOperaiSenzaSquadra(prev => prev.filter(o => o.id !== selectedOperaio.id))
      setShowModal(false)
      setSelectedOperaio(null)
      setSelectedSquadra('')
    } catch (e) {
      alert('Errore: ' + e.message)
    } finally {
      setSaving(false)
    }
  }

  // Apri modal assegnazione
  const openAssegnaModal = (operaio) => {
    setSelectedOperaio(operaio)
    setSelectedSquadra('')
    setShowModal(true)
  }

  // Non mostrare se non hai permessi o se non ci sono operai
  if (!isAtLeast('foreman') || loading || operaiSenzaSquadra.length === 0) {
    return null
  }

  return (
    <>
      {/* Alert Banner */}
      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-6">
        <div className="flex items-start gap-3">
          <div className="text-2xl">⚠️</div>
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-amber-800">
                {operaiSenzaSquadra.length} {operaiSenzaSquadra.length === 1 ? 'operaio' : 'operai'} senza squadra
              </h3>
              <button
                onClick={() => setExpanded(!expanded)}
                className="text-amber-600 text-sm font-medium hover:text-amber-700"
              >
                {expanded ? 'Nascondi ▲' : 'Mostra ▼'}
              </button>
            </div>
            <p className="text-sm text-amber-700 mt-1">
              Nuovi operai registrati tramite QR code da assegnare a una squadra
            </p>
            
            {/* Lista espandibile */}
            {expanded && (
              <div className="mt-4 space-y-2">
                {operaiSenzaSquadra.map(operaio => (
                  <div 
                    key={operaio.id}
                    className="flex items-center justify-between bg-white rounded-xl p-3 border border-amber-100"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-amber-100 text-amber-700 rounded-full flex items-center justify-center font-bold">
                        {operaio.nome[0]}{operaio.cognome[0]}
                      </div>
                      <div>
                        <p className="font-medium text-gray-800">
                          {operaio.cognome} {operaio.nome}
                        </p>
                        <p className="text-xs text-gray-500">
                          Registrato: {new Date(operaio.data_assegnazione).toLocaleDateString('it-IT')}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => openAssegnaModal(operaio)}
                      className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors"
                    >
                      Assegna
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Link rapido */}
            {!expanded && (
              <div className="mt-3 flex gap-2">
                <button
                  onClick={() => setExpanded(true)}
                  className="px-4 py-2 bg-amber-100 text-amber-700 rounded-xl text-sm font-medium hover:bg-amber-200 transition-colors"
                >
                  👥 Vedi lista
                </button>
                <Link
                  to="/team"
                  className="px-4 py-2 bg-white border border-amber-200 text-amber-700 rounded-xl text-sm font-medium hover:bg-amber-50 transition-colors"
                >
                  Vai al Team →
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal Assegnazione */}
      {showModal && selectedOperaio && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl">
            <div className="p-6 border-b">
              <h3 className="text-xl font-bold text-gray-800">
                👷 Assegna a Squadra
              </h3>
            </div>
            
            <div className="p-6">
              {/* Info operaio */}
              <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl mb-6">
                <div className="w-12 h-12 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center text-xl font-bold">
                  {selectedOperaio.nome[0]}{selectedOperaio.cognome[0]}
                </div>
                <div>
                  <p className="font-bold text-gray-800">
                    {selectedOperaio.cognome} {selectedOperaio.nome}
                  </p>
                  <p className="text-sm text-gray-500">Nuovo operaio</p>
                </div>
              </div>

              {/* Selezione squadra */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Seleziona Squadra
                </label>
                {squadre.length === 0 ? (
                  <p className="text-gray-500 text-sm">
                    Nessuna squadra disponibile. <Link to="/team" className="text-blue-600">Crea una squadra</Link> prima.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {squadre.map(sq => (
                      <button
                        key={sq.id}
                        onClick={() => setSelectedSquadra(sq.id)}
                        className={`w-full p-4 rounded-xl text-left transition-all ${
                          selectedSquadra === sq.id
                            ? 'bg-blue-50 border-2 border-blue-500'
                            : 'bg-gray-50 border-2 border-transparent hover:bg-gray-100'
                        }`}
                      >
                        <span className="font-medium text-gray-800">{sq.nome}</span>
                        {selectedSquadra === sq.id && (
                          <span className="float-right text-blue-600">✓</span>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="p-6 border-t bg-gray-50 rounded-b-2xl flex gap-3 justify-end">
              <button
                onClick={() => {
                  setShowModal(false)
                  setSelectedOperaio(null)
                }}
                className="px-6 py-2 text-gray-600 hover:bg-gray-200 rounded-xl transition-colors"
              >
                Annulla
              </button>
              <button
                onClick={handleAssegna}
                disabled={!selectedSquadra || saving}
                className="px-6 py-2 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
              >
                {saving ? 'Salvataggio...' : '✅ Conferma'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
