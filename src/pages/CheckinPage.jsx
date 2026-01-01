import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useI18n } from '../contexts/I18nContext'
import { supabase } from '../lib/supabase'
import { getPosizione, calcolaDistanza } from '../lib/gps'

export default function CheckinPage() {
  const { persona, progetto, assegnazione } = useAuth()
  const { t, language } = useI18n()
  
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [presenza, setPresenza] = useState(null)
  const [posizione, setPosizione] = useState(null)
  const [posizioneError, setPosizioneError] = useState(null)
  const [meteo, setMeteo] = useState(null)
  const [note, setNote] = useState('')
  const [modalita, setModalita] = useState('gps') // 'gps' o 'qr'
  const [qrCode, setQrCode] = useState('')
  const [storicoPresenze, setStoricoPresenze] = useState([])
  const [showStorico, setShowStorico] = useState(false)
  
  // Nuovi state per aree di lavoro
  const [aree, setAree] = useState([])
  const [selectedAreaId, setSelectedAreaId] = useState('')
  const [selectedArea, setSelectedArea] = useState(null)

  const oggi = new Date().toISOString().split('T')[0]

  // Carica dati
  useEffect(() => {
    if (persona?.id && progetto?.id) {
      loadData()
    }
  }, [persona?.id, progetto?.id])

  // Aggiorna selectedArea quando cambia selectedAreaId
  useEffect(() => {
    if (selectedAreaId && aree.length > 0) {
      const area = aree.find(a => a.id === selectedAreaId)
      setSelectedArea(area || null)
    } else {
      setSelectedArea(null)
    }
  }, [selectedAreaId, aree])

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
      
      // Se c'è una presenza con area, preselezionala
      if (presenzaData?.area_lavoro_id) {
        setSelectedAreaId(presenzaData.area_lavoro_id)
      }

      // Carica TUTTE le aree di lavoro del progetto
      const { data: areeData } = await supabase
        .from('aree_lavoro')
        .select('*')
        .eq('progetto_id', progetto.id)
        .order('nome')
      
      setAree(areeData || [])
      
      // Se c'è solo un'area, selezionala automaticamente
      if (areeData?.length === 1 && !presenzaData?.area_lavoro_id) {
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
      setPosizioneError(error.message || t('gpsError'))
    }
  }

  // Carica dati meteo
  const caricaMeteo = async (lat, lng) => {
    try {
      const apiKey = import.meta.env.VITE_OPENWEATHERMAP_API_KEY
      if (!apiKey) return
      
      const response = await fetch(
        `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lng}&appid=${apiKey}&units=metric&lang=${language}`
      )
      const data = await response.json()
      
      setMeteo({
        temp: Math.round(data.main.temp),
        descrizione: data.weather[0].description,
        icona: data.weather[0].icon,
        umidita: data.main.humidity,
        vento: Math.round(data.wind.speed * 3.6) // m/s to km/h
      })
    } catch (error) {
      console.error('Errore caricamento meteo:', error)
    }
  }

  // Verifica distanza da area lavoro selezionata
  const verificaDistanza = () => {
    if (!posizione || !selectedArea) return null
    
    const distanza = calcolaDistanza(
      posizione.lat,
      posizione.lng,
      selectedArea.latitudine,
      selectedArea.longitudine
    )
    
    return {
      distanza: Math.round(distanza),
      dentroArea: distanza <= (selectedArea.raggio_metri || 100)
    }
  }

  // Registra entrata
  const registraEntrata = async () => {
    if (!posizione && modalita === 'gps') {
      alert(t('getPositionFirst'))
      return
    }
    
    if (!selectedAreaId) {
      alert(t('selectAreaFirst'))
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
    } catch (error) {
      console.error('Errore registrazione entrata:', error)
      alert(t('registrationError'))
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
      alert(t('registrationError'))
    } finally {
      setSubmitting(false)
    }
  }

  const distanzaInfo = verificaDistanza()

  // Formatta data in base alla lingua
  const formatDate = (date, options) => {
    return new Date(date).toLocaleDateString(language === 'it' ? 'it-IT' : 'en-GB', options)
  }

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
          📍 {t('checkinCheckout')}
        </h1>
        <p className="text-gray-500 mt-1">
          {formatDate(new Date(), { weekday: 'long', day: 'numeric', month: 'long' })}
        </p>
      </div>

      {/* Layout Grid - Responsive */}
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
                    ? t('readyToStart')
                    : presenza.ora_uscita 
                      ? t('dayCompleted')
                      : t('atWork')}
                </h2>
                <p className="text-gray-600 mt-1">
                  {!presenza 
                    ? t('registerEntryToStart')
                    : presenza.ora_uscita 
                      ? `${t('youWorked')} ${presenza.ore_lavorate || '-'} ${t('hours')}`
                      : `${t('entryAt')} ${presenza.ora_entrata}`}
                </p>
                {presenza && !presenza.ora_uscita && (
                  <div className="mt-3">
                    <span className="inline-flex items-center gap-2 px-3 py-1 bg-amber-100 text-amber-700 rounded-full text-sm font-medium">
                      <span className="w-2 h-2 bg-amber-500 rounded-full animate-pulse"></span>
                      {t('inProgressSince')} {presenza.ora_entrata}
                    </span>
                  </div>
                )}
              </div>
              
              {/* Orari su desktop */}
              {presenza && (
                <div className="hidden sm:flex gap-4 text-center">
                  <div className="bg-white/80 rounded-xl px-4 py-2">
                    <p className="text-xs text-gray-500 uppercase">{t('entry')}</p>
                    <p className="text-lg font-bold text-green-600">{presenza.ora_entrata}</p>
                  </div>
                  {presenza.ora_uscita && (
                    <div className="bg-white/80 rounded-xl px-4 py-2">
                      <p className="text-xs text-gray-500 uppercase">{t('exit')}</p>
                      <p className="text-lg font-bold text-red-600">{presenza.ora_uscita}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Se giornata completata, mostra solo riepilogo */}
          {presenza?.ora_uscita ? (
            <div className="bg-white rounded-2xl p-6 border shadow-sm">
              <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                📋 {t('daySummary')}
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="bg-gray-50 rounded-xl p-4 text-center">
                  <p className="text-2xl font-bold text-gray-800">{presenza.ora_entrata}</p>
                  <p className="text-xs text-gray-500 uppercase mt-1">{t('entry')}</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-4 text-center">
                  <p className="text-2xl font-bold text-gray-800">{presenza.ora_uscita}</p>
                  <p className="text-xs text-gray-500 uppercase mt-1">{t('exit')}</p>
                </div>
                <div className="bg-blue-50 rounded-xl p-4 text-center">
                  <p className="text-2xl font-bold text-blue-600">{presenza.ore_lavorate}h</p>
                  <p className="text-xs text-gray-500 uppercase mt-1">{t('total')}</p>
                </div>
                <div className="bg-green-50 rounded-xl p-4 text-center">
                  <p className="text-2xl">✅</p>
                  <p className="text-xs text-gray-500 uppercase mt-1">{t('completed')}</p>
                </div>
              </div>
            </div>
          ) : (
            <>
              {/* ============ SELEZIONE AREA DI LAVORO ============ */}
              <div className="bg-white rounded-2xl p-6 border shadow-sm">
                <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                  📍 {t('selectWorkArea')}
                </h3>
                
                {aree.length === 0 ? (
                  <div className="text-center py-6 text-gray-400">
                    <p className="text-4xl mb-2">📍</p>
                    <p>{t('noAreasConfigured')}</p>
                    <p className="text-sm">{t('contactAdminForAreas')}</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {aree.map(area => (
                      <button
                        key={area.id}
                        onClick={() => setSelectedAreaId(area.id)}
                        disabled={presenza}
                        className={`p-4 rounded-xl border-2 transition-all text-left ${
                          selectedAreaId === area.id
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 hover:border-blue-200 hover:bg-blue-50/50'
                        } ${presenza ? 'opacity-60 cursor-not-allowed' : ''}`}
                      >
                        <div className="flex items-center gap-3">
                          <div 
                            className="w-4 h-4 rounded-full flex-shrink-0" 
                            style={{ backgroundColor: area.colore || '#3B82F6' }}
                          />
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-gray-800 truncate">{area.nome}</p>
                            {area.descrizione && (
                              <p className="text-xs text-gray-500 truncate">{area.descrizione}</p>
                            )}
                          </div>
                          {selectedAreaId === area.id && (
                            <span className="text-blue-600 text-xl">✓</span>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
                
                {!selectedAreaId && aree.length > 0 && (
                  <p className="mt-3 text-sm text-amber-600 flex items-center gap-2">
                    ⚠️ {t('pleaseSelectArea')}
                  </p>
                )}
              </div>

              {/* Modalità Check-in */}
              <div className="bg-white rounded-2xl p-6 border shadow-sm">
                <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                  🎯 {t('checkinMode')}
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
                    <p className="text-xs text-gray-500 mt-1">{t('automaticPosition')}</p>
                  </button>
                  <button
                    onClick={() => setModalita('qr')}
                    className={`p-4 rounded-xl border-2 transition-all ${
                      modalita === 'qr'
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-gray-200 hover:border-blue-200 hover:bg-blue-50/50'
                    }`}
                  >
                    <div className="text-3xl mb-2">📱</div>
                    <p className="font-medium">QR Code</p>
                    <p className="text-xs text-gray-500 mt-1">{t('scanCode')}</p>
                  </button>
                </div>
              </div>

              {/* Posizione GPS */}
              {modalita === 'gps' && (
                <div className="bg-white rounded-2xl p-6 border shadow-sm">
                  <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                    🛰️ {t('gpsPosition')}
                  </h3>
                  
                  {posizione ? (
                    <div className="space-y-4">
                      <div className="flex items-center gap-3 p-4 bg-green-50 rounded-xl">
                        <span className="text-2xl">✅</span>
                        <div>
                          <p className="font-medium text-green-700">{t('positionAcquired')}</p>
                          <p className="text-sm text-green-600">
                            {t('accuracy')}: ±{Math.round(posizione.accuracy)}m
                          </p>
                        </div>
                      </div>
                      
                      {distanzaInfo && selectedArea && (
                        <div className={`flex items-center gap-3 p-4 rounded-xl ${
                          distanzaInfo.dentroArea 
                            ? 'bg-green-50' 
                            : 'bg-amber-50'
                        }`}>
                          <span className="text-2xl">
                            {distanzaInfo.dentroArea ? '📍' : '⚠️'}
                          </span>
                          <div>
                            <p className={`font-medium ${
                              distanzaInfo.dentroArea ? 'text-green-700' : 'text-amber-700'
                            }`}>
                              {distanzaInfo.dentroArea 
                                ? t('insideWorkArea')
                                : t('outsideWorkArea')}
                            </p>
                            <p className={`text-sm ${
                              distanzaInfo.dentroArea ? 'text-green-600' : 'text-amber-600'
                            }`}>
                              {t('distance')}: {distanzaInfo.distanza}m 
                              {` (${t('radius')}: ${selectedArea.raggio_metri || 100}m)`}
                            </p>
                          </div>
                        </div>
                      )}

                      <button
                        onClick={ottieniPosizione}
                        className="w-full py-3 text-blue-600 hover:bg-blue-50 rounded-xl transition-colors"
                      >
                        🔄 {t('refreshPosition')}
                      </button>
                    </div>
                  ) : (
                    <div>
                      {posizioneError && (
                        <div className="mb-4 p-4 bg-red-50 text-red-700 rounded-xl">
                          ⚠️ {posizioneError}
                        </div>
                      )}
                      <button
                        onClick={ottieniPosizione}
                        className="w-full py-4 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-xl font-medium transition-colors flex items-center justify-center gap-2"
                      >
                        📍 {t('getPosition')}
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* QR Code */}
              {modalita === 'qr' && (
                <div className="bg-white rounded-2xl p-6 border shadow-sm">
                  <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                    📱 {t('qrCodeScan')}
                  </h3>
                  <div className="space-y-4">
                    <p className="text-gray-500 text-sm">
                      {t('enterCodeManually')}
                    </p>
                    <input
                      type="text"
                      value={qrCode}
                      onChange={(e) => setQrCode(e.target.value)}
                      placeholder={t('enterCode')}
                      className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                    <button className="w-full py-4 bg-purple-100 hover:bg-purple-200 text-purple-700 rounded-xl font-medium transition-colors flex items-center justify-center gap-2">
                      📷 {t('openCamera')}
                    </button>
                  </div>
                </div>
              )}

              {/* Note */}
              <div className="bg-white rounded-2xl p-6 border shadow-sm">
                <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                  📝 {t('notes')}
                </h3>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder={t('optionalNotes')}
                  rows={3}
                  className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                />
              </div>

              {/* Pulsante Azione Principale */}
              <button
                onClick={presenza ? registraUscita : registraEntrata}
                disabled={submitting || (modalita === 'gps' && !posizione) || (!presenza && !selectedAreaId)}
                className={`w-full py-5 rounded-2xl font-bold text-lg transition-all flex items-center justify-center gap-3 ${
                  presenza
                    ? 'bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white shadow-lg hover:shadow-xl'
                    : 'bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white shadow-lg hover:shadow-xl'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {submitting ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    {t('registering')}
                  </>
                ) : presenza ? (
                  <>
                    🚪 {t('registerExit')}
                  </>
                ) : (
                  <>
                    ✅ {t('registerEntry')}
                  </>
                )}
              </button>
            </>
          )}
        </div>

        {/* Colonna Laterale - Info e Storico */}
        <div className="space-y-6">
          
          {/* Card Meteo */}
          {meteo && (
            <div className="bg-gradient-to-br from-sky-50 to-blue-50 rounded-2xl p-6 border border-sky-200">
              <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                🌤️ {t('currentWeather')}
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
                  <p className="text-xs text-gray-500">{t('humidity')}</p>
                  <p className="font-semibold">{meteo.umidita}%</p>
                </div>
                <div className="bg-white/60 rounded-lg p-3 text-center">
                  <p className="text-xs text-gray-500">{t('wind')}</p>
                  <p className="font-semibold">{meteo.vento} km/h</p>
                </div>
              </div>
            </div>
          )}

          {/* Card Area Selezionata */}
          {selectedArea && (
            <div className="bg-white rounded-2xl p-6 border shadow-sm">
              <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                🏗️ {t('selectedArea')}
              </h3>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div 
                    className="w-4 h-4 rounded-full" 
                    style={{ backgroundColor: selectedArea.colore || '#3B82F6' }}
                  />
                  <p className="font-medium text-gray-800">{selectedArea.nome}</p>
                </div>
                {selectedArea.descrizione && (
                  <p className="text-sm text-gray-500">{selectedArea.descrizione}</p>
                )}
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <span>📍</span>
                  <span>{t('radius')}: {selectedArea.raggio_metri || 100}m</span>
                </div>
              </div>
            </div>
          )}

          {/* Storico Presenze */}
          <div className="bg-white rounded-2xl p-6 border shadow-sm">
            <button
              onClick={() => setShowStorico(!showStorico)}
              className="w-full flex items-center justify-between"
            >
              <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                📅 {t('recentHistory')}
              </h3>
              <span className={`transition-transform ${showStorico ? 'rotate-180' : ''}`}>
                ▼
              </span>
            </button>
            
            {showStorico && (
              <div className="mt-4 space-y-3">
                {storicoPresenze.length === 0 ? (
                  <p className="text-gray-500 text-sm text-center py-4">
                    {t('noAttendanceRecorded')}
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
                          {formatDate(p.data, { weekday: 'short', day: 'numeric', month: 'short' })}
                        </p>
                        <p className="text-xs text-gray-500">
                          {p.ora_entrata} - {p.ora_uscita || '...'}
                          {p.area?.nome && <span className="ml-1 text-blue-600">• {p.area.nome}</span>}
                        </p>
                      </div>
                      <div className="text-right">
                        {p.ore_lavorate ? (
                          <span className="text-sm font-semibold text-green-600">
                            {p.ore_lavorate}h
                          </span>
                        ) : (
                          <span className="text-xs text-amber-600 bg-amber-100 px-2 py-1 rounded">
                            {t('inProgress')}
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
              📁 {t('project')}
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
