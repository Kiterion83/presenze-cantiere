# 📂 STRUTTURA PROGETTO - Presenze Cantiere

Questo file ti aiuta a capire dove sta ogni cosa e quali file passare a Claude per le modifiche.

---

## 🗂️ ALBERO CARTELLE

```
presenze-cantiere/
├── public/                     # File statici
│   └── favicon.svg
│
├── src/
│   ├── main.jsx               # Entry point (NON TOCCARE)
│   ├── App.jsx                # Navigazione principale
│   ├── index.css              # Stili globali Tailwind
│   │
│   ├── pages/                 # 📱 PAGINE DELL'APP
│   │   ├── HomePage.jsx       # Login + Check-in GPS
│   │   ├── RapportinoPage.jsx # Form presenze giornaliero
│   │   ├── PresenzePage.jsx   # Matrice presenze mensile
│   │   └── StatistichePage.jsx# Grafici budget vs speso
│   │
│   ├── components/            # 🧩 COMPONENTI RIUTILIZZABILI
│   │   ├── ui/                # Elementi base UI
│   │   │   ├── Button.jsx
│   │   │   ├── Card.jsx
│   │   │   ├── Modal.jsx
│   │   │   ├── Badge.jsx
│   │   │   └── Select.jsx
│   │   │
│   │   ├── forms/             # Form specifici
│   │   │   ├── LoginForm.jsx
│   │   │   └── RapportinoForm.jsx
│   │   │
│   │   └── charts/            # Grafici
│   │       ├── BudgetChart.jsx
│   │       └── TrendChart.jsx
│   │
│   └── lib/                   # ⚙️ FUNZIONI UTILITÀ
│       ├── supabase.js        # Connessione database
│       ├── gps.js             # Geolocalizzazione
│       ├── constants.js       # Centri di costo, config
│       └── utils.js           # Funzioni helper
│
├── index.html                 # HTML base
├── package.json               # Dipendenze
├── vite.config.js             # Config Vite
├── tailwind.config.js         # Config Tailwind
├── postcss.config.js          # Config PostCSS
├── .gitignore                 # File da ignorare
├── .env.example               # Template variabili ambiente
└── STRUTTURA.md               # Questo file!
```

---

## 📱 PAGINE (src/pages/)

| File | Cosa fa | Dipende da |
|------|---------|------------|
| `HomePage.jsx` | Login, consenso privacy, check-in GPS | LoginForm, Button, Card, gps.js |
| `RapportinoPage.jsx` | Form inserimento presenze giornaliero | RapportinoForm, Card, supabase.js |
| `PresenzePage.jsx` | Matrice presenze mensile, calendario | Card, Badge, Modal |
| `StatistichePage.jsx` | Grafici budget vs speso, trend | BudgetChart, TrendChart, Card |

---

## 🧩 COMPONENTI UI (src/components/ui/)

| File | Cosa fa | Usato in |
|------|---------|----------|
| `Button.jsx` | Bottoni stilizzati (primary, secondary, danger) | Ovunque |
| `Card.jsx` | Contenitori con ombra e bordi | Ovunque |
| `Modal.jsx` | Popup/dialog | Presenze, Rapportino |
| `Badge.jsx` | Etichette colorate (stato, ruolo) | Presenze, Rapportino |
| `Select.jsx` | Menu a tendina | Rapportino, Filtri |

---

## 📝 COMPONENTI FORM (src/components/forms/)

| File | Cosa fa | Usato in |
|------|---------|----------|
| `LoginForm.jsx` | Form login con consenso privacy | HomePage |
| `RapportinoForm.jsx` | Form completo inserimento presenze | RapportinoPage |

---

## 📊 COMPONENTI GRAFICI (src/components/charts/)

| File | Cosa fa | Usato in |
|------|---------|----------|
| `BudgetChart.jsx` | Barre orizzontali budget vs speso | StatistichePage |
| `TrendChart.jsx` | Linea trend settimanale ore | StatistichePage |

---

## ⚙️ LIBRERIE UTILITÀ (src/lib/)

| File | Cosa fa |
|------|---------|
| `supabase.js` | Client Supabase, funzioni CRUD database |
| `gps.js` | getCurrentPosition, calcola distanza, verifica in area |
| `constants.js` | CENTRI_COSTO, RUOLI, configurazioni statiche |
| `utils.js` | Formattazione date, calcoli ore, helper vari |

---

## 🔧 GUIDA MODIFICHE

### Vuoi cambiare... → Passa a Claude:

| Modifica | File necessari |
|----------|----------------|
| Colore/stile bottoni | `src/components/ui/Button.jsx` |
| Layout card | `src/components/ui/Card.jsx` |
| Form login | `src/components/forms/LoginForm.jsx` |
| Form rapportino | `src/components/forms/RapportinoForm.jsx` |
| Logica GPS | `src/lib/gps.js` |
| Centri di costo | `src/lib/constants.js` |
| Grafico budget | `src/components/charts/BudgetChart.jsx` |
| Pagina intera | Il file in `src/pages/` corrispondente |
| Navigazione menu | `src/App.jsx` |
| Connessione database | `src/lib/supabase.js` |

### Modifiche multiple:
Se la modifica tocca più parti, Claude ti dirà quali file servono.

---

## 🚀 DEPLOY

1. Modifica i file localmente o su GitHub
2. Push su branch `main`
3. Vercel rileva automaticamente e pubblica
4. Verifica su URL Vercel

---

## ⚠️ FILE DA NON TOCCARE

- `main.jsx` - Entry point, non modificare
- `vite.config.js` - Solo se sai cosa fai
- `package.json` - Solo per aggiungere librerie

---

## 📞 SUPPORTO

Per modifiche, passa a Claude:
1. Questo file STRUTTURA.md (opzionale, per contesto)
2. I file specifici da modificare (vedi tabella sopra)
