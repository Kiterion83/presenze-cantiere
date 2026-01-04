import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useI18n } from '../contexts/I18nContext'
import { supabase } from '../lib/supabase'
import FlussiTab from '../components/FlussiTab'
import ConstructionTab from '../components/ConstructionTab'

export default function ImpostazioniPage() {
  const { progetto, isAtLeast } = useAuth()
  const { t, language } = useI18n()
  const [activeTab, setActiveTab] = useState('progetto')

  const menuItems = [
    { id: 'progetto', label: t('projectAndAreas'), emoji: '🏗️', minRole: 'admin' },
    { id: 'persone', label: t('people'), emoji: '👥', minRole: 'admin' },
    { id: 'ditte', label: t('companies'), emoji: '🏢', minRole: 'admin' },
    { id: 'squadre', label: t('teams'), emoji: '👷', minRole: 'admin' },
    { id: 'dipartimenti', label: t('departments'), emoji: '🏛️', minRole: 'admin' },
    { id: 'centriCosto', label: t('costCenters'), emoji: '💰', minRole: 'admin' },
    { id: 'flussi', label: t('approvalFlows'), emoji: '🔄', minRole: 'admin' },
    { id: 'construction', label: 'Construction', emoji: '🔧', minRole: 'admin' },
    { id: 'progetti', label: t('allProjectsTab'), emoji: '📋', minRole: 'admin' },
    { id: 'datiTest', label: t('testData'), emoji: '🧪', minRole: 'admin' },
  ].filter(item => isAtLeast(item.minRole))

  return (
    <div className="p-4 lg:p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">⚙️ {t('settingsTitle')}</h1>
        <p className="text-gray-500">{progetto?.nome}</p>
      </div>

      <div className="grid lg:grid-cols-4 gap-6">
        <div className="hidden lg:block">
          <div className="bg-white rounded-xl shadow-sm border overflow-hidden sticky top-4">
            <div className="p-4 border-b"><h3 className="font-semibold text-gray-700">{t('menu')}</h3></div>
            <nav className="p-2">
              {menuItems.map(item => (
                <button key={item.id} onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left ${activeTab === item.id ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-600 hover:bg-gray-50'}`}>
                  <span>{item.emoji}</span><span>{item.label}</span>
                </button>
              ))}
            </nav>
          </div>
        </div>

        <div className="lg:hidden">
          <div className="flex gap-2 overflow-x-auto pb-2">
            {menuItems.map(item => (
              <button key={item.id} onClick={() => setActiveTab(item.id)}
                className={`px-4 py-2 rounded-xl font-medium whitespace-nowrap ${activeTab === item.id ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 border'}`}>
                {item.emoji} {item.label}
              </button>
            ))}
          </div>
        </div>

        <div className="lg:col-span-3">
          {activeTab === 'progetto' && <ProgettoTab />}
          {activeTab === 'persone' && <PersoneTab />}
          {activeTab === 'ditte' && <DitteTab />}
          {activeTab === 'squadre' && <SquadreTab />}
          {activeTab === 'dipartimenti' && <DipartimentiTab />}
          {activeTab === 'centriCosto' && <CentriCostoTab />}
          {activeTab === 'flussi' && <FlussiTab />}
          {activeTab === 'construction' && <ConstructionTab />}
          {activeTab === 'progetti' && <TuttiProgettiTab />}
          {activeTab === 'datiTest' && <DatiTestTab />}
        </div>
      </div>
    </div>
  )
}

// ==================== PROGETTO + AREE LAVORO + QR CODES TAB ====================
function ProgettoTab() {
  const { progetto, assegnazione, progettoId } = useAuth()
  const { t, language } = useI18n()
  const [formData, setFormData] = useState({ nome: '', codice: '', indirizzo: '', citta: '', data_inizio: '', data_fine_prevista: '', latitudine: '', longitudine: '', raggio_checkin: 200 })
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState(null)
  
  const [aree, setAree] = useState([])
  const [qrCodes, setQrCodes] = useState({})
  const [loadingAree, setLoadingAree] = useState(true)
  const [showAreaForm, setShowAreaForm] = useState(false)
  const [editingArea, setEditingArea] = useState(null)
  const [areaForm, setAreaForm] = useState({ nome: '', descrizione: '', latitudine: '', longitudine: '', raggio_metri: 100, colore: '#3B82F6' })
  const [savingArea, setSavingArea] = useState(false)
  const [areaMessage, setAreaMessage] = useState(null)
  const colori = ['#3B82F6', '#22C55E', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16']

  useEffect(() => {
    if (progetto) {
      setFormData({
        nome: progetto.nome || '', codice: progetto.codice || '', indirizzo: progetto.indirizzo || '', citta: progetto.citta || '',
        data_inizio: progetto.data_inizio || '', data_fine_prevista: progetto.data_fine_prevista || '',
        latitudine: progetto.latitudine || '', longitudine: progetto.longitudine || '',
        raggio_checkin: progetto.raggio_checkin || 200
      })
    }
    if (progettoId) {
      loadAree()
      loadQrCodes()
    }
  }, [progetto, progettoId])

  const loadAree = async () => {
    setLoadingAree(true)
    const { data } = await supabase.from('aree_lavoro').select('*').eq('progetto_id', progettoId).order('nome')
    setAree(data || [])
    setLoadingAree(false)
  }

  const loadQrCodes = async () => {
    const { data } = await supabase.from('qr_codes').select('*').eq('progetto_id', progettoId)
    const qrMap = {}
    data?.forEach(qr => { if (qr.area_lavoro_id) qrMap[qr.area_lavoro_id] = qr })
    setQrCodes(qrMap)
  }

  const handleSave = async () => {
    setSaving(true)
    setMessage(null)
    try {
      const { error } = await supabase.from('progetti').update({
        nome: formData.nome, codice: formData.codice, indirizzo: formData.indirizzo, citta: formData.citta,
        data_inizio: formData.data_inizio || null, data_fine_prevista: formData.data_fine_prevista || null,
        latitudine: formData.latitudine ? parseFloat(formData.latitudine) : null,
        longitudine: formData.longitudine ? parseFloat(formData.longitudine) : null,
        raggio_checkin: parseInt(formData.raggio_checkin) || 200
      }).eq('id', progetto.id)
      if (error) throw error
      setMessage({ type: 'success', text: t('projectUpdated') })
    } catch (err) { setMessage({ type: 'error', text: err.message }) }
    finally { setSaving(false) }
  }

  const getCurrentLocation = () => {
    navigator.geolocation.getCurrentPosition(
      (pos) => setFormData({...formData, latitudine: pos.coords.latitude.toFixed(8), longitudine: pos.coords.longitude.toFixed(8)}),
      () => setMessage({ type: 'error', text: t('gpsError') })
    )
  }

  const resetAreaForm = () => { setAreaForm({ nome: '', descrizione: '', latitudine: '', longitudine: '', raggio_metri: 100, colore: '#3B82F6' }); setEditingArea(null); setShowAreaForm(false); setAreaMessage(null) }

  const handleEditArea = (area) => {
    setAreaForm({ nome: area.nome, descrizione: area.descrizione || '', latitudine: area.latitudine?.toString() || '', longitudine: area.longitudine?.toString() || '', raggio_metri: area.raggio_metri || 100, colore: area.colore || '#3B82F6' })
    setEditingArea(area); setShowAreaForm(true)
  }

  const handleSaveArea = async () => {
    if (!areaForm.nome || !areaForm.latitudine || !areaForm.longitudine) { setAreaMessage({ type: 'error', text: t('fillNameAndCoords') }); return }
    setSavingArea(true); setAreaMessage(null)
    try {
      const payload = { progetto_id: progettoId, nome: areaForm.nome, descrizione: areaForm.descrizione || null, latitudine: parseFloat(areaForm.latitudine), longitudine: parseFloat(areaForm.longitudine), raggio_metri: parseInt(areaForm.raggio_metri), colore: areaForm.colore }
      if (editingArea) { await supabase.from('aree_lavoro').update(payload).eq('id', editingArea.id) }
      else { await supabase.from('aree_lavoro').insert(payload) }
      setAreaMessage({ type: 'success', text: editingArea ? t('areaUpdated') : t('areaCreated') })
      loadAree(); setTimeout(resetAreaForm, 1000)
    } catch (err) { setAreaMessage({ type: 'error', text: err.message }) }
    finally { setSavingArea(false) }
  }

  const handleDeleteArea = async (id) => { 
    if (!confirm(t('deleteAreaConfirm'))) return
    await supabase.from('qr_codes').delete().eq('area_lavoro_id', id)
    await supabase.from('aree_lavoro').delete().eq('id', id)
    loadAree(); loadQrCodes()
  }

  const getAreaLocation = () => {
    navigator.geolocation.getCurrentPosition(
      (pos) => setAreaForm({...areaForm, latitudine: pos.coords.latitude.toFixed(8), longitudine: pos.coords.longitude.toFixed(8)}),
      () => setAreaMessage({ type: 'error', text: t('gpsError') })
    )
  }

  const generateQrCode = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
    let code = 'QR-'
    for (let i = 0; i < 8; i++) code += chars.charAt(Math.floor(Math.random() * chars.length))
    return code
  }

  const handleGenerateQR = async (area) => {
    try {
      const { error } = await supabase.from('qr_codes').insert({
        progetto_id: progettoId,
        area_lavoro_id: area.id,
        codice: generateQrCode(),
        nome: area.nome,
        descrizione: `QR Check-in/out - ${area.nome}`,
        attivo: true
      })
      if (error) throw error
      loadQrCodes()
      setAreaMessage({ type: 'success', text: t('qrGenerated', { area: area.nome }) })
      setTimeout(() => setAreaMessage(null), 2000)
    } catch (err) { setAreaMessage({ type: 'error', text: err.message }) }
  }

  const handleToggleQR = async (qr) => {
    await supabase.from('qr_codes').update({ attivo: !qr.attivo }).eq('id', qr.id)
    loadQrCodes()
  }

  const handleDeleteQR = async (qr) => {
    if (!confirm(t('deleteQRConfirm'))) return
    await supabase.from('qr_codes').delete().eq('id', qr.id)
    loadQrCodes()
  }

  const printQR = (area, qr) => {
    const scanText = t('scanForCheckin')
    const workAreaText = t('workArea')
    const qrData = JSON.stringify({
      code: qr.codice,
      project: progettoId,
      area: area.id,
      type: 'checkin_checkout'
    })
    
    // Usa API esterna per generare QR (più affidabile) - dimensione grande per stampa
    const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(qrData)}`
    
    const html = `<!DOCTYPE html><html><head><title>QR Code - ${area.nome}</title>
    <style>
      @page { size: A4; margin: 20mm; }
      body{font-family:Arial,sans-serif;text-align:center;padding:20px;margin:0}
      .qr-container{display:inline-block;padding:40px 60px;border:4px solid #333;border-radius:30px;margin:20px auto}
      .title{font-size:36px;font-weight:bold;margin-bottom:8px}
      .subtitle{font-size:18px;color:#666;margin-bottom:25px}
      .code{font-family:monospace;font-size:28px;background:#f0f0f0;padding:15px 30px;border-radius:12px;margin-top:25px;letter-spacing:2px}
      .project{color:#666;margin-top:20px;font-size:16px}
      .instructions{margin-top:20px;padding:15px 25px;background:#e8f5e9;border-radius:12px;font-size:18px;color:#2e7d32;font-weight:500}
      .qr-img{display:block;margin:0 auto;width:400px;height:400px}
    </style></head>
    <body>
      <div class="qr-container">
        <div class="title">📍 ${area.nome}</div>
        <div class="subtitle">${area.descrizione || workAreaText}</div>
        <img class="qr-img" src="${qrImageUrl}" alt="QR Code" onload="setTimeout(function(){window.print()},500)"/>
        <div class="code">${qr.codice}</div>
        <div class="instructions">✅ ${scanText}</div>
        <div class="project">${progetto?.nome}</div>
      </div>
    </body></html>`
    const win = window.open('', '_blank')
    win.document.write(html)
    win.document.close()
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl p-6 shadow-sm border">
        <h2 className="text-xl font-bold text-gray-800 mb-6">🏗️ {t('projectDetails')}</h2>
        <div className="space-y-4">
          <div className="grid lg:grid-cols-2 gap-4">
            <div><label className="block text-sm font-medium text-gray-700 mb-1">{t('name')} *</label>
              <input type="text" value={formData.nome} onChange={(e) => setFormData({...formData, nome: e.target.value})} className="w-full px-4 py-3 border rounded-xl" /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">{t('projectCode')}</label>
              <input type="text" value={formData.codice} onChange={(e) => setFormData({...formData, codice: e.target.value})} className="w-full px-4 py-3 border rounded-xl" /></div>
          </div>
          <div className="grid lg:grid-cols-2 gap-4">
            <div><label className="block text-sm font-medium text-gray-700 mb-1">{t('address')}</label>
              <input type="text" value={formData.indirizzo} onChange={(e) => setFormData({...formData, indirizzo: e.target.value})} className="w-full px-4 py-3 border rounded-xl" /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">{t('city')}</label>
              <input type="text" value={formData.citta} onChange={(e) => setFormData({...formData, citta: e.target.value})} className="w-full px-4 py-3 border rounded-xl" /></div>
          </div>
          <div className="grid lg:grid-cols-2 gap-4">
            <div><label className="block text-sm font-medium text-gray-700 mb-1">{t('startDate')}</label>
              <input type="date" value={formData.data_inizio} onChange={(e) => setFormData({...formData, data_inizio: e.target.value})} className="w-full px-4 py-3 border rounded-xl" /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">{t('endDate')}</label>
              <input type="date" value={formData.data_fine_prevista} onChange={(e) => setFormData({...formData, data_fine_prevista: e.target.value})} className="w-full px-4 py-3 border rounded-xl" /></div>
          </div>
          <div className="p-4 bg-blue-50 rounded-xl border border-blue-200">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-blue-800">📍 {t('gpsCoordinates')}</h3>
              <button onClick={getCurrentLocation} className="px-3 py-1.5 bg-blue-100 text-blue-700 rounded-lg text-sm hover:bg-blue-200">📍 {t('useGPS')}</button>
            </div>
            <div className="grid lg:grid-cols-4 gap-4">
              <div><label className="block text-sm font-medium mb-1">{t('latitude')}</label>
                <input type="text" value={formData.latitudine} onChange={(e) => setFormData({...formData, latitudine: e.target.value})} className="w-full px-4 py-3 border rounded-xl" placeholder="44.80150000" /></div>
              <div><label className="block text-sm font-medium mb-1">{t('longitude')}</label>
                <input type="text" value={formData.longitudine} onChange={(e) => setFormData({...formData, longitudine: e.target.value})} className="w-full px-4 py-3 border rounded-xl" placeholder="10.32790000" /></div>
              <div><label className="block text-sm font-medium mb-1">{t('checkinRadius')}</label>
                <input type="number" value={formData.raggio_checkin} onChange={(e) => setFormData({...formData, raggio_checkin: e.target.value})} className="w-full px-4 py-3 border rounded-xl" placeholder="200" min="50" max="5000" /></div>
            </div>
            {formData.latitudine && formData.longitudine && (
              <p className="mt-2 text-xs text-green-600">✅ {t('workersCanCheckin', { radius: formData.raggio_checkin })}</p>
            )}
          </div>
          {message && <div className={`p-4 rounded-xl ${message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>{message.text}</div>}
          <button onClick={handleSave} disabled={saving} className="px-6 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 disabled:bg-blue-300">
            {saving ? t('saving') : `💾 ${t('saveProject')}`}
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl p-6 shadow-sm border">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold text-gray-800">📍 {t('workAreasAndQR')}</h2>
            <p className="text-sm text-gray-500">{t('createAreasForQR')}</p>
          </div>
          {!showAreaForm && (
            <button onClick={() => setShowAreaForm(true)} className="px-4 py-2 bg-green-600 text-white rounded-xl font-medium hover:bg-green-700">
              + {t('newArea')}
            </button>
          )}
        </div>

        <div className="p-3 bg-blue-50 rounded-xl border border-blue-200 mb-4">
          <p className="text-sm text-blue-700">💡 <strong>{language === 'it' ? 'Flusso' : 'Flow'}:</strong> {t('workAreaFlow')}</p>
        </div>

        {showAreaForm && (
          <div className="p-4 bg-green-50 rounded-xl border border-green-200 mb-6">
            <h3 className="font-semibold text-green-800 mb-4">{editingArea ? `✏️ ${t('editArea')}` : `➕ ${t('newArea')}`}</h3>
            <div className="grid gap-4">
              <div className="grid lg:grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium mb-1">{t('areaName')} *</label>
                  <input type="text" value={areaForm.nome} onChange={(e) => setAreaForm({...areaForm, nome: e.target.value})} className="w-full px-4 py-3 border rounded-xl" placeholder={t('exampleAreaName')} /></div>
                <div><label className="block text-sm font-medium mb-1">{t('description')}</label>
                  <input type="text" value={areaForm.descrizione} onChange={(e) => setAreaForm({...areaForm, descrizione: e.target.value})} className="w-full px-4 py-3 border rounded-xl" /></div>
              </div>
              <div className="grid lg:grid-cols-4 gap-4">
                <div><label className="block text-sm font-medium mb-1">{t('latitude')} *</label>
                  <input type="text" value={areaForm.latitudine} onChange={(e) => setAreaForm({...areaForm, latitudine: e.target.value})} className="w-full px-4 py-3 border rounded-xl" /></div>
                <div><label className="block text-sm font-medium mb-1">{t('longitude')} *</label>
                  <input type="text" value={areaForm.longitudine} onChange={(e) => setAreaForm({...areaForm, longitudine: e.target.value})} className="w-full px-4 py-3 border rounded-xl" /></div>
                <div><label className="block text-sm font-medium mb-1">{t('radiusMeters')}</label>
                  <input type="number" value={areaForm.raggio_metri} onChange={(e) => setAreaForm({...areaForm, raggio_metri: e.target.value})} className="w-full px-4 py-3 border rounded-xl" min="10" max="500" /></div>
                <div className="flex items-end">
                  <button onClick={getAreaLocation} className="w-full px-4 py-3 bg-green-100 text-green-700 rounded-xl font-medium hover:bg-green-200">📍 GPS</button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">{t('color')}</label>
                <div className="flex gap-2">
                  {colori.map(c => (
                    <button key={c} onClick={() => setAreaForm({...areaForm, colore: c})}
                      className={`w-8 h-8 rounded-full border-2 ${areaForm.colore === c ? 'border-gray-800 scale-110' : 'border-transparent'}`}
                      style={{ backgroundColor: c }} />
                  ))}
                </div>
              </div>
              {areaMessage && <div className={`p-3 rounded-xl ${areaMessage.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{areaMessage.text}</div>}
              <div className="flex gap-2">
                <button onClick={resetAreaForm} className="px-4 py-2 bg-gray-200 rounded-xl">{t('cancel')}</button>
                <button onClick={handleSaveArea} disabled={savingArea} className="px-4 py-2 bg-green-600 text-white rounded-xl">{savingArea ? t('saving') : t('saveArea')}</button>
              </div>
            </div>
          </div>
        )}

        {areaMessage && !showAreaForm && <div className={`p-3 rounded-xl mb-4 ${areaMessage.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{areaMessage.text}</div>}

        {loadingAree ? (
          <div className="text-center py-8 text-gray-500">{t('loading')}</div>
        ) : aree.length === 0 ? (
          <div className="text-center py-8 text-gray-400 bg-gray-50 rounded-xl">
            <p className="text-4xl mb-2">📍</p>
            <p>{t('noAreas')}</p>
            <p className="text-sm">{t('createAreasForGPS')}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {aree.map(area => {
              const qr = qrCodes[area.id]
              return (
                <div key={area.id} className="p-4 bg-gray-50 rounded-xl hover:bg-gray-100 border">
                  <div className="flex items-start gap-4">
                    <div className="w-4 h-4 rounded-full flex-shrink-0 mt-1" style={{ backgroundColor: area.colore }} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium text-gray-800">{area.nome}</p>
                        {qr && (
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${qr.attivo ? 'bg-purple-100 text-purple-700' : 'bg-gray-200 text-gray-600'}`}>
                            📱 {qr.attivo ? t('qrActive') : t('qrInactive')}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-500">{area.latitudine?.toFixed(6)}, {area.longitudine?.toFixed(6)} • {t('radiusMeters').replace(' (m)', '')}: {area.raggio_metri}m</p>
                      {area.descrizione && <p className="text-xs text-gray-400">{area.descrizione}</p>}
                      {qr && <p className="text-xs font-mono text-purple-600 mt-1">{t('code')}: {qr.codice}</p>}
                    </div>
                    <div className="flex gap-1 flex-wrap">
                      {!qr ? (
                        <button onClick={() => handleGenerateQR(area)} className="px-3 py-1.5 bg-purple-100 text-purple-700 rounded-lg text-sm hover:bg-purple-200" title={t('generateQR')}>
                          📱 {t('generateQR')}
                        </button>
                      ) : (
                        <>
                          <button onClick={() => printQR(area, qr)} className="p-2 text-purple-600 hover:bg-purple-50 rounded-lg" title={t('printQR')}>🖨️</button>
                          <button onClick={() => handleToggleQR(qr)} className="p-2 text-orange-600 hover:bg-orange-50 rounded-lg" title={qr.attivo ? t('deactivateQR') : t('activateQR')}>
                            {qr.attivo ? '⏸️' : '▶️'}
                          </button>
                        </>
                      )}
                      <button onClick={() => handleEditArea(area)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg" title={t('edit')}>✏️</button>
                      <button onClick={() => handleDeleteArea(area.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg" title={t('delete')}>🗑️</button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

// ==================== TUTTI PROGETTI TAB ====================
function TuttiProgettiTab() {
  const { persona } = useAuth()
  const { t, language } = useI18n()
  const [progetti, setProgetti] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({ nome: '', codice: '', indirizzo: '', citta: '', data_inizio: '', data_fine_prevista: '', latitudine: '', longitudine: '', raggio_checkin: 200 })
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState(null)
  const [addressSuggestions, setAddressSuggestions] = useState([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  
  // Stati per eliminazione con doppia conferma
  const [deleteModal, setDeleteModal] = useState({ show: false, project: null })
  const [deleteConfirmText, setDeleteConfirmText] = useState('')
  const [deleting, setDeleting] = useState(false)

  useEffect(() => { loadProgetti() }, [])

  const loadProgetti = async () => { setLoading(true); const { data } = await supabase.from('progetti').select('*').order('created_at', { ascending: false }); setProgetti(data || []); setLoading(false) }

  const searchAddress = async (query) => {
    if (query.length < 3) { setAddressSuggestions([]); return }
    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5&addressdetails=1`, { headers: { 'User-Agent': 'PTS/2.0' } })
      const data = await response.json()
      setAddressSuggestions(data.map(item => ({ indirizzo: item.display_name.split(',').slice(0, 3).join(','), citta: item.address?.city || item.address?.town || item.address?.village || '', lat: item.lat, lon: item.lon })))
      setShowSuggestions(true)
    } catch { setAddressSuggestions([]) }
  }

  const selectAddress = (suggestion) => {
    setFormData({ ...formData, indirizzo: suggestion.indirizzo, citta: suggestion.citta, latitudine: suggestion.lat, longitudine: suggestion.lon })
    setShowSuggestions(false); setAddressSuggestions([])
  }

  const getCurrentLocation = () => {
    if (!navigator.geolocation) { setMessage({ type: 'error', text: t('geolocationNotSupported') }); return }
    navigator.geolocation.getCurrentPosition(
      (pos) => { setFormData({ ...formData, latitudine: pos.coords.latitude.toFixed(8), longitudine: pos.coords.longitude.toFixed(8) }); setMessage({ type: 'success', text: t('gpsAcquired') }); setTimeout(() => setMessage(null), 2000) },
      (err) => setMessage({ type: 'error', text: t('gpsError') + ': ' + err.message }),
      { enableHighAccuracy: true }
    )
  }

  // ========== CREAZIONE PROGETTO ==========
  const handleCreate = async () => {
    if (!formData.nome) { setMessage({ type: 'error', text: t('nameRequired') }); return }
    setSaving(true); setMessage(null)
    try {
      const { data: esistenti } = await supabase.from('progetti').select('nome, codice').or(`nome.ilike.${formData.nome}${formData.codice ? `,codice.ilike.${formData.codice}` : ''}`)
      if (esistenti && esistenti.length > 0) {
        const nomeEsiste = esistenti.some(p => p.nome?.toLowerCase() === formData.nome.toLowerCase())
        const codiceEsiste = formData.codice && esistenti.some(p => p.codice?.toLowerCase() === formData.codice.toLowerCase())
        if (nomeEsiste && codiceEsiste) { setMessage({ type: 'error', text: `⚠️ ${t('projectExistsBoth')}` }); setSaving(false); return }
        else if (nomeEsiste) { setMessage({ type: 'error', text: `⚠️ ${t('projectExistsName')}` }); setSaving(false); return }
        else if (codiceEsiste) { setMessage({ type: 'error', text: `⚠️ ${t('projectExistsCode')}` }); setSaving(false); return }
      }
      const { data: newProject, error: errProj } = await supabase.from('progetti').insert({ nome: formData.nome, codice: formData.codice || null, indirizzo: formData.indirizzo || null, citta: formData.citta || null, data_inizio: formData.data_inizio || null, data_fine_prevista: formData.data_fine_prevista || null, latitudine: formData.latitudine ? parseFloat(formData.latitudine) : null, longitudine: formData.longitudine ? parseFloat(formData.longitudine) : null, raggio_checkin: parseInt(formData.raggio_checkin) || 200, stato: 'attivo' }).select().single()
      if (errProj) throw errProj
      if (persona?.id && newProject?.id) { await supabase.from('assegnazioni_progetto').insert({ persona_id: persona.id, progetto_id: newProject.id, ruolo: 'admin', attivo: true }) }
      const dipartimentiDefault = [{ nome: 'Engineering', codice: 'ENG', progetto_id: newProject.id },{ nome: 'Procurement', codice: 'PROC', progetto_id: newProject.id },{ nome: 'Construction', codice: 'CONST', progetto_id: newProject.id },{ nome: 'HSE', codice: 'HSE', progetto_id: newProject.id },{ nome: 'Administration', codice: 'ADM', progetto_id: newProject.id },{ nome: 'Quality', codice: 'QA', progetto_id: newProject.id }]
      await supabase.from('dipartimenti').insert(dipartimentiDefault)
      const flussiDefault = [{ tipo: 'ferie', nome: 'Ferie', progetto_id: newProject.id },{ tipo: 'rapportino', nome: 'Rapportino', progetto_id: newProject.id },{ tipo: 'trasferimento', nome: 'Trasferimento', progetto_id: newProject.id }]
      await supabase.from('flussi_approvazione').insert(flussiDefault)
      setMessage({ type: 'success', text: t('projectCreated') })
      loadProgetti(); setTimeout(() => { setShowForm(false); setFormData({ nome: '', codice: '', indirizzo: '', citta: '', data_inizio: '', data_fine_prevista: '', latitudine: '', longitudine: '', raggio_checkin: 200 }); setMessage(null) }, 1500)
    } catch (err) { setMessage({ type: 'error', text: err.message }) }
    finally { setSaving(false) }
  }

  const toggleStato = async (p) => { await supabase.from('progetti').update({ stato: p.stato === 'attivo' ? 'completato' : 'attivo' }).eq('id', p.id); loadProgetti() }

  // Apri modal eliminazione
  const openDeleteModal = (project) => {
    setDeleteModal({ show: true, project })
    setDeleteConfirmText('')
  }

  // Chiudi modal
  const closeDeleteModal = () => {
    setDeleteModal({ show: false, project: null })
    setDeleteConfirmText('')
  }

  // Elimina progetto con tutte le dipendenze
  const handleDeleteProject = async () => {
    if (!deleteModal.project) return
    if (deleteConfirmText !== deleteModal.project.nome) return
    
    setDeleting(true)
    try {
      const projectId = deleteModal.project.id
      
      // Elimina in ordine per rispettare le foreign keys
      // 1. QR codes
      await supabase.from('qr_codes').delete().eq('progetto_id', projectId)
      // 2. Aree lavoro
      await supabase.from('aree_lavoro').delete().eq('progetto_id', projectId)
      // 3. Presenze
      await supabase.from('presenze').delete().eq('progetto_id', projectId)
      // 4. Assegnazioni progetto
      await supabase.from('assegnazioni_progetto').delete().eq('progetto_id', projectId)
      // 5. Flussi approvazione
      await supabase.from('flussi_approvazione').delete().eq('progetto_id', projectId)
      // 6. Dipartimenti
      await supabase.from('dipartimenti').delete().eq('progetto_id', projectId)
      // 7. Centri costo
      await supabase.from('centri_costo').delete().eq('progetto_id', projectId)
      // 8. Squadre
      await supabase.from('squadre').delete().eq('progetto_id', projectId)
      // 9. Finalmente il progetto
      const { error } = await supabase.from('progetti').delete().eq('id', projectId)
      
      if (error) throw error
      
      closeDeleteModal()
      loadProgetti()
      setMessage({ type: 'success', text: t('projectDeleted') })
      setTimeout(() => setMessage(null), 3000)
    } catch (err) {
      console.error('Errore eliminazione:', err)
      setMessage({ type: 'error', text: err.message })
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="bg-white rounded-xl p-6 shadow-sm border">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-gray-800">📋 {t('allProjectsTab')}</h2>
        {!showForm && <button onClick={() => setShowForm(true)} className="px-4 py-2 bg-blue-600 text-white rounded-xl">+ {t('createProject')}</button>}
      </div>

      {message && !showForm && (
        <div className={`p-3 rounded-xl mb-4 ${message.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
          {message.text}
        </div>
      )}

      {showForm && (
        <div className="p-4 bg-blue-50 rounded-xl border border-blue-200 mb-6">
          <h3 className="font-semibold text-blue-800 mb-4">➕ {t('newProject')}</h3>
          <div className="grid gap-4">
            {/* Nome e Codice */}
            <div className="grid lg:grid-cols-2 gap-4">
              <div><label className="block text-sm font-medium mb-1">{t('name')} *</label><input type="text" value={formData.nome} onChange={(e) => setFormData({...formData, nome: e.target.value})} className="w-full px-4 py-3 border rounded-xl" /></div>
              <div><label className="block text-sm font-medium mb-1">{t('projectCode')}</label><input type="text" value={formData.codice} onChange={(e) => setFormData({...formData, codice: e.target.value})} className="w-full px-4 py-3 border rounded-xl" /></div>
            </div>
            
            {/* Indirizzo con Autocomplete */}
            <div className="grid lg:grid-cols-2 gap-4">
              <div className="relative"><label className="block text-sm font-medium mb-1">{t('address')}</label>
                <input type="text" value={formData.indirizzo} onChange={(e) => { setFormData({...formData, indirizzo: e.target.value}); searchAddress(e.target.value) }} className="w-full px-4 py-3 border rounded-xl" placeholder={t('search')}/>
                {showSuggestions && addressSuggestions.length > 0 && (
                  <div className="absolute z-10 w-full bg-white border rounded-xl mt-1 shadow-lg max-h-48 overflow-auto">
                    {addressSuggestions.map((s, i) => (<div key={i} onClick={() => selectAddress(s)} className="px-4 py-2 hover:bg-gray-100 cursor-pointer text-sm">{s.indirizzo}</div>))}
                  </div>
                )}
              </div>
              <div><label className="block text-sm font-medium mb-1">{t('city')}</label><input type="text" value={formData.citta} onChange={(e) => setFormData({...formData, citta: e.target.value})} className="w-full px-4 py-3 border rounded-xl" /></div>
            </div>
            
            {/* Date */}
            <div className="grid lg:grid-cols-2 gap-4">
              <div><label className="block text-sm font-medium mb-1">{t('startDate')}</label><input type="date" value={formData.data_inizio} onChange={(e) => setFormData({...formData, data_inizio: e.target.value})} className="w-full px-4 py-3 border rounded-xl" /></div>
              <div><label className="block text-sm font-medium mb-1">{t('endDate')}</label><input type="date" value={formData.data_fine_prevista} onChange={(e) => setFormData({...formData, data_fine_prevista: e.target.value})} className="w-full px-4 py-3 border rounded-xl" /></div>
            </div>
            <div className="grid lg:grid-cols-4 gap-4">
              <div><label className="block text-sm font-medium mb-1">{t('latitude')}</label><input type="text" value={formData.latitudine} onChange={(e) => setFormData({...formData, latitudine: e.target.value})} className="w-full px-4 py-3 border rounded-xl" /></div>
              <div><label className="block text-sm font-medium mb-1">{t('longitude')}</label><input type="text" value={formData.longitudine} onChange={(e) => setFormData({...formData, longitudine: e.target.value})} className="w-full px-4 py-3 border rounded-xl" /></div>
              <div><label className="block text-sm font-medium mb-1">{t('checkinRadius')}</label><input type="number" value={formData.raggio_checkin} onChange={(e) => setFormData({...formData, raggio_checkin: e.target.value})} className="w-full px-4 py-3 border rounded-xl" min="50" max="5000" /></div>
              <div className="flex items-end"><button onClick={getCurrentLocation} className="w-full px-4 py-3 bg-blue-100 text-blue-700 rounded-xl">📍 GPS</button></div>
            </div>
            {message && <div className={`p-3 rounded-xl ${message.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{message.text}</div>}
            <div className="flex gap-2"><button onClick={() => setShowForm(false)} className="px-4 py-2 bg-gray-200 rounded-xl">{t('cancel')}</button><button onClick={handleCreate} disabled={saving} className="px-4 py-2 bg-blue-600 text-white rounded-xl">{saving ? t('saving') : t('createProject')}</button></div>
          </div>
        </div>
      )}

      {loading ? <div className="text-center py-8 text-gray-500">{t('loading')}</div> : (
        <div className="space-y-3">
          {progetti.map(p => (
            <div key={p.id} className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl hover:bg-gray-100">
              <div className={`w-3 h-3 rounded-full ${p.stato === 'attivo' ? 'bg-green-500' : 'bg-gray-400'}`} />
              <div className="flex-1">
                <p className="font-semibold">{p.nome}</p>
                <p className="text-xs text-gray-500">{p.codice || '-'} • {p.citta || '-'}</p>
              </div>
              <span className={`px-2 py-1 rounded-full text-xs ${p.stato === 'attivo' ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-600'}`}>{p.stato === 'attivo' ? t('statusActive') : t('statusCompleted')}</span>
              <button onClick={() => toggleStato(p)} className="p-2 text-orange-600 hover:bg-orange-50 rounded-lg" title={t('toggleStatus')}>{p.stato === 'attivo' ? '⏸️' : '▶️'}</button>
              <button onClick={() => openDeleteModal(p)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg" title={t('deleteProject')}>🗑️</button>
            </div>
          ))}
        </div>
      )}

      {/* Modal Conferma Eliminazione */}
      {deleteModal.show && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl">
            <div className="text-center mb-6">
              <div className="text-5xl mb-4">⚠️</div>
              <h3 className="text-xl font-bold text-gray-800 mb-2">{t('deleteProjectTitle')}</h3>
              <p className="text-gray-600 text-sm">{t('deleteProjectWarning')}</p>
            </div>
            
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4">
              <p className="text-red-700 font-medium text-center">{deleteModal.project?.nome}</p>
              <p className="text-red-600 text-xs text-center mt-1">{deleteModal.project?.codice}</p>
            </div>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('typeProjectNameToConfirm')}
              </label>
              <input
                type="text"
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                placeholder={deleteModal.project?.nome}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-red-500 focus:ring-0"
              />
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={closeDeleteModal}
                className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200"
              >
                {t('cancel')}
              </button>
              <button
                onClick={handleDeleteProject}
                disabled={deleteConfirmText !== deleteModal.project?.nome || deleting}
                className="flex-1 px-4 py-3 bg-red-600 text-white rounded-xl font-medium hover:bg-red-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                {deleting ? t('deleting') : t('confirmDelete')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ==================== PERSONE TAB ====================
function PersoneTab() {
  const { assegnazione, progettoId } = useAuth()
  const { t } = useI18n()
  const [persone, setPersone] = useState([])
  const [ditte, setDitte] = useState([])
  const [squadre, setSquadre] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingPersona, setEditingPersona] = useState(null)
  const [formData, setFormData] = useState({ nome: '', cognome: '', email: '', telefono: '', ruolo: 'helper', ditta_id: '', squadra_id: '' })
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const ruoli = ['helper', 'warehouse', 'office', 'foreman', 'engineer', 'dept_manager', 'supervisor', 'cm', 'pm', 'admin']
  const ruoliLabels = { helper: t('roleHelper'), warehouse: t('roleWarehouse'), office: t('roleOffice'), foreman: t('roleForeman'), engineer: t('roleEngineer'), dept_manager: t('roleDeptManager'), supervisor: t('roleSupervisor'), cm: t('roleCM'), pm: t('rolePM'), admin: t('roleAdmin') }

  useEffect(() => { if (progettoId) { loadPersone(); loadDitte(); loadSquadre() } }, [progettoId])

  const loadPersone = async () => { setLoading(true); const { data } = await supabase.from('assegnazioni_progetto').select('*, persona:persone(*), ditta:ditte(nome), squadra:squadre(nome)').eq('progetto_id', progettoId).eq('attivo', true).order('created_at', { ascending: false }); setPersone(data || []); setLoading(false) }
  const loadDitte = async () => { const { data } = await supabase.from('ditte').select('*').eq('attivo', true).order('nome'); setDitte(data || []) }
  const loadSquadre = async () => { const { data } = await supabase.from('squadre').select('*').eq('progetto_id', progettoId).eq('attivo', true).order('nome'); setSquadre(data || []) }

  const resetForm = () => { setFormData({ nome: '', cognome: '', email: '', telefono: '', ruolo: 'helper', ditta_id: '', squadra_id: '' }); setEditingPersona(null); setShowForm(false); setMessage(null) }

  const handleEdit = (ass) => {
    setFormData({ nome: ass.persona?.nome || '', cognome: ass.persona?.cognome || '', email: ass.persona?.email || '', telefono: ass.persona?.telefono || '', ruolo: ass.ruolo || 'helper', ditta_id: ass.ditta_id || '', squadra_id: ass.squadra_id || '' })
    setEditingPersona(ass); setShowForm(true)
  }

  const handleSave = async () => {
    if (!formData.nome || !formData.cognome) { setMessage({ type: 'error', text: `${t('name')} ${t('required').toLowerCase()}` }); return }
    setSaving(true); setMessage(null)
    try {
      if (editingPersona) {
        await supabase.from('persone').update({ nome: formData.nome, cognome: formData.cognome, email: formData.email || null, telefono: formData.telefono || null }).eq('id', editingPersona.persona_id)
        await supabase.from('assegnazioni_progetto').update({ ruolo: formData.ruolo, ditta_id: formData.ditta_id || null, squadra_id: formData.squadra_id || null }).eq('id', editingPersona.id)
      } else {
        const { data: newPersona, error: errP } = await supabase.from('persone').insert({ nome: formData.nome, cognome: formData.cognome, email: formData.email || null, telefono: formData.telefono || null }).select().single()
        if (errP) throw errP
        await supabase.from('assegnazioni_progetto').insert({ persona_id: newPersona.id, progetto_id: progettoId, ruolo: formData.ruolo, ditta_id: formData.ditta_id || null, squadra_id: formData.squadra_id || null, attivo: true })
      }
      setMessage({ type: 'success', text: t('personSaved') }); loadPersone(); setTimeout(resetForm, 1000)
    } catch (err) { setMessage({ type: 'error', text: err.message }) }
    finally { setSaving(false) }
  }

  const handleDelete = async (id) => { if (!confirm(t('deactivateConfirm'))) return; await supabase.from('assegnazioni_progetto').update({ attivo: false }).eq('id', id); loadPersone() }

  const filtered = persone.filter(a => {
    const term = searchTerm.toLowerCase()
    return a.persona?.nome?.toLowerCase().includes(term) || a.persona?.cognome?.toLowerCase().includes(term) || a.persona?.email?.toLowerCase().includes(term)
  })

  return (
    <div className="bg-white rounded-xl p-6 shadow-sm border">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-gray-800">👥 {t('peopleTitle')}</h2>
        {!showForm && <button onClick={() => setShowForm(true)} className="px-4 py-2 bg-blue-600 text-white rounded-xl">+ {t('addPerson')}</button>}
      </div>

      {!showForm && (
        <div className="mb-4">
          <input type="text" placeholder={t('searchPeople')} value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full px-4 py-2 border rounded-xl" />
        </div>
      )}

      {showForm && (
        <div className="p-4 bg-blue-50 rounded-xl border border-blue-200 mb-6">
          <h3 className="font-semibold text-blue-800 mb-4">{editingPersona ? `✏️ ${t('editPerson')}` : `➕ ${t('newPerson')}`}</h3>
          <div className="grid gap-4">
            <div className="grid lg:grid-cols-2 gap-4">
              <div><label className="block text-sm font-medium mb-1">{t('firstName')} *</label><input type="text" value={formData.nome} onChange={(e) => setFormData({...formData, nome: e.target.value})} className="w-full px-4 py-3 border rounded-xl" /></div>
              <div><label className="block text-sm font-medium mb-1">{t('lastName')} *</label><input type="text" value={formData.cognome} onChange={(e) => setFormData({...formData, cognome: e.target.value})} className="w-full px-4 py-3 border rounded-xl" /></div>
            </div>
            <div className="grid lg:grid-cols-2 gap-4">
              <div><label className="block text-sm font-medium mb-1">{t('email')}</label><input type="email" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} className="w-full px-4 py-3 border rounded-xl" /></div>
              <div><label className="block text-sm font-medium mb-1">{t('phone')}</label><input type="text" value={formData.telefono} onChange={(e) => setFormData({...formData, telefono: e.target.value})} className="w-full px-4 py-3 border rounded-xl" /></div>
            </div>
            <div className="grid lg:grid-cols-3 gap-4">
              <div><label className="block text-sm font-medium mb-1">{t('role')}</label><select value={formData.ruolo} onChange={(e) => setFormData({...formData, ruolo: e.target.value})} className="w-full px-4 py-3 border rounded-xl">{ruoli.map(r => <option key={r} value={r}>{ruoliLabels[r]}</option>)}</select></div>
              <div><label className="block text-sm font-medium mb-1">{t('company')}</label><select value={formData.ditta_id} onChange={(e) => setFormData({...formData, ditta_id: e.target.value})} className="w-full px-4 py-3 border rounded-xl"><option value="">-</option>{ditte.map(d => <option key={d.id} value={d.id}>{d.nome}</option>)}</select></div>
              <div><label className="block text-sm font-medium mb-1">{t('teamLabel')}</label><select value={formData.squadra_id} onChange={(e) => setFormData({...formData, squadra_id: e.target.value})} className="w-full px-4 py-3 border rounded-xl"><option value="">-</option>{squadre.map(s => <option key={s.id} value={s.id}>{s.nome}</option>)}</select></div>
            </div>
            {message && <div className={`p-3 rounded-xl ${message.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{message.text}</div>}
            <div className="flex gap-2"><button onClick={resetForm} className="px-4 py-2 bg-gray-200 rounded-xl">{t('cancel')}</button><button onClick={handleSave} disabled={saving} className="px-4 py-2 bg-blue-600 text-white rounded-xl">{saving ? t('saving') : t('save')}</button></div>
          </div>
        </div>
      )}

      {loading ? <div className="text-center py-8 text-gray-500">{t('loading')}</div> : filtered.length === 0 ? (
        <div className="text-center py-8 text-gray-400 bg-gray-50 rounded-xl"><p className="text-4xl mb-2">👥</p><p>{t('noPeople')}</p><p className="text-sm">{t('addPeopleToProject')}</p></div>
      ) : (
        <div className="space-y-2">
          {filtered.map(a => (
            <div key={a.id} className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl hover:bg-gray-100">
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold">{a.persona?.nome?.[0]}{a.persona?.cognome?.[0]}</div>
              <div className="flex-1 min-w-0">
                <p className="font-medium">{a.persona?.nome} {a.persona?.cognome}</p>
                <p className="text-xs text-gray-500">{ruoliLabels[a.ruolo]} {a.ditta?.nome && `• ${a.ditta.nome}`} {a.squadra?.nome && `• ${a.squadra.nome}`}</p>
              </div>
              <div className="flex gap-1"><button onClick={() => handleEdit(a)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg">✏️</button><button onClick={() => handleDelete(a.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg">🗑️</button></div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ==================== DITTE TAB ====================
function DitteTab() {
  const { t } = useI18n()
  const [ditte, setDitte] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingDitta, setEditingDitta] = useState(null)
  const [formData, setFormData] = useState({ nome: '', ragione_sociale: '', partita_iva: '', indirizzo: '', telefono: '', email: '' })
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState(null)

  useEffect(() => { loadDitte() }, [])

  const loadDitte = async () => { setLoading(true); const { data } = await supabase.from('ditte').select('*').eq('attivo', true).order('nome'); setDitte(data || []); setLoading(false) }
  const resetForm = () => { setFormData({ nome: '', ragione_sociale: '', partita_iva: '', indirizzo: '', telefono: '', email: '' }); setEditingDitta(null); setShowForm(false); setMessage(null) }
  const handleEdit = (d) => { setFormData({ nome: d.nome || '', ragione_sociale: d.ragione_sociale || '', partita_iva: d.partita_iva || '', indirizzo: d.indirizzo || '', telefono: d.telefono || '', email: d.email || '' }); setEditingDitta(d); setShowForm(true) }

  const handleSave = async () => {
    if (!formData.nome) { setMessage({ type: 'error', text: `${t('name')} ${t('required').toLowerCase()}` }); return }
    setSaving(true); setMessage(null)
    try {
      const payload = { nome: formData.nome, ragione_sociale: formData.ragione_sociale || null, partita_iva: formData.partita_iva || null, indirizzo: formData.indirizzo || null, telefono: formData.telefono || null, email: formData.email || null }
      if (editingDitta) { await supabase.from('ditte').update(payload).eq('id', editingDitta.id) }
      else { await supabase.from('ditte').insert({ ...payload, attivo: true }) }
      setMessage({ type: 'success', text: t('companySaved') }); loadDitte(); setTimeout(resetForm, 1000)
    } catch (err) { setMessage({ type: 'error', text: err.message }) }
    finally { setSaving(false) }
  }

  const handleDelete = async (id) => { if (!confirm(t('deactivateConfirm'))) return; await supabase.from('ditte').update({ attivo: false }).eq('id', id); loadDitte() }

  return (
    <div className="bg-white rounded-xl p-6 shadow-sm border">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-gray-800">🏢 {t('companiesTitle')}</h2>
        {!showForm && <button onClick={() => setShowForm(true)} className="px-4 py-2 bg-blue-600 text-white rounded-xl">+ {t('add')}</button>}
      </div>

      {showForm && (
        <div className="p-4 bg-blue-50 rounded-xl border border-blue-200 mb-6">
          <h3 className="font-semibold text-blue-800 mb-4">{editingDitta ? `✏️ ${t('editCompany')}` : `➕ ${t('newCompany')}`}</h3>
          <div className="grid gap-4">
            <div className="grid lg:grid-cols-2 gap-4">
              <div><label className="block text-sm font-medium mb-1">{t('companyName')} *</label><input type="text" value={formData.nome} onChange={(e) => setFormData({...formData, nome: e.target.value})} className="w-full px-4 py-3 border rounded-xl" /></div>
              <div><label className="block text-sm font-medium mb-1">{t('businessName')}</label><input type="text" value={formData.ragione_sociale} onChange={(e) => setFormData({...formData, ragione_sociale: e.target.value})} className="w-full px-4 py-3 border rounded-xl" /></div>
            </div>
            <div className="grid lg:grid-cols-3 gap-4">
              <div><label className="block text-sm font-medium mb-1">{t('vatNumber')}</label><input type="text" value={formData.partita_iva} onChange={(e) => setFormData({...formData, partita_iva: e.target.value})} className="w-full px-4 py-3 border rounded-xl" /></div>
              <div><label className="block text-sm font-medium mb-1">{t('phone')}</label><input type="text" value={formData.telefono} onChange={(e) => setFormData({...formData, telefono: e.target.value})} className="w-full px-4 py-3 border rounded-xl" /></div>
              <div><label className="block text-sm font-medium mb-1">{t('email')}</label><input type="email" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} className="w-full px-4 py-3 border rounded-xl" /></div>
            </div>
            <div><label className="block text-sm font-medium mb-1">{t('address')}</label><input type="text" value={formData.indirizzo} onChange={(e) => setFormData({...formData, indirizzo: e.target.value})} className="w-full px-4 py-3 border rounded-xl" /></div>
            {message && <div className={`p-3 rounded-xl ${message.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{message.text}</div>}
            <div className="flex gap-2"><button onClick={resetForm} className="px-4 py-2 bg-gray-200 rounded-xl">{t('cancel')}</button><button onClick={handleSave} disabled={saving} className="px-4 py-2 bg-blue-600 text-white rounded-xl">{saving ? t('saving') : t('save')}</button></div>
          </div>
        </div>
      )}

      {loading ? <div className="text-center py-8 text-gray-500">{t('loading')}</div> : ditte.length === 0 ? (
        <div className="text-center py-8 text-gray-400 bg-gray-50 rounded-xl"><p className="text-4xl mb-2">🏢</p><p>{t('noCompanies')}</p><p className="text-sm">{t('addCompaniesToStart')}</p></div>
      ) : (
        <div className="space-y-2">
          {ditte.map(d => (
            <div key={d.id} className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl hover:bg-gray-100">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-700 font-bold">{d.nome?.[0]}</div>
              <div className="flex-1"><p className="font-medium">{d.nome}</p><p className="text-xs text-gray-500">{d.partita_iva || '-'}</p></div>
              <div className="flex gap-1"><button onClick={() => handleEdit(d)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg">✏️</button><button onClick={() => handleDelete(d.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg">🗑️</button></div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ==================== SQUADRE TAB ====================
function SquadreTab() {
  const { assegnazione, progettoId } = useAuth()
  const { t } = useI18n()
  const [squadre, setSquadre] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingSquadra, setEditingSquadra] = useState(null)
  const [formData, setFormData] = useState({ nome: '', colore: '#3B82F6' })
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState(null)
  const colori = ['#3B82F6', '#22C55E', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16']

  useEffect(() => { if (progettoId) loadSquadre() }, [progettoId])

  const loadSquadre = async () => { setLoading(true); const { data } = await supabase.from('squadre').select('*').eq('progetto_id', progettoId).eq('attivo', true).order('nome'); setSquadre(data || []); setLoading(false) }
  const resetForm = () => { setFormData({ nome: '', colore: '#3B82F6' }); setEditingSquadra(null); setShowForm(false); setMessage(null) }
  const handleEdit = (s) => { setFormData({ nome: s.nome || '', colore: s.colore || '#3B82F6' }); setEditingSquadra(s); setShowForm(true) }

  const handleSave = async () => {
    if (!formData.nome) { setMessage({ type: 'error', text: `${t('name')} ${t('required').toLowerCase()}` }); return }
    setSaving(true); setMessage(null)
    try {
      const payload = { nome: formData.nome, colore: formData.colore, progetto_id: progettoId }
      if (editingSquadra) { await supabase.from('squadre').update(payload).eq('id', editingSquadra.id) }
      else { await supabase.from('squadre').insert({ ...payload, attivo: true }) }
      setMessage({ type: 'success', text: t('teamSaved') }); loadSquadre(); setTimeout(resetForm, 1000)
    } catch (err) { setMessage({ type: 'error', text: err.message }) }
    finally { setSaving(false) }
  }

  const handleDelete = async (id) => { if (!confirm(t('deactivateConfirm'))) return; await supabase.from('squadre').update({ attivo: false }).eq('id', id); loadSquadre() }

  return (
    <div className="bg-white rounded-xl p-6 shadow-sm border">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-gray-800">👷 {t('teamsTitle')}</h2>
        {!showForm && <button onClick={() => setShowForm(true)} className="px-4 py-2 bg-blue-600 text-white rounded-xl">+ {t('add')}</button>}
      </div>

      {showForm && (
        <div className="p-4 bg-blue-50 rounded-xl border border-blue-200 mb-6">
          <h3 className="font-semibold text-blue-800 mb-4">{editingSquadra ? `✏️ ${t('editTeam')}` : `➕ ${t('newTeam')}`}</h3>
          <div className="grid gap-4">
            <div><label className="block text-sm font-medium mb-1">{t('teamName')} *</label><input type="text" value={formData.nome} onChange={(e) => setFormData({...formData, nome: e.target.value})} className="w-full px-4 py-3 border rounded-xl" /></div>
            <div><label className="block text-sm font-medium mb-2">{t('color')}</label><div className="flex gap-2">{colori.map(c => (<button key={c} onClick={() => setFormData({...formData, colore: c})} className={`w-8 h-8 rounded-full border-2 ${formData.colore === c ? 'border-gray-800 scale-110' : 'border-transparent'}`} style={{ backgroundColor: c }} />))}</div></div>
            {message && <div className={`p-3 rounded-xl ${message.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{message.text}</div>}
            <div className="flex gap-2"><button onClick={resetForm} className="px-4 py-2 bg-gray-200 rounded-xl">{t('cancel')}</button><button onClick={handleSave} disabled={saving} className="px-4 py-2 bg-blue-600 text-white rounded-xl">{saving ? t('saving') : t('save')}</button></div>
          </div>
        </div>
      )}

      {loading ? <div className="text-center py-8 text-gray-500">{t('loading')}</div> : squadre.length === 0 ? (
        <div className="text-center py-8 text-gray-400 bg-gray-50 rounded-xl"><p className="text-4xl mb-2">👷</p><p>{t('noTeams')}</p><p className="text-sm">{t('createTeams')}</p></div>
      ) : (
        <div className="space-y-2">
          {squadre.map(s => (
            <div key={s.id} className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl hover:bg-gray-100">
              <div className="w-4 h-4 rounded-full" style={{ backgroundColor: s.colore }} />
              <div className="flex-1"><p className="font-medium">{s.nome}</p></div>
              <div className="flex gap-1"><button onClick={() => handleEdit(s)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg">✏️</button><button onClick={() => handleDelete(s.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg">🗑️</button></div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ==================== CENTRI COSTO TAB ====================
function CentriCostoTab() {
  const { assegnazione, progettoId } = useAuth()
  const { t } = useI18n()
  const [centri, setCentri] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingCentro, setEditingCentro] = useState(null)
  const [formData, setFormData] = useState({ codice: '', descrizione: '', budget_ore: '', budget_euro: '' })
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState(null)

  useEffect(() => { if (progettoId) loadCentri() }, [progettoId])

  const loadCentri = async () => { setLoading(true); const { data } = await supabase.from('centri_costo').select('*').eq('progetto_id', progettoId).eq('attivo', true).order('codice'); setCentri(data || []); setLoading(false) }
  const resetForm = () => { setFormData({ codice: '', descrizione: '', budget_ore: '', budget_euro: '' }); setEditingCentro(null); setShowForm(false); setMessage(null) }
  const handleEdit = (cc) => { setFormData({ codice: cc.codice || '', descrizione: cc.descrizione || '', budget_ore: cc.budget_ore?.toString() || '', budget_euro: cc.budget_euro?.toString() || '' }); setEditingCentro(cc); setShowForm(true) }

  const handleSave = async () => {
    if (!formData.codice || !formData.descrizione) { setMessage({ type: 'error', text: `${t('code')} & ${t('description')} ${t('required').toLowerCase()}` }); return }
    setSaving(true); setMessage(null)
    try {
      const payload = { codice: formData.codice, descrizione: formData.descrizione, budget_ore: formData.budget_ore ? parseFloat(formData.budget_ore) : null, budget_euro: formData.budget_euro ? parseFloat(formData.budget_euro) : null, progetto_id: progettoId }
      if (editingCentro) { await supabase.from('centri_costo').update(payload).eq('id', editingCentro.id) }
      else { await supabase.from('centri_costo').insert({ ...payload, attivo: true }) }
      setMessage({ type: 'success', text: t('costCenterSaved') }); loadCentri(); setTimeout(resetForm, 1000)
    } catch (err) { setMessage({ type: 'error', text: err.message }) }
    finally { setSaving(false) }
  }

  const handleDelete = async (id) => { if (!confirm(t('deactivateCC'))) return; await supabase.from('centri_costo').update({ attivo: false }).eq('id', id); loadCentri() }

  return (
    <div className="bg-white rounded-xl p-6 shadow-sm border">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-gray-800">💰 {t('costCentersTitle')}</h2>
        {!showForm && <button onClick={() => setShowForm(true)} className="px-4 py-2 bg-blue-600 text-white rounded-xl">+ {t('add')}</button>}
      </div>

      {showForm && (
        <div className="p-4 bg-blue-50 rounded-xl border border-blue-200 mb-6">
          <h3 className="font-semibold text-blue-800 mb-4">{editingCentro ? `✏️ ${t('editCostCenter')}` : `➕ ${t('newCostCenter')}`}</h3>
          <div className="grid gap-4">
            <div className="grid lg:grid-cols-2 gap-4">
              <div><label className="block text-sm font-medium mb-1">{t('costCenterCode')} *</label><input type="text" value={formData.codice} onChange={(e) => setFormData({...formData, codice: e.target.value.toUpperCase()})} className="w-full px-4 py-3 border rounded-xl" /></div>
              <div><label className="block text-sm font-medium mb-1">{t('costCenterDesc')} *</label><input type="text" value={formData.descrizione} onChange={(e) => setFormData({...formData, descrizione: e.target.value})} className="w-full px-4 py-3 border rounded-xl" /></div>
            </div>
            <div className="grid lg:grid-cols-2 gap-4">
              <div><label className="block text-sm font-medium mb-1">{t('budgetHours')}</label><input type="number" value={formData.budget_ore} onChange={(e) => setFormData({...formData, budget_ore: e.target.value})} className="w-full px-4 py-3 border rounded-xl" /></div>
              <div><label className="block text-sm font-medium mb-1">{t('budgetEuro')}</label><input type="number" value={formData.budget_euro} onChange={(e) => setFormData({...formData, budget_euro: e.target.value})} className="w-full px-4 py-3 border rounded-xl" /></div>
            </div>
            {message && <div className={`p-3 rounded-xl ${message.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{message.text}</div>}
            <div className="flex gap-2"><button onClick={resetForm} className="px-4 py-2 bg-gray-200 rounded-xl">{t('cancel')}</button><button onClick={handleSave} disabled={saving} className="px-4 py-2 bg-blue-600 text-white rounded-xl">{saving ? t('saving') : t('save')}</button></div>
          </div>
        </div>
      )}

      {loading ? <div className="text-center py-8 text-gray-500">{t('loading')}</div> : centri.length === 0 ? (
        <div className="text-center py-8 text-gray-400 bg-gray-50 rounded-xl"><p className="text-4xl mb-2">💰</p><p>{t('noCostCenters')}</p><p className="text-sm">{t('addCostCenters')}</p></div>
      ) : (
        <div className="space-y-2">
          {centri.map(cc => (
            <div key={cc.id} className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl hover:bg-gray-100">
              <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center text-amber-700 font-mono font-bold text-sm">{cc.codice}</div>
              <div className="flex-1"><p className="font-medium">{cc.descrizione}</p><p className="text-xs text-gray-500">{cc.budget_ore && `${cc.budget_ore}h`}{cc.budget_ore && cc.budget_euro && ' • '}{cc.budget_euro && `€${cc.budget_euro.toLocaleString()}`}</p></div>
              <div className="flex gap-1"><button onClick={() => handleEdit(cc)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg">✏️</button><button onClick={() => handleDelete(cc.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg">🗑️</button></div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ==================== DIPARTIMENTI TAB ====================
function DipartimentiTab() {
  const { assegnazione, progettoId } = useAuth()
  const { t } = useI18n()
  const [dipartimenti, setDipartimenti] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingDip, setEditingDip] = useState(null)
  const [formData, setFormData] = useState({ nome: '', codice: '', descrizione: '' })
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState(null)

  useEffect(() => { if (progettoId) loadDipartimenti() }, [progettoId])

  const loadDipartimenti = async () => { setLoading(true); const { data } = await supabase.from('dipartimenti').select('*').eq('progetto_id', progettoId).order('nome'); setDipartimenti(data || []); setLoading(false) }
  const resetForm = () => { setFormData({ nome: '', codice: '', descrizione: '' }); setEditingDip(null); setShowForm(false); setMessage(null) }
  const handleEdit = (d) => { setFormData({ nome: d.nome || '', codice: d.codice || '', descrizione: d.descrizione || '' }); setEditingDip(d); setShowForm(true) }

  const handleSave = async () => {
    if (!formData.nome) { setMessage({ type: 'error', text: `${t('name')} ${t('required').toLowerCase()}` }); return }
    setSaving(true); setMessage(null)
    try {
      const payload = { nome: formData.nome, codice: formData.codice || null, descrizione: formData.descrizione || null, progetto_id: progettoId }
      if (editingDip) { await supabase.from('dipartimenti').update(payload).eq('id', editingDip.id) }
      else { await supabase.from('dipartimenti').insert(payload) }
      setMessage({ type: 'success', text: t('departmentSaved') }); loadDipartimenti(); setTimeout(resetForm, 1000)
    } catch (err) { setMessage({ type: 'error', text: err.message }) }
    finally { setSaving(false) }
  }

  const handleDelete = async (id) => { if (!confirm(t('deleteConfirm'))) return; await supabase.from('dipartimenti').delete().eq('id', id); loadDipartimenti() }

  return (
    <div className="bg-white rounded-xl p-6 shadow-sm border">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-gray-800">🏛️ {t('departmentsTitle')}</h2>
        {!showForm && <button onClick={() => setShowForm(true)} className="px-4 py-2 bg-blue-600 text-white rounded-xl">+ {t('add')}</button>}
      </div>

      {showForm && (
        <div className="p-4 bg-blue-50 rounded-xl border border-blue-200 mb-6">
          <h3 className="font-semibold text-blue-800 mb-4">{editingDip ? `✏️ ${t('editDepartment')}` : `➕ ${t('newDepartment')}`}</h3>
          <div className="grid gap-4">
            <div className="grid lg:grid-cols-2 gap-4">
              <div><label className="block text-sm font-medium mb-1">{t('departmentName')} *</label><input type="text" value={formData.nome} onChange={(e) => setFormData({...formData, nome: e.target.value})} className="w-full px-4 py-3 border rounded-xl" /></div>
              <div><label className="block text-sm font-medium mb-1">{t('departmentCode')}</label><input type="text" value={formData.codice} onChange={(e) => setFormData({...formData, codice: e.target.value.toUpperCase()})} className="w-full px-4 py-3 border rounded-xl" /></div>
            </div>
            <div><label className="block text-sm font-medium mb-1">{t('description')}</label><input type="text" value={formData.descrizione} onChange={(e) => setFormData({...formData, descrizione: e.target.value})} className="w-full px-4 py-3 border rounded-xl" /></div>
            {message && <div className={`p-3 rounded-xl ${message.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{message.text}</div>}
            <div className="flex gap-2"><button onClick={resetForm} className="px-4 py-2 bg-gray-200 rounded-xl">{t('cancel')}</button><button onClick={handleSave} disabled={saving} className="px-4 py-2 bg-blue-600 text-white rounded-xl">{saving ? t('saving') : t('save')}</button></div>
          </div>
        </div>
      )}

      {loading ? <div className="text-center py-8 text-gray-500">{t('loading')}</div> : dipartimenti.length === 0 ? (
        <div className="text-center py-8 text-gray-400 bg-gray-50 rounded-xl">
          <p className="text-4xl mb-2">🏛️</p>
          <p>{t('noDepartments')}</p>
          <p className="text-sm">{t('departmentsAutoCreated')}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {dipartimenti.map(d => (
            <div key={d.id} className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl hover:bg-gray-100">
              <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center text-indigo-700 font-mono font-bold text-sm">{d.codice || '?'}</div>
              <div className="flex-1"><p className="font-medium">{d.nome}</p>{d.descrizione && <p className="text-xs text-gray-500">{d.descrizione}</p>}</div>
              <div className="flex gap-1"><button onClick={() => handleEdit(d)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg">✏️</button><button onClick={() => handleDelete(d.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg">🗑️</button></div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ==================== DATI TEST TAB ====================
function DatiTestTab() {
  const { assegnazione, progettoId } = useAuth()
  const { t } = useI18n()
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState(null)

  const generaDatiTest = async () => {
    if (!confirm(t('generateTestDataConfirm'))) return
    setLoading(true)
    setMessage(null)
    try {
      const ditteTest = [
        { nome: 'Costruzioni Rossi', partita_iva: '12345678901', attivo: true },
        { nome: 'Edilizia Bianchi', partita_iva: '23456789012', attivo: true },
        { nome: 'Impianti Verdi', partita_iva: '34567890123', attivo: true }
      ]
      await supabase.from('ditte').insert(ditteTest)

      const squadreTest = [
        { nome: 'Squadra Alpha', colore: '#3B82F6', progetto_id: progettoId, attivo: true },
        { nome: 'Squadra Beta', colore: '#22C55E', progetto_id: progettoId, attivo: true }
      ]
      await supabase.from('squadre').insert(squadreTest)

      setMessage({ type: 'success', text: t('testDataGenerated') })
    } catch (err) {
      setMessage({ type: 'error', text: err.message })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-white rounded-xl p-6 shadow-sm border">
      <h2 className="text-xl font-bold text-gray-800 mb-4">🧪 {t('testDataTitle')}</h2>
      <p className="text-gray-500 mb-6">{t('testDataDescription')}</p>
      
      {message && (
        <div className={`p-4 rounded-xl mb-4 ${message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
          {message.text}
        </div>
      )}

      <button 
        onClick={generaDatiTest} 
        disabled={loading}
        className="px-6 py-3 bg-purple-600 text-white rounded-xl font-medium hover:bg-purple-700 disabled:opacity-50"
      >
        {loading ? `⏳ ${t('generating')}` : `🎲 ${t('generateTestData')}`}
      </button>

      <div className="mt-6 p-4 bg-amber-50 rounded-xl border border-amber-200">
        <p className="text-sm text-amber-700">
          ⚠️ <strong>{t('testDataWarning').split(':')[0]}:</strong> {t('testDataWarning').split(':')[1]}
        </p>
      </div>
    </div>
  )
}
