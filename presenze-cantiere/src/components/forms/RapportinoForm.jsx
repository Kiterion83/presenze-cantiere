/**
 * Componente RapportinoForm
 * Form completo per inserimento presenze giornaliere
 */

import { useState, useEffect } from 'react'
import { Plus, Minus, UserMinus, Save, AlertCircle, CheckCircle } from 'lucide-react'
import Button from '../ui/Button'
import { SimpleCard } from '../ui/Card'
import Select, { Textarea } from '../ui/Select'
import Badge from '../ui/Badge'
import Modal from '../ui/Modal'
import { CENTRI_COSTO, CONFIG_ORARI } from '../../lib/constants'
import { oggi, calcolaOreTotali, formatOre } from '../../lib/utils'
import { getForeman, getOperaiByForeman, salvaRapportino } from '../../lib/supabase'

export default function RapportinoForm({ utente, onSaved }) {
  // State
  const [data, setData] = useState(oggi())
  const [foremanSelezionato, setForemanSelezionato] = useState('')
  const [centroCosto, setCentroCosto] = useState('')
  const [descrizione, setDescrizione] = useState('')
  const [note, setNote] = useState('')
  
  // Liste
  const [foreman, setForeman] = useState([])
  const [operai, setOperai] = useState([])
  
  // Presenze operai: { [operaioId]: { presente: bool, ore: number, straordinario: number } }
  const [presenze, setPresenze] = useState({})
  
  // UI State
  const [loading, setLoading] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [errore, setErrore] = useState('')
  const [successo, setSuccesso] = useState(false)
  
  // Modal trasferimento
  const [modalTrasferimento, setModalTrasferimento] = useState(null)

  // Carica foreman all'avvio
  useEffect(() => {
    loadForeman()
  }, [])

  // Carica operai quando cambia foreman
  useEffect(() => {
    if (foremanSelezionato) {
      loadOperai(foremanSelezionato)
    } else {
      setOperai([])
      setPresenze({})
    }
  }, [foremanSelezionato])

  // Loaders
  const loadForeman = async () => {
    setLoading(true)
    const { data } = await getForeman()
    setForeman(data || [])
    setLoading(false)
  }

  const loadOperai = async (foremanId) => {
    setLoading(true)
    const { data } = await getOperaiByForeman(foremanId)
    setOperai(data || [])
    
    // Inizializza presenze
    const nuovePresenze = {}
    data?.forEach(op => {
      nuovePresenze[op.id] = {
        presente: false,
        ore: CONFIG_ORARI.ORE_GIORNATA_STANDARD,
        straordinario: 0,
      }
    })
    setPresenze(nuovePresenze)
    setLoading(false)
  }

  // Handlers presenze
  const togglePresenza = (operaioId) => {
    setPresenze(prev => ({
      ...prev,
      [operaioId]: {
        ...prev[operaioId],
        presente: !prev[operaioId].presente,
      }
    }))
  }

  const setOre = (operaioId, ore) => {
    const val = Math.max(CONFIG_ORARI.MIN_ORE_ORDINARIE, 
                Math.min(CONFIG_ORARI.MAX_ORE_ORDINARIE, parseInt(ore) || 0))
    setPresenze(prev => ({
      ...prev,
      [operaioId]: { ...prev[operaioId], ore: val }
    }))
  }

  const setStraordinario = (operaioId, ore) => {
    const val = Math.max(CONFIG_ORARI.MIN_ORE_STRAORDINARIO,
                Math.min(CONFIG_ORARI.MAX_ORE_STRAORDINARIO, parseInt(ore) || 0))
    setPresenze(prev => ({
      ...prev,
      [operaioId]: { ...prev[operaioId], straordinario: val }
    }))
  }

  // Calcoli
  const operaiPresenti = operai.filter(op => presenze[op.id]?.presente)
  const totaleOreOrdinarie = operaiPresenti.reduce((sum, op) => sum + (presenze[op.id]?.ore || 0), 0)
  const totaleOreStraordinario = operaiPresenti.reduce((sum, op) => sum + (presenze[op.id]?.straordinario || 0), 0)
  const totaleOre = totaleOreOrdinarie + totaleOreStraordinario

  // Salvataggio
  const handleSalva = async () => {
    // Validazione
    if (!foremanSelezionato) {
      setErrore('Seleziona un foreman')
      return
    }
    if (!centroCosto) {
      setErrore('Seleziona un centro di costo')
      return
    }
    if (operaiPresenti.length === 0) {
      setErrore('Segna almeno un operaio come presente')
      return
    }
    if (!descrizione.trim()) {
      setErrore('Inserisci una descrizione delle attività')
      return
    }

    setSalvando(true)
    setErrore('')

    // Prepara dati rapportino
    const rapportino = {
      data,
      foreman_id: foremanSelezionato,
      centro_costo_id: centroCosto,
      descrizione: descrizione.trim(),
      note: note.trim(),
      stato: 'pending',
      presenze: operaiPresenti.map(op => ({
        operaio_id: op.id,
        ore_ordinarie: presenze[op.id].ore,
        ore_straordinario: presenze[op.id].straordinario,
      })),
    }

    const result = await salvaRapportino(rapportino)

    if (result.success) {
      setSuccesso(true)
      // Reset form dopo 2 secondi
      setTimeout(() => {
        setSuccesso(false)
        setDescrizione('')
        setNote('')
        // Reset presenze
        const reset = {}
        operai.forEach(op => {
          reset[op.id] = { presente: false, ore: 8, straordinario: 0 }
        })
        setPresenze(reset)
        onSaved?.()
      }, 2000)
    } else {
      setErrore(result.error || 'Errore durante il salvataggio')
    }

    setSalvando(false)
  }

  return (
    <div className="space-y-6">
      {/* Header con data */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h2 className="text-xl font-bold text-gray-900">Nuovo Rapportino</h2>
        <input
          type="date"
          value={data}
          onChange={(e) => setData(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Messaggi */}
      {errore && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
          <p className="text-red-700">{errore}</p>
        </div>
      )}

      {successo && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg flex items-start gap-3">
          <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
          <p className="text-green-700">Rapportino salvato con successo! In attesa di approvazione.</p>
        </div>
      )}

      {/* Selezione Foreman e Centro Costo */}
      <SimpleCard>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Select
            label="Foreman"
            value={foremanSelezionato}
            onChange={setForemanSelezionato}
            placeholder="Seleziona foreman..."
            options={foreman.map(f => ({ value: f.id.toString(), label: f.nome }))}
          />
          
          <Select
            label="Centro di Costo"
            value={centroCosto}
            onChange={setCentroCosto}
            placeholder="Seleziona fase..."
            options={CENTRI_COSTO.map(cc => ({
              value: cc.codice,
              label: `${cc.codice} - ${cc.fase}`,
            }))}
          />
        </div>
      </SimpleCard>

      {/* Lista Operai */}
      {operai.length > 0 && (
        <SimpleCard>
          <h3 className="font-semibold text-gray-900 mb-4">
            Squadra ({operai.length} operai)
          </h3>
          
          <div className="space-y-3">
            {operai.map(operaio => {
              const pres = presenze[operaio.id] || {}
              const oreTotali = calcolaOreTotali(pres.ore, pres.straordinario)
              
              return (
                <div
                  key={operaio.id}
                  className={`p-4 rounded-lg border-2 transition-colors ${
                    pres.presente
                      ? 'border-green-500 bg-green-50'
                      : 'border-gray-200 bg-gray-50'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                    {/* Info operaio + toggle */}
                    <div className="flex items-center gap-3 flex-1">
                      <button
                        onClick={() => togglePresenza(operaio.id)}
                        className={`w-10 h-10 rounded-lg flex items-center justify-center transition-colors ${
                          pres.presente
                            ? 'bg-green-500 text-white'
                            : 'bg-gray-300 text-gray-600'
                        }`}
                      >
                        {pres.presente ? '✓' : '○'}
                      </button>
                      <div>
                        <p className="font-medium text-gray-900">{operaio.nome}</p>
                        <p className="text-sm text-gray-500">{operaio.specializzazione}</p>
                      </div>
                    </div>

                    {/* Ore (solo se presente) */}
                    {pres.presente && (
                      <div className="flex items-center gap-4">
                        {/* Ore ordinarie */}
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-gray-500 w-12">Ord:</span>
                          <button
                            onClick={() => setOre(operaio.id, pres.ore - 1)}
                            className="w-8 h-8 rounded bg-gray-200 hover:bg-gray-300 flex items-center justify-center"
                          >
                            <Minus size={16} />
                          </button>
                          <span className="w-8 text-center font-medium">{pres.ore}</span>
                          <button
                            onClick={() => setOre(operaio.id, pres.ore + 1)}
                            className="w-8 h-8 rounded bg-gray-200 hover:bg-gray-300 flex items-center justify-center"
                          >
                            <Plus size={16} />
                          </button>
                        </div>

                        {/* Straordinario */}
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-gray-500 w-12">Str:</span>
                          <button
                            onClick={() => setStraordinario(operaio.id, pres.straordinario - 1)}
                            className="w-8 h-8 rounded bg-amber-100 hover:bg-amber-200 flex items-center justify-center"
                          >
                            <Minus size={16} />
                          </button>
                          <span className="w-8 text-center font-medium">{pres.straordinario}</span>
                          <button
                            onClick={() => setStraordinario(operaio.id, pres.straordinario + 1)}
                            className="w-8 h-8 rounded bg-amber-100 hover:bg-amber-200 flex items-center justify-center"
                          >
                            <Plus size={16} />
                          </button>
                        </div>

                        {/* Totale */}
                        <Badge variant={oreTotali > 8 ? 'warning' : 'success'}>
                          {formatOre(oreTotali)}
                        </Badge>

                        {/* Trasferimento */}
                        <button
                          onClick={() => setModalTrasferimento(operaio)}
                          className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg"
                          title="Trasferisci operaio"
                        >
                          <UserMinus size={18} />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </SimpleCard>
      )}

      {/* Descrizione e Note */}
      {operaiPresenti.length > 0 && (
        <SimpleCard>
          <div className="space-y-4">
            <Textarea
              label="Descrizione Attività"
              value={descrizione}
              onChange={setDescrizione}
              placeholder="Descrivi le attività svolte oggi..."
              rows={3}
              required
            />
            
            <Textarea
              label="Note (opzionale)"
              value={note}
              onChange={setNote}
              placeholder="Eventuali note aggiuntive..."
              rows={2}
            />
          </div>
        </SimpleCard>
      )}

      {/* Riepilogo e Salva */}
      {operaiPresenti.length > 0 && (
        <SimpleCard>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            {/* Riepilogo */}
            <div className="flex flex-wrap gap-4">
              <div>
                <p className="text-sm text-gray-500">Presenti</p>
                <p className="text-2xl font-bold text-gray-900">{operaiPresenti.length}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Ore Ordinarie</p>
                <p className="text-2xl font-bold text-gray-900">{totaleOreOrdinarie}h</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Straordinario</p>
                <p className="text-2xl font-bold text-amber-600">{totaleOreStraordinario}h</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Totale</p>
                <p className="text-2xl font-bold text-blue-600">{totaleOre}h</p>
              </div>
            </div>

            {/* Bottone salva */}
            <Button
              onClick={handleSalva}
              loading={salvando}
              size="lg"
              icon={<Save size={20} />}
            >
              Salva Rapportino
            </Button>
          </div>
        </SimpleCard>
      )}

      {/* Modal Trasferimento */}
      {modalTrasferimento && (
        <Modal
          isOpen={true}
          onClose={() => setModalTrasferimento(null)}
          title={`Trasferisci ${modalTrasferimento.nome}`}
          size="sm"
        >
          <p className="text-gray-600 mb-4">
            Seleziona il nuovo foreman a cui trasferire l'operaio.
          </p>
          <Select
            label="Nuovo Foreman"
            value=""
            onChange={(val) => {
              // TODO: implementare trasferimento
              console.log('Trasferisci a:', val)
              setModalTrasferimento(null)
            }}
            placeholder="Seleziona..."
            options={foreman
              .filter(f => f.id.toString() !== foremanSelezionato)
              .map(f => ({ value: f.id.toString(), label: f.nome }))}
          />
        </Modal>
      )}
    </div>
  )
}
