import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { 
  MapPin, 
  Plus, 
  Trash2, 
  Edit2,
  Save,
  X,
  Loader2,
  Cloud,
  Settings,
  Check,
  AlertCircle
} from 'lucide-react'

export default function ImpostazioniPage() {
  const { assegnazione, progetto } = useAuth()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState('zone')
  const [message, setMessage] = useState({ type: '', text: '' })
  
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
  
  const [impostazioni, setImpostazioni] = useState(null)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const { data: zoneData } = await supabase
        .from('zone_gps')
        .select('*')
        .eq('progetto_id', assegnazione.progetto_id)
        .order('nome')
      setZone(zoneData || [])

      const { data: impData } = await supabase
        .from('impostazioni_progetto')
        .select('*')
        .eq('progetto_id', assegnazione.progetto_id)
        .single()
      if (impData) setImpostazioni(impData)
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  const resetZonaForm = () => {
    setZonaForm({ nome: '', descrizione: '', latitudine: '', longitudine: '', raggio_metri: 100 })
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
    try {
      const data = {
        progetto_id: assegnazione.progetto_id,
        nome: zonaForm.nome,
        descrizione: zonaForm.descrizione || null,
        latitudine: parseFloat(zonaForm.latitudine),
        longitudine: parseFloat(zonaForm.longitudine),
        raggio_metri: parseInt(zonaForm.raggio_metri),
        attiva: true
      }
      if (editingZona) {
        await supabase.from('zone_gps').update(data).eq('id', editingZona.id)
      } else {
        await supabase.from('zone_gps').insert(data)
      }
      setMessage({ type: 'success', text: 'Zona salvata!' })
      resetZonaForm()
      loadData()
    } catch (error) {
      setMessage({ type: 'error', text: error.message })
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteZona = async (zona) => {
    if (!confirm('Eliminare questa zona?')) return
    await supabase.from('zone_gps').delete().eq('id', zona.id)
    loadData()
  }

  const getCurrentPosition = () => {
    navigator.geolocation?.getCurrentPosition(
      (pos) => {
        setZonaForm(prev => ({
          ...prev,
          latitudine: pos.coords.latitude.toFixed(6),
          longitudine: pos.coords.longitude.toFixed(6)
        }))
      },
      (err) => alert('Errore GPS: ' + err.message),
      { enableHighAccuracy: true }
    )
  }

  const handleSaveImpostazioni = async () => {
    setSaving(true)
    try {
      await supabase.from('impostazioni_progetto').update({
        vento_warning_kmh: impostazioni.vento_warning_kmh,
        vento_stop_kmh: impostazioni.vento_stop_kmh,
        pioggia_warning_mm: impostazioni.pioggia_warning_mm,
        temperatura_min_celsius: impostazioni.temperatura_min_celsius,
        tolleranza_gps_metri: impostazioni.tolleranza_gps_metri
      }).eq('id', impostazioni.id)
      setMessage({ type: 'success', text: 'Salvato!' })
    } catch (error) {
      setMessage({ type: 'error', text: error.message })
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
    <div className="p-4 space-y-4 pb-24">
      <div>
        <h1 className="text-xl font-bold text-gray-800">Impostazioni</h1>
        <p className="text-sm text-gray-500">{progetto?.nome}</p>
      </div>

      {message.text && (
        <div className={`p-3 rounded-lg flex items-center gap-2 ${
          message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
        }`}>
          {message.type === 'success' ? <Check size={18} /> : <AlertCircle size={18} />}
          {message.text}
        </div>
      )}

      <div className="flex gap-2 border-b">
        <button
          type="button"
          onClick={() => setActiveTab('zone')}
          className={`px-4 py-2 font-medium border-b-2 ${
            activeTab === 'zone' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500'
          }`}
        >
          Zone GPS
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('meteo')}
          className={`px-4 py-2 font-medium border-b-2 ${
            activeTab === 'meteo' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500'
          }`}
        >
          Meteo
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('gps')}
          className={`px-4 py-2 font-medium border-b-2 ${
            activeTab === 'gps' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500'
          }`}
        >
          GPS
        </button>
      </div>

      {activeTab === 'zone' && (
        <div className="space-y-4">
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

          {showZoneForm && (
            <div className="bg-white rounded-xl border p-4 space-y-3">
              <div className="flex justify-between">
                <h3 className="font-medium">{editingZona ? 'Modifica' : 'Nuova'} Zona</h3>
                <button type="button" onClick={resetZonaForm}><X size={20} /></button>
              </div>
              <input
                type="text"
                placeholder="Nome zona *"
                value={zonaForm.nome}
                onChange={(e) => setZonaForm(p => ({ ...p, nome: e.target.value }))}
                className="w-full px-3 py-2 border rounded-lg"
              />
              <input
                type="text"
                placeholder="Descrizione"
                value={zonaForm.descrizione}
                onChange={(e) => setZonaForm(p => ({ ...p, descrizione: e.target.value }))}
                className="w-full px-3 py-2 border rounded-lg"
              />
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  placeholder="Latitudine *"
                  value={zonaForm.latitudine}
                  onChange={(e) => setZonaForm(p => ({ ...p, latitudine: e.target.value }))}
                  className="px-3 py-2 border rounded-lg"
                />
                <input
                  type="text"
                  placeholder="Longitudine *"
                  value={zonaForm.longitudine}
                  onChange={(e) => setZonaForm(p => ({ ...p, longitudine: e.target.value }))}
                  className="px-3 py-2 border rounded-lg"
                />
              </div>
              <button
                type="button"
                onClick={getCurrentPosition}
                className="w-full py-2 bg-gray-100 rounded-lg flex items-center justify-center gap-2"
              >
                <MapPin size={18} />
                Usa posizione attuale
              </button>
              <input
                type="number"
                placeholder="Raggio (metri)"
                value={zonaForm.raggio_metri}
                onChange={(e) => setZonaForm(p => ({ ...p, raggio_metri: e.target.value }))}
                className="w-full px-3 py-2 border rounded-lg"
              />
              <div className="flex gap-2">
                <button type="button" onClick={resetZonaForm} className="flex-1 py-2 bg-gray-200 rounded-lg">Annulla</button>
                <button
                  type="button"
                  onClick={handleSaveZona}
                  disabled={saving}
                  className="flex-1 py-2 bg-blue-600 text-white rounded-lg flex items-center justify-center gap-2"
                >
                  {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                  Salva
                </button>
              </div>
            </div>
          )}

          {zone.map(z => (
            <div key={z.id} className="bg-white rounded-xl border p-4 flex justify-between items-start">
              <div>
                <h4 className="font-medium">{z.nome}</h4>
                <p className="text-xs text-gray-500">{z.latitudine}, {z.longitudine} • {z.raggio_metri}m</p>
              </div>
              <div className="flex gap-1">
                <button type="button" onClick={() => handleEditZona(z)} className="p-2 hover:bg-gray-100 rounded"><Edit2 size={16} /></button>
                <button type="button" onClick={() => handleDeleteZona(z)} className="p-2 hover:bg-red-50 text-red-500 rounded"><Trash2 size={16} /></button>
              </div>
            </div>
          ))}

          {zone.length === 0 && !showZoneForm && (
            <p className="text-center text-gray-500 py-8">Nessuna zona configurata</p>
          )}
        </div>
      )}

      {activeTab === 'meteo' && impostazioni && (
        <div className="bg-white rounded-xl border p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Vento Warning (km/h)</label>
            <input
              type="number"
              value={impostazioni.vento_warning_kmh || 30}
              onChange={(e) => setImpostazioni(p => ({ ...p, vento_warning_kmh: parseFloat(e.target.value) }))}
              className="w-full px-3 py-2 border rounded-lg"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Vento Stop (km/h)</label>
            <input
              type="number"
              value={impostazioni.vento_stop_kmh || 50}
              onChange={(e) => setImpostazioni(p => ({ ...p, vento_stop_kmh: parseFloat(e.target.value) }))}
              className="w-full px-3 py-2 border rounded-lg"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Pioggia Warning (mm/h)</label>
            <input
              type="number"
              value={impostazioni.pioggia_warning_mm || 2}
              onChange={(e) => setImpostazioni(p => ({ ...p, pioggia_warning_mm: parseFloat(e.target.value) }))}
              className="w-full px-3 py-2 border rounded-lg"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Temperatura Min (°C)</label>
            <input
              type="number"
              value={impostazioni.temperatura_min_celsius || 0}
              onChange={(e) => setImpostazioni(p => ({ ...p, temperatura_min_celsius: parseFloat(e.target.value) }))}
              className="w-full px-3 py-2 border rounded-lg"
            />
          </div>
          <button
            type="button"
            onClick={handleSaveImpostazioni}
            disabled={saving}
            className="w-full py-3 bg-blue-600 text-white rounded-lg flex items-center justify-center gap-2"
          >
            {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
            Salva
          </button>
        </div>
      )}

      {activeTab === 'gps' && impostazioni && (
        <div className="bg-white rounded-xl border p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Tolleranza GPS (metri)</label>
            <input
              type="number"
              value={impostazioni.tolleranza_gps_metri || 50}
              onChange={(e) => setImpostazioni(p => ({ ...p, tolleranza_gps_metri: parseInt(e.target.value) }))}
              className="w-full px-3 py-2 border rounded-lg"
            />
          </div>
          <button
            type="button"
            onClick={handleSaveImpostazioni}
            disabled={saving}
            className="w-full py-3 bg-blue-600 text-white rounded-lg flex items-center justify-center gap-2"
          >
            {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
            Salva
          </button>
        </div>
      )}
    </div>
  )
}
