import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useI18n } from '../contexts/I18nContext'
import { supabase } from '../lib/supabase'
import { getPosizione, calcolaDistanza } from '../lib/gps'

export default function CheckinPage() {
  const { persona, progetto, assegnazione } = useAuth()
  const { t } = useI18n()
  
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [presenza, setPresenza] = useState(null)
  const [posizione, setPosizione] = useState(null)
  const [posizioneError, setPosizioneError] = useState(null)
  const [posizioneLoading, setPosizioneLoading] = useState(false)
  const [meteo, setMeteo] = useState(null)
  const [note, setNote] = useState('')
  const [storicoPresenze, setStoricoPresenze] = useState([])
  const [showStorico, setShowStorico] = useState(false)
  
  // Area di lavoro
  const [areeDisponibili, setAreeDisponibili] = useState([])
  const [selectedAreaId, setSelectedAreaId] = useState('')
  const [areaLavoro, setAreaLavoro] = useState(null)
  
  // QR Scanner states
  const [showQrScanner, setShowQrScanner] = useState(false)
  const [qrError, setQrError] = useState(null)
  const [qrSuccess, setQrSuccess] = useState(null)
  const [cameraStream, setCameraStream] = useState(null)
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const scanIntervalRef = useRef(null)
  const barcodeDetectorRef = useRef(null)

  const oggi = new Date().toISOString().split('T')[0]

  // Carica presenza odierna e aree
  useEffect(() => {
    if (persona?.id && progetto?.id) {
      loadData()
    }
  }, [persona?.id, progetto?.id])
  
  // Aggiorna area selezionata
  useEffect(() => {
    if (selectedAreaId) {
      const area = areeDisponibili.find(a => a.id === selectedAreaId)
      setAreaLavoro(area || null)
    } else {
      setAreaLavoro(null)
    }
  }, [selectedAreaId, areeDisponibili])
  
  // Cleanup camera on unmount
  useEffect(() => {
    return () => {
      stopQrScanner()
    }
  }, [])
  
  // Carica jsQR dinamicamente
  useEffect(() => {
    if (!window.jsQR) {
      const script = document.createElement('script')
      script.src = 'https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.min.js'
      script.async = true
      script.onload = () => console.log('jsQR loaded')
      document.head.appendChild(script)
    }
  }, [])
  
  // Inizializza BarcodeDetector se disponibile (Chrome/Android)
  useEffect(() => {
    if ('BarcodeDetector' in window) {
      try {
        barcodeDetectorRef.current = new window.BarcodeDetector({
          formats: ['qr_code', 'code_128', 'code_39', 'ean_13', 'ean_8']
        })
        console.log('BarcodeDetector initialized')
      } catch (e) {
        console.log('BarcodeDetector non supportato:', e)
      }
    }
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      // Carica presenza odierna
      const { data: presenzaData } = await supabase
        .from('presenze')
        .select('*')
        .eq('persona_id', persona.id)
        .eq('progetto_id', progetto.id)
        .eq('data', oggi)
        .maybeSingle()
      
      setPresenza(presenzaData)
      
      // Carica tutte le aree disponibili per il progetto
      // Non filtrare per 'attiva' se il campo potrebbe non esistere
      const { data: areeData, error: areeError } = await supabase
        .from('aree_lavoro')
        .select('*')
        .eq('progetto_id', progetto.id)
        .order('nome')
      
      if (areeError) {
        console.error('Errore caricamento aree:', areeError)
      }
      
      // Filtra solo se il campo attiva esiste e è false
      const areeFiltrate = (areeData || []).filter(a => a.attiva !== false)
      setAreeDisponibili(areeFiltrate)
      
      // Pre-seleziona area dall'assegnazione se disponibile
      if (assegnazione?.area_lavoro_id) {
        setSelectedAreaId(assegnazione.area_lavoro_id)
      } else if (areeData?.length === 1) {
        // Se c'è solo un'area, selezionala automaticamente
        setSelectedAreaId(areeData[0].id)
      }

      // Carica storico presenze (ultimi 7 giorni)
      const settimanafa = new Date()
      settimanafa.setDate(settimanafa.getDate() - 7)
      
      const { data: storicoData } = await supabase
        .from('presenze')
        .select('*, area:aree_lavoro(nome)')
        .eq('persona_id', persona.id)
        .eq('progetto_id', progetto.id)
        .gte('data', settimanafa.toISOString().split('T')[0])
        .order('data', { ascending: false })
      
      setStoricoPresenze(storicoData || [])

    } catch (error) {
      console.error('Errore caricamento dati:', error)
    } finally {
      setLoading(false)
    }
  }

  // Ottieni posizione GPS
  const ottieniPosizione = async () => {
    setPosizioneError(null)
    setPosizioneLoading(true)
    try {
      const pos = await getPosizione()
      setPosizione({
        lat: pos.lat,
        lng: pos.lng,
        accuracy: pos.accuracy
      })
      
      // Carica meteo
      await caricaMeteo(pos.lat, pos.lng)
    } catch (error) {
      setPosizioneError(error.message || 'Impossibile ottenere la posizione')
    } finally {
      setPosizioneLoading(false)
    }
  }

  // Carica dati meteo
  const caricaMeteo = async (lat, lng) => {
    try {
      const apiKey = import.meta.env.VITE_OPENWEATHERMAP_API_KEY
      if (!apiKey) return
      
      const response = await fetch(
        `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lng}&appid=${apiKey}&units=metric&lang=it`
      )
      const data = await response.json()
      
      setMeteo({
        temp: Math.round(data.main.temp),
        descrizione: data.weather[0].description,
        icona: data.weather[0].icon,
        umidita: data.main.humidity,
        vento: Math.round(data.wind.speed * 3.6)
      })
    } catch (error) {
      console.error('Errore caricamento meteo:', error)
    }
  }

  // Verifica distanza da area lavoro
  const verificaDistanza = () => {
    if (!posizione || !areaLavoro?.latitudine || !areaLavoro?.longitudine) return null
    
    const distanza = calcolaDistanza(
      posizione.lat,
      posizione.lng,
      areaLavoro.latitudine,
      areaLavoro.longitudine
    )
    
    return {
      distanza: Math.round(distanza),
      dentroArea: distanza <= (areaLavoro.raggio || 100)
    }
  }
  
  // ═══════════════════════════════════════════════════════════════
  // QR SCANNER FUNCTIONS
  // ═══════════════════════════════════════════════════════════════
  
  const startQrScanner = async () => {
    setQrError(null)
    setQrSuccess(null)
    setShowQrScanner(true)
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: 'environment',
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      })
      
      setCameraStream(stream)
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        
        videoRef.current.onloadedmetadata = () => {
          videoRef.current.play()
          setTimeout(() => startScanning(), 500)
        }
      }
    } catch (error) {
      console.error('Errore accesso fotocamera:', error)
      if (error.name === 'NotAllowedError') {
        setQrError('Permesso fotocamera negato. Consenti l\'accesso nelle impostazioni.')
      } else if (error.name === 'NotFoundError') {
        setQrError('Nessuna fotocamera trovata.')
      } else {
        setQrError('Errore fotocamera: ' + error.message)
      }
      setShowQrScanner(false)
    }
  }
  
  const startScanning = () => {
    if (!videoRef.current || !canvasRef.current) return
    
    const video = videoRef.current
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    
    const scan = async () => {
      if (!video.videoWidth || !video.videoHeight) return
      
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
      
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
      
      // Metodo 1: jsQR (funziona su iOS Safari)
      if (window.jsQR) {
        try {
          const code = window.jsQR(imageData.data, imageData.width, imageData.height, {
            inversionAttempts: 'dontInvert'
          })
          if (code && code.data) {
            console.log('jsQR found:', code.data)
            handleQrCodeDetected(code.data)
            return
          }
        } catch (e) {
          console.log('jsQR error:', e)
        }
      }
      
      // Metodo 2: BarcodeDetector API (Chrome/Android)
      if (barcodeDetectorRef.current) {
        try {
          const barcodes = await barcodeDetectorRef.current.detect(canvas)
          if (barcodes.length > 0) {
            console.log('BarcodeDetector found:', barcodes[0].rawValue)
            handleQrCodeDetected(barcodes[0].rawValue)
            return
          }
        } catch (e) {
          // Ignora errori
        }
      }
    }
    
    // Scansiona ogni 150ms per più reattività
    scanIntervalRef.current = setInterval(scan, 150)
  }
  
  const stopQrScanner = () => {
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current)
      scanIntervalRef.current = null
    }
    
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop())
      setCameraStream(null)
    }
    
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
    
    setShowQrScanner(false)
  }
  
  const handleQrCodeDetected = (code) => {
    console.log('QR Code rilevato:', code)
    stopQrScanner()
    
    let searchCode = code
    let searchAreaId = null
    
    // Prova a parsare come JSON (formato: {"code":"QR-XXX","area":"uuid",...})
    try {
      const parsed = JSON.parse(code)
      if (parsed.code) searchCode = parsed.code
      if (parsed.area) searchAreaId = parsed.area
      console.log('QR JSON parsed:', parsed)
    } catch (e) {
      // Non è JSON, usa il codice così com'è
      console.log('QR non è JSON, uso raw:', code)
    }
    
    // Cerca area corrispondente
    let areaMatch = null
    
    // Prima cerca per ID area (dal JSON)
    if (searchAreaId) {
      areaMatch = areeDisponibili.find(a => a.id === searchAreaId)
    }
    
    // Se non trovato, cerca per qr_code o codice
    if (!areaMatch) {
      areaMatch = areeDisponibili.find(a => 
        a.qr_code === searchCode || 
        a.codice === searchCode ||
        a.nome.toLowerCase() === searchCode.toLowerCase() ||
        a.id === searchCode
      )
    }
    
    if (areaMatch) {
      setSelectedAreaId(areaMatch.id)
      setQrSuccess(`Area "${areaMatch.nome}" selezionata!`)
      setQrError(null)
      // Auto ottieni posizione
      if (!posizione) {
        ottieniPosizione()
      }
    } else {
      setQrError(`Codice "${searchCode}" non corrisponde a nessuna area configurata.`)
      setQrSuccess(null)
    }
  }
  
  const handleFileInput = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    
    setQrError(null)
    setQrSuccess(null)
    
    try {
      const img = new Image()
      img.src = URL.createObjectURL(file)
      
      await new Promise((resolve, reject) => {
        img.onload = resolve
        img.onerror = reject
      })
      
      const canvas = document.createElement('canvas')
      canvas.width = img.width
      canvas.height = img.height
      const ctx = canvas.getContext('2d')
      ctx.drawImage(img, 0, 0)
      
      // Prova BarcodeDetector
      if (barcodeDetectorRef.current) {
        try {
          const barcodes = await barcodeDetectorRef.current.detect(canvas)
          if (barcodes.length > 0) {
            handleQrCodeDetected(barcodes[0].rawValue)
            URL.revokeObjectURL(img.src)
            return
          }
        } catch (e) {}
      }
      
      // Prova jsQR
      if (typeof window.jsQR !== 'undefined') {
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
        const code = window.jsQR(imageData.data, imageData.width, imageData.height)
        if (code) {
          handleQrCodeDetected(code.data)
          URL.revokeObjectURL(img.src)
          return
        }
      }
      
      setQrError('QR code non rilevato. Riprova o seleziona l\'area manualmente.')
      URL.revokeObjectURL(img.src)
    } catch (error) {
      setQrError('Errore durante l\'analisi dell\'immagine')
    }
    
    e.target.value = ''
  }

  // ═══════════════════════════════════════════════════════════════
  // REGISTRAZIONE PRESENZE
  // ═══════════════════════════════════════════════════════════════

  const registraEntrata = async () => {
    if (!selectedAreaId) {
      alert('Seleziona un\'area di lavoro')
      return
    }
    
    if (!posizione) {
      alert('Ottieni prima la posizione GPS')
      return
    }

    setSubmitting(true)
    try {
      const distanzaInfo = verificaDistanza()
      
      const { data, error } = await supabase
        .from('presenze')
        .insert({
          persona_id: persona.id,
          progetto_id: progetto.id,
          area_lavoro_id: selectedAreaId,
          data: oggi,
          ora_entrata: new Date().toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' }),
          latitudine_entrata: posizione?.lat,
          longitudine_entrata: posizione?.lng,
          metodo_entrata: 'gps',
          fuori_zona_entrata: distanzaInfo ? !distanzaInfo.dentroArea : null,
          note_entrata: note,
          meteo_entrata: meteo ? JSON.stringify(meteo) : null
        })
        .select()
        .single()

      if (error) throw error
      
      setPresenza(data)
      setNote('')
      loadData() // Ricarica per aggiornare storico
    } catch (error) {
      console.error('Errore registrazione entrata:', error)
      alert('Errore durante la registrazione: ' + error.message)
    } finally {
      setSubmitting(false)
    }
  }

  const registraUscita = async () => {
    if (!presenza) return

    setSubmitting(true)
    try {
      // Riottieni posizione per uscita
      let posUscita = posizione
      if (!posUscita) {
        try {
          const pos = await getPosizione()
          posUscita = { lat: pos.lat, lng: pos.lng, accuracy: pos.accuracy }
          setPosizione(posUscita)
        } catch (e) {
          // Continua senza posizione
        }
      }
      
      const distanzaInfo = areaLavoro && posUscita ? {
        distanza: Math.round(calcolaDistanza(posUscita.lat, posUscita.lng, areaLavoro.latitudine, areaLavoro.longitudine)),
        dentroArea: calcolaDistanza(posUscita.lat, posUscita.lng, areaLavoro.latitudine, areaLavoro.longitudine) <= (areaLavoro.raggio || 100)
      } : null
      
      const oraUscita = new Date().toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })
      
      // Calcola ore lavorate
      const [oreE, minE] = presenza.ora_entrata.split(':').map(Number)
      const [oreU, minU] = oraUscita.split(':').map(Number)
      const minutiTotali = (oreU * 60 + minU) - (oreE * 60 + minE)
      const oreLavorate = (minutiTotali / 60).toFixed(2)

      const { data, error } = await supabase
        .from('presenze')
        .update({
          ora_uscita: oraUscita,
          latitudine_uscita: posUscita?.lat,
          longitudine_uscita: posUscita?.lng,
          metodo_uscita: 'gps',
          fuori_zona_uscita: distanzaInfo ? !distanzaInfo.dentroArea : null,
          note_uscita: note,
          ore_lavorate: parseFloat(oreLavorate)
        })
        .eq('id', presenza.id)
        .select()
        .single()

      if (error) throw error
      
      setPresenza(data)
      setNote('')
      loadData()
    } catch (error) {
      console.error('Errore registrazione uscita:', error)
      alert('Errore durante la registrazione: ' + error.message)
    } finally {
      setSubmitting(false)
    }
  }

  const distanzaInfo = verificaDistanza()
  
  // Check se può fare check-in
  const canCheckIn = selectedAreaId && posizione && !presenza
  const canCheckOut = presenza && !presenza.ora_uscita

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-500">{t('loading')}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 lg:p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl lg:text-3xl font-bold text-gray-800 flex items-center gap-2">
          📍 Check-in / Check-out
        </h1>
        <p className="text-gray-500 mt-1">
          {new Date().toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' })}
        </p>
      </div>

      {/* Layout Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Colonna Principale */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Card Stato Attuale */}
          <div className={`rounded-2xl p-6 ${
            !presenza 
              ? 'bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200' 
              : presenza.ora_uscita 
                ? 'bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-200'
                : 'bg-gradient-to-br from-amber-50 to-orange-50 border-2 border-amber-200'
          }`}>
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <div className="text-6xl">
                {!presenza ? '👋' : presenza.ora_uscita ? '✅' : '🔔'}
              </div>
              <div className="text-center sm:text-left flex-1">
                <h2 className="text-xl font-bold text-gray-800">
                  {!presenza 
                    ? 'Pronto per iniziare?' 
                    : presenza.ora_uscita 
                      ? 'Giornata completata!'
                      : 'Sei al lavoro'}
                </h2>
                <p className="text-gray-600 mt-1">
                  {!presenza 
                    ? 'Seleziona l\'area e registra la tua entrata'
                    : presenza.ora_uscita 
                      ? `Hai lavorato ${presenza.ore_lavorate || '-'} ore`
                      : `Entrata alle ${presenza.ora_entrata}`}
                </p>
                {presenza && !presenza.ora_uscita && (
                  <div className="mt-3">
                    <span className="inline-flex items-center gap-2 px-3 py-1 bg-amber-100 text-amber-700 rounded-full text-sm font-medium">
                      <span className="w-2 h-2 bg-amber-500 rounded-full animate-pulse"></span>
                      In corso da {presenza.ora_entrata}
                    </span>
                  </div>
                )}
              </div>
              
              {presenza && (
                <div className="hidden sm:flex gap-4 text-center">
                  <div className="bg-white/80 rounded-xl px-4 py-2">
                    <p className="text-xs text-gray-500 uppercase">Entrata</p>
                    <p className="text-lg font-bold text-green-600">{presenza.ora_entrata}</p>
                  </div>
                  {presenza.ora_uscita && (
                    <div className="bg-white/80 rounded-xl px-4 py-2">
                      <p className="text-xs text-gray-500 uppercase">Uscita</p>
                      <p className="text-lg font-bold text-red-600">{presenza.ora_uscita}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Se giornata completata */}
          {presenza?.ora_uscita ? (
            <div className="bg-white rounded-2xl p-6 border shadow-sm">
              <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                📋 Riepilogo Giornata
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="bg-gray-50 rounded-xl p-4 text-center">
                  <p className="text-2xl font-bold text-gray-800">{presenza.ora_entrata}</p>
                  <p className="text-xs text-gray-500 uppercase mt-1">Entrata</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-4 text-center">
                  <p className="text-2xl font-bold text-gray-800">{presenza.ora_uscita}</p>
                  <p className="text-xs text-gray-500 uppercase mt-1">Uscita</p>
                </div>
                <div className="bg-blue-50 rounded-xl p-4 text-center">
                  <p className="text-2xl font-bold text-blue-600">{presenza.ore_lavorate}h</p>
                  <p className="text-xs text-gray-500 uppercase mt-1">Totale</p>
                </div>
                <div className="bg-green-50 rounded-xl p-4 text-center">
                  <p className="text-2xl">✅</p>
                  <p className="text-xs text-gray-500 uppercase mt-1">Completato</p>
                </div>
              </div>
            </div>
          ) : (
            <>
              {/* ═══════════════════════════════════════════════════════════
                  SELEZIONE AREA DI LAVORO
                  ═══════════════════════════════════════════════════════════ */}
              <div className="bg-white rounded-2xl p-6 border shadow-sm">
                <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                  🏗️ Area di Lavoro
                </h3>
                
                {areeDisponibili.length === 0 ? (
                  <div className="p-4 bg-amber-50 text-amber-700 rounded-xl">
                    <p className="font-medium">⚠️ Nessuna area configurata</p>
                    <p className="text-sm mt-1">Contatta l'amministratore per configurare le aree di lavoro.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Dropdown selezione area */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Seleziona la tua area di lavoro
                      </label>
                      <select
                        value={selectedAreaId}
                        onChange={(e) => setSelectedAreaId(e.target.value)}
                        className="w-full px-4 py-3 border-2 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-lg"
                      >
                        <option value="">-- Seleziona area --</option>
                        {areeDisponibili.map(area => (
                          <option key={area.id} value={area.id}>
                            {area.nome} {area.codice ? `(${area.codice})` : ''}
                          </option>
                        ))}
                      </select>
                    </div>
                    
                    {/* Info area selezionata */}
                    {areaLavoro && (
                      <div className="p-4 bg-blue-50 rounded-xl border border-blue-200">
                        <div className="flex items-start gap-3">
                          <span className="text-2xl">📍</span>
                          <div className="flex-1">
                            <p className="font-semibold text-blue-900">{areaLavoro.nome}</p>
                            {areaLavoro.descrizione && (
                              <p className="text-sm text-blue-700 mt-1">{areaLavoro.descrizione}</p>
                            )}
                            <div className="flex flex-wrap gap-3 mt-2 text-xs text-blue-600">
                              {areaLavoro.raggio && (
                                <span>📏 Raggio: {areaLavoro.raggio}m</span>
                              )}
                              {areaLavoro.qr_code && (
                                <span>📱 QR: {areaLavoro.qr_code}</span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {/* Oppure scansiona QR */}
                    <div className="relative">
                      <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-gray-200"></div>
                      </div>
                      <div className="relative flex justify-center text-sm">
                        <span className="px-3 bg-white text-gray-500">oppure scansiona QR</span>
                      </div>
                    </div>
                    
                    {/* Messaggi QR */}
                    {qrSuccess && (
                      <div className="p-3 bg-green-50 text-green-700 rounded-xl text-sm">
                        ✅ {qrSuccess}
                      </div>
                    )}
                    {qrError && (
                      <div className="p-3 bg-red-50 text-red-700 rounded-xl text-sm">
                        ❌ {qrError}
                      </div>
                    )}
                    
                    {/* Scanner Video */}
                    {showQrScanner && (
                      <div className="relative bg-black rounded-xl overflow-hidden">
                        <video 
                          ref={videoRef}
                          className="w-full h-64 object-cover"
                          playsInline
                          muted
                          autoPlay
                        />
                        <canvas ref={canvasRef} className="hidden" />
                        
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                          <div className="w-48 h-48 border-2 border-white rounded-xl opacity-70">
                            <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-green-400 rounded-tl-lg"></div>
                            <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-green-400 rounded-tr-lg"></div>
                            <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-green-400 rounded-bl-lg"></div>
                            <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-green-400 rounded-br-lg"></div>
                          </div>
                        </div>
                        
                        <button
                          onClick={stopQrScanner}
                          type="button"
                          className="absolute top-3 right-3 w-10 h-10 bg-red-500 text-white rounded-full flex items-center justify-center shadow-lg active:bg-red-600"
                        >
                          ✕
                        </button>
                        
                        <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-center py-2 text-sm">
                          📷 Inquadra il QR code dell'area
                        </div>
                      </div>
                    )}
                    
                    {/* Pulsanti QR */}
                    {!showQrScanner && (
                      <div className="grid grid-cols-2 gap-3">
                        <button 
                          onClick={startQrScanner}
                          type="button"
                          className="py-3 bg-purple-100 hover:bg-purple-200 active:bg-purple-300 text-purple-700 rounded-xl font-medium transition-colors flex items-center justify-center gap-2"
                        >
                          📷 Scansiona QR
                        </button>
                        
                        <label className="py-3 bg-indigo-100 hover:bg-indigo-200 active:bg-indigo-300 text-indigo-700 rounded-xl font-medium transition-colors flex items-center justify-center gap-2 cursor-pointer">
                          📸 Da foto
                          <input
                            type="file"
                            accept="image/*"
                            capture="environment"
                            onChange={handleFileInput}
                            className="hidden"
                          />
                        </label>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* ═══════════════════════════════════════════════════════════
                  POSIZIONE GPS
                  ═══════════════════════════════════════════════════════════ */}
              <div className="bg-white rounded-2xl p-6 border shadow-sm">
                <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                  📍 Posizione GPS
                </h3>
                
                {posizione ? (
                  <div className="space-y-4">
                    <div className="flex items-center gap-3 p-4 bg-green-50 rounded-xl">
                      <span className="text-2xl">✅</span>
                      <div className="flex-1">
                        <p className="font-medium text-green-800">Posizione ottenuta</p>
                        <p className="text-sm text-green-600">
                          {posizione.lat.toFixed(6)}, {posizione.lng.toFixed(6)}
                        </p>
                        <p className="text-xs text-green-500">
                          Precisione: ±{posizione.accuracy?.toFixed(0) || '?'}m
                        </p>
                      </div>
                    </div>
                    
                    {distanzaInfo && (
                      <div className={`p-4 rounded-xl ${
                        distanzaInfo.dentroArea 
                          ? 'bg-green-50 border border-green-200' 
                          : 'bg-orange-50 border border-orange-200'
                      }`}>
                        <p className={`font-medium ${distanzaInfo.dentroArea ? 'text-green-800' : 'text-orange-800'}`}>
                          {distanzaInfo.dentroArea ? '✅ Dentro l\'area' : '⚠️ Fuori dall\'area'}
                        </p>
                        <p className="text-sm text-gray-600">
                          Distanza dal centro: {distanzaInfo.distanza}m
                        </p>
                      </div>
                    )}
                    
                    <button
                      onClick={ottieniPosizione}
                      disabled={posizioneLoading}
                      type="button"
                      className="w-full py-3 bg-blue-100 hover:bg-blue-200 active:bg-blue-300 text-blue-700 rounded-xl font-medium transition-colors disabled:opacity-50"
                    >
                      {posizioneLoading ? '⏳ Acquisizione...' : '🔄 Aggiorna posizione'}
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {posizioneError && (
                      <div className="p-4 bg-red-50 text-red-700 rounded-xl">
                        <p className="font-medium">❌ Errore</p>
                        <p className="text-sm">{posizioneError}</p>
                      </div>
                    )}
                    <button
                      onClick={ottieniPosizione}
                      disabled={posizioneLoading}
                      type="button"
                      className="w-full py-4 bg-blue-500 hover:bg-blue-600 active:bg-blue-700 text-white rounded-xl font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {posizioneLoading ? (
                        <>
                          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          Acquisizione...
                        </>
                      ) : (
                        <>📍 Ottieni posizione</>
                      )}
                    </button>
                  </div>
                )}
              </div>

              {/* Note */}
              <div className="bg-white rounded-2xl p-6 border shadow-sm">
                <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                  📝 Note (opzionale)
                </h3>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Aggiungi note..."
                  rows={2}
                  className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                />
              </div>

              {/* Pulsante Azione Principale */}
              {canCheckIn && (
                <button
                  onClick={registraEntrata}
                  disabled={submitting}
                  type="button"
                  className="w-full py-5 rounded-2xl font-bold text-lg bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 active:from-green-700 active:to-green-800 text-white shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                >
                  {submitting ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Registrazione...
                    </>
                  ) : (
                    <>✅ Registra Entrata</>
                  )}
                </button>
              )}
              
              {canCheckOut && (
                <button
                  onClick={registraUscita}
                  disabled={submitting}
                  type="button"
                  className="w-full py-5 rounded-2xl font-bold text-lg bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 active:from-red-700 active:to-red-800 text-white shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                >
                  {submitting ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Registrazione...
                    </>
                  ) : (
                    <>🚪 Registra Uscita</>
                  )}
                </button>
              )}
              
              {/* Messaggio se mancano requisiti */}
              {!canCheckIn && !canCheckOut && !presenza && (
                <div className="p-4 bg-gray-50 rounded-xl text-center text-gray-500">
                  {!selectedAreaId && <p>👆 Seleziona un'area di lavoro</p>}
                  {selectedAreaId && !posizione && <p>👆 Ottieni la posizione GPS</p>}
                </div>
              )}
            </>
          )}
        </div>

        {/* Colonna Laterale */}
        <div className="space-y-6">
          
          {/* Card Meteo */}
          {meteo && (
            <div className="bg-gradient-to-br from-sky-50 to-blue-50 rounded-2xl p-6 border border-sky-200">
              <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                🌤️ Meteo
              </h3>
              <div className="flex items-center gap-4">
                <img 
                  src={`https://openweathermap.org/img/wn/${meteo.icona}@2x.png`}
                  alt={meteo.descrizione}
                  className="w-16 h-16"
                />
                <div>
                  <p className="text-3xl font-bold text-gray-800">{meteo.temp}°C</p>
                  <p className="text-gray-600 capitalize">{meteo.descrizione}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 mt-4">
                <div className="bg-white/60 rounded-lg p-3 text-center">
                  <p className="text-xs text-gray-500">Umidità</p>
                  <p className="font-semibold">{meteo.umidita}%</p>
                </div>
                <div className="bg-white/60 rounded-lg p-3 text-center">
                  <p className="text-xs text-gray-500">Vento</p>
                  <p className="font-semibold">{meteo.vento} km/h</p>
                </div>
              </div>
            </div>
          )}

          {/* Storico Presenze */}
          <div className="bg-white rounded-2xl p-6 border shadow-sm">
            <button
              onClick={() => setShowStorico(!showStorico)}
              type="button"
              className="w-full flex items-center justify-between"
            >
              <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                📅 Storico Recente
              </h3>
              <span className={`transition-transform ${showStorico ? 'rotate-180' : ''}`}>
                ▼
              </span>
            </button>
            
            {showStorico && (
              <div className="mt-4 space-y-3">
                {storicoPresenze.length === 0 ? (
                  <p className="text-gray-500 text-sm text-center py-4">
                    Nessuna presenza registrata
                  </p>
                ) : (
                  storicoPresenze.slice(0, 7).map((p) => (
                    <div 
                      key={p.id}
                      className={`p-3 rounded-xl ${
                        p.data === oggi ? 'bg-blue-50' : 'bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-sm">
                            {new Date(p.data).toLocaleDateString('it-IT', { 
                              weekday: 'short', 
                              day: 'numeric', 
                              month: 'short' 
                            })}
                          </p>
                          <p className="text-xs text-gray-500">
                            {p.ora_entrata} - {p.ora_uscita || '...'}
                          </p>
                        </div>
                        <div className="text-right">
                          {p.ore_lavorate ? (
                            <span className="text-sm font-semibold text-green-600">
                              {p.ore_lavorate}h
                            </span>
                          ) : (
                            <span className="text-xs text-amber-600 bg-amber-100 px-2 py-1 rounded">
                              In corso
                            </span>
                          )}
                        </div>
                      </div>
                      {p.area?.nome && (
                        <p className="text-xs text-gray-400 mt-1">📍 {p.area.nome}</p>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Info Progetto */}
          <div className="bg-gray-50 rounded-2xl p-6">
            <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
              📁 Progetto
            </h3>
            <div className="space-y-2">
              <p className="font-medium text-gray-800">{progetto?.nome}</p>
              <p className="text-sm text-gray-500">{progetto?.codice}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
