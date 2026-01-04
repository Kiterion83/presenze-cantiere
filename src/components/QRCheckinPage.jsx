import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function QRCheckinPage() {
  const { progettoId } = useParams()
  
  // Stati
  const [loading, setLoading] = useState(true)
  const [progetto, setProgetto] = useState(null)
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

  // Carica progetto e persone
  useEffect(() => {
    loadData()
    requestGPS()
  }, [progettoId])

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

      // Carica persone assegnate al progetto
      const { data: assegnazioni } = await supabase
        .from('assegnazioni')
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
        setError('Hai già fatto check-in oggi!')
        setSaving(false)
        return
      }

      // Crea presenza
      const { error: insErr } = await supabase
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

      if (insErr) throw insErr

      setSuccess({
        nome: `${selectedPersona.nome} ${selectedPersona.cognome}`,
        ora: oraCheckin
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
        .from('assegnazioni')
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
            titolo: '🆕 Nuovo operaio registrato',
            messaggio: `${nuovoForm.cognome.trim()} ${nuovoForm.nome.trim()} si è registrato tramite QR code. Da assegnare a una squadra.`,
            priorita: 'alta',
            link: '/team',
            letta: false,
            metadata: JSON.stringify({
              persona_id: nuovaPersona.id,
              nome: nuovoForm.nome.trim(),
              cognome: nuovoForm.cognome.trim(),
              data_registrazione: oggi,
              ora_registrazione: oraCheckin
            })
          })
      } catch (notifErr) {
        console.warn('Notifica non creata:', notifErr)
        // Non bloccare il check-in se la notifica fallisce
      }

      setSuccess({
        nome: `${nuovoForm.nome} ${nuovoForm.cognome}`,
        ora: oraCheckin,
        nuovo: true
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

  // === RENDER ===

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl p-8 shadow-2xl text-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Caricamento...</p>
        </div>
      </div>
    )
  }

  if (error && !progetto) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-500 to-red-700 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl p-8 shadow-2xl text-center max-w-sm">
          <div className="text-6xl mb-4">❌</div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Errore</h1>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    )
  }

  // Schermata successo
  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-500 to-green-700 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl p-8 shadow-2xl text-center max-w-sm w-full">
          <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <span className="text-5xl">✅</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Check-in Completato!</h1>
          <p className="text-xl text-gray-700 mb-1">{success.nome}</p>
          <p className="text-3xl font-bold text-green-600 mb-4">{success.ora}</p>
          {success.nuovo && (
            <p className="text-sm text-blue-600 bg-blue-50 rounded-lg p-2 mb-4">
              🆕 Registrato come nuovo nel sistema
            </p>
          )}
          <p className="text-gray-500 text-sm mb-6">{progetto?.nome}</p>
          
          <button
            onClick={handleReset}
            className="w-full py-4 bg-gray-100 text-gray-700 rounded-2xl font-semibold hover:bg-gray-200 transition-colors"
          >
            ← Nuovo Check-in
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-6 text-white text-center">
          <div className="text-4xl mb-2">📍</div>
          <h1 className="text-2xl font-bold">Check-in Cantiere</h1>
          <p className="text-blue-100 text-sm mt-1">{progetto?.nome}</p>
          {gpsPosition && (
            <p className="text-xs text-blue-200 mt-2">📡 GPS attivo</p>
          )}
        </div>

        <div className="p-6">
          {/* Errore */}
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
              ⚠️ {error}
            </div>
          )}

          {!showNuovo ? (
            <>
              {/* Ricerca persona */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  🔍 Cerca il tuo nome
                </label>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value)
                    setSelectedPersona(null)
                  }}
                  placeholder="Scrivi nome o cognome..."
                  className="w-full px-4 py-4 text-lg border-2 border-gray-200 rounded-2xl focus:border-blue-500 focus:ring-0 outline-none transition-colors"
                  autoFocus
                  autoComplete="off"
                />
              </div>

              {/* Lista risultati */}
              {searchTerm.length >= 2 && !selectedPersona && (
                <div className="mb-4 max-h-64 overflow-y-auto rounded-2xl border-2 border-gray-100">
                  {filteredPersone.length === 0 ? (
                    <div className="p-4 text-center text-gray-500">
                      <p className="mb-2">Nessun risultato per "{searchTerm}"</p>
                      <button
                        onClick={() => setShowNuovo(true)}
                        className="text-blue-600 font-semibold"
                      >
                        → Registrati come nuovo
                      </button>
                    </div>
                  ) : (
                    filteredPersone.map(p => (
                      <button
                        key={p.id}
                        onClick={() => handleSelectPersona(p)}
                        className="w-full p-4 text-left hover:bg-blue-50 border-b border-gray-100 last:border-0 transition-colors"
                      >
                        <span className="font-semibold text-gray-800">{p.cognome}</span>
                        <span className="text-gray-600 ml-2">{p.nome}</span>
                      </button>
                    ))
                  )}
                </div>
              )}

              {/* Persona selezionata */}
              {selectedPersona && (
                <div className="mb-4 p-4 bg-blue-50 border-2 border-blue-200 rounded-2xl">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-blue-600 text-white rounded-full flex items-center justify-center text-xl font-bold">
                      {selectedPersona.nome[0]}{selectedPersona.cognome[0]}
                    </div>
                    <div>
                      <p className="font-bold text-gray-800">{selectedPersona.cognome} {selectedPersona.nome}</p>
                      <p className="text-sm text-blue-600">Pronto per il check-in</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Bottone Check-in */}
              <button
                onClick={handleCheckin}
                disabled={!selectedPersona || saving}
                className={`w-full py-5 rounded-2xl text-xl font-bold transition-all ${
                  selectedPersona && !saving
                    ? 'bg-green-500 text-white hover:bg-green-600 active:scale-98 shadow-lg'
                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                }`}
              >
                {saving ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                    Registrazione...
                  </span>
                ) : (
                  '✅ Conferma Check-in'
                )}
              </button>

              {/* Divider */}
              <div className="flex items-center gap-4 my-6">
                <div className="flex-1 h-px bg-gray-200"></div>
                <span className="text-gray-400 text-sm">oppure</span>
                <div className="flex-1 h-px bg-gray-200"></div>
              </div>

              {/* Bottone Nuovo */}
              <button
                onClick={() => setShowNuovo(true)}
                className="w-full py-4 bg-gray-100 text-gray-700 rounded-2xl font-semibold hover:bg-gray-200 transition-colors"
              >
                🆕 Sono nuovo, registrami
              </button>
            </>
          ) : (
            <>
              {/* Form nuovo utente */}
              <div className="mb-4">
                <button
                  onClick={() => setShowNuovo(false)}
                  className="text-blue-600 text-sm font-medium mb-4 flex items-center gap-1"
                >
                  ← Torna alla ricerca
                </button>
                
                <h2 className="text-lg font-bold text-gray-800 mb-4">🆕 Registrazione Nuovo</h2>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Nome *</label>
                    <input
                      type="text"
                      value={nuovoForm.nome}
                      onChange={(e) => setNuovoForm({ ...nuovoForm, nome: e.target.value })}
                      placeholder="Mario"
                      className="w-full px-4 py-3 text-lg border-2 border-gray-200 rounded-xl focus:border-blue-500 outline-none"
                      autoComplete="off"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Cognome *</label>
                    <input
                      type="text"
                      value={nuovoForm.cognome}
                      onChange={(e) => setNuovoForm({ ...nuovoForm, cognome: e.target.value })}
                      placeholder="Rossi"
                      className="w-full px-4 py-3 text-lg border-2 border-gray-200 rounded-xl focus:border-blue-500 outline-none"
                      autoComplete="off"
                    />
                  </div>
                </div>
              </div>

              {/* Bottone registra e check-in */}
              <button
                onClick={handleNuovoCheckin}
                disabled={!nuovoForm.nome.trim() || !nuovoForm.cognome.trim() || saving}
                className={`w-full py-5 rounded-2xl text-xl font-bold transition-all ${
                  nuovoForm.nome.trim() && nuovoForm.cognome.trim() && !saving
                    ? 'bg-green-500 text-white hover:bg-green-600 shadow-lg'
                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                }`}
              >
                {saving ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                    Registrazione...
                  </span>
                ) : (
                  '✅ Registra e Check-in'
                )}
              </button>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 pb-6">
          <p className="text-center text-xs text-gray-400">
            {new Date().toLocaleDateString('it-IT', { 
              weekday: 'long', 
              day: 'numeric', 
              month: 'long', 
              year: 'numeric' 
            })}
          </p>
        </div>
      </div>
    </div>
  )
}
