import { useState, useEffect } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function QRCheckinPage() {
  const { progettoId } = useParams()
  const [searchParams] = useSearchParams()
  const areaId = searchParams.get('area')
  
  // Stati
  const [loading, setLoading] = useState(true)
  const [progetto, setProgetto] = useState(null)
  const [area, setArea] = useState(null)
  const [persone, setPersone] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedPersona, setSelectedPersona] = useState(null)
  const [showNuovo, setShowNuovo] = useState(false)
  const [nuovoForm, setNuovoForm] = useState({ nome: '', cognome: '' })
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(null)
  const [error, setError] = useState(null)
  const [gpsPosition, setGpsPosition] = useState(null)
  const [gpsError, setGpsError] = useState(null)

  // Carica progetto, area e persone
  useEffect(() => {
    loadData()
    requestGPS()
  }, [progettoId, areaId])

  const loadData = async () => {
    try {
      // Carica progetto
      const { data: proj, error: projErr } = await supabase
        .from('progetti')
        .select('id, nome, codice, indirizzo')
        .eq('id', progettoId)
        .single()
      
      if (projErr) throw new Error('Progetto non trovato')
      setProgetto(proj)

      // Carica area se specificata
      if (areaId) {
        // Prova prima qr_codes
        const { data: qrCode, error: qrErr } = await supabase
          .from('qr_codes')
          .select('*')
          .eq('id', areaId)
          .single()

        if (!qrErr && qrCode) {
          setArea({
            id: qrCode.id,
            nome: qrCode.nome || qrCode.descrizione,
            gate: qrCode.gate || qrCode.posizione,
            codice: qrCode.codice,
            tipo: 'qr_code'
          })
        } else {
          // Fallback: prova zone_gps
          const { data: zona, error: zoneErr } = await supabase
            .from('zone_gps')
            .select('*')
            .eq('id', areaId)
            .single()

          if (!zoneErr && zona) {
            setArea({
              id: zona.id,
              nome: zona.nome,
              gate: zona.gate || zona.descrizione,
              codice: zona.codice,
              tipo: 'zona'
            })
          }
        }
      }

      // Carica persone assegnate al progetto
      const { data: assegnazioni } = await supabase
        .from('assegnazioni_progetto')
        .select(`
          persona:persone(id, nome, cognome)
        `)
        .eq('progetto_id', progettoId)
        .eq('attivo', true)

      const personeUniche = assegnazioni
        ?.map(a => a.persona)
        .filter(Boolean)
        .sort((a, b) => a.cognome.localeCompare(b.cognome)) || []
      
      setPersone(personeUniche)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const requestGPS = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setGpsPosition({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            accuracy: pos.coords.accuracy
          })
        },
        (err) => {
          setGpsError('GPS non disponibile')
          console.warn('GPS error:', err)
        },
        { enableHighAccuracy: true, timeout: 10000 }
      )
    }
  }

  // Filtra persone per ricerca
  const filteredPersone = persone.filter(p => {
    const fullName = `${p.nome} ${p.cognome}`.toLowerCase()
    const reverseName = `${p.cognome} ${p.nome}`.toLowerCase()
    const search = searchTerm.toLowerCase()
    return fullName.includes(search) || reverseName.includes(search)
  })

  // Seleziona persona dalla lista
  const handleSelectPersona = (persona) => {
    setSelectedPersona(persona)
    setSearchTerm(`${persona.cognome} ${persona.nome}`)
  }

  // Costruisce i dati extra per la presenza
  const getPresenzaData = () => {
    const baseData = {
      progetto_id: progettoId,
      latitudine_checkin: gpsPosition?.lat || null,
      longitudine_checkin: gpsPosition?.lng || null,
      accuracy_checkin: gpsPosition?.accuracy || null
    }

    // Aggiungi info area se presente
    if (area) {
      // Prova a usare campi specifici se esistono nella tabella
      return {
        ...baseData,
        zona_id: area.tipo === 'zona' ? area.id : null,
        qr_code_id: area.tipo === 'qr_code' ? area.id : null,
        note_checkin: `Ingresso: ${area.nome}${area.gate ? ' - ' + area.gate : ''}`
      }
    }

    return baseData
  }

  // Check-in per persona esistente
  const handleCheckin = async () => {
    if (!selectedPersona) return
    
    setSaving(true)
    setError(null)
    
    try {
      const now = new Date()
      const oggi = now.toISOString().split('T')[0]
      const oraCheckin = now.toTimeString().slice(0, 5)

      // Verifica se già presente oggi
      const { data: existing } = await supabase
        .from('presenze')
        .select('id')
        .eq('progetto_id', progettoId)
        .eq('persona_id', selectedPersona.id)
        .eq('data', oggi)
        .single()

      if (existing) {
        setError('Hai gia fatto check-in oggi!')
        setSaving(false)
        return
      }

      // Prepara dati presenza
      const presenzaData = {
        ...getPresenzaData(),
        persona_id: selectedPersona.id,
        data: oggi,
        ora_checkin: oraCheckin,
        metodo_checkin: 'qr_code'
      }

      // Rimuovi campi null che potrebbero non esistere nella tabella
      Object.keys(presenzaData).forEach(key => {
        if (presenzaData[key] === null || presenzaData[key] === undefined) {
          delete presenzaData[key]
        }
      })

      // Crea presenza
      const { error: insErr } = await supabase
        .from('presenze')
        .insert(presenzaData)

      if (insErr) {
        // Se fallisce per campo mancante, riprova senza campi extra
        if (insErr.message.includes('zona_id') || insErr.message.includes('qr_code_id')) {
          const { error: retryErr } = await supabase
            .from('presenze')
            .insert({
              progetto_id: progettoId,
              persona_id: selectedPersona.id,
              data: oggi,
              ora_checkin: oraCheckin,
              latitudine_checkin: gpsPosition?.lat || null,
              longitudine_checkin: gpsPosition?.lng || null,
              accuracy_checkin: gpsPosition?.accuracy || null,
              metodo_checkin: 'qr_code'
            })
          if (retryErr) throw retryErr
        } else {
          throw insErr
        }
      }

      setSuccess({
        nome: `${selectedPersona.nome} ${selectedPersona.cognome}`,
        ora: oraCheckin,
        area: area?.nome
      })
    } catch (e) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  // Registra nuovo e check-in
  const handleNuovoCheckin = async () => {
    if (!nuovoForm.nome.trim() || !nuovoForm.cognome.trim()) {
      setError('Inserisci nome e cognome')
      return
    }

    setSaving(true)
    setError(null)

    try {
      const now = new Date()
      const oggi = now.toISOString().split('T')[0]
      const oraCheckin = now.toTimeString().slice(0, 5)

      // Crea nuova persona
      const { data: nuovaPersona, error: persErr } = await supabase
        .from('persone')
        .insert({
          nome: nuovoForm.nome.trim(),
          cognome: nuovoForm.cognome.trim(),
          attivo: true
        })
        .select()
        .single()

      if (persErr) throw persErr

      // Crea assegnazione al progetto
      const { error: assErr } = await supabase
        .from('assegnazioni_progetto')
        .insert({
          persona_id: nuovaPersona.id,
          progetto_id: progettoId,
          ruolo: 'helper',
          attivo: true,
          data_inizio: oggi
        })

      if (assErr) throw assErr

      // Crea presenza
      const { error: presErr } = await supabase
        .from('presenze')
        .insert({
          progetto_id: progettoId,
          persona_id: nuovaPersona.id,
          data: oggi,
          ora_checkin: oraCheckin,
          latitudine_checkin: gpsPosition?.lat || null,
          longitudine_checkin: gpsPosition?.lng || null,
          accuracy_checkin: gpsPosition?.accuracy || null,
          metodo_checkin: 'qr_code_new'
        })

      if (presErr) throw presErr

      // === NOTIFICA: Nuovo operaio da assegnare a squadra ===
      try {
        await supabase
          .from('notifiche')
          .insert({
            progetto_id: progettoId,
            tipo: 'nuovo_operaio',
            titolo: 'Nuovo operaio registrato',
            messaggio: `${nuovoForm.cognome.trim()} ${nuovoForm.nome.trim()} si e registrato tramite QR code${area ? ' da ' + area.nome : ''}. Da assegnare a una squadra.`,
            priorita: 'alta',
            link: '/team',
            letta: false,
            metadata: JSON.stringify({
              persona_id: nuovaPersona.id,
              nome: nuovoForm.nome.trim(),
              cognome: nuovoForm.cognome.trim(),
              data_registrazione: oggi,
              ora_registrazione: oraCheckin,
              area: area?.nome || null
            })
          })
      } catch (notifErr) {
        console.warn('Notifica non creata:', notifErr)
      }

      setSuccess({
        nome: `${nuovoForm.nome} ${nuovoForm.cognome}`,
        ora: oraCheckin,
        nuovo: true,
        area: area?.nome
      })
    } catch (e) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  // Reset per nuovo check-in
  const handleReset = () => {
    setSuccess(null)
    setError(null)
    setSelectedPersona(null)
    setSearchTerm('')
    setShowNuovo(false)
    setNuovoForm({ nome: '', cognome: '' })
  }

  // Loading
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-500">Caricamento...</p>
        </div>
      </div>
    )
  }

  // Errore progetto
  if (error && !progetto) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-red-50 to-white flex items-center justify-center p-4">
        <div className="text-center">
          <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-4xl">!</span>
          </div>
          <h1 className="text-2xl font-bold text-red-800 mb-2">Errore</h1>
          <p className="text-red-600">{error}</p>
        </div>
      </div>
    )
  }

  // Successo
  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-green-50 to-white flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-xl p-8 max-w-md w-full text-center">
          <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-12 h-12 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-green-800 mb-2">Check-in Completato!</h1>
          <p className="text-lg text-gray-700 mb-1">{success.nome}</p>
          <p className="text-gray-500 mb-2">Ore {success.ora}</p>
          {success.area && (
            <p className="text-sm text-blue-600 bg-blue-50 px-3 py-1 rounded-full inline-block mb-4">
              {success.area}
            </p>
          )}
          {success.nuovo && (
            <div className="bg-amber-50 text-amber-700 text-sm p-3 rounded-xl mb-6">
              Sei stato registrato come nuovo! Un responsabile ti assegnera a una squadra.
            </div>
          )}
          <button
            onClick={handleReset}
            className="w-full py-4 bg-green-600 text-white rounded-2xl font-semibold hover:bg-green-700 transition-colors"
          >
            Nuovo Check-in
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="max-w-md mx-auto px-4 py-6">
          <div className="text-center">
            <div className="text-4xl mb-2">
              {area ? '📍' : '🏗️'}
            </div>
            <h1 className="text-2xl font-bold text-gray-800">
              {area ? area.nome : 'Check-in Cantiere'}
            </h1>
            {area?.gate && (
              <p className="text-gray-500">{area.gate}</p>
            )}
            <p className="text-blue-600 font-medium mt-1">{progetto?.nome}</p>
            {area?.codice && (
              <span className="inline-block mt-2 px-3 py-1 bg-gray-100 rounded-full text-xs font-mono text-gray-600">
                {area.codice}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-md mx-auto px-4 py-6">
        {/* GPS Status */}
        <div className={`mb-4 px-4 py-2 rounded-xl text-sm flex items-center gap-2 ${
          gpsPosition ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'
        }`}>
          <span>{gpsPosition ? 'GPS attivo' : (gpsError || 'Rilevamento GPS...')}</span>
        </div>

        {/* Errore */}
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700">
            {error}
          </div>
        )}

        {/* Form Check-in o Nuovo */}
        {!showNuovo ? (
          <>
            {/* Cerca persona */}
            <div className="bg-white rounded-2xl shadow-sm border p-4 mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Cerca il tuo nome
              </label>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value)
                  setSelectedPersona(null)
                }}
                placeholder="Cognome Nome..."
                className="w-full px-4 py-3 border rounded-xl text-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                autoComplete="off"
              />

              {/* Lista risultati */}
              {searchTerm.length >= 2 && !selectedPersona && (
                <div className="mt-3 max-h-60 overflow-y-auto">
                  {filteredPersone.length === 0 ? (
                    <p className="text-gray-500 text-center py-4">Nessun risultato</p>
                  ) : (
                    filteredPersone.map(p => (
                      <button
                        key={p.id}
                        onClick={() => handleSelectPersona(p)}
                        className="w-full text-left px-4 py-3 hover:bg-blue-50 rounded-xl transition-colors"
                      >
                        <span className="font-medium">{p.cognome}</span>{' '}
                        <span className="text-gray-600">{p.nome}</span>
                      </button>
                    ))
                  )}
                </div>
              )}

              {/* Persona selezionata */}
              {selectedPersona && (
                <div className="mt-3 p-3 bg-blue-50 rounded-xl flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold">
                    {selectedPersona.cognome[0]}
                  </div>
                  <div>
                    <p className="font-medium">{selectedPersona.cognome} {selectedPersona.nome}</p>
                    <p className="text-sm text-blue-600">Pronto per il check-in</p>
                  </div>
                </div>
              )}
            </div>

            {/* Bottone Check-in */}
            <button
              onClick={handleCheckin}
              disabled={!selectedPersona || saving}
              className={`w-full py-4 rounded-2xl font-bold text-lg transition-all ${
                selectedPersona && !saving
                  ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-lg'
                  : 'bg-gray-200 text-gray-400 cursor-not-allowed'
              }`}
            >
              {saving ? 'Check-in in corso...' : 'Conferma Check-in'}
            </button>

            {/* Link nuovo */}
            <div className="text-center mt-6">
              <button
                onClick={() => setShowNuovo(true)}
                className="text-blue-600 font-medium hover:underline"
              >
                Sono nuovo, non trovo il mio nome
              </button>
            </div>
          </>
        ) : (
          <>
            {/* Form nuovo */}
            <div className="bg-white rounded-2xl shadow-sm border p-4 mb-4">
              <h2 className="font-semibold text-gray-800 mb-4">Registrazione Nuovo</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nome</label>
                  <input
                    type="text"
                    value={nuovoForm.nome}
                    onChange={(e) => setNuovoForm({ ...nuovoForm, nome: e.target.value })}
                    placeholder="Il tuo nome..."
                    className="w-full px-4 py-3 border rounded-xl text-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Cognome</label>
                  <input
                    type="text"
                    value={nuovoForm.cognome}
                    onChange={(e) => setNuovoForm({ ...nuovoForm, cognome: e.target.value })}
                    placeholder="Il tuo cognome..."
                    className="w-full px-4 py-3 border rounded-xl text-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* Bottone registra */}
            <button
              onClick={handleNuovoCheckin}
              disabled={saving || !nuovoForm.nome.trim() || !nuovoForm.cognome.trim()}
              className={`w-full py-4 rounded-2xl font-bold text-lg transition-all ${
                nuovoForm.nome.trim() && nuovoForm.cognome.trim() && !saving
                  ? 'bg-green-600 text-white hover:bg-green-700 shadow-lg'
                  : 'bg-gray-200 text-gray-400 cursor-not-allowed'
              }`}
            >
              {saving ? 'Registrazione...' : 'Registrati e Check-in'}
            </button>

            {/* Link torna indietro */}
            <div className="text-center mt-6">
              <button
                onClick={() => setShowNuovo(false)}
                className="text-gray-600 font-medium hover:underline"
              >
                Torna alla ricerca
              </button>
            </div>
          </>
        )}

        {/* Footer */}
        <div className="mt-8 text-center text-xs text-gray-400">
          {progetto?.codice} {area && `- ${area.codice || area.nome}`}
        </div>
      </div>
    </div>
  )
}
