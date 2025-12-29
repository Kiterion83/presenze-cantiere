import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { MapPin, Plus, Trash2, Edit2, Save, X, Loader2, Cloud, Settings, Check, AlertCircle, FolderKanban } from 'lucide-react'

export default function ImpostazioniPage() {
  const { assegnazione, progetto } = useAuth()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState('zone')
  const [message, setMessage] = useState({ type: '', text: '' })
  
  const [zone, setZone] = useState([])
  const [showZoneForm, setShowZoneForm] = useState(false)
  const [editingZona, setEditingZona] = useState(null)
  const [zonaForm, setZonaForm] = useState({ nome: '', descrizione: '', latitudine: '', longitudine: '', raggio_metri: 100 })
  
  const [impostazioni, setImpostazioni] = useState(null)
  
  const [centriCosto, setCentriCosto] = useState([])
  const [showCCForm, setShowCCForm] = useState(false)
  const [editingCC, setEditingCC] = useState(null)
  const [ccForm, setCCForm] = useState({ codice: '', nome: '', budget_ore: '', budget_quantita: '', budget_quantita_secondaria: '', unita_misura_id: '', unita_misura_secondaria_id: '' })
  const [unitaMisura, setUnitaMisura] = useState([])

  useEffect(() => { loadData() }, [])

  const loadData = async () => {
    try {
      const pid = assegnazione.progetto_id
      const { data: zoneData } = await supabase.from('zone_gps').select('*').eq('progetto_id', pid).order('nome')
      setZone(zoneData || [])

      const { data: impData } = await supabase.from('impostazioni_progetto').select('*').eq('progetto_id', pid).single()
      if (impData) setImpostazioni(impData)

      const { data: ccData } = await supabase.from('centri_costo').select('*, unita_misura:unita_misura_id(nome, simbolo), unita_misura_sec:unita_misura_secondaria_id(nome, simbolo)').eq('progetto_id', pid).order('ordine')
      setCentriCosto(ccData || [])

      const { data: umData } = await supabase.from('unita_misura').select('*').eq('attiva', true).order('nome')
      setUnitaMisura(umData || [])
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  // ZONE GPS
  const resetZonaForm = () => { setZonaForm({ nome: '', descrizione: '', latitudine: '', longitudine: '', raggio_metri: 100 }); setEditingZona(null); setShowZoneForm(false) }
  
  const handleEditZona = (z) => { setZonaForm({ nome: z.nome, descrizione: z.descrizione || '', latitudine: z.latitudine.toString(), longitudine: z.longitudine.toString(), raggio_metri: z.raggio_metri }); setEditingZona(z); setShowZoneForm(true) }
  
  const handleSaveZona = async () => {
    if (!zonaForm.nome || !zonaForm.latitudine || !zonaForm.longitudine) { setMessage({ type: 'error', text: 'Compila i campi obbligatori' }); return }
    setSaving(true)
    try {
      const data = { progetto_id: assegnazione.progetto_id, nome: zonaForm.nome, descrizione: zonaForm.descrizione || null, latitudine: parseFloat(zonaForm.latitudine), longitudine: parseFloat(zonaForm.longitudine), raggio_metri: parseInt(zonaForm.raggio_metri), attiva: true }
      if (editingZona) await supabase.from('zone_gps').update(data).eq('id', editingZona.id)
      else await supabase.from('zone_gps').insert(data)
      setMessage({ type: 'success', text: 'Zona salvata!' })
      resetZonaForm(); loadData()
    } catch (e) { setMessage({ type: 'error', text: e.message }) }
    finally { setSaving(false) }
  }
  
  const handleDeleteZona = async (z) => { if (!confirm('Eliminare?')) return; await supabase.from('zone_gps').delete().eq('id', z.id); loadData() }
  
  const getCurrentPosition = () => {
    navigator.geolocation?.getCurrentPosition(
      (p) => setZonaForm(f => ({ ...f, latitudine: p.coords.latitude.toFixed(6), longitudine: p.coords.longitude.toFixed(6) })),
      (e) => alert('Errore GPS: ' + e.message), { enableHighAccuracy: true }
    )
  }

  // CENTRI COSTO
  const resetCCForm = () => { setCCForm({ codice: '', nome: '', budget_ore: '', budget_quantita: '', budget_quantita_secondaria: '', unita_misura_id: '', unita_misura_secondaria_id: '' }); setEditingCC(null); setShowCCForm(false) }
  
  const handleEditCC = (cc) => { setCCForm({ codice: cc.codice, nome: cc.nome, budget_ore: cc.budget_ore?.toString() || '', budget_quantita: cc.budget_quantita?.toString() || '', budget_quantita_secondaria: cc.budget_quantita_secondaria?.toString() || '', unita_misura_id: cc.unita_misura_id || '', unita_misura_secondaria_id: cc.unita_misura_secondaria_id || '' }); setEditingCC(cc); setShowCCForm(true) }
  
  const handleSaveCC = async () => {
    if (!ccForm.codice || !ccForm.nome) { setMessage({ type: 'error', text: 'Codice e nome obbligatori' }); return }
    setSaving(true)
    try {
      const data = { progetto_id: assegnazione.progetto_id, codice: ccForm.codice, nome: ccForm.nome, budget_ore: ccForm.budget_ore ? parseInt(ccForm.budget_ore) : null, budget_quantita: ccForm.budget_quantita ? parseFloat(ccForm.budget_quantita) : null, budget_quantita_secondaria: ccForm.budget_quantita_secondaria ? parseFloat(ccForm.budget_quantita_secondaria) : null, unita_misura_id: ccForm.unita_misura_id || null, unita_misura_secondaria_id: ccForm.unita_misura_secondaria_id || null, stato: 'attivo' }
      if (editingCC) await supabase.from('centri_costo').update(data).eq('id', editingCC.id)
      else await supabase.from('centri_costo').insert(data)
      setMessage({ type: 'success', text: 'Centro costo salvato!' })
      resetCCForm(); loadData()
    } catch (e) { setMessage({ type: 'error', text: e.message }) }
    finally { setSaving(false) }
  }

  const handleDeleteCC = async (cc) => { if (!confirm('Eliminare?')) return; await supabase.from('centri_costo').update({ stato: 'chiuso' }).eq('id', cc.id); loadData() }

  // IMPOSTAZIONI
  const handleSaveImpostazioni = async () => {
    setSaving(true)
    try {
      await supabase.from('impostazioni_progetto').update({ vento_warning_kmh: impostazioni.vento_warning_kmh, vento_stop_kmh: impostazioni.vento_stop_kmh, pioggia_warning_mm: impostazioni.pioggia_warning_mm, temperatura_min_celsius: impostazioni.temperatura_min_celsius, tolleranza_gps_metri: impostazioni.tolleranza_gps_metri }).eq('id', impostazioni.id)
      setMessage({ type: 'success', text: 'Salvato!' })
    } catch (e) { setMessage({ type: 'error', text: e.message }) }
    finally { setSaving(false) }
  }

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="animate-spin text-blue-600" size={32} /></div>

  return (
    <div className="p-4 space-y-4 pb-24">
      <div>
        <h1 className="text-xl font-bold text-gray-800">Impostazioni</h1>
        <p className="text-sm text-gray-500">{progetto?.nome}</p>
      </div>

      {message.text && (
        <div className={`p-3 rounded-lg flex items-center gap-2 ${message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
          {message.type === 'success' ? <Check size={18} /> : <AlertCircle size={18} />}
          {message.text}
          <button onClick={() => setMessage({ type: '', text: '' })} className="ml-auto"><X size={16} /></button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-lg overflow-x-auto">
        {[{ id: 'zone', icon: MapPin, label: 'Zone GPS' }, { id: 'cc', icon: FolderKanban, label: 'Centri Costo' }, { id: 'meteo', icon: Cloud, label: 'Meteo' }, { id: 'gps', icon: Settings, label: 'GPS' }].map(t => (
          <button key={t.id} type="button" onClick={() => setActiveTab(t.id)} className={`flex items-center gap-1 px-3 py-2 rounded-md text-sm font-medium whitespace-nowrap ${activeTab === t.id ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-600'}`}>
            <t.icon size={16} />{t.label}
          </button>
        ))}
      </div>

      {/* ZONE GPS */}
      {activeTab === 'zone' && (
        <div className="space-y-3">
          {!showZoneForm && (
            <button type="button" onClick={() => setShowZoneForm(true)} className="w-full py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-blue-500 hover:text-blue-500 flex items-center justify-center gap-2">
              <Plus size={20} />Aggiungi Zona
            </button>
          )}
          {showZoneForm && (
            <div className="bg-white rounded-xl border p-4 space-y-3">
              <div className="flex justify-between"><h3 className="font-medium">{editingZona ? 'Modifica' : 'Nuova'} Zona</h3><button type="button" onClick={resetZonaForm}><X size={20} /></button></div>
              <input type="text" placeholder="Nome *" value={zonaForm.nome} onChange={(e) => setZonaForm(f => ({ ...f, nome: e.target.value }))} className="w-full px-3 py-2 border rounded-lg" />
              <input type="text" placeholder="Descrizione" value={zonaForm.descrizione} onChange={(e) => setZonaForm(f => ({ ...f, descrizione: e.target.value }))} className="w-full px-3 py-2 border rounded-lg" />
              <div className="grid grid-cols-2 gap-2">
                <input type="text" placeholder="Latitudine *" value={zonaForm.latitudine} onChange={(e) => setZonaForm(f => ({ ...f, latitudine: e.target.value }))} className="px-3 py-2 border rounded-lg" />
                <input type="text" placeholder="Longitudine *" value={zonaForm.longitudine} onChange={(e) => setZonaForm(f => ({ ...f, longitudine: e.target.value }))} className="px-3 py-2 border rounded-lg" />
              </div>
              <button type="button" onClick={getCurrentPosition} className="w-full py-2 bg-gray-100 rounded-lg flex items-center justify-center gap-2"><MapPin size={18} />Posizione attuale</button>
              <input type="number" placeholder="Raggio (m)" value={zonaForm.raggio_metri} onChange={(e) => setZonaForm(f => ({ ...f, raggio_metri: e.target.value }))} className="w-full px-3 py-2 border rounded-lg" />
              <div className="flex gap-2">
                <button type="button" onClick={resetZonaForm} className="flex-1 py-2 bg-gray-200 rounded-lg">Annulla</button>
                <button type="button" onClick={handleSaveZona} disabled={saving} className="flex-1 py-2 bg-blue-600 text-white rounded-lg flex items-center justify-center gap-2">{saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}Salva</button>
              </div>
            </div>
          )}
          {zone.map(z => (
            <div key={z.id} className="bg-white rounded-xl border p-3 flex justify-between items-start">
              <div><h4 className="font-medium">{z.nome}</h4><p className="text-xs text-gray-500">{z.latitudine}, {z.longitudine} • {z.raggio_metri}m</p></div>
              <div className="flex gap-1">
                <button type="button" onClick={() => handleEditZona(z)} className="p-2 hover:bg-gray-100 rounded"><Edit2 size={16} /></button>
                <button type="button" onClick={() => handleDeleteZona(z)} className="p-2 hover:bg-red-50 text-red-500 rounded"><Trash2 size={16} /></button>
              </div>
            </div>
          ))}
          {zone.length === 0 && !showZoneForm && <p className="text-center text-gray-500 py-6">Nessuna zona</p>}
        </div>
      )}

      {/* CENTRI COSTO */}
      {activeTab === 'cc' && (
        <div className="space-y-3">
          {!showCCForm && (
            <button type="button" onClick={() => setShowCCForm(true)} className="w-full py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-blue-500 hover:text-blue-500 flex items-center justify-center gap-2">
              <Plus size={20} />Aggiungi Centro Costo
            </button>
          )}
          {showCCForm && (
            <div className="bg-white rounded-xl border p-4 space-y-3">
              <div className="flex justify-between"><h3 className="font-medium">{editingCC ? 'Modifica' : 'Nuovo'} Centro Costo</h3><button type="button" onClick={resetCCForm}><X size={20} /></button></div>
              <div className="grid grid-cols-2 gap-2">
                <input type="text" placeholder="Codice *" value={ccForm.codice} onChange={(e) => setCCForm(f => ({ ...f, codice: e.target.value.toUpperCase() }))} className="px-3 py-2 border rounded-lg" />
                <input type="text" placeholder="Nome *" value={ccForm.nome} onChange={(e) => setCCForm(f => ({ ...f, nome: e.target.value }))} className="px-3 py-2 border rounded-lg" />
              </div>
              <input type="number" placeholder="Budget Ore" value={ccForm.budget_ore} onChange={(e) => setCCForm(f => ({ ...f, budget_ore: e.target.value }))} className="w-full px-3 py-2 border rounded-lg" />
              <div className="grid grid-cols-2 gap-2">
                <input type="number" placeholder="Budget Qtà" value={ccForm.budget_quantita} onChange={(e) => setCCForm(f => ({ ...f, budget_quantita: e.target.value }))} className="px-3 py-2 border rounded-lg" />
                <select value={ccForm.unita_misura_id} onChange={(e) => setCCForm(f => ({ ...f, unita_misura_id: e.target.value }))} className="px-3 py-2 border rounded-lg">
                  <option value="">UdM...</option>
                  {unitaMisura.map(u => <option key={u.id} value={u.id}>{u.simbolo} - {u.nome}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <input type="number" placeholder="Budget Qtà 2" value={ccForm.budget_quantita_secondaria} onChange={(e) => setCCForm(f => ({ ...f, budget_quantita_secondaria: e.target.value }))} className="px-3 py-2 border rounded-lg" />
                <select value={ccForm.unita_misura_secondaria_id} onChange={(e) => setCCForm(f => ({ ...f, unita_misura_secondaria_id: e.target.value }))} className="px-3 py-2 border rounded-lg">
                  <option value="">UdM 2...</option>
                  {unitaMisura.map(u => <option key={u.id} value={u.id}>{u.simbolo} - {u.nome}</option>)}
                </select>
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={resetCCForm} className="flex-1 py-2 bg-gray-200 rounded-lg">Annulla</button>
                <button type="button" onClick={handleSaveCC} disabled={saving} className="flex-1 py-2 bg-blue-600 text-white rounded-lg flex items-center justify-center gap-2">{saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}Salva</button>
              </div>
            </div>
          )}
          {centriCosto.map(cc => (
            <div key={cc.id} className="bg-white rounded-xl border p-3">
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="font-medium">{cc.codice}</h4>
                  <p className="text-sm text-gray-600">{cc.nome}</p>
                  <p className="text-xs text-gray-400 mt-1">
                    Ore: {cc.budget_ore || '-'} | Qtà: {cc.budget_quantita || '-'} {cc.unita_misura?.simbolo || ''}
                    {cc.budget_quantita_secondaria > 0 && ` | Qtà2: ${cc.budget_quantita_secondaria} ${cc.unita_misura_sec?.simbolo || ''}`}
                  </p>
                </div>
                <div className="flex gap-1">
                  <button type="button" onClick={() => handleEditCC(cc)} className="p-2 hover:bg-gray-100 rounded"><Edit2 size={16} /></button>
                  <button type="button" onClick={() => handleDeleteCC(cc)} className="p-2 hover:bg-red-50 text-red-500 rounded"><Trash2 size={16} /></button>
                </div>
              </div>
            </div>
          ))}
          {centriCosto.length === 0 && !showCCForm && <p className="text-center text-gray-500 py-6">Nessun centro costo</p>}
        </div>
      )}

      {/* METEO */}
      {activeTab === 'meteo' && impostazioni && (
        <div className="bg-white rounded-xl border p-4 space-y-4">
          <div><label className="block text-sm font-medium mb-1">Vento Warning (km/h)</label><input type="number" value={impostazioni.vento_warning_kmh || 30} onChange={(e) => setImpostazioni(i => ({ ...i, vento_warning_kmh: parseFloat(e.target.value) }))} className="w-full px-3 py-2 border rounded-lg" /></div>
          <div><label className="block text-sm font-medium mb-1">Vento Stop (km/h)</label><input type="number" value={impostazioni.vento_stop_kmh || 50} onChange={(e) => setImpostazioni(i => ({ ...i, vento_stop_kmh: parseFloat(e.target.value) }))} className="w-full px-3 py-2 border rounded-lg" /></div>
          <div><label className="block text-sm font-medium mb-1">Pioggia Warning (mm/h)</label><input type="number" value={impostazioni.pioggia_warning_mm || 2} onChange={(e) => setImpostazioni(i => ({ ...i, pioggia_warning_mm: parseFloat(e.target.value) }))} className="w-full px-3 py-2 border rounded-lg" /></div>
          <div><label className="block text-sm font-medium mb-1">Temp. Minima (°C)</label><input type="number" value={impostazioni.temperatura_min_celsius || 0} onChange={(e) => setImpostazioni(i => ({ ...i, temperatura_min_celsius: parseFloat(e.target.value) }))} className="w-full px-3 py-2 border rounded-lg" /></div>
          <button type="button" onClick={handleSaveImpostazioni} disabled={saving} className="w-full py-3 bg-blue-600 text-white rounded-lg flex items-center justify-center gap-2">{saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}Salva</button>
        </div>
      )}

      {/* GPS */}
      {activeTab === 'gps' && impostazioni && (
        <div className="bg-white rounded-xl border p-4 space-y-4">
          <div><label className="block text-sm font-medium mb-1">Tolleranza GPS (metri)</label><input type="number" value={impostazioni.tolleranza_gps_metri || 50} onChange={(e) => setImpostazioni(i => ({ ...i, tolleranza_gps_metri: parseInt(e.target.value) }))} className="w-full px-3 py-2 border rounded-lg" /></div>
          <button type="button" onClick={handleSaveImpostazioni} disabled={saving} className="w-full py-3 bg-blue-600 text-white rounded-lg flex items-center justify-center gap-2">{saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}Salva</button>
        </div>
      )}
    </div>
  )
}
