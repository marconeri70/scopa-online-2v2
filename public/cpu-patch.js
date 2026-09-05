(()=>{
  let cpuTimer = null;
  let cpuScheduleKey = '';
  let lastCpuEmoteAction = 0;

  const EMOTES = ['😂','😮','😡','👍','👏','😎','😭','🤝'];
  const CPU_EMOTES = ['😎','😂','👏','😮','👍','🤝'];

  const originalRender = render;

  selectedMode = function(){
    const raw = document.querySelector('input[name="mode"]:checked')?.value || '2';
    return raw === 'cpu' ? 'cpu' : Number(raw);
  };

  function relationForSeat(seat){
    if(!state) return 'top';
    if(seat === state.yourSeat) return 'bottom';

    const max = state.maxPlayers === 2 ? 2 : 4;
    if(max === 2) return 'top';

    const rel = (seat - state.yourSeat + max) % max;
    if(rel === 1) return 'left';
    if(rel === 2) return 'top';
    return 'right';
  }

  function ensureReactionUi(){
    if(document.getElementById('reaction-patch-styles')) return;

    const style=document.createElement('style');
    style.id='reaction-patch-styles';
    style.textContent=`
      .reaction-launcher{
        width:42px;min-width:42px;height:42px;min-height:42px;padding:0!important;border-radius:999px!important;
        background:#ffd24a!important;color:#153126!important;font-size:1.25rem!important;
        display:grid!important;place-items:center!important;box-shadow:0 4px 12px #0005
      }
      .reaction-palette{
        position:fixed;right:12px;bottom:64px;z-index:90;width:214px;
        display:grid;grid-template-columns:repeat(4,1fr);gap:7px;
        background:rgba(3,30,23,.97);border:2px solid rgba(255,210,74,.7);
        border-radius:18px;padding:10px;box-shadow:0 12px 32px #0009
      }
      .reaction-palette.hidden{display:none!important}
      .reaction-choice{
        min-width:0!important;min-height:44px!important;padding:4px!important;border-radius:12px!important;
        background:#ffffff12!important;color:#fff!important;font-size:1.45rem!important
      }
      .reaction-choice:active{transform:scale(.9)}
      .reaction-bubble{
        position:absolute;z-index:80;min-width:64px;max-width:145px;
        padding:8px 10px;border-radius:18px;background:#fff;color:#122a21;
        border:3px solid #ffd24a;box-shadow:0 8px 24px #0008;text-align:center;
        animation:reactionPop 2.6s ease forwards;pointer-events:none
      }
      .reaction-bubble .emoji{display:block;font-size:2.15rem;line-height:1}
      .reaction-bubble .who{display:block;margin-top:3px;font-size:.62rem;font-weight:900;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
      .reaction-bubble.rel-top{top:116px;left:50%;transform:translateX(-50%)}
      .reaction-bubble.rel-bottom{bottom:145px;left:50%;transform:translateX(-50%)}
      .reaction-bubble.rel-left{left:62px;top:50%;transform:translateY(-50%)}
      .reaction-bubble.rel-right{right:62px;top:50%;transform:translateY(-50%)}
      @keyframes reactionPop{
        0%{opacity:0;transform:translateY(12px) scale(.6)}
        14%{opacity:1;transform:translateY(0) scale(1.12)}
        25%,72%{opacity:1;transform:translateY(0) scale(1)}
        100%{opacity:0;transform:translateY(-16px) scale(.9)}
      }
      @media(max-width:700px){
        .reaction-palette{right:8px;bottom:58px;width:198px}
        .reaction-bubble.rel-top{top:102px}
        .reaction-bubble.rel-bottom{bottom:128px}
      }
    `;
    document.head.append(style);

    const actions=document.querySelector('.bottom-actions');
    if(!actions) return;

    const btn=document.createElement('button');
    btn.id='reactionBtn';
    btn.className='reaction-launcher hidden';
    btn.type='button';
    btn.textContent='😊';
    btn.title='Reazioni';
    actions.append(btn);

    const palette=document.createElement('div');
    palette.id='reactionPalette';
    palette.className='reaction-palette hidden';

    for(const emoji of EMOTES){
      const b=document.createElement('button');
      b.type='button';
      b.className='reaction-choice';
      b.textContent=emoji;
      b.addEventListener('click',()=>{
        palette.classList.add('hidden');
        if(ws?.readyState===1) ws.send(JSON.stringify({type:'reaction',emoji}));

        // CPU can answer, like a quick emote exchange.
        if(state?.playMode==='cpu'){
          setTimeout(()=>{
            if(!state) return;
            showReaction({
              seat:1,
              name:'Sistema',
              emoji:CPU_EMOTES[Math.floor(Math.random()*CPU_EMOTES.length)]
            });
          }, 1100 + Math.floor(Math.random()*900));
        }
      });
      palette.append(b);
    }

    document.body.append(palette);

    btn.addEventListener('click',()=>{
      palette.classList.toggle('hidden');
    });

    document.addEventListener('pointerdown',e=>{
      if(!palette.contains(e.target) && e.target!==btn){
        palette.classList.add('hidden');
      }
    });
  }

  function showReaction(msg){
    if(!state) return;
    const table=document.querySelector('.game-table');
    if(!table) return;

    const bubble=document.createElement('div');
    bubble.className=`reaction-bubble rel-${relationForSeat(Number(msg.seat))}`;
    bubble.innerHTML=`<span class="emoji">${msg.emoji}</span><span class="who">${msg.name||'Giocatore'}</span>`;
    table.append(bubble);
    setTimeout(()=>bubble.remove(),2700);
  }

  function scheduleCpuIfNeeded(){
    if(cpuTimer){
      clearTimeout(cpuTimer);
      cpuTimer=null;
    }

    if(!state || state.playMode!=='cpu' || !state.started || state.turn!==1 || state.pendingCapture){
      cpuScheduleKey='';
      return;
    }

    const action=state.lastAction || {};
    const key=`${state.round}|${action.ts||0}|${state.turn}|${state.handCounts?.[1]||0}|${state.deckCount}`;
    if(key===cpuScheduleKey) return;
    cpuScheduleKey=key;

    // After dealing, wait until the cards have visibly finished moving.
    let delay=1900;
    if(action.type==='deal') delay=4700;
    else if(action.type==='capture') delay=2200;
    else if(action.type==='play') delay=1900;

    const badge=$('turnBadge');
    if(badge) badge.textContent='Sistema sta pensando…';

    cpuTimer=setTimeout(()=>{
      cpuTimer=null;
      if(
        state?.playMode==='cpu' &&
        state?.started &&
        state?.turn===1 &&
        !state?.pendingCapture &&
        ws?.readyState===1
      ){
        ws.send(JSON.stringify({type:'cpuStep'}));
      }
    },delay);
  }

  connect = function(code, createMode=null){
    roomCode=code.toUpperCase();
    const name=($('name').value.trim()||'Giocatore').slice(0,20);
    localStorage.setItem('scopa-name',name);
    const proto=location.protocol==='https:'?'wss:':'ws:';
    const params=new URLSearchParams({name,token});
    if(createMode==='cpu' || createMode===2 || createMode===4) params.set('mode',String(createMode));

    ws=new WebSocket(`${proto}//${location.host}/api/room/${encodeURIComponent(roomCode)}?${params.toString()}`);
    showGame();
    $('turnBadge').textContent='Connessione…';

    ws.onmessage=e=>{
      const msg=JSON.parse(e.data);

      if(msg.type==='state'){
        state=msg.state;
        render();
        scheduleCpuIfNeeded();
      }

      if(msg.type==='reaction'){
        showReaction(msg);
      }

      if(msg.type==='error'){
        if(typeof captureSubmitting!=='undefined') captureSubmitting=false;
        $('error').textContent=msg.message;
        render();
      }
    };

    ws.onclose=e=>{
      if(cpuTimer) clearTimeout(cpuTimer);
      $('turnBadge').textContent=e.code===1000?'Disconnesso':'Connessione persa';
    };
    ws.onerror=()=>{ $('error').textContent='Errore di connessione o stanza piena'; };
  };

  render = function(){
    originalRender();
    if(!state) return;

    ensureReactionUi();

    const cpuMode=state.playMode==='cpu';

    if(cpuMode){
      $('gameTitle').textContent='SCOPA · TU vs SISTEMA';
      if($('shareBtn')) $('shareBtn').classList.add('hidden');
      if($('copyCodeBtn')) $('copyCodeBtn').classList.add('hidden');
      if($('roomLabel')) $('roomLabel').textContent='Partita contro Sistema';
      if($('scoreNameA')) $('scoreNameA').textContent=playerBySeat(0)?.name || 'Tu';
      if($('scoreNameB')) $('scoreNameB').textContent='Sistema';

      if(state.started && state.turn===1 && $('turnBadge')){
        $('turnBadge').textContent='Sistema sta pensando…';
        $('turnBadge').classList.remove('mine');
      }
    }else{
      if($('shareBtn')) $('shareBtn').classList.remove('hidden');
      if($('copyCodeBtn')) $('copyCodeBtn').classList.remove('hidden');
    }

    const reactionBtn=document.getElementById('reactionBtn');
    if(reactionBtn){
      reactionBtn.classList.toggle('hidden',!state.started);
    }

    // A little personality from the CPU on important moves.
    const action=state.lastAction;
    if(
      cpuMode &&
      action?.ts &&
      action.ts!==lastCpuEmoteAction &&
      action.type==='capture' &&
      action.isScopa
    ){
      lastCpuEmoteAction=action.ts;
      const seat=action.seat;
      setTimeout(()=>{
        showReaction({
          seat,
          name:seat===1?'Sistema':(playerBySeat(seat)?.name||'Tu'),
          emoji:seat===1?'😎':'😮'
        });
      },900);
    }
  };
})();
