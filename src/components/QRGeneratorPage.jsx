import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'

export default function QRGeneratorPage() {
  const { progetto, progettoId, isAtLeast } = useAuth()
  const [size, setSize] = useState(300)
  const [copied, setCopied] = useState(false)

  // URL per il QR
  const baseUrl = window.location.origin
  const qrUrl = `${baseUrl}/qr-checkin/${progettoId}`
  
  // QR generato tramite API gratuita (funziona sempre)
  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(qrUrl)}&color=1E40AF`

  // Copia URL
  const copyUrl = () => {
    navigator.clipboard.writeText(qrUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // Check permessi
  if (!isAtLeast || !isAtLeast('supervisor')) {
    return (
      <div className="p-6 text-center">
        <div className="text-6xl mb-4">🔒</div>
        <h1 className="text-xl font-bold text-gray-700">Accesso non autorizzato</h1>
        <p className="text-gray-500">Devi essere almeno Supervisor</p>
      </div>
    )
  }

  if (!progettoId) {
    return (
      <div className="p-6 text-center">
        <div className="text-6xl mb-4">📱</div>
        <h1 className="text-xl font-bold text-gray-700">Nessun progetto</h1>
        <p className="text-gray-500">Seleziona un progetto prima</p>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">📱 QR Code Check-in</h1>
        <p className="text-gray-500">Stampa questo QR per il check-in rapido</p>
      </div>

      {/* QR Card */}
      <div className="bg-white rounded-2xl shadow-sm border p-6 text-center mb-6">
        <p className="font-bold text-lg text-gray-800 mb-4">{progetto?.nome}</p>
        
        {/* QR Image */}
        <div className="inline-block p-4 bg-white rounded-xl shadow-lg border-2 border-blue-100 mb-4">
          <img 
            src={qrImageUrl} 
            alt="QR Code"
            width={size}
            height={size}
            className="block"
          />
        </div>

        {/* URL */}
        <div className="p-3 bg-gray-50 rounded-xl text-xs text-gray-500 break-all mb-4">
          {qrUrl}
        </div>

        {/* Buttons */}
        <div className="flex flex-col gap-3">
          <button
            onClick={() => window.print()}
            className="w-full py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700"
          >
            🖨️ Stampa
          </button>
          
          <a
            href={qrImageUrl}
            download={`QR-${progetto?.codice || 'checkin'}.png`}
            className="w-full py-3 bg-green-600 text-white rounded-xl font-semibold hover:bg-green-700 text-center"
          >
            💾 Scarica PNG
          </a>
          
          <button
            onClick={copyUrl}
            className={`w-full py-3 rounded-xl font-medium ${
              copied ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {copied ? '✅ Copiato!' : '📋 Copia Link'}
          </button>
        </div>
      </div>

      {/* Test Link */}
      <div className="bg-amber-50 rounded-xl p-4 border border-amber-200">
        <h3 className="font-semibold text-amber-800 mb-2">🧪 Testa il link</h3>
        <a
          href={qrUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 underline break-all"
        >
          {qrUrl}
        </a>
      </div>

      {/* Istruzioni */}
      <div className="mt-6 bg-blue-50 rounded-xl p-4 border border-blue-200">
        <h3 className="font-semibold text-blue-800 mb-2">💡 Come usare</h3>
        <ol className="text-sm text-blue-700 list-decimal list-inside space-y-1">
          <li>Stampa o scarica il QR</li>
          <li>Appendi all'ingresso del cantiere</li>
          <li>Gli operai inquadrano con il telefono</li>
          <li>Cercano il nome e fanno check-in</li>
        </ol>
      </div>
    </div>
  )
}
