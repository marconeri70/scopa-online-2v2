import { ScopaRoom } from './ScopaRoom.js';
export { ScopaRoom };

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname.startsWith('/api/room/')) {
      const parts = url.pathname.split('/').filter(Boolean);
      const roomCode = (parts[2] || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8);
      if (!roomCode) return new Response('Codice stanza non valido', { status: 400 });

      const id = env.SCOPA_ROOMS.idFromName(roomCode);
      const stub = env.SCOPA_ROOMS.get(id);
      return stub.fetch(request);
    }

    return env.ASSETS.fetch(request);
  }
};
