import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'

export default function WarehousePage() {
  const { progetto, persona } = useAuth()
  
  const [activeTab, setActiveTab] = useState('ricevi')
  const [loading, setLoading] = useState(true)
  
  // Dati
  const [componentiWarehouse, setComponentiWarehouse] = useState([])
  const [componentiDaSpedire, setComponentiDaSpedire] = useState([])
  const [ricezioniOggi, setRicezioniOggi] = useState([])
  const [spedizioniOggi, setSpedizioniOggi] = useState([])
  
  // Form
  const [codiceRicerca, setCodiceRicerca] = useState('')
  const [risultatoRicerca, setRisultatoRicerca] = useState(null)
  const [selectedItems, setSelectedItems] = useState([])
  
  // Stats
  const [stats, setStats] = useState({ inWarehouse: 0, speditiOggi: 0, ricevutiOggi: 0 })

  // Carica dati
  const loadData = useCallback(async () => {
    if (!progetto?.id) return
    setLoading(true)
    
    try {
      const oggi = new Date().toISOString().split('T')[0]
      
      // Componenti in warehouse
      const { data: warehouseData } = await supabase
        .from('componenti')
        .select(`
          *,
          tipi_componente (nome, icona),
          discipline (nome, icona, colore)
        `)
        .eq('progetto_id', progetto.id)
        .eq('stato', 'in_warehouse')
        .order('data_arrivo_warehouse', { ascending: false })
      
      setComponentiWarehouse(warehouseData || [])
      
      // Componenti da spedire (pianificati per questa settimana o precedenti)
      const { data: daSpedireData } = await supabase
        .from('componenti')
        .select(`
          *,
          tipi_componente (nome, icona),
          discipline (nome, icona, colore),
          pianificazione_cw!inner (anno, settimana, priorita, azione)
        `)
        .eq('progetto_id', progetto.id)
        .eq('stato', 'in_warehouse')
        .order('pianificazione_cw(settimana)')
      
      setComponentiDaSpedire(daSpedireData || [])
      
      // Ricezioni oggi
      const { data: ricezioniData } = await supabase
        .from('storico_avanzamento')
        .select(`
          *,
          componenti (codice, tipi_componente (nome)),
          persone (nome, cognome)
        `)
        .eq('tipo_azione', 'ricezione_warehouse')
        .gte('data_cambio', oggi + 'T00:00:00')
        .order('data_cambio', { ascending: false })
      
      setRicezioniOggi(ricezioniData || [])
      
      // Spedizioni oggi
      const { data: spedizioniData } = await supabase
        .from('storico_avanzamento')
        .select(`
          *,
          componenti (codice, tipi_componente (nome)),
          persone (nome, cognome)
        `)
        .eq('tipo_azione', 'spedizione_site')
        .gte('data_cambio', oggi + 'T00:00:00')
        .order('data_cambio', { ascending: false })
      
      setSpedizioniOggi(spedizioniData || [])
      
      // Stats
      setStats({
        inWarehouse: warehouseData?.length || 0,
        speditiOggi: spedizioniData?.length || 0,
        ricevutiOggi: ricezioniData?.length || 0
      })
      
    } catch (error) {
      console.error('Errore caricamento:', error)
    } finally {
      setLoading(false)
    }
  }, [progetto?.id])
  
  useEffect(() => {
    loadData()
  }, [loadData])

  // Cerca componente per ricezione
  const handleCercaComponente = async () => {
    if (!codiceRicerca.trim() || !progetto?.id) return
    
    const { data } = await supabase
      .from('componenti')
      .select(`
        *,
        tipi_componente (nome, icona),
        discipline (nome, icona, colore)
      `)
      .eq('progetto_id', progetto.id)
      .ilike('codice', `%${codiceRicerca}%`)
      .limit(10)
    
    if (data && data.length === 1) {
      setRisultatoRicerca(data[0])
    } else if (data && data.length > 1) {
      // Mostra lista
      setRisultatoRicerca({ multiple: true, items: data })
    } else {
      setRisultatoRicerca({ notFound: true })
    }
  }

  // Ricevi componente in warehouse
  const handleRicevi = async (componente) => {
    try {
      // Trova fase "In Warehouse"
      const { data: faseWarehouse } = await supabase
        .from('fasi_workflow')
        .select('id')
        .eq('disciplina_id', componente.disciplina_id)
        .eq('is_warehouse', true)
        .single()
      
      // Aggiorna componente
      const { error } = await supabase
        .from('componenti')
        .update({
          stato: 'in_warehouse',
          data_arrivo_warehouse: new Date().toISOString(),
          ricevuto_da: persona?.id,
          fase_corrente_id: faseWarehouse?.id
        })
        .eq('id', componente.id)
      
      if (error) throw error
      
      // Log storico
      await supabase.from('storico_avanzamento').insert({
        componente_id: componente.id,
        fase_a_id: faseWarehouse?.id,
        persona_id: persona?.id,
        tipo_azione: 'ricezione_warehouse',
        metodo: 'warehouse'
      })
      
      // Reset e reload
      setCodiceRicerca('')
      setRisultatoRicerca(null)
      loadData()
      
      alert(`✅ ${componente.codice} ricevuto in warehouse!`)
      
    } catch (error) {
      console.error('Errore ricezione:', error)
      alert('Errore durante la ricezione')
    }
  }

  // Spedisci componenti al site
  const handleSpedisci = async () => {
    if (selectedItems.length === 0) return
    
    try {
      for (const compId of selectedItems) {
        const componente = componentiWarehouse.find(c => c.id === compId)
        if (!componente) continue
        
        // Trova fase "At Site"
        const { data: faseSite } = await supabase
          .from('fasi_workflow')
          .select('id')
          .eq('disciplina_id', componente.disciplina_id)
          .eq('is_site', true)
          .single()
        
        // Aggiorna componente
        await supabase
          .from('componenti')
          .update({
            stato: 'at_site',
            data_arrivo_site: new Date().toISOString(),
            spedito_da: persona?.id,
            fase_corrente_id: faseSite?.id
          })
          .eq('id', compId)
        
        // Log storico
        await supabase.from('storico_avanzamento').insert({
          componente_id: compId,
          fase_a_id: faseSite?.id,
          persona_id: persona?.id,
          tipo_azione: 'spedizione_site',
          metodo: 'warehouse'
        })
      }
      
      setSelectedItems([])
      loadData()
      
      alert(`✅ ${selectedItems.length} componenti spediti al site!`)
      
    } catch (error) {
      console.error('Errore spedizione:', error)
      alert('Errore durante la spedizione')
    }
  }

  // Toggle selezione
  const toggleSelection = (id) => {
    setSelectedItems(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    )
  }

  // Seleziona tutti
  const selectAll = () => {
    if (selectedItems.length === componentiWarehouse.length) {
      setSelectedItems([])
    } else {
      setSelectedItems(componentiWarehouse.map(c => c.id))
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-500">Caricamento magazzino...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 lg:p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl lg:text-3xl font-bold text-gray-800 flex items-center gap-2">
          📦 Warehouse
        </h1>
        <p className="text-gray-500 mt-1">
          Gestione materiali e spedizioni al site
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-center">
          <p className="text-3xl font-bold text-amber-600">{stats.inWarehouse}</p>
          <p className="text-sm text-amber-700">In Magazzino</p>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-2xl p-4 text-center">
          <p className="text-3xl font-bold text-green-600">{stats.ricevutiOggi}</p>
          <p className="text-sm text-green-700">Ricevuti Oggi</p>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 text-center">
          <p className="text-3xl font-bold text-blue-600">{stats.speditiOggi}</p>
          <p className="text-sm text-blue-700">Spediti Oggi</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setActiveTab('ricevi')}
          className={`flex-1 py-3 px-4 rounded-xl font-medium transition-all ${
            activeTab === 'ricevi'
              ? 'bg-green-600 text-white shadow-lg'
              : 'bg-white text-gray-600 border hover:bg-green-50'
          }`}
        >
          📥 Ricevi Merce
        </button>
        <button
          onClick={() => setActiveTab('spedisci')}
          className={`flex-1 py-3 px-4 rounded-xl font-medium transition-all ${
            activeTab === 'spedisci'
              ? 'bg-blue-600 text-white shadow-lg'
              : 'bg-white text-gray-600 border hover:bg-blue-50'
          }`}
        >
          🚚 Spedisci a Site
        </button>
        <button
          onClick={() => setActiveTab('inventario')}
          className={`flex-1 py-3 px-4 rounded-xl font-medium transition-all ${
            activeTab === 'inventario'
              ? 'bg-amber-600 text-white shadow-lg'
              : 'bg-white text-gray-600 border hover:bg-amber-50'
          }`}
        >
          📋 Inventario
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'ricevi' && (
        <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
          <div className="p-4 border-b bg-green-50">
            <h3 className="font-semibold text-green-800 flex items-center gap-2">
              📥 Ricevi Merce
            </h3>
            <p className="text-sm text-green-600">Scansiona o inserisci il codice del componente</p>
          </div>
          
          <div className="p-4">
            {/* Search Input */}
            <div className="flex gap-2 mb-4">
              <input
                type="text"
                value={codiceRicerca}
                onChange={(e) => setCodiceRicerca(e.target.value.toUpperCase())}
                onKeyDown={(e) => e.key === 'Enter' && handleCercaComponente()}
                placeholder="Inserisci codice componente..."
                className="flex-1 px-4 py-3 border-2 border-green-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 text-lg font-mono"
                autoFocus
              />
              <button
                onClick={handleCercaComponente}
                className="px-6 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 font-medium"
              >
                🔍 Cerca
              </button>
            </div>
            
            {/* Risultato Ricerca */}
            {risultatoRicerca && (
              <div className="mt-4">
                {risultatoRicerca.notFound ? (
                  <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-center">
                    <p className="text-red-600">❌ Componente non trovato</p>
                    <p className="text-sm text-red-500">Verifica il codice e riprova</p>
                  </div>
                ) : risultatoRicerca.multiple ? (
                  <div className="space-y-2">
                    <p className="text-gray-500 mb-2">Trovati {risultatoRicerca.items.length} componenti:</p>
                    {risultatoRicerca.items.map(comp => (
                      <div
                        key={comp.id}
                        className="p-4 bg-gray-50 rounded-xl flex items-center justify-between hover:bg-gray-100"
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">{comp.discipline?.icona || '📦'}</span>
                          <div>
                            <p className="font-medium font-mono">{comp.codice}</p>
                            <p className="text-sm text-gray-500">
                              {comp.tipi_componente?.nome} • {comp.discipline?.nome}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-1 rounded text-xs ${
                            comp.stato === 'in_warehouse' ? 'bg-amber-100 text-amber-700' :
                            comp.stato === 'at_site' ? 'bg-blue-100 text-blue-700' :
                            'bg-gray-100 text-gray-700'
                          }`}>
                            {comp.stato}
                          </span>
                          {comp.stato !== 'in_warehouse' && comp.stato !== 'at_site' && (
                            <button
                              onClick={() => handleRicevi(comp)}
                              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                            >
                              ✓ Ricevi
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-6 bg-green-50 border-2 border-green-200 rounded-xl">
                    <div className="flex items-center gap-4">
                      <span className="text-4xl">{risultatoRicerca.discipline?.icona || '📦'}</span>
                      <div className="flex-1">
                        <p className="text-xl font-bold font-mono">{risultatoRicerca.codice}</p>
                        <p className="text-gray-600">
                          {risultatoRicerca.tipi_componente?.nome} • {risultatoRicerca.discipline?.nome}
                        </p>
                        <p className="text-sm text-gray-500 mt-1">
                          Stato attuale: <span className="font-medium">{risultatoRicerca.stato}</span>
                        </p>
                      </div>
                      {risultatoRicerca.stato !== 'in_warehouse' && risultatoRicerca.stato !== 'at_site' && risultatoRicerca.stato !== 'completato' ? (
                        <button
                          onClick={() => handleRicevi(risultatoRicerca)}
                          className="px-6 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 font-medium text-lg"
                        >
                          ✓ Ricevi in Warehouse
                        </button>
                      ) : (
                        <span className="px-4 py-2 bg-gray-100 text-gray-500 rounded-xl">
                          {risultatoRicerca.stato === 'in_warehouse' ? '📦 Già in warehouse' :
                           risultatoRicerca.stato === 'at_site' ? '🏗️ Già al site' :
                           '✅ Completato'}
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
            
            {/* Ultime Ricezioni Oggi */}
            {ricezioniOggi.length > 0 && (
              <div className="mt-6">
                <h4 className="font-medium text-gray-700 mb-3">✅ Ricevuti oggi ({ricezioniOggi.length})</h4>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {ricezioniOggi.map(r => (
                    <div key={r.id} className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                      <span className="font-mono">{r.componenti?.codice}</span>
                      <span className="text-sm text-gray-500">
                        {new Date(r.data_cambio).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'spedisci' && (
        <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
          <div className="p-4 border-b bg-blue-50 flex justify-between items-center">
            <div>
              <h3 className="font-semibold text-blue-800 flex items-center gap-2">
                🚚 Spedisci a Site
              </h3>
              <p className="text-sm text-blue-600">Seleziona i componenti da spedire</p>
            </div>
            {selectedItems.length > 0 && (
              <button
                onClick={handleSpedisci}
                className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 font-medium flex items-center gap-2"
              >
                📤 Spedisci {selectedItems.length} selezionati
              </button>
            )}
          </div>
          
          <div className="p-4">
            {/* Da Spedire (Priorità) */}
            {componentiDaSpedire.length > 0 && (
              <div className="mb-6">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-medium text-gray-700">
                    ⚡ Prioritari (pianificati per CW corrente)
                  </h4>
                </div>
                <div className="space-y-2">
                  {componentiDaSpedire.slice(0, 10).map(comp => (
                    <div
                      key={comp.id}
                      className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                        selectedItems.includes(comp.id)
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-blue-300'
                      }`}
                      onClick={() => toggleSelection(comp.id)}
                    >
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={selectedItems.includes(comp.id)}
                          onChange={() => toggleSelection(comp.id)}
                          className="w-5 h-5 text-blue-600 rounded"
                        />
                        <span className="text-xl">{comp.discipline?.icona || '📦'}</span>
                        <div className="flex-1">
                          <p className="font-medium font-mono">{comp.codice}</p>
                          <p className="text-sm text-gray-500">
                            {comp.tipi_componente?.nome} • CW{comp.pianificazione_cw?.[0]?.settimana}
                          </p>
                        </div>
                        <span className="px-2 py-1 bg-amber-100 text-amber-700 rounded text-xs">
                          Priorità {comp.pianificazione_cw?.[0]?.priorita}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* Tutti in Warehouse */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-medium text-gray-700">
                  📦 Tutti in Warehouse ({componentiWarehouse.length})
                </h4>
                <button
                  onClick={selectAll}
                  className="text-sm text-blue-600 hover:underline"
                >
                  {selectedItems.length === componentiWarehouse.length ? 'Deseleziona tutti' : 'Seleziona tutti'}
                </button>
              </div>
              
              {componentiWarehouse.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  <p className="text-4xl mb-2">📭</p>
                  <p>Nessun componente in warehouse</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {componentiWarehouse.map(comp => (
                    <div
                      key={comp.id}
                      className={`p-3 rounded-xl border cursor-pointer transition-all ${
                        selectedItems.includes(comp.id)
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-blue-300'
                      }`}
                      onClick={() => toggleSelection(comp.id)}
                    >
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={selectedItems.includes(comp.id)}
                          onChange={() => toggleSelection(comp.id)}
                          className="w-4 h-4 text-blue-600 rounded"
                        />
                        <span>{comp.discipline?.icona || '📦'}</span>
                        <span className="font-mono flex-1">{comp.codice}</span>
                        <span className="text-sm text-gray-500">{comp.tipi_componente?.nome}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            {/* Spedizioni Oggi */}
            {spedizioniOggi.length > 0 && (
              <div className="mt-6 pt-4 border-t">
                <h4 className="font-medium text-gray-700 mb-3">📤 Spediti oggi ({spedizioniOggi.length})</h4>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {spedizioniOggi.map(s => (
                    <div key={s.id} className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                      <span className="font-mono">{s.componenti?.codice}</span>
                      <span className="text-sm text-gray-500">
                        {new Date(s.data_cambio).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'inventario' && (
        <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
          <div className="p-4 border-b bg-amber-50">
            <h3 className="font-semibold text-amber-800 flex items-center gap-2">
              📋 Inventario Warehouse
            </h3>
            <p className="text-sm text-amber-600">
              Tutti i componenti attualmente in magazzino
            </p>
          </div>
          
          <div className="divide-y">
            {componentiWarehouse.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <p className="text-4xl mb-2">📭</p>
                <p>Magazzino vuoto</p>
              </div>
            ) : (
              componentiWarehouse.map(comp => (
                <div key={comp.id} className="p-4 hover:bg-gray-50">
                  <div className="flex items-center gap-4">
                    <span className="text-2xl">{comp.discipline?.icona || '📦'}</span>
                    <div className="flex-1">
                      <p className="font-medium font-mono">{comp.codice}</p>
                      <p className="text-sm text-gray-500">
                        {comp.tipi_componente?.nome} • {comp.discipline?.nome}
                      </p>
                    </div>
                    <div className="text-right text-sm text-gray-500">
                      <p>Ricevuto</p>
                      <p>{comp.data_arrivo_warehouse ? new Date(comp.data_arrivo_warehouse).toLocaleDateString('it-IT') : '-'}</p>
                    </div>
                    {comp.ubicazione_warehouse && (
                      <span className="px-2 py-1 bg-gray-100 rounded text-sm">
                        📍 {comp.ubicazione_warehouse}
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
