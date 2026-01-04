// TestPackageLimiti.jsx - Gestione Limiti di Batteria per Test Packages
// Permette di selezionare isometrici e definire i confini del test
import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

export default function TestPackageLimiti({ testPackageId, progettoId, onUpdate }) {
  // Stati
  const [limiti, setLimiti] = useState([])
  const [isometrici, setIsometrici] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showAddModal, setShowAddModal] = useState(false)
  const [selectedIso, setSelectedIso] = useState(null)
  const [isoDetails, setIsoDetails] = useState(null)
  
  // Form per nuovo limite
  const [limiteForm, setLimiteForm] = useState({
    isometrico_id: '',
    include_completo: true,
    tipo_limite_inizio: '',
    limite_inizio_id: '',
    tipo_limite_fine: '',
    limite_fine_id: '',
    richiede_cap_inizio: false,
    richiede_cap_fine: false,
    note: ''
  })

  // Carica dati
  const loadData = useCallback(async () => {
    if (!testPackageId || !progettoId) return
    setLoading(true)
    
    try {
      // Carica limiti esistenti
      const { data: limitiData } = await supabase
        .from('test_package_limiti')
        .select(`
          *,
          isometrico:isometrici(id, codice, linea, diametro)
        `)
        .eq('test_package_id', testPackageId)

      // Carica isometrici disponibili
      const { data: isoData } = await supabase
        .from('isometrici')
        .select('id, codice, linea, diametro, materiale, classe_rating')
        .eq('progetto_id', progettoId)
        .order('codice')

      setLimiti(limitiData || [])
      setIsometrici(isoData || [])
    } catch (error) {
      console.error('Errore caricamento limiti:', error)
    } finally {
      setLoading(false)
    }
  }, [testPackageId, progettoId])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Carica dettagli isometrico selezionato (flange, saldature)
  const loadIsoDetails = async (isoId) => {
    if (!isoId) {
      setIsoDetails(null)
      return
    }

    try {
      const [
        { data: fittings },
        { data: saldature },
        { data: spool }
      ] = await Promise.all([
        supabase.from('fittings').select('*').eq('isometrico_id', isoId).eq('tipo', 'FLANGE').order('codice'),
        supabase.from('saldature').select('*').eq('isometrico_id', isoId).order('numero_saldatura'),
        supabase.from('spool').select('*').eq('isometrico_id', isoId).order('codice')
      ])

      setIsoDetails({
        flange: fittings || [],
        saldature: saldature || [],
        spool: spool || []
      })
    } catch (error) {
      console.error('Errore caricamento dettagli iso:', error)
    }
  }

  // Quando cambia isometrico selezionato
  useEffect(() => {
    if (limiteForm.isometrico_id) {
      loadIsoDetails(limiteForm.isometrico_id)
    }
  }, [limiteForm.isometrico_id])

  // Aggiungi limite
  const handleAddLimite = async () => {
    if (!limiteForm.isometrico_id) return
    setSaving(true)

    try {
      const payload = {
        test_package_id: testPackageId,
        isometrico_id: limiteForm.isometrico_id,
        include_completo: limiteForm.include_completo,
        tipo_limite_inizio: limiteForm.include_completo ? null : limiteForm.tipo_limite_inizio,
        limite_inizio_flangia_id: limiteForm.tipo_limite_inizio === 'flangia' ? limiteForm.limite_inizio_id : null,
        limite_inizio_saldatura_id: limiteForm.tipo_limite_inizio === 'saldatura' ? limiteForm.limite_inizio_id : null,
        tipo_limite_fine: limiteForm.include_completo ? null : limiteForm.tipo_limite_fine,
        limite_fine_flangia_id: limiteForm.tipo_limite_fine === 'flangia' ? limiteForm.limite_fine_id : null,
        limite_fine_saldatura_id: limiteForm.tipo_limite_fine === 'saldatura' ? limiteForm.limite_fine_id : null,
        richiede_cap_inizio: limiteForm.richiede_cap_inizio,
        richiede_cap_fine: limiteForm.richiede_cap_fine,
        note: limiteForm.note || null
      }

      const { error } = await supabase
        .from('test_package_limiti')
        .insert(payload)

      if (error) throw error

      // Reset e ricarica
      setShowAddModal(false)
      setLimiteForm({
        isometrico_id: '',
        include_completo: true,
        tipo_limite_inizio: '',
        limite_inizio_id: '',
        tipo_limite_fine: '',
        limite_fine_id: '',
        richiede_cap_inizio: false,
        richiede_cap_fine: false,
        note: ''
      })
      setIsoDetails(null)
      loadData()
      if (onUpdate) onUpdate()

    } catch (error) {
      console.error('Errore salvataggio limite:', error)
      alert('Errore: ' + error.message)
    } finally {
      setSaving(false)
    }
  }

  // Rimuovi limite
  const handleRemoveLimite = async (limiteId) => {
    if (!confirm('Rimuovere questo isometrico dal test package?')) return

    try {
      await supabase.from('test_package_limiti').delete().eq('id', limiteId)
      loadData()
      if (onUpdate) onUpdate()
    } catch (error) {
      console.error('Errore rimozione limite:', error)
    }
  }

  // Isometrici già inclusi (per filtro)
  const isoInclusi = limiti.map(l => l.isometrico_id)
  const isoDisponibili = isometrici.filter(iso => !isoInclusi.includes(iso.id))

  // Helper per ottenere descrizione limite
  const getLimiteDescription = (limite) => {
    if (limite.include_completo) {
      return 'Isometrico completo'
    }
    
    let desc = []
    
    if (limite.tipo_limite_inizio === 'flangia') {
      desc.push(`Da flangia ${limite.limite_inizio_flangia_id ? '(selezionata)' : ''}`)
    } else if (limite.tipo_limite_inizio === 'saldatura') {
      desc.push(`Da saldatura ${limite.limite_inizio_saldatura_id ? '(selezionata)' : ''}`)
    }
    
    if (limite.tipo_limite_fine === 'flangia') {
      desc.push(`A flangia ${limite.limite_fine_flangia_id ? '(selezionata)' : ''}`)
    } else if (limite.tipo_limite_fine === 'saldatura') {
      desc.push(`A saldatura ${limite.limite_fine_saldatura_id ? '(selezionata)' : ''}`)
    }
    
    if (limite.richiede_cap_inizio) desc.push('+ Cap inizio')
    if (limite.richiede_cap_fine) desc.push('+ Cap fine')
    
    return desc.join(' | ') || 'Porzione'
  }

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-gray-800">📐 Isometrici Inclusi</h3>
          <p className="text-sm text-gray-500">Definisci gli isometrici e i limiti di batteria per questo test</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          disabled={isoDisponibili.length === 0}
          className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
        >
          + Aggiungi Isometrico
        </button>
      </div>

      {/* Lista limiti */}
      {limiti.length === 0 ? (
        <div className="text-center py-8 bg-gray-50 rounded-xl">
          <div className="text-4xl mb-2">📐</div>
          <p className="text-gray-500">Nessun isometrico incluso</p>
          <p className="text-sm text-gray-400">Aggiungi isometrici per definire lo scope del test</p>
        </div>
      ) : (
        <div className="space-y-3">
          {limiti.map(limite => (
            <div key={limite.id} className="p-4 bg-white rounded-xl border border-purple-200 hover:border-purple-300 transition-colors">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center text-purple-600">
                    📐
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{limite.isometrico?.codice}</span>
                      {limite.isometrico?.linea && (
                        <span className="text-sm text-gray-500">{limite.isometrico.linea}</span>
                      )}
                      {limite.isometrico?.diametro && (
                        <span className="px-2 py-0.5 bg-gray-100 rounded text-xs">{limite.isometrico.diametro}</span>
                      )}
                    </div>
                    <div className="text-sm text-gray-600 mt-1">
                      {getLimiteDescription(limite)}
                    </div>
                    {limite.note && (
                      <div className="text-xs text-gray-400 mt-1">📝 {limite.note}</div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-1 rounded-full text-xs ${
                    limite.include_completo 
                      ? 'bg-green-100 text-green-700' 
                      : 'bg-amber-100 text-amber-700'
                  }`}>
                    {limite.include_completo ? '✓ Completo' : '⚡ Parziale'}
                  </span>
                  <button
                    onClick={() => handleRemoveLimite(limite.id)}
                    className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg"
                    title="Rimuovi"
                  >
                    🗑️
                  </button>
                </div>
              </div>
              
              {/* Indicatori cap */}
              {(limite.richiede_cap_inizio || limite.richiede_cap_fine) && (
                <div className="flex gap-2 mt-2 pt-2 border-t border-gray-100">
                  {limite.richiede_cap_inizio && (
                    <span className="px-2 py-1 bg-blue-50 text-blue-600 rounded text-xs">
                      🔵 Cap richiesto all'inizio
                    </span>
                  )}
                  {limite.richiede_cap_fine && (
                    <span className="px-2 py-1 bg-blue-50 text-blue-600 rounded text-xs">
                      🔵 Cap richiesto alla fine
                    </span>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Riepilogo */}
      {limiti.length > 0 && (
        <div className="p-4 bg-purple-50 rounded-xl">
          <div className="flex items-center gap-4 text-sm">
            <div>
              <span className="text-purple-600 font-medium">{limiti.length}</span>
              <span className="text-purple-700"> isometric{limiti.length !== 1 ? 'i' : 'o'}</span>
            </div>
            <div className="text-purple-400">|</div>
            <div>
              <span className="text-purple-600 font-medium">
                {limiti.filter(l => l.include_completo).length}
              </span>
              <span className="text-purple-700"> complet{limiti.filter(l => l.include_completo).length !== 1 ? 'i' : 'o'}</span>
            </div>
            <div className="text-purple-400">|</div>
            <div>
              <span className="text-purple-600 font-medium">
                {limiti.filter(l => !l.include_completo).length}
              </span>
              <span className="text-purple-700"> parzial{limiti.filter(l => !l.include_completo).length !== 1 ? 'i' : 'e'}</span>
            </div>
            <div className="text-purple-400">|</div>
            <div>
              <span className="text-purple-600 font-medium">
                {limiti.filter(l => l.richiede_cap_inizio || l.richiede_cap_fine).length}
              </span>
              <span className="text-purple-700"> con cap</span>
            </div>
          </div>
        </div>
      )}

      {/* Modal Aggiungi Isometrico */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="p-6 border-b bg-purple-50">
              <h3 className="text-lg font-bold text-purple-800">📐 Aggiungi Isometrico al Test</h3>
              <p className="text-sm text-purple-600 mt-1">Seleziona l'isometrico e definisci i limiti di batteria</p>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Selezione isometrico */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Isometrico *</label>
                <select
                  value={limiteForm.isometrico_id}
                  onChange={e => setLimiteForm({ 
                    ...limiteForm, 
                    isometrico_id: e.target.value,
                    include_completo: true,
                    tipo_limite_inizio: '',
                    limite_inizio_id: '',
                    tipo_limite_fine: '',
                    limite_fine_id: ''
                  })}
                  className="w-full px-4 py-3 border rounded-xl"
                >
                  <option value="">Seleziona isometrico...</option>
                  {isoDisponibili.map(iso => (
                    <option key={iso.id} value={iso.id}>
                      {iso.codice} {iso.linea && `- ${iso.linea}`} {iso.diametro && `(${iso.diametro})`}
                    </option>
                  ))}
                </select>
              </div>

              {/* Tipo inclusione */}
              {limiteForm.isometrico_id && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Inclusione</label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setLimiteForm({ ...limiteForm, include_completo: true })}
                      className={`p-4 rounded-xl border-2 text-left transition-all ${
                        limiteForm.include_completo 
                          ? 'border-green-500 bg-green-50' 
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="text-lg mb-1">✓ Isometrico Completo</div>
                      <div className="text-sm text-gray-500">Tutto l'isometrico è incluso nel test</div>
                    </button>
                    <button
                      type="button"
                      onClick={() => setLimiteForm({ ...limiteForm, include_completo: false })}
                      className={`p-4 rounded-xl border-2 text-left transition-all ${
                        !limiteForm.include_completo 
                          ? 'border-amber-500 bg-amber-50' 
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="text-lg mb-1">⚡ Porzione</div>
                      <div className="text-sm text-gray-500">Solo una parte, definisci i limiti</div>
                    </button>
                  </div>
                </div>
              )}

              {/* Limiti di batteria (solo se parziale) */}
              {limiteForm.isometrico_id && !limiteForm.include_completo && isoDetails && (
                <div className="space-y-4 p-4 bg-amber-50 rounded-xl border border-amber-200">
                  <h4 className="font-medium text-amber-800">⚡ Definizione Limiti di Batteria</h4>
                  
                  {/* Limite INIZIO */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Limite INIZIO - Tipo</label>
                      <select
                        value={limiteForm.tipo_limite_inizio}
                        onChange={e => setLimiteForm({ ...limiteForm, tipo_limite_inizio: e.target.value, limite_inizio_id: '' })}
                        className="w-full px-3 py-2 border rounded-lg"
                      >
                        <option value="">Seleziona...</option>
                        <option value="flangia">Flangia</option>
                        <option value="saldatura">Saldatura (+ Cap)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {limiteForm.tipo_limite_inizio === 'flangia' ? 'Flangia' : 'Saldatura'} Inizio
                      </label>
                      <select
                        value={limiteForm.limite_inizio_id}
                        onChange={e => setLimiteForm({ ...limiteForm, limite_inizio_id: e.target.value })}
                        className="w-full px-3 py-2 border rounded-lg"
                        disabled={!limiteForm.tipo_limite_inizio}
                      >
                        <option value="">Seleziona...</option>
                        {limiteForm.tipo_limite_inizio === 'flangia' && isoDetails.flange.map(f => (
                          <option key={f.id} value={f.id}>{f.codice} {f.dimensione && `(${f.dimensione})`}</option>
                        ))}
                        {limiteForm.tipo_limite_inizio === 'saldatura' && isoDetails.saldature.map(s => (
                          <option key={s.id} value={s.id}>
                            {s.numero_saldatura} ({s.elemento_1_codice} ↔ {s.elemento_2_codice})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Cap inizio */}
                  {limiteForm.tipo_limite_inizio === 'saldatura' && (
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={limiteForm.richiede_cap_inizio}
                        onChange={e => setLimiteForm({ ...limiteForm, richiede_cap_inizio: e.target.checked })}
                        className="w-4 h-4"
                      />
                      <span>🔵 Richiede Cap temporaneo all'inizio (per chiudere la linea)</span>
                    </label>
                  )}

                  {/* Limite FINE */}
                  <div className="grid grid-cols-2 gap-4 pt-4 border-t border-amber-300">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Limite FINE - Tipo</label>
                      <select
                        value={limiteForm.tipo_limite_fine}
                        onChange={e => setLimiteForm({ ...limiteForm, tipo_limite_fine: e.target.value, limite_fine_id: '' })}
                        className="w-full px-3 py-2 border rounded-lg"
                      >
                        <option value="">Seleziona...</option>
                        <option value="flangia">Flangia</option>
                        <option value="saldatura">Saldatura (+ Cap)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {limiteForm.tipo_limite_fine === 'flangia' ? 'Flangia' : 'Saldatura'} Fine
                      </label>
                      <select
                        value={limiteForm.limite_fine_id}
                        onChange={e => setLimiteForm({ ...limiteForm, limite_fine_id: e.target.value })}
                        className="w-full px-3 py-2 border rounded-lg"
                        disabled={!limiteForm.tipo_limite_fine}
                      >
                        <option value="">Seleziona...</option>
                        {limiteForm.tipo_limite_fine === 'flangia' && isoDetails.flange.map(f => (
                          <option key={f.id} value={f.id}>{f.codice} {f.dimensione && `(${f.dimensione})`}</option>
                        ))}
                        {limiteForm.tipo_limite_fine === 'saldatura' && isoDetails.saldature.map(s => (
                          <option key={s.id} value={s.id}>
                            {s.numero_saldatura} ({s.elemento_1_codice} ↔ {s.elemento_2_codice})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Cap fine */}
                  {limiteForm.tipo_limite_fine === 'saldatura' && (
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={limiteForm.richiede_cap_fine}
                        onChange={e => setLimiteForm({ ...limiteForm, richiede_cap_fine: e.target.checked })}
                        className="w-4 h-4"
                      />
                      <span>🔵 Richiede Cap temporaneo alla fine (per chiudere la linea)</span>
                    </label>
                  )}

                  {/* Info sui dati disponibili */}
                  <div className="text-xs text-amber-700 pt-2 border-t border-amber-300">
                    📊 Dati disponibili: {isoDetails.flange.length} flange, {isoDetails.saldature.length} saldature, {isoDetails.spool.length} spool
                  </div>
                </div>
              )}

              {/* Note */}
              {limiteForm.isometrico_id && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Note (opzionale)</label>
                  <textarea
                    value={limiteForm.note}
                    onChange={e => setLimiteForm({ ...limiteForm, note: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                    rows="2"
                    placeholder="Es. Include tie-in esistente sul lato A..."
                  />
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t bg-gray-50 flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowAddModal(false)
                  setLimiteForm({
                    isometrico_id: '',
                    include_completo: true,
                    tipo_limite_inizio: '',
                    limite_inizio_id: '',
                    tipo_limite_fine: '',
                    limite_fine_id: '',
                    richiede_cap_inizio: false,
                    richiede_cap_fine: false,
                    note: ''
                  })
                  setIsoDetails(null)
                }}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                Annulla
              </button>
              <button
                onClick={handleAddLimite}
                disabled={saving || !limiteForm.isometrico_id}
                className="px-6 py-2 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 disabled:opacity-50"
              >
                {saving ? 'Salvataggio...' : 'Aggiungi'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
