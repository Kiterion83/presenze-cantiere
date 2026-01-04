import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'

export default function QRGeneratorPage() {
  const { progetto, progettoId, isAtLeast } = useAuth()
  const [size, setSize] = useState(256)
  const [showInstructions, setShowInstructions] = useState(true)
  const [copied, setCopied] = useState(false)

  // URL per il QR
  const baseUrl = window.location.origin
  const qrUrl = `${baseUrl}/qr-checkin/${progettoId}`
  
  // URL per generare QR tramite API gratuita
  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(qrUrl)}&color=1E40AF&bgcolor=FFFFFF`

  // Scarica QR come immagine
  const downloadQR = async () => {
    try {
      const response = await fetch(qrImageUrl)
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.download = `QR-Checkin-${progetto?.codice || 'progetto'}.png`
      link.href = url
      link.click()
      window.URL.revokeObjectURL(url)
    } catch (e) {
      // Fallback: apri in nuova tab
      window.open(qrImageUrl, '_blank')
    }
  }

  // Stampa QR
  const printQR = () => {
    const printWindow = window.open('', '_blank')
    if (!printWindow) {
      alert('Abilita i popup per stampare')
      return
    }
    
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>QR Code Check-in - ${progetto?.nome}</title>
          <style>
            @page { size: A4; margin: 20mm; }
            body { 
              font-family: Arial, sans-serif; 
              text-align: center; 
              padding: 40px;
            }
            .container {
              max-width: 500px;
              margin: 0 auto;
              border: 3px solid #3B82F6;
              border-radius: 20px;
              padding: 40px;
            }
            h1 { 
              color: #1E40AF; 
              margin-bottom: 10px;
              font-size: 28px;
            }
            .project-name {
              color: #3B82F6;
              font-size: 22px;
              margin-bottom: 30px;
            }
            .qr-container {
              background: white;
              padding: 20px;
              display: inline-block;
              border-radius: 16px;
              box-shadow: 0 4px 20px rgba(0,0,0,0.1);
            }
            .qr-container img {
              display: block;
            }
            .instructions {
              margin-top: 30px;
              text-align: left;
              background: #EFF6FF;
              padding: 20px;
              border-radius: 12px;
            }
            .instructions h3 {
              color: #1E40AF;
              margin-bottom: 15px;
            }
            .instructions ol {
              margin: 0;
              padding-left: 20px;
              color: #374151;
            }
            .instructions li {
              margin-bottom: 8px;
            }
            .footer {
              margin-top: 30px;
              color: #6B7280;
              font-size: 12px;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>📍 CHECK-IN CANTIERE</h1>
            <p class="project-name">${progetto?.nome || 'Progetto'}</p>
            
            <div class="qr-container">
              <img src="${qrImageUrl}" alt="QR Code" width="${size}" height="${size}" />
            </div>
            
            ${showInstructions ? `
            <div class="instructions">
              <h3>📱 Come fare il Check-in:</h3>
              <ol>
                <li>Apri la fotocamera del telefono</li>
                <li>Inquadra il QR code</li>
                <li>Tocca il link che appare</li>
                <li>Cerca il tuo nome e conferma</li>
              </ol>
            </div>
            ` : ''}
            
            <p class="footer">
              ${progetto?.codice || ''} ${progetto?.indirizzo ? '• ' + progetto.indirizzo : ''}
            </p>
          </div>
        </body>
      </html>
    `)
    
    printWindow.document.close()
    
    // Aspetta che l'immagine si carichi prima di stampare
    const img = printWindow.document.querySelector('img')
    if (img) {
      img.onload = () => {
        printWindow.focus()
        printWindow.print()
      }
      // Fallback se l'immagine è già cached
      if (img.complete) {
        setTimeout(() => {
          printWindow.focus()
          printWindow.print()
        }, 500)
      }
    }
  }

  // Copia URL
  const copyUrl = async () => {
    try {
      await navigator.clipboard.writeText(qrUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (e) {
      // Fallback per browser vecchi
      const textArea = document.createElement('textarea')
      textArea.value = qrUrl
      document.body.appendChild(textArea)
      textArea.select()
      document.execCommand('copy')
      document.body.removeChild(textArea)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  if (!isAtLeast('supervisor')) {
    return (
      <div className="p-6 text-center">
        <div className="text-6xl mb-4">🔒</div>
        <h1 className="text-xl font-bold text-gray-700">Accesso non autorizzato</h1>
        <p className="text-gray-500">Devi essere almeno Supervisor per generare QR code</p>
      </div>
    )
  }

  if (!progettoId) {
    return (
      <div className="p-6 text-center">
        <div className="text-6xl mb-4">📱</div>
        <h1 className="text-xl font-bold text-gray-700">Nessun progetto selezionato</h1>
        <p className="text-gray-500">Seleziona un progetto per generare il QR code</p>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
          📱 Genera QR Code Check-in
        </h1>
        <p className="text-gray-500">Stampa o scarica il QR code per il check-in rapido in cantiere</p>
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        {/* Preview QR */}
        <div className="bg-white rounded-2xl shadow-sm border p-6">
          <h2 className="font-semibold text-gray-700 mb-4">Anteprima</h2>
          
          <div className="flex flex-col items-center">
            {/* QR Code */}
            <div className="bg-white p-6 rounded-2xl shadow-lg border-2 border-blue-100 mb-4">
              <img 
                src={qrImageUrl} 
                alt="QR Code Check-in"
                width={size}
                height={size}
                className="block"
              />
            </div>

            {/* Info progetto */}
            <div className="text-center mb-4">
              <p className="font-bold text-lg text-gray-800">{progetto?.nome}</p>
              <p className="text-sm text-gray-500">{progetto?.codice}</p>
            </div>

            {/* URL */}
            <div className="w-full p-3 bg-gray-50 rounded-xl text-xs text-gray-500 break-all text-center">
              {qrUrl}
            </div>
          </div>
        </div>

        {/* Controlli */}
        <div className="space-y-6">
          {/* Dimensione */}
          <div className="bg-white rounded-2xl shadow-sm border p-6">
            <h2 className="font-semibold text-gray-700 mb-4">📐 Dimensione QR</h2>
            <div className="flex flex-wrap gap-2">
              {[150, 200, 256, 300, 400].map(s => (
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

          {/* Opzioni stampa */}
          <div className="bg-white rounded-2xl shadow-sm border p-6">
            <h2 className="font-semibold text-gray-700 mb-4">🖨️ Opzioni Stampa</h2>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={showInstructions}
                onChange={(e) => setShowInstructions(e.target.checked)}
                className="w-5 h-5 rounded border-gray-300 text-blue-600"
              />
              <span className="text-gray-700">Includi istruzioni per l'uso</span>
            </label>
          </div>

          {/* Azioni */}
          <div className="bg-white rounded-2xl shadow-sm border p-6">
            <h2 className="font-semibold text-gray-700 mb-4">⚡ Azioni</h2>
            <div className="space-y-3">
              <button
                onClick={printQR}
                className="w-full py-4 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
              >
                🖨️ Stampa QR Code
              </button>
              <button
                onClick={downloadQR}
                className="w-full py-4 bg-green-600 text-white rounded-xl font-semibold hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
              >
                💾 Scarica PNG
              </button>
              <button
                onClick={copyUrl}
                className={`w-full py-3 rounded-xl font-medium transition-colors flex items-center justify-center gap-2 ${
                  copied 
                    ? 'bg-green-100 text-green-700' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {copied ? '✅ Copiato!' : '📋 Copia Link'}
              </button>
            </div>
          </div>

          {/* Istruzioni */}
          <div className="bg-blue-50 rounded-2xl p-6 border border-blue-100">
            <h3 className="font-semibold text-blue-800 mb-3">💡 Come usare</h3>
            <ol className="text-sm text-blue-700 space-y-2 list-decimal list-inside">
              <li>Stampa il QR code in formato A4</li>
              <li>Posizionalo all'ingresso del cantiere</li>
              <li>Gli operai inquadrano con il telefono</li>
              <li>Cercano il loro nome e fanno check-in</li>
              <li>Se sono nuovi, si registrano al volo</li>
            </ol>
          </div>

          {/* Test Link */}
          <div className="bg-amber-50 rounded-2xl p-6 border border-amber-100">
            <h3 className="font-semibold text-amber-800 mb-3">🧪 Prova il Link</h3>
            <p className="text-sm text-amber-700 mb-3">
              Clicca per vedere come appare la pagina di check-in:
            </p>
            <a
              href={qrUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 bg-amber-100 text-amber-800 rounded-xl text-sm font-medium hover:bg-amber-200 transition-colors"
            >
              🔗 Apri pagina Check-in →
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
