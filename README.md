# Scopa Online

Web app multiplayer per **2 oppure 4 telefoni**, ospitata su Cloudflare Workers e sincronizzata tramite Durable Objects + WebSocket.

## Modalità
- **1 contro 1**: 2 giocatori, ognuno sul proprio telefono.
- **2 contro 2**: 4 giocatori, squadre alternate 1+3 contro 2+4.

## Funzioni V1.1
- Crea stanza con codice casuale
- Scelta della modalità 2 o 4 giocatori alla creazione
- Chi entra col codice eredita automaticamente la modalità della stanza
- Riconnessione durante una partita con token locale
- Liberazione dei posti disconnessi prima dell'inizio
- Mazzo italiano da 40 carte
- 3 carte per giocatore e 4 sul tavolo
- Regole di presa della Scopa
- Scelta della combinazione quando esistono più prese
- Scope, carte, denari, settebello e primiera
- Punteggio cumulativo e vittoria a 11 punti (in caso di parità si continua)
- PWA installabile

## Pubblicazione Cloudflare
Il repository è collegabile direttamente a Cloudflare Workers. La configurazione è già inclusa in `wrangler.jsonc`.

Per uso locale:
1. `npm install`
2. `npx wrangler login`
3. `npm run dev`
4. `npm run deploy`
