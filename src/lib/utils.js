/**
 * Funzioni utilità generiche
 * Formattazione date, calcoli, helper vari
 */

// ============ DATE ============

/**
 * Formatta una data in italiano
 * @param {Date|string} data 
 * @param {object} options - opzioni Intl.DateTimeFormat
 * @returns {string}
 */
export function formatData(data, options = {}) {
  const d = typeof data === 'string' ? new Date(data) : data
  const defaultOptions = {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    ...options,
  }
  return d.toLocaleDateString('it-IT', defaultOptions)
}

/**
 * Formatta data estesa (es: "Lunedì 15 Gennaio 2024")
 */
export function formatDataEstesa(data) {
  const d = typeof data === 'string' ? new Date(data) : data
  return d.toLocaleDateString('it-IT', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

/**
 * Formatta solo ora (es: "08:30")
 */
export function formatOra(data) {
  const d = typeof data === 'string' ? new Date(data) : data
  return d.toLocaleTimeString('it-IT', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

/**
 * Restituisce data in formato YYYY-MM-DD
 */
export function toISODate(data) {
  const d = typeof data === 'string' ? new Date(data) : data
  return d.toISOString().split('T')[0]
}

/**
 * Restituisce oggi in formato YYYY-MM-DD
 */
export function oggi() {
  return toISODate(new Date())
}

/**
 * Primo giorno del mese
 */
export function inizioMese(data = new Date()) {
  const d = typeof data === 'string' ? new Date(data) : new Date(data)
  return new Date(d.getFullYear(), d.getMonth(), 1)
}

/**
 * Ultimo giorno del mese
 */
export function fineMese(data = new Date()) {
  const d = typeof data === 'string' ? new Date(data) : new Date(data)
  return new Date(d.getFullYear(), d.getMonth() + 1, 0)
}

/**
 * Array di date del mese
 */
export function giorniDelMese(anno, mese) {
  const giorni = []
  const primoGiorno = new Date(anno, mese, 1)
  const ultimoGiorno = new Date(anno, mese + 1, 0)
  
  for (let d = new Date(primoGiorno); d <= ultimoGiorno; d.setDate(d.getDate() + 1)) {
    giorni.push(new Date(d))
  }
  
  return giorni
}

// ============ ORE ============

/**
 * Calcola ore totali (ordinarie + straordinario)
 */
export function calcolaOreTotali(oreOrdinarie, oreStraordinario) {
  return (parseFloat(oreOrdinarie) || 0) + (parseFloat(oreStraordinario) || 0)
}

/**
 * Formatta ore con suffisso "h"
 */
export function formatOre(ore) {
  return `${ore}h`
}

/**
 * Calcola percentuale
 */
export function percentuale(valore, totale) {
  if (!totale) return 0
  return Math.round((valore / totale) * 100)
}

// ============ VALIDAZIONE ============

/**
 * Valida email
 */
export function isEmailValida(email) {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return re.test(email)
}

/**
 * Valida ore (numero tra min e max)
 */
export function isOreValide(ore, min, max) {
  const n = parseFloat(ore)
  return !isNaN(n) && n >= min && n <= max
}

// ============ ARRAY ============

/**
 * Raggruppa array per chiave
 */
export function raggruppa(array, chiave) {
  return array.reduce((acc, item) => {
    const key = typeof chiave === 'function' ? chiave(item) : item[chiave]
    if (!acc[key]) acc[key] = []
    acc[key].push(item)
    return acc
  }, {})
}

/**
 * Somma valori di una proprietà in un array
 */
export function somma(array, chiave) {
  return array.reduce((sum, item) => sum + (parseFloat(item[chiave]) || 0), 0)
}

/**
 * Ordina array per proprietà
 */
export function ordina(array, chiave, desc = false) {
  return [...array].sort((a, b) => {
    const valA = a[chiave]
    const valB = b[chiave]
    if (valA < valB) return desc ? 1 : -1
    if (valA > valB) return desc ? -1 : 1
    return 0
  })
}

// ============ MISC ============

/**
 * Genera ID univoco semplice
 */
export function generaId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2)
}

/**
 * Debounce function
 */
export function debounce(func, wait) {
  let timeout
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout)
      func(...args)
    }
    clearTimeout(timeout)
    timeout = setTimeout(later, wait)
  }
}

/**
 * Classnames helper (come la libreria clsx)
 */
export function cn(...classes) {
  return classes.filter(Boolean).join(' ')
}
