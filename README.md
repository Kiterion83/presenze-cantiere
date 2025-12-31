# PTS - Project Tracking System

<div align="center">
  <img src="public/favicon.svg" alt="PTS Logo" width="120" />
  <h3>Sistema Digitale per la Gestione di Cantieri</h3>
</div>

---

## 🎯 Funzionalità

### Per tutti gli utenti
- ✅ **Check-in/out GPS** - Registrazione presenze con geolocalizzazione
- ✅ **Calendario** - Visualizzazione presenze personali
- ✅ **Ferie/Permessi** - Richieste con workflow di approvazione multi-livello

### Per Foreman+
- ✅ **Team** - Gestione squadra assegnata
- ✅ **Rapportino** - Compilazione giornaliera con ore, quantità e performance
- ✅ **Documenti** - Gestione documentale
- ✅ **Notifiche** - Sistema notifiche in-app
- ✅ **Trasferimenti** - Richieste di spostamento personale

### Per Supervisor+
- ✅ **Dashboard** - Panoramica real-time del cantiere
- ✅ **Statistiche** - Report e analisi dettagliate
- ✅ **KPI** - Monitoraggio performance e rese

### Per Admin
- ✅ **Impostazioni** - Configurazione completa del sistema
- ✅ **Multi-progetto** - Gestione di più cantieri
- ✅ **Flussi approvazione** - Configurazione workflow personalizzati

---

## 🏗️ Stack Tecnologico

| Componente | Tecnologia |
|------------|------------|
| **Frontend** | React 18 + Vite |
| **Styling** | Tailwind CSS |
| **Backend** | Supabase (PostgreSQL + Auth) |
| **Hosting** | Vercel |
| **GPS** | Geolocation API |
| **Meteo** | OpenWeatherMap API |

---

## 📋 Gerarchia Ruoli

```
Admin
  └── PM (Project Manager)
       ├── CM (Construction Manager)
       │    └── Supervisor
       │         └── Foreman
       │              └── Helper
       │
       └── Dept. Manager
            └── Office
```

---

## 🚀 Quick Start

### Prerequisiti
- Node.js 18+
- Account Supabase
- Account Vercel (opzionale)

### Installazione

```bash
# Clone repository
git clone https://github.com/tuousername/project-tracking-system.git
cd project-tracking-system

# Installa dipendenze
npm install

# Configura variabili ambiente
cp .env.example .env
# Modifica .env con le tue credenziali Supabase

# Avvia in sviluppo
npm run dev
```

### Variabili Ambiente

```env
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
VITE_OPENWEATHERMAP_API_KEY=xxxxx
```

---

## 📱 PWA

L'applicazione è installabile come Progressive Web App:

1. Apri il sito su Chrome/Safari
2. Clicca "Aggiungi a Home"
3. Usa come app nativa

Funzionalità PWA:
- ✅ Installabile su device
- ✅ Notifiche push
- ✅ Icona personalizzata
- ✅ Splash screen

---

## 📊 Database Schema

Il sistema utilizza oltre 20 tabelle interconnesse con Row Level Security (RLS):

- `persone` - Anagrafica utenti
- `progetti` - Lista cantieri
- `assegnazioni_progetto` - Assegnazioni utente-progetto
- `presenze` - Registrazioni check-in/out
- `rapportini` - Rapportini giornalieri
- `dettagli_rapportino` - Righe rapportino
- `centri_costo` - Voci di budget
- `richieste_assenze` - Ferie/permessi
- `flussi_approvazione` - Configurazione workflow
- ... e altre

---

## 🔐 Sicurezza

- **JWT Authentication** via Supabase Auth
- **Row Level Security** su tutte le tabelle
- **HTTPS** enforced
- **GDPR Compliant**

---

## 📄 Licenza

Questo software è proprietario e riservato ad uso interno.

---

## 📞 Supporto

Per assistenza tecnica:
- Email: support@example.com
- Documentazione: [Link al manuale]

---

<div align="center">
  <p><strong>PTS - Project Tracking System</strong></p>
  <p>v1.0.0 - Gennaio 2025</p>
</div>
