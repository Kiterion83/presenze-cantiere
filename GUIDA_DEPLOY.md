# 🚀 GUIDA DEPLOY - Presenze Cantiere

## Versione: 2.0
## Data: Dicembre 2024

---

# STEP 1: CARICA I FILE SU GITHUB

## 1.1 Vai al tuo repository

1. Apri https://github.com/Kiterion83/presenze-cantiere
2. Assicurati di essere sul branch `develop`

## 1.2 Elimina i vecchi file (opzionale)

Se hai già file nel repository che vuoi sostituire:
1. Puoi eliminarli manualmente o
2. Caricare i nuovi che sovrascriveranno

## 1.3 Carica i file

### Metodo 1: Upload diretto (consigliato per te)

1. Clicca **Add file** → **Upload files**
2. Trascina TUTTI i file e le cartelle
3. Scrivi un commit message: "v2.0 - Setup completo app"
4. Seleziona **Commit directly to the develop branch**
5. Clicca **Commit changes**

### Struttura da caricare:

```
presenze-cantiere/
├── public/
│   ├── favicon.svg
│   └── manifest.json
├── src/
│   ├── components/
│   │   ├── Layout.jsx
│   │   └── LoadingScreen.jsx
│   ├── contexts/
│   │   └── AuthContext.jsx
│   ├── lib/
│   │   └── supabase.js
│   ├── pages/
│   │   ├── LoginPage.jsx
│   │   ├── HomePage.jsx
│   │   ├── CheckInPage.jsx
│   │   ├── RapportinoPage.jsx
│   │   ├── TeamPage.jsx
│   │   ├── TrasferimentiPage.jsx
│   │   └── ImpostazioniPage.jsx
│   ├── App.jsx
│   ├── main.jsx
│   └── index.css
├── .env.example
├── .gitignore
├── index.html
├── package.json
├── postcss.config.js
├── tailwind.config.js
└── vite.config.js
```

---

# STEP 2: CONFIGURA VERCEL

## 2.1 Vai su Vercel

1. Apri https://vercel.com
2. Login con il tuo account GitHub

## 2.2 Importa il progetto (se non l'hai già fatto)

1. Clicca **Add New...** → **Project**
2. Seleziona il repository `presenze-cantiere`
3. Clicca **Import**

## 2.3 Configura le variabili d'ambiente

**IMPORTANTE: Questo è il passaggio chiave!**

1. Nelle impostazioni del progetto Vercel
2. Vai su **Settings** → **Environment Variables**
3. Aggiungi queste variabili:

```
Nome: VITE_SUPABASE_URL
Valore: https://lwypgoqrtscffqkcgkos.supabase.co

Nome: VITE_SUPABASE_ANON_KEY
Valore: [la tua anon key che inizia con eyJ...]
```

**NOTA:** Devi usare la **anon key** (non la publishable key).
La trovi in Supabase → Settings → API → sotto "Project API keys"

## 2.4 Deploy

1. Torna alla dashboard del progetto
2. Clicca **Deployments** 
3. Clicca **Redeploy** (o attendi il deploy automatico)

---

# STEP 3: TROVA LA ANON KEY CORRETTA

In Supabase:

1. Vai su **Settings** (⚙️)
2. Clicca **API**
3. Nella sezione "Project API keys" trovi:
   - **anon public** - questa è quella che ti serve!
   - service_role (questa NON la devi usare nel frontend)

La anon key inizia con `eyJ...` ed è molto lunga.

---

# STEP 4: VERIFICA

## 4.1 Apri l'app

Una volta completato il deploy, Vercel ti darà un URL tipo:
```
https://presenze-cantiere-xxx.vercel.app
```

## 4.2 Testa il login

1. Apri l'URL
2. Dovresti vedere la pagina di login
3. Prova ad accedere con:
   - Email: giuseppe.pasquale@outlook.com
   - Password: [quella che hai impostato]

## 4.3 Problemi comuni

**Se vedi errori nella console:**

1. Apri Developer Tools (F12)
2. Guarda la tab Console
3. Se dice "Missing Supabase environment variables":
   - Le variabili d'ambiente non sono configurate correttamente in Vercel
   - Verifica che i nomi siano ESATTAMENTE `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`
   - Fai redeploy dopo aver aggiunto le variabili

**Se il login non funziona:**

1. Verifica in Supabase → Authentication → Users che l'utente esista
2. Verifica che l'utente abbia `auth_user_id` collegato nella tabella `persone`
3. Controlla i log di Supabase per errori

---

# RIEPILOGO FILE

| File | Descrizione |
|------|-------------|
| `package.json` | Dipendenze npm |
| `vite.config.js` | Configurazione Vite |
| `tailwind.config.js` | Configurazione Tailwind CSS |
| `postcss.config.js` | Configurazione PostCSS |
| `index.html` | HTML principale |
| `.gitignore` | File da ignorare |
| `.env.example` | Template variabili ambiente |
| `src/main.jsx` | Entry point React |
| `src/App.jsx` | Routing principale |
| `src/index.css` | Stili CSS + Tailwind |
| `src/lib/supabase.js` | Client Supabase |
| `src/contexts/AuthContext.jsx` | Gestione autenticazione |
| `src/components/Layout.jsx` | Layout con navigazione |
| `src/components/LoadingScreen.jsx` | Schermata caricamento |
| `src/pages/*.jsx` | Pagine dell'app |
| `public/manifest.json` | PWA manifest |
| `public/favicon.svg` | Icona |

---

# PROSSIMI STEP

Una volta che l'app funziona:

1. ✅ Login funzionante
2. ⏳ Testare check-in GPS
3. ⏳ Testare rapportino
4. ⏳ Aggiungere funzionalità trasferimenti completa
5. ⏳ Aggiungere notifiche
6. ⏳ Testare con più utenti

---

*Guida Deploy - App Presenze Cantiere v2.0*
*Dicembre 2024*
