import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import QRScanner from '../components/QRScanner'

export default function CheckinPage() {
  const { persona, assegnazione, progetto } = useAuth()
  const [loading, setLoading] = useState(false)
  const [gpsLoading, setGpsLoading] = useState(false)
  const [location, setLocation] = useState(null)
  const [locationError, setLocationError] = useState(null)
  const [weather, setWeather] = useState(null)
  const [todayPresenza, setTodayPresenza] = useState(null)
  const [message, setMessage] = useState(null)
  const [note, setNote] = useState('')
  const [showQRScanner, setShowQRScanner] = useState(false)
  const [checkinMode, setCheckinMode] = useState('gps') // 'gps' o 'qr'

  useEffect(() => {
    if (persona?.id) loadTodayPresenza()
  }, [persona?.id])

  const loadTodayPresenza = async () => {
    const today = new Date().toISOString().split('T')[0]
    const { data } = await supabase
      .from('presenze')
      .select('*')
      .eq('persona_id', persona.id)
      .eq('data', today)
      .single()
    if (data) setTodayPresenza(data)
  }

  const getLocation = () => {
    setGpsLoading(true)
    setLocationError(null)
    if (!navigator.geolocation) {
      setLocationError('Geolocalizzazione non supportata')
      setGpsLoading(false)
      return
    }
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const coords = { lat: position.coords.latitude, lng: position.coords.longitude, accuracy: position.coords.accuracy }
        setLocation(coords)
        setGpsLoading(false)
        await loadWeather(coords.lat, coords.lng)
      },
      (error) => {
        const msg = { 1: 'Permesso GPS negato', 2: 'Posizione non disponibile', 3: 'Timeout GPS' }
        setLocationError(msg[error.code] || 'Errore GPS')
        setGpsLoading(false)
      },
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }

  const loadWeather = async (lat, lng) => {
    try {
      const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,weather_code,wind_speed_10m&timezone=auto`)
      const data = await res.json()
      if (data.current) {
        setWeather({ temp: Math.round(data.current.temperature_2m), code: data.current.weather_code, wind: Math.round(data.current.wind_speed_10m) })
      }
    } catch (err) { console.error(err) }
  }

  const getWeatherInfo = (code) => {
    if (code === 0) return { emoji: '☀️', desc: 'Sereno' }
    if (code <= 3) return { emoji: '⛅', desc: 'Nuvoloso' }
    if (code <= 49) return { emoji: '🌫️', desc: 'Nebbia' }
    if (code <= 69) return { emoji: '🌧️', desc: 'Pioggia' }
    if (code <= 79) return { emoji: '🌨️', desc: 'Neve' }
    return { emoji: '⛈️', desc: 'Temporale' }
  }

  // Check-in GPS
  const handleCheckin = async (qrCodeId = null, metodo = 'gps') => {
    if (metodo === 'gps' && !location) { 
      setMessage({ type: 'error', text: 'Ottieni prima la posizione GPS' })
      return 
    }
    setLoading(true)
    setMessage(null)
    try {
      const now = new Date()
      const today = now.toISOString().split('T')[0]
      const timeStr = now.toTimeString().slice(0, 5)
      
      const insertData = {
        persona_id: persona.id,
        progetto_id: assegnazione.progetto_id,
        data: today,
        ora_entrata: timeStr,
        meteo_entrata: weather ? `${weather.temp}°C - ${getWeatherInfo(weather.code).desc}` : null,
        note: note || null,
        stato: 'presente',
        metodo_checkin: metodo
      }

      // Aggiungi coordinate GPS se disponibili
      if (location) {
        insertData.latitudine_entrata = location.lat
        insertData.longitudine_entrata = location.lng
      }

      // Aggiungi QR code se usato
      if (qrCodeId) {
        insertData.qr_code_id = qrCodeId
      }

      const { data, error } = await supabase
        .from('presenze')
        .insert(insertData)
        .select()
        .single()

      if (error) throw error
      setTodayPresenza(data)
      setMessage({ type: 'success', text: `Check-in alle ${timeStr} (${metodo === 'qr' ? 'QR Code' : 'GPS'})` })
      setNote('')
    } catch (err) { 
      setMessage({ type: 'error', text: err.message }) 
    } finally { 
      setLoading(false) 
    }
  }

  // Check-in QR Code
  const handleQRScan = async (codice) => {
    setShowQRScanner(false)
    setLoading(true)
    setMessage(null)

    try {
      // Verifica codice QR
      const { data: qrCode, error: qrError } = await supabase
        .from('qr_codes')
        .select('*')
        .eq('codice', codice)
        .eq('progetto_id', assegnazione.progetto_id)
        .eq('attivo', true)
        .single()

      if (qrError || !qrCode) {
        setMessage({ type: 'error', text: 'QR Code non valido o non riconosciuto' })
        setLoading(false)
        return
      }

      // Verifica scadenza
      if (qrCode.scadenza && new Date(qrCode.scadenza) < new Date()) {
        setMessage({ type: 'error', text: 'QR Code scaduto' })
        setLoading(false)
        return
      }

      // Esegui check-in con QR
      await handleCheckin(qrCode.id, 'qr')
      
    } catch (err) {
      setMessage({ type: 'error', text: err.message })
      setLoading(false)
    }
  }

  const handleCheckout = async () => {
    if (!todayPresenza) return
    setLoading(true)
    setMessage(null)
    try {
      const now = new Date()
      const timeStr = now.toTimeString().slice(0, 5)
      const [eh, em] = todayPresenza.ora_entrata.split(':').map(Number)
      const [uh, um] = timeStr.split(':').map(Number)
      const ore = ((uh * 60 + um) - (eh * 60 + em)) / 60
      
      const updateData = {
        ora_uscita: timeStr,
        ore_ordinarie: Math.min(ore, 8),
        ore_straordinarie: Math.max(ore - 8, 0),
        note: note || todayPresenza.note
      }

      // Aggiungi coordinate GPS se disponibili
      if (location) {
        updateData.latitudine_uscita = location.lat
        updateData.longitudine_uscita = location.lng
      }

      const { data, error } = await supabase
        .from('presenze')
        .update(updateData)
        .eq('id', todayPresenza.id)
        .select()
        .single()

      if (error) throw error
      setTodayPresenza(data)
      setMessage({ type: 'success', text: `Check-out alle ${timeStr} - ${ore.toFixed(1)}h lavorate` })
    } catch (err) { 
      setMessage({ type: 'error', text: err.message }) 
    } finally { 
      setLoading(false) 
    }
  }

  const isCheckedIn = todayPresenza && !todayPresenza.ora_uscita
  const isCheckedOut = todayPresenza && todayPresenza.ora_uscita

  return (
    <div className="p-4 lg:p-8 max-w-2xl mx-auto">
      {/* QR Scanner Modal */}
      {showQRScanner && (
        <QRScanner 
          onScan={handleQRScan} 
          onClose={() => setShowQRScanner(false)} 
        />
      )}

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">📍 Check-in / Check-out</h1>
        <p className="text-gray-500">{new Date().toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
      </div>

      {/* Stato attuale */}
      <div className={`rounded-2xl p-6 mb-6 ${isCheckedOut ? 'bg-gray-100' : isCheckedIn ? 'bg-green-50 border-2 border-green-200' : 'bg-blue-50 border-2 border-blue-200'}`}>
        <div className="text-center">
          <span className="text-5xl block mb-3">{isCheckedOut ? '🏠' : isCheckedIn ? '🏗️' : '👋'}</span>
          <h2 className="text-xl font-bold text-gray-800">
            {isCheckedOut ? 'Giornata completata' : isCheckedIn ? 'Sei in cantiere' : 'Pronto per iniziare?'}
          </h2>
          {todayPresenza && (
            <p className="text-gray-600">
              {isCheckedIn ? `Entrata: ${todayPresenza.ora_entrata}` : `${todayPresenza.ora_entrata} - ${todayPresenza.ora_uscita}`}
              {todayPresenza.metodo_checkin && (
                <span className="ml-2 text-xs bg-gray-200 px-2 py-0.5 rounded-full">
                  {todayPresenza.metodo_checkin === 'qr' ? '📱 QR' : '📍 GPS'}
                </span>
              )}
            </p>
          )}
        </div>
      </div>

      {!isCheckedOut && !isCheckedIn && (
        <>
          {/* Selezione modalità check-in */}
          <div className="bg-white rounded-xl p-4 shadow-sm border mb-4">
            <h3 className="font-semibold text-gray-700 mb-3">📲 Modalità Check-in</h3>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setCheckinMode('gps')}
                className={`p-4 rounded-xl border-2 text-center transition-all ${
                  checkinMode === 'gps' 
                    ? 'border-blue-500 bg-blue-50' 
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <span className="text-3xl block mb-2">📍</span>
                <span className="font-medium">GPS</span>
                <p className="text-xs text-gray-500 mt-1">Posizione automatica</p>
              </button>
              <button
                onClick={() => setCheckinMode('qr')}
                className={`p-4 rounded-xl border-2 text-center transition-all ${
                  checkinMode === 'qr' 
                    ? 'border-blue-500 bg-blue-50' 
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <span className="text-3xl block mb-2">📱</span>
                <span className="font-medium">QR Code</span>
                <p className="text-xs text-gray-500 mt-1">Scansiona codice</p>
              </button>
            </div>
          </div>

          {/* GPS Section */}
          {checkinMode === 'gps' && (
            <div className="bg-white rounded-xl p-4 shadow-sm border mb-4">
              <h3 className="font-semibold text-gray-700 mb-3">🛰️ Posizione GPS</h3>
              {location ? (
                <div className="bg-green-50 rounded-lg p-3 mb-3">
                  <p className="text-green-700 font-medium">✅ Posizione acquisita</p>
                  <p className="text-sm text-green-600">{location.lat.toFixed(5)}, {location.lng.toFixed(5)}</p>
                </div>
              ) : locationError ? (
                <div className="bg-red-50 rounded-lg p-3 mb-3">
                  <p className="text-red-700">❌ {locationError}</p>
                </div>
              ) : (
                <div className="bg-gray-50 rounded-lg p-3 mb-3">
                  <p className="text-gray-500">Posizione non acquisita</p>
                </div>
              )}
              <button 
                onClick={getLocation} 
                disabled={gpsLoading} 
                className="w-full py-3 bg-blue-100 text-blue-700 rounded-xl font-medium hover:bg-blue-200 disabled:opacity-50"
              >
                {gpsLoading ? 'Acquisizione...' : location ? '🔄 Aggiorna posizione' : '📍 Ottieni posizione'}
              </button>
            </div>
          )}

          {/* QR Section */}
          {checkinMode === 'qr' && (
            <div className="bg-white rounded-xl p-4 shadow-sm border mb-4">
              <h3 className="font-semibold text-gray-700 mb-3">📱 Scansiona QR Code</h3>
              <p className="text-sm text-gray-500 mb-4">
                Inquadra il QR Code del punto di timbratura presente in cantiere
              </p>
              <button
                onClick={() => setShowQRScanner(true)}
                className="w-full py-4 bg-purple-100 text-purple-700 rounded-xl font-medium hover:bg-purple-200 flex items-center justify-center gap-2"
              >
                <span className="text-2xl">📷</span>
                <span>Apri Scanner QR</span>
              </button>
            </div>
          )}
        </>
      )}

      {/* Meteo */}
      {weather && !isCheckedOut && (
        <div className="bg-white rounded-xl p-4 shadow-sm border mb-4">
          <h3 className="font-semibold text-gray-700 mb-3">🌤️ Meteo</h3>
          <div className="flex items-center gap-4">
            <span className="text-4xl">{getWeatherInfo(weather.code).emoji}</span>
            <div>
              <p className="text-2xl font-bold">{weather.temp}°C</p>
              <p className="text-gray-500">{getWeatherInfo(weather.code).desc}</p>
            </div>
          </div>
        </div>
      )}

      {/* Note */}
      {!isCheckedOut && (
        <div className="bg-white rounded-xl p-4 shadow-sm border mb-4">
          <h3 className="font-semibold text-gray-700 mb-3">📝 Note</h3>
          <textarea 
            value={note} 
            onChange={(e) => setNote(e.target.value)} 
            placeholder="Note opzionali..." 
            className="w-full p-3 border rounded-xl resize-none" 
            rows={2} 
          />
        </div>
      )}

      {/* Messaggi */}
      {message && (
        <div className={`rounded-xl p-4 mb-4 ${message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
          {message.text}
        </div>
      )}

      {/* Pulsanti azione */}
      {!isCheckedOut && (
        !isCheckedIn ? (
          checkinMode === 'gps' ? (
            <button 
              onClick={() => handleCheckin(null, 'gps')} 
              disabled={loading || !location} 
              className="w-full py-4 bg-green-600 text-white rounded-xl font-semibold text-lg hover:bg-green-700 disabled:bg-gray-300 shadow-lg"
            >
              {loading ? 'Registrazione...' : '✅ Registra ENTRATA (GPS)'}
            </button>
          ) : (
            <button 
              onClick={() => setShowQRScanner(true)} 
              disabled={loading} 
              className="w-full py-4 bg-purple-600 text-white rounded-xl font-semibold text-lg hover:bg-purple-700 disabled:bg-gray-300 shadow-lg"
            >
              {loading ? 'Registrazione...' : '📱 Scansiona QR per ENTRATA'}
            </button>
          )
        ) : (
          <button 
            onClick={handleCheckout} 
            disabled={loading} 
            className="w-full py-4 bg-red-600 text-white rounded-xl font-semibold text-lg hover:bg-red-700 disabled:bg-gray-300 shadow-lg"
          >
            {loading ? 'Registrazione...' : '🚪 Registra USCITA'}
          </button>
        )
      )}

      {/* Riepilogo */}
      {todayPresenza && (
        <div className="mt-6 bg-white rounded-xl p-4 shadow-sm border">
          <h3 className="font-semibold text-gray-700 mb-3">📋 Riepilogo Giornata</h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-gray-500">Entrata</p>
              <p className="font-medium">{todayPresenza.ora_entrata || '-'}</p>
            </div>
            <div>
              <p className="text-gray-500">Uscita</p>
              <p className="font-medium">{todayPresenza.ora_uscita || '-'}</p>
            </div>
            <div>
              <p className="text-gray-500">Ore ordinarie</p>
              <p className="font-medium">{todayPresenza.ore_ordinarie?.toFixed(1) || '-'}h</p>
            </div>
            <div>
              <p className="text-gray-500">Straordinario</p>
              <p className="font-medium">{todayPresenza.ore_straordinarie?.toFixed(1) || '-'}h</p>
            </div>
          </div>
          {todayPresenza.metodo_checkin && (
            <div className="mt-3 pt-3 border-t">
              <p className="text-xs text-gray-400">
                Metodo: {todayPresenza.metodo_checkin === 'qr' ? '📱 QR Code' : '📍 GPS'}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
