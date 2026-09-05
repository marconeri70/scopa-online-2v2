import { ScopaRoom as BaseScopaRoom } from './ScopaRoom.js';

const ALLOWED_REACTIONS = new Set(['😂','😮','😡','👍','👏','😎','😭','🤝']);

export class ScopaRoom extends BaseScopaRoom {
  constructor(ctx, env) {
    super(ctx, env);
    this.reactionTimes = new Map();
  }

  // IMPORTANT: BaseScopaRoom calls this after every command.
  // We intentionally disable the immediate CPU move.
  runCpuIfNeeded() {}

  broadcastEvent(data) {
    for (const socket of this.ctx.getWebSockets()) {
      this.sendTo(socket, data);
    }
  }

  async webSocketMessage(ws, raw) {
    await this.ready;

    let msg;
    try { msg = JSON.parse(raw); } catch { return; }

    const att = ws.deserializeAttachment() || {};
    const player = this.state.players.find(p => p.token === att.token && !p.isBot);
    if (!player) return;

    // CPU step is requested by the human client only after the visible delay.
    if (msg.type === 'cpuStep') {
      try {
        if (this.state.playMode !== 'cpu') return;
        if (player.seat !== 0) return;
        if (!this.state.started || this.state.turn !== 1 || this.state.pendingCapture) return;

        this.cpuTurn();
        await this.save();
        this.broadcast();
      } catch (e) {
        this.sendTo(ws, { type:'error', message:e.message || 'Errore CPU' });
      }
      return;
    }

    // Fast emotes/reactions. They do not alter game state.
    if (msg.type === 'reaction') {
      const emoji = String(msg.emoji || '').trim();
      if (!ALLOWED_REACTIONS.has(emoji)) return;

      const now = Date.now();
      const last = this.reactionTimes.get(player.token) || 0;
      if (now - last < 900) return;
      this.reactionTimes.set(player.token, now);

      this.broadcastEvent({
        type: 'reaction',
        seat: player.seat,
        name: player.name,
        emoji,
        ts: now
      });
      return;
    }

    // All normal Scopa commands still use the tested base game engine.
    return super.webSocketMessage(ws, raw);
  }
}
