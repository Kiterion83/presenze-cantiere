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
  const [areaLavoro, setAreaLavoro] = useState(null)
  const [areeDisponibili, setAreeDisponibili] = useState([])
  const [meteo, setMeteo] = useState(null)
  const [note, setNote] = useState('')
  const [modalita, setModalita] = useState('gps') // 'gps' o 'qr'
  const [qrCode, setQrCode] = useState('')
  const [storicoPresenze, setStoricoPresenze] = useState([])
  const [showStorico, setShowStorico] = useState(false)
  
  // QR Scanner states
  const [showQrScanner, setShowQrScanner] = useState(false)
  const [qrError, setQrError] = useState(null)
  const [cameraStream, setCameraStream] = useState(null)
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const scanIntervalRef = useRef(null)

  const oggi = new Date().toISOString().split('T')[0]

  // Carica presenza odierna e area lavoro
  useEffect(() => {
    if (persona?.id && progetto?.id) {
      loadData()
    }
  }, [persona?.id, progetto?.id])
  
  // Cleanup camera on unmount
  useEffect(() => {
    return () => {
      stopQrScanner()
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

      // Carica area lavoro dell'assegnazione
      if (assegnazione?.area_lavoro_id) {
        const { data: areaData } = await supabase
          .from('aree_lavoro')
          .select('*')
          .eq('id', assegnazione.area_lavoro_id)
          .single()
        
        setAreaLavoro(areaData)
      }
      
      // Carica tutte le aree disponibili per il progetto (per QR)
      const { data: areeData } = await supabase
        .from('aree_lavoro')
        .select('*')
        .eq('progetto_id', progetto.id)
        .eq('attiva', true)
      
      setAreeDisponibili(areeData || [])

      // Carica storico presenze (ultimi 7 giorni)
      const settimanafa = new Date()
      settimanafa.setDate(settimanafa.getDate() - 7)
      
      const { data: storicoData } = await supabase
        .from('presenze')
        .select('*')
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
    if (!posizione || !areaLavoro) return null
    
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
  
  // Avvia scanner QR con fotocamera
  const startQrScanner = async () => {
    setQrError(null)
    setShowQrScanner(true)
    
    try {
      // Richiedi accesso alla fotocamera posteriore
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: 'environment',
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      })
      
      setCameraStream(stream)
      
      // Collega lo stream al video element
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        videoRef.current.play()
        
        // Inizia la scansione dopo un breve delay
        setTimeout(() => {
          startScanning()
        }, 500)
      }
    } catch (error) {
      console.error('Errore accesso fotocamera:', error)
      if (error.name === 'NotAllowedError') {
        setQrError('Permesso fotocamera negato. Consenti l\'accesso alla fotocamera nelle impostazioni del browser.')
      } else if (error.name === 'NotFoundError') {
        setQrError('Nessuna fotocamera trovata sul dispositivo.')
      } else {
        setQrError('Impossibile accedere alla fotocamera: ' + error.message)
      }
      setShowQrScanner(false)
    }
  }
  
  // Scansione periodica del video per QR code
  const startScanning = () => {
    if (!videoRef.current || !canvasRef.current) return
    
    const video = videoRef.current
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    
    const scan = async () => {
      if (!video.videoWidth || !video.videoHeight) return
      
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
      
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
      
      // Prova a usare jsQR se disponibile (globale)
      if (typeof window.jsQR !== 'undefined') {
        const code = window.jsQR(imageData.data, imageData.width, imageData.height)
        if (code) {
          handleQrCodeDetected(code.data)
          return
        }
      }
    }
    
    // Scansiona ogni 200ms
    scanIntervalRef.current = setInterval(scan, 200)
  }
  
  // Stop scanner
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
  
  // Gestisci QR code rilevato
  const handleQrCodeDetected = (code) => {
    console.log('QR Code rilevato:', code)
    stopQrScanner()
    setQrCode(code)
    setQrError(null)
    
    // Verifica se il codice corrisponde a un'area
    const areaMatch = areeDisponibili.find(a => 
      a.qr_code === code || 
      a.codice === code ||
      a.nome.toLowerCase() === code.toLowerCase()
    )
    
    if (areaMatch) {
      setAreaLavoro(areaMatch)
      // Ottieni posizione per il checkin
      ottieniPosizione()
    }
  }
  
  // Input manuale QR code
  const handleManualQrSubmit = () => {
    if (!qrCode.trim()) {
      setQrError('Inserisci un codice')
      return
    }
    handleQrCodeDetected(qrCode.trim())
  }
  
  // Fallback: usa input file per scattare foto
  const handleFileInput = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    
    setQrError(null)
    
    try {
      // Crea un'immagine dal file
      const img = new Image()
      img.src = URL.createObjectURL(file)
      
      await new Promise((resolve, reject) => {
        img.onload = resolve
        img.onerror = reject
      })
      
      // Disegna su canvas per analisi
      const canvas = document.createElement('canvas')
      canvas.width = img.width
      canvas.height = img.height
      const ctx = canvas.getContext('2d')
      ctx.drawImage(img, 0, 0)
      
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
      
      // Prova jsQR se disponibile
      if (typeof window.jsQR !== 'undefined') {
        const code = window.jsQR(imageData.data, imageData.width, imageData.height)
        if (code) {
          handleQrCodeDetected(code.data)
          URL.revokeObjectURL(img.src)
          return
        }
      }
      
      // Fallback: mostra errore
      setQrError('QR code non rilevato nella foto. Riprova o inserisci il codice manualmente.')
      
      URL.revokeObjectURL(img.src)
    } catch (error) {
      console.error('Errore analisi immagine:', error)
      setQrError('Errore durante l\'analisi dell\'immagine')
    }
    
    // Reset input
    e.target.value = ''
  }

  // Registra entrata
  const registraEntrata = async () => {
    if (!posizione && modalita === 'gps') {
      alert('Ottieni prima la posizione GPS')
      return
    }
    
    if (modalita === 'qr' && !qrCode && !areaLavoro) {
      alert('Scansiona o inserisci un codice QR')
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
          data: oggi,
          ora_entrata: new Date().toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' }),
          latitudine_entrata: posizione?.lat,
          longitudine_entrata: posizione?.lng,
          metodo_entrata: modalita,
          fuori_zona_entrata: distanzaInfo ? !distanzaInfo.dentroArea : false,
          note_entrata: note,
          meteo_entrata: meteo ? JSON.stringify(meteo) : null
        })
        .select()
        .single()

      if (error) throw error
      
      setPresenza(data)
      setNote('')
      setQrCode('')
    } catch (error) {
      console.error('Errore registrazione entrata:', error)
      alert('Errore durante la registrazione')
    } finally {
      setSubmitting(false)
    }
  }

  // Registra uscita
  const registraUscita = async () => {
    if (!presenza) return

    setSubmitting(true)
    try {
      const distanzaInfo = verificaDistanza()
      
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
          latitudine_uscita: posizione?.lat,
          longitudine_uscita: posizione?.lng,
          metodo_uscita: modalita,
          fuori_zona_uscita: distanzaInfo ? !distanzaInfo.dentroArea : false,
          note_uscita: note,
          ore_lavorate: parseFloat(oreLavorate)
        })
        .eq('id', presenza.id)
        .select()
        .single()

      if (error) throw error
      
      setPresenza(data)
      setNote('')
    } catch (error) {
      console.error('Errore registrazione uscita:', error)
      alert('Errore durante la registrazione')
    } finally {
      setSubmitting(false)
    }
  }

  const distanzaInfo = verificaDistanza()

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
                    ? 'Registra la tua entrata per iniziare'
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
              {/* Modalità Check-in */}
              <div className="bg-white rounded-2xl p-6 border shadow-sm">
                <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                  🎯 Modalità Check-in
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    onClick={() => setModalita('gps')}
                    className={`p-4 rounded-xl border-2 transition-all ${
                      modalita === 'gps'
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-gray-200 hover:border-blue-200 hover:bg-blue-50/50'
                    }`}
                  >
                    <div className="text-3xl mb-2">📍</div>
                    <p className="font-medium">GPS</p>
                    <p className="text-xs text-gray-500 mt-1">Posizione automatica</p>
                  </button>
                  <button
                    onClick={() => setModalita('qr')}
                    className={`p-4 rounded-xl border-2 transition-all ${
                      modalita === 'qr'
                        ? 'border-purple-500 bg-purple-50 text-purple-700'
                        : 'border-gray-200 hover:border-purple-200 hover:bg-purple-50/50'
                    }`}
                  >
                    <div className="text-3xl mb-2">📱</div>
                    <p className="font-medium">QR Code</p>
                    <p className="text-xs text-gray-500 mt-1">Scansiona codice</p>
                  </button>
                </div>
              </div>

              {/* GPS */}
              {modalita === 'gps' && (
                <div className="bg-white rounded-2xl p-6 border shadow-sm">
                  <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                    📍 Posizione GPS
                  </h3>
                  
                  {posizione ? (
                    <div className="space-y-4">
                      <div className="flex items-center gap-3 p-4 bg-green-50 rounded-xl">
                        <span className="text-2xl">✅</span>
                        <div>
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
                            {distanzaInfo.dentroArea ? '✅ Dentro l\'area di lavoro' : '⚠️ Fuori dall\'area di lavoro'}
                          </p>
                          <p className="text-sm text-gray-600">
                            Distanza: {distanzaInfo.distanza}m
                          </p>
                        </div>
                      )}
                      
                      <button
                        onClick={ottieniPosizione}
                        className="w-full py-3 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-xl font-medium transition-colors"
                      >
                        🔄 Aggiorna posizione
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
                        className="w-full py-4 bg-blue-500 hover:bg-blue-600 text-white rounded-xl font-medium transition-colors flex items-center justify-center gap-2"
                      >
                        📍 Ottieni posizione
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* QR Code */}
              {modalita === 'qr' && (
                <div className="bg-white rounded-2xl p-6 border shadow-sm">
                  <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                    📱 Scansione QR Code
                  </h3>
                  
                  <div className="space-y-4">
                    <p className="text-gray-500 text-sm">
                      Scansiona il QR dell'area di lavoro o inserisci il codice manualmente
                    </p>
                    
                    {/* Errori */}
                    {qrError && (
                      <div className="p-4 bg-red-50 text-red-700 rounded-xl">
                        <p className="text-sm">{qrError}</p>
                      </div>
                    )}
                    
                    {/* QR Code rilevato */}
                    {qrCode && (
                      <div className="p-4 bg-green-50 rounded-xl border border-green-200">
                        <p className="font-medium text-green-800">✅ Codice rilevato</p>
                        <p className="text-sm text-green-600 font-mono">{qrCode}</p>
                        {areaLavoro && (
                          <p className="text-sm text-green-700 mt-1">
                            Area: {areaLavoro.nome}
                          </p>
                        )}
                      </div>
                    )}
                    
                    {/* Scanner Video (se attivo) */}
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
                        
                        {/* Overlay con mirino */}
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                          <div className="w-48 h-48 border-2 border-white rounded-xl opacity-50"></div>
                        </div>
                        
                        {/* Pulsante chiudi */}
                        <button
                          onClick={stopQrScanner}
                          className="absolute top-2 right-2 w-10 h-10 bg-red-500 text-white rounded-full flex items-center justify-center shadow-lg"
                        >
                          ✕
                        </button>
                        
                        <p className="absolute bottom-2 left-0 right-0 text-center text-white text-sm bg-black/50 py-1">
                          Inquadra il QR code
                        </p>
                      </div>
                    )}
                    
                    {/* Input manuale */}
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={qrCode}
                        onChange={(e) => setQrCode(e.target.value)}
                        placeholder="Inserisci codice manualmente..."
                        className="flex-1 px-4 py-3 border rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                      />
                      <button
                        onClick={handleManualQrSubmit}
                        className="px-4 py-3 bg-purple-500 text-white rounded-xl hover:bg-purple-600 transition-colors"
                      >
                        ✓
                      </button>
                    </div>
                    
                    {/* Pulsanti fotocamera */}
                    {!showQrScanner && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {/* Pulsante camera live */}
                        <button 
                          onClick={startQrScanner}
                          type="button"
                          className="py-4 bg-purple-100 hover:bg-purple-200 text-purple-700 rounded-xl font-medium transition-colors flex items-center justify-center gap-2 active:bg-purple-300"
                        >
                          📷 Apri fotocamera
                        </button>
                        
                        {/* Pulsante scatta foto (fallback) */}
                        <label className="py-4 bg-indigo-100 hover:bg-indigo-200 text-indigo-700 rounded-xl font-medium transition-colors flex items-center justify-center gap-2 cursor-pointer active:bg-indigo-300">
                          📸 Scatta foto
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
                    
                    {/* Info */}
                    <div className="text-xs text-gray-400 text-center space-y-1">
                      <p>💡 "Apri fotocamera" per scansione live</p>
                      <p>📸 "Scatta foto" apre direttamente la fotocamera del telefono</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Note */}
              <div className="bg-white rounded-2xl p-6 border shadow-sm">
                <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                  📝 Note
                </h3>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Note opzionali..."
                  rows={3}
                  className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                />
              </div>

              {/* Pulsante Azione Principale */}
              <button
                onClick={presenza ? registraUscita : registraEntrata}
                disabled={submitting || (modalita === 'gps' && !posizione) || (modalita === 'qr' && !qrCode && !areaLavoro)}
                type="button"
                className={`w-full py-5 rounded-2xl font-bold text-lg transition-all flex items-center justify-center gap-3 ${
                  presenza
                    ? 'bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white shadow-lg hover:shadow-xl active:from-red-700 active:to-red-800'
                    : 'bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white shadow-lg hover:shadow-xl active:from-green-700 active:to-green-800'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {submitting ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Registrazione...
                  </>
                ) : presenza ? (
                  <>
                    🚪 Registra Uscita
                  </>
                ) : (
                  <>
                    ✅ Registra Entrata
                  </>
                )}
              </button>
            </>
          )}
        </div>

        {/* Colonna Laterale */}
        <div className="space-y-6">
          
          {/* Card Meteo */}
          {meteo && (
            <div className="bg-gradient-to-br from-sky-50 to-blue-50 rounded-2xl p-6 border border-sky-200">
              <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                🌤️ Meteo Attuale
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

          {/* Card Area Lavoro */}
          {areaLavoro && (
            <div className="bg-white rounded-2xl p-6 border shadow-sm">
              <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                🏗️ Area di Lavoro
              </h3>
              <div className="space-y-2">
                <p className="font-medium text-gray-800">{areaLavoro.nome}</p>
                {areaLavoro.descrizione && (
                  <p className="text-sm text-gray-500">{areaLavoro.descrizione}</p>
                )}
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <span>📍</span>
                  <span>Raggio: {areaLavoro.raggio || 100}m</span>
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
                      className={`flex items-center justify-between p-3 rounded-xl ${
                        p.data === oggi ? 'bg-blue-50' : 'bg-gray-50'
                      }`}
                    >
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
