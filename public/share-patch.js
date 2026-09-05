(()=>{
  const $=id=>document.getElementById(id);

  const style=document.createElement('style');
  style.id='stable-share-styles';
  style.textContent=`
    .header-actions{display:flex;gap:6px;justify-self:end;align-items:center}
    .share-btn{background:#ffd24a;color:#173325}.copy-btn{background:#fff;color:#173325}
    .online-invite-panel{position:absolute;left:50%;top:23%;transform:translateX(-50%);z-index:24;width:min(88%,430px);background:rgba(4,34,26,.97);border:2px solid rgba(255,210,74,.72);border-radius:18px;padding:14px;box-shadow:0 12px 34px rgba(0,0,0,.38);text-align:center;color:#fff}
    .online-invite-panel h3{margin:0 0 6px;font-size:1.1rem}.online-invite-panel p{margin:4px 0 10px;opacity:.82;font-size:.85rem}
    .invite-code{display:inline-block;letter-spacing:.16em;font-size:1.8rem;line-height:1;font-weight:900;background:#fff;color:#153126;border-radius:12px;padding:10px 14px;margin:4px 0 12px}
    .invite-actions{display:grid;grid-template-columns:1fr 1fr;gap:8px}.invite-actions button{min-height:42px;padding:8px 10px;border-radius:11px;font-size:.85rem}.invite-actions .share-main{grid-column:1/-1;background:#ffd24a;color:#153126}.invite-status{min-height:1.2em;margin-top:8px;font-size:.78rem;color:#ffe9a4}
    .direct-join-note{position:fixed;left:50%;top:50%;transform:translate(-50%,-50%);z-index:9999;background:#042e22;color:#fff;border:2px solid #ffd24a;border-radius:16px;padding:14px 18px;font-weight:800;box-shadow:0 12px 30px #0008;white-space:nowrap}
    @media(max-width:700px){.header-actions .share-btn,.header-actions .copy-btn{display:none!important}.online-invite-panel{top:18%;width:min(90%,390px);padding:12px}.invite-code{font-size:1.55rem}}
  `;
  document.head.append(style);

  const params=new URLSearchParams(location.search);
  const invitedRoom=(params.get('room')||'').trim().toUpperCase().slice(0,8);

  function currentRoom(){
    const label=$('roomLabel')?.textContent||'';
    const m=label.match(/Stanza\s+([A-Z0-9]+)/i);
    return (m?.[1]||invitedRoom||$('room')?.value||'').trim().toUpperCase();
  }

  function inviteUrl(){
    const code=currentRoom();
    const u=new URL(location.origin + location.pathname);
    if(code) u.searchParams.set('room',code);
    return u.toString();
  }

  async function copy(text){
    try{ await navigator.clipboard.writeText(text); return true; }
    catch{
      try{
        const ta=document.createElement('textarea');
        ta.value=text;ta.style.position='fixed';ta.style.opacity='0';
        document.body.append(ta);ta.select();
        const ok=document.execCommand('copy');ta.remove();return ok;
      }catch{return false;}
    }
  }

  function setStatus(text){
    const el=$('inviteStatus');
    if(el) el.textContent=text;
  }

  function ensurePanel(){
    const table=document.querySelector('.game-table');
    if(!table) return null;
    let panel=$('onlineInvitePanel');
    if(panel) return panel;

    panel=document.createElement('section');
    panel.id='onlineInvitePanel';
    panel.className='online-invite-panel hidden';
    panel.innerHTML=`
      <h3>Invita il secondo giocatore</h3>
      <p>Aprendo il link entrerà direttamente nella stanza.</p>
      <div id="inviteRoomCode" class="invite-code">-----</div>
      <div class="invite-actions">
        <button id="stableShareBtn" class="share-main" type="button">Condividi invito</button>
        <button id="copyLinkBtn" type="button">Copia link</button>
        <button id="stableCopyCodeBtn" type="button">Copia codice</button>
      </div>
      <div id="inviteStatus" class="invite-status"></div>`;
    table.append(panel);

    $('stableShareBtn').addEventListener('click',async()=>{
      const code=currentRoom();
      if(!code) return setStatus('Codice stanza non disponibile.');
      const url=inviteUrl();
      const text=`Ti invito a giocare a Scopa Online. Apri il link per entrare direttamente nella stanza ${code}.`;

      if(navigator.share){
        try{
          await navigator.share({title:'Scopa Online',text,url});
          setStatus('Invito condiviso. In attesa del giocatore…');
          return;
        }catch(e){
          if(e?.name==='AbortError'){
            setStatus('Condivisione annullata. Il pannello resta aperto.');
            return;
          }
        }
      }

      const ok=await copy(`${text}\n${url}`);
      setStatus(ok?'Link copiato. Incollalo su WhatsApp o Telegram.':'Non riesco a copiare il link.');
    });

    $('copyLinkBtn').addEventListener('click',async()=>{
      setStatus(await copy(inviteUrl())?'Link copiato ✓':'Copia non riuscita');
    });

    $('stableCopyCodeBtn').addEventListener('click',async()=>{
      const code=currentRoom();
      setStatus(await copy(code)?`Codice ${code} copiato ✓`:'Copia non riuscita');
    });

    return panel;
  }

  function updatePanel(){
    if(typeof state==='undefined' || !state) return;
    const panel=ensurePanel();
    if(!panel) return;

    const online=state.playMode!=='cpu';
    const connected=(state.players||[]).filter(p=>p.connected).length;
    const waiting=online && !state.started && state.round===0 && connected<state.maxPlayers;

    panel.classList.toggle('hidden',!waiting);
    if($('inviteRoomCode')) $('inviteRoomCode').textContent=currentRoom()||'-----';
    if($('shareBtn')) $('shareBtn').classList.toggle('hidden',!online);
    if($('copyCodeBtn')) $('copyCodeBtn').classList.toggle('hidden',!online);
  }

  $('shareBtn')?.addEventListener('click',()=>{
    const p=ensurePanel();
    if(p) p.classList.remove('hidden');
  });

  $('copyCodeBtn')?.addEventListener('click',async()=>{
    const code=currentRoom();
    if(code) await copy(code);
  });

  $('leaveBtn')?.addEventListener('click',()=>{
    const u=new URL(location.href);
    if(u.searchParams.has('room')){
      u.searchParams.delete('room');
      history.replaceState({},'',u.pathname+(u.search||'')+(u.hash||''));
    }
  },true);

  const previousRender=render;
  render=function(){
    previousRender();
    updatePanel();
  };

  // Direct entry from a shared link.
  if(invitedRoom){
    if($('room')) $('room').value=invitedRoom;
    const savedName=(localStorage.getItem('scopa-name')||'').trim();
    if($('name') && !$('name').value.trim()) $('name').value=savedName || 'Ospite';

    const note=document.createElement('div');
    note.className='direct-join-note';
    note.textContent=`Accesso alla stanza ${invitedRoom}…`;
    document.body.append(note);

    setTimeout(()=>{
      try{
        connect(invitedRoom);
        setTimeout(()=>note.remove(),900);
      }catch{
        note.textContent='Impossibile entrare nella stanza';
        setTimeout(()=>note.remove(),2200);
      }
    },60);
  }
})();


/* V1.7 - cinematic timing.
   The old motion engine remains, but its clones are slowed down here. */
(()=>{
  const DEAL_DURATION=1150;
  const DEAL_GAP=390;
  const ACTION_DURATION=820;
  const HOLD_AFTER=180;

  let dealIndex=0;
  let lastDealAt=0;

  const style=document.createElement('style');
  style.id='cinematic-motion-timing';
  style.textContent=`
    .motion-clone.cinematic-deal{
      transition-duration:${DEAL_DURATION}ms!important;
      transition-delay:var(--cinematic-delay,0ms)!important;
      transition-timing-function:cubic-bezier(.18,.75,.20,1)!important
    }
    .motion-clone.cinematic-action{
      transition-duration:${ACTION_DURATION}ms!important;
      transition-timing-function:cubic-bezier(.18,.75,.20,1)!important
    }
    body.dealing-cards #hand{pointer-events:none!important}
  `;
  document.head.append(style);

  const nativeRemove=Element.prototype.remove;

  Element.prototype.remove=function(){
    if(
      this?.classList?.contains('cinematic-deal') ||
      this?.classList?.contains('cinematic-action')
    ){
      if(this.dataset.cinematicRemoveScheduled==='1') return;

      this.dataset.cinematicRemoveScheduled='1';
      const created=Number(this.dataset.cinematicCreated||performance.now());
      const delay=Number(this.dataset.cinematicDelay||0);
      const duration=this.classList.contains('cinematic-deal')?DEAL_DURATION:ACTION_DURATION;
      const life=duration+delay+HOLD_AFTER;
      const remaining=Math.max(0,life-(performance.now()-created));

      setTimeout(()=>nativeRemove.call(this),remaining);
      return;
    }

    return nativeRemove.call(this);
  };

  function mark(node){
    if(!(node instanceof Element)) return;

    const candidates=[];
    if(node.matches?.('.motion-clone')) candidates.push(node);
    candidates.push(...(node.querySelectorAll?.('.motion-clone')||[]));

    for(const clone of candidates){
      if(clone.dataset.cinematicMarked==='1') continue;
      clone.dataset.cinematicMarked='1';

      const now=performance.now();
      clone.dataset.cinematicCreated=String(now);

      if(clone.querySelector('.motion-back')){
        if(now-lastDealAt>700) dealIndex=0;
        lastDealAt=now;

        const delay=dealIndex*DEAL_GAP;
        dealIndex++;

        clone.classList.add('cinematic-deal');
        clone.style.setProperty('--cinematic-delay',`${delay}ms`);
        clone.dataset.cinematicDelay=String(delay);

        document.body.classList.add('dealing-cards');
        const clearAfter=DEAL_DURATION+delay+HOLD_AFTER+80;
        setTimeout(()=>document.body.classList.remove('dealing-cards'),clearAfter);
      }else{
        clone.classList.add('cinematic-action');
        clone.dataset.cinematicDelay='0';
      }
    }
  }

  const observer=new MutationObserver(list=>{
    for(const mutation of list){
      for(const node of mutation.addedNodes) mark(node);
    }
  });

  observer.observe(document.documentElement,{childList:true,subtree:true});
})();
