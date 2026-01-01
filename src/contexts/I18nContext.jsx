import { createContext, useContext, useState, useEffect } from 'react'

// Traduzioni
const translations = {
  it: {
    // Header
    projectTrackingSystem: 'Project Tracking System',
    selectProject: 'Seleziona progetto',
    allProjects: 'Tutti i progetti (Admin)',
    yourProjects: 'I tuoi progetti',
    adminAccess: '(accesso admin)',
    projectsAvailable: 'progetti disponibili',
    
    // Menu Sections
    general: 'Generale',
    construction: 'Construction',
    management: 'Gestione',
    
    // Menu Items - General
    home: 'Home',
    checkIn: 'Check-in',
    calendar: 'Calendario',
    vacation: 'Ferie',
    team: 'Team',
    timesheet: 'Rapportino',
    documents: 'Documenti',
    notifications: 'Notifiche',
    
    // Menu Items - Construction
    materials: 'Materiali',
    planning: 'Pianificazione',
    field: 'Campo',
    workHours: 'Ore Lavoro',
    activities: 'Activities',
    warehouse: 'Warehouse',
    
    // Menu Items - Management
    transfers: 'Trasferimenti',
    statistics: 'Statistiche',
    dashboard: 'Dashboard',
    settings: 'Impostazioni',
    gantt: 'Gantt',
    aiInsights: 'AI Insights',
    
    // User Section
    testRole: 'Test Ruolo',
    logout: 'Esci',
    
    // Notifications Banner
    enableNotifications: 'Attiva le notifiche',
    notificationDescription: 'Ricevi avvisi per approvazioni, promemoria check-in e altro',
    enable: 'Attiva',
    notNow: 'Non ora',
    
    // Common
    save: 'Salva',
    cancel: 'Annulla',
    delete: 'Elimina',
    edit: 'Modifica',
    add: 'Aggiungi',
    search: 'Cerca',
    filter: 'Filtra',
    all: 'Tutti',
    none: 'Nessuno',
    loading: 'Caricamento...',
    error: 'Errore',
    success: 'Successo',
    confirm: 'Conferma',
    close: 'Chiudi',
    yes: 'Sì',
    no: 'No',
    
    // Project Details
    projectCode: 'Codice Commessa',
    projectName: 'Nome Progetto',
    
    // Materials/Components Page
    materialsManagement: 'Gestione Materiali',
    total: 'Totale',
    toOrder: 'Da ordinare',
    ordered: 'Ordinato',
    codeOrDescription: 'Codice o descrizione...',
    discipline: 'Disciplina',
    type: 'Tipo',
    noMaterials: 'Nessun materiale',
    startAddingMaterials: 'Inizia aggiungendo materiali',
    
    // Warehouse Page
    warehouseTitle: 'Warehouse',
    warehouseDescription: 'Gestione materiali e spedizioni al site',
    inWarehouse: 'In Magazzino',
    receivedToday: 'Ricevuti Oggi',
    shippedToday: 'Spediti Oggi',
    receiveMaterial: 'Ricevi Merce',
    shipToSite: 'Spedisci a Site',
    inventory: 'Inventario',
    scanOrEnterCode: 'Scansiona o inserisci il codice del componente',
    enterComponentCode: 'Inserisci codice componente...',
    searchBtn: 'Cerca',
    
    // Planning Page
    planningTitle: 'Pianificazione CW',
    week: 'Settimana',
    currentWeek: 'Settimana corrente',
    pastWeek: 'Settimana passata',
    today: 'Oggi',
    planned: 'Pianificati',
    inProgress: 'In Corso',
    completed: 'Completati',
    problems: 'Problemi',
    
    // Statistics
    statisticsTitle: 'Statistiche',
    hoursWorked: 'Ore Lavorate',
    hoursBudget: 'Ore Budget',
    productivity: 'Produttività',
    trend: 'Trend',
    forecast: 'Previsione',
    
    // Dates
    monday: 'Lunedì',
    tuesday: 'Martedì',
    wednesday: 'Mercoledì',
    thursday: 'Giovedì',
    friday: 'Venerdì',
    saturday: 'Sabato',
    sunday: 'Domenica',
    
    // Months
    january: 'Gennaio',
    february: 'Febbraio',
    march: 'Marzo',
    april: 'Aprile',
    may: 'Maggio',
    june: 'Giugno',
    july: 'Luglio',
    august: 'Agosto',
    september: 'Settembre',
    october: 'Ottobre',
    november: 'Novembre',
    december: 'Dicembre',
  },
  
  en: {
    // Header
    projectTrackingSystem: 'Project Tracking System',
    selectProject: 'Select project',
    allProjects: 'All projects (Admin)',
    yourProjects: 'Your projects',
    adminAccess: '(admin access)',
    projectsAvailable: 'projects available',
    
    // Menu Sections
    general: 'General',
    construction: 'Construction',
    management: 'Management',
    
    // Menu Items - General
    home: 'Home',
    checkIn: 'Check-in',
    calendar: 'Calendar',
    vacation: 'Vacation',
    team: 'Team',
    timesheet: 'Timesheet',
    documents: 'Documents',
    notifications: 'Notifications',
    
    // Menu Items - Construction
    materials: 'Materials',
    planning: 'Planning',
    field: 'Field',
    workHours: 'Work Hours',
    activities: 'Activities',
    warehouse: 'Warehouse',
    
    // Menu Items - Management
    transfers: 'Transfers',
    statistics: 'Statistics',
    dashboard: 'Dashboard',
    settings: 'Settings',
    gantt: 'Gantt',
    aiInsights: 'AI Insights',
    
    // User Section
    testRole: 'Test Role',
    logout: 'Logout',
    
    // Notifications Banner
    enableNotifications: 'Enable notifications',
    notificationDescription: 'Receive alerts for approvals, check-in reminders and more',
    enable: 'Enable',
    notNow: 'Not now',
    
    // Common
    save: 'Save',
    cancel: 'Cancel',
    delete: 'Delete',
    edit: 'Edit',
    add: 'Add',
    search: 'Search',
    filter: 'Filter',
    all: 'All',
    none: 'None',
    loading: 'Loading...',
    error: 'Error',
    success: 'Success',
    confirm: 'Confirm',
    close: 'Close',
    yes: 'Yes',
    no: 'No',
    
    // Project Details
    projectCode: 'Project Code',
    projectName: 'Project Name',
    
    // Materials/Components Page
    materialsManagement: 'Materials Management',
    total: 'Total',
    toOrder: 'To order',
    ordered: 'Ordered',
    codeOrDescription: 'Code or description...',
    discipline: 'Discipline',
    type: 'Type',
    noMaterials: 'No materials',
    startAddingMaterials: 'Start adding materials',
    
    // Warehouse Page
    warehouseTitle: 'Warehouse',
    warehouseDescription: 'Materials management and site shipments',
    inWarehouse: 'In Warehouse',
    receivedToday: 'Received Today',
    shippedToday: 'Shipped Today',
    receiveMaterial: 'Receive Material',
    shipToSite: 'Ship to Site',
    inventory: 'Inventory',
    scanOrEnterCode: 'Scan or enter the component code',
    enterComponentCode: 'Enter component code...',
    searchBtn: 'Search',
    
    // Planning Page
    planningTitle: 'CW Planning',
    week: 'Week',
    currentWeek: 'Current week',
    pastWeek: 'Past week',
    today: 'Today',
    planned: 'Planned',
    inProgress: 'In Progress',
    completed: 'Completed',
    problems: 'Problems',
    
    // Statistics
    statisticsTitle: 'Statistics',
    hoursWorked: 'Hours Worked',
    hoursBudget: 'Hours Budget',
    productivity: 'Productivity',
    trend: 'Trend',
    forecast: 'Forecast',
    
    // Dates
    monday: 'Monday',
    tuesday: 'Tuesday',
    wednesday: 'Wednesday',
    thursday: 'Thursday',
    friday: 'Friday',
    saturday: 'Saturday',
    sunday: 'Sunday',
    
    // Months
    january: 'January',
    february: 'February',
    march: 'March',
    april: 'April',
    may: 'May',
    june: 'June',
    july: 'July',
    august: 'August',
    september: 'September',
    october: 'October',
    november: 'November',
    december: 'December',
  }
}

// Context
const I18nContext = createContext()

// Provider
export function I18nProvider({ children }) {
  const [language, setLanguage] = useState(() => {
    const saved = localStorage.getItem('app_language')
    return saved || 'it'
  })

  useEffect(() => {
    localStorage.setItem('app_language', language)
    document.documentElement.lang = language
  }, [language])

  const t = (key) => {
    return translations[language]?.[key] || translations['it'][key] || key
  }

  const toggleLanguage = () => {
    setLanguage(prev => prev === 'it' ? 'en' : 'it')
  }

  const value = {
    language,
    setLanguage,
    toggleLanguage,
    t,
    translations: translations[language]
  }

  return (
    <I18nContext.Provider value={value}>
      {children}
    </I18nContext.Provider>
  )
}

// Hook
export function useI18n() {
  const context = useContext(I18nContext)
  if (!context) {
    throw new Error('useI18n must be used within I18nProvider')
  }
  return context
}

// Componente bandierina lingua - con grafica SVG
export function LanguageSwitch({ className = '' }) {
  const { language, toggleLanguage } = useI18n()
  
  return (
    <button
      onClick={toggleLanguage}
      className={`flex items-center justify-center w-9 h-7 rounded overflow-hidden border border-gray-200 hover:border-gray-400 transition-all shadow-sm ${className}`}
      title={language === 'it' ? 'Switch to English' : 'Passa a Italiano'}
    >
      {language === 'it' ? (
        // Bandiera Italia 🇮🇹
        <div className="w-full h-full flex">
          <div className="w-1/3 h-full bg-green-500"></div>
          <div className="w-1/3 h-full bg-white"></div>
          <div className="w-1/3 h-full bg-red-500"></div>
        </div>
      ) : (
        // Bandiera UK 🇬🇧
        <div className="w-full h-full bg-blue-700 relative flex items-center justify-center">
          <div className="absolute w-full h-1.5 bg-white"></div>
          <div className="absolute w-1.5 h-full bg-white"></div>
          <div className="absolute w-full h-1 bg-red-600"></div>
          <div className="absolute w-1 h-full bg-red-600"></div>
        </div>
      )}
    </button>
  )
}

export default I18nContext
