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
      /* V1.6.1 — layout ordinato: ogni elemento ha una zona precisa */
      .game{grid-template-rows:auto auto 1fr auto!important}
      .game-bar{padding:6px 10px!important;min-height:54px!important}
      .header-actions{display:flex;gap:5px;justify-self:end;align-items:center;flex-wrap:nowrap}
      .header-actions .small{min-height:34px!important;padding:5px 9px!important;font-size:.78rem!important}

      .score-strip{padding:6px 9px!important;gap:7px!important;background:linear-gradient(180deg,#063c2d,#052f22)!important}
      .score-card{min-height:52px!important;padding:6px 10px!important;box-shadow:inset 0 0 0 1px rgba(255,255,255,.05),0 4px 12px rgba(0,0,0,.18)}
      .score-card strong{font-size:1.8rem!important}
      .score-middle{padding:0 5px!important}

      .game-table{position:relative!important;overflow:hidden!important;background:radial-gradient(circle at 50% 44%,#178957 0,#0d7047 47%,#085236 74%,#06382a 100%)!important}
      .game-table:before{content:"";position:absolute;inset:9px;border-radius:26px;border:3px solid rgba(223,190,99,.58);box-shadow:inset 0 0 0 1px rgba(255,255,255,.10), inset 0 0 42px rgba(0,0,0,.20);pointer-events:none}
      .game-table:after{content:"";position:absolute;inset:0;pointer-events:none;background:radial-gradient(circle at 50% 46%,transparent 0 50%,rgba(0,0,0,.08) 78%,rgba(0,0,0,.18) 100%)}

      .table-info{position:absolute!important;top:13px!important;left:20px!important;right:20px!important;font-size:.95rem!important;z-index:15!important}
      .opponents{position:absolute!important;inset:0!important;z-index:12!important}
      .scope-zones{position:absolute!important;inset:0!important;z-index:13!important}
      .self-area{position:absolute!important;left:50%!important;bottom:8px!important;transform:translateX(-50%)!important;width:min(92%,800px)!important;z-index:14!important}
      #table{position:absolute!important;z-index:11!important}
      #captureBox{position:absolute!important;z-index:35!important}
      #takenZones{position:absolute;inset:0;pointer-events:none;z-index:13}
      #motionLayer{position:absolute;inset:0;pointer-events:none;z-index:40;overflow:hidden}

      /* Avversario: solo zona alta */
      .opponent-top{top:54px!important;left:50%!important;transform:translateX(-50%)!important}
      .opponent-name{font-size:.86rem!important;padding:5px 10px!important}
      .opponent-hand{padding-left:10px!important}
      .card-back{width:46px!important;height:73px!important;margin-left:-14px!important}
      .card-back:first-child{margin-left:0!important}

      /* Carte sul tavolo: SOLO al centro, lontane da nomi e mano */
      .table-cards{left:50%!important;top:46%!important;transform:translate(-50%,-50%)!important;width:min(72%,690px)!important;min-height:215px!important;gap:9px!important;align-content:center!important}
      .table-cards .card.napoletana{width:72px!important;height:120px!important}

      /* Giocatore: fascia dedicata in basso */
      .self-meta{margin:0 auto 5px!important;padding:0 3px!important;justify-content:center!important}
      .self-tag{padding:5px 11px!important}
      .mini-stats{display:none!important}
      .hand{min-height:138px!important;padding:2px 0!important;gap:9px!important;flex-wrap:nowrap!important}
      .hand .card.napoletana{width:82px!important;height:136px!important}

      .card.napoletana{box-shadow:0 7px 18px rgba(0,0,0,.34)!important;border-radius:9px!important;transform-origin:center center}
      .card.napoletana.arrive{animation:cardPop .26s ease-out}
      .card.napoletana.takeflash{animation:takeFlash .45s ease}
      @keyframes cardPop{0%{transform:translateY(-10px) scale(.94);opacity:.3}100%{transform:translateY(0) scale(1);opacity:1}}
      @keyframes takeFlash{0%{box-shadow:0 0 0 0 rgba(255,226,107,0),0 7px 18px rgba(0,0,0,.34)}35%{box-shadow:0 0 0 5px rgba(255,226,107,.45),0 7px 18px rgba(0,0,0,.34)}100%{box-shadow:0 7px 18px rgba(0,0,0,.34)}}

      /* Prese: colonna SINISTRA. Scope: colonna DESTRA. Mai sopra le carte */
      .taken-pile{position:absolute!important;display:flex!important;flex-direction:column!important;align-items:center!important;gap:3px!important;background:rgba(4,36,28,.90)!important;border:1px solid rgba(255,210,74,.45)!important;border-radius:12px!important;padding:5px!important;box-shadow:0 6px 15px rgba(0,0,0,.30)!important;min-width:54px!important}
      .taken-pile .label{font-size:.62rem!important;font-weight:800!important;color:#fff1a8!important;max-width:55px!important;text-align:center!important}
      .taken-pile .count{min-width:22px!important;height:22px!important;border-radius:999px!important;background:#ffd24a!important;color:#173325!important;display:grid!important;place-items:center!important;font-weight:900!important;font-size:.74rem!important;border:2px solid #fff7cf!important;margin-top:-8px!important;align-self:flex-end!important}
      .taken-card-wrap{position:relative;line-height:0}
      .taken-card-wrap .card.napoletana.mini{width:39px!important;height:65px!important;box-shadow:0 3px 9px rgba(0,0,0,.30)!important}
      .taken-top{left:18px!important;right:auto!important;top:132px!important;bottom:auto!important}
      .taken-bottom{left:18px!important;right:auto!important;bottom:158px!important;top:auto!important}
      .taken-left{left:16px!important;right:auto!important;top:50%!important;bottom:auto!important;transform:translateY(-50%)!important}
      .taken-right{left:16px!important;right:auto!important;top:62%!important;bottom:auto!important}

      .scope-badge{padding:5px!important;min-width:48px!important;background:rgba(4,36,28,.90)!important}
      .scope-owner{display:none!important}
      .scope-mini-card .card.napoletana.mini{width:39px!important;height:65px!important}
      .scope-top{right:18px!important;left:auto!important;top:132px!important;bottom:auto!important}
      .scope-bottom{right:18px!important;left:auto!important;bottom:158px!important;top:auto!important}
      .scope-left{right:16px!important;left:auto!important;top:50%!important;bottom:auto!important}
      .scope-right{right:16px!important;left:auto!important;top:62%!important;bottom:auto!important}

      .motion-clone{position:absolute;will-change:transform,opacity;pointer-events:none}
      .motion-back{width:48px;height:76px;border-radius:7px;border:3px solid #f4e1ae;background:repeating-linear-gradient(45deg,#923832 0 5px,#e3b64d 5px 10px,#244c76 10px 15px,#f0ddad 15px 20px);box-shadow:0 6px 16px rgba(0,0,0,.32)}
      .motion-back:after{content:"";position:absolute;inset:6px;border:2px solid #fff8d6;border-radius:4px}

      .bottom-actions{min-height:44px!important;padding:5px 10px!important}
      .bottom-actions button{min-height:36px!important;padding:6px 12px!important;font-size:.85rem!important}

      @media(max-width:700px){
        .game-bar{grid-template-columns:1fr auto auto!important;gap:5px!important;padding:5px 8px!important}
        .brand strong{font-size:1rem!important;line-height:1.05!important}
        .brand small{display:none!important}
        .turn-badge{grid-column:auto!important;grid-row:auto!important;order:0!important;padding:5px 9px!important;font-size:.76rem!important;white-space:nowrap!important}
        .header-actions{grid-column:auto!important;grid-row:auto!important}
        .header-actions .share-btn,.header-actions .copy-btn{display:none!important}
        .header-actions .leave{display:block!important}

        .score-strip{padding:5px 7px!important;gap:5px!important}
        .score-card{min-height:46px!important;padding:5px 8px!important;border-radius:13px!important}
        .score-card strong{font-size:1.45rem!important}
        .score-side-label{font-size:.72rem!important}
        .score-middle span{font-size:.78rem!important}
        .score-middle small{font-size:.64rem!important}

        .table-info{top:12px!important;left:15px!important;right:15px!important;font-size:.85rem!important}
        .opponent-top{top:45px!important}
        .opponent-name{font-size:.78rem!important;padding:4px 8px!important}
        .card-back{width:40px!important;height:64px!important;margin-left:-12px!important}

        .table-cards{top:45%!important;width:72%!important;min-height:205px!important;gap:7px!important}
        .table-cards .card.napoletana{width:60px!important;height:100px!important}

        .self-area{bottom:5px!important;width:88%!important}
        .self-tag{font-size:.9rem!important;padding:4px 9px!important}
        .hand{min-height:123px!important;gap:7px!important}
        .hand .card.napoletana{width:72px!important;height:119px!important}

        .taken-card-wrap .card.napoletana.mini,.scope-mini-card .card.napoletana.mini{width:34px!important;height:56px!important}
        .taken-pile{min-width:46px!important;padding:4px!important}
        .taken-pile .label{font-size:.56rem!important}
        .taken-pile .count{min-width:20px!important;height:20px!important;font-size:.68rem!important}
        .taken-top{left:12px!important;top:115px!important}.taken-bottom{left:12px!important;bottom:132px!important}
        .scope-top{right:12px!important;top:115px!important}.scope-bottom{right:12px!important;bottom:132px!important}
      }

      @media(max-width:420px){
        .table-cards{width:70%!important;gap:6px!important;min-height:190px!important}
        .table-cards .card.napoletana{width:56px!important;height:93px!important}
        .hand .card.napoletana{width:69px!important;height:114px!important}
        .self-area{width:86%!important}
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
