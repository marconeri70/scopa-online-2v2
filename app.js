const $ = id => document.getElementById(id);
let ws = null, state = null, token = localStorage.getItem('scopa-token') || crypto.randomUUID(), roomCode = '';
localStorage.setItem('scopa-token', token);

function randomRoom(){ return Math.random().toString(36).slice(2,7).toUpperCase(); }
function showGame(){ $('home').classList.add('hidden'); $('game').classList.remove('hidden'); $('roomLabel').textContent = `Stanza ${roomCode}`; }
function suitIcon(s){ return ({denari:'🟡',coppe:'🏆',spade:'⚔️',bastoni:'🌿'})[s] || '🃏'; }
function valueName(v){ return ({1:'A',8:'F',9:'C',10:'R'})[v] || String(v); }
function cardEl(card, playable=false){
  const b=document.createElement('button'); b.type='button'; b.className=`card ${card.suit}${playable?' playable':''}`;
  b.innerHTML=`<span class="v">${valueName(card.value)} ${suitIcon(card.suit)}</span><span class="s">${card.suit}</span>`;
  b.title=`${valueName(card.value)} di ${card.suit}`;
  if(!playable) b.disabled=true;
  return b;
}

function connect(code){
  roomCode=code.toUpperCase();
  const name=($('name').value.trim()||'Giocatore').slice(0,20);
  localStorage.setItem('scopa-name',name);
  const proto=location.protocol==='https:'?'wss:':'ws:';
  ws=new WebSocket(`${proto}//${location.host}/api/room/${encodeURIComponent(roomCode)}?name=${encodeURIComponent(name)}&token=${encodeURIComponent(token)}`);
  showGame();
  $('status').textContent='Connessione…';
  ws.onmessage=e=>{ const msg=JSON.parse(e.data); if(msg.type==='state'){state=msg.state;render();} if(msg.type==='error') $('error').textContent=msg.message; };
  ws.onclose=()=>{$('status').textContent='Connessione persa. Riapri la stanza per rientrare.'};
  ws.onerror=()=>{$('error').textContent='Errore di connessione'};
}

function send(type,payload={}){ if(ws?.readyState===1) ws.send(JSON.stringify({type,...payload})); }

function render(){
  $('error').textContent='';
  $('scoreA').textContent=state.totalScore?.[0]??0; $('scoreB').textContent=state.totalScore?.[1]??0;
  const a=state.players.filter(p=>p.seat%2===0).map(p=>p.name).join(' + '); const b=state.players.filter(p=>p.seat%2===1).map(p=>p.name).join(' + ');
  $('teamA').textContent=a||'—'; $('teamB').textContent=b||'—';
  $('players').replaceChildren(...[0,1,2,3].map(seat=>{ const p=state.players.find(x=>x.seat===seat); const d=document.createElement('div'); d.className=`player ${state.started&&state.turn===seat?'turn':''}`; d.textContent=`${p?.connected?'🟢':'⚪'} ${seat+1}. ${p?.name||'In attesa…'} ${state.handCounts?.[seat]!=null?'· '+state.handCounts[seat]+' carte':''}`; return d;}));
  $('status').textContent=state.message+(state.started?` · Turno: ${state.players.find(p=>p.seat===state.turn)?.name||'?'}`:'');
  $('deckCount').textContent=`Mazzo: ${state.deckCount||0}`;
  $('table').replaceChildren(...state.table.map(c=>cardEl(c,false)));
  const canPlay=state.started&&state.yourSeat===state.turn&&!state.pendingCapture;
  $('hand').replaceChildren(...state.hand.map(c=>{ const e=cardEl(c,canPlay); if(canPlay)e.addEventListener('click',()=>send('play',{cardId:c.id})); return e;}));
  $('scopeStats').textContent=`Scope ${state.scopes?.[0]||0}–${state.scopes?.[1]||0}`; $('takenStats').textContent=`Carte prese ${state.takenCounts?.[0]||0}–${state.takenCounts?.[1]||0}`;
  const host=state.yourSeat===0; $('startBtn').classList.toggle('hidden',!(host&&!state.started&&state.round===0&&state.players.length===4));
  $('newRoundBtn').classList.toggle('hidden',!(host&&!state.started&&state.round>0)); $('resetBtn').classList.toggle('hidden',!host);
  const cap=$('captureBox'); cap.classList.toggle('hidden',!state.pendingCapture); $('captureChoices').replaceChildren();
  if(state.pendingCapture){ state.pendingCapture.choices.forEach((ids,i)=>{ const btn=document.createElement('button'); btn.type='button'; btn.textContent=`Presa ${i+1}: ${ids.join(', ')}`; btn.addEventListener('click',()=>send('capture',{cardIds:ids})); $('captureChoices').append(btn); }); }
}

$('name').value=localStorage.getItem('scopa-name')||'';
$('createBtn').addEventListener('click',()=>connect(randomRoom()));
$('joinBtn').addEventListener('click',()=>{const code=$('room').value.trim(); if(!code){$('homeMsg').textContent='Inserisci il codice stanza';return;} connect(code);});
$('startBtn').addEventListener('click',()=>send('start')); $('newRoundBtn').addEventListener('click',()=>send('newRound')); $('resetBtn').addEventListener('click',()=>send('resetMatch'));
$('leaveBtn').addEventListener('click',()=>{try{ws?.close()}catch{} location.reload();});
if('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js').catch(()=>{});
