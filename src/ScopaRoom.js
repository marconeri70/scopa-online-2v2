const SUITS = ['denari', 'coppe', 'spade', 'bastoni'];

function createDeck() {
  const deck = [];
  for (const suit of SUITS) {
    for (let value = 1; value <= 10; value++) deck.push({ suit, value, id: `${suit}-${value}` });
  }
  return deck;
}

function shuffle(deck) {
  const a = [...deck];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function possibleCaptures(table, played) {
  const same = table.filter(c => c.value === played.value);
  if (same.length) return same.map(c => [c.id]);

  const cards = [...table].sort((a, b) => b.value - a.value);
  const out = [];
  const seen = new Set();

  function walk(start, remaining, picked) {
    if (remaining === 0) {
      const ids = picked.map(c => c.id).sort();
      const key = ids.join('|');
      if (!seen.has(key)) {
        seen.add(key);
        out.push(ids);
      }
      return;
    }
    for (let i = start; i < cards.length; i++) {
      const card = cards[i];
      if (card.value > remaining) continue;
      picked.push(card);
      walk(i + 1, remaining - card.value, picked);
      picked.pop();
    }
  }

  walk(0, played.value, []);
  return out;
}

function primieraCardScore(value) {
  return ({ 7: 21, 6: 18, 1: 16, 5: 15, 4: 14, 3: 13, 2: 12, 8: 10, 9: 10, 10: 10 })[value] || 0;
}

function calculateRoundPoints(taken, scopes) {
  const result = [0, 0];
  const cardsByTeam = [taken[0] || [], taken[1] || []];

  if (cardsByTeam[0].length > cardsByTeam[1].length) result[0]++;
  if (cardsByTeam[1].length > cardsByTeam[0].length) result[1]++;

  const denari = cardsByTeam.map(arr => arr.filter(c => c.suit === 'denari').length);
  if (denari[0] > denari[1]) result[0]++;
  if (denari[1] > denari[0]) result[1]++;

  for (let t = 0; t < 2; t++) {
    if (cardsByTeam[t].some(c => c.suit === 'denari' && c.value === 7)) result[t]++;
  }

  const primiera = cardsByTeam.map(arr => {
    let total = 0;
    for (const suit of SUITS) {
      const suitCards = arr.filter(c => c.suit === suit);
      if (!suitCards.length) return -1;
      total += Math.max(...suitCards.map(c => primieraCardScore(c.value)));
    }
    return total;
  });
  if (primiera[0] > primiera[1]) result[0]++;
  if (primiera[1] > primiera[0]) result[1]++;

  result[0] += scopes[0] || 0;
  result[1] += scopes[1] || 0;
  return result;
}

export class ScopaRoom {
  constructor(ctx, env) {
    this.ctx = ctx;
    this.env = env;
    this.state = null;
    this.ready = this.ctx.blockConcurrencyWhile(async () => {
      this.state = await this.ctx.storage.get('state') || this.initialState();
      this.normalizeState();
    });
  }

  initialState() {
    return {
      players: [],
      maxPlayers: 4,
      winningScore: 11,
      winner: null,
      started: false,
      round: 0,
      dealer: 0,
      turn: 0,
      deck: [],
      table: [],
      hands: [[], [], [], []],
      taken: [[], []],
      scopes: [0, 0],
      totalScore: [0, 0],
      lastCaptureTeam: null,
      pendingCapture: null,
      message: 'In attesa dei giocatori'
    };
  }

  normalizeState() {
    if (this.state.maxPlayers !== 2 && this.state.maxPlayers !== 4) this.state.maxPlayers = 4;
    if (!Array.isArray(this.state.hands) || this.state.hands.length < 4) this.state.hands = [[], [], [], []];
    if (!Array.isArray(this.state.totalScore)) this.state.totalScore = [0, 0];
    if (!Array.isArray(this.state.taken)) this.state.taken = [[], []];
    if (!Array.isArray(this.state.scopes)) this.state.scopes = [0, 0];
    if (!Number.isFinite(this.state.winningScore)) this.state.winningScore = 11;
    if (this.state.winner === undefined) this.state.winner = null;
  }

  teamOfSeat(seat) {
    return this.state.maxPlayers === 2 ? seat : seat % 2;
  }

  configureMode(rawMode) {
    const mode = Number(rawMode);
    if (mode !== 2 && mode !== 4) return;
    if (!this.state.started && this.state.round === 0 && this.state.players.length === 0) {
      this.state.maxPlayers = mode;
    }
  }

  async fetch(request) {
    await this.ready;
    const url = new URL(request.url);

    if (request.headers.get('Upgrade') === 'websocket') {
      this.configureMode(url.searchParams.get('mode'));
      const name = (url.searchParams.get('name') || 'Giocatore').trim().slice(0, 20);
      const token = (url.searchParams.get('token') || crypto.randomUUID()).slice(0, 80);
      const player = this.ensurePlayer(token, name);
      if (!player) return new Response('Stanza piena', { status: 409 });

      const pair = new WebSocketPair();
      const client = pair[0];
      const server = pair[1];
      this.ctx.acceptWebSocket(server, [token]);
      server.serializeAttachment({ token, name });

      await this.save();
      this.broadcast();
      this.sendTo(server, { type: 'welcome', token, seat: player.seat });
      return new Response(null, { status: 101, webSocket: client });
    }

    if (request.method === 'GET' && url.pathname.endsWith('/state')) {
      return Response.json(this.publicState());
    }

    return new Response('Scopa room', { status: 200 });
  }

  ensurePlayer(token, name) {
    let p = this.state.players.find(x => x.token === token);
    if (p) {
      p.name = name || p.name;
      p.connected = true;
      return p;
    }
    if (this.state.players.length >= this.state.maxPlayers) return null;
    p = { token, name, seat: this.state.players.length, connected: true };
    this.state.players.push(p);
    return p;
  }

  async webSocketMessage(ws, raw) {
    await this.ready;
    let msg;
    try { msg = JSON.parse(raw); } catch { return; }
    const att = ws.deserializeAttachment() || {};
    const player = this.state.players.find(p => p.token === att.token);
    if (!player) return;

    try {
      if (msg.type === 'start') this.startGame(player);
      if (msg.type === 'play') this.playCard(player, msg.cardId);
      if (msg.type === 'capture') this.chooseCapture(player, msg.cardIds || []);
      if (msg.type === 'newRound') this.newRound(player);
      if (msg.type === 'resetMatch') this.resetMatch(player);
      await this.save();
      this.broadcast();
    } catch (e) {
      this.sendTo(ws, { type: 'error', message: e.message || 'Errore' });
    }
  }

  async webSocketClose(ws) {
    await this.ready;
    const att = ws.deserializeAttachment() || {};
    const p = this.state.players.find(x => x.token === att.token);
    if (!p) return;

    if (!this.state.started && this.state.round === 0) {
      this.state.players = this.state.players.filter(x => x.token !== att.token);
      this.state.players.forEach((player, i) => { player.seat = i; });
    } else {
      p.connected = false;
    }
    await this.save();
    this.broadcast();
  }

  startGame(player) {
    if (player.seat !== 0) throw new Error('Solo chi crea la stanza può iniziare');
    if (this.state.players.length !== this.state.maxPlayers || this.state.players.some(p => !p.connected)) {
      throw new Error(`Servono ${this.state.maxPlayers} giocatori collegati`);
    }
    this.state.totalScore = this.state.totalScore || [0, 0];
    this.state.winner = null;
    this.setupRound();
  }

  setupRound() {
    this.state.started = true;
    this.state.round += 1;
    this.state.deck = shuffle(createDeck());
    this.state.table = this.state.deck.splice(0, 4);
    this.state.hands = [[], [], [], []];
    this.state.taken = [[], []];
    this.state.scopes = [0, 0];
    this.state.lastCaptureTeam = null;
    this.state.pendingCapture = null;
    this.state.turn = (this.state.dealer + 1) % this.state.maxPlayers;
    this.dealThreeEach();
    this.state.message = `Mano ${this.state.round}`;
  }

  dealThreeEach() {
    for (let r = 0; r < 3; r++) {
      for (let offset = 1; offset <= this.state.maxPlayers; offset++) {
        const seat = (this.state.dealer + offset) % this.state.maxPlayers;
        if (this.state.deck.length) this.state.hands[seat].push(this.state.deck.shift());
      }
    }
  }

  playCard(player, cardId) {
    if (!this.state.started) throw new Error('Partita non iniziata');
    if (this.state.pendingCapture) throw new Error('Completa prima la presa');
    if (player.seat !== this.state.turn) throw new Error('Non è il tuo turno');
    const hand = this.state.hands[player.seat];
    const idx = hand.findIndex(c => c.id === cardId);
    if (idx < 0) throw new Error('Carta non disponibile');
    const played = hand.splice(idx, 1)[0];
    const choices = possibleCaptures(this.state.table, played);

    if (choices.length === 0) {
      this.state.table.push(played);
      this.advanceTurn();
      return;
    }

    if (choices.length === 1) {
      this.applyCapture(player.seat, played, choices[0]);
      return;
    }

    this.state.pendingCapture = { seat: player.seat, played, choices };
    this.state.message = 'Scegli quali carte prendere';
  }

  chooseCapture(player, cardIds) {
    const p = this.state.pendingCapture;
    if (!p || p.seat !== player.seat) throw new Error('Nessuna scelta di presa disponibile');
    const key = [...cardIds].sort().join('|');
    const valid = p.choices.find(c => [...c].sort().join('|') === key);
    if (!valid) throw new Error('Combinazione non valida');
    this.state.pendingCapture = null;
    this.applyCapture(player.seat, p.played, valid);
  }

  applyCapture(seat, played, capturedIds) {
    const team = this.teamOfSeat(seat);
    const captured = [];
    this.state.table = this.state.table.filter(c => {
      if (capturedIds.includes(c.id)) { captured.push(c); return false; }
      return true;
    });
    this.state.taken[team].push(played, ...captured);
    this.state.lastCaptureTeam = team;

    const allHandsEmpty = this.activeHandsEmpty();
    const noCardsToDeal = this.state.deck.length === 0;
    if (this.state.table.length === 0 && !(allHandsEmpty && noCardsToDeal)) this.state.scopes[team]++;
    this.advanceTurn();
  }

  activeHandsEmpty() {
    return this.state.hands.slice(0, this.state.maxPlayers).every(h => h.length === 0);
  }

  advanceTurn() {
    this.state.turn = (this.state.turn + 1) % this.state.maxPlayers;
    if (this.activeHandsEmpty()) {
      if (this.state.deck.length > 0) {
        this.dealThreeEach();
      } else {
        this.finishRound();
      }
    }
  }

  finishRound() {
    if (this.state.table.length && this.state.lastCaptureTeam !== null) {
      this.state.taken[this.state.lastCaptureTeam].push(...this.state.table);
      this.state.table = [];
    }
    const pts = calculateRoundPoints(this.state.taken, this.state.scopes);
    this.state.totalScore[0] += pts[0];
    this.state.totalScore[1] += pts[1];
    this.state.started = false;
    this.state.dealer = (this.state.dealer + 1) % this.state.maxPlayers;

    const [a,b] = this.state.totalScore;
    if ((a >= this.state.winningScore || b >= this.state.winningScore) && a !== b) {
      this.state.winner = a > b ? 0 : 1;
      const label = this.state.maxPlayers === 2 ? `Giocatore ${this.state.winner + 1}` : `Squadra ${this.state.winner === 0 ? 'A' : 'B'}`;
      this.state.message = `${label} vince ${a}–${b}!`;
    } else {
      this.state.winner = null;
      this.state.message = `Mano finita: +${pts[0]} / +${pts[1]} · Totale ${a}–${b}`;
    }
  }

  newRound(player) {
    if (player.seat !== 0) throw new Error('Solo il creatore può avviare la nuova mano');
    if (this.state.started) throw new Error('La mano è ancora in corso');
    if (this.state.winner !== null) throw new Error('Partita terminata: azzera per ricominciare');
    if (this.state.players.length !== this.state.maxPlayers || this.state.players.some(p => !p.connected)) {
      throw new Error(`Servono ${this.state.maxPlayers} giocatori collegati`);
    }
    this.setupRound();
  }

  resetMatch(player) {
    if (player.seat !== 0) throw new Error('Solo il creatore può azzerare la partita');
    const players = this.state.players;
    const maxPlayers = this.state.maxPlayers;
    this.state = this.initialState();
    this.state.players = players;
    this.state.maxPlayers = maxPlayers;
    this.state.players.forEach((p, i) => { p.seat = i; });
    this.state.message = `Nuova partita · ${maxPlayers} giocatori`;
  }

  publicStateFor(token) {
    const viewer = this.state.players.find(p => p.token === token);
    const seat = viewer?.seat ?? -1;
    return {
      players: this.state.players.map(p => ({ name: p.name, seat: p.seat, connected: p.connected })),
      maxPlayers: this.state.maxPlayers,
      winningScore: this.state.winningScore,
      winner: this.state.winner,
      started: this.state.started,
      round: this.state.round,
      dealer: this.state.dealer,
      turn: this.state.turn,
      table: this.state.table,
      hand: seat >= 0 ? this.state.hands[seat] : [],
      handCounts: this.state.hands.slice(0, this.state.maxPlayers).map(h => h.length),
      deckCount: this.state.deck.length,
      scopes: this.state.scopes,
      takenCounts: this.state.taken.map(a => a.length),
      totalScore: this.state.totalScore,
      pendingCapture: this.state.pendingCapture && this.state.pendingCapture.seat === seat ? {
        played: this.state.pendingCapture.played,
        choices: this.state.pendingCapture.choices
      } : null,
      message: this.state.message,
      yourSeat: seat
    };
  }

  publicState() {
    return {
      players: this.state.players.map(p => ({ name: p.name, seat: p.seat, connected: p.connected })),
      maxPlayers: this.state.maxPlayers,
      started: this.state.started,
      totalScore: this.state.totalScore,
      winner: this.state.winner,
      round: this.state.round
    };
  }

  broadcast() {
    for (const ws of this.ctx.getWebSockets()) {
      const att = ws.deserializeAttachment() || {};
      this.sendTo(ws, { type: 'state', state: this.publicStateFor(att.token) });
    }
  }

  sendTo(ws, data) {
    try { ws.send(JSON.stringify(data)); } catch {}
  }

  async save() {
    await this.ctx.storage.put('state', this.state);
  }
}
