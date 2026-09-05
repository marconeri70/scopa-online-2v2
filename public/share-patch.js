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
        ta.value=text; ta.style.position='fixed'; ta.style.opacity='0';
        document.body.append(ta); ta.select();
        const ok=document.execCommand('copy');
        ta.remove();
        return ok;
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
      setStatus('');

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
      const ok=await copy(inviteUrl());
      setStatus(ok?'Link copiato ✓':'Copia non riuscita');
    });

    $('stableCopyCodeBtn').addEventListener('click',async()=>{
      const code=currentRoom();
      const ok=await copy(code);
      setStatus(ok?`Codice ${code} copiato ✓`:'Copia non riuscita');
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

    const code=currentRoom();
    if($('inviteRoomCode')) $('inviteRoomCode').textContent=code||'-----';
    if($('shareBtn')) $('shareBtn').classList.toggle('hidden',!online);
    if($('copyCodeBtn')) $('copyCodeBtn').classList.toggle('hidden',!online);
  }

  $('shareBtn')?.addEventListener('click',()=>{
    const p=ensurePanel();
    if(p){
      p.classList.remove('hidden');
      p.scrollIntoView({block:'center',behavior:'smooth'});
    }
  });

  $('copyCodeBtn')?.addEventListener('click',async()=>{
    const code=currentRoom();
    if(code) await copy(code);
  });

  // Se si esce da un invito, elimina ?room= prima del reload.
  $('leaveBtn')?.addEventListener('click',()=>{
    const u=new URL(location.href);
    if(u.searchParams.has('room')){
      u.searchParams.delete('room');
      history.replaceState({},'',u.pathname + (u.search||'') + (u.hash||''));
    }
  }, true);

  const previousRender=render;
  render=function(){
    previousRender();
    updatePanel();
  };

  // INGRESSO DIRETTO DAL LINK CONDIVISO
  if(invitedRoom){
    if($('room')) $('room').value=invitedRoom;

    const savedName=(localStorage.getItem('scopa-name')||'').trim();
    if($('name') && !$('name').value.trim()){
      $('name').value=savedName || 'Ospite';
    }

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


/* V1.6.4 — Distribuzione carte più lenta e naturale */
(()=>{
  const DEAL_DURATION = 600;   // durata movimento singola carta
  const DEAL_GAP = 180;        // distanza tra una carta e la successiva
  const HOLD_AFTER = 140;      // piccolo margine prima di rimuovere il clone
  let dealIndex = 0;
  let lastDealCloneAt = 0;

  const style = document.createElement('style');
  style.id = 'slow-deal-animation-styles';
  style.textContent = `
    .motion-clone.slow-deal-clone{
      transition-duration:${DEAL_DURATION}ms !important;
      transition-delay:var(--deal-delay,0ms) !important;
      transition-timing-function:cubic-bezier(.18,.78,.25,1) !important;
    }
  `;
  document.head.append(style);

  const nativeRemove = Element.prototype.remove;

  Element.prototype.remove = function(){
    if(this?.classList?.contains('slow-deal-clone') && this.dataset.slowRemoveScheduled !== '1'){
      this.dataset.slowRemoveScheduled = '1';

      const delay = Number(this.dataset.dealDelay || 0);
      const created = Number(this.dataset.dealCreated || performance.now());
      const elapsed = performance.now() - created;
      const targetLife = DEAL_DURATION + delay + HOLD_AFTER;
      const remaining = Math.max(0, targetLife - elapsed);

      setTimeout(()=>nativeRemove.call(this), remaining);
      return;
    }

    return nativeRemove.call(this);
  };

  function markDealClone(node){
    if(!(node instanceof Element)) return;

    const clones = [];
    if(node.matches?.('.motion-clone')) clones.push(node);
    clones.push(...node.querySelectorAll?.('.motion-clone') || []);

    clones.forEach(clone=>{
      if(!clone.querySelector('.motion-back')) return;
      if(clone.classList.contains('slow-deal-clone')) return;

      const now = performance.now();

      // Nuova distribuzione: azzera la sequenza dopo una pausa.
      if(now - lastDealCloneAt > 500){
        dealIndex = 0;
      }
      lastDealCloneAt = now;

      const delay = dealIndex * DEAL_GAP;
      dealIndex++;

      clone.classList.add('slow-deal-clone');
      clone.style.setProperty('--deal-delay', `${delay}ms`);
      clone.dataset.dealDelay = String(delay);
      clone.dataset.dealCreated = String(now);
    });
  }

  const observer = new MutationObserver(mutations=>{
    for(const mutation of mutations){
      for(const node of mutation.addedNodes){
        markDealClone(node);
      }
    }
  });

  observer.observe(document.documentElement, {
    childList:true,
    subtree:true
  });
})();
