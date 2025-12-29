import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { 
  MapPin, 
  Navigation, 
  CheckCircle, 
  XCircle,
  Loader2,
  Sun,
  Cloud,
  Wind,
  Droplets,
  AlertTriangle,
  Clock
} from 'lucide-react'

export default function CheckInPage() {
  const { persona, assegnazione } = useAuth()
  const [loading, setLoading] = useState(false)
  const [checkingLocation, setCheckingLocation] = useState(false)
  const [location, setLocation] = useState(null)
  const [locationError, setLocationError] = useState(null)
  const [presenzaOggi, setPresenzaOggi] = useState(null)
  const [zone, setZone] = useState([])
  const [selectedZona, setSelectedZona] = useState(null)
  const [distanza, setDistanza] = useState(null)
  const [meteo, setMeteo] = useState(null)
  const [message, setMessage] = useState({ type: '', text: '' })

  const oggi = new Date().toISOString().split('T')[0]

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      // Carica presenza di oggi
      const { data: presenza } = await supabase
        .from('presenze')
        .select('*')
        .eq('persona_id', persona.id)
        .eq('progetto_id', assegnazione.progetto_id)
        .eq('data', oggi)
        .single()

      setPresenzaOggi(presenza)

      // Carica zone GPS del progetto
      const { data: zoneData } = await supabase
        .from('zone_gps')
        .select('*')
        .eq('progetto_id', assegnazione.progetto_id)
        .eq('attiva', true)

      setZone(zoneData || [])

    } catch (error) {
      console.error('Error loading data:', error)
    }
  }

  // Calcola distanza tra due punti GPS (formula Haversine)
  const calcDistanza = (lat1, lon1, lat2, lon2) => {
    const R = 6371000 // Raggio terra in metri
    const dLat = (lat2 - lat1) * Math.PI / 180
    const dLon = (lon2 - lon1) * Math.PI / 180
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
    return Math.round(R * c)
  }

  // Ottieni posizione GPS
  const getLocation = () => {
    setCheckingLocation(true)
    setLocationError(null)
    setLocation(null)

    if (!navigator.geolocation) {
      setLocationError('Geolocalizzazione non supportata dal browser')
      setCheckingLocation(false)
      return
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude, accuracy } = position.coords
        setLocation({ latitude, longitude, accuracy })
        setCheckingLocation(false)

        // Trova zona più vicina
        if (zone.length > 0) {
          let minDist = Infinity
          let closestZona = null

          zone.forEach(z => {
            const dist = calcDistanza(latitude, longitude, z.latitudine, z.longitudine)
            if (dist < minDist) {
              minDist = dist
              closestZona = z
            }
          })

          setSelectedZona(closestZona)
          setDistanza(minDist)
        }

        // Carica meteo (placeholder)
        setMeteo({
          temperatura: 8,
          vento: 15,
          pioggia: 0,
          descrizione: 'Parzialmente nuvoloso',
          alert: null
        })
      },
      (error) => {
        console.error('GPS error:', error)
        setCheckingLocation(false)
        
        switch(error.code) {
          case error.PERMISSION_DENIED:
            setLocationError('Permesso GPS negato. Abilita la geolocalizzazione.')
            break
          case error.POSITION_UNAVAILABLE:
            setLocationError('Posizione non disponibile.')
            break
          case error.TIMEOUT:
            setLocationError('Timeout GPS. Riprova.')
            break
          default:
            setLocationError('Errore sconosciuto GPS.')
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0
      }
    )
  }

  // Effettua check-in
  const doCheckIn = async () => {
    if (!location) {
      setMessage({ type: 'error', text: 'Ottieni prima la posizione GPS' })
      return
    }

    setLoading(true)
    setMessage({ type: '', text: '' })

    try {
      const { data, error } = await supabase
        .from('presenze')
        .insert({
          persona_id: persona.id,
          progetto_id: assegnazione.progetto_id,
          zona_id: selectedZona?.id,
          data: oggi,
          ora_checkin: new Date().toTimeString().slice(0, 8),
          lat_checkin: location.latitude,
          lng_checkin: location.longitude,
          distanza_checkin_metri: distanza,
          meteo_temperatura: meteo?.temperatura,
          meteo_vento_kmh: meteo?.vento,
          meteo_pioggia_mm: meteo?.pioggia,
          meteo_descrizione: meteo?.descrizione,
          meteo_alert: meteo?.alert || 'OK'
        })
        .select()
        .single()

      if (error) throw error

      setPresenzaOggi(data)
      setMessage({ type: 'success', text: 'Check-in effettuato con successo!' })

    } catch (error) {
      console.error('Check-in error:', error)
      setMessage({ type: 'error', text: error.message || 'Errore durante il check-in' })
    } finally {
      setLoading(false)
    }
  }

  // Effettua check-out
  const doCheckOut = async () => {
    if (!presenzaOggi) return

    setLoading(true)
    setMessage({ type: '', text: '' })

    try {
      const { error } = await supabase
        .from('presenze')
        .update({
          ora_checkout: new Date().toTimeString().slice(0, 8),
          lat_checkout: location?.latitude,
          lng_checkout: location?.longitude
        })
        .eq('id', presenzaOggi.id)

      if (error) throw error

      setPresenzaOggi(prev => ({
        ...prev,
        ora_checkout: new Date().toTimeString().slice(0, 8)
      }))
      setMessage({ type: 'success', text: 'Check-out effettuato!' })

    } catch (error) {
      console.error('Check-out error:', error)
      setMessage({ type: 'error', text: error.message || 'Errore durante il check-out' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-xl font-bold text-gray-800">Check-in GPS</h1>
        <p className="text-sm text-gray-500">
          {new Date().toLocaleDateString('it-IT', { 
            weekday: 'long', 
            day: 'numeric', 
            month: 'long' 
          })}
        </p>
      </div>

      {/* Stato presenza */}
      {presenzaOggi && (
        <div className="card bg-success-50 border-success-200">
          <div className="flex items-center gap-3">
            <CheckCircle className="text-success-600" size={24} />
            <div>
              <p className="font-medium text-success-800">Check-in effettuato</p>
              <p className="text-sm text-success-600">
                Ore {presenzaOggi.ora_checkin?.slice(0, 5)}
                {presenzaOggi.ora_checkout && ` - ${presenzaOggi.ora_checkout.slice(0, 5)}`}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Message */}
      {message.text && (
        <div className={`card ${
          message.type === 'success' ? 'bg-success-50 text-success-700' : 
          message.type === 'error' ? 'bg-danger-50 text-danger-700' : ''
        }`}>
          {message.text}
        </div>
      )}

      {/* GPS Card */}
      <div className="card">
        <h3 className="font-medium text-gray-800 mb-3 flex items-center gap-2">
          <Navigation size={18} />
          Posizione GPS
        </h3>

        {locationError && (
          <div className="bg-danger-50 text-danger-600 p-3 rounded-lg mb-3 flex items-center gap-2">
            <XCircle size={18} />
            <span className="text-sm">{locationError}</span>
          </div>
        )}

        {location ? (
          <div className="space-y-2 mb-4">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Latitudine</span>
              <span className="font-mono">{location.latitude.toFixed(6)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Longitudine</span>
              <span className="font-mono">{location.longitude.toFixed(6)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Precisione</span>
              <span>±{Math.round(location.accuracy)}m</span>
            </div>
            {selectedZona && (
              <>
                <hr className="my-2" />
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Zona rilevata</span>
                  <span className="font-medium">{selectedZona.nome}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Distanza dal centro</span>
                  <span className={distanza <= selectedZona.raggio_metri ? 'text-success-600' : 'text-warning-600'}>
                    {distanza}m {distanza <= selectedZona.raggio_metri ? '✓' : '⚠️'}
                  </span>
                </div>
              </>
            )}
          </div>
        ) : (
          <p className="text-gray-500 text-sm mb-4">
            Premi il pulsante per rilevare la posizione
          </p>
        )}

        <button
          onClick={getLocation}
          disabled={checkingLocation}
          className="btn-secondary w-full flex items-center justify-center gap-2"
        >
          {checkingLocation ? (
            <>
              <Loader2 className="animate-spin" size={18} />
              Rilevamento...
            </>
          ) : (
            <>
              <MapPin size={18} />
              {location ? 'Aggiorna posizione' : 'Rileva posizione'}
            </>
          )}
        </button>
      </div>

      {/* Meteo Card */}
      {meteo && location && (
        <div className="card">
          <h3 className="font-medium text-gray-800 mb-3 flex items-center gap-2">
            <Sun size={18} />
            Meteo
          </h3>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-2">
              <Sun className="text-yellow-500" size={20} />
              <span>{meteo.temperatura}°C</span>
            </div>
            <div className="flex items-center gap-2">
              <Wind className="text-blue-500" size={20} />
              <span>{meteo.vento} km/h</span>
            </div>
            <div className="flex items-center gap-2">
              <Droplets className="text-blue-400" size={20} />
              <span>{meteo.pioggia} mm</span>
            </div>
            <div className="flex items-center gap-2">
              <Cloud className="text-gray-400" size={20} />
              <span className="text-sm">{meteo.descrizione}</span>
            </div>
          </div>

          {meteo.alert && (
            <div className="mt-3 bg-warning-50 text-warning-700 p-2 rounded-lg flex items-center gap-2">
              <AlertTriangle size={18} />
              <span className="text-sm">{meteo.alert}</span>
            </div>
          )}
        </div>
      )}

      {/* Action Buttons */}
      <div className="space-y-3">
        {!presenzaOggi ? (
          <button
            onClick={doCheckIn}
            disabled={!location || loading}
            className="btn-success w-full py-4 text-lg flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="animate-spin" size={22} />
                Registrazione...
              </>
            ) : (
              <>
                <CheckCircle size={22} />
                Effettua Check-in
              </>
            )}
          </button>
        ) : !presenzaOggi.ora_checkout ? (
          <button
            onClick={doCheckOut}
            disabled={loading}
            className="btn-warning w-full py-4 text-lg flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="animate-spin" size={22} />
                Registrazione...
              </>
            ) : (
              <>
                <Clock size={22} />
                Effettua Check-out
              </>
            )}
          </button>
        ) : (
          <div className="card bg-gray-50 text-center">
            <p className="text-gray-600">
              Giornata completata ✓
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
