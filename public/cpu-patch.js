(()=>{
  let cpuTimer=null,cpuLabelTimer=null,cpuScheduleKey='',lastCpuEmoteAction=0;
  const originalRender=render;

  const EMOJIS=['😂','🤣','😅','😮','😱','😡','😤','😭','😎','🤨','🙄','😜','👍','👎','👏','🙌','🤝','💪','❤️','🔥','🎉','🧹','👑','🏆','💯','🙏','🤦','😴','🤯','🥳'];
  const QUICK=['Bella!','Grande!','Scopa!','GG!','Ops!','Che presa!','Fortuna!','Andiamo!'];
  const CPU_REPLIES=['😂','😎','👏','😮','👍','🤝','🔥','🧹','🏆','GG!','Bella!'];

  selectedMode=function(){const raw=document.querySelector('input[name="mode"]:checked')?.value||'2';return raw==='cpu'?'cpu':Number(raw)};

  function relationForSeat(seat){if(!state)return'top';if(seat===state.yourSeat)return'bottom';const max=state.maxPlayers===2?2:4;if(max===2)return'top';const rel=(seat-state.yourSeat+max)%max;return rel===1?'left':rel===2?'top':'right'}
  function kindFor(v){if(['😂','🤣','😅'].includes(v))return'laugh';if(['😡','😤','👎'].includes(v))return'angry';if(['😮','😱','🤯'].includes(v))return'surprise';if(['👏','🙌','🎉','🥳'].includes(v))return'celebrate';if(['❤️','🔥'].includes(v))return'pulse';if(['🧹','👑','🏆'].includes(v))return'spin';return'pop'}

  function ensureReactionUi(){
    if(document.getElementById('reaction-patch-styles'))return;
    const style=document.createElement('style');style.id='reaction-patch-styles';style.textContent=`
      .reaction-launcher{width:44px!important;min-width:44px!important;height:44px!important;min-height:44px!important;padding:0!important;border-radius:999px!important;background:#ffd24a!important;color:#153126!important;font-size:1.35rem!important;display:grid!important;place-items:center!important;box-shadow:0 4px 12px #0005}
      .reaction-sheet{position:fixed;left:50%;bottom:58px;transform:translateX(-50%);z-index:100;width:min(94vw,430px);max-height:58vh;overflow:auto;background:linear-gradient(180deg,#073c2d,#031f18);border:2px solid #ffd24ab3;border-radius:22px;padding:12px;box-shadow:0 18px 44px #000a}.reaction-sheet.hidden{display:none!important}
      .reaction-sheet-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:8px}.reaction-sheet-head strong{font-size:1rem}.reaction-close{min-width:34px!important;width:34px!important;height:34px!important;min-height:34px!important;padding:0!important;border-radius:999px!important}
      .quick-reactions{display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin-bottom:10px}.quick-reaction{min-height:36px!important;padding:5px!important;font-size:.72rem!important;background:#ffffff12!important;color:#fff!important;border:1px solid #ffffff24!important}
      .emoji-reactions{display:grid;grid-template-columns:repeat(6,1fr);gap:6px}.reaction-choice{min-width:0!important;min-height:46px!important;padding:3px!important;border-radius:12px!important;background:#ffffff10!important;color:#fff!important;font-size:1.5rem!important;border:1px solid #ffffff18!important}.reaction-choice:active{transform:scale(.86)}
      .reaction-bubble{position:absolute;z-index:90;pointer-events:none}.reaction-bubble.rel-top{top:105px;left:50%;transform:translateX(-50%)}.reaction-bubble.rel-bottom{bottom:132px;left:50%;transform:translateX(-50%)}.reaction-bubble.rel-left{left:58px;top:50%;transform:translateY(-50%)}.reaction-bubble.rel-right{right:58px;top:50%;transform:translateY(-50%)}
      .reaction-card{position:relative;min-width:70px;max-width:155px;padding:9px 12px;border-radius:21px;background:#fff;color:#10281f;border:3px solid #ffd24a;box-shadow:0 9px 26px #0008;text-align:center;animation:reactionLife 3.3s ease forwards}.reaction-main{display:block;font-size:2.35rem;line-height:1.05;font-weight:900}.reaction-main.text{font-size:1.05rem;line-height:1.15;padding:4px 2px}.reaction-who{display:block;font-size:.62rem;font-weight:900;margin-top:4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
      .reaction-particle{position:absolute;left:50%;top:50%;width:7px;height:7px;border-radius:50%;background:#ffd24a;opacity:0;animation:particleBurst 1s ease-out .12s}.reaction-particle:nth-child(2n){background:#ff8b62}.reaction-particle:nth-child(3n){background:#7ddcff}
      .reaction-card.kind-laugh .reaction-main{animation:emojiLaugh .62s ease-in-out 3}.reaction-card.kind-angry .reaction-main{animation:emojiShake .24s linear 6}.reaction-card.kind-surprise .reaction-main{animation:emojiSurprise .7s ease 3}.reaction-card.kind-celebrate .reaction-main{animation:emojiCelebrate .8s ease 3}.reaction-card.kind-pulse .reaction-main{animation:emojiPulse .72s ease 4}.reaction-card.kind-spin .reaction-main{animation:emojiSpin .9s cubic-bezier(.3,.8,.2,1) 2}.reaction-card.kind-pop .reaction-main{animation:emojiPop .65s ease 2}
      @keyframes reactionLife{0%{opacity:0;transform:translateY(12px) scale(.65)}10%{opacity:1;transform:translateY(0) scale(1.12)}18%,78%{opacity:1;transform:scale(1)}100%{opacity:0;transform:translateY(-18px) scale(.9)}}
      @keyframes emojiLaugh{0%,100%{transform:rotate(0)}25%{transform:rotate(-13deg) translateY(-3px)}75%{transform:rotate(13deg) translateY(-3px)}}@keyframes emojiShake{0%,100%{transform:translateX(0)}25%{transform:translateX(-5px) rotate(-5deg)}75%{transform:translateX(5px) rotate(5deg)}}@keyframes emojiSurprise{0%,100%{transform:scale(1)}50%{transform:scale(1.32)}}@keyframes emojiCelebrate{0%,100%{transform:translateY(0) rotate(0)}50%{transform:translateY(-8px) rotate(9deg)}}@keyframes emojiPulse{0%,100%{transform:scale(1)}50%{transform:scale(1.3)}}@keyframes emojiSpin{0%{transform:rotate(-20deg) scale(.8)}70%{transform:rotate(380deg) scale(1.22)}100%{transform:rotate(360deg) scale(1)}}@keyframes emojiPop{0%,100%{transform:scale(1)}45%{transform:scale(1.25)}}
      @keyframes particleBurst{0%{opacity:1;transform:translate(-50%,-50%) rotate(calc(var(--i)*45deg)) translateX(0) scale(1)}100%{opacity:0;transform:translate(-50%,-50%) rotate(calc(var(--i)*45deg)) translateX(58px) scale(.25)}}
      @media(max-width:700px){.reaction-sheet{bottom:54px;width:96vw}.emoji-reactions{grid-template-columns:repeat(5,1fr)}.quick-reactions{grid-template-columns:repeat(4,1fr)}.reaction-bubble.rel-top{top:92px}.reaction-bubble.rel-bottom{bottom:122px}}
    `;document.head.append(style);
    const actions=document.querySelector('.bottom-actions');if(!actions)return;
    const btn=document.createElement('button');btn.id='reactionBtn';btn.className='reaction-launcher hidden';btn.type='button';btn.textContent='😊';btn.title='Reazioni';actions.append(btn);
    const sheet=document.createElement('div');sheet.id='reactionSheet';sheet.className='reaction-sheet hidden';
    const head=document.createElement('div');head.className='reaction-sheet-head';head.innerHTML='<strong>Reazioni</strong>';const close=document.createElement('button');close.className='reaction-close';close.type='button';close.textContent='✕';head.append(close);sheet.append(head);
    const quick=document.createElement('div');quick.className='quick-reactions';QUICK.forEach(v=>{const b=document.createElement('button');b.className='quick-reaction';b.type='button';b.textContent=v;b.onclick=()=>sendReaction(v);quick.append(b)});sheet.append(quick);
    const grid=document.createElement('div');grid.className='emoji-reactions';EMOJIS.forEach(v=>{const b=document.createElement('button');b.className='reaction-choice';b.type='button';b.textContent=v;b.onclick=()=>sendReaction(v);grid.append(b)});sheet.append(grid);document.body.append(sheet);
    btn.onclick=()=>sheet.classList.toggle('hidden');close.onclick=()=>sheet.classList.add('hidden');document.addEventListener('pointerdown',e=>{if(!sheet.contains(e.target)&&e.target!==btn)sheet.classList.add('hidden')});
  }

  function sendReaction(v){const sheet=document.getElementById('reactionSheet');sheet?.classList.add('hidden');if(ws?.readyState===1)ws.send(JSON.stringify({type:'reaction',value:v}));if(state?.playMode==='cpu')setTimeout(()=>showReaction({seat:1,name:'Sistema',value:CPU_REPLIES[Math.floor(Math.random()*CPU_REPLIES.length)]}),1200+Math.random()*1100)}

  function showReaction(msg){
    if(!state)return;const table=document.querySelector('.game-table');if(!table)return;const value=String(msg.value??msg.emoji??'');if(!value)return;
    const wrap=document.createElement('div');wrap.className=`reaction-bubble rel-${relationForSeat(Number(msg.seat))}`;const card=document.createElement('div');card.className=`reaction-card kind-${kindFor(value)}`;
    const main=document.createElement('span');main.className='reaction-main'+(value.length>3?' text':'');main.textContent=value;const who=document.createElement('span');who.className='reaction-who';who.textContent=msg.name||'Giocatore';card.append(main,who);
    for(let i=0;i<8;i++){const p=document.createElement('i');p.className='reaction-particle';p.style.setProperty('--i',String(i));card.append(p)}wrap.append(card);table.append(wrap);setTimeout(()=>wrap.remove(),3400)
  }

  function scheduleCpuIfNeeded(){
    if(cpuTimer)clearTimeout(cpuTimer);if(cpuLabelTimer)clearTimeout(cpuLabelTimer);cpuTimer=cpuLabelTimer=null;
    if(!state||state.playMode!=='cpu'||!state.started||state.turn!==1||state.pendingCapture){cpuScheduleKey='';return}
    const action=state.lastAction||{},key=`${state.round}|${action.ts||0}|${state.turn}|${state.handCounts?.[1]||0}|${state.deckCount}`;if(key===cpuScheduleKey)return;cpuScheduleKey=key;
    const now=performance.now(),dealRemain=Math.max(0,(window.scopaDealUntil||0)-now),actionRemain=Math.max(0,(window.scopaActionUntil||0)-now);let visualRemain=Math.max(dealRemain,actionRemain);if(!visualRemain&&action.type==='deal')visualRemain=state.deckCount===30?7000:4500;
    const think=1750+Math.floor(Math.random()*700),delay=visualRemain+think;const badge=$('turnBadge');if(badge)badge.textContent=visualRemain>200?'Distribuzione…':'Sistema sta pensando…';
    if(visualRemain>200)cpuLabelTimer=setTimeout(()=>{if(state?.playMode==='cpu'&&state?.turn===1&&$('turnBadge'))$('turnBadge').textContent='Sistema sta pensando…'},visualRemain);
    cpuTimer=setTimeout(()=>{cpuTimer=null;if(state?.playMode==='cpu'&&state?.started&&state?.turn===1&&!state?.pendingCapture&&ws?.readyState===1)ws.send(JSON.stringify({type:'cpuStep'}))},delay)
  }

  connect=function(code,createMode=null){
    roomCode=code.toUpperCase();const name=($('name').value.trim()||'Giocatore').slice(0,20);localStorage.setItem('scopa-name',name);const proto=location.protocol==='https:'?'wss:':'ws:';const params=new URLSearchParams({name,token});if(createMode==='cpu'||createMode===2||createMode===4)params.set('mode',String(createMode));ws=new WebSocket(`${proto}//${location.host}/api/room/${encodeURIComponent(roomCode)}?${params.toString()}`);showGame();$('turnBadge').textContent='Connessione…';
    ws.onmessage=e=>{const msg=JSON.parse(e.data);if(msg.type==='state'){state=msg.state;render();scheduleCpuIfNeeded()}if(msg.type==='reaction')showReaction(msg);if(msg.type==='error'){if(typeof captureSubmitting!=='undefined')captureSubmitting=false;$('error').textContent=msg.message;render()}};
    ws.onclose=e=>{if(cpuTimer)clearTimeout(cpuTimer);if(cpuLabelTimer)clearTimeout(cpuLabelTimer);$('turnBadge').textContent=e.code===1000?'Disconnesso':'Connessione persa'};ws.onerror=()=>{$('error').textContent='Errore di connessione o stanza piena'}
  };

  render=function(){
    originalRender();if(!state)return;ensureReactionUi();const cpuMode=state.playMode==='cpu';if(cpuMode){$('gameTitle').textContent='SCOPA · TU vs SISTEMA';$('shareBtn')?.classList.add('hidden');$('copyCodeBtn')?.classList.add('hidden');if($('roomLabel'))$('roomLabel').textContent='Partita contro Sistema';if($('scoreNameA'))$('scoreNameA').textContent=playerBySeat(0)?.name||'Tu';if($('scoreNameB'))$('scoreNameB').textContent='Sistema'}else{$('shareBtn')?.classList.remove('hidden');$('copyCodeBtn')?.classList.remove('hidden')}
    const rb=document.getElementById('reactionBtn');if(rb)rb.classList.toggle('hidden',!state.started);
    const action=state.lastAction;if(cpuMode&&action?.ts&&action.ts!==lastCpuEmoteAction&&action.type==='capture'&&action.isScopa){lastCpuEmoteAction=action.ts;setTimeout(()=>showReaction({seat:action.seat,name:action.seat===1?'Sistema':(playerBySeat(action.seat)?.name||'Tu'),value:action.seat===1?'🧹':'😮'}),1050)}
  };
})();
