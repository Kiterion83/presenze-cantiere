import { useState, useEffect, useRef } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useI18n, LanguageSwitch } from '../contexts/I18nContext'

export default function Layout({ children }) {
  const location = useLocation()
  const { persona, progetto, assegnazioni, assegnazione, ruolo, testRoleOverride, setTestRole, signOut, isAtLeast, canAccess, cambiaProgetto } = useAuth()
  const { t, language } = useI18n()
  
  // Sidebar ridimensionabile
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    const saved = localStorage.getItem('sidebar_width')
    return saved ? parseInt(saved) : 256
  })
  const [isResizing, setIsResizing] = useState(false)
  const sidebarRef = useRef(null)

  // Sezioni collassabili
  const [sectionsOpen, setSectionsOpen] = useState(() => {
    const saved = localStorage.getItem('menu_sections')
    return saved ? JSON.parse(saved) : { core: true, construction: true, admin: true }
  })

  // Dropdown progetti
  const [showProgettiDropdown, setShowProgettiDropdown] = useState(false)
  const dropdownRef = useRef(null)
  
  // Banner notifiche - stato per nasconderlo
  const [showNotificationBanner, setShowNotificationBanner] = useState(() => {
    const dismissed = localStorage.getItem('notification_banner_dismissed')
    return !dismissed
  })
  const [notificationPermission, setNotificationPermission] = useState(
    typeof Notification !== 'undefined' ? Notification.permission : 'default'
  )

  // Menu items organizzati per sezione - AGGIORNATO con traduzioni
  const menuSections = [
    {
      id: 'core',
      labelKey: 'general',
      emoji: '📱',
      items: [
        { path: '/', labelKey: 'home', emoji: '🏠', minRole: 'helper' },
        { path: '/checkin', labelKey: 'checkIn', emoji: '📍', minRole: 'helper' },
        { path: '/calendario', labelKey: 'calendar', emoji: '📅', minRole: 'helper' },
        { path: '/ferie', labelKey: 'vacation', emoji: '🏖️', minRole: 'helper' },
        { path: '/team', labelKey: 'team', emoji: '👥', minRole: 'foreman' },
        { path: '/rapportino', labelKey: 'timesheet', emoji: '📝', minRole: 'foreman' },
        { path: '/documenti', labelKey: 'documents', emoji: '📁', minRole: 'foreman' },
        { path: '/notifiche', labelKey: 'notifications', emoji: '🔔', minRole: 'foreman' },
      ]
    },
    {
      id: 'construction',
      labelKey: 'construction',
      emoji: '🏗️',
      items: [
        { path: '/materiali', labelKey: 'materials', emoji: '🔩', minRole: 'engineer', specialAccess: 'componenti' },
        { path: '/work-packages', labelKey: 'workPackages', emoji: '📋', minRole: 'foreman', specialAccess: 'work-packages' },
        { path: '/pianificazione', labelKey: 'planning', emoji: '📆', minRole: 'foreman', specialAccess: 'pianificazione' },
        { path: '/foreman', labelKey: 'field', emoji: '👷', minRole: 'foreman', specialAccess: 'foreman' },
        { path: '/ore-componenti', labelKey: 'workHours', emoji: '⏱️', minRole: 'foreman', specialAccess: 'ore-componenti' },
        { path: '/activities', labelKey: 'activities', emoji: '📋', minRole: 'foreman', specialAccess: 'activities' },
        { path: '/warehouse', labelKey: 'warehouse', emoji: '📦', minRole: 'warehouse', specialAccess: 'warehouse' },
      ]
    },
    {
      id: 'admin',
      labelKey: 'management',
      emoji: '⚙️',
      items: [
        { path: '/trasferimenti', labelKey: 'transfers', emoji: '🔄', minRole: 'foreman' },
        { path: '/statistiche', labelKey: 'statistics', emoji: '📊', minRole: 'supervisor' },
        { path: '/gantt', labelKey: 'gantt', emoji: '📅', minRole: 'supervisor' },
        { path: '/ai-insights', labelKey: 'aiInsights', emoji: '🤖', minRole: 'supervisor' },
        { path: '/dashboard', labelKey: 'dashboard', emoji: '📈', minRole: 'supervisor' },
        { path: '/impostazioni', labelKey: 'settings', emoji: '⚙️', minRole: 'admin' },
      ]
    }
  ]

  // Filtra items visibili per ogni sezione
  const getVisibleItems = (items) => {
    return items.filter(item => {
      if (item.specialAccess) {
        return canAccess ? canAccess(item.specialAccess) : isAtLeast(item.minRole)
      }
      return isAtLeast(item.minRole)
    })
  }

  // Toggle sezione
  const toggleSection = (sectionId) => {
    const newSections = { ...sectionsOpen, [sectionId]: !sectionsOpen[sectionId] }
    setSectionsOpen(newSections)
    localStorage.setItem('menu_sections', JSON.stringify(newSections))
  }

  // Lista ruoli - RIMOSSO "Ruolo reale", Admin è il top
  const roles = [
    { value: 'admin', label: 'Admin' },
    { value: 'pm', label: 'PM' },
    { value: 'cm', label: 'CM' },
    { value: 'supervisor', label: 'Supervisor' },
    { value: 'dept_manager', label: 'Dept Manager' },
    { value: 'engineer', label: 'Engineer' },
    { value: 'foreman', label: 'Foreman' },
    { value: 'warehouse', label: 'Warehouse' },
    { value: 'office', label: 'Office' },
    { value: 'helper', label: 'Helper' },
  ]

  // Colori badge ruoli
  const getRoleBadgeColor = (role) => {
    const colors = {
      admin: 'bg-red-100 text-red-700 border-red-200',
      pm: 'bg-pink-100 text-pink-700 border-pink-200',
      cm: 'bg-purple-100 text-purple-700 border-purple-200',
      supervisor: 'bg-blue-100 text-blue-700 border-blue-200',
      dept_manager: 'bg-indigo-100 text-indigo-700 border-indigo-200',
      engineer: 'bg-cyan-100 text-cyan-700 border-cyan-200',
      foreman: 'bg-green-100 text-green-700 border-green-200',
      warehouse: 'bg-amber-100 text-amber-700 border-amber-200',
      office: 'bg-yellow-100 text-yellow-700 border-yellow-200',
      helper: 'bg-gray-100 text-gray-700 border-gray-200',
    }
    return colors[role] || 'bg-gray-100 text-gray-700 border-gray-200'
  }

  // Gestione resize sidebar
  const startResizing = (e) => {
    setIsResizing(true)
    e.preventDefault()
  }

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isResizing) return
      const newWidth = Math.min(Math.max(e.clientX, 200), 400)
      setSidebarWidth(newWidth)
      localStorage.setItem('sidebar_width', newWidth.toString())
    }

    const handleMouseUp = () => {
      setIsResizing(false)
    }

    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isResizing])

  // Chiudi dropdown quando clicchi fuori
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowProgettiDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Gestione cambio progetto
  const handleCambiaProgetto = async (progettoId) => {
    if (cambiaProgetto) {
      await cambiaProgetto(progettoId)
    }
    setShowProgettiDropdown(false)
  }
  
  // Gestione notifiche
  const handleEnableNotifications = async () => {
    if (typeof Notification !== 'undefined') {
      const permission = await Notification.requestPermission()
      setNotificationPermission(permission)
      if (permission === 'granted') {
        setShowNotificationBanner(false)
      }
    }
  }
  
  const handleDismissNotificationBanner = () => {
    setShowNotificationBanner(false)
    localStorage.setItem('notification_banner_dismissed', 'true')
  }

  // Se non autenticato, mostra solo children
  if (!persona) {
    return <>{children}</>
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Sidebar */}
      <aside 
        ref={sidebarRef}
        style={{ width: sidebarWidth }}
        className="bg-white border-r border-gray-200 flex flex-col relative flex-shrink-0"
      >
        {/* Header Logo e Progetto */}
        <div className="p-4 border-b border-gray-100">
          {/* Logo */}
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center text-white font-bold shadow-lg">
              PTS
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="font-bold text-gray-800">PTS</h1>
              <p className="text-xs text-gray-500 truncate">{t('projectTrackingSystem')}</p>
            </div>
          </div>
          
          {/* Selettore Progetti */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setShowProgettiDropdown(!showProgettiDropdown)}
              className="w-full flex items-center justify-between gap-2 px-3 py-2 bg-gradient-to-r from-blue-50 to-indigo-50 hover:from-blue-100 hover:to-indigo-100 rounded-xl border border-blue-200 transition-all"
            >
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-lg">📁</span>
                <span className="font-medium text-gray-800 truncate text-sm">
                  {progetto?.nome || t('selectProject')}
                </span>
              </div>
              <span className={`text-gray-400 transition-transform ${showProgettiDropdown ? 'rotate-180' : ''}`}>
                ▼
              </span>
            </button>

            {/* Dropdown Lista Progetti */}
            {showProgettiDropdown && assegnazioni.length > 0 && (
              <div className="absolute z-50 w-full mt-2 bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
                <div className="p-2 border-b bg-gray-50">
                  <p className="text-xs font-medium text-gray-500 uppercase">
                    {assegnazioni.some(a => a.isVirtual) ? t('allProjects') : t('yourProjects')}
                  </p>
                </div>
                <div className="max-h-64 overflow-y-auto">
                  {assegnazioni.map((ass) => (
                    <button
                      key={ass.id}
                      onClick={() => handleCambiaProgetto(ass.progetto_id)}
                      className={`w-full flex items-center gap-3 px-3 py-3 text-left hover:bg-blue-50 transition-colors ${
                        ass.progetto_id === progetto?.id ? 'bg-blue-50 border-l-4 border-blue-500' : ''
                      } ${ass.isVirtual ? 'bg-amber-50/50' : ''}`}
                    >
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold ${
                        ass.isVirtual 
                          ? 'bg-gradient-to-br from-amber-400 to-orange-500' 
                          : 'bg-gradient-to-br from-blue-400 to-indigo-500'
                      }`}>
                        {ass.progetto?.codice?.slice(0, 2) || '??'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-800 truncate text-sm">{ass.progetto?.nome}</p>
                        <p className="text-xs text-gray-500">
                          {ass.ruolo}
                          {ass.isVirtual && <span className="ml-1 text-amber-600">{t('adminAccess')}</span>}
                        </p>
                      </div>
                      {ass.progetto_id === progetto?.id && (
                        <span className="text-blue-500">✔</span>
                      )}
                    </button>
                  ))}
                </div>
                {assegnazioni.length > 1 && (
                  <div className="p-2 border-t bg-gray-50">
                    <p className="text-xs text-gray-400 text-center">
                      {assegnazioni.length} {t('projectsAvailable')}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Menu Navigation con Sezioni Collassabili */}
        <nav className="flex-1 overflow-y-auto p-3">
          {menuSections.map(section => {
            const visibleItems = getVisibleItems(section.items)
            if (visibleItems.length === 0) return null
            
            const isOpen = sectionsOpen[section.id] !== false
            
            return (
              <div key={section.id} className="mb-2">
                {/* Header sezione cliccabile */}
                <button
                  onClick={() => toggleSection(section.id)}
                  className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider hover:bg-gray-50 rounded-lg transition-colors"
                >
                  <span className="flex items-center gap-2">
                    <span>{section.emoji}</span>
                    <span>{t(section.labelKey)}</span>
                    <span className="text-gray-300 font-normal">({visibleItems.length})</span>
                  </span>
                  <span className={`transition-transform duration-200 ${isOpen ? '' : '-rotate-90'}`}>
                    ▼
                  </span>
                </button>
                
                {/* Items della sezione con animazione */}
                <div className={`overflow-hidden transition-all duration-200 ${isOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}`}>
                  <div className="mt-1 space-y-1">
                    {visibleItems.map(item => (
                      <Link
                        key={item.path}
                        to={item.path}
                        className={`flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all ${
                          location.pathname === item.path
                            ? 'bg-blue-50 text-blue-700 font-medium'
                            : 'text-gray-600 hover:bg-gray-50'
                        }`}
                      >
                        <span className="text-lg">{item.emoji}</span>
                        <span className="truncate text-sm">{t(item.labelKey)}</span>
                      </Link>
                    ))}
                  </div>
                </div>
              </div>
            )
          })}
        </nav>

        {/* Footer con Test Ruolo e User */}
        <div className="p-4 border-t border-gray-100">
          {/* Test Ruolo - Solo per Admin */}
          {ruolo === 'admin' && (
            <div className="mb-4 p-3 bg-amber-50 rounded-xl border border-amber-200">
              <label className="block text-xs font-medium text-amber-700 mb-1">🧪 {t('testRole')}</label>
              <select
                value={testRoleOverride || 'admin'}
                onChange={(e) => setTestRole(e.target.value === 'admin' ? null : e.target.value)}
                className="w-full px-2 py-1.5 text-sm border border-amber-300 rounded-lg bg-white"
              >
                {roles.map(r => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>
            </div>
          )}

          {/* User Info con Bandierina Lingua */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center text-white text-sm font-bold">
              {persona?.nome?.[0]}{persona?.cognome?.[0]}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-gray-800 text-sm truncate">
                {persona?.nome} {persona?.cognome}
              </p>
              <span className={`inline-block px-2 py-0.5 text-xs font-medium rounded-full border uppercase ${getRoleBadgeColor(ruolo)}`}>
                {ruolo}
              </span>
            </div>
            {/* Bandierina Lingua */}
            <LanguageSwitch />
          </div>
          
          <button
            onClick={signOut}
            className="mt-3 w-full px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          >
            {t('logout')}
          </button>
        </div>

        {/* Resize Handle */}
        <div
          onMouseDown={startResizing}
          className={`absolute right-0 top-0 bottom-0 w-1 cursor-ew-resize hover:bg-blue-400 transition-colors ${
            isResizing ? 'bg-blue-500' : ''
          }`}
        />
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        {/* Banner Notifiche - con possibilità di chiudere */}
        {showNotificationBanner && notificationPermission === 'default' && (
          <div className="bg-white border-b shadow-sm p-4">
            <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <span className="text-2xl">🔔</span>
                <div>
                  <p className="font-medium text-gray-800">{t('enableNotifications')}</p>
                  <p className="text-sm text-gray-500">{t('notificationDescription')}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleDismissNotificationBanner}
                  className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  {t('notNow')}
                </button>
                <button
                  onClick={handleEnableNotifications}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  {t('enable')}
                </button>
              </div>
              {/* X per chiudere */}
              <button
                onClick={handleDismissNotificationBanner}
                className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded"
              >
                ✕
              </button>
            </div>
          </div>
        )}
        {children}
      </main>
    </div>
  )
}
