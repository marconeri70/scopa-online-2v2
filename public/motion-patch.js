(()=>{
  let visualState = null;
  let animatedTs = 0;

  function cloneState(s){
    if(!s) return null;
    return JSON.parse(JSON.stringify({
      yourSeat:s.yourSeat,
      maxPlayers:s.maxPlayers,
      hand:s.hand,
      table:s.table,
      lastAction:s.lastAction,
      takenPreview:s.takenPreview,
      players:s.players
    }));
  }

  function injectStyles(){
    if(document.getElementById('motion-patch-styles')) return;
    const st=document.createElement('style');
    st.id='motion-patch-styles';
    st.textContent=`
      .game{grid-template-rows:auto auto 1fr auto!important}
      .game-bar{padding:8px 12px!important}
      .header-actions{display:flex;gap:6px;justify-self:end;flex-wrap:wrap}
      .score-strip{padding:8px 10px!important;gap:8px!important;background:linear-gradient(180deg,#063c2d,#052f22)!important}
      .score-card{min-height:60px!important;box-shadow:inset 0 0 0 1px rgba(255,255,255,.05),0 6px 16px rgba(0,0,0,.18)}
      .score-card strong{font-size:2.15rem!important}
      .game-table{position:relative;overflow:hidden;background:
        radial-gradient(circle at center,#1b9a61 0,#0d7448 44%,#085437 72%,#063a2b 100%)!important}
      .game-table:before{content:"";position:absolute;inset:10px;border-radius:28px;border:4px solid rgba(223,190,99,.6);box-shadow:inset 0 0 0 1px rgba(255,255,255,.12), inset 0 0 42px rgba(0,0,0,.22);pointer-events:none}
      .game-table:after{content:"";position:absolute;inset:0;pointer-events:none;background:radial-gradient(circle at 50% 48%,transparent 0 45%,rgba(0,0,0,.10) 78%,rgba(0,0,0,.24) 100%)}
      .table-info{top:14px!important;left:18px!important;right:18px!important;font-size:1rem!important;z-index:14}
      #opponents,#table,#scopeZones,.self-area,#captureBox{position:relative;z-index:12}
      #takenZones{position:absolute;inset:0;pointer-events:none;z-index:13}
      #motionLayer{position:absolute;inset:0;pointer-events:none;z-index:40;overflow:hidden}
      .table-cards{top:47%!important;transform:translate(-50%,-34%)!important;min-height:122px!important;width:min(78%,760px)!important}
      .self-area{bottom:10px!important;width:min(95%,820px)!important}
      .self-meta{margin-bottom:8px!important}
      .hand{min-height:154px!important}
      .hand .card.napoletana{width:92px!important;height:152px!important}
      .card.napoletana{box-shadow:0 10px 24px rgba(0,0,0,.36)!important;border-radius:10px!important;transform-origin:center center}
      .card.napoletana.arrive{animation:cardPop .26s ease-out}
      .card.napoletana.takeflash{animation:takeFlash .45s ease}
      @keyframes cardPop{0%{transform:translateY(-12px) scale(.92);opacity:.25}100%{transform:translateY(0) scale(1);opacity:1}}
      @keyframes takeFlash{0%{box-shadow:0 0 0 0 rgba(255,226,107,.0),0 10px 24px rgba(0,0,0,.36)}35%{box-shadow:0 0 0 5px rgba(255,226,107,.5),0 10px 24px rgba(0,0,0,.36)}100%{box-shadow:0 10px 24px rgba(0,0,0,.36)}}
      .taken-pile{position:absolute;display:flex;align-items:center;gap:5px;background:rgba(4,36,28,.88);border:1px solid rgba(255,210,74,.45);border-radius:14px;padding:6px 8px;box-shadow:0 8px 20px rgba(0,0,0,.32)}
      .taken-pile .label{font-size:.72rem;font-weight:800;color:#fff1a8;max-width:70px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
      .taken-pile .count{min-width:24px;height:24px;border-radius:999px;background:#ffd24a;color:#173325;display:grid;place-items:center;font-weight:900;font-size:.78rem;border:2px solid #fff7cf}
      .taken-card-wrap{position:relative;line-height:0}
      .taken-card-wrap .card.napoletana.mini{width:44px!important;height:72px!important;box-shadow:0 4px 12px rgba(0,0,0,.34)!important}
      .taken-top{top:92px;right:16px}
      .taken-bottom{left:16px;bottom:138px}
      .taken-left{left:14px;bottom:168px}
      .taken-right{right:14px;bottom:168px}
      .motion-clone{position:absolute;will-change:transform,opacity;pointer-events:none}
      .motion-back{width:56px;height:88px;border-radius:8px;border:3px solid #f4e1ae;background:repeating-linear-gradient(45deg,#923832 0 5px,#e3b64d 5px 10px,#244c76 10px 15px,#f0ddad 15px 20px);box-shadow:0 8px 20px rgba(0,0,0,.34)}
      .motion-back:after{content:"";position:absolute;inset:6px;border:2px solid #fff8d6;border-radius:4px}
      @media(max-width:700px){
        .score-card strong{font-size:1.75rem!important}
        .score-card{min-height:54px!important}
        .table-cards{top:47%!important;transform:translate(-50%,-30%)!important;width:86%!important}
        .card.napoletana{width:66px!important;height:110px!important}
        .hand .card.napoletana{width:76px!important;height:126px!important}
        .taken-card-wrap .card.napoletana.mini{width:38px!important;height:62px!important}
        .taken-pile{padding:5px 7px;gap:4px}
        .taken-pile .label{display:none}
        .taken-top{top:82px;right:12px}.taken-bottom{left:12px;bottom:130px}.taken-left{left:10px;bottom:150px}.taken-right{right:10px;bottom:150px}
      }
      @media(max-width:420px){
        .table-cards{width:88%!important;gap:7px!important}
        .hand .card.napoletana{width:72px!important;height:119px!important}
      }
    `;
    document.head.appendChild(st);
  }

  function ensureLayers(){
    const table=document.querySelector('.game-table');
    if(!table) return;
    if(!document.getElementById('takenZones')){
      const z=document.createElement('div');
      z.id='takenZones';
      table.appendChild(z);
    }
    if(!document.getElementById('motionLayer')){
      const m=document.createElement('div');
      m.id='motionLayer';
      table.appendChild(m);
    }
  }

  function relativeSeatsFor(st){
    const max=st.maxPlayers===2?2:4;
    const me=st.yourSeat;
    const arr=[];
    for(let offset=1; offset<max; offset++) arr.push((me+offset)%max);
    return arr;
  }

  function relationClassForSeat(st, seat){
    if(seat===st.yourSeat) return 'bottom';
    const max=st.maxPlayers===2?2:4;
    if(max===2) return 'top';
    const rel=(seat - st.yourSeat + max) % max;
    if(rel===1) return 'left';
    if(rel===2) return 'top';
    return 'right';
  }

  function takenPositionClass(rel){
    if(rel==='top') return 'taken-top';
    if(rel==='bottom') return 'taken-bottom';
    if(rel==='left') return 'taken-left';
    return 'taken-right';
  }

  function scopePulse(seat){
    const rel=relationClassForSeat(state, seat);
    const el=document.querySelector(`.scope-${rel}`);
    if(el){
      el.animate([{transform:'scale(.9)', opacity:.65},{transform:'scale(1.08)', opacity:1},{transform:'scale(1)', opacity:1}],{duration:420,easing:'ease-out'});
    }
  }

  function assignCardIds(){
    const tableCards=[...document.querySelectorAll('#table > .card.napoletana')];
    (state.table||[]).forEach((c,i)=>{ if(tableCards[i]) tableCards[i].dataset.cardId=c.id; });
    const handCards=[...document.querySelectorAll('#hand > .card.napoletana')];
    (state.hand||[]).forEach((c,i)=>{ if(handCards[i]) handCards[i].dataset.cardId=c.id; });
  }

  function snapshotDom(prev){
    const gameTable=document.querySelector('.game-table');
    if(!gameTable) return null;
    const base=gameTable.getBoundingClientRect();
    const out={ base, hand:{}, table:{}, opponentCenters:{}, deck:null };

    const handEls=[...document.querySelectorAll('#hand > .card.napoletana')];
    (prev?.hand||[]).forEach((c,i)=>{ if(handEls[i]) out.hand[c.id]=handEls[i].getBoundingClientRect(); });

    const tableEls=[...document.querySelectorAll('#table > .card.napoletana')];
    (prev?.table||[]).forEach((c,i)=>{ if(tableEls[i]) out.table[c.id]=tableEls[i].getBoundingClientRect(); });

    const oppEls=[...document.querySelectorAll('#opponents .opponent')];
    const seats = prev ? relativeSeatsFor(prev) : [];
    seats.forEach((seat,i)=>{
      const hand = oppEls[i]?.querySelector('.opponent-hand') || oppEls[i];
      if(hand) out.opponentCenters[seat]=hand.getBoundingClientRect();
    });

    const deckEl=document.getElementById('deckCount');
    if(deckEl) out.deck=deckEl.getBoundingClientRect();
    return out;
  }

  function rectCenter(rect){
    return {x:rect.left+rect.width/2, y:rect.top+rect.height/2, w:rect.width, h:rect.height};
  }

  function relRect(abs, base){
    return {left:abs.left-base.left, top:abs.top-base.top, width:abs.width, height:abs.height};
  }

  function createCardClone(card, mini=false){
    const wrap=document.createElement('div');
    wrap.className='motion-clone';
    wrap.style.width=(mini?44:72)+'px';
    wrap.style.height=(mini?72:120)+'px';
    const btn=document.createElement('button');
    btn.className='card napoletana'+(mini?' mini':'');
    btn.disabled=true;
    const img=document.createElement('img');
    img.src=`/cards/${card.suit}-${card.value}.svg`;
    img.alt='';
    btn.appendChild(img);
    wrap.appendChild(btn);
    return wrap;
  }

  function createBackClone(){
    const wrap=document.createElement('div');
    wrap.className='motion-clone';
    const back=document.createElement('div');
    back.className='motion-back';
    wrap.appendChild(back);
    return wrap;
  }

  function animateClone(clone, fromRect, toRect, duration=360, delay=0){
    const layer=document.getElementById('motionLayer');
    const base=layer.getBoundingClientRect();
    const from=relRect(fromRect, base);
    const to=relRect(toRect, base);
    clone.style.left=from.left+'px';
    clone.style.top=from.top+'px';
    clone.style.width=from.width+'px';
    clone.style.height=from.height+'px';
    clone.style.opacity='1';
    clone.style.transform='translate(0,0) scale(1)';
    layer.appendChild(clone);
    requestAnimationFrame(()=>{
      clone.style.transition=`transform ${duration}ms cubic-bezier(.2,.8,.2,1) ${delay}ms, opacity ${duration}ms ease ${delay}ms`;
      clone.style.transform=`translate(${to.left-from.left}px, ${to.top-from.top}px) scale(${to.width/from.width}, ${to.height/from.height})`;
      clone.style.opacity='0.08';
    });
    setTimeout(()=>clone.remove(), duration+delay+80);
  }

  function animateDeal(before, current){
    const deck = before?.deck;
    if(!deck) return;
    const deckPoint={left:deck.left, top:deck.top, width:30, height:20};
    const selfCards=[...document.querySelectorAll('#hand > .card.napoletana')];
    selfCards.forEach((el,i)=>{
      const r=el.getBoundingClientRect();
      animateClone(createBackClone(), deckPoint, r, 330, i*60);
      el.classList.add('arrive');
      setTimeout(()=>el.classList.remove('arrive'),400);
    });
    const opps=[...document.querySelectorAll('#opponents .opponent-hand')];
    opps.forEach((el,idx)=>{
      const r=el.getBoundingClientRect();
      for(let i=0;i<Math.min(3,current.handCounts?.[relativeSeatsFor(current)[idx]]||0);i++){
        const target={left:r.left + Math.max(0, i*10), top:r.top, width:42, height:68};
        animateClone(createBackClone(), deckPoint, target, 330, idx*80 + i*45);
      }
    });
  }

  function animatePlayedCard(before, action){
    const target=document.querySelector(`#table > .card.napoletana[data-card-id="${action.played.id}"]`);
    if(!target) return;
    const to=target.getBoundingClientRect();
    let from=null;
    if(action.seat===state.yourSeat) from=before?.hand?.[action.played.id];
    else from=before?.opponentCenters?.[action.seat] || before?.deck;
    if(!from) return;
    animateClone(createCardClone(action.played), from, to, 300, 0);
    target.classList.add('arrive');
    setTimeout(()=>target.classList.remove('arrive'),340);
  }

  function animateCapture(before, action){
    const pile=document.querySelector(`#takenZones .taken-pile[data-team="${action.team}"] .taken-card-wrap`);
    if(!pile) return;
    const target=pile.getBoundingClientRect();
    const captured = action.captured || [];
    captured.forEach((card, i)=>{
      const from=before?.table?.[card.id];
      if(from) animateClone(createCardClone(card, true), from, target, 340, i*45);
    });
    const playedFrom = action.seat===state.yourSeat ? before?.hand?.[action.played.id] : (before?.opponentCenters?.[action.seat] || before?.deck);
    if(playedFrom) animateClone(createCardClone(action.played, true), playedFrom, target, 350, captured.length*45);
    document.querySelectorAll('#table > .card.napoletana').forEach(el=>{
      if(captured.some(c=>c.id===el.dataset.cardId)){
        el.classList.add('takeflash');
        setTimeout(()=>el.classList.remove('takeflash'),450);
      }
    });
    if(action.isScopa) scopePulse(action.seat);
  }

  function renderTakenPiles(){
    ensureLayers();
    const zones=document.getElementById('takenZones');
    if(!zones || !state) return;
    zones.replaceChildren();
    const previews = Array.isArray(state.takenPreview) ? state.takenPreview : [];
    previews.forEach((info, team)=>{
      if(!info || !info.count || !info.top) return;
      const seat = Number.isInteger(info.seat) ? info.seat : team;
      const rel = relationClassForSeat(state, seat);
      const box=document.createElement('div');
      box.className=`taken-pile ${takenPositionClass(rel)}`;
      box.dataset.team=String(team);
      const label=document.createElement('div');
      label.className='label';
      label.textContent='Prese';
      const wrap=document.createElement('div');
      wrap.className='taken-card-wrap';
      wrap.appendChild(cardEl(info.top,false,true));
      const count=document.createElement('div');
      count.className='count';
      count.textContent=String(info.count);
      box.append(label, wrap, count);
      zones.appendChild(box);
    });
  }

  function decorateStateLabels(){
    const badge=document.getElementById('turnBadge');
    if(badge) badge.style.zIndex='25';
  }

  const originalRender = render;
  render = function(){
    injectStyles();
    ensureLayers();
    const before = snapshotDom(visualState);
    originalRender();
    assignCardIds();
    renderTakenPiles();
    decorateStateLabels();

    const action = state?.lastAction;
    if(action && action.ts && action.ts !== animatedTs){
      animatedTs = action.ts;
      if(action.type==='deal') animateDeal(before, state);
      if(action.type==='play') animatePlayedCard(before, action);
      if(action.type==='capture') animateCapture(before, action);
    }
    visualState = cloneState(state);
  };
})();
