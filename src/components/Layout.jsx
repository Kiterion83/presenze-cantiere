import { useState, useEffect, useRef } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useI18n, LanguageSwitch } from '../contexts/I18nContext'

export default function Layout({ children }) {
  const location = useLocation()
  const { persona, progetto, assegnazioni, assegnazione, ruolo, testRoleOverride, setTestRole, signOut, isAtLeast, canAccess, cambiaProgetto } = useAuth()
  const { t, language } = useI18n()
  
  // Sidebar collapsata (solo icone) vs espansa
  const [isCollapsed, setIsCollapsed] = useState(() => {
    const saved = localStorage.getItem('sidebar_collapsed')
    // Su mobile default collapsed
    if (window.innerWidth < 768) return true
    return saved === 'true'
  })
  
  // Mobile: sidebar completamente nascosta
  const [isMobileOpen, setIsMobileOpen] = useState(false)
  
  // Detect mobile
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768)
  
  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 768
      setIsMobile(mobile)
      if (mobile && !isCollapsed) {
        setIsCollapsed(true)
      }
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [isCollapsed])

  // Sezioni collassabili
  const [sectionsOpen, setSectionsOpen] = useState(() => {
    const saved = localStorage.getItem('menu_sections')
    return saved ? JSON.parse(saved) : { core: true, construction: true, admin: true }
  })

  // Dropdown progetti
  const [showProgettiDropdown, setShowProgettiDropdown] = useState(false)
  const dropdownRef = useRef(null)
  
  // Banner notifiche
  const [showNotificationBanner, setShowNotificationBanner] = useState(() => {
    const dismissed = localStorage.getItem('notification_banner_dismissed')
    return !dismissed
  })
  const [notificationPermission, setNotificationPermission] = useState(
    typeof Notification !== 'undefined' ? Notification.permission : 'default'
  )

  // Menu items organizzati per sezione
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
        { path: '/work-packages', labelKey: 'workPackages', emoji: '📦', minRole: 'foreman', specialAccess: 'work-packages' },
        { path: '/test-packages', labelKey: 'testPackages', emoji: '🧪', minRole: 'foreman', specialAccess: 'test-packages' },
        { path: '/avanzamento', labelKey: 'progress', emoji: '📊', minRole: 'foreman', specialAccess: 'avanzamento' },
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
        { path: '/ai-insights', labelKey: 'aiInsights', emoji: '📑', minRole: 'supervisor' },
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
    if (isCollapsed) return // Non toggle se collapsed
    const newSections = { ...sectionsOpen, [sectionId]: !sectionsOpen[sectionId] }
    setSectionsOpen(newSections)
    localStorage.setItem('menu_sections', JSON.stringify(newSections))
  }
  
  // Toggle collapsed
  const toggleCollapsed = () => {
    const newCollapsed = !isCollapsed
    setIsCollapsed(newCollapsed)
    localStorage.setItem('sidebar_collapsed', newCollapsed.toString())
  }

  // Lista ruoli
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

  // FIX: Ruolo REALE dell'utente (senza override) per decidere se mostrare Test Ruolo
  const realUserRole = assegnazione?.ruolo || 'helper'
  const isRealAdmin = realUserRole === 'admin'

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
  const [notificationLoading, setNotificationLoading] = useState(false)
  
  const handleEnableNotifications = async () => {
    console.log('handleEnableNotifications called')
    setNotificationLoading(true)
    
    try {
      if (typeof Notification === 'undefined') {
        alert('Le notifiche non sono supportate su questo browser')
        setShowNotificationBanner(false)
        return
      }
      
      const permission = await Notification.requestPermission()
      console.log('Notification permission:', permission)
      setNotificationPermission(permission)
      
      if (permission === 'granted') {
        setShowNotificationBanner(false)
        // Test notification
        new Notification('Notifiche attivate!', {
          body: 'Riceverai avvisi per approvazioni e check-in',
          icon: '/favicon.ico'
        })
      } else if (permission === 'denied') {
        alert('Permesso notifiche negato. Puoi abilitarlo dalle impostazioni del browser.')
        setShowNotificationBanner(false)
      } else {
        // 'default' - l'utente ha chiuso il popup senza scegliere
        setShowNotificationBanner(false)
      }
    } catch (error) {
      console.error('Errore notifiche:', error)
      alert('Errore durante l\'attivazione delle notifiche')
      setShowNotificationBanner(false)
    } finally {
      setNotificationLoading(false)
    }
  }
  
  const handleDismissNotificationBanner = () => {
    console.log('handleDismissNotificationBanner called')
    setShowNotificationBanner(false)
    localStorage.setItem('notification_banner_dismissed', 'true')
  }
  
  // Chiudi mobile sidebar quando si naviga
  useEffect(() => {
    setIsMobileOpen(false)
  }, [location.pathname])

  // Larghezza sidebar
  const sidebarWidth = isCollapsed ? 72 : 256

  return (
    <>
      {/* FIX: Banner Notifiche - Più discreto e carino */}
      {showNotificationBanner && notificationPermission === 'default' && (
        <div 
          className="fixed bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg"
          style={{ 
            top: isMobile ? '72px' : '0px',
            left: isMobile ? '0' : `${sidebarWidth}px`,
            right: '0',
            zIndex: 9999
          }}
        >
          <div className="px-4 py-3 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="text-2xl">🔔</span>
              <div>
                <p className="font-medium text-sm">{t('enableNotifications')}</p>
                <p className="text-xs text-blue-100 hidden sm:block">{t('notificationDescription')}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={notificationLoading}
                onClick={handleDismissNotificationBanner}
                className="px-3 py-1.5 text-sm text-blue-100 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
              >
                {t('notNow')}
              </button>
              <button
                type="button"
                disabled={notificationLoading}
                onClick={handleEnableNotifications}
                className="px-4 py-1.5 bg-white text-blue-600 rounded-lg font-medium text-sm hover:bg-blue-50 transition-colors disabled:opacity-50"
              >
                {notificationLoading ? '...' : t('enable')}
              </button>
            </div>
          </div>
        </div>
      )}
      
      <div className="flex h-screen bg-gray-50">
      {/* Mobile Overlay */}
      {isMobile && isMobileOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40"
          onClick={() => setIsMobileOpen(false)}
        />
      )}
      
      {/* Mobile Toggle Button (quando sidebar nascosta) */}
      {isMobile && !isMobileOpen && (
        <button
          onClick={() => setIsMobileOpen(true)}
          className="fixed top-4 left-4 z-50 w-12 h-12 bg-white rounded-xl shadow-lg flex items-center justify-center border border-gray-200"
        >
          <span className="text-xl">☰</span>
        </button>
      )}

      {/* Sidebar */}
      <aside
        style={{ width: sidebarWidth }}
        className={`
          ${isMobile ? 'fixed inset-y-0 left-0 z-50' : 'relative'}
          ${isMobile && !isMobileOpen ? '-translate-x-full' : 'translate-x-0'}
          bg-white border-r border-gray-200 flex flex-col shadow-sm
          transition-all duration-300 ease-in-out
        `}
      >
        {/* Header Logo + Progetto */}
        <div className={`p-4 border-b border-gray-100 ${isCollapsed ? 'px-2' : ''}`}>
          {/* Logo con toggle */}
          <div 
            className={`flex items-center gap-3 mb-4 cursor-pointer ${isCollapsed ? 'justify-center' : ''}`}
            onClick={toggleCollapsed}
            title={isCollapsed ? t('expandSidebar') || 'Espandi' : t('collapseSidebar') || 'Riduci'}
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg flex-shrink-0">
              <span className="text-white font-bold text-lg">PTS</span>
            </div>
            {!isCollapsed && (
              <div className="flex-1 min-w-0">
                <h1 className="font-bold text-gray-800">PTS</h1>
                <p className="text-xs text-gray-500">{t('projectTrackingSystem')}</p>
              </div>
            )}
            {!isCollapsed && (
              <span className="text-gray-400 text-sm">
                {isCollapsed ? '→' : '←'}
              </span>
            )}
          </div>

          {/* Progetto Selector */}
          {!isCollapsed ? (
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setShowProgettiDropdown(!showProgettiDropdown)}
                className="w-full flex items-center gap-3 p-2 rounded-xl bg-gradient-to-r from-blue-50 to-indigo-50 hover:from-blue-100 hover:to-indigo-100 transition-all cursor-pointer"
              >
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                  {progetto?.codice?.slice(0, 2) || '??'}
                </div>
                <div className="flex-1 text-left min-w-0">
                  <p className="font-medium text-gray-800 truncate text-sm">{progetto?.nome || t('selectProject')}</p>
                  <p className="text-xs text-gray-500 truncate">{progetto?.codice}</p>
                </div>
                <span className={`text-gray-400 transition-transform ${showProgettiDropdown ? 'rotate-180' : ''}`}>▼</span>
              </button>

              {/* Dropdown Lista Progetti */}
              {showProgettiDropdown && (
                <div className="absolute z-50 left-0 right-0 mt-2 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
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
                </div>
              )}
            </div>
          ) : (
            // Collapsed: solo badge progetto
            <div 
              className="w-10 h-10 mx-auto rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white text-sm font-bold cursor-pointer"
              onClick={() => setIsCollapsed(false)}
              title={progetto?.nome}
            >
              {progetto?.codice?.slice(0, 2) || '??'}
            </div>
          )}
        </div>

        {/* Menu Navigation */}
        <nav className="flex-1 overflow-y-auto p-3">
          {menuSections.map(section => {
            const visibleItems = getVisibleItems(section.items)
            if (visibleItems.length === 0) return null
            
            const isOpen = sectionsOpen[section.id] !== false
            
            return (
              <div key={section.id} className="mb-2">
                {/* Header sezione */}
                {!isCollapsed ? (
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
                ) : (
                  // Collapsed: separatore con emoji
                  <div className="flex justify-center py-2">
                    <span className="text-lg opacity-50" title={t(section.labelKey)}>{section.emoji}</span>
                  </div>
                )}
                
                {/* Items della sezione */}
                <div className={`overflow-hidden transition-all duration-200 ${
                  isCollapsed ? 'max-h-96 opacity-100' : (isOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0')
                }`}>
                  <div className={`mt-1 ${isCollapsed ? 'space-y-1' : 'space-y-1'}`}>
                    {visibleItems.map(item => (
                      <Link
                        key={item.path}
                        to={item.path}
                        title={isCollapsed ? t(item.labelKey) : undefined}
                        className={`flex items-center gap-3 rounded-xl transition-all ${
                          isCollapsed ? 'justify-center px-2 py-3' : 'px-4 py-2.5'
                        } ${
                          location.pathname === item.path
                            ? 'bg-blue-50 text-blue-700 font-medium'
                            : 'text-gray-600 hover:bg-gray-50'
                        }`}
                      >
                        <span className={`${isCollapsed ? 'text-xl' : 'text-lg'}`}>{item.emoji}</span>
                        {!isCollapsed && <span className="truncate text-sm">{t(item.labelKey)}</span>}
                      </Link>
                    ))}
                  </div>
                </div>
              </div>
            )
          })}
        </nav>

        {/* Footer */}
        <div className={`p-4 border-t border-gray-100 ${isCollapsed ? 'p-2' : ''}`}>
          {/* FIX: Test Ruolo - Usa ruolo REALE per decidere se mostrare, non il ruolo con override */}
          {isRealAdmin && !isCollapsed && (
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

          {/* User Info */}
          {!isCollapsed ? (
            <>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
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
                <LanguageSwitch />
              </div>
              
              <button
                onClick={signOut}
                className="mt-3 w-full px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              >
                {t('logout')}
              </button>
            </>
          ) : (
            // Collapsed: solo avatar
            <div className="flex flex-col items-center gap-2">
              <div 
                className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center text-white text-sm font-bold cursor-pointer"
                onClick={() => setIsCollapsed(false)}
                title={`${persona?.nome} ${persona?.cognome}`}
              >
                {persona?.nome?.[0]}{persona?.cognome?.[0]}
              </div>
              <button
                onClick={signOut}
                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                title={t('logout')}
              >
                🚪
              </button>
            </div>
          )}
        </div>

        {/* Toggle Button (desktop) - freccia sul bordo destro */}
        {!isMobile && (
          <button
            onClick={toggleCollapsed}
            className="absolute -right-3 top-1/2 transform -translate-y-1/2 w-6 h-12 bg-white border border-gray-200 rounded-r-lg shadow-sm flex items-center justify-center hover:bg-gray-50 transition-colors"
            title={isCollapsed ? 'Espandi' : 'Riduci'}
          >
            <span className={`text-gray-400 text-xs transition-transform ${isCollapsed ? '' : 'rotate-180'}`}>
              ▶
            </span>
          </button>
        )}
      </aside>

      {/* Main Content */}
      <main className={`flex-1 overflow-auto ${isMobile ? 'pt-20' : ''} ${showNotificationBanner && notificationPermission === 'default' ? 'pt-14' : ''}`}>
        {children}
      </main>
    </div>
    </>
  )
}
