/**
 * Costanti e configurazioni dell'applicazione
 * Centri di costo, ruoli, e altre configurazioni statiche
 */

// Centri di costo - Fasi costruzione centrale compressione
export const CENTRI_COSTO = [
  { codice: 'CC-001', fase: 'Preparazione Sito', budgetOre: 120 },
  { codice: 'CC-002', fase: 'Opere Civili', budgetOre: 450 },
  { codice: 'CC-003', fase: 'Montaggio Skid Compressori', budgetOre: 280 },
  { codice: 'CC-004', fase: 'Piping Processo', budgetOre: 520 },
  { codice: 'CC-005', fase: 'Piping Utilities', budgetOre: 180 },
  { codice: 'CC-006', fase: 'Impianto Elettrico', budgetOre: 340 },
  { codice: 'CC-007', fase: 'Strumentazione', budgetOre: 220 },
  { codice: 'CC-008', fase: 'Sistema Controllo', budgetOre: 160 },
  { codice: 'CC-009', fase: 'Coibentazione', budgetOre: 90 },
  { codice: 'CC-010', fase: 'Verniciatura', budgetOre: 70 },
  { codice: 'CC-011', fase: 'Pre-Commissioning', budgetOre: 200 },
  { codice: 'CC-012', fase: 'Commissioning', budgetOre: 150 },
]

// Budget totale
export const BUDGET_TOTALE = CENTRI_COSTO.reduce((sum, cc) => sum + cc.budgetOre, 0)

// Ruoli utente
export const RUOLI = {
  FOREMAN: 'Foreman',
  SUPERVISOR: 'Supervisor',
  ADMIN: 'Admin',
}

// Stati rapportino
export const STATI_RAPPORTINO = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
}

// Configurazione orari
export const CONFIG_ORARI = {
  MIN_ORE_ORDINARIE: 4,
  MAX_ORE_ORDINARIE: 10,
  MIN_ORE_STRAORDINARIO: 0,
  MAX_ORE_STRAORDINARIO: 4,
  ORE_GIORNATA_STANDARD: 8,
}

// Specializzazioni operai
export const SPECIALIZZAZIONI = [
  'Saldatore',
  'Tubista',
  'Elettricista',
  'Strumentista',
  'Meccanico',
  'Carpentiere',
  'Gruista',
  'Manovale',
  'Capo Squadra',
]

// Tipi assenza
export const TIPI_ASSENZA = [
  { value: 'ferie', label: 'Ferie' },
  { value: 'permesso', label: 'Permesso' },
  { value: 'malattia', label: 'Malattia' },
  { value: 'infortunio', label: 'Infortunio' },
]

// Colori per grafici
export const COLORI_GRAFICO = {
  budget: '#94a3b8',      // slate-400
  speso: '#3b82f6',       // blue-500
  overBudget: '#ef4444',  // red-500
  underBudget: '#22c55e', // green-500
}

// Soglie alert budget
export const SOGLIE_BUDGET = {
  OK: 80,           // < 80% = verde
  ATTENZIONE: 100,  // 80-100% = giallo
  // > 100% = rosso
}

// Giorni settimana
export const GIORNI_SETTIMANA = ['Dom', 'Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab']

// Mesi
export const MESI = [
  'Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
  'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'
]
