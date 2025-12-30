import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'

export default function ImpostazioniPage() {
  const { progetto, isAtLeast } = useAuth()
  const [activeTab, setActiveTab] = useState('overview')

  const menuItems = [
    { id: 'overview', label: 'Panoramica', emoji: '📋', minRole: 'cm' },
    { id: 'progetto', label: 'Progetto', emoji: '🏗️', minRole: 'cm' },
    { id: 'persone', label: 'Persone', emoji: '👥', minRole: 'cm' },
    { id: 'ditte', label: 'Ditte', emoji: '🏢', minRole: 'admin' },
    { id: 'squadre', label: 'Squadre', emoji: '👷', minRole: 'cm' },
    { id: 'centriCosto', label: 'Centri Costo', emoji: '💰', minRole: 'cm' },
    { id: 'orari', label: 'Orari', emoji: '⏰', minRole: 'cm' },
  ].filter(item => isAtLeast(item.minRole))

  return (
    <div className="p-4 lg:p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">⚙️ Impostazioni</h1>
        <p className="text-gray-500">{progetto?.nome}</p>
      </div>

      <div className="grid lg:grid-cols-4 gap-6">
        <div className="hidden lg:block">
          <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
            <div className="p-4 border-b"><h3 className="font-semibold text-gray-700">Menu</h3></div>
            <nav className="p-2">
              {menuItems.map(item => (
                <button key={item.id} onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left ${activeTab === item.id ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-600 hover:bg-gray-50'}`}>
                  <span>{item.emoji}</span><span>{item.label}</span>
                </button>
              ))}
            </nav>
          </div>
        </div>

        <div className="lg:hidden">
          <div className="flex gap-2 overflow-x-auto pb-2">
            {menuItems.map(item => (
              <button key={item.id} onClick={() => setActiveTab(item.id)}
                className={`px-4 py-2 rounded-xl font-medium whitespace-nowrap ${activeTab === item.id ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 border'}`}>
                {item.emoji} {item.label}
              </button>
            ))}
          </div>
        </div>

        <div className="lg:col-span-3">
          {activeTab === 'overview' && <OverviewTab />}
          {activeTab === 'progetto' && <ProgettoTab progetto={progetto} />}
          {activeTab === 'persone' && <PlaceholderTab title="Anagrafica Persone" emoji="👥" />}
          {activeTab === 'ditte' && <PlaceholderTab title="Gestione Ditte" emoji="🏢" />}
          {activeTab === 'squadre' && <PlaceholderTab title="Gestione Squadre" emoji="👷" />}
          {activeTab === 'centriCosto' && <PlaceholderTab title="Centri di Costo" emoji="💰" />}
          {activeTab === 'orari' && <OrariTab />}
        </div>
      </div>
    </div>
  )
}

function OverviewTab() {
  const quickActions = [
    { label: 'Aggiungi Persona', emoji: '👤' },
    { label: 'Nuova Squadra', emoji: '👷' },
    { label: 'Centro di Costo', emoji: '💰' },
    { label: 'Gestione Orari', emoji: '⏰' },
  ]

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl p-6 shadow-sm border">
        <h2 className="text-xl font-bold text-gray-800 mb-4">📋 Panoramica Progetto</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-blue-50 rounded-xl p-4"><p className="text-2xl font-bold text-blue-700">24</p><p className="text-sm text-blue-600">Persone attive</p></div>
          <div className="bg-green-50 rounded-xl p-4"><p className="text-2xl font-bold text-green-700">5</p><p className="text-sm text-green-600">Squadre</p></div>
          <div className="bg-purple-50 rounded-xl p-4"><p className="text-2xl font-bold text-purple-700">12</p><p className="text-sm text-purple-600">Centri di costo</p></div>
          <div className="bg-orange-50 rounded-xl p-4"><p className="text-2xl font-bold text-orange-700">3</p><p className="text-sm text-orange-600">Ditte</p></div>
        </div>
      </div>

      <div className="bg-white rounded-xl p-6 shadow-sm border">
        <h3 className="font-semibold text-gray-700 mb-4">⚡ Azioni Rapide</h3>
        <div className="grid grid-cols-2 gap-3">
          {quickActions.map(action => (
            <button key={action.label} className="p-4 bg-gray-50 rounded-xl hover:bg-gray-100 text-left">
              <span className="text-2xl block mb-2">{action.emoji}</span>
              <span className="font-medium text-gray-700">{action.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

function ProgettoTab({ progetto }) {
  return (
    <div className="bg-white rounded-xl p-6 shadow-sm border">
      <h2 className="text-xl font-bold text-gray-800 mb-4">🏗️ Dettagli Progetto</h2>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-500 mb-1">Nome</label>
          <input type="text" defaultValue={progetto?.nome} className="w-full px-4 py-3 border rounded-xl" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-500 mb-1">Codice</label>
          <input type="text" defaultValue={progetto?.codice} className="w-full px-4 py-3 border rounded-xl" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-500 mb-1">Indirizzo</label>
          <input type="text" defaultValue={progetto?.indirizzo} className="w-full px-4 py-3 border rounded-xl" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-500 mb-1">Data Inizio</label>
            <input type="date" defaultValue={progetto?.data_inizio} className="w-full px-4 py-3 border rounded-xl" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-500 mb-1">Data Fine</label>
            <input type="date" defaultValue={progetto?.data_fine_prevista} className="w-full px-4 py-3 border rounded-xl" />
          </div>
        </div>
        <button className="px-6 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700">Salva Modifiche</button>
      </div>
    </div>
  )
}

function OrariTab() {
  return (
    <div className="bg-white rounded-xl p-6 shadow-sm border">
      <h2 className="text-xl font-bold text-gray-800 mb-4">⏰ Orari di Lavoro</h2>
      <div className="space-y-4">
        <div className="p-4 bg-gray-50 rounded-xl">
          <h3 className="font-medium text-gray-700 mb-2">Orario Standard</h3>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="text-sm text-gray-500">Entrata</label><input type="time" defaultValue="08:00" className="w-full px-3 py-2 border rounded-lg" /></div>
            <div><label className="text-sm text-gray-500">Uscita</label><input type="time" defaultValue="17:00" className="w-full px-3 py-2 border rounded-lg" /></div>
          </div>
        </div>
        <button className="px-6 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700">Salva</button>
      </div>
    </div>
  )
}

function PlaceholderTab({ title, emoji }) {
  return (
    <div className="bg-white rounded-xl p-6 shadow-sm border">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-gray-800">{emoji} {title}</h2>
        <button className="px-4 py-2 bg-blue-600 text-white rounded-xl font-medium">+ Aggiungi</button>
      </div>
      <p className="text-gray-500 text-center py-8">Funzionalità in arrivo...</p>
    </div>
  )
}
