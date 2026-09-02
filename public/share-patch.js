(()=>{
  const s=document.createElement('style');s.textContent='\n.header-actions{display:flex;gap:6px;justify-self:end;align-items:center}.share-btn{background:#ffd24a;color:#173325}.copy-btn{background:#fff;color:#173325}@media(max-width:700px){.header-actions{grid-column:2;grid-row:1;flex-wrap:wrap;justify-content:flex-end}.header-actions .small{min-height:34px;padding:5px 8px;font-size:.72rem}.brand{max-width:120px}}\n';document.head.append(s);
  const $=id=>document.getElementById(id);
  const params=new URLSearchParams(location.search);
  const invitedRoom=(params.get('room')||'').trim().toUpperCase().slice(0,8);
  if(invitedRoom && $('room')){
    $('room').value=invitedRoom;
    if($('inviteHint')) $('inviteHint').textContent=`Sei stato invitato nella stanza ${invitedRoom}. Inserisci il tuo nome e premi “Entra nella stanza”.`;
  }

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
      const ta=document.createElement('textarea'); ta.value=text; document.body.append(ta); ta.select();
      const ok=document.execCommand('copy'); ta.remove(); return ok;
    }
  }

  $('shareBtn')?.addEventListener('click',async()=>{
    const code=currentRoom();
    if(!code) return;
    const url=inviteUrl();
    const text=`Ti invito a giocare a Scopa Online. Stanza ${code}`;
    if(navigator.share){
      try{ await navigator.share({title:'Scopa Online',text,url}); return; }catch(e){ if(e?.name==='AbortError') return; }
    }
    await copy(`${text}\n${url}`);
    const b=$('shareBtn'); if(b){const old=b.textContent;b.textContent='Link copiato ✓';setTimeout(()=>b.textContent=old,1800);}
  });

  $('copyCodeBtn')?.addEventListener('click',async()=>{
    const code=currentRoom(); if(!code) return;
    await copy(code);
    const b=$('copyCodeBtn'); if(b){const old=b.textContent;b.textContent='Copiato ✓';setTimeout(()=>b.textContent=old,1500);}
  });
})();
