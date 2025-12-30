import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'

export default function LoginPage() {
  const [email, setEmail] = useState('giuseppe.pasquale@outlook.com')
  const [password, setPassword] = useState('')
  const [testRole, setTestRole] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { signIn } = useAuth()

  const roles = [
    { value: '', label: '-- Usa ruolo reale dal DB --' },
    { value: 'admin', label: 'Admin - Accesso completo' },
    { value: 'cm', label: 'Construction Manager' },
    { value: 'supervisor', label: 'Supervisor' },
    { value: 'foreman', label: 'Foreman (Caposquadra)' },
    { value: 'office', label: 'Office (Impiegato)' },
    { value: 'helper', label: 'Helper (Operaio)' },
  ]

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    
    try {
      // Salva ruolo test in sessionStorage prima del login
      if (testRole) {
        sessionStorage.setItem('test_role_override', testRole)
      } else {
        sessionStorage.removeItem('test_role_override')
      }
      
      await signIn(email, password)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-blue-100 p-4">
      <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">🏗️</div>
          <h1 className="text-2xl font-bold text-gray-800">Presenze Cantiere</h1>
          <p className="text-gray-500 text-sm mt-1">Gestione presenze e rapportini</p>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
              placeholder="email@esempio.com"
              required
            />
          </div>
          
          {/* Password */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
              placeholder="••••••••"
              required
            />
          </div>

          {/* Test Role Selector */}
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
            <label className="block text-sm font-medium text-amber-800 mb-2">
              🧪 Modalità Test - Simula ruolo
            </label>
            <select
              value={testRole}
              onChange={(e) => setTestRole(e.target.value)}
              className="w-full px-4 py-3 border border-amber-300 rounded-xl bg-white focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
            >
              {roles.map(role => (
                <option key={role.value} value={role.value}>
                  {role.label}
                </option>
              ))}
            </select>
            <p className="text-xs text-amber-600 mt-2">
              Seleziona un ruolo per vedere l'app come quel tipo di utente
            </p>
          </div>

          {/* Error */}
          {error && (
            <div className="bg-red-50 text-red-600 p-4 rounded-xl text-sm flex items-center gap-2">
              <span>⚠️</span>
              {error}
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 disabled:bg-blue-300 transition-all shadow-lg shadow-blue-200"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Accesso in corso...
              </span>
            ) : 'Accedi'}
          </button>
        </form>
      </div>
    </div>
  )
}
