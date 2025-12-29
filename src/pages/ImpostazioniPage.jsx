import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { 
  Settings, 
  MapPin, 
  Plus, 
  Trash2, 
  Edit2,
  Save,
  X,
  Loader2,
  Cloud,
  Clock,
  Check,
  AlertCircle
} from 'lucide-react'

export default function ImpostazioniPage() {
  const { assegnazione, progetto } = useAuth()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState('zone')
  const [message, setMessage] = useState({ type: '', text: '' })
  
  // Zone GPS
  const [zone, setZone] = useState([])
  const [showZoneForm, setShowZoneForm] = useState(false)
  const [editingZona, setEditingZona] = useState(null)
  const [zonaForm, setZonaForm] = useState({
    nome: '',
    descrizione: '',
    latitudine: '',
    longitudine: '',
    raggio_metri: 100
  })
  
  // Impostazioni progetto
  const [impostazioni, setImpostazioni] = useState(null)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      // Carica zone GPS
      const { data: zoneData, error: zoneError } = await supabase
        .from('zone_gps')
        .select('*')
        .eq('progetto_id', assegnazione.progetto_id)
        .order('nome')

      if (zoneError) throw zoneError
      setZone(zoneData || [])

      // Carica impostazioni progetto
      const { data: impData, error: impError } = await supabase
        .from('impostazioni_progetto')
        .select('*')
        .eq('progetto_id', assegnazione.progetto_id)
        .single()

      if (!impError && impData) {
        setImpostazioni(impData)
      }

    } catch (error) {
      console.error('Error loading data:', error)
      setMessage({ type: 'error', text: 'Errore nel caricamento dati' })
    } finally {
      setLoading(false)
    }
  }

  // ============ ZONE GPS ============

  const resetZonaForm = () => {
    setZonaForm({
      nome: '',
      descrizione: '',
      latitudine: '',
      longitudine: '',
      raggio_metri: 100
    })
    setEditingZona(null)
    setShowZoneForm(false)
  }

  const handleEditZona = (zona) => {
    setZonaForm({
      nome: zona.nome,
      descrizione: zona.descrizione || '',
      latitudine: zona.latitudine.toString(),
      longitudine: zona.longitudine.toString(),
      raggio_metri: zona.raggio_metri
    })
    setEditingZona(zona)
    setShowZoneForm(true)
  }

  const handleSaveZona = async () => {
    if (!zonaForm.nome || !zonaForm.latitudine || !zonaForm.longitudine) {
      setMessage({ type: 'error', text: 'Compila tutti i campi obbligatori' })
      return
    }

    setSaving(true)
    setMessage({ type: '', text: '' })

    try {
      const zonaData = {
        progetto_id: assegnazione.progetto_id,
        nome: zonaForm.nome,
        descrizione: zonaForm.descrizione || null,
        latitudine: parseFloat(zonaForm.latitudine),
        longitudine: parseFloat(zonaForm.longitudine),
        raggio_metri: parseInt(zonaForm.raggio_metri),
        attiva: true
      }

      if (editingZona) {
        // Update
        const { error } = await supabase
          .from('zone_gps')
          .update(zonaData)
          .eq('id', editingZona.id)

        if (error) throw error
        setMessage({ type: 'success', text: 'Zona aggiornata!' })
      } else {
        // Insert
        const { error } = await supabase
          .from('zone_gps')
          .insert(zonaData)

        if (error) throw error
        setMessage({ type: 'success', text: 'Zona creata!' })
      }

      resetZonaForm()
      loadData()

    } catch (error) {
      console.error('Save zona error:', error)
      setMessage({ type: 'error', text: error.message || 'Errore durante il salvataggio' })
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteZona = async (zona) => {
    if (!confirm(`Eliminare la zona "${zona.nome}"?`)) return

    try {
      const { error } = await supabase
        .from('zone_gps')
        .delete()
        .eq('id', zona.id)

      if (error) throw error
      
      setMessage({ type: 'success', text: 'Zona eliminata' })
      loadData()

    } catch (error) {
      console.error('Delete zona error:', error)
      setMessage({ type: 'error', text: 'Errore durante l\'eliminazione' })
    }
  }

  const getCurrentPosition = () => {
    if (!navigator.geolocation) {
      alert('Geolocalizzazione non supportata')
      return
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setZonaForm(prev => ({
          ...prev,
          latitudine: position.coords.latitude.toFixed(6),
          longitudine: position.coords.longitude.toFixed(6)
        }))
      },
      (error) => {
        alert('Errore GPS: ' + error.message)
      },
      { enableHighAccuracy: true }
    )
  }

  // ============ IMPOSTAZIONI ============

  const handleSaveImpostazioni = async () => {
    if (!impostazioni) return

    setSaving(true)
    setMessage({ type: '', text: '' })

    try {
      const { error } = await supabase
        .from('impostazioni_progetto')
        .update({
          vento_warning_kmh: impostazioni.vento_warning_kmh,
          vento_stop_kmh: impostazioni.vento_stop_kmh,
          pioggia_warning_mm: impostazioni.pioggia_warning_mm,
          temperatura_min_celsius: impostazioni.temperatura_min_celsius,
          tolleranza_gps_metri: impostazioni.tolleranza_gps_metri,
          checkout_gps_obbligatorio: impostazioni.checkout_gps_obbligatorio,
          consenti_checkin_fuori_zona: impostazioni.consenti_checkin_fuori_zona
        })
        .eq('id', impostazioni.id)

      if (error) throw error
      setMessage({ type: 'success', text: 'Impostazioni salvate!' })

    } catch (error) {
      console.error('Save impostazioni error:', error)
      setMessage({ type: 'error', text: 'Errore durante il salvataggio' })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="animate-spin text-blue-600" size={32} />
      </div>
    )
  }

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-gray-800">Impostazioni</h1>
        <p className="text-sm text-gray-500">{progetto?.nome}</p>
      </div>

      {/* Message */}
      {message.text && (
        <div className={`p-3 rounded-lg flex items-center gap-2 ${
          message.type === 'success' ? 'bg-green-50 text-green-700' : 
          message.type === 'error' ? 'bg-red-50 text-red-700' : ''
        }`}>
          {message.type === 'success' ? <Check size={18} /> : <AlertCircle size={18} />}
          {message.text}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 border-b">
        <button
          type="button"
          onClick={() => setActiveTab('zone')}
          className={`px-4 py-2 font-medium border-b-2 transition-colors ${
            activeTab === 'zone' 
              ? 'border-blue-600 text-blue-600' 
              : 'border-transparent text-gray-500'
          }`}
        >
          <MapPin size={16} className="inline mr-1" />
          Zone GPS
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('meteo')}
          className={`px-4 py-2 font-medium border-b-2 transition-colors ${
            activeTab === 'meteo' 
              ? 'border-blue-600 text-blue-600' 
              : 'border-transparent text-gray-500'
          }`}
        >
          <Cloud size={16} className="inline mr-1" />
          Soglie Meteo
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('gps')}
          className={`px-4 py-2 font-medium border-b-2 transition-colors ${
            activeTab === 'gps' 
              ? 'border-blue-600 text-blue-600' 
              : 'border-transparent text-gray-500'
          }`}
        >
          <Settings size={16} className="inline mr-1" />
          GPS
        </button>
      </div>

      {/* TAB: Zone GPS */}
      {activeTab === 'zone' && (
        <div className="space-y-4">
          {/* Add Zone Button */}
          {!showZoneForm && (
            <button
              type="button"
              onClick={() => setShowZoneForm(true)}
              className="w-full py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-blue-500 hover:text-blue-500 flex items-center justify-center gap-2"
            >
              <Plus size={20} />
              Aggiungi Zona GPS
            </button>
          )}

          {/* Zone Form */}
          {showZoneForm && (
            <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-medium">
                  {editingZona ? 'Modifica Zona' : 'Nuova Zona'}
                </h3>
                <button type="button" onClick={resetZonaForm}>
                  <X size={20} className="text-gray-400" />
                </button>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nome zona *
                </label>
                <input
                  type="text"
                  value={zonaForm.nome}
                  onChange={(e) => setZonaForm(prev => ({ ...prev, nome: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Es: Area Compressori"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Descrizione
                </label>
                <input
                  type="text"
                  value={zonaForm.descrizione}
                  onChange={(e) => setZonaForm(prev => ({ ...prev, descrizione: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Descrizione opzionale"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Latitudine *
                  </label>
                  <input
                    type="text"
                    value={zonaForm.latitudine}
                    onChange={(e) => setZonaForm(prev => ({ ...prev, latitudine: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="44.7857"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Longitudine *
                  </label>
                  <input
                    type="text"
                    value={zonaForm.longitudine}
                    onChange={(e) => setZonaForm(prev => ({ ...prev, longitudine: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="10.3081"
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={getCurrentPosition}
                className="w-full py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 flex items-center justify-center gap-2"
              >
                <MapPin size={18} />
                Usa posizione attuale
              </button>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Raggio (metri)
                </label>
                <input
                  type="number"
                  value={zonaForm.raggio_metri}
                  onChange={(e) => setZonaForm(prev => ({ ...prev, raggio_metri: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  min="10"
                  max="1000"
                />
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={resetZonaForm}
                  className="flex-1 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                >
                  Annulla
                </button>
                <button
                  type="button"
                  onClick={handleSaveZona}
                  disabled={saving}
                  className="flex-1 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                  Salva
                </button>
              </div>
            </div>
          )}

          {/* Zone List */}
          <div className="space-y-2">
            {zone.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <MapPin size={32} className="mx-auto mb-2 opacity-50" />
                <p>Nessuna zona GPS configurata</p>
              </div>
            ) : (
              zone.map(zona => (
                <div key={zona.id} className="bg-white rounded-lg border border-gray-200 p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-medium text-gray-800">{zona.nome}</h4>
                      {zona.descrizione && (
                        <p className="text-sm text-gray-500">{zona.descrizione}</p>
                      )}
                      <div className="text-xs text-gray-400 mt-1">
                        {zona.latitudine}, {zona.longitudine} • Raggio: {zona.raggio_metri}m
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <button
                        type="button"
                        onClick={() => handleEditZona(zona)}
                        className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteZona(zona)}
                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* TAB: Soglie Meteo */}
      {activeTab === 'meteo' && impostazioni && (
        <div className="space-y-4">
          <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Vento Warning (km/h)
              </label>
              <input
                type="number"
                value={impostazioni.vento_warning_kmh || 30}
                onChange={(e) => setImpostazioni(prev => ({ ...prev, vento_warning_kmh: parseFloat(e.target.value) }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-400 mt-1">Mostra avviso se vento supera questo valore</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Vento Stop (km/h)
              </label>
              <input
                type="number"
                value={impostazioni.vento_stop_kmh || 50}
                onChange={(e) => setImpostazioni(prev => ({ ...prev, vento_stop_kmh: parseFloat(e.target.value) }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-400 mt-1">Blocca lavoro se vento supera questo valore</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Pioggia Warning (mm/h)
              </label>
              <input
                type="number"
                value={impostazioni.pioggia_warning_mm || 2}
                onChange={(e) => setImpostazioni(prev => ({ ...prev, pioggia_warning_mm: parseFloat(e.target.value) }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Temperatura Minima (°C)
              </label>
              <input
                type="number"
                value={impostazioni.temperatura_min_celsius || 0}
                onChange={(e) => setImpostazioni(prev => ({ ...prev, temperatura_min_celsius: parseFloat(e.target.value) }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <button
              type="button"
              onClick={handleSaveImpostazioni}
              disabled={saving}
              className="w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
              Salva Impostazioni Meteo
            </button>
          </div>
        </div>
      )}

      {/* TAB: GPS Settings */}
      {activeTab === 'gps' && impostazioni && (
        <div className="space-y-4">
          <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tolleranza GPS (metri)
              </label>
              <input
                type="number"
                value={impostazioni.tolleranza_gps_metri || 50}
                onChange={(e) => setImpostazioni(prev => ({ ...prev, tolleranza_gps_metri: parseInt(e.target.value) }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-400 mt-1">Distanza massima accettata dal centro zona</p>
            </div>

            <div className="flex items-center justify-between py-2">
              <div>
                <p className="font-medium text-gray-700">Check-out GPS obbligatorio</p>
                <p className="text-xs text-gray-400">Richiedi posizione GPS anche all'uscita</p>
              </div>
              <input
                type="checkbox"
                checked={impostazioni.checkout_gps_obbligatorio || false}
                onChange={(e) => setImpostazioni(prev => ({ ...prev, checkout_gps_obbligatorio: e.target.checked }))}
                className="w-5 h-5 text-blue-600 rounded"
              />
            </div>

            <div className="flex items-center justify-between py-2">
              <div>
                <p className="font-medium text-gray-700">Consenti check-in fuori zona</p>
                <p className="text-xs text-gray-400">Permetti check-in anche se distante dalla zona</p>
              </div>
              <input
                type="checkbox"
                checked={impostazioni.consenti_checkin_fuori_zona ?? true}
                onChange={(e) => setImpostazioni(prev => ({ ...prev, consenti_checkin_fuori_zona: e.target.checked }))}
                className="w-5 h-5 text-blue-600 rounded"
              />
            </div>

            <button
              type="button"
              onClick={handleSaveImpostazioni}
              disabled={saving}
              className="w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
              Salva Impostazioni GPS
            </button>
          </div>
        </div>
      )}

      {/* Info progetto */}
      <div className="bg-gray-50 rounded-lg p-4 text-sm text-gray-500">
        <p><strong>Progetto:</strong> {progetto?.codice}</p>
        <p><strong>Indirizzo:</strong> {progetto?.indirizzo}, {progetto?.citta}</p>
      </div>
    </div>
  )
}
