// TestPackageDocumenti.jsx - Gestione documenti con preview e annotazioni touch
import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '../lib/supabase'

// Tipi di documento predefiniti
const TIPO_DOCUMENTO_OPTIONS = [
  { value: 'procedure', label: '📋 Procedura', color: '#3B82F6' },
  { value: 'certificate', label: '📜 Certificato', color: '#22C55E' },
  { value: 'report', label: '📄 Report', color: '#8B5CF6' },
  { value: 'checklist', label: '✅ Checklist', color: '#F59E0B' },
  { value: 'p_and_id', label: '🔧 P&ID', color: '#06B6D4' },
  { value: 'isometric', label: '📐 Isometrico', color: '#EC4899' },
  { value: 'photo', label: '📷 Foto', color: '#84CC16' },
  { value: 'other', label: '📁 Altro', color: '#6B7280' }
]

// Componente principale
export default function TestPackageDocumenti({ testPackageId, testPackageCode, canEdit = true }) {
  const [documenti, setDocumenti] = useState([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [selectedDoc, setSelectedDoc] = useState(null)
  const [showUploadModal, setShowUploadModal] = useState(false)
  
  // Form upload
  const [uploadForm, setUploadForm] = useState({
    nome: '',
    descrizione: '',
    tipo_documento: 'other',
    file: null
  })

  // Carica documenti
  const loadDocumenti = useCallback(async () => {
    if (!testPackageId) return
    
    try {
      const { data, error } = await supabase
        .from('test_package_documenti')
        .select('*, created_by_persona:persone!test_package_documenti_created_by_fkey(nome, cognome)')
        .eq('test_package_id', testPackageId)
        .order('created_at', { ascending: false })
      
      if (error) throw error
      setDocumenti(data || [])
    } catch (error) {
      console.error('Errore caricamento documenti:', error)
    } finally {
      setLoading(false)
    }
  }, [testPackageId])

  useEffect(() => {
    loadDocumenti()
  }, [loadDocumenti])

  // Upload file
  const handleFileSelect = (e) => {
    const file = e.target.files[0]
    if (file) {
      setUploadForm(f => ({
        ...f,
        file,
        nome: f.nome || file.name.replace(/\.[^/.]+$/, '') // Nome senza estensione
      }))
    }
  }

  const handleUpload = async () => {
    if (!uploadForm.file || !uploadForm.nome) {
      alert('Seleziona un file e inserisci un nome')
      return
    }
    
    setUploading(true)
    try {
      // 1. Upload file a Supabase Storage
      const fileExt = uploadForm.file.name.split('.').pop()
      const fileName = `${testPackageCode}/${Date.now()}_${uploadForm.nome.replace(/\s+/g, '_')}.${fileExt}`
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('test-package-docs')
        .upload(fileName, uploadForm.file)
      
      if (uploadError) throw uploadError
      
      // 2. Ottieni URL pubblico
      const { data: urlData } = supabase.storage
        .from('test-package-docs')
        .getPublicUrl(fileName)
      
      // 3. Salva record in database
      const { error: dbError } = await supabase
        .from('test_package_documenti')
        .insert({
          test_package_id: testPackageId,
          nome: uploadForm.nome,
          descrizione: uploadForm.descrizione || null,
          tipo_documento: uploadForm.tipo_documento,
          file_url: urlData.publicUrl,
          file_name: uploadForm.file.name,
          file_type: uploadForm.file.type,
          file_size: uploadForm.file.size
        })
      
      if (dbError) throw dbError
      
      // Reset e ricarica
      setUploadForm({ nome: '', descrizione: '', tipo_documento: 'other', file: null })
      setShowUploadModal(false)
      await loadDocumenti()
      
    } catch (error) {
      console.error('Errore upload:', error)
      alert('Errore durante il caricamento: ' + error.message)
    } finally {
      setUploading(false)
    }
  }

  // Elimina documento
  const handleDelete = async (doc) => {
    if (!confirm(`Eliminare "${doc.nome}"?`)) return
    
    try {
      // Elimina da storage
      const filePath = doc.file_url.split('/test-package-docs/')[1]
      if (filePath) {
        await supabase.storage.from('test-package-docs').remove([filePath])
      }
      
      // Elimina da database
      const { error } = await supabase
        .from('test_package_documenti')
        .delete()
        .eq('id', doc.id)
      
      if (error) throw error
      await loadDocumenti()
      
    } catch (error) {
      console.error('Errore eliminazione:', error)
      alert('Errore: ' + error.message)
    }
  }

  // Helpers
  const formatFileSize = (bytes) => {
    if (!bytes) return '-'
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  }

  const getTipoInfo = (tipo) => {
    return TIPO_DOCUMENTO_OPTIONS.find(t => t.value === tipo) || TIPO_DOCUMENTO_OPTIONS[7]
  }

  const isImage = (fileType) => fileType?.startsWith('image/')
  const isPDF = (fileType) => fileType === 'application/pdf'

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h4 className="font-semibold text-gray-700">
          📄 Documenti ({documenti.length})
        </h4>
        {canEdit && (
          <button
            onClick={() => setShowUploadModal(true)}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 transition-colors flex items-center gap-2"
          >
            <span>📤</span>
            <span>Carica Documento</span>
          </button>
        )}
      </div>

      {/* Lista documenti */}
      {documenti.length === 0 ? (
        <div className="text-center py-8 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
          <span className="text-4xl mb-3 block">📁</span>
          <p className="text-gray-500">Nessun documento caricato</p>
          {canEdit && (
            <button
              onClick={() => setShowUploadModal(true)}
              className="mt-3 text-purple-600 hover:text-purple-700 font-medium"
            >
              + Carica il primo documento
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {documenti.map(doc => {
            const tipoInfo = getTipoInfo(doc.tipo_documento)
            
            return (
              <div
                key={doc.id}
                className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => setSelectedDoc(doc)}
              >
                <div className="flex items-start gap-3">
                  {/* Thumbnail/Icon */}
                  <div 
                    className="w-12 h-12 rounded-lg flex items-center justify-center text-xl flex-shrink-0"
                    style={{ backgroundColor: `${tipoInfo.color}20` }}
                  >
                    {isImage(doc.file_type) ? '🖼️' : isPDF(doc.file_type) ? '📄' : '📁'}
                  </div>
                  
                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <h5 className="font-medium text-gray-800 truncate">{doc.nome}</h5>
                    <div className="flex items-center gap-2 mt-1">
                      <span 
                        className="px-2 py-0.5 text-xs rounded-full"
                        style={{ backgroundColor: `${tipoInfo.color}20`, color: tipoInfo.color }}
                      >
                        {tipoInfo.label}
                      </span>
                      <span className="text-xs text-gray-400">{formatFileSize(doc.file_size)}</span>
                    </div>
                    {doc.descrizione && (
                      <p className="text-xs text-gray-500 mt-1 truncate">{doc.descrizione}</p>
                    )}
                  </div>
                  
                  {/* Actions */}
                  <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                    <a
                      href={doc.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
                      title="Scarica"
                    >
                      ⬇️
                    </a>
                    {canEdit && (
                      <button
                        onClick={() => handleDelete(doc)}
                        className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        title="Elimina"
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

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between p-5 border-b">
              <h3 className="text-lg font-bold text-gray-800">📤 Carica Documento</h3>
              <button
                onClick={() => setShowUploadModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                ✕
              </button>
            </div>
            
            <div className="p-5 space-y-4">
              {/* File input */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">File *</label>
                <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center hover:border-purple-500 transition-colors">
                  {uploadForm.file ? (
                    <div>
                      <span className="text-3xl mb-2 block">
                        {isImage(uploadForm.file.type) ? '🖼️' : isPDF(uploadForm.file.type) ? '📄' : '📁'}
                      </span>
                      <p className="font-medium text-gray-800">{uploadForm.file.name}</p>
                      <p className="text-sm text-gray-500">{formatFileSize(uploadForm.file.size)}</p>
                      <button
                        onClick={() => setUploadForm(f => ({ ...f, file: null }))}
                        className="mt-2 text-red-500 text-sm hover:underline"
                      >
                        Rimuovi
                      </button>
                    </div>
                  ) : (
                    <label className="cursor-pointer">
                      <span className="text-3xl mb-2 block">📎</span>
                      <p className="text-gray-600">Clicca o trascina un file</p>
                      <p className="text-xs text-gray-400 mt-1">PDF, immagini, documenti (max 50MB)</p>
                      <input
                        type="file"
                        onChange={handleFileSelect}
                        accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx"
                        className="hidden"
                      />
                    </label>
                  )}
                </div>
              </div>
              
              {/* Nome */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nome documento *</label>
                <input
                  type="text"
                  value={uploadForm.nome}
                  onChange={(e) => setUploadForm(f => ({ ...f, nome: e.target.value }))}
                  placeholder="Es. Procedura Hydrotest"
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500"
                />
              </div>
              
              {/* Tipo */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tipo documento</label>
                <select
                  value={uploadForm.tipo_documento}
                  onChange={(e) => setUploadForm(f => ({ ...f, tipo_documento: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg"
                >
                  {TIPO_DOCUMENTO_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
              
              {/* Descrizione */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Descrizione</label>
                <textarea
                  value={uploadForm.descrizione}
                  onChange={(e) => setUploadForm(f => ({ ...f, descrizione: e.target.value }))}
                  rows={2}
                  placeholder="Note opzionali..."
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg"
                />
              </div>
            </div>
            
            <div className="flex justify-end gap-3 p-5 border-t bg-gray-50 rounded-b-2xl">
              <button
                onClick={() => setShowUploadModal(false)}
                className="px-5 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                Annulla
              </button>
              <button
                onClick={handleUpload}
                disabled={uploading || !uploadForm.file || !uploadForm.nome}
                className="px-5 py-2 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 disabled:opacity-50"
              >
                {uploading ? '⏳ Caricamento...' : '📤 Carica'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Document Viewer Modal con Annotazioni */}
      {selectedDoc && (
        <DocumentViewerModal
          documento={selectedDoc}
          onClose={() => setSelectedDoc(null)}
          canEdit={canEdit}
          onUpdate={loadDocumenti}
        />
      )}
    </div>
  )
}

// ============================================================
// DOCUMENT VIEWER CON ANNOTAZIONI
// ============================================================
function DocumentViewerModal({ documento, onClose, canEdit, onUpdate }) {
  const canvasRef = useRef(null)
  const containerRef = useRef(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [tool, setTool] = useState('pen') // pen, text, arrow, eraser
  const [color, setColor] = useState('#FF0000')
  const [brushSize, setBrushSize] = useState(3)
  const [annotations, setAnnotations] = useState([])
  const [currentPath, setCurrentPath] = useState([])
  const [saving, setSaving] = useState(false)
  const [imageLoaded, setImageLoaded] = useState(false)
  const [imageDimensions, setImageDimensions] = useState({ width: 0, height: 0 })

  const isImage = documento.file_type?.startsWith('image/')
  const isPDF = documento.file_type === 'application/pdf'

  // Carica annotazioni esistenti
  useEffect(() => {
    loadAnnotations()
  }, [documento.id])

  const loadAnnotations = async () => {
    const { data } = await supabase
      .from('test_package_annotazioni')
      .select('*')
      .eq('documento_id', documento.id)
      .order('created_at')
    
    setAnnotations(data || [])
  }

  // Setup canvas quando l'immagine carica
  useEffect(() => {
    if (!isImage || !imageLoaded || !canvasRef.current) return
    
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    
    // Ridisegna annotazioni esistenti
    redrawAnnotations(ctx)
  }, [imageLoaded, annotations])

  const redrawAnnotations = (ctx) => {
    if (!ctx) return
    
    // Clear canvas
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height)
    
    // Ridisegna tutte le annotazioni
    annotations.forEach(ann => {
      if (ann.canvas_data?.paths) {
        ann.canvas_data.paths.forEach(path => {
          drawPath(ctx, path.points, path.color, path.brushSize)
        })
      }
    })
  }

  const drawPath = (ctx, points, strokeColor, strokeWidth) => {
    if (!points || points.length < 2) return
    
    ctx.beginPath()
    ctx.strokeStyle = strokeColor
    ctx.lineWidth = strokeWidth
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    
    ctx.moveTo(points[0].x, points[0].y)
    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(points[i].x, points[i].y)
    }
    ctx.stroke()
  }

  // Event handlers per disegno
  const getPointerPos = (e) => {
    const canvas = canvasRef.current
    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height
    
    // Supporto touch
    const clientX = e.touches ? e.touches[0].clientX : e.clientX
    const clientY = e.touches ? e.touches[0].clientY : e.clientY
    
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY
    }
  }

  const handlePointerDown = (e) => {
    if (!canEdit || tool === 'none') return
    e.preventDefault()
    
    setIsDrawing(true)
    const pos = getPointerPos(e)
    setCurrentPath([pos])
  }

  const handlePointerMove = (e) => {
    if (!isDrawing || !canvasRef.current) return
    e.preventDefault()
    
    const pos = getPointerPos(e)
    setCurrentPath(prev => [...prev, pos])
    
    // Disegna in tempo reale
    const ctx = canvasRef.current.getContext('2d')
    const prevPoint = currentPath[currentPath.length - 1] || pos
    
    ctx.beginPath()
    ctx.strokeStyle = tool === 'eraser' ? '#FFFFFF' : color
    ctx.lineWidth = tool === 'eraser' ? brushSize * 3 : brushSize
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.moveTo(prevPoint.x, prevPoint.y)
    ctx.lineTo(pos.x, pos.y)
    ctx.stroke()
  }

  const handlePointerUp = () => {
    if (!isDrawing) return
    
    setIsDrawing(false)
    
    if (currentPath.length > 1 && tool !== 'eraser') {
      // Salva path temporaneamente in state (salvataggio batch)
      setAnnotations(prev => [...prev, {
        id: `temp_${Date.now()}`,
        canvas_data: {
          paths: [{ points: currentPath, color, brushSize }]
        }
      }])
    }
    
    setCurrentPath([])
  }

  // Salva annotazioni su DB
  const handleSaveAnnotations = async () => {
    setSaving(true)
    try {
      // Elimina vecchie annotazioni
      await supabase
        .from('test_package_annotazioni')
        .delete()
        .eq('documento_id', documento.id)
      
      // Combina tutte le paths
      const allPaths = annotations.flatMap(ann => ann.canvas_data?.paths || [])
      
      if (allPaths.length > 0) {
        await supabase
          .from('test_package_annotazioni')
          .insert({
            documento_id: documento.id,
            tipo: 'drawing',
            canvas_data: { paths: allPaths }
          })
      }
      
      alert('✅ Annotazioni salvate!')
    } catch (error) {
      console.error('Errore salvataggio:', error)
      alert('Errore: ' + error.message)
    } finally {
      setSaving(false)
    }
  }

  // Clear canvas
  const handleClear = () => {
    if (!confirm('Eliminare tutte le annotazioni?')) return
    
    setAnnotations([])
    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d')
      ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height)
    }
  }

  // Handle image load
  const handleImageLoad = (e) => {
    const img = e.target
    setImageDimensions({ width: img.naturalWidth, height: img.naturalHeight })
    
    if (canvasRef.current) {
      canvasRef.current.width = img.naturalWidth
      canvasRef.current.height = img.naturalHeight
    }
    
    setImageLoaded(true)
  }

  return (
    <div className="fixed inset-0 bg-black/80 z-[70] flex flex-col">
      {/* Header */}
      <div className="bg-white p-4 flex items-center justify-between shadow-lg">
        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            ← Indietro
          </button>
          <h3 className="font-bold text-gray-800 truncate max-w-[200px] sm:max-w-none">
            {documento.nome}
          </h3>
        </div>
        
        <div className="flex items-center gap-2">
          <a
            href={documento.file_url}
            target="_blank"
            rel="noopener noreferrer"
            className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm hover:bg-gray-200"
          >
            ⬇️ Scarica
          </a>
          {canEdit && isImage && (
            <button
              onClick={handleSaveAnnotations}
              disabled={saving}
              className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50"
            >
              {saving ? '⏳' : '💾'} Salva
            </button>
          )}
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg text-xl"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Toolbar per annotazioni (solo immagini) */}
      {canEdit && isImage && (
        <div className="bg-gray-100 p-3 flex items-center gap-4 flex-wrap justify-center border-b">
          {/* Strumenti */}
          <div className="flex items-center gap-1 bg-white rounded-lg p-1 shadow-sm">
            <button
              onClick={() => setTool('pen')}
              className={`p-2 rounded-lg transition-colors ${tool === 'pen' ? 'bg-purple-100 text-purple-700' : 'hover:bg-gray-100'}`}
              title="Penna"
            >
              ✏️
            </button>
            <button
              onClick={() => setTool('eraser')}
              className={`p-2 rounded-lg transition-colors ${tool === 'eraser' ? 'bg-purple-100 text-purple-700' : 'hover:bg-gray-100'}`}
              title="Gomma"
            >
              🧹
            </button>
          </div>
          
          {/* Colori */}
          <div className="flex items-center gap-1 bg-white rounded-lg p-1 shadow-sm">
            {['#FF0000', '#0000FF', '#00FF00', '#FFFF00', '#000000', '#FF00FF'].map(c => (
              <button
                key={c}
                onClick={() => setColor(c)}
                className={`w-7 h-7 rounded-full border-2 transition-transform ${color === c ? 'scale-110 border-gray-800' : 'border-transparent'}`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
          
          {/* Dimensione */}
          <div className="flex items-center gap-2 bg-white rounded-lg px-3 py-1 shadow-sm">
            <span className="text-xs text-gray-500">Spessore:</span>
            <input
              type="range"
              min="1"
              max="10"
              value={brushSize}
              onChange={(e) => setBrushSize(parseInt(e.target.value))}
              className="w-20"
            />
            <span className="text-xs font-medium w-4">{brushSize}</span>
          </div>
          
          {/* Clear */}
          <button
            onClick={handleClear}
            className="px-3 py-2 bg-red-100 text-red-700 rounded-lg text-sm hover:bg-red-200"
          >
            🗑️ Pulisci
          </button>
        </div>
      )}

      {/* Content area */}
      <div 
        ref={containerRef}
        className="flex-1 overflow-auto bg-gray-900 flex items-center justify-center p-4"
      >
        {isImage ? (
          <div className="relative inline-block">
            <img
              src={documento.file_url}
              alt={documento.nome}
              onLoad={handleImageLoad}
              className="max-w-full max-h-[70vh] object-contain"
              style={{ touchAction: 'none' }}
            />
            {imageLoaded && canEdit && (
              <canvas
                ref={canvasRef}
                className="absolute top-0 left-0 w-full h-full"
                style={{ 
                  touchAction: 'none',
                  cursor: tool === 'pen' ? 'crosshair' : tool === 'eraser' ? 'cell' : 'default'
                }}
                onMouseDown={handlePointerDown}
                onMouseMove={handlePointerMove}
                onMouseUp={handlePointerUp}
                onMouseLeave={handlePointerUp}
                onTouchStart={handlePointerDown}
                onTouchMove={handlePointerMove}
                onTouchEnd={handlePointerUp}
              />
            )}
          </div>
        ) : isPDF ? (
          <iframe
            src={`${documento.file_url}#toolbar=1`}
            className="w-full h-full min-h-[70vh] bg-white rounded-lg"
            title={documento.nome}
          />
        ) : (
          <div className="bg-white rounded-xl p-8 text-center">
            <span className="text-6xl mb-4 block">📄</span>
            <p className="text-gray-600 mb-4">Anteprima non disponibile per questo tipo di file</p>
            <a
              href={documento.file_url}
              target="_blank"
              rel="noopener noreferrer"
              className="px-6 py-3 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 inline-block"
            >
              ⬇️ Scarica per visualizzare
            </a>
          </div>
        )}
      </div>

      {/* Info footer */}
      <div className="bg-white p-3 text-center text-sm text-gray-500 border-t">
        {isImage && canEdit && (
          <p>💡 Usa il dito o la penna per annotare direttamente sull'immagine</p>
        )}
        {isPDF && (
          <p>💡 Usa i controlli del PDF per navigare. Le annotazioni su PDF saranno disponibili a breve.</p>
        )}
      </div>
    </div>
  )
}
