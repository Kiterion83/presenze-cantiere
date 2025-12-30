import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'

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

  // Carica presenza di oggi
  useEffect(() => {
    if (persona?.id) {
      loadTodayPresenza()
    }
  }, [persona?.id])

  const loadTodayPresenza = async () => {
    const today = new Date().toISOString().split('T')[0]
    
    const { data, error } = await supabase
      .from('presenze')
      .select('*')
      .eq('persona_id', persona.id)
      .eq('data', today)
      .single()

    if (!error && data) {
      setTodayPresenza(data)
    }
  }

  // Ottieni posizione GPS
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
        const coords = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy
        }
        setLocation(coords)
        setGpsLoading(false)
        
        // Carica meteo
        await loadWeather(coords.lat, coords.lng)
      },
      (error) => {
        setLocationError(getGeoErrorMessage(error))
        setGpsLoading(false)
      },
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }

  const getGeoErrorMessage = (error) => {
    switch (error.code) {
      case error.PERMISSION_DENIED:
        return 'Permesso GPS negato. Attiva la geolocalizzazione.'
      case error.POSITION_UNAVAILABLE:
        return 'Posizione non disponibile.'
      case error.TIMEOUT:
        return 'Timeout richiesta GPS.'
      default:
        return 'Errore GPS sconosciuto.'
    }
  }

  // Carica meteo da Open-Meteo (gratuito, no API key)
  const loadWeather = async (lat, lng) => {
    try {
      const response = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,weather_code,wind_speed_10m&timezone=auto`
      )
      const data = await response.json()
      
      if (data.current) {
        setWeather({
          temp: Math.round(data.current.temperature_2m),
          code: data.current.weather_code,
          wind: Math.round(data.current.wind_speed_10m)
        })
      }
    } catch (err) {
      console.error('Errore meteo:', err)
    }
  }

  // Weather code to emoji/description
  const getWeatherInfo = (code) => {
    if (code === 0) return { emoji: '☀️', desc: 'Sereno' }
    if (code <= 3) return { emoji: '⛅', desc: 'Parzialmente nuvoloso' }
    if (code <= 49) return { emoji: '🌫️', desc: 'Nebbia' }
    if (code <= 59) return { emoji: '🌧️', desc: 'Pioggia leggera' }
    if (code <= 69) return { emoji: '🌧️', desc: 'Pioggia' }
    if (code <= 79) return { emoji: '🌨️', desc: 'Neve' }
    if (code <= 99) return { emoji: '⛈️', desc: 'Temporale' }
    return { emoji: '🌡️', desc: 'N/A' }
  }

  // Effettua Check-in
  const handleCheckin = async () => {
    if (!location) {
      setMessage({ type: 'error', text: 'Ottieni prima la posizione GPS' })
      return
    }

    setLoading(true)
    setMessage(null)

    try {
      const now = new Date()
      const today = now.toISOString().split('T')[0]
      const timeStr = now.toTimeString().slice(0, 5)

      // Verifica distanza dal cantiere (se coordinate progetto disponibili)
      let distanza = null
      if (progetto?.latitudine && progetto?.longitudine) {
        distanza = calculateDistance(
          location.lat, location.lng,
          progetto.latitudine, progetto.longitudine
        )
      }

      const presenzaData = {
        persona_id: persona.id,
        progetto_id: assegnazione.progetto_id,
        data: today,
        ora_entrata: timeStr,
        latitudine_entrata: location.lat,
        longitudine_entrata: location.lng,
        meteo_entrata: weather ? `${weather.temp}°C - ${getWeatherInfo(weather.code).desc}` : null,
        note: note || null,
        stato: 'presente'
      }

      const { data, error } = await supabase
        .from('presenze')
        .insert(presenzaData)
        .select()
        .single()

      if (error) throw error

      setTodayPresenza(data)
      setMessage({ type: 'success', text: `Check-in effettuato alle ${timeStr}` })
      setNote('')

    } catch (err) {
      setMessage({ type: 'error', text: err.message })
    } finally {
      setLoading(false)
    }
  }

  // Effettua Check-out
  const handleCheckout = async () => {
    if (!todayPresenza) return

    setLoading(true)
    setMessage(null)

    try {
      const now = new Date()
      const timeStr = now.toTimeString().slice(0, 5)

      // Calcola ore lavorate
      const entrata = todayPresenza.ora_entrata.split(':')
      const entrataMinutes = parseInt(entrata[0]) * 60 + parseInt(entrata[1])
      const uscita = timeStr.split(':')
      const uscitaMinutes = parseInt(uscita[0]) * 60 + parseInt(uscita[1])
      const oreLavorate = ((uscitaMinutes - entrataMinutes) / 60).toFixed(2)

      const updateData = {
        ora_uscita: timeStr,
        latitudine_uscita: location?.lat || null,
        longitudine_uscita: location?.lng || null,
        meteo_uscita: weather ? `${weather.temp}°C - ${getWeatherInfo(weather.code).desc}` : null,
        ore_ordinarie: Math.min(parseFloat(oreLavorate), 8),
        ore_straordinarie: Math.max(parseFloat(oreLavorate) - 8, 0),
        note: note || todayPresenza.note
      }

      const { data, error } = await supabase
        .from('presenze')
        .update(updateData)
        .eq('id', todayPresenza.id)
        .select()
        .single()

      if (error) throw error

      setTodayPresenza(data)
      setMessage({ type: 'success', text: `Check-out effettuato alle ${timeStr} - ${oreLavorate}h lavorate` })

    } catch (err) {
      setMessage({ type: 'error', text: err.message })
    } finally {
      setLoading(false)
    }
  }

  // Calcola distanza in metri
  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371e3
    const φ1 = lat1 * Math.PI / 180
    const φ2 = lat2 * Math.PI / 180
    const Δφ = (lat2 - lat1) * Math.PI / 180
    const Δλ = (lon2 - lon1) * Math.PI / 180

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))

    return Math.round(R * c)
  }

  const isCheckedIn = todayPresenza && !todayPresenza.ora_uscita
  const isCheckedOut = todayPresenza && todayPresenza.ora_uscita

  return (
    <div className="p-4 lg:p-8 max-w-2xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">📍 Check-in / Check-out</h1>
        <p className="text-gray-500">
          {new Date().toLocaleDateString('it-IT', { 
            weekday: 'long', 
            day: 'numeric', 
            month: 'long' 
          })}
        </p>
      </div>

      {/* Status Card */}
      <div className={`rounded-2xl p-6 mb-6 ${
        isCheckedOut ? 'bg-gray-100' :
        isCheckedIn ? 'bg-green-50 border-2 border-green-200' :
        'bg-blue-50 border-2 border-blue-200'
      }`}>
        <div className="text-center">
          <span className="text-5xl block mb-3">
            {isCheckedOut ? '🏠' : isCheckedIn ? '🏗️' : '👋'}
          </span>
          <h2 className="text-xl font-bold text-gray-800 mb-1">
            {isCheckedOut ? 'Giornata completata' :
             isCheckedIn ? 'Sei in cantiere' :
             'Pronto per iniziare?'}
          </h2>
          {todayPresenza && (
            <p className="text-gray-600">
              {isCheckedIn && `Entrata: ${todayPresenza.ora_entrata}`}
              {isCheckedOut && `${todayPresenza.ora_entrata} - ${todayPresenza.ora_uscita}`}
            </p>
          )}
          {isCheckedOut && todayPresenza && (
            <p className="text-green-600 font-medium mt-2">
              ✅ {(parseFloat(todayPresenza.ore_ordinarie || 0) + parseFloat(todayPresenza.ore_straordinarie || 0)).toFixed(1)}h lavorate
            </p>
          )}
        </div>
      </div>

      {/* GPS Section */}
      {!isCheckedOut && (
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 mb-4">
          <h3 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
            🛰️ Posizione GPS
          </h3>
          
          {location ? (
            <div className="bg-green-50 rounded-lg p-3 mb-3">
              <p className="text-green-700 font-medium">✅ Posizione acquisita</p>
              <p className="text-sm text-green-600">
                {location.lat.toFixed(6)}, {location.lng.toFixed(6)}
              </p>
              <p className="text-xs text-green-500">
                Precisione: ±{Math.round(location.accuracy)}m
              </p>
            </div>
          ) : locationError ? (
            <div className="bg-red-50 rounded-lg p-3 mb-3">
              <p className="text-red-700">❌ {locationError}</p>
            </div>
          ) : (
            <div className="bg-gray-50 rounded-lg p-3 mb-3">
              <p className="text-gray-500">Posizione non ancora acquisita</p>
            </div>
          )}

          <button
            onClick={getLocation}
            disabled={gpsLoading}
            className="w-full py-3 bg-blue-100 text-blue-700 rounded-xl font-medium hover:bg-blue-200 transition-colors disabled:opacity-50"
          >
            {gpsLoading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Acquisizione GPS...
              </span>
            ) : location ? '🔄 Aggiorna posizione' : '📍 Ottieni posizione'}
          </button>
        </div>
      )}

      {/* Weather */}
      {weather && !isCheckedOut && (
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 mb-4">
          <h3 className="font-semibold text-gray-700 mb-3">🌤️ Meteo attuale</h3>
          <div className="flex items-center gap-4">
            <span className="text-4xl">{getWeatherInfo(weather.code).emoji}</span>
            <div>
              <p className="text-2xl font-bold text-gray-800">{weather.temp}°C</p>
              <p className="text-gray-500">{getWeatherInfo(weather.code).desc}</p>
              <p className="text-sm text-gray-400">Vento: {weather.wind} km/h</p>
            </div>
          </div>
        </div>
      )}

      {/* Note */}
      {!isCheckedOut && (
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 mb-4">
          <h3 className="font-semibold text-gray-700 mb-3">📝 Note (opzionale)</h3>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Es: Lavoro su impianto elettrico zona A..."
            className="w-full p-3 border border-gray-200 rounded-xl resize-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            rows={3}
          />
        </div>
      )}

      {/* Message */}
      {message && (
        <div className={`rounded-xl p-4 mb-4 ${
          message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
        }`}>
          {message.type === 'success' ? '✅' : '❌'} {message.text}
        </div>
      )}

      {/* Action Buttons */}
      {!isCheckedOut && (
        <div className="space-y-3">
          {!isCheckedIn ? (
            <button
              onClick={handleCheckin}
              disabled={loading || !location}
              className="w-full py-4 bg-green-600 text-white rounded-xl font-semibold text-lg hover:bg-green-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed shadow-lg"
            >
              {loading ? 'Registrazione...' : '✅ Registra ENTRATA'}
            </button>
          ) : (
            <button
              onClick={handleCheckout}
              disabled={loading}
              className="w-full py-4 bg-red-600 text-white rounded-xl font-semibold text-lg hover:bg-red-700 transition-colors disabled:bg-gray-300 shadow-lg"
            >
              {loading ? 'Registrazione...' : '🚪 Registra USCITA'}
            </button>
          )}
        </div>
      )}

      {/* Today Summary */}
      {todayPresenza && (
        <div className="mt-6 bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <h3 className="font-semibold text-gray-700 mb-3">📋 Riepilogo oggi</h3>
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
              <p className="font-medium">{todayPresenza.ore_ordinarie || '-'}</p>
            </div>
            <div>
              <p className="text-gray-500">Straordinario</p>
              <p className="font-medium">{todayPresenza.ore_straordinarie || '-'}</p>
            </div>
            {todayPresenza.note && (
              <div className="col-span-2">
                <p className="text-gray-500">Note</p>
                <p className="font-medium">{todayPresenza.note}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
