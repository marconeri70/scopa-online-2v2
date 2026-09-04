(()=>{
  const originalRender = render;

  selectedMode = function(){
    const raw = document.querySelector('input[name="mode"]:checked')?.value || '2';
    return raw === 'cpu' ? 'cpu' : Number(raw);
  };

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
      if(msg.type==='state'){ state=msg.state; render(); }
      if(msg.type==='error'){ captureSubmitting=false; $('error').textContent=msg.message; render(); }
    };
    ws.onclose=e=>{ $('turnBadge').textContent=e.code===1000?'Disconnesso':'Connessione persa'; };
    ws.onerror=()=>{ $('error').textContent='Errore di connessione o stanza piena'; };
  };

  render = function(){
    originalRender();
    if(!state) return;
    const cpuMode = state.playMode === 'cpu';
    if(cpuMode){
      $('gameTitle').textContent='SCOPA · TU vs SISTEMA';
      if($('shareBtn')) $('shareBtn').classList.add('hidden');
      if($('copyCodeBtn')) $('copyCodeBtn').classList.add('hidden');
      if($('roomLabel')) $('roomLabel').textContent='Partita contro Sistema';
      if($('scoreNameA')) $('scoreNameA').textContent=playerBySeat(0)?.name || 'Tu';
      if($('scoreNameB')) $('scoreNameB').textContent='Sistema';
    }else{
      if($('shareBtn')) $('shareBtn').classList.remove('hidden');
      if($('copyCodeBtn')) $('copyCodeBtn').classList.remove('hidden');
    }
  };
})();
