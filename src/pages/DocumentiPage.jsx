import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'

export default function DocumentiPage() {
  const { persona, assegnazione, progetto, isAtLeast } = useAuth()
  const [documenti, setDocumenti] = useState([])
  const [loading, setLoading] = useState(true)
  const [filtroCategoria, setFiltroCategoria] = useState('tutti')
  const [searchQuery, setSearchQuery] = useState('')
  const [showUpload, setShowUpload] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadForm, setUploadForm] = useState({
    nome: '',
    descrizione: '',
    categoria: 'altro',
    data_scadenza: '',
    file: null
  })
  const [message, setMessage] = useState(null)

  const categorie = [
    { value: 'sicurezza', label: 'Sicurezza', emoji: '🦺', color: 'red' },
    { value: 'contratto', label: 'Contratto', emoji: '📄', color: 'blue' },
    { value: 'progetto', label: 'Progetto', emoji: '📐', color: 'purple' },
    { value: 'verbale', label: 'Verbale', emoji: '📝', color: 'green' },
    { value: 'certificato', label: 'Certificato', emoji: '🏆', color: 'yellow' },
    { value: 'foto', label: 'Foto', emoji: '📷', color: 'pink' },
    { value: 'altro', label: 'Altro', emoji: '📁', color: 'gray' }
  ]

  useEffect(() => {
    if (assegnazione?.progetto_id) loadDocumenti()
  }, [assegnazione?.progetto_id])

  const loadDocumenti = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('documenti')
      .select('*, caricato_da_persona:persone!documenti_caricato_da_fkey(nome, cognome)')
      .eq('progetto_id', assegnazione.progetto_id)
      .order('created_at', { ascending: false })
    setDocumenti(data || [])
    setLoading(false)
  }

  const handleFileChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      setUploadForm({
        ...uploadForm,
        file,
        nome: uploadForm.nome || file.name.replace(/\.[^/.]+$/, '')
      })
    }
  }

  const handleUpload = async () => {
    if (!uploadForm.file || !uploadForm.nome) {
      setMessage({ type: 'error', text: 'Seleziona un file e inserisci un nome' })
      return
    }

    setUploading(true)
    setMessage(null)

    try {
      // Upload file a Supabase Storage
      const fileExt = uploadForm.file.name.split('.').pop()
      const fileName = `${assegnazione.progetto_id}/${Date.now()}_${uploadForm.nome}.${fileExt}`

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('documenti')
        .upload(fileName, uploadForm.file)

      if (uploadError) throw uploadError

      // Ottieni URL pubblico
      const { data: urlData } = supabase.storage
        .from('documenti')
        .getPublicUrl(fileName)

      // Salva record nel database
      const { error: dbError } = await supabase.from('documenti').insert({
        progetto_id: assegnazione.progetto_id,
        nome: uploadForm.nome,
        descrizione: uploadForm.descrizione || null,
        categoria: uploadForm.categoria,
        data_scadenza: uploadForm.data_scadenza || null,
        file_url: urlData.publicUrl,
        file_nome: uploadForm.file.name,
        file_tipo: uploadForm.file.type,
        file_dimensione: uploadForm.file.size,
        caricato_da: persona.id
      })

      if (dbError) throw dbError

      setMessage({ type: 'success', text: 'Documento caricato!' })
      loadDocumenti()
      resetUploadForm()
    } catch (err) {
      console.error(err)
      setMessage({ type: 'error', text: err.message || 'Errore nel caricamento' })
    } finally {
      setUploading(false)
    }
  }

  const resetUploadForm = () => {
    setUploadForm({ nome: '', descrizione: '', categoria: 'altro', data_scadenza: '', file: null })
    setShowUpload(false)
  }

  const handleDelete = async (doc) => {
    if (!confirm('Eliminare questo documento?')) return

    try {
      // Elimina da storage
      const filePath = doc.file_url.split('/documenti/')[1]
      if (filePath) {
        await supabase.storage.from('documenti').remove([filePath])
      }

      // Elimina da database
      await supabase.from('documenti').delete().eq('id', doc.id)

      loadDocumenti()
    } catch (err) {
      console.error(err)
    }
  }

  const formatFileSize = (bytes) => {
    if (!bytes) return '-'
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  const isExpiringSoon = (date) => {
    if (!date) return false
    const scadenza = new Date(date)
    const oggi = new Date()
    const diff = (scadenza - oggi) / (1000 * 60 * 60 * 24)
    return diff <= 30 && diff >= 0
  }

  const isExpired = (date) => {
    if (!date) return false
    return new Date(date) < new Date()
  }

  const getCategoriaInfo = (cat) => categorie.find(c => c.value === cat) || categorie[6]

  const filteredDocumenti = documenti.filter(doc => {
    if (filtroCategoria !== 'tutti' && doc.categoria !== filtroCategoria) return false
    if (searchQuery && !doc.nome.toLowerCase().includes(searchQuery.toLowerCase())) return false
    return true
  })

  // Statistiche
  const stats = {
    totale: documenti.length,
    inScadenza: documenti.filter(d => isExpiringSoon(d.data_scadenza)).length,
    scaduti: documenti.filter(d => isExpired(d.data_scadenza)).length
  }

  return (
    <div className="p-4 lg:p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">📁 Documenti</h1>
          <p className="text-gray-500">{progetto?.nome}</p>
        </div>
        {isAtLeast('foreman') && !showUpload && (
          <button
            onClick={() => setShowUpload(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700"
          >
            + Carica
          </button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl p-4 border shadow-sm">
          <p className="text-2xl font-bold text-blue-600">{stats.totale}</p>
          <p className="text-sm text-gray-500">Documenti</p>
        </div>
        <div className="bg-white rounded-xl p-4 border shadow-sm">
          <p className="text-2xl font-bold text-orange-600">{stats.inScadenza}</p>
          <p className="text-sm text-gray-500">In scadenza</p>
        </div>
        <div className="bg-white rounded-xl p-4 border shadow-sm">
          <p className="text-2xl font-bold text-red-600">{stats.scaduti}</p>
          <p className="text-sm text-gray-500">Scaduti</p>
        </div>
      </div>

      {/* Upload Form */}
      {showUpload && (
        <div className="bg-white rounded-xl p-6 shadow-sm border mb-6">
          <h2 className="text-lg font-bold text-gray-800 mb-4">📤 Carica Documento</h2>
          <div className="grid gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">File *</label>
              <input
                type="file"
                onChange={handleFileChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl"
                accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.gif"
              />
              {uploadForm.file && (
                <p className="text-sm text-gray-500 mt-1">
                  {uploadForm.file.name} ({formatFileSize(uploadForm.file.size)})
                </p>
              )}
            </div>

            <div className="grid lg:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nome *</label>
                <input
                  type="text"
                  value={uploadForm.nome}
                  onChange={(e) => setUploadForm({ ...uploadForm, nome: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl"
                  placeholder="Nome documento"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Categoria</label>
                <select
                  value={uploadForm.categoria}
                  onChange={(e) => setUploadForm({ ...uploadForm, categoria: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl"
                >
                  {categorie.map(c => (
                    <option key={c.value} value={c.value}>{c.emoji} {c.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid lg:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Descrizione</label>
                <input
                  type="text"
                  value={uploadForm.descrizione}
                  onChange={(e) => setUploadForm({ ...uploadForm, descrizione: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl"
                  placeholder="Descrizione opzionale"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Data Scadenza</label>
                <input
                  type="date"
                  value={uploadForm.data_scadenza}
                  onChange={(e) => setUploadForm({ ...uploadForm, data_scadenza: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl"
                />
              </div>
            </div>

            {message && (
              <div className={`p-4 rounded-xl ${message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                {message.text}
              </div>
            )}

            <div className="flex gap-2">
              <button onClick={resetUploadForm} className="px-4 py-2 bg-gray-200 text-gray-700 rounded-xl">
                Annulla
              </button>
              <button
                onClick={handleUpload}
                disabled={uploading}
                className="px-6 py-2 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 disabled:bg-blue-300"
              >
                {uploading ? 'Caricamento...' : 'Carica'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Filtri */}
      <div className="flex flex-col lg:flex-row gap-4 mb-6">
        <div className="flex-1">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="🔍 Cerca documento..."
            className="w-full px-4 py-3 border rounded-xl"
          />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-2">
          <button
            onClick={() => setFiltroCategoria('tutti')}
            className={`px-4 py-2 rounded-xl font-medium whitespace-nowrap ${filtroCategoria === 'tutti' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 border'}`}
          >
            Tutti
          </button>
          {categorie.map(cat => (
            <button
              key={cat.value}
              onClick={() => setFiltroCategoria(cat.value)}
              className={`px-4 py-2 rounded-xl font-medium whitespace-nowrap ${filtroCategoria === cat.value ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 border'}`}
            >
              {cat.emoji} {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Lista Documenti */}
      {loading ? (
        <div className="text-center py-8 text-gray-500">Caricamento...</div>
      ) : filteredDocumenti.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <p className="text-4xl mb-2">📁</p>
          <p>Nessun documento trovato</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredDocumenti.map(doc => {
            const catInfo = getCategoriaInfo(doc.categoria)
            const expired = isExpired(doc.data_scadenza)
            const expiringSoon = isExpiringSoon(doc.data_scadenza)

            return (
              <div
                key={doc.id}
                className={`bg-white rounded-xl p-4 shadow-sm border ${expired ? 'border-red-300 bg-red-50' : expiringSoon ? 'border-orange-300 bg-orange-50' : ''}`}
              >
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl bg-${catInfo.color}-100`}>
                    {catInfo.emoji}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-gray-800 truncate">{doc.nome}</p>
                      <span className={`px-2 py-0.5 text-xs rounded-full bg-${catInfo.color}-100 text-${catInfo.color}-700`}>
                        {catInfo.label}
                      </span>
                      {expired && <span className="px-2 py-0.5 text-xs rounded-full bg-red-100 text-red-700">⚠️ Scaduto</span>}
                      {expiringSoon && !expired && <span className="px-2 py-0.5 text-xs rounded-full bg-orange-100 text-orange-700">⏳ In scadenza</span>}
                    </div>
                    {doc.descrizione && <p className="text-sm text-gray-500 truncate">{doc.descrizione}</p>}
                    <p className="text-xs text-gray-400 mt-1">
                      {formatFileSize(doc.file_dimensione)} • Caricato il {new Date(doc.created_at).toLocaleDateString('it-IT')}
                      {doc.caricato_da_persona && ` da ${doc.caricato_da_persona.nome}`}
                      {doc.data_scadenza && ` • Scade: ${new Date(doc.data_scadenza).toLocaleDateString('it-IT')}`}
                    </p>
                  </div>

                  <div className="flex gap-2">
                    <a
                      href={doc.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                    >
                      👁️
                    </a>
                    <a
                      href={doc.file_url}
                      download={doc.file_nome}
                      className="p-2 text-green-600 hover:bg-green-50 rounded-lg"
                    >
                      📥
                    </a>
                    {isAtLeast('cm') && (
                      <button
                        onClick={() => handleDelete(doc)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                      >
                        🗑️
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
