import { createContext, useContext, useState, useEffect } from 'react'

// Traduzioni COMPLETE
const translations = {
  it: {
    // ==========================================
    // HEADER & NAVIGATION
    // ==========================================
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
    workPackages: 'Work Packages',
    progress: 'Avanzamento',
    planning: 'Pianificazione',
    field: 'Campo',
    workHours: 'Ore Lavoro',
    activities: 'Attività',
    warehouse: 'Magazzino',
    
    // Menu Items - Management
    transfers: 'Trasferimenti',
    statistics: 'Statistiche',
    dashboard: 'Dashboard',
    settings: 'Impostazioni',
    gantt: 'Gantt',
    aiInsights: 'Report & Analisi',
    
    // User Section
    testRole: 'Test Ruolo',
    logout: 'Esci',
    
    // Notifications Banner
    enableNotifications: 'Attiva le notifiche',
    notificationDescription: 'Ricevi avvisi per approvazioni, promemoria check-in e altro',
    enable: 'Attiva',
    notNow: 'Non ora',
    
    // ==========================================
    // COMMON / SHARED
    // ==========================================
    save: 'Salva',
    cancel: 'Annulla',
    delete: 'Elimina',
    edit: 'Modifica',
    add: 'Aggiungi',
    search: 'Cerca',
    filter: 'Filtra',
    all: 'Tutti',
    allFemale: 'Tutte',
    none: 'Nessuno',
    loading: 'Caricamento...',
    error: 'Errore',
    success: 'Successo',
    confirm: 'Conferma',
    close: 'Chiudi',
    yes: 'Sì',
    no: 'No',
    actions: 'Azioni',
    status: 'Stato',
    state: 'Stato',
    notes: 'Note',
    description: 'Descrizione',
    date: 'Data',
    time: 'Ora',
    from: 'Da',
    to: 'A',
    total: 'Totale',
    details: 'Dettagli',
    view: 'Visualizza',
    download: 'Scarica',
    upload: 'Carica',
    export: 'Esporta',
    import: 'Importa',
    back: 'Indietro',
    next: 'Avanti',
    previous: 'Precedente',
    create: 'Crea',
    update: 'Aggiorna',
    assign: 'Assegna',
    unassign: 'Rimuovi assegnazione',
    select: 'Seleziona',
    selectAll: 'Seleziona tutto',
    deselectAll: 'Deseleziona tutto',
    required: 'Obbligatorio',
    optional: 'Opzionale',
    
    // ==========================================
    // PLANNING PAGE - Pianificazione CW
    // ==========================================
    planningTitle: 'Pianificazione CW',
    planningSubtitle: 'Pianificazione settimanale attività',
    assignToCW: 'Assegna a CW',
    assignMultiple: 'Assegna multipli',
    week: 'Settimana',
    currentWeek: 'Settimana corrente',
    pastWeek: 'Settimana passata',
    futureWeek: 'Settimana futura',
    today: 'Oggi',
    
    // KPI Cards
    planned: 'Pianificate',
    plannedMale: 'Pianificati',
    inProgress: 'In Corso',
    completed: 'Completate',
    completedMale: 'Completati',
    problems: 'Problemi',
    activitiesPlanned: 'attività pianificate',
    
    // Filters
    discipline: 'Disciplina',
    squad: 'Squadra',
    allDisciplines: 'Tutte le discipline',
    allSquads: 'Tutte le squadre',
    allStatuses: 'Tutti gli stati',
    
    // Status columns
    noActivity: 'Nessuna attività',
    noProblem: 'Nessun problema',
    noPlannedActivity: 'Nessuna attività pianificata',
    thisWeekNoActivity: 'Questa settimana non ha ancora attività. Assegna componenti per iniziare.',
    assignFirstComponent: 'Assegna primo componente',
    
    // Modal Assign to CW
    assignToCWTitle: 'Assegna a CW',
    component: 'Componente',
    selectComponent: 'Seleziona componente...',
    phase: 'Fase',
    selectPhase: 'Seleziona fase...',
    action: 'Azione',
    actionPlaceholder: 'Es. Erection, Fit-up, Welding...',
    noSquadAssigned: 'Nessuna squadra assegnata',
    priority: 'Priorità (ordine esecuzione)',
    instructions: 'Istruzioni',
    instructionsPlaceholder: 'Istruzioni specifiche per il campo...',
    
    // Work Package specific
    wpNotScheduled: 'WP non pianificati',
    wpScheduled: 'WP pianificati',
    scheduleWP: 'Pianifica WP',
    wpWithoutDates: 'Work Package senza date',
    
    // ==========================================
    // WORK PACKAGES PAGE
    // ==========================================
    workPackagesTitle: 'Work Packages',
    workPackagesSubtitle: 'Pacchetti di lavoro organizzati',
    newWP: 'Nuovo WP',
    importExcel: 'Import Excel',
    wpCode: 'Codice WP',
    wpName: 'Nome WP',
    area: 'Area',
    startDate: 'Data Inizio',
    endDate: 'Data Fine',
    estimatedHours: 'Ore Stimate',
    actualHours: 'Ore Effettive',
    progressPercent: 'Avanzamento %',
    assignedTo: 'Assegnato a',
    components: 'Componenti',
    phases: 'Fasi',
    comp: 'comp.',
    
    // ==========================================
    // MATERIALS / COMPONENTS PAGE
    // ==========================================
    materialsManagement: 'Gestione Materiali',
    materialsSubtitle: 'Componenti e materiali del progetto',
    toOrder: 'Da ordinare',
    ordered: 'Ordinato',
    delivered: 'Consegnato',
    installed: 'Installato',
    codeOrDescription: 'Codice o descrizione...',
    type: 'Tipo',
    noMaterials: 'Nessun materiale',
    startAddingMaterials: 'Inizia aggiungendo materiali',
    componentCode: 'Codice Componente',
    componentType: 'Tipo Componente',
    quantity: 'Quantità',
    unit: 'Unità',
    weight: 'Peso',
    
    // ==========================================
    // WAREHOUSE PAGE
    // ==========================================
    warehouseTitle: 'Magazzino',
    warehouseSubtitle: 'Gestione materiali e spedizioni al site',
    inWarehouse: 'In Magazzino',
    receivedToday: 'Ricevuti Oggi',
    shippedToday: 'Spediti Oggi',
    receiveMaterial: 'Ricevi Merce',
    shipToSite: 'Spedisci a Site',
    inventory: 'Inventario',
    scanOrEnterCode: 'Scansiona o inserisci il codice del componente',
    enterComponentCode: 'Inserisci codice componente...',
    searchBtn: 'Cerca',
    readyToShip: 'Pronto per spedizione',
    shipped: 'Spedito',
    received: 'Ricevuto',
    
    // ==========================================
    // FIELD / FOREMAN PAGE
    // ==========================================
    fieldTitle: 'Campo',
    fieldSubtitle: 'Gestione attività in campo',
    todayActivities: 'Attività di oggi',
    pendingActivities: 'Attività in sospeso',
    completedActivities: 'Attività completate',
    startActivity: 'Inizia attività',
    completeActivity: 'Completa attività',
    reportProblem: 'Segnala problema',
    takePhoto: 'Scatta foto',
    
    // ==========================================
    // PROGRESS / AVANZAMENTO PAGE
    // ==========================================
    progressTitle: 'Avanzamento',
    progressSubtitle: 'Monitoraggio avanzamento lavori',
    overallProgress: 'Avanzamento Generale',
    byDiscipline: 'Per Disciplina',
    byArea: 'Per Area',
    byWP: 'Per Work Package',
    behindSchedule: 'In ritardo',
    onSchedule: 'In linea',
    aheadSchedule: 'In anticipo',
    
    // ==========================================
    // TIMESHEET / RAPPORTINO PAGE
    // ==========================================
    timesheetTitle: 'Rapportino',
    timesheetSubtitle: 'Rapportino giornaliero',
    dailyReport: 'Rapporto Giornaliero',
    weeklyReport: 'Rapporto Settimanale',
    hoursWorked: 'Ore Lavorate',
    overtime: 'Straordinario',
    regularHours: 'Ore Ordinarie',
    overtimeHours: 'Ore Straordinarie',
    totalHours: 'Ore Totali',
    submitReport: 'Invia Rapporto',
    approveReport: 'Approva Rapporto',
    rejectReport: 'Rifiuta Rapporto',
    draft: 'Bozza',
    submitted: 'Inviato',
    approved: 'Approvato',
    rejected: 'Rifiutato',
    signature: 'Firma',
    foremanSignature: 'Firma Caposquadra',
    supervisorSignature: 'Firma Supervisore',
    exportPDF: 'Esporta PDF',
    
    // ==========================================
    // TEAM PAGE
    // ==========================================
    teamTitle: 'Team',
    teamSubtitle: 'Gestione del team di progetto',
    members: 'Membri',
    addMember: 'Aggiungi Membro',
    removeMember: 'Rimuovi Membro',
    role: 'Ruolo',
    email: 'Email',
    phone: 'Telefono',
    company: 'Azienda',
    activeMembers: 'Membri Attivi',
    
    // ==========================================
    // CALENDAR PAGE
    // ==========================================
    calendarTitle: 'Calendario',
    calendarSubtitle: 'Visualizza eventi e scadenze',
    event: 'Evento',
    events: 'Eventi',
    addEvent: 'Aggiungi Evento',
    noEvents: 'Nessun evento',
    
    // ==========================================
    // VACATION / FERIE PAGE
    // ==========================================
    vacationTitle: 'Ferie e Permessi',
    vacationSubtitle: 'Gestione ferie e permessi',
    requestVacation: 'Richiedi Ferie',
    vacationDays: 'Giorni di Ferie',
    remainingDays: 'Giorni Rimanenti',
    usedDays: 'Giorni Utilizzati',
    pendingRequests: 'Richieste in Attesa',
    approvedRequests: 'Richieste Approvate',
    vacationType: 'Tipo',
    // vacation già definito sopra nel menu
    permit: 'Permesso',
    sickLeave: 'Malattia',
    
    // ==========================================
    // CHECK-IN PAGE
    // ==========================================
    checkInTitle: 'Check-in',
    checkInSubtitle: 'Registra la tua presenza',
    checkInNow: 'Check-in Ora',
    checkOutNow: 'Check-out Ora',
    checkedIn: 'Check-in effettuato',
    checkedOut: 'Check-out effettuato',
    notCheckedIn: 'Non registrato',
    locationRequired: 'Posizione richiesta',
    gpsError: 'Errore GPS',
    outsideArea: 'Fuori area di lavoro',
    
    // ==========================================
    // STATISTICS PAGE
    // ==========================================
    statisticsTitle: 'Statistiche',
    statisticsSubtitle: 'Analisi dati e KPI',
    hoursBudget: 'Ore Budget',
    productivity: 'Produttività',
    trend: 'Trend',
    forecast: 'Previsione',
    performance: 'Performance',
    efficiency: 'Efficienza',
    
    // ==========================================
    // DASHBOARD PAGE
    // ==========================================
    dashboardTitle: 'Dashboard',
    dashboardSubtitle: 'Panoramica generale',
    overview: 'Panoramica',
    recentActivity: 'Attività Recente',
    alerts: 'Avvisi',
    
    // ==========================================
    // TRANSFERS PAGE
    // ==========================================
    transfersTitle: 'Trasferimenti',
    transfersSubtitle: 'Gestione trasferimenti personale',
    newTransfer: 'Nuovo Trasferimento',
    fromProject: 'Da Progetto',
    toProject: 'A Progetto',
    transferDate: 'Data Trasferimento',
    
    // ==========================================
    // SETTINGS PAGE
    // ==========================================
    settingsTitle: 'Impostazioni',
    settingsSubtitle: 'Configurazione del progetto',
    projectSettings: 'Impostazioni Progetto',
    userSettings: 'Impostazioni Utente',
    notificationSettings: 'Impostazioni Notifiche',
    language: 'Lingua',
    theme: 'Tema',
    
    // ==========================================
    // PLANNING PAGE - Extra translations
    // ==========================================
    postponed: 'Rimandato',
    blocked: 'Bloccato',
    start: 'Inizia',
    complete: 'Completa',
    markResolved: 'Segna risolto',
    markAsResolved: 'Segna come risolto',
    componentsAvailable: 'componenti disponibili',
    selectedOf: 'selezionati di',
    allComponentsAssigned: 'Tutti i componenti sono già assegnati',
    confirmRemoveActivity: 'Rimuovere questa attività dalla pianificazione?',
    selectAtLeastOne: 'Seleziona almeno un componente',
    problemResolved: 'Problema risolto',
    problemReported: 'Problema segnalato',
    reportedAt: 'Segnalato',
    describeProblem: 'Descrivi il problema...',
    report: 'Segnala',
    postponeToCW1: 'Rimanda a CW+1',
    remove: 'Rimuovi',
    componentStatus: 'Stato comp.',
    completedBy: 'Completato da',
    // assignToCWTitle già definito sopra

    // ==========================================
    // IMPEDIMENTS / BLOCCHI (IT)
    // ==========================================
    impedimentsTitle: 'Impedimenti',
    impedimentsSubtitle: 'Gestione blocchi e problemi',
    newImpediment: 'Nuovo Impedimento',
    impedimentType: 'Tipo Impedimento',
    severity: 'Gravità',
    low: 'Bassa',
    medium: 'Media',
    high: 'Alta',
    critical: 'Critica',
    open: 'Aperto',
    resolved: 'Risolto',
    escalated: 'Escalato',
    
    // ==========================================
    // DATES
    // ==========================================
    monday: 'Lunedì',
    tuesday: 'Martedì',
    wednesday: 'Mercoledì',
    thursday: 'Giovedì',
    friday: 'Venerdì',
    saturday: 'Sabato',
    sunday: 'Domenica',
    
    // Short days
    mon: 'Lun',
    tue: 'Mar',
    wed: 'Mer',
    thu: 'Gio',
    fri: 'Ven',
    sat: 'Sab',
    sun: 'Dom',
    
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
    
    // Short months
    jan: 'Gen',
    feb: 'Feb',
    mar: 'Mar',
    apr: 'Apr',
    mayShort: 'Mag',
    jun: 'Giu',
    jul: 'Lug',
    aug: 'Ago',
    sep: 'Set',
    oct: 'Ott',
    nov: 'Nov',
    dec: 'Dic',
  },
  
  // ==========================================
  // ENGLISH TRANSLATIONS
  // ==========================================
  en: {
    // ==========================================
    // HEADER & NAVIGATION
    // ==========================================
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
    workPackages: 'Work Packages',
    progress: 'Progress',
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
    aiInsights: 'Reports & Analytics',
    
    // User Section
    testRole: 'Test Role',
    logout: 'Logout',
    
    // Notifications Banner
    enableNotifications: 'Enable notifications',
    notificationDescription: 'Receive alerts for approvals, check-in reminders and more',
    enable: 'Enable',
    notNow: 'Not now',
    
    // ==========================================
    // COMMON / SHARED
    // ==========================================
    save: 'Save',
    cancel: 'Cancel',
    delete: 'Delete',
    edit: 'Edit',
    add: 'Add',
    search: 'Search',
    filter: 'Filter',
    all: 'All',
    allFemale: 'All',
    none: 'None',
    loading: 'Loading...',
    error: 'Error',
    success: 'Success',
    confirm: 'Confirm',
    close: 'Close',
    yes: 'Yes',
    no: 'No',
    actions: 'Actions',
    status: 'Status',
    state: 'State',
    notes: 'Notes',
    description: 'Description',
    date: 'Date',
    time: 'Time',
    from: 'From',
    to: 'To',
    total: 'Total',
    details: 'Details',
    view: 'View',
    download: 'Download',
    upload: 'Upload',
    export: 'Export',
    import: 'Import',
    back: 'Back',
    next: 'Next',
    previous: 'Previous',
    create: 'Create',
    update: 'Update',
    assign: 'Assign',
    unassign: 'Unassign',
    select: 'Select',
    selectAll: 'Select all',
    deselectAll: 'Deselect all',
    required: 'Required',
    optional: 'Optional',
    
    // ==========================================
    // PLANNING PAGE - CW Planning
    // ==========================================
    planningTitle: 'CW Planning',
    planningSubtitle: 'Weekly activity planning',
    assignToCW: 'Assign to CW',
    assignMultiple: 'Assign Multiple',
    week: 'Week',
    currentWeek: 'Current week',
    pastWeek: 'Past week',
    futureWeek: 'Future week',
    today: 'Today',
    
    // KPI Cards
    planned: 'Planned',
    plannedMale: 'Planned',
    inProgress: 'In Progress',
    completed: 'Completed',
    completedMale: 'Completed',
    problems: 'Problems',
    activitiesPlanned: 'activities planned',
    
    // Filters
    discipline: 'Discipline',
    squad: 'Squad',
    allDisciplines: 'All disciplines',
    allSquads: 'All squads',
    allStatuses: 'All statuses',
    
    // Status columns
    noActivity: 'No activity',
    noProblem: 'No problems',
    noPlannedActivity: 'No planned activity',
    thisWeekNoActivity: 'This week has no activities yet. Assign components to start.',
    assignFirstComponent: 'Assign first component',
    
    // Modal Assign to CW
    assignToCWTitle: 'Assign to CW',
    component: 'Component',
    selectComponent: 'Select component...',
    phase: 'Phase',
    selectPhase: 'Select phase...',
    action: 'Action',
    actionPlaceholder: 'E.g. Erection, Fit-up, Welding...',
    noSquadAssigned: 'No squad assigned',
    priority: 'Priority (execution order)',
    instructions: 'Instructions',
    instructionsPlaceholder: 'Specific instructions for the field...',
    
    // Work Package specific
    wpNotScheduled: 'Unscheduled WPs',
    wpScheduled: 'Scheduled WPs',
    scheduleWP: 'Schedule WP',
    wpWithoutDates: 'Work Packages without dates',
    
    // ==========================================
    // WORK PACKAGES PAGE
    // ==========================================
    workPackagesTitle: 'Work Packages',
    workPackagesSubtitle: 'Organized work packages',
    newWP: 'New WP',
    importExcel: 'Import Excel',
    wpCode: 'WP Code',
    wpName: 'WP Name',
    area: 'Area',
    startDate: 'Start Date',
    endDate: 'End Date',
    estimatedHours: 'Estimated Hours',
    actualHours: 'Actual Hours',
    progressPercent: 'Progress %',
    assignedTo: 'Assigned To',
    components: 'Components',
    phases: 'Phases',
    comp: 'comp.',
    
    // ==========================================
    // MATERIALS / COMPONENTS PAGE
    // ==========================================
    materialsManagement: 'Materials Management',
    materialsSubtitle: 'Project components and materials',
    toOrder: 'To Order',
    ordered: 'Ordered',
    delivered: 'Delivered',
    installed: 'Installed',
    codeOrDescription: 'Code or description...',
    type: 'Type',
    noMaterials: 'No materials',
    startAddingMaterials: 'Start adding materials',
    componentCode: 'Component Code',
    componentType: 'Component Type',
    quantity: 'Quantity',
    unit: 'Unit',
    weight: 'Weight',
    
    // ==========================================
    // WAREHOUSE PAGE
    // ==========================================
    warehouseTitle: 'Warehouse',
    warehouseSubtitle: 'Materials management and site shipments',
    inWarehouse: 'In Warehouse',
    receivedToday: 'Received Today',
    shippedToday: 'Shipped Today',
    receiveMaterial: 'Receive Material',
    shipToSite: 'Ship to Site',
    inventory: 'Inventory',
    scanOrEnterCode: 'Scan or enter component code',
    enterComponentCode: 'Enter component code...',
    searchBtn: 'Search',
    readyToShip: 'Ready to ship',
    shipped: 'Shipped',
    received: 'Received',
    
    // ==========================================
    // FIELD / FOREMAN PAGE
    // ==========================================
    fieldTitle: 'Field',
    fieldSubtitle: 'Field activity management',
    todayActivities: "Today's activities",
    pendingActivities: 'Pending activities',
    completedActivities: 'Completed activities',
    startActivity: 'Start activity',
    completeActivity: 'Complete activity',
    reportProblem: 'Report problem',
    takePhoto: 'Take photo',
    
    // ==========================================
    // PROGRESS / AVANZAMENTO PAGE
    // ==========================================
    progressTitle: 'Progress',
    progressSubtitle: 'Work progress monitoring',
    overallProgress: 'Overall Progress',
    byDiscipline: 'By Discipline',
    byArea: 'By Area',
    byWP: 'By Work Package',
    behindSchedule: 'Behind schedule',
    onSchedule: 'On schedule',
    aheadSchedule: 'Ahead of schedule',
    
    // ==========================================
    // TIMESHEET / RAPPORTINO PAGE
    // ==========================================
    timesheetTitle: 'Timesheet',
    timesheetSubtitle: 'Daily timesheet',
    dailyReport: 'Daily Report',
    weeklyReport: 'Weekly Report',
    hoursWorked: 'Hours Worked',
    overtime: 'Overtime',
    regularHours: 'Regular Hours',
    overtimeHours: 'Overtime Hours',
    totalHours: 'Total Hours',
    submitReport: 'Submit Report',
    approveReport: 'Approve Report',
    rejectReport: 'Reject Report',
    draft: 'Draft',
    submitted: 'Submitted',
    approved: 'Approved',
    rejected: 'Rejected',
    signature: 'Signature',
    foremanSignature: 'Foreman Signature',
    supervisorSignature: 'Supervisor Signature',
    exportPDF: 'Export PDF',
    
    // ==========================================
    // TEAM PAGE
    // ==========================================
    teamTitle: 'Team',
    teamSubtitle: 'Project team management',
    members: 'Members',
    addMember: 'Add Member',
    removeMember: 'Remove Member',
    role: 'Role',
    email: 'Email',
    phone: 'Phone',
    company: 'Company',
    activeMembers: 'Active Members',
    
    // ==========================================
    // CALENDAR PAGE
    // ==========================================
    calendarTitle: 'Calendar',
    calendarSubtitle: 'View events and deadlines',
    event: 'Event',
    events: 'Events',
    addEvent: 'Add Event',
    noEvents: 'No events',
    
    // ==========================================
    // VACATION / FERIE PAGE
    // ==========================================
    vacationTitle: 'Vacation & Leave',
    vacationSubtitle: 'Vacation and leave management',
    requestVacation: 'Request Vacation',
    vacationDays: 'Vacation Days',
    remainingDays: 'Remaining Days',
    usedDays: 'Used Days',
    pendingRequests: 'Pending Requests',
    approvedRequests: 'Approved Requests',
    vacationType: 'Type',
    // vacation già definito sopra nel menu
    permit: 'Leave',
    sickLeave: 'Sick Leave',
    
    // ==========================================
    // CHECK-IN PAGE
    // ==========================================
    checkInTitle: 'Check-in',
    checkInSubtitle: 'Register your attendance',
    checkInNow: 'Check-in Now',
    checkOutNow: 'Check-out Now',
    checkedIn: 'Checked in',
    checkedOut: 'Checked out',
    notCheckedIn: 'Not registered',
    locationRequired: 'Location required',
    gpsError: 'GPS Error',
    outsideArea: 'Outside work area',
    
    // ==========================================
    // STATISTICS PAGE
    // ==========================================
    statisticsTitle: 'Statistics',
    statisticsSubtitle: 'Data analysis and KPIs',
    hoursBudget: 'Hours Budget',
    productivity: 'Productivity',
    trend: 'Trend',
    forecast: 'Forecast',
    performance: 'Performance',
    efficiency: 'Efficiency',
    
    // ==========================================
    // DASHBOARD PAGE
    // ==========================================
    dashboardTitle: 'Dashboard',
    dashboardSubtitle: 'General overview',
    overview: 'Overview',
    recentActivity: 'Recent Activity',
    alerts: 'Alerts',
    
    // ==========================================
    // TRANSFERS PAGE
    // ==========================================
    transfersTitle: 'Transfers',
    transfersSubtitle: 'Personnel transfer management',
    newTransfer: 'New Transfer',
    fromProject: 'From Project',
    toProject: 'To Project',
    transferDate: 'Transfer Date',
    
    // ==========================================
    // SETTINGS PAGE
    // ==========================================
    settingsTitle: 'Settings',
    settingsSubtitle: 'Project configuration',
    projectSettings: 'Project Settings',
    userSettings: 'User Settings',
    notificationSettings: 'Notification Settings',
    language: 'Language',
    theme: 'Theme',
    
    // ==========================================
    // PLANNING PAGE - Extra translations
    // ==========================================
    postponed: 'Postponed',
    blocked: 'Blocked',
    start: 'Start',
    complete: 'Complete',
    markResolved: 'Mark resolved',
    markAsResolved: 'Mark as resolved',
    componentsAvailable: 'components available',
    selectedOf: 'selected of',
    allComponentsAssigned: 'All components are already assigned',
    confirmRemoveActivity: 'Remove this activity from planning?',
    selectAtLeastOne: 'Select at least one component',
    problemResolved: 'Problem resolved',
    problemReported: 'Problem reported',
    reportedAt: 'Reported',
    describeProblem: 'Describe the problem...',
    report: 'Report',
    postponeToCW1: 'Postpone to CW+1',
    remove: 'Remove',
    componentStatus: 'Comp. status',
    completedBy: 'Completed by',
    // assignToCWTitle già definito sopra

    // ==========================================
    // IMPEDIMENTS / BLOCCHI (EN)
    // ==========================================
    impedimentsTitle: 'Impediments',
    impedimentsSubtitle: 'Blocks and issues management',
    newImpediment: 'New Impediment',
    impedimentType: 'Impediment Type',
    severity: 'Severity',
    low: 'Low',
    medium: 'Medium',
    high: 'High',
    critical: 'Critical',
    open: 'Open',
    resolved: 'Resolved',
    escalated: 'Escalated',
    
    // ==========================================
    // DATES
    // ==========================================
    monday: 'Monday',
    tuesday: 'Tuesday',
    wednesday: 'Wednesday',
    thursday: 'Thursday',
    friday: 'Friday',
    saturday: 'Saturday',
    sunday: 'Sunday',
    
    // Short days
    mon: 'Mon',
    tue: 'Tue',
    wed: 'Wed',
    thu: 'Thu',
    fri: 'Fri',
    sat: 'Sat',
    sun: 'Sun',
    
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
    
    // Short months
    jan: 'Jan',
    feb: 'Feb',
    mar: 'Mar',
    apr: 'Apr',
    mayShort: 'May',
    jun: 'Jun',
    jul: 'Jul',
    aug: 'Aug',
    sep: 'Sep',
    oct: 'Oct',
    nov: 'Nov',
    dec: 'Dec',
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
