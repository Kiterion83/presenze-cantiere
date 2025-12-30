import { useEffect, useRef, useState } from 'react'

export default function QRScanner({ onScan, onClose }) {
  const videoRef = useRef(null)
  const [error, setError] = useState(null)
  const [scanning, setScanning] = useState(true)
  const streamRef = useRef(null)

  useEffect(() => {
    startCamera()
    return () => stopCamera()
  }, [])

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
      }
      // Inizia scansione
      scanQRCode()
    } catch (err) {
      console.error('Camera error:', err)
      setError('Impossibile accedere alla fotocamera')
    }
  }

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
    }
  }

  const scanQRCode = () => {
    if (!scanning) return
    
    const video = videoRef.current
    if (!video || video.readyState !== video.HAVE_ENOUGH_DATA) {
      requestAnimationFrame(scanQRCode)
      return
    }

    // Usa BarcodeDetector API se disponibile
    if ('BarcodeDetector' in window) {
      const barcodeDetector = new BarcodeDetector({ formats: ['qr_code'] })
      
      const checkForQR = async () => {
        if (!scanning) return
        try {
          const barcodes = await barcodeDetector.detect(video)
          if (barcodes.length > 0) {
            setScanning(false)
            stopCamera()
            onScan(barcodes[0].rawValue)
            return
          }
        } catch (err) {
          console.error('Scan error:', err)
        }
        if (scanning) {
          requestAnimationFrame(checkForQR)
        }
      }
      checkForQR()
    } else {
      // Fallback: input manuale
      setError('Scanner QR non supportato su questo browser. Inserisci il codice manualmente.')
    }
  }

  const [manualCode, setManualCode] = useState('')

  const handleManualSubmit = () => {
    if (manualCode.trim()) {
      stopCamera()
      onScan(manualCode.trim())
    }
  }

  return (
    <div className="fixed inset-0 bg-black/90 flex flex-col z-50">
      {/* Header */}
      <div className="p-4 flex items-center justify-between text-white">
        <h2 className="text-lg font-semibold">📷 Scansiona QR Code</h2>
        <button onClick={() => { stopCamera(); onClose() }} className="p-2 hover:bg-white/20 rounded-lg">
          ✕
        </button>
      </div>

      {/* Video */}
      <div className="flex-1 flex items-center justify-center p-4">
        {error ? (
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full">
            <p className="text-red-600 mb-4">{error}</p>
            <div className="space-y-3">
              <input
                type="text"
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value.toUpperCase())}
                placeholder="Inserisci codice QR"
                className="w-full px-4 py-3 border rounded-xl text-center font-mono text-lg"
              />
              <button
                onClick={handleManualSubmit}
                disabled={!manualCode.trim()}
                className="w-full px-4 py-3 bg-blue-600 text-white rounded-xl font-medium disabled:bg-gray-300"
              >
                Conferma
              </button>
            </div>
          </div>
        ) : (
          <div className="relative w-full max-w-sm aspect-square">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover rounded-2xl"
            />
            {/* Overlay mirino */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-48 h-48 border-2 border-white rounded-xl relative">
                <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-blue-500 rounded-tl-lg" />
                <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-blue-500 rounded-tr-lg" />
                <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-blue-500 rounded-bl-lg" />
                <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-blue-500 rounded-br-lg" />
              </div>
            </div>
            {/* Linea scansione animata */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-48 h-48 overflow-hidden">
                <div className="w-full h-1 bg-blue-500 animate-scan" />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-4 text-center text-white/70 text-sm">
        Inquadra il QR Code del punto di timbratura
      </div>

      <style>{`
        @keyframes scan {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(192px); }
        }
        .animate-scan {
          animation: scan 2s ease-in-out infinite;
        }
      `}</style>
    </div>
  )
}
