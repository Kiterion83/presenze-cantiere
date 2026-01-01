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
    saving: 'Salvataggio...',
    saved: 'Salvato!',
    created: 'Creato!',
    updated: 'Aggiornato!',
    deleted: 'Eliminato!',
    required: 'Obbligatorio',
    active: 'Attivo',
    inactive: 'Inattivo',
    enabled: 'Attivato',
    disabled: 'Disattivato',
    
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
    
    // ==================== SETTINGS PAGE ====================
    // Settings Menu
    settingsTitle: 'Impostazioni',
    menu: 'Menu',
    
    // Settings Tabs
    projectAndAreas: 'Progetto & Aree',
    people: 'Persone',
    companies: 'Ditte',
    teams: 'Squadre',
    departments: 'Dipartimenti',
    costCenters: 'Centri Costo',
    approvalFlows: 'Flussi Approvazione',
    allProjectsTab: 'Tutti i Progetti',
    testData: 'Dati Test',
    
    // Project Tab
    projectDetails: 'Dettagli Progetto',
    name: 'Nome',
    code: 'Codice',
    address: 'Indirizzo',
    city: 'Città',
    startDate: 'Data Inizio',
    endDate: 'Data Fine Prevista',
    gpsCoordinates: 'Coordinate GPS Centro Cantiere',
    latitude: 'Latitudine',
    longitude: 'Longitudine',
    checkinRadius: 'Raggio Check-in (m)',
    useGPS: 'Usa GPS',
    saveProject: 'Salva Progetto',
    projectUpdated: 'Progetto aggiornato!',
    workersCanCheckin: 'I lavoratori potranno fare check-in entro {radius}m da questo punto.',
    gpsError: 'Errore GPS',
    
    // Work Areas & QR Codes
    workAreasAndQR: 'Aree di Lavoro & QR Codes',
    createAreasForQR: 'Crea aree e genera QR codes per check-in/out',
    workAreaFlow: 'Flusso: Crea un\'area di lavoro → Genera il QR Code → Stampa e posiziona il QR → I lavoratori scansionano per check-in/out',
    newArea: 'Nuova Area',
    editArea: 'Modifica Area',
    areaName: 'Nome Area',
    description: 'Descrizione',
    radiusMeters: 'Raggio (m)',
    color: 'Colore',
    saveArea: 'Salva Area',
    areaCreated: 'Area creata!',
    areaUpdated: 'Area aggiornata!',
    deleteAreaConfirm: 'Eliminare questa area? Verrà eliminato anche il QR Code associato.',
    noAreas: 'Nessuna area definita',
    createAreasForGPS: 'Crea aree per validare i check-in GPS e generare QR codes',
    fillNameAndCoords: 'Compila nome e coordinate',
    exampleAreaName: 'Es: Ingresso Cantiere',
    
    // QR Codes
    qrCodes: 'QR Codes',
    generateQR: 'Genera QR',
    qrActive: 'QR Attivo',
    qrInactive: 'QR Disattivo',
    qrGenerated: 'QR Code generato per {area}!',
    deleteQRConfirm: 'Eliminare questo QR Code?',
    printQR: 'Stampa QR',
    activateQR: 'Attiva',
    deactivateQR: 'Disattiva',
    scanForCheckin: 'Scansiona per Check-in / Check-out',
    workArea: 'Area di lavoro',
    
    // All Projects Tab
    createProject: 'Crea Progetto',
    projectStatus: 'Stato',
    statusActive: 'attivo',
    statusCompleted: 'completato',
    toggleStatus: 'Cambia stato',
    newProject: 'Nuovo Progetto',
    nameRequired: 'Nome obbligatorio',
    projectExistsName: 'Esiste già un progetto con questo nome!',
    projectExistsCode: 'Esiste già un progetto con questo codice commessa!',
    projectExistsBoth: 'Esiste già un progetto con questo nome E questo codice!',
    projectCreated: 'Progetto creato!',
    gpsAcquired: 'Coordinate GPS acquisite!',
    geolocationNotSupported: 'Geolocalizzazione non supportata',
    
    // People Tab
    peopleTitle: 'Persone',
    addPerson: 'Aggiungi',
    newPerson: 'Nuova Persona',
    editPerson: 'Modifica Persona',
    firstName: 'Nome',
    lastName: 'Cognome',
    email: 'Email',
    phone: 'Telefono',
    role: 'Ruolo',
    company: 'Ditta',
    teamLabel: 'Squadra',
    personSaved: 'Salvato!',
    deactivateConfirm: 'Disattivare?',
    searchPeople: 'Cerca per nome, cognome, email...',
    noPeople: 'Nessuna persona',
    addPeopleToProject: 'Aggiungi persone al progetto',
    
    // Roles
    roleHelper: 'Helper',
    roleWarehouse: 'Magazziniere',
    roleOffice: 'Ufficio',
    roleForeman: 'Caposquadra',
    roleEngineer: 'Ingegnere',
    roleDeptManager: 'Resp. Dipartimento',
    roleSupervisor: 'Supervisore',
    roleCM: 'Construction Manager',
    rolePM: 'Project Manager',
    roleAdmin: 'Admin',
    
    // Companies Tab
    companiesTitle: 'Ditte',
    newCompany: 'Nuova Ditta',
    editCompany: 'Modifica Ditta',
    companyName: 'Nome',
    businessName: 'Ragione Sociale',
    vatNumber: 'Partita IVA',
    companySaved: 'Salvato!',
    noCompanies: 'Nessuna ditta',
    addCompaniesToStart: 'Aggiungi ditte per iniziare',
    
    // Teams Tab
    teamsTitle: 'Squadre',
    newTeam: 'Nuova Squadra',
    editTeam: 'Modifica Squadra',
    teamName: 'Nome Squadra',
    teamSaved: 'Salvato!',
    noTeams: 'Nessuna squadra',
    createTeams: 'Crea squadre per organizzare i lavoratori',
    
    // Departments Tab
    departmentsTitle: 'Dipartimenti',
    newDepartment: 'Nuovo Dipartimento',
    editDepartment: 'Modifica Dipartimento',
    departmentName: 'Nome',
    departmentCode: 'Codice',
    departmentSaved: 'Salvato!',
    deleteConfirm: 'Eliminare?',
    noDepartments: 'Nessun dipartimento',
    departmentsAutoCreated: 'I dipartimenti vengono creati automaticamente con il progetto',
    
    // Cost Centers Tab
    costCentersTitle: 'Centri di Costo',
    newCostCenter: 'Nuovo Centro Costo',
    editCostCenter: 'Modifica Centro Costo',
    costCenterCode: 'Codice',
    costCenterDesc: 'Descrizione',
    budgetHours: 'Budget Ore',
    budgetEuro: 'Budget €',
    costCenterSaved: 'Salvato!',
    deactivateCC: 'Disattivare?',
    noCostCenters: 'Nessun centro di costo',
    addCostCenters: 'Aggiungi centri di costo per tracciare i budget',
    
    // Test Data Tab
    testDataTitle: 'Dati Test',
    testDataDescription: 'Genera dati di test per popolare il sistema rapidamente durante lo sviluppo.',
    generateTestData: 'Genera Dati Test',
    generating: 'Generazione...',
    testDataGenerated: 'Dati di test generati con successo!',
    testDataWarning: 'Attenzione: Questa funzione è pensata solo per ambienti di sviluppo/test. Non usare in produzione.',
    generateTestDataConfirm: 'Generare dati di test? Questo creerà persone, ditte, squadre fittizie.',
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
    saving: 'Saving...',
    saved: 'Saved!',
    created: 'Created!',
    updated: 'Updated!',
    deleted: 'Deleted!',
    required: 'Required',
    active: 'Active',
    inactive: 'Inactive',
    enabled: 'Enabled',
    disabled: 'Disabled',
    
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
    
    // ==================== SETTINGS PAGE ====================
    // Settings Menu
    settingsTitle: 'Settings',
    menu: 'Menu',
    
    // Settings Tabs
    projectAndAreas: 'Project & Areas',
    people: 'People',
    companies: 'Companies',
    teams: 'Teams',
    departments: 'Departments',
    costCenters: 'Cost Centers',
    approvalFlows: 'Approval Flows',
    allProjectsTab: 'All Projects',
    testData: 'Test Data',
    
    // Project Tab
    projectDetails: 'Project Details',
    name: 'Name',
    code: 'Code',
    address: 'Address',
    city: 'City',
    startDate: 'Start Date',
    endDate: 'Expected End Date',
    gpsCoordinates: 'GPS Coordinates Site Center',
    latitude: 'Latitude',
    longitude: 'Longitude',
    checkinRadius: 'Check-in Radius (m)',
    useGPS: 'Use GPS',
    saveProject: 'Save Project',
    projectUpdated: 'Project updated!',
    workersCanCheckin: 'Workers can check-in within {radius}m from this point.',
    gpsError: 'GPS Error',
    
    // Work Areas & QR Codes
    workAreasAndQR: 'Work Areas & QR Codes',
    createAreasForQR: 'Create areas and generate QR codes for check-in/out',
    workAreaFlow: 'Flow: Create a work area → Generate QR Code → Print and place QR → Workers scan for check-in/out',
    newArea: 'New Area',
    editArea: 'Edit Area',
    areaName: 'Area Name',
    description: 'Description',
    radiusMeters: 'Radius (m)',
    color: 'Color',
    saveArea: 'Save Area',
    areaCreated: 'Area created!',
    areaUpdated: 'Area updated!',
    deleteAreaConfirm: 'Delete this area? The associated QR Code will also be deleted.',
    noAreas: 'No areas defined',
    createAreasForGPS: 'Create areas to validate GPS check-ins and generate QR codes',
    fillNameAndCoords: 'Fill in name and coordinates',
    exampleAreaName: 'Ex: Site Entrance',
    
    // QR Codes
    qrCodes: 'QR Codes',
    generateQR: 'Generate QR',
    qrActive: 'QR Active',
    qrInactive: 'QR Inactive',
    qrGenerated: 'QR Code generated for {area}!',
    deleteQRConfirm: 'Delete this QR Code?',
    printQR: 'Print QR',
    activateQR: 'Activate',
    deactivateQR: 'Deactivate',
    scanForCheckin: 'Scan for Check-in / Check-out',
    workArea: 'Work area',
    
    // All Projects Tab
    createProject: 'Create Project',
    projectStatus: 'Status',
    statusActive: 'active',
    statusCompleted: 'completed',
    toggleStatus: 'Toggle status',
    newProject: 'New Project',
    nameRequired: 'Name required',
    projectExistsName: 'A project with this name already exists!',
    projectExistsCode: 'A project with this code already exists!',
    projectExistsBoth: 'A project with this name AND code already exists!',
    projectCreated: 'Project created!',
    gpsAcquired: 'GPS coordinates acquired!',
    geolocationNotSupported: 'Geolocation not supported',
    
    // People Tab
    peopleTitle: 'People',
    addPerson: 'Add',
    newPerson: 'New Person',
    editPerson: 'Edit Person',
    firstName: 'First Name',
    lastName: 'Last Name',
    email: 'Email',
    phone: 'Phone',
    role: 'Role',
    company: 'Company',
    teamLabel: 'Team',
    personSaved: 'Saved!',
    deactivateConfirm: 'Deactivate?',
    searchPeople: 'Search by name, surname, email...',
    noPeople: 'No people',
    addPeopleToProject: 'Add people to the project',
    
    // Roles
    roleHelper: 'Helper',
    roleWarehouse: 'Warehouse',
    roleOffice: 'Office',
    roleForeman: 'Foreman',
    roleEngineer: 'Engineer',
    roleDeptManager: 'Dept. Manager',
    roleSupervisor: 'Supervisor',
    roleCM: 'Construction Manager',
    rolePM: 'Project Manager',
    roleAdmin: 'Admin',
    
    // Companies Tab
    companiesTitle: 'Companies',
    newCompany: 'New Company',
    editCompany: 'Edit Company',
    companyName: 'Name',
    businessName: 'Business Name',
    vatNumber: 'VAT Number',
    companySaved: 'Saved!',
    noCompanies: 'No companies',
    addCompaniesToStart: 'Add companies to start',
    
    // Teams Tab
    teamsTitle: 'Teams',
    newTeam: 'New Team',
    editTeam: 'Edit Team',
    teamName: 'Team Name',
    teamSaved: 'Saved!',
    noTeams: 'No teams',
    createTeams: 'Create teams to organize workers',
    
    // Departments Tab
    departmentsTitle: 'Departments',
    newDepartment: 'New Department',
    editDepartment: 'Edit Department',
    departmentName: 'Name',
    departmentCode: 'Code',
    departmentSaved: 'Saved!',
    deleteConfirm: 'Delete?',
    noDepartments: 'No departments',
    departmentsAutoCreated: 'Departments are automatically created with the project',
    
    // Cost Centers Tab
    costCentersTitle: 'Cost Centers',
    newCostCenter: 'New Cost Center',
    editCostCenter: 'Edit Cost Center',
    costCenterCode: 'Code',
    costCenterDesc: 'Description',
    budgetHours: 'Budget Hours',
    budgetEuro: 'Budget €',
    costCenterSaved: 'Saved!',
    deactivateCC: 'Deactivate?',
    noCostCenters: 'No cost centers',
    addCostCenters: 'Add cost centers to track budgets',
    
    // Test Data Tab
    testDataTitle: 'Test Data',
    testDataDescription: 'Generate test data to quickly populate the system during development.',
    generateTestData: 'Generate Test Data',
    generating: 'Generating...',
    testDataGenerated: 'Test data generated successfully!',
    testDataWarning: 'Warning: This function is intended only for development/test environments. Do not use in production.',
    generateTestDataConfirm: 'Generate test data? This will create dummy people, companies, teams.',
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

  const t = (key, params = {}) => {
    let text = translations[language]?.[key] || translations['it'][key] || key
    // Replace {param} placeholders
    Object.keys(params).forEach(param => {
      text = text.replace(`{${param}}`, params[param])
    })
    return text
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
        // Bandiera Italia
        <div className="w-full h-full flex">
          <div className="w-1/3 h-full bg-green-500"></div>
          <div className="w-1/3 h-full bg-white"></div>
          <div className="w-1/3 h-full bg-red-500"></div>
        </div>
      ) : (
        // Bandiera UK
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
