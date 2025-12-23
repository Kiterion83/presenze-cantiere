/**
 * Funzioni per la geolocalizzazione
 * Check-in GPS, calcolo distanza, verifica area cantiere
 */

// Configurazione cantiere da variabili ambiente
const CANTIERE_CONFIG = {
  lat: parseFloat(import.meta.env.VITE_CANTIERE_LAT) || 45.4642,
  lng: parseFloat(import.meta.env.VITE_CANTIERE_LNG) || 9.1900,
  raggio: parseFloat(import.meta.env.VITE_CANTIERE_RAGGIO) || 150,
}

/**
 * Ottiene la posizione GPS corrente
 * @returns {Promise<{lat: number, lng: number, accuracy: number}>}
 */
export function getPosizione() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocalizzazione non supportata dal browser'))
      return
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy,
          timestamp: new Date().toISOString(),
        })
      },
      (error) => {
        let messaggio = 'Errore GPS: '
        switch (error.code) {
          case error.PERMISSION_DENIED:
            messaggio += 'Permesso negato. Abilita la localizzazione nelle impostazioni.'
            break
          case error.POSITION_UNAVAILABLE:
            messaggio += 'Posizione non disponibile.'
            break
          case error.TIMEOUT:
            messaggio += 'Timeout nella richiesta.'
            break
          default:
            messaggio += 'Errore sconosciuto.'
        }
        reject(new Error(messaggio))
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    )
  })
}

/**
 * Calcola la distanza tra due punti usando la formula di Haversine
 * @param {number} lat1 - Latitudine punto 1
 * @param {number} lng1 - Longitudine punto 1
 * @param {number} lat2 - Latitudine punto 2
 * @param {number} lng2 - Longitudine punto 2
 * @returns {number} Distanza in metri
 */
export function calcolaDistanza(lat1, lng1, lat2, lng2) {
  const R = 6371000 // Raggio terra in metri
  const rad = Math.PI / 180
  
  const dLat = (lat2 - lat1) * rad
  const dLng = (lng2 - lng1) * rad
  
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * rad) * Math.cos(lat2 * rad) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2)
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  
  return R * c
}

/**
 * Verifica se una posizione è dentro l'area del cantiere
 * @param {number} lat - Latitudine da verificare
 * @param {number} lng - Longitudine da verificare
 * @param {object} cantiere - {lat, lng, raggio} del cantiere (opzionale, usa config)
 * @returns {object} {inArea: boolean, distanza: number}
 */
export function verificaInArea(lat, lng, cantiere = CANTIERE_CONFIG) {
  const distanza = calcolaDistanza(lat, lng, cantiere.lat, cantiere.lng)
  
  return {
    inArea: distanza <= cantiere.raggio,
    distanza: Math.round(distanza),
    raggioMax: cantiere.raggio,
  }
}

/**
 * Esegue check-in completo con verifica GPS
 * @returns {Promise<object>} Risultato check-in con tutti i dati
 */
export async function checkIn() {
  try {
    // Ottieni posizione
    const posizione = await getPosizione()
    
    // Verifica se in area
    const verifica = verificaInArea(posizione.lat, posizione.lng)
    
    return {
      success: true,
      posizione: {
        lat: posizione.lat,
        lng: posizione.lng,
        accuracy: posizione.accuracy,
      },
      inArea: verifica.inArea,
      distanza: verifica.distanza,
      raggioMax: verifica.raggioMax,
      timestamp: posizione.timestamp,
      messaggio: verifica.inArea
        ? `Check-in valido! Sei a ${verifica.distanza}m dal centro cantiere.`
        : `Sei fuori dall'area cantiere (${verifica.distanza}m, max ${verifica.raggioMax}m).`,
    }
  } catch (error) {
    return {
      success: false,
      error: error.message,
      inArea: false,
    }
  }
}

/**
 * Ottiene la configurazione del cantiere
 */
export function getCantiereConfig() {
  return { ...CANTIERE_CONFIG }
}

/**
 * Formatta la distanza in modo leggibile
 */
export function formatDistanza(metri) {
  if (metri < 1000) {
    return `${Math.round(metri)} m`
  }
  return `${(metri / 1000).toFixed(1)} km`
}

/**
 * Controlla se il browser supporta la geolocalizzazione
 */
export function isGPSSupported() {
  return 'geolocation' in navigator
}

/**
 * Richiede permesso GPS (solo verifica, non blocca)
 */
export async function richiediPermessoGPS() {
  if (!isGPSSupported()) {
    return { granted: false, error: 'GPS non supportato' }
  }

  try {
    const result = await navigator.permissions.query({ name: 'geolocation' })
    return {
      granted: result.state === 'granted',
      state: result.state, // 'granted', 'denied', 'prompt'
    }
  } catch {
    // Fallback per browser che non supportano Permissions API
    return { granted: null, state: 'unknown' }
  }
}
