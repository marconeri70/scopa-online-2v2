const $ = id => document.getElementById(id);
let ws = null;
let state = null;
let token = localStorage.getItem('scopa-token') || crypto.randomUUID();
let roomCode = '';
let capturePreview = [];
localStorage.setItem('scopa-token', token);

function injectPatchStyles(){
  if(document.getElementById('capture-patch-styles')) return;
  const style=document.createElement('style');
  style.id='capture-patch-styles';
  style.textContent=`
    .card.napoletana.highlighted{outline:4px solid #ffd24a;transform:translateY(-8px);box-shadow:0 0 0 4px rgba(255,210,74,.25),0 12px 22px #000a}
    .capture{position:absolute;z-index:30;left:50%;top:50%;transform:translate(-50%,-50%);background:#fff;color:#111;padding:16px;border-radius:18px;box-shadow:0 15px 45px #000a;min-width:min(92vw,360px);max-width:min(94vw,520px);text-align:center}
    .capture strong{display:block;font-size:1.45rem;margin-bottom:8px}
    #captureChoices{display:grid;gap:10px}
    .capture-caption{font-size:.85rem;font-weight:800;color:#555;margin-bottom:6px}
    .played-card-box{background:#f6f6f6;border-radius:14px;padding:10px}
    .played-card-wrap{display:flex;justify-content:center}
    .capture-option{border:2px solid #d8d8d8;border-radius:16px;background:#fafafa;padding:10px;cursor:pointer;display:grid;gap:6px;text-align:left;box-shadow:0 2px 10px rgba(0,0,0,.06)}
    .capture-option:hover,.capture-option:focus-visible,.capture-option.selected{border-color:#ffd24a;background:#fff8d8;box-shadow:0 0 0 3px rgba(255,210,74,.28)}
    .capture-option-title{font-size:1rem;font-weight:900;color:#111;text-align:center}
    .capture-option-sub{font-size:.8rem;color:#555;text-align:center}
    .choice-cards{display:flex;justify-content:center;align-items:center;gap:6px;flex-wrap:wrap}
    .choice-cards .card.napoletana.mini{width:52px;height:86px}
    @media(max-width:700px){
      .capture{padding:14px;min-width:min(92vw,320px)}
      .capture strong{font-size:1.2rem}
      .choice-cards .card.napoletana.mini{width:44px;height:73px}
    }
  `;
  document.head.append(style);
}

function randomRoom(){ return Math.random().toString(36).slice(2,7).toUpperCase(); }
function selectedMode(){ return Number(document.querySelector('input[name="mode"]:checked')?.value || 2); }
function showGame(){
  $('home').classList.add('hidden');
  $('game').classList.remove('hidden');
  document.body.classList.add('playing');
  $('roomLabel').textContent = `Stanza ${roomCode}`;
}
function valueName(v){ return ({1:'Asso',8:'Fante',9:'Cavallo',10:'Re'})[v] || String(v); }
function playerBySeat(seat){ return state.players.find(p=>p.seat===seat); }
function isHighlightedTableCard(card){ return capturePreview.includes(card.id); }

function cardEl(card, playable=false, mini=false, highlighted=false){
  const b=document.createElement('button');
  b.type='button';
  b.className=`card napoletana${playable?' playable':''}${mini?' mini':''}${highlighted?' highlighted':''}`;
  b.title=`${valueName(card.value)} di ${card.suit}`;
  b.setAttribute('aria-label', b.title);
  const img=document.createElement('img');
  img.src=`/cards/${card.suit}-${card.value}.svg`;
  img.alt=b.title;
  img.draggable=false;
  b.append(img);
  if(!playable) b.disabled=true;
  return b;
}

function backCardEl(mini=false){
  const d=document.createElement('div');
  d.className=`card-back${mini?' mini':''}`;
  d.setAttribute('aria-label','Carta coperta');
  return d;
}

function backs(count, mini=false){
  const frag=document.createDocumentFragment();
  for(let i=0;i<count;i++) frag.append(backCardEl(mini));
  return frag;
}

function connect(code, createMode=null){
  roomCode=code.toUpperCase();
  const name=($('name').value.trim()||'Giocatore').slice(0,20);
  localStorage.setItem('scopa-name',name);
  const proto=location.protocol==='https:'?'wss:':'ws:';
  const params=new URLSearchParams({name,token});
  if(createMode===2 || createMode===4) params.set('mode',String(createMode));
  ws=new WebSocket(`${proto}//${location.host}/api/room/${encodeURIComponent(roomCode)}?${params.toString()}`);
  showGame();
  $('turnBadge').textContent='Connessione…';
  ws.onmessage=e=>{
    const msg=JSON.parse(e.data);
    if(msg.type==='state'){ state=msg.state; render(); }
    if(msg.type==='error') $('error').textContent=msg.message;
  };
  ws.onclose=e=>{ $('turnBadge').textContent=e.code===1000?'Disconnesso':'Connessione persa'; };
  ws.onerror=()=>{ $('error').textContent='Errore di connessione o stanza piena'; };
}

function send(type,payload={}){ if(ws?.readyState===1) ws.send(JSON.stringify({type,...payload})); }

function relativeSeats(){
  const max=state.maxPlayers===2?2:4;
  const me=state.yourSeat;
  const out=[];
  for(let offset=1; offset<max; offset++) out.push((me+offset)%max);
  return out;
}

function relationClass(seat){
  if(seat===state.yourSeat) return 'bottom';
  const max=state.maxPlayers===2?2:4;
  if(max===2) return 'top';
  const rel=(seat - state.yourSeat + max) % max;
  if(rel===1) return 'left';
  if(rel===2) return 'top';
  return 'right';
}

function renderOpponents(){
  const wrap=$('opponents');
  wrap.replaceChildren();
  const max=state.maxPlayers===2?2:4;
  const seats=relativeSeats();

  seats.forEach((seat,index)=>{
    const p=playerBySeat(seat);
    const area=document.createElement('section');
    let pos='top';
    if(max===4){
      if(index===0) pos='left';
      else if(index===1) pos='top';
      else pos='right';
    }
    area.className=`opponent opponent-${pos}${state.started&&state.turn===seat?' active':''}`;

    const name=document.createElement('div');
    name.className='opponent-name';
    name.innerHTML=`<span>${p?.connected?'🟢':'⚪'}</span><strong>${p?.name||'In attesa…'}</strong>`;
    const hand=document.createElement('div');
    hand.className='opponent-hand';
    const count=state.handCounts?.[seat] ?? 0;
    hand.append(backs(count, max===4));
    area.append(name,hand);
    wrap.append(area);
  });
}

function renderScopeZones(){
  const zones=$('scopeZones');
  zones.replaceChildren();
  const history=Array.isArray(state.scopaHistory)?state.scopaHistory:[];
  const max=state.maxPlayers===2?2:4;

  for(let seat=0; seat<max; seat++){
    const entries=history.filter(x=>x.seat===seat);
    if(!entries.length) continue;
    const latest=entries[entries.length-1];
    const playedCard=(latest.cards||[])[0];
    if(!playedCard) continue;

    const badge=document.createElement('div');
    badge.className=`scope-badge scope-${relationClass(seat)}`;
    badge.title=`${playerBySeat(seat)?.name||`Giocatore ${seat+1}`} · ${entries.length} scopa/e`;

    const owner=document.createElement('div');
    owner.className='scope-owner';
    owner.textContent = `${playerBySeat(seat)?.name||`Giocatore ${seat+1}`}`;

    const miniWrap=document.createElement('div');
    miniWrap.className='scope-mini-card';
    miniWrap.append(cardEl(playedCard,false,true));

    const count=document.createElement('span');
    count.className='scope-count';
    count.textContent = entries.length;
    miniWrap.append(count);

    badge.append(owner, miniWrap);
    zones.append(badge);
  }
}

function buildChoiceCards(ids){
  const row=document.createElement('div');
  row.className='choice-cards';
  ids.forEach(id=>{
    const c=state.table.find(card=>card.id===id);
    if(c) row.append(cardEl(c,false,true));
  });
  return row;
}

function renderCaptureBox(){
  const cap=$('captureBox');
  const choicesWrap=$('captureChoices');
  choicesWrap.replaceChildren();

  if(!state.pendingCapture){
    capturePreview = [];
    cap.classList.add('hidden');
    return;
  }

  injectPatchStyles();
  cap.classList.remove('hidden');
  const pending = state.pendingCapture;
  if(!Array.isArray(capturePreview) || !capturePreview.length){
    capturePreview = pending.choices?.[0] ? [...pending.choices[0]] : [];
  }

  const played = document.createElement('div');
  played.className='played-card-box';
  const playedLabel=document.createElement('div');
  playedLabel.className='capture-caption';
  playedLabel.textContent='Carta giocata';
  const playedCardWrap=document.createElement('div');
  playedCardWrap.className='played-card-wrap';
  if(pending.played) playedCardWrap.append(cardEl(pending.played,false,true));
  played.append(playedLabel, playedCardWrap);
  choicesWrap.append(played);

  pending.choices.forEach((ids,i)=>{
    const btn=document.createElement('button');
    btn.type='button';
    btn.className=`capture-option${ids.join('|')===capturePreview.join('|')?' selected':''}`;

    const title=document.createElement('div');
    title.className='capture-option-title';
    title.textContent=`Presa ${i+1}`;

    const subtitle=document.createElement('div');
    subtitle.className='capture-option-sub';
    subtitle.textContent='Queste sono le carte da prendere';

    btn.append(title, subtitle, buildChoiceCards(ids));
    btn.addEventListener('mouseenter',()=>{ capturePreview=[...ids]; render(); });
    btn.addEventListener('focus',()=>{ capturePreview=[...ids]; render(); });
    btn.addEventListener('click',()=>{ capturePreview=[...ids]; send('capture',{cardIds:ids}); });
    choicesWrap.append(btn);
  });
}

function render(){
  $('error').textContent='';
  const maxPlayers=state.maxPlayers===2?2:4;
  const twoPlayers=maxPlayers===2;
  const connectedCount=state.players.filter(p=>p.connected).length;
  const me=playerBySeat(state.yourSeat);

  $('gameTitle').textContent=twoPlayers?'SCOPA · 1 vs 1':'SCOPA · 2 vs 2';
  $('scoreA').textContent=state.totalScore?.[0]??0;
  $('scoreB').textContent=state.totalScore?.[1]??0;
  $('winningScore').textContent=state.winningScore??11;

  const sideA=state.players.filter(p=>twoPlayers?p.seat===0:p.seat%2===0).map(p=>p.name).join(' + ')||'—';
  const sideB=state.players.filter(p=>twoPlayers?p.seat===1:p.seat%2===1).map(p=>p.name).join(' + ')||'—';
  $('scoreNameA').textContent=twoPlayers?sideA:'Squadra A';
  $('scoreNameB').textContent=twoPlayers?sideB:'Squadra B';
  $('selfName').textContent=me?.name||'—';

  renderOpponents();
  renderScopeZones();

  const turnName=playerBySeat(state.turn)?.name||'?';
  const myTurn=state.started && state.yourSeat===state.turn;
  if(state.started){
    $('turnBadge').textContent=myTurn?'TOCCA A TE':`Turno: ${turnName}`;
    $('turnBadge').classList.toggle('mine',myTurn);
    $('roundInfo').textContent=`Mano ${state.round}`;
  } else {
    $('turnBadge').textContent=state.winner!==null?'PARTITA TERMINATA':`${connectedCount}/${maxPlayers} collegati`;
    $('turnBadge').classList.remove('mine');
    $('roundInfo').textContent=state.message||'In attesa';
  }

  if(!state.pendingCapture) capturePreview = [];

  $('deckCount').textContent=`Mazzo: ${state.deckCount||0}`;
  $('table').replaceChildren(...state.table.map(c=>cardEl(c,false,false,isHighlightedTableCard(c))));

  const canPlay=state.started&&state.yourSeat===state.turn&&!state.pendingCapture;
  $('hand').replaceChildren(...state.hand.map(c=>{
    const e=cardEl(c,canPlay);
    if(canPlay)e.addEventListener('click',()=>send('play',{cardId:c.id}));
    return e;
  }));

  $('scopeStats').textContent=`Scope ${state.scopes?.[0]||0}–${state.scopes?.[1]||0}`;
  $('takenStats').textContent=`Prese ${state.takenCounts?.[0]||0}–${state.takenCounts?.[1]||0}`;

  const host=state.yourSeat===0;
  const allReady=connectedCount===maxPlayers;
  $('startBtn').classList.toggle('hidden',!(host&&!state.started&&state.round===0&&allReady));
  $('newRoundBtn').classList.toggle('hidden',!(host&&!state.started&&state.round>0&&state.winner===null&&allReady));
  $('resetBtn').classList.toggle('hidden',!host);

  renderCaptureBox();
}

$('name').value=localStorage.getItem('scopa-name')||'';
$('createBtn').addEventListener('click',()=>connect(randomRoom(),selectedMode()));
$('joinBtn').addEventListener('click',()=>{
  const code=$('room').value.trim();
  if(!code){ $('homeMsg').textContent='Inserisci il codice stanza'; return; }
  connect(code);
});
$('startBtn').addEventListener('click',()=>send('start'));
$('newRoundBtn').addEventListener('click',()=>send('newRound'));
$('resetBtn').addEventListener('click',()=>send('resetMatch'));
$('leaveBtn').addEventListener('click',()=>{
  try{ws?.close(1000,'Uscita volontaria');}catch{}
  document.body.classList.remove('playing');
  location.reload();
});
injectPatchStyles();
if('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js').catch(()=>{});
