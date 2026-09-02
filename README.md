# Scopa Online 2 vs 2

Web app multiplayer per 4 telefoni, con squadre alternate (1+3 contro 2+4), ospitata su Cloudflare Workers e sincronizzata tramite Durable Objects + WebSocket.

## Funzioni V1
- Crea stanza con codice casuale
- Entra da 4 telefoni diversi
- Riconnessione con token locale
- Mazzo italiano da 40 carte
- 3 carte per giocatore e 4 sul tavolo
- Regole di presa della Scopa
- Scelta della combinazione quando esistono più prese
- Squadre 1+3 vs 2+4
- Scope, carte, denari, settebello e primiera
- Punteggio cumulativo tra più mani
- PWA installabile

## Pubblicazione Cloudflare
1. Installa Node.js.
2. Esegui `npm install`.
3. Accedi a Cloudflare con `npx wrangler login`.
4. Avvia in locale con `npm run dev`.
5. Pubblica con `npm run deploy`.

## GitHub
Repository previsto: `scopa-online-2v2`. Può essere collegato a Cloudflare per il deploy automatico oppure pubblicato con Wrangler.

## Nota
Questa è una V1 giocabile. Le carte sono rappresentate graficamente in CSS; in una V2 si possono sostituire con immagini autentiche di carte napoletane e aggiungere animazioni, suoni, chat, invito tramite link/QR e gestione disconnessioni più avanzata.
