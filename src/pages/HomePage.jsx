import { useAuth } from '../contexts/AuthContext'
import { Link } from 'react-router-dom'

export default function HomePage() {
  const { user, persona, assegnazione, progetto, ruolo, isAtLeast, signOut } = useAuth()

  const stats = [
    { label: 'Ore Mese', value: '168', icon: '⏱️', color: 'blue' },
    { label: 'Presenze', value: '22', icon: '✅', color: 'green' },
    { label: 'Assenze', value: '0', icon: '❌', color: 'red' },
    { label: 'Straordinari', value: '12', icon: '⚡', color: 'amber' },
  ]

  const quickActions = [
    { label: 'Check-in', emoji: '📍', href: '/checkin', color: 'bg-blue-500', show: true },
    { label: 'Calendario', emoji: '📅', href: '/calendario', color: 'bg-purple-500', show: true },
    { label: 'Team', emoji: '👥', href: '/team', color: 'bg-green-500', show: isAtLeast('foreman') },
    { label: 'Rapportino', emoji: '📝', href: '/rapportino', color: 'bg-orange-500', show: isAtLeast('foreman') },
    { label: 'Statistiche', emoji: '📊', href: '/statistiche', color: 'bg-indigo-500', show: isAtLeast('supervisor') },
    { label: 'Impostazioni', emoji: '⚙️', href: '/impostazioni', color: 'bg-gray-500', show: isAtLeast('cm') },
  ].filter(a => a.show)

  return (
    <div className="p-4 lg:p-8">
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-2xl p-6 lg:p-8 mb-6 shadow-lg">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-2xl lg:text-3xl font-bold">Ciao, {persona?.nome}! 👋</h2>
            <p className="text-blue-100 mt-1 lg:text-lg">
              {new Date().toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          </div>
          <button onClick={signOut} className="hidden lg:block mt-4 lg:mt-0 px-6 py-2 bg-white/20 hover:bg-white/30 rounded-xl">
            Esci
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {stats.map(stat => (
          <div key={stat.label} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-2">
              <span className="text-2xl">{stat.icon}</span>
            </div>
            <p className="text-2xl lg:text-3xl font-bold text-gray-800">{stat.value}</p>
            <p className="text-sm text-gray-500">{stat.label}</p>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl p-4 lg:p-6 shadow-sm border border-gray-100">
            <h3 className="font-semibold text-gray-700 mb-4">🚀 Azioni Rapide</h3>
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
              {quickActions.map(action => (
                <Link
                  key={action.href}
                  to={action.href}
                  className={`${action.color} text-white rounded-xl p-4 lg:p-6 hover:opacity-90 shadow-sm hover:shadow-md`}
                >
                  <span className="text-3xl lg:text-4xl block mb-2">{action.emoji}</span>
                  <span className="font-medium lg:text-lg">{action.label}</span>
                </Link>
              ))}
            </div>
          </div>
        </div>

        <div className="hidden lg:block">
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <h3 className="font-semibold text-gray-700 mb-4">📋 Info Profilo</h3>
            <div className="space-y-3">
              <div>
                <p className="text-xs text-gray-500">Email</p>
                <p className="font-medium text-gray-800 truncate">{user?.email}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Ruolo</p>
                <p className="font-medium text-gray-800 capitalize">{ruolo}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Progetto</p>
                <p className="font-medium text-gray-800">{progetto?.nome || 'N/A'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Ditta</p>
                <p className="font-medium text-gray-800">{assegnazione?.ditta?.nome || 'Committente'}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6 bg-white rounded-xl p-4 lg:p-6 shadow-sm border border-gray-100">
        <h3 className="font-semibold text-gray-700 mb-4">📜 Attività Recenti</h3>
        <div className="space-y-3">
          {[
            { time: 'Oggi 08:15', action: 'Check-in effettuato', icon: '✅' },
            { time: 'Ieri 17:30', action: 'Check-out effettuato', icon: '🚪' },
            { time: 'Ieri 08:00', action: 'Check-in effettuato', icon: '✅' },
          ].map((item, i) => (
            <div key={i} className="flex items-center gap-4 p-3 hover:bg-gray-50 rounded-lg">
              <span className="text-xl">{item.icon}</span>
              <div className="flex-1">
                <p className="text-gray-800">{item.action}</p>
                <p className="text-xs text-gray-500">{item.time}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
