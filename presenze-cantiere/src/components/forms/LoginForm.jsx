/**
 * Componente LoginForm
 * Form login con consenso privacy e GPS
 */

import { useState } from 'react'
import { MapPin, Shield, Eye, EyeOff, AlertCircle } from 'lucide-react'
import Button from '../ui/Button'
import Select from '../ui/Select'
import { RUOLI } from '../../lib/constants'
import { isGPSSupported, richiediPermessoGPS } from '../../lib/gps'

export default function LoginForm({ onLogin }) {
  const [step, setStep] = useState('consenso') // 'consenso' | 'login'
  const [consensoGPS, setConsensoGPS] = useState(false)
  const [consensoPrivacy, setConsensoPrivacy] = useState(false)
  const [nome, setNome] = useState('')
  const [ruolo, setRuolo] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [errore, setErrore] = useState('')

  // Verifica GPS supportato
  const gpsSupported = isGPSSupported()

  // Handler consenso
  const handleAccettaConsenso = async () => {
    if (!consensoGPS || !consensoPrivacy) {
      setErrore('Devi accettare entrambi i consensi per procedere')
      return
    }

    setLoading(true)
    setErrore('')

    // Richiedi permesso GPS
    const permesso = await richiediPermessoGPS()
    
    if (permesso.state === 'denied') {
      setErrore('Permesso GPS negato. Abilitalo nelle impostazioni del browser.')
      setLoading(false)
      return
    }

    setLoading(false)
    setStep('login')
  }

  // Handler login
  const handleLogin = async (e) => {
    e.preventDefault()
    
    if (!nome.trim()) {
      setErrore('Inserisci il tuo nome')
      return
    }
    if (!ruolo) {
      setErrore('Seleziona il tuo ruolo')
      return
    }

    setLoading(true)
    setErrore('')

    // Simula login (qui andrebbe chiamata a Supabase)
    setTimeout(() => {
      onLogin({
        id: Date.now(),
        nome: nome.trim(),
        ruolo: ruolo,
        email: `${nome.toLowerCase().replace(/\s/g, '.')}@cantiere.it`,
      })
      setLoading(false)
    }, 500)
  }

  // Render step consenso
  if (step === 'consenso') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-900 to-blue-700 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Shield className="w-8 h-8 text-blue-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Consenso Privacy</h1>
            <p className="text-gray-500 mt-2">
              Prima di procedere, leggi e accetta i consensi richiesti
            </p>
          </div>

          {/* Errore */}
          {errore && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">{errore}</p>
            </div>
          )}

          {/* GPS Warning */}
          {!gpsSupported && (
            <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
              <p className="text-sm text-amber-700">
                ⚠️ Il tuo browser non supporta la geolocalizzazione. 
                Alcune funzionalità potrebbero non essere disponibili.
              </p>
            </div>
          )}

          {/* Consensi */}
          <div className="space-y-4 mb-8">
            {/* Consenso GPS */}
            <label className="flex items-start gap-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors">
              <input
                type="checkbox"
                checked={consensoGPS}
                onChange={(e) => setConsensoGPS(e.target.checked)}
                className="w-5 h-5 mt-0.5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <MapPin className="w-4 h-4 text-blue-600" />
                  <span className="font-medium text-gray-900">Geolocalizzazione</span>
                </div>
                <p className="text-sm text-gray-500">
                  Acconsento all'utilizzo della mia posizione GPS per la registrazione 
                  delle presenze in cantiere. La posizione sarà rilevata solo al momento 
                  del check-in/check-out.
                </p>
              </div>
            </label>

            {/* Consenso Privacy */}
            <label className="flex items-start gap-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors">
              <input
                type="checkbox"
                checked={consensoPrivacy}
                onChange={(e) => setConsensoPrivacy(e.target.checked)}
                className="w-5 h-5 mt-0.5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <Shield className="w-4 h-4 text-blue-600" />
                  <span className="font-medium text-gray-900">Privacy e Dati</span>
                </div>
                <p className="text-sm text-gray-500">
                  Acconsento al trattamento dei miei dati personali secondo la normativa 
                  GDPR. I dati saranno utilizzati esclusivamente per la gestione delle 
                  presenze lavorative.
                </p>
              </div>
            </label>
          </div>

          {/* Bottone */}
          <Button
            onClick={handleAccettaConsenso}
            loading={loading}
            fullWidth
            size="lg"
            disabled={!consensoGPS || !consensoPrivacy}
          >
            Accetta e Continua
          </Button>

          {/* Footer */}
          <p className="text-xs text-gray-400 text-center mt-6">
            I tuoi dati sono protetti e trattati secondo la normativa vigente.
          </p>
        </div>
      </div>
    )
  }

  // Render step login
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 to-blue-700 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl font-bold text-white">PC</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Presenze Cantiere</h1>
          <p className="text-gray-500 mt-2">Centrale di Compressione</p>
        </div>

        {/* Errore */}
        {errore && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-700">{errore}</p>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleLogin} className="space-y-6">
          {/* Nome */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nome e Cognome
            </label>
            <input
              type="text"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Es: Mario Rossi"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Ruolo */}
          <Select
            label="Ruolo"
            value={ruolo}
            onChange={setRuolo}
            placeholder="Seleziona ruolo..."
            options={[
              { value: RUOLI.FOREMAN, label: 'Foreman (Capo Squadra)' },
              { value: RUOLI.SUPERVISOR, label: 'Supervisor (Supervisore)' },
            ]}
          />

          {/* Submit */}
          <Button
            type="submit"
            loading={loading}
            fullWidth
            size="lg"
          >
            Accedi
          </Button>
        </form>

        {/* Torna indietro */}
        <button
          onClick={() => setStep('consenso')}
          className="w-full mt-4 text-sm text-gray-500 hover:text-gray-700"
        >
          ← Torna ai consensi
        </button>
      </div>
    </div>
  )
}
