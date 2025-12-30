# Icone PWA - Presenze Cantiere

Per completare l'installazione PWA, devi creare le icone dell'app.

## Metodo Rapido

1. Vai su https://realfavicongenerator.net/
2. Carica un'immagine quadrata (almeno 512x512px)
3. Scarica il pacchetto generato
4. Estrai i file nella cartella `public/icons/`

## Icone Necessarie

Crea una cartella `public/icons/` e inserisci:

- icon-72x72.png
- icon-96x96.png
- icon-128x128.png
- icon-144x144.png
- icon-152x152.png
- icon-192x192.png
- icon-384x384.png
- icon-512x512.png

## Icona Semplice

Se non hai un'icona, puoi usare un emoji come placeholder:

1. Vai su https://emoji.aranja.com/
2. Cerca "construction" o "building"
3. Scarica in varie dimensioni

## Struttura Finale

```
public/
├── icons/
│   ├── icon-72x72.png
│   ├── icon-96x96.png
│   ├── icon-128x128.png
│   ├── icon-144x144.png
│   ├── icon-152x152.png
│   ├── icon-192x192.png
│   ├── icon-384x384.png
│   └── icon-512x512.png
├── manifest.json
├── sw.js
└── offline.html
```

## Test PWA

1. Deploya l'app su Vercel
2. Apri Chrome DevTools > Application > Manifest
3. Verifica che non ci siano errori
4. Prova "Install app" dal browser
