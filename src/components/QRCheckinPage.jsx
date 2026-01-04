// QRCheckinPage.jsx - Check-in via QR Code con PROTEZIONE ANTI-FRODE
// Impedisce che lo stesso telefono faccia check-in per persone diverse
import { useState, useEffect } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'

// ================================================================
// DEVICE FINGERPRINT - Identifica univocamente il dispositivo
// ================================================================
function generateDeviceFingerprint() {
  // Raccoglie caratteristiche del dispositivo
  const components = [
    navigator.userAgent,
    navigator.language,
    navigator.platform,
    screen.width + 'x' + screen.height,
    screen.colorDepth,
    new Date().getTimezoneOffset(),
    navigator.hardwareConcurrency || 'unknown',
    navigator.deviceMemory || 'unknown',
  ]
  
  // Crea hash semplice
  const str = components.join('|')
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32bit integer
  }
  
  return 'DEV-' + Math.abs(hash).toString(36).toUpperCase()
}

function getOrCreateDeviceId() {
  const STORAGE_KEY = 'pts_device_id'
  let deviceId = localStorage.getItem(STORAGE_KEY)
  
  if (!deviceId) {
    // Genera nuovo device ID combinando fingerprint + UUID casuale
    const fingerprint = generateDeviceFingerprint()
    const random = Math.random().toString(36).substring(2, 10).toUpperCase()
    deviceId = `${fingerprint}-${random}`
    localStorage.setItem(STORAGE_KEY, deviceId)
  }
  
  return deviceId
}

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
  
  // NUOVO: Device ID per protezione anti-frode
  const [deviceId, setDeviceId] = useState(null)
  const [deviceBlocked, setDeviceBlocked] = useState(false)
  const [blockedReason, setBlockedReason] = useState(null)

  // Inizializza device ID
  useEffect(() => {
    const id = getOrCreateDeviceId()
    setDeviceId(id)
  }, [])

  // Carica progetto e persone
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
        const { data: areaData } = await supabase
          .from('aree_lavoro')
          .select('id, nome, colore')
          .eq('id', areaId)
          .single()
        setArea(areaData)
      }

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

  // ================================================================
  // VERIFICA ANTI-FRODE: Controlla se device ha già fatto check-in per altra persona
  // ================================================================
  const checkDeviceFraud = async (personaId) => {
    if (!deviceId) return { allowed: true }
    
    const oggi = new Date().toISOString().split('T')[0]
    
    try {
      // Cerca check-in di OGGI con questo device_id per ALTRE persone
      const { data: existingCheckins, error } = await supabase
        .from('presenze')
        .select('id, persona_id, persona:persone(nome, cognome)')
        .eq('progetto_id', progettoId)
        .eq('data', oggi)
        .eq('device_id', deviceId)
        .neq('persona_id', personaId)
      
      if (error) {
        console.warn('Errore verifica anti-frode:', error)
        return { allowed: true } // In caso di errore, permetti (fail-open)
      }
      
      if (existingCheckins && existingCheckins.length > 0) {
        const altrePersone = existingCheckins
          .map(c => `${c.persona?.cognome} ${c.persona?.nome}`)
          .join(', ')
        
        return {
          allowed: false,
          reason: `Questo dispositivo ha già registrato il check-in per: ${altrePersone}. Non è possibile fare check-in per un'altra persona dallo stesso telefono.`
        }
      }
      
      return { allowed: true }
    } catch (e) {
      console.error('Errore checkDeviceFraud:', e)
      return { allowed: true }
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
    setError(null)
    setDeviceBlocked(false)
  }

  // Check-in per persona esistente
  const handleCheckin = async () => {
    if (!selectedPersona) return
    
    setSaving(true)
    setError(null)
    setDeviceBlocked(false)
    
    try {
      // ===== VERIFICA ANTI-FRODE =====
      const fraudCheck = await checkDeviceFraud(selectedPersona.id)
      if (!fraudCheck.allowed) {
        setDeviceBlocked(true)
        setBlockedReason(fraudCheck.reason)
        setSaving(false)
        return
      }
      // ================================
      
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

      // Crea presenza CON device_id
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
          metodo_checkin: 'qr_code',
          area_ingresso_id: areaId || null,
          device_id: deviceId // NUOVO: Salva device ID
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
    setDeviceBlocked(false)

    try {
      const now = new Date()
      const oggi = now.toISOString().split('T')[0]
      const oraCheckin = now.toTimeString().slice(0, 5)

      // ===== VERIFICA ANTI-FRODE per nuovi =====
      // Controlla se questo device ha già fatto check-in oggi per QUALCUNO
      const { data: existingFromDevice } = await supabase
        .from('presenze')
        .select('id, persona:persone(nome, cognome)')
        .eq('progetto_id', progettoId)
        .eq('data', oggi)
        .eq('device_id', deviceId)
      
      if (existingFromDevice && existingFromDevice.length > 0) {
        const altrePersone = existingFromDevice
          .map(c => `${c.persona?.cognome} ${c.persona?.nome}`)
          .join(', ')
        
        setDeviceBlocked(true)
        setBlockedReason(`Questo dispositivo ha già registrato il check-in per: ${altrePersone}. Non è possibile registrare una nuova persona dallo stesso telefono.`)
        setSaving(false)
        return
      }
      // ==========================================

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

      // Crea presenza CON device_id
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
          metodo_checkin: 'qr_code_new',
          area_ingresso_id: areaId || null,
          device_id: deviceId // NUOVO: Salva device ID
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
              device_id: deviceId
            })
          })
      } catch (notifErr) {
        console.warn('Errore creazione notifica:', notifErr)
      }

      setSuccess({
        nome: `${nuovoForm.nome.trim()} ${nuovoForm.cognome.trim()}`,
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
    setSelectedPersona(null)
    setSearchTerm('')
    setShowNuovo(false)
    setNuovoForm({ nome: '', cognome: '' })
    setError(null)
    setDeviceBlocked(false)
    setBlockedReason(null)
    loadData() // Ricarica lista persone
  }

  // Loading
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center">
        <div className="text-center text-white">
          <div className="w-16 h-16 border-4 border-white border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p>Caricamento...</p>
        </div>
      </div>
    )
  }

  // Successo
  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-500 to-green-700 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-8 text-center">
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
          {area && (
            <p className="text-sm mt-1 px-3 py-1 bg-white/20 rounded-full inline-block">
              📍 Ingresso: {area.nome}
            </p>
          )}
          {gpsPosition && (
            <p className="text-xs text-blue-200 mt-2">📡 GPS attivo</p>
          )}
        </div>

        <div className="p-6">
          {/* BLOCCO ANTI-FRODE */}
          {deviceBlocked && (
            <div className="mb-4 p-4 bg-red-50 border-2 border-red-300 rounded-xl">
              <div className="flex items-start gap-3">
                <div className="text-3xl">🚫</div>
                <div>
                  <h3 className="font-bold text-red-800 mb-1">Accesso Bloccato</h3>
                  <p className="text-sm text-red-700">{blockedReason}</p>
                  <p className="text-xs text-red-500 mt-2">
                    Se ritieni sia un errore, contatta il responsabile di cantiere.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Errore */}
          {error && !deviceBlocked && (
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
                    setDeviceBlocked(false)
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
                disabled={!selectedPersona || saving || deviceBlocked}
                className={`w-full py-5 rounded-2xl text-xl font-bold transition-all ${
                  selectedPersona && !saving && !deviceBlocked
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
                disabled={deviceBlocked}
                className={`w-full py-4 rounded-2xl font-semibold transition-colors ${
                  deviceBlocked
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                🆕 Sono nuovo, registrami
              </button>
            </>
          ) : (
            <>
              {/* Form nuovo utente */}
              <div className="mb-4">
                <button
                  onClick={() => { setShowNuovo(false); setDeviceBlocked(false) }}
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
                disabled={!nuovoForm.nome.trim() || !nuovoForm.cognome.trim() || saving || deviceBlocked}
                className={`w-full py-5 rounded-2xl text-xl font-bold transition-all ${
                  nuovoForm.nome.trim() && nuovoForm.cognome.trim() && !saving && !deviceBlocked
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
