(()=>{
  let visualState=null;
  let animatedTs=0;
  let dealToken=0;

  const DEAL_TRAVEL=1050;
  const DEAL_STEP=650;
  const DEAL_START=350;
  const ACTION_TRAVEL=900;
  const CAPTURE_GAP=170;

  function cloneState(s){
    if(!s) return null;
    return JSON.parse(JSON.stringify({
      yourSeat:s.yourSeat,
      maxPlayers:s.maxPlayers,
      playMode:s.playMode,
      started:s.started,
      round:s.round,
      dealer:s.dealer,
      turn:s.turn,
      hand:s.hand,
      handCounts:s.handCounts,
      table:s.table,
      deckCount:s.deckCount,
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
      .game-bar{padding:6px 10px!important;min-height:54px!important}
      .header-actions{display:flex;gap:5px;justify-self:end;align-items:center;flex-wrap:nowrap}
      .header-actions .small{min-height:34px!important;padding:5px 9px!important;font-size:.78rem!important}
      .score-strip{padding:6px 9px!important;gap:7px!important;background:linear-gradient(180deg,#063c2d,#052f22)!important}
      .score-card{min-height:52px!important;padding:6px 10px!important;box-shadow:inset 0 0 0 1px #ffffff0d,0 4px 12px #0003}
      .score-card strong{font-size:1.8rem!important}.score-middle{padding:0 5px!important}

      .game-table{position:relative!important;overflow:hidden!important;background:radial-gradient(circle at 50% 44%,#178957 0,#0d7047 47%,#085236 74%,#06382a 100%)!important}
      .game-table:before{content:"";position:absolute;inset:9px;border-radius:26px;border:3px solid rgba(223,190,99,.58);box-shadow:inset 0 0 0 1px #ffffff1a,inset 0 0 42px #0003;pointer-events:none}
      .game-table:after{content:"";position:absolute;inset:0;pointer-events:none;background:radial-gradient(circle at 50% 46%,transparent 0 50%,#00000014 78%,#0000002e 100%)}
      .table-info{position:absolute!important;top:13px!important;left:20px!important;right:20px!important;font-size:.95rem!important;z-index:15!important}
      .opponents{position:absolute!important;inset:0!important;z-index:12!important}.scope-zones{position:absolute!important;inset:0!important;z-index:13!important}
      .self-area{position:absolute!important;left:50%!important;bottom:8px!important;transform:translateX(-50%)!important;width:min(92%,800px)!important;z-index:14!important}
      #table{position:absolute!important;z-index:11!important}#captureBox{position:absolute!important;z-index:35!important}
      #takenZones{position:absolute;inset:0;pointer-events:none;z-index:13}#motionLayer{position:absolute;inset:0;pointer-events:none;z-index:60;overflow:hidden}

      .opponent-top{top:54px!important;left:50%!important;transform:translateX(-50%)!important}.opponent-name{font-size:.86rem!important;padding:5px 10px!important}
      .opponent-hand{padding-left:10px!important}.card-back{width:46px!important;height:73px!important;margin-left:-14px!important}.card-back:first-child{margin-left:0!important}
      .table-cards{left:50%!important;top:46%!important;transform:translate(-50%,-50%)!important;width:min(72%,690px)!important;min-height:215px!important;gap:9px!important;align-content:center!important}
      .table-cards .card.napoletana{width:72px!important;height:120px!important}
      .self-meta{margin:0 auto 5px!important;padding:0 3px!important;justify-content:center!important}.self-tag{padding:5px 11px!important}.mini-stats{display:none!important}
      .hand{min-height:138px!important;padding:2px 0!important;gap:9px!important;flex-wrap:nowrap!important}.hand .card.napoletana{width:82px!important;height:136px!important}
      .card.napoletana{box-shadow:0 7px 18px #0006!important;border-radius:9px!important;transform-origin:center center}
      .landing-card{animation:landingCard .34s cubic-bezier(.2,.9,.2,1)}
      @keyframes landingCard{0%{transform:scale(.92) rotate(-2deg)}55%{transform:scale(1.04) rotate(1deg)}100%{transform:scale(1) rotate(0)}}

      .dealer-deck{position:absolute;right:17px;top:43%;width:49px;height:78px;z-index:20;pointer-events:none;filter:drop-shadow(0 8px 9px #0007)}
      .dealer-deck .deck-card{position:absolute;inset:0;border-radius:7px;border:3px solid #f4e1ae;background:repeating-linear-gradient(45deg,#923832 0 5px,#e3b64d 5px 10px,#244c76 10px 15px,#f0ddad 15px 20px)}
      .dealer-deck .deck-card:after{content:"";position:absolute;inset:6px;border:2px solid #fff8d6;border-radius:4px}.dealer-deck .d1{transform:translate(-5px,5px)}.dealer-deck .d2{transform:translate(-2px,2px)}
      .dealer-deck .deck-count-badge{position:absolute;right:-7px;bottom:-8px;min-width:24px;height:24px;border-radius:999px;background:#ffd24a;color:#173325;display:grid;place-items:center;font-size:.7rem;font-weight:900;border:2px solid #fff5c7}
      .dealer-deck.empty{opacity:.18}.dealer-deck.deal-pulse{animation:deckPulse .23s ease}@keyframes deckPulse{50%{transform:translate(-4px,-2px) rotate(-2deg)}}

      .deal-fly{position:absolute;transform-origin:0 0;will-change:transform;pointer-events:none;perspective:800px}
      .deal-flip{position:absolute;inset:0;transform-style:preserve-3d;will-change:transform}.deal-side{position:absolute;inset:0;border-radius:8px;overflow:hidden;backface-visibility:hidden;-webkit-backface-visibility:hidden;box-shadow:0 9px 20px #0008}
      .deal-side.back{border:3px solid #f4e1ae;background:repeating-linear-gradient(45deg,#923832 0 5px,#e3b64d 5px 10px,#244c76 10px 15px,#f0ddad 15px 20px)}.deal-side.back:after{content:"";position:absolute;inset:6px;border:2px solid #fff8d6;border-radius:4px}
      .deal-side.front{transform:rotateY(180deg);background:#f7efcf}.deal-side.front img{width:100%;height:100%;display:block;object-fit:fill}
      body.dealing-cards #hand,body.dealing-cards #table{pointer-events:none!important}

      .taken-pile{position:absolute!important;display:flex!important;flex-direction:column!important;align-items:center!important;gap:3px!important;background:#04241ce6!important;border:1px solid #ffd24a73!important;border-radius:12px!important;padding:5px!important;box-shadow:0 6px 15px #0005!important;min-width:54px!important}
      .taken-pile .label{font-size:.62rem!important;font-weight:800!important;color:#fff1a8!important;max-width:55px!important;text-align:center!important}.taken-pile .count{min-width:22px!important;height:22px!important;border-radius:999px!important;background:#ffd24a!important;color:#173325!important;display:grid!important;place-items:center!important;font-weight:900!important;font-size:.74rem!important;border:2px solid #fff7cf!important;margin-top:-8px!important;align-self:flex-end!important}
      .taken-card-wrap{position:relative;line-height:0}.taken-card-wrap .card.napoletana.mini{width:39px!important;height:65px!important;box-shadow:0 3px 9px #0005!important}
      .taken-top{left:18px!important;top:132px!important}.taken-bottom{left:18px!important;bottom:158px!important}.taken-left{left:16px!important;top:50%!important;transform:translateY(-50%)!important}.taken-right{left:16px!important;top:62%!important}
      .scope-badge{padding:5px!important;min-width:48px!important;background:#04241ce6!important}.scope-owner{display:none!important}.scope-mini-card .card.napoletana.mini{width:39px!important;height:65px!important}
      .scope-top{right:18px!important;left:auto!important;top:132px!important}.scope-bottom{right:18px!important;left:auto!important;bottom:158px!important}.scope-left{right:16px!important;left:auto!important;top:50%!important}.scope-right{right:16px!important;left:auto!important;top:62%!important}
      .bottom-actions{min-height:44px!important;padding:5px 10px!important}.bottom-actions button{min-height:36px!important;padding:6px 12px!important;font-size:.85rem!important}

      @media(max-width:700px){
        .game-bar{grid-template-columns:1fr auto auto!important;gap:5px!important;padding:5px 8px!important}.brand strong{font-size:1rem!important;line-height:1.05!important}.brand small{display:none!important}
        .turn-badge{grid-column:auto!important;grid-row:auto!important;order:0!important;padding:5px 9px!important;font-size:.76rem!important;white-space:nowrap!important}.header-actions{grid-column:auto!important;grid-row:auto!important}.header-actions .share-btn,.header-actions .copy-btn{display:none!important}.header-actions .leave{display:block!important}
        .score-strip{padding:5px 7px!important;gap:5px!important}.score-card{min-height:46px!important;padding:5px 8px!important;border-radius:13px!important}.score-card strong{font-size:1.45rem!important}.score-side-label{font-size:.72rem!important}.score-middle span{font-size:.78rem!important}.score-middle small{font-size:.64rem!important}
        .table-info{top:12px!important;left:15px!important;right:15px!important;font-size:.85rem!important}.opponent-top{top:45px!important}.opponent-name{font-size:.78rem!important;padding:4px 8px!important}.card-back{width:40px!important;height:64px!important;margin-left:-12px!important}
        .table-cards{top:45%!important;width:72%!important;min-height:205px!important;gap:7px!important}.table-cards .card.napoletana{width:60px!important;height:100px!important}
        .self-area{bottom:5px!important;width:88%!important}.self-tag{font-size:.9rem!important;padding:4px 9px!important}.hand{min-height:123px!important;gap:7px!important}.hand .card.napoletana{width:72px!important;height:119px!important}
        .dealer-deck{right:10px;top:42%;width:39px;height:62px}.dealer-deck .deck-count-badge{min-width:20px;height:20px;font-size:.62rem}
        .taken-card-wrap .card.napoletana.mini,.scope-mini-card .card.napoletana.mini{width:34px!important;height:56px!important}.taken-pile{min-width:46px!important;padding:4px!important}.taken-pile .label{font-size:.56rem!important}.taken-pile .count{min-width:20px!important;height:20px!important;font-size:.68rem!important}.taken-top{left:12px!important;top:115px!important}.taken-bottom{left:12px!important;bottom:132px!important}.scope-top{right:12px!important;top:115px!important}.scope-bottom{right:12px!important;bottom:132px!important}
      }
      @media(max-width:420px){.table-cards{width:70%!important;gap:6px!important;min-height:190px!important}.table-cards .card.napoletana{width:56px!important;height:93px!important}.hand .card.napoletana{width:69px!important;height:114px!important}.self-area{width:86%!important}}
    `;
    document.head.appendChild(st);
  }

  function ensureLayers(){
    const table=document.querySelector('.game-table');
    if(!table) return;
    if(!document.getElementById('takenZones')){const z=document.createElement('div');z.id='takenZones';table.appendChild(z)}
    if(!document.getElementById('motionLayer')){const m=document.createElement('div');m.id='motionLayer';table.appendChild(m)}
    if(!document.getElementById('dealerDeck')){
      const d=document.createElement('div');d.id='dealerDeck';d.className='dealer-deck';
      d.innerHTML='<div class="deck-card d1"></div><div class="deck-card d2"></div><div class="deck-card d3"></div><div class="deck-count-badge">0</div>';
      table.appendChild(d);
    }
  }

  function updateDeck(){
    const d=document.getElementById('dealerDeck');if(!d||!state)return;
    const count=state.deckCount||0;d.querySelector('.deck-count-badge').textContent=String(count);d.classList.toggle('empty',count===0);
  }

  function relativeSeatsFor(st){const max=st.maxPlayers===2?2:4;const out=[];for(let o=1;o<max;o++)out.push((st.yourSeat+o)%max);return out}
  function relationClassForSeat(st,seat){if(seat===st.yourSeat)return'bottom';const max=st.maxPlayers===2?2:4;if(max===2)return'top';const rel=(seat-st.yourSeat+max)%max;return rel===1?'left':rel===2?'top':'right'}
  function takenPositionClass(rel){return rel==='top'?'taken-top':rel==='bottom'?'taken-bottom':rel==='left'?'taken-left':'taken-right'}

  function assignCardIds(){
    [...document.querySelectorAll('#table > .card.napoletana')].forEach((el,i)=>{const c=state.table?.[i];if(c)el.dataset.cardId=c.id});
    [...document.querySelectorAll('#hand > .card.napoletana')].forEach((el,i)=>{const c=state.hand?.[i];if(c)el.dataset.cardId=c.id});
  }

  function snapshotDom(prev){
    const out={hand:{},table:{},opponentCenters:{}};
    const h=[...document.querySelectorAll('#hand > .card.napoletana')];(prev?.hand||[]).forEach((c,i)=>{if(h[i])out.hand[c.id]=h[i].getBoundingClientRect()});
    const t=[...document.querySelectorAll('#table > .card.napoletana')];(prev?.table||[]).forEach((c,i)=>{if(t[i])out.table[c.id]=t[i].getBoundingClientRect()});
    const opp=[...document.querySelectorAll('#opponents .opponent')];const seats=prev?relativeSeatsFor(prev):[];seats.forEach((seat,i)=>{const e=opp[i]?.querySelector('.opponent-hand')||opp[i];if(e)out.opponentCenters[seat]=e.getBoundingClientRect()});
    return out;
  }

  function createDealClone(card,faceUp){
    const wrap=document.createElement('div');wrap.className='deal-fly';
    const flip=document.createElement('div');flip.className='deal-flip';
    const back=document.createElement('div');back.className='deal-side back';flip.append(back);
    const front=document.createElement('div');front.className='deal-side front';
    if(card){const img=document.createElement('img');img.src=`/cards/${card.suit}-${card.value}.svg`;img.alt='';front.append(img)}
    flip.append(front);wrap.append(flip);wrap.dataset.faceUp=faceUp?'1':'0';return wrap;
  }

  function pulseDeck(){const d=document.getElementById('dealerDeck');if(!d)return;d.classList.remove('deal-pulse');void d.offsetWidth;d.classList.add('deal-pulse')}

  function flyDeal(item,token,onDone){
    if(token!==dealToken)return;
    const layer=document.getElementById('motionLayer'),deck=document.getElementById('dealerDeck');if(!layer||!deck||!item.target)return;
    const base=layer.getBoundingClientRect(),from=deck.getBoundingClientRect(),to=item.target.getBoundingClientRect();
    const w=Math.max(34,from.width),h=Math.max(55,from.height);const clone=createDealClone(item.card,item.faceUp);clone.style.left=(from.left-base.left)+'px';clone.style.top=(from.top-base.top)+'px';clone.style.width=w+'px';clone.style.height=h+'px';layer.append(clone);
    const dx=to.left-from.left,dy=to.top-from.top,sx=to.width/w,sy=to.height/h;const bend=dy>0?-58:58;const rot=(Math.random()*10-5);
    pulseDeck();
    clone.animate([
      {transform:'translate(0,0) rotateZ(0deg) scale(1)',offset:0},
      {transform:`translate(${dx*.48}px,${dy*.46+bend}px) rotateZ(${rot}deg) scale(${(1+sx)/2},${(1+sy)/2})`,offset:.52},
      {transform:`translate(${dx}px,${dy}px) rotateZ(0deg) scale(${sx},${sy})`,offset:1}
    ],{duration:DEAL_TRAVEL,easing:'cubic-bezier(.22,.72,.18,1)',fill:'forwards'});
    if(item.faceUp){clone.querySelector('.deal-flip').animate([{transform:'rotateY(0deg)',offset:0},{transform:'rotateY(0deg)',offset:.58},{transform:'rotateY(180deg)',offset:1}],{duration:DEAL_TRAVEL,easing:'ease-in-out',fill:'forwards'})}
    setTimeout(()=>{if(token!==dealToken){clone.remove();return}item.target.style.opacity='1';item.target.classList.add('landing-card');setTimeout(()=>item.target.classList.remove('landing-card'),380);clone.remove();onDone?.()},DEAL_TRAVEL+35);
  }

  function opponentBackTarget(current,seat,roundIndex){
    const seats=relativeSeatsFor(current);const idx=seats.indexOf(seat);if(idx<0)return null;const opp=[...document.querySelectorAll('#opponents .opponent')][idx];return [...(opp?.querySelectorAll('.opponent-hand .card-back')||[])][roundIndex]||opp?.querySelector('.opponent-hand .card-back')||null;
  }

  function animateDeal(before,current){
    dealToken++;const token=dealToken;const initial=!before||before.round!==current.round;const seq=[];
    const tableEls=[...document.querySelectorAll('#table > .card.napoletana')];const handEls=[...document.querySelectorAll('#hand > .card.napoletana')];
    if(initial){(current.table||[]).slice(0,4).forEach((card,i)=>{if(tableEls[i])seq.push({target:tableEls[i],card,faceUp:true})})}
    for(let r=0;r<3;r++){
      for(let offset=1;offset<=current.maxPlayers;offset++){
        const seat=(current.dealer+offset)%current.maxPlayers;
        if(seat===current.yourSeat){const target=handEls[r],card=current.hand?.[r];if(target&&card)seq.push({target,card,faceUp:true})}
        else{const target=opponentBackTarget(current,seat,r);if(target)seq.push({target,card:null,faceUp:false})}
      }
    }
    if(!seq.length)return;
    seq.forEach(x=>x.target.style.opacity='0');document.body.classList.add('dealing-cards');window.scopaIsDealing=true;
    const total=DEAL_START+(seq.length-1)*DEAL_STEP+DEAL_TRAVEL+120;window.scopaDealUntil=performance.now()+total;
    if($('turnBadge'))$('turnBadge').textContent='Distribuzione…';
    seq.forEach((item,i)=>setTimeout(()=>flyDeal(item,token),DEAL_START+i*DEAL_STEP));
    setTimeout(()=>{
      if(token!==dealToken)return;seq.forEach(x=>x.target.style.opacity='1');document.body.classList.remove('dealing-cards');window.scopaIsDealing=false;
      const p=state?.players?.find(x=>x.seat===state.turn);if($('turnBadge')){$('turnBadge').textContent=state?.playMode==='cpu'&&state?.turn===1?'Sistema sta pensando…':state?.yourSeat===state?.turn?'TOCCA A TE':`Turno: ${p?.name||'?'}`}
    },total);
  }

  function flyFaceCard(card,fromRect,toRect,duration=ACTION_TRAVEL,onDone){
    const layer=document.getElementById('motionLayer');if(!layer||!fromRect||!toRect)return onDone?.();const base=layer.getBoundingClientRect();
    const clone=createDealClone(card,true);clone.style.left=(fromRect.left-base.left)+'px';clone.style.top=(fromRect.top-base.top)+'px';clone.style.width=fromRect.width+'px';clone.style.height=fromRect.height+'px';layer.append(clone);clone.querySelector('.deal-flip').style.transform='rotateY(180deg)';
    const dx=toRect.left-fromRect.left,dy=toRect.top-fromRect.top,sx=toRect.width/fromRect.width,sy=toRect.height/fromRect.height;
    clone.animate([{transform:'translate(0,0) rotateZ(0deg)',offset:0},{transform:`translate(${dx*.5}px,${dy*.45-34}px) rotateZ(-4deg)`,offset:.5},{transform:`translate(${dx}px,${dy}px) rotateZ(0deg) scale(${sx},${sy})`,offset:1}],{duration,easing:'cubic-bezier(.2,.75,.2,1)',fill:'forwards'});
    setTimeout(()=>{clone.remove();onDone?.()},duration+25);
  }

  function animatePlayedCard(before,action){
    const target=document.querySelector(`#table > .card.napoletana[data-card-id="${action.played.id}"]`);if(!target)return;const to=target.getBoundingClientRect();const from=action.seat===state.yourSeat?before?.hand?.[action.played.id]:(before?.opponentCenters?.[action.seat]);if(!from)return;target.style.opacity='0';window.scopaActionUntil=performance.now()+ACTION_TRAVEL+80;flyFaceCard(action.played,from,to,ACTION_TRAVEL,()=>{target.style.opacity='1';target.classList.add('landing-card');setTimeout(()=>target.classList.remove('landing-card'),380)})
  }

  function animateCapture(before,action){
    const pile=document.querySelector(`#takenZones .taken-pile[data-team="${action.team}"] .taken-card-wrap`);if(!pile)return;const target=pile.getBoundingClientRect();const list=[];
    const pf=action.seat===state.yourSeat?before?.hand?.[action.played.id]:before?.opponentCenters?.[action.seat];if(pf)list.push({card:action.played,from:pf});(action.captured||[]).forEach(c=>{const f=before?.table?.[c.id];if(f)list.push({card:c,from:f})});
    window.scopaActionUntil=performance.now()+ACTION_TRAVEL+(list.length-1)*CAPTURE_GAP+100;
    list.forEach((x,i)=>setTimeout(()=>flyFaceCard(x.card,x.from,target,ACTION_TRAVEL),i*CAPTURE_GAP));
    if(action.isScopa)setTimeout(()=>{const rel=relationClassForSeat(state,action.seat),el=document.querySelector(`.scope-${rel}`);el?.animate([{transform:'scale(.8) rotate(-8deg)'},{transform:'scale(1.18) rotate(5deg)'},{transform:'scale(1) rotate(0)'}],{duration:650,easing:'ease-out'})},ACTION_TRAVEL/2)
  }

  function renderTakenPiles(){
    ensureLayers();const zones=document.getElementById('takenZones');if(!zones||!state)return;zones.replaceChildren();const previews=Array.isArray(state.takenPreview)?state.takenPreview:[];
    previews.forEach((info,team)=>{if(!info||!info.count||!info.top)return;const seat=Number.isInteger(info.seat)?info.seat:team,rel=relationClassForSeat(state,seat);const box=document.createElement('div');box.className=`taken-pile ${takenPositionClass(rel)}`;box.dataset.team=String(team);const label=document.createElement('div');label.className='label';label.textContent='PRESE';const wrap=document.createElement('div');wrap.className='taken-card-wrap';wrap.append(cardEl(info.top,false,true));const count=document.createElement('div');count.className='count';count.textContent=String(info.count);box.append(label,wrap,count);zones.append(box)})
  }

  const originalRender=render;
  render=function(){
    injectStyles();ensureLayers();const before=snapshotDom(visualState);originalRender();assignCardIds();renderTakenPiles();updateDeck();
    const action=state?.lastAction;if(action?.ts&&action.ts!==animatedTs){animatedTs=action.ts;if(action.type==='deal')animateDeal(visualState,state);else if(action.type==='play')animatePlayedCard(before,action);else if(action.type==='capture')animateCapture(before,action)}
    visualState=cloneState(state);
  };
})();
