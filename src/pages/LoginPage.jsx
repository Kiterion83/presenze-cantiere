import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { HardHat, Eye, EyeOff, Loader2, UserCog } from 'lucide-react'

// Ruoli disponibili per il testing
const RUOLI_TEST = [
  { value: 'admin', label: 'Admin', description: 'Accesso completo a tutto' },
  { value: 'cm', label: 'Construction Manager', description: 'Gestione progetto e team' },
  { value: 'supervisor', label: 'Supervisor', description: 'Supervisione squadre' },
  { value: 'foreman', label: 'Foreman', description: 'Gestione squadra e rapportini' },
  { value: 'helper', label: 'Helper', description: 'Solo check-in e visualizzazione' },
  { value: 'office', label: 'Office', description: 'Amministrazione e documenti' },
]

export default function LoginPage() {
  const { signIn } = useAuth()
  const [email, setEmail] = useState('giuseppe.pasquale@outlook.com')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [selectedRole, setSelectedRole] = useState('admin')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      // Salva il ruolo selezionato per il testing
      sessionStorage.setItem('test_role_override', selectedRole)
      await signIn(email, password)
    } catch (err) {
      console.error('Login error:', err)
      
      if (err.message?.includes('Invalid login credentials')) {
        setError('Email o password non corretti')
      } else if (err.message?.includes('Email not confirmed')) {
        setError('Email non confermata. Controlla la tua casella di posta.')
      } else {
        setError(err.message || 'Errore durante il login')
      }
    } finally {
      setLoading(false)
    }
  }

  const selectedRoleInfo = RUOLI_TEST.find(r => r.value === selectedRole)

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-600 to-primary-800 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-white rounded-2xl shadow-lg mb-4">
            <HardHat className="w-12 h-12 text-primary-600" />
          </div>
          <h1 className="text-2xl font-bold text-white">Presenze Cantiere</h1>
          <p className="text-primary-200 mt-1">Gestione presenze e rapportini</p>
        </div>

        {/* Login Card */}
        <div className="bg-white rounded-2xl shadow-xl p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-6 text-center">
            Accedi
          </h2>

          {error && (
            <div className="bg-danger-50 border border-danger-200 text-danger-600 px-4 py-3 rounded-lg mb-4 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Selector Ruolo per Testing */}
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <UserCog className="w-5 h-5 text-amber-600" />
                <span className="text-sm font-medium text-amber-800">
                  Modalità Test - Seleziona Ruolo
                </span>
              </div>
              <select
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value)}
                className="w-full px-3 py-2 border border-amber-300 rounded-lg bg-white text-gray-800 focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
              >
                {RUOLI_TEST.map((ruolo) => (
                  <option key={ruolo.value} value={ruolo.value}>
                    {ruolo.label}
                  </option>
                ))}
              </select>
              <p className="text-xs text-amber-600 mt-2">
                {selectedRoleInfo?.description}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input"
                placeholder="nome@esempio.com"
                required
                autoComplete="email"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input pr-10"
                  placeholder="••••••••"
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full py-3 text-base"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Accesso in corso...
                </span>
              ) : (
                `Accedi come ${selectedRoleInfo?.label}`
              )}
            </button>
          </form>
        </div>

        {/* Footer */}
        <p className="text-center text-primary-200 text-sm mt-6">
          © 2024 Presenze Cantiere v2.0
        </p>

        {/* Nota Test Mode */}
        <div className="mt-4 text-center">
          <span className="inline-flex items-center gap-1 px-3 py-1 bg-amber-500/20 text-amber-200 text-xs rounded-full">
            <UserCog className="w-3 h-3" />
            Test Mode Attivo
          </span>
        </div>
      </div>
    </div>
  )
}
