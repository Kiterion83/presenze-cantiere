import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useI18n } from '../contexts/I18nContext'
import { supabase } from '../lib/supabase'

export default function ConfermaPresenzePage() {
  const { progettoId, progetto, persona, isAtLeast } = useAuth()
  const { t } = useI18n()
  
  // Stati
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  
  // Squadre del foreman
  const [squadreForeman, setSquadreForeman] = useState([])
  const [selectedSquadra, setSelectedSquadra] = useState(null)
  
  // Membri squadra e loro presenze
  const [membriSquadra, setMembriSquadra] = useState([])
  const [presenze, setPresenze] = useState({}) // { persona_id: { stato, note, checkin, confermato } }
  
  // Orario squadra
  const [orarioSquadra, setOrarioSquadra] = useState(null)
  
  // Stato conferma squadra
  const [confermaSquadra, setConfermaSquadra] = useState(null)
  
  // Alert check-in non confermati
  const [alertNonConfermati, setAlertNonConfermati] = useState([])

  // === LOAD SQUADRE FOREMAN ===
  const loadSquadreForeman = useCallback(async () => {
    if (!progettoId || !persona?.id) return
    
    try {
      // Trova squadre dove persona è foreman
      const { data, error } = await supabase
        .from('squadre')
        .select('*')
        .eq('progetto_id', progettoId)
        .eq('foreman_id', persona.id)
        .eq('attivo', true)
      
      if (error) throw error
      setSquadreForeman(data || [])
      
      // Se c'è solo una squadra, selezionala
      if (data && data.length === 1) {
        setSelectedSquadra(data[0])
      }
    } catch (e) {
      console.error('Errore caricamento squadre:', e)
    }
  }, [progettoId, persona?.id])

  // === LOAD ORARIO SQUADRA ===
  const loadOrarioSquadra = useCallback(async () => {
    if (!progettoId || !selectedSquadra) return
    
    try {
      // Prima cerca orario specifico squadra
      let { data } = await supabase
        .from('orari_squadre')
        .select('*')
        .eq('progetto_id', progettoId)
        .eq('squadra_id', selectedSquadra.id)
        .eq('attivo', true)
        .single()
      
      // Se non esiste, cerca orario default progetto
      if (!data) {
        const { data: defaultOrario } = await supabase
          .from('orari_squadre')
          .select('*')
          .eq('progetto_id', progettoId)
          .is('squadra_id', null)
          .eq('attivo', true)
          .single()
        data = defaultOrario
      }
      
      setOrarioSquadra(data || { ora_inizio: '07:00', ora_fine: '17:00', tolleranza_conferma_minuti: 30 })
    } catch (e) {
      console.error('Errore caricamento orario:', e)
      setOrarioSquadra({ ora_inizio: '07:00', ora_fine: '17:00', tolleranza_conferma_minuti: 30 })
    }
  }, [progettoId, selectedSquadra])

  // === LOAD MEMBRI SQUADRA ===
  const loadMembriSquadra = useCallback(async () => {
    if (!progettoId || !selectedSquadra) return
    
    try {
      const { data, error } = await supabase
        .from('assegnazioni_squadra')
        .select(`
          *,
          persona:persone(id, nome, cognome, telefono, email)
        `)
        .eq('squadra_id', selectedSquadra.id)
        .eq('attivo', true)
      
      if (error) throw error
      setMembriSquadra(data?.map(a => a.persona).filter(Boolean) || [])
    } catch (e) {
      console.error('Errore caricamento membri:', e)
    }
  }, [progettoId, selectedSquadra])

  // === LOAD PRESENZE E CHECK-IN ===
  const loadPresenze = useCallback(async () => {
    if (!progettoId || !selectedSquadra || !selectedDate || membriSquadra.length === 0) return
    
    setLoading(true)
    try {
      // Carica presenze del giorno per i membri
      const { data: presenzeGiorno } = await supabase
        .from('presenze')
        .select('*')
        .eq('progetto_id', progettoId)
        .in('persona_id', membriSquadra.map(m => m.id))
        .eq('data', selectedDate)
        .order('created_at', { ascending: false })
      
      // Carica conferma squadra se esiste
      const { data: conferma } = await supabase
        .from('conferme_presenze')
        .select('*')
        .eq('progetto_id', progettoId)
        .eq('squadra_id', selectedSquadra.id)
        .eq('data', selectedDate)
        .single()
      
      setConfermaSquadra(conferma)
      
      // Se esiste conferma, carica dettagli
      let dettagli = []
      if (conferma) {
        const { data: det } = await supabase
          .from('conferme_presenze_dettaglio')
          .select('*')
          .eq('conferma_id', conferma.id)
        dettagli = det || []
      }
      
      // Costruisci stato presenze
      const presenzeMap = {}
      const nonConfermati = []
      
      for (const membro of membriSquadra) {
        // Trova presenza del giorno
        const presenzaGiorno = presenzeGiorno?.find(p => p.persona_id === membro.id)
        // Trova dettaglio conferma se esiste
        const dettaglio = dettagli.find(d => d.persona_id === membro.id)
        
        presenzeMap[membro.id] = {
          presenza: presenzaGiorno || null,
          ora_checkin: presenzaGiorno?.ora_checkin ? presenzaGiorno.ora_checkin.slice(0, 5) : null,
          stato: dettaglio?.stato || (presenzaGiorno ? 'present_unconfirmed' : 'pending'),
          confermato: dettaglio?.confermato || false,
          note: dettaglio?.note || ''
        }
        
        // Alert per presenze non confermate
        if (presenzaGiorno && !dettaglio?.confermato) {
          nonConfermati.push(membro)
        }
      }
      
      setPresenze(presenzeMap)
      setAlertNonConfermati(nonConfermati)
      
    } catch (e) {
      console.error('Errore caricamento presenze:', e)
    } finally {
      setLoading(false)
    }
  }, [progettoId, selectedSquadra, selectedDate, membriSquadra])

  // === EFFECTS ===
  useEffect(() => {
    loadSquadreForeman()
  }, [loadSquadreForeman])

  useEffect(() => {
    if (selectedSquadra) {
      loadOrarioSquadra()
      loadMembriSquadra()
    }
  }, [selectedSquadra, loadOrarioSquadra, loadMembriSquadra])

  useEffect(() => {
    if (membriSquadra.length > 0) {
      loadPresenze()
    }
  }, [membriSquadra, selectedDate, loadPresenze])

  // === HANDLERS ===
  const handleStatoChange = (personaId, nuovoStato) => {
    setPresenze(prev => ({
      ...prev,
      [personaId]: {
        ...prev[personaId],
        stato: nuovoStato,
        confermato: false // Reset conferma quando cambia stato
      }
    }))
  }

  const handleNoteChange = (personaId, note) => {
    setPresenze(prev => ({
      ...prev,
      [personaId]: {
        ...prev[personaId],
        note
      }
    }))
  }

  const handleConfermaPersona = async (personaId) => {
    setSaving(true)
    try {
      // Crea conferma squadra se non esiste
      let confermaId = confermaSquadra?.id
      if (!confermaId) {
        const { data: nuovaConferma, error: errConf } = await supabase
          .from('conferme_presenze')
          .insert({
            progetto_id: progettoId,
            data: selectedDate,
            squadra_id: selectedSquadra.id,
            foreman_id: persona.id,
            stato: 'partial'
          })
          .select()
          .single()
        
        if (errConf) throw errConf
        confermaId = nuovaConferma.id
        setConfermaSquadra(nuovaConferma)
      }
      
      // Upsert dettaglio
      const presenza = presenze[personaId]
      const { error } = await supabase
        .from('conferme_presenze_dettaglio')
        .upsert({
          conferma_id: confermaId,
          persona_id: personaId,
          checkin_id: presenza.presenza?.id || null,
          ora_checkin: presenza.presenza ? presenza.ora_checkin : null,
          stato: presenza.stato === 'present_unconfirmed' ? 'present' : presenza.stato,
          confermato: true,
          confermato_da: persona.id,
          confermato_at: new Date().toISOString(),
          note: presenza.note || null
        }, {
          onConflict: 'conferma_id,persona_id'
        })
      
      if (error) throw error
      
      // Aggiorna stato locale
      setPresenze(prev => ({
        ...prev,
        [personaId]: {
          ...prev[personaId],
          stato: presenza.stato === 'present_unconfirmed' ? 'present' : presenza.stato,
          confermato: true
        }
      }))
      
      // Rimuovi da alert
      setAlertNonConfermati(prev => prev.filter(m => m.id !== personaId))
      
    } catch (e) {
      console.error('Errore conferma:', e)
      alert('Errore: ' + e.message)
    } finally {
      setSaving(false)
    }
  }

  const handleConfermaSquadra = async () => {
    // Verifica che tutti siano stati definiti
    const tuttiDefiniti = membriSquadra.every(m => {
      const p = presenze[m.id]
      return p && p.stato !== 'pending' && p.stato !== 'present_unconfirmed'
    })
    
    if (!tuttiDefiniti) {
      alert('Devi definire lo stato di tutti i membri prima di confermare')
      return
    }
    
    setSaving(true)
    try {
      // Crea o aggiorna conferma squadra
      let confermaId = confermaSquadra?.id
      if (!confermaId) {
        const { data: nuovaConferma, error: errConf } = await supabase
          .from('conferme_presenze')
          .insert({
            progetto_id: progettoId,
            data: selectedDate,
            squadra_id: selectedSquadra.id,
            foreman_id: persona.id,
            stato: 'confirmed',
            confermato_at: new Date().toISOString()
          })
          .select()
          .single()
        
        if (errConf) throw errConf
        confermaId = nuovaConferma.id
      } else {
        await supabase
          .from('conferme_presenze')
          .update({
            stato: 'confirmed',
            confermato_at: new Date().toISOString()
          })
          .eq('id', confermaId)
      }
      
      // Salva tutti i dettagli
      for (const membro of membriSquadra) {
        const presenza = presenze[membro.id]
        await supabase
          .from('conferme_presenze_dettaglio')
          .upsert({
            conferma_id: confermaId,
            persona_id: membro.id,
            checkin_id: presenza.presenza?.id || null,
            ora_checkin: presenza.presenza ? presenza.ora_checkin : null,
            stato: presenza.stato === 'present_unconfirmed' ? 'present' : presenza.stato,
            confermato: true,
            confermato_da: persona.id,
            confermato_at: new Date().toISOString(),
            note: presenza.note || null
          }, {
            onConflict: 'conferma_id,persona_id'
          })
      }
      
      // Aggiorna stato locale
      setConfermaSquadra(prev => ({ ...prev, stato: 'confirmed', confermato_at: new Date().toISOString() }))
      setPresenze(prev => {
        const updated = { ...prev }
        for (const id of Object.keys(updated)) {
          updated[id].confermato = true
          if (updated[id].stato === 'present_unconfirmed') {
            updated[id].stato = 'present'
          }
        }
        return updated
      })
      setAlertNonConfermati([])
      
      // Mostra notifica successo
      alert('✅ Presenze squadra confermate!')
      
    } catch (e) {
      console.error('Errore conferma squadra:', e)
      alert('Errore: ' + e.message)
    } finally {
      setSaving(false)
    }
  }

  // === HELPERS ===
  const getStatoLabel = (stato) => {
    const labels = {
      pending: { text: 'Da definire', bg: 'bg-gray-100', color: 'text-gray-600', icon: '⏳' },
      present_unconfirmed: { text: 'Registrato (da confermare)', bg: 'bg-yellow-100', color: 'text-yellow-700', icon: '⚠️' },
      present: { text: 'Presente', bg: 'bg-green-100', color: 'text-green-700', icon: '✅' },
      absent_sick: { text: 'Malattia', bg: 'bg-red-100', color: 'text-red-700', icon: '🤒' },
      absent_vacation: { text: 'Ferie', bg: 'bg-blue-100', color: 'text-blue-700', icon: '🏖️' },
      absent_permission: { text: 'Permesso', bg: 'bg-purple-100', color: 'text-purple-700', icon: '📝' },
      absent_other: { text: 'Altro', bg: 'bg-orange-100', color: 'text-orange-700', icon: '❓' }
    }
    return labels[stato] || labels.pending
  }

  const isToday = selectedDate === new Date().toISOString().split('T')[0]
  const squadraConfermata = confermaSquadra?.stato === 'confirmed'
  
  // Conteggi
  const totale = membriSquadra.length
  const presenti = Object.values(presenze).filter(p => p.stato === 'present' || p.stato === 'present_unconfirmed').length
  const assenti = Object.values(presenze).filter(p => p.stato.startsWith('absent_')).length
  const daDefinire = totale - presenti - assenti

  // === RENDER ===
  if (loading && !selectedSquadra) {
    return (
      <div className="p-6 flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-green-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-500">Caricamento...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            ✅ Conferma Presenze
          </h1>
          <p className="text-gray-500">{progetto?.nome}</p>
        </div>
        
        {/* Date Picker */}
        <div className="flex items-center gap-3">
          <input
            type="date"
            value={selectedDate}
            onChange={e => setSelectedDate(e.target.value)}
            className="px-4 py-2 border rounded-xl"
          />
          {!isToday && (
            <button
              onClick={() => setSelectedDate(new Date().toISOString().split('T')[0])}
              className="px-4 py-2 bg-blue-100 text-blue-700 rounded-xl text-sm font-medium"
            >
              Oggi
            </button>
          )}
        </div>
      </div>

      {/* Alert Presenze non confermate */}
      {alertNonConfermati.length > 0 && (
        <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-xl">
          <div className="flex items-start gap-3">
            <span className="text-2xl">⚠️</span>
            <div>
              <h3 className="font-semibold text-yellow-800">Presenze da confermare!</h3>
              <p className="text-sm text-yellow-700">
                {alertNonConfermati.length} {alertNonConfermati.length === 1 ? 'persona ha' : 'persone hanno'} registrato presenza ma non {alertNonConfermati.length === 1 ? 'è stata confermata' : 'sono state confermate'}.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Selezione Squadra */}
      {squadreForeman.length === 0 ? (
        <div className="bg-white rounded-xl p-8 text-center shadow-sm border">
          <div className="text-4xl mb-4">👷</div>
          <h3 className="text-xl font-semibold text-gray-700 mb-2">Nessuna squadra assegnata</h3>
          <p className="text-gray-500">Non sei foreman di nessuna squadra in questo progetto</p>
        </div>
      ) : squadreForeman.length > 1 && !selectedSquadra ? (
        <div className="bg-white rounded-xl p-6 shadow-sm border">
          <h3 className="font-semibold text-gray-700 mb-4">Seleziona Squadra</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {squadreForeman.map(sq => (
              <button
                key={sq.id}
                onClick={() => setSelectedSquadra(sq)}
                className="p-4 border-2 rounded-xl hover:border-green-500 hover:bg-green-50 transition-colors text-left"
              >
                <div className="flex items-center gap-3">
                  <div 
                    className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold"
                    style={{ backgroundColor: sq.colore || '#22C55E' }}
                  >
                    {sq.nome?.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-medium">{sq.nome}</p>
                    <p className="text-sm text-gray-500">{sq.descrizione}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      ) : selectedSquadra && (
        <>
          {/* Squadra Header */}
          <div className="bg-white rounded-xl p-4 shadow-sm border mb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div 
                  className="w-12 h-12 rounded-xl flex items-center justify-center text-white text-xl font-bold"
                  style={{ backgroundColor: selectedSquadra.colore || '#22C55E' }}
                >
                  👥
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-800">{selectedSquadra.nome}</h2>
                  <p className="text-sm text-gray-500">
                    Orario: {orarioSquadra?.ora_inizio?.slice(0, 5)} - {orarioSquadra?.ora_fine?.slice(0, 5)}
                  </p>
                </div>
              </div>
              
              {squadreForeman.length > 1 && (
                <button
                  onClick={() => setSelectedSquadra(null)}
                  className="px-3 py-1 text-sm text-gray-500 hover:bg-gray-100 rounded-lg"
                >
                  Cambia squadra
                </button>
              )}
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-xl p-4 shadow-sm border text-center">
              <p className="text-2xl font-bold text-gray-800">{totale}</p>
              <p className="text-sm text-gray-500">Totale</p>
            </div>
            <div className="bg-white rounded-xl p-4 shadow-sm border text-center">
              <p className="text-2xl font-bold text-green-600">{presenti}</p>
              <p className="text-sm text-gray-500">Presenti</p>
            </div>
            <div className="bg-white rounded-xl p-4 shadow-sm border text-center">
              <p className="text-2xl font-bold text-red-600">{assenti}</p>
              <p className="text-sm text-gray-500">Assenti</p>
            </div>
            <div className="bg-white rounded-xl p-4 shadow-sm border text-center">
              <p className="text-2xl font-bold text-yellow-600">{daDefinire}</p>
              <p className="text-sm text-gray-500">Da definire</p>
            </div>
          </div>

          {/* Stato conferma squadra */}
          {squadraConfermata && (
            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-xl">
              <div className="flex items-center gap-3">
                <span className="text-2xl">✅</span>
                <div>
                  <h3 className="font-semibold text-green-800">Squadra confermata</h3>
                  <p className="text-sm text-green-700">
                    Confermata il {new Date(confermaSquadra.confermato_at).toLocaleString('it-IT')}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Lista Membri */}
          <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
            <div className="p-4 border-b bg-gray-50">
              <h3 className="font-semibold text-gray-700">Membri Squadra ({membriSquadra.length})</h3>
            </div>
            
            {loading ? (
              <div className="p-8 text-center">
                <div className="animate-spin w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full mx-auto"></div>
              </div>
            ) : membriSquadra.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                Nessun membro nella squadra
              </div>
            ) : (
              <div className="divide-y">
                {membriSquadra.map(membro => {
                  const presenza = presenze[membro.id] || { stato: 'pending', note: '' }
                  const statoInfo = getStatoLabel(presenza.stato)
                  
                  return (
                    <div key={membro.id} className={`p-4 ${presenza.confermato ? 'bg-green-50/30' : ''}`}>
                      <div className="flex items-center gap-4">
                        {/* Avatar */}
                        <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 font-bold">
                          {membro.nome?.[0]}{membro.cognome?.[0]}
                        </div>
                        
                        {/* Info */}
                        <div className="flex-1">
                          <p className="font-medium text-gray-800">{membro.nome} {membro.cognome}</p>
                          <div className="flex items-center gap-2 text-sm">
                            {presenza.presenza ? (
                              <span className="text-green-600">📍 Entrata: {presenza.ora_checkin}</span>
                            ) : (
                              <span className="text-gray-400">Nessuna registrazione</span>
                            )}
                          </div>
                        </div>
                        
                        {/* Stato */}
                        <div className="flex items-center gap-2">
                          {!squadraConfermata ? (
                            <select
                              value={presenza.stato}
                              onChange={e => handleStatoChange(membro.id, e.target.value)}
                              className={`px-3 py-2 rounded-lg border text-sm font-medium ${statoInfo.bg} ${statoInfo.color}`}
                            >
                              <option value="pending">⏳ Da definire</option>
                              {presenza.presenza && <option value="present_unconfirmed">⚠️ Registrato (da confermare)</option>}
                              <option value="present">✅ Presente</option>
                              <option value="absent_sick">🤒 Malattia</option>
                              <option value="absent_vacation">🏖️ Ferie</option>
                              <option value="absent_permission">📝 Permesso</option>
                              <option value="absent_other">❓ Altro</option>
                            </select>
                          ) : (
                            <span className={`px-3 py-2 rounded-lg text-sm font-medium ${statoInfo.bg} ${statoInfo.color}`}>
                              {statoInfo.icon} {statoInfo.text}
                            </span>
                          )}
                          
                          {/* Pulsante conferma singolo */}
                          {!squadraConfermata && !presenza.confermato && presenza.stato !== 'pending' && (
                            <button
                              onClick={() => handleConfermaPersona(membro.id)}
                              disabled={saving}
                              className="px-3 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50"
                            >
                              ✓
                            </button>
                          )}
                          
                          {presenza.confermato && (
                            <span className="text-green-600 text-xl" title="Confermato">✓</span>
                          )}
                        </div>
                      </div>
                      
                      {/* Note (per assenze) */}
                      {presenza.stato.startsWith('absent_') && !squadraConfermata && (
                        <div className="mt-2 ml-16">
                          <input
                            type="text"
                            placeholder="Note (opzionale)..."
                            value={presenza.note}
                            onChange={e => handleNoteChange(membro.id, e.target.value)}
                            className="w-full px-3 py-2 border rounded-lg text-sm"
                          />
                        </div>
                      )}
                      
                      {presenza.note && squadraConfermata && (
                        <div className="mt-2 ml-16">
                          <p className="text-sm text-gray-500 italic">📝 {presenza.note}</p>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Pulsante Conferma Squadra */}
          {!squadraConfermata && membriSquadra.length > 0 && (
            <div className="mt-6 flex justify-center">
              <button
                onClick={handleConfermaSquadra}
                disabled={saving || daDefinire > 0}
                className="px-8 py-3 bg-green-600 text-white rounded-xl font-bold text-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {saving ? (
                  <>
                    <div className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full"></div>
                    Salvataggio...
                  </>
                ) : (
                  <>
                    ✅ Conferma Presenze Squadra
                  </>
                )}
              </button>
              
              {daDefinire > 0 && (
                <p className="mt-2 text-sm text-yellow-600 text-center">
                  Definisci lo stato di tutt{daDefinire === 1 ? 'a la persona' : 'e le persone'} prima di confermare
                </p>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}
