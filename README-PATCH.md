# V1.3.3 — Fix scelta presa su mobile

Sovrascrivere:
- public/app.js
- public/sw.js

Fix:
- rimosso il rerender su focus/hover che annullava il tap;
- un tap invia subito la presa;
- anti doppio tap;
- messaggio “Presa in corso…”;
- sblocco automatico in caso di errore server.
