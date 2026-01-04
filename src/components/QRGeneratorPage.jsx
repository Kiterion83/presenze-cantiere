import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'

export default function QRGeneratorPage() {
  const { progetto, progettoId } = useAuth()
  const [size, setSize] = useState(300)
  const [copied, setCopied] = useState(false)
  const [aree, setAree] = useState([])
  const [selectedArea, setSelectedArea] = useState(null)
  const [loading, setLoading] = useState(true)

  // Carica le aree/gate del progetto
  useEffect(() => {
    if (progettoId) {
      loadAree()
    }
  }, [progettoId])

  const loadAree = async () => {
    try {
      // Prova prima qr_codes
      const { data: qrCodes, error: qrErr } = await supabase
        .from('qr_codes')
        .select('*')
        .eq('progetto_id', progettoId)
        .order('nome')

      if (!qrErr && qrCodes && qrCodes.length > 0) {
        setAree(qrCodes.map(qr => ({
          id: qr.id,
          nome: qr.nome || qr.descrizione || qr.codice,
          gate: qr.gate || qr.posizione,
          codice: qr.codice
        })))
      } else {
        // Fallback: prova zone_gps
        const { data: zone, error: zoneErr } = await supabase
          .from('zone_gps')
          .select('*')
          .eq('progetto_id', progettoId)
          .order('nome')

        if (!zoneErr && zone && zone.length > 0) {
          setAree(zone.map(z => ({
            id: z.id,
            nome: z.nome,
            gate: z.gate || z.descrizione,
            codice: z.codice
          })))
        }
      }
    } catch (e) {
      console.error('Errore caricamento aree:', e)
    } finally {
      setLoading(false)
    }
  }

  // Genera URL per il QR
  const baseUrl = window.location.origin
  const qrUrl = selectedArea 
    ? `${baseUrl}/qr-checkin/${progettoId}?area=${selectedArea.id}`
    : `${baseUrl}/qr-checkin/${progettoId}`
  
  // QR generato tramite API gratuita
  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(qrUrl)}&color=1E40AF`

  // Copia URL
  const copyUrl = () => {
    navigator.clipboard.writeText(qrUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // Stampa con layout A4
  const printQR = () => {
    const areaName = selectedArea ? selectedArea.nome : 'Ingresso Principale'
    const gateName = selectedArea?.gate || ''
    
    const printWindow = window.open('', '_blank')
    if (!printWindow) {
      alert('Abilita i popup per stampare')
      return
    }
    
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>QR Check-in - ${progetto?.nome}</title>
          <style>
            @page { size: A4; margin: 15mm; }
            * { box-sizing: border-box; margin: 0; padding: 0; }
            body { 
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              display: flex;
              justify-content: center;
              align-items: center;
              min-height: 100vh;
              background: #f5f5f5;
              padding: 20px;
            }
            .card {
              background: white;
              border-radius: 24px;
              padding: 40px;
              max-width: 400px;
              width: 100%;
              box-shadow: 0 4px 24px rgba(0,0,0,0.1);
              text-align: center;
            }
            .icon { font-size: 32px; margin-bottom: 8px; }
            h1 { 
              font-size: 28px; 
              font-weight: 700;
              color: #1f2937;
              margin-bottom: 4px;
            }
            .gate {
              color: #9ca3af;
              font-size: 16px;
              margin-bottom: 24px;
            }
            .qr-container {
              background: white;
              padding: 16px;
              border-radius: 16px;
              display: inline-block;
              margin-bottom: 20px;
            }
            .qr-container img {
              display: block;
            }
            .code-box {
              background: #f3f4f6;
              padding: 12px 24px;
              border-radius: 12px;
              font-family: monospace;
              font-size: 18px;
              color: #374151;
              margin-bottom: 16px;
            }
            .project {
              color: #6b7280;
              font-size: 14px;
            }
            .instructions {
              margin-top: 24px;
              padding: 16px;
              background: #ecfdf5;
              border-radius: 12px;
              text-align: left;
            }
            .instructions h3 {
              color: #059669;
              font-size: 14px;
              margin-bottom: 8px;
            }
            .instructions ol {
              color: #047857;
              font-size: 13px;
              padding-left: 20px;
            }
            .instructions li { margin-bottom: 4px; }
          </style>
        </head>
        <body>
          <div class="card">
            <div class="icon">📍</div>
            <h1>${areaName}</h1>
            <div class="gate">${gateName}</div>
            
            <div class="qr-container">
              <img src="${qrImageUrl}" alt="QR Code" width="${size}" height="${size}" />
            </div>
            
            <div class="code-box">
              ${selectedArea?.codice || 'QR-MAIN'}
            </div>
            
            <div class="project">${progetto?.nome || 'Progetto'}</div>
            
            <div class="instructions">
              <h3>Come fare Check-in:</h3>
              <ol>
                <li>Apri la fotocamera del telefono</li>
                <li>Inquadra il QR code</li>
                <li>Cerca il tuo nome e conferma</li>
              </ol>
            </div>
          </div>
        </body>
      </html>
    `)
    
    printWindow.document.close()
    
    setTimeout(() => {
      printWindow.focus()
      printWindow.print()
    }, 500)
  }

  if (!progettoId) {
    return (
      <div className="p-6 text-center">
        <div className="text-6xl mb-4">!</div>
        <h1 className="text-xl font-bold text-gray-700">Nessun progetto</h1>
        <p className="text-gray-500">Seleziona un progetto prima</p>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">QR Code Check-in</h1>
        <p className="text-gray-500">Genera e stampa QR code per gli ingressi del cantiere</p>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Selezione Area */}
        <div className="space-y-6">
          {/* Card Selezione */}
          <div className="bg-white rounded-2xl shadow-sm border p-6">
            <h2 className="font-semibold text-gray-700 mb-4">Seleziona Ingresso</h2>
            
            {loading ? (
              <div className="text-center py-4 text-gray-500">Caricamento aree...</div>
            ) : (
              <div className="space-y-2">
                {/* Opzione Ingresso Principale */}
                <button
                  onClick={() => setSelectedArea(null)}
                  className={`w-full p-4 rounded-xl border-2 text-left transition-all ${
                    selectedArea === null
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      selectedArea === null ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-500'
                    }`}>
                      <span className="text-xl">🏗️</span>
                    </div>
                    <div>
                      <p className="font-medium text-gray-800">Ingresso Principale</p>
                      <p className="text-sm text-gray-500">QR generico per tutto il cantiere</p>
                    </div>
                  </div>
                </button>

                {/* Aree specifiche */}
                {aree.map(area => (
                  <button
                    key={area.id}
                    onClick={() => setSelectedArea(area)}
                    className={`w-full p-4 rounded-xl border-2 text-left transition-all ${
                      selectedArea?.id === area.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        selectedArea?.id === area.id ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-500'
                      }`}>
                        <span className="text-xl">📍</span>
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-gray-800">{area.nome}</p>
                        {area.gate && <p className="text-sm text-gray-500">{area.gate}</p>}
                      </div>
                      {area.codice && (
                        <span className="text-xs font-mono bg-gray-100 px-2 py-1 rounded">
                          {area.codice}
                        </span>
                      )}
                    </div>
                  </button>
                ))}

                {aree.length === 0 && !loading && (
                  <div className="text-center py-4 text-gray-500 text-sm">
                    Nessuna area configurata. Usa l'ingresso principale o configura le aree nelle impostazioni.
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Dimensione */}
          <div className="bg-white rounded-2xl shadow-sm border p-6">
            <h2 className="font-semibold text-gray-700 mb-4">Dimensione QR</h2>
            <div className="flex flex-wrap gap-2">
              {[200, 256, 300, 400].map(s => (
                <button
                  key={s}
                  onClick={() => setSize(s)}
                  className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                    size === s 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {s}px
                </button>
              ))}
            </div>
          </div>

          {/* Istruzioni */}
          <div className="bg-emerald-50 rounded-2xl p-6 border border-emerald-100">
            <h3 className="font-semibold text-emerald-800 mb-3">Come usare</h3>
            <ol className="text-sm text-emerald-700 list-decimal list-inside space-y-1">
              <li>Seleziona l'ingresso/area</li>
              <li>Stampa il QR in formato A4</li>
              <li>Appendi all'ingresso del cantiere</li>
              <li>Gli operai inquadrano e fanno check-in</li>
            </ol>
          </div>
        </div>

        {/* Preview QR */}
        <div className="bg-white rounded-2xl shadow-sm border p-6">
          <h2 className="font-semibold text-gray-700 mb-4">Anteprima</h2>
          
          <div className="flex flex-col items-center">
            {/* Header area */}
            <div className="text-center mb-4">
              <div className="text-3xl mb-2">📍</div>
              <p className="font-bold text-xl text-gray-800">
                {selectedArea ? selectedArea.nome : 'Ingresso Principale'}
              </p>
              {selectedArea?.gate && (
                <p className="text-gray-500">{selectedArea.gate}</p>
              )}
            </div>

            {/* QR Code */}
            <div className="bg-white p-4 rounded-2xl shadow-lg border-2 border-blue-100 mb-4">
              <img 
                src={qrImageUrl} 
                alt="QR Code"
                width={size}
                height={size}
                className="block"
              />
            </div>

            {/* Codice */}
            <div className="bg-gray-100 px-6 py-3 rounded-xl font-mono text-gray-700 mb-2">
              {selectedArea?.codice || 'QR-MAIN'}
            </div>

            {/* Progetto */}
            <p className="text-sm text-gray-500 mb-6">{progetto?.nome}</p>

            {/* URL */}
            <div className="w-full p-3 bg-gray-50 rounded-xl text-xs text-gray-500 break-all text-center mb-6">
              {qrUrl}
            </div>

            {/* Buttons */}
            <div className="w-full space-y-3">
              <button
                onClick={printQR}
                className="w-full py-4 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-colors"
              >
                Stampa A4
              </button>
              
              <a
                href={qrImageUrl}
                download={`QR-${selectedArea?.codice || 'MAIN'}-${progetto?.codice || 'checkin'}.png`}
                className="block w-full py-4 bg-green-600 text-white rounded-xl font-semibold hover:bg-green-700 text-center transition-colors"
              >
                Scarica PNG
              </a>
              
              <button
                onClick={copyUrl}
                className={`w-full py-3 rounded-xl font-medium transition-colors ${
                  copied ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {copied ? 'Copiato!' : 'Copia Link'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Test Link */}
      <div className="mt-6 bg-amber-50 rounded-xl p-4 border border-amber-200">
        <h3 className="font-semibold text-amber-800 mb-2">Testa il link</h3>
        <a
          href={qrUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 underline break-all"
        >
          {qrUrl}
        </a>
      </div>
    </div>
  )
}
