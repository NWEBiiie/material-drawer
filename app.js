(() => {
  'use strict';
  const families=[{id:'timber',name:'Timber',note:'NATURALLY GROUNDED',type:'Grain & character'},{id:'stone',name:'Stone',note:'A LITTLE EARTH, REFINED',type:'Weight & permanence'},{id:'textiles',name:'Textiles',note:'SOFTEN THE EDGES',type:'Woven & wonderful'},{id:'finishes',name:'Finishes',note:'THE FINISHING TOUCH',type:'Light & atmosphere'}];
  const samples=[
    ['timber','Natural oak','oak','#c4a16e','Warm / linear grain','Matte, open grain','The easy warmth of pale oak. A quiet foundation that plays beautifully with stone and soft, woven textures.'],
    ['timber','American walnut','walnut','#785a40','Rich / warm brown','Satin, straight grain','Deep brown grain with a gentle glow. Pair with pale plaster or aged brass for a little contrast.'],
    ['timber','White ash','ash','#d9c8a7','Light / subtle grain','Natural, brushed','A light and uncomplicated timber study. Its understated grain leaves room for stronger textures nearby.'],
    ['timber','Smoked oak','smoked','#81735b','Earthy / smoky grey','Brushed, low sheen','Warmth, with a slightly moodier character. A grounded companion to linen, slate, and muted greens.'],
    ['timber','Natural cork','cork','#ba9061','Tactile / warm fleck','Fine granule','Soft-looking, speckled, and wonderfully unpolished. A playful texture that brings warmth to a palette.'],
    ['timber','Charred timber','charred','#33332e','Dark / linear grain','Textured, matte','A deeply toned timber study with a visible linear rhythm. Use it to anchor a softer collection.'],
    ['stone','Ivory travertine','travertine','#d0c0a2','Warm / layered','Honed, vein-cut','Quiet layers, little pores, and a warm mineral tone. A natural counterpart to oak and washed linen.'],
    ['stone','Cloud marble','marble','#e4dfd5','Pale / delicate vein','Honed','A pale stone study traced with soft grey veins. A little movement without too much noise.'],
    ['stone','Warm terrazzo','terrazzo','#d5c9b5','Playful / mixed chip','Polished','Earthy fragments in a soft, warm field. Let the tiny flecks bring the rest of your palette together.'],
    ['stone','Green slate','slate','#555d56','Cool / layered green','Natural cleft','A dark mineral green with a layered surface. It sits comfortably beside warm metals and timber.'],
    ['stone','Quiet limestone','limestone','#c9c2ae','Neutral / fine grain','Honed','A gentle sand-coloured study with a fine mineral texture. An easy neutral for a layered material story.'],
    ['stone','Rosso stone','rosso','#946354','Warm / russet vein','Honed','A warm, dusky red with pale mineral lines. A small dose adds character to an otherwise quiet board.'],
    ['textiles','Washed linen','linen','#c4b79b','Natural / woven','Plain weave','Relaxed, airy, and softly irregular. A woven neutral that helps harder materials feel a little gentler.'],
    ['textiles','Ivory bouclé','boucle','#e0d9c5','Soft / looped','Looped weave','A small landscape of loops and shadows. Pair its softness with a clean stone or smooth metal.'],
    ['textiles','Moss wool','wool','#849077','Green / herringbone','Twill weave','A muted moss study with a fine diagonal rhythm. A soft way to introduce colour without overpowering a room.'],
    ['textiles','Clay velvet','velvet','#865b46','Warm / soft sheen','Short pile','Earthy colour with a quiet shift in light. Rich beside walnut, or softened with pale limestone.'],
    ['textiles','Saddle leather','leather','#7b4931','Warm / fine grain','Low sheen','A familiar cognac tone with a fine-grained surface. A warm accent for natural and mineral materials.'],
    ['textiles','Pebble felt','felt','#a4a39a','Neutral / soft fibre','Pressed fibre','A simple grey study with a soft, compact texture. A useful pause between more expressive surfaces.'],
    ['finishes','Brushed brass','brass','#bba166','Warm / metallic','Directional brushed','A warm metal study that catches the light. An accent rather than a shout, especially beside darker timber.'],
    ['finishes','Satin steel','steel','#b3b6ac','Cool / metallic','Fine brushed','Cool, calm, and lightly reflective. A crisp contrast to woven textures and warm, earthy surfaces.'],
    ['finishes','Lime plaster','plaster','#d8cbb9','Warm / mineral','Hand-trowelled','A softly varied plaster study. Its subtle movement gives a pale surface a little life.'],
    ['finishes','Terracotta','clay','#bd8267','Earthy / baked clay','Unglazed, matte','The warmth of baked clay, without the gloss. A natural bridge between green textiles and pale stone.'],
    ['finishes','Sage lacquer','sage','#9da88e','Green / smooth','Super matte','A gently muted green study. Keep the palette tonal, or bring in a little warm brass for contrast.'],
    ['finishes','Glazed celadon','glaze','#a8bfc0','Cool / soft reflection','Gloss glaze','A watery green-blue glaze with a soft reflection. A small, bright counterpoint to grounded natural textures.']
  ].map((s,i)=>({family:s[0],name:s[1],texture:s[2],color:s[3],character:s[4],finish:s[5],description:s[6],id:`SR-${String(i+1).padStart(2,'0')}`}));
  const $=selector=>document.querySelector(selector),storageKey='sample-room-board-v1';
  let saved=new Set(),query='',toastTimer;
  try{const ids=JSON.parse(localStorage.getItem(storageKey)||'[]');if(Array.isArray(ids))saved=new Set(ids.filter(id=>samples.some(s=>s.id===id)));}catch{}
  const open=new Set(['timber']);
  const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const matching=s=>`${s.name} ${s.family} ${s.character} ${s.finish}`.toLowerCase().includes(query);
  function swatch(s){return `<span class="sample-art material ${s.texture}" aria-hidden="true"></span>${saved.has(s.id)?'<span class="sample-saved" aria-label="On your board">✓</span>':''}<span class="sample-name">${escape(s.name)}</span><span class="sample-code">${s.id} / ${escape(s.finish)}</span>`;}
  $('#drawers').innerHTML=families.map((f,i)=>`<section class="drawer${open.has(f.id)?' open':''}" data-drawer="${f.id}"><div class="drawer-tray" id="tray-${f.id}"><div class="tray-overflow"><div class="tray-content"><p class="tray-note"><span>${f.note}</span><span>SELECT A SAMPLE ↗</span></p><div class="swatch-grid">${samples.filter(s=>s.family===f.id).map(s=>`<button class="sample" data-sample="${s.id}" aria-label="Inspect ${escape(s.name)}">${swatch(s)}</button>`).join('')}</div></div></div></div><button class="drawer-front" data-handle="${f.id}" aria-controls="tray-${f.id}" aria-expanded="${open.has(f.id)}" aria-label="${open.has(f.id)?'Close':'Open'} ${f.name} drawer"><span class="drawer-label"><strong>${f.name}</strong><small>${f.type.toUpperCase()}</small></span><span class="handle" aria-hidden="true"><span class="handle-slot"></span></span><span class="drawer-number">NO. 0${i+1}</span><span class="open-label">6 SAMPLES / ${open.has(f.id)?'PUSH IN':'PULL OUT'}</span></button></section>`).join('');
  function updateDrawers(){
    let total=0;
    families.forEach(f=>{
      const drawer=$(`[data-drawer="${f.id}"]`),handle=drawer.querySelector('[data-handle]'),tray=drawer.querySelector('.drawer-tray');
      const matches=samples.filter(s=>s.family===f.id&&matching(s)),isOpen=open.has(f.id);
      drawer.classList.toggle('open',isOpen);drawer.hidden=!!query&&!matches.length;
      handle.setAttribute('aria-expanded',isOpen);handle.setAttribute('aria-label',`${isOpen?'Close':'Open'} ${f.name} drawer`);
      handle.querySelector('.open-label').textContent=`${query?matches.length:6} SAMPLES / ${isOpen?'PUSH IN':'PULL OUT'}`;
      tray.inert=!isOpen;
      drawer.querySelectorAll('[data-sample]').forEach(button=>{button.hidden=!matching(samples.find(s=>s.id===button.dataset.sample));});
      total+=matches.length;
      $(`[data-family="${f.id}"]`).classList.toggle('active',isOpen);
    });
    $('#emptySearch').hidden=total>0;
  }
  function toggleDrawer(id,force){const next=force??!open.has(id);next?open.add(id):open.delete(id);updateDrawers();}
  document.querySelectorAll('[data-handle]').forEach(button=>{
    let gesture=null,suppressClick=false;
    button.addEventListener('pointerdown',e=>{if(e.button!==0||e.isPrimary===false)return;gesture={y:e.clientY,pointer:e.pointerId,moved:false,wasOpen:open.has(button.dataset.handle)};button.setPointerCapture(e.pointerId);});
    button.addEventListener('pointermove',e=>{if(!gesture||gesture.pointer!==e.pointerId)return;const delta=e.clientY-gesture.y;if(Math.abs(delta)>8)gesture.moved=true;if(gesture.moved){button.style.transform=`translateY(${Math.max(-5,Math.min(10,delta*.12))}px)`;}});
    button.addEventListener('pointerup',e=>{if(!gesture||gesture.pointer!==e.pointerId)return;const delta=e.clientY-gesture.y;if(gesture.moved){suppressClick=true;toggleDrawer(button.dataset.handle,Math.abs(delta)>20?delta>0:gesture.wasOpen);setTimeout(()=>suppressClick=false,0);}button.style.transform='';gesture=null;});
    button.addEventListener('pointercancel',()=>{button.style.transform='';gesture=null;});
    button.addEventListener('click',e=>{if(e.detail===0||!suppressClick)toggleDrawer(button.dataset.handle);});
  });
  document.querySelectorAll('[data-family]').forEach(button=>button.addEventListener('click',()=>{
    if(query){$('#search').value='';query='';}
    open.clear();toggleDrawer(button.dataset.family,true);
    if(matchMedia('(max-width:760px)').matches)$(`[data-drawer="${button.dataset.family}"]`).scrollIntoView({behavior:matchMedia('(prefers-reduced-motion:reduce)').matches?'instant':'smooth',block:'center'});
  }));
  $('#search').addEventListener('input',e=>{query=e.target.value.trim().toLowerCase();if(query)families.forEach(f=>{if(samples.some(s=>s.family===f.id&&matching(s)))open.add(f.id);});updateDrawers();});
  function notify(message){clearTimeout(toastTimer);$('#toast').textContent=message;$('#toast').classList.add('visible');toastTimer=setTimeout(()=>$('#toast').classList.remove('visible'),2200);}
  function save(){try{localStorage.setItem(storageKey,JSON.stringify([...saved]));}catch{notify('Board updated. Browser storage is unavailable.');}updateBoard();}
  function toggleSample(id){if(saved.has(id)){saved.delete(id);notify('Removed from your board');}else{saved.add(id);notify('A little possibility, saved.');}save();const button=$('#detailSave');if(button)button.innerHTML=`${saved.has(id)?'Remove from your board':'Add to your board'} <span>${saved.has(id)?'−':'+'}</span>`;}
  function inspect(id){const s=samples.find(s=>s.id===id);if(!s)return;$('#sampleDetail').innerHTML=`<div class="sample-detail-layout"><div class="detail-art-wrap"><div class="detail-art material ${s.texture}" role="img" aria-label="Illustrative ${escape(s.name)} texture"></div></div><div class="detail-copy"><p class="eyebrow">${s.id} / ${s.family.toUpperCase()}</p><h2>${escape(s.name)}</h2><p class="description">${escape(s.description)}</p><dl class="detail-specs"><div><dt>Character</dt><dd>${escape(s.character)}</dd></div><div><dt>Finish study</dt><dd>${escape(s.finish)}</dd></div><div><dt>Palette</dt><dd>${s.color.toUpperCase()}</dd></div></dl><button class="primary-button" id="detailSave">${saved.has(id)?'Remove from your board':'Add to your board'} <span>${saved.has(id)?'−':'+'}</span></button><p class="detail-disclaimer">Digital material study, not a supplier product. Colour and texture are illustrative; confirm with a physical sample.</p></div></div>`;$('#detailSave').onclick=()=>toggleSample(id);$('#sampleDialog').showModal();}
  $('#drawers').addEventListener('click',e=>{const button=e.target.closest('[data-sample]');if(button)inspect(button.dataset.sample);});
  function updateBoard(){
    $('#boardCount').textContent=saved.size;$('#boardToggle').setAttribute('aria-label',`Your board, ${saved.size} samples`);
    document.querySelectorAll('.sample').forEach(button=>{const s=samples.find(s=>s.id===button.dataset.sample);button.innerHTML=swatch(s);});
    $('#boardItems').innerHTML=saved.size?[...saved].map(id=>{const s=samples.find(s=>s.id===id);return `<article class="board-item"><div class="material ${s.texture}" role="img" aria-label="${escape(s.name)} texture"></div><button class="remove-sample" data-remove="${s.id}" aria-label="Remove ${escape(s.name)}">×</button><h3>${escape(s.name)}</h3><p>${s.id} / ${s.family.toUpperCase()}</p></article>`;}).join(''):'<p class="board-empty"><span>Room for ideas.</span>Open a drawer and choose a sample.<br>Add your favourites to start a story.</p>';
    $('#downloadBoard').disabled=!saved.size;$('#clearBoard').disabled=!saved.size;
  }
  $('#boardToggle').onclick=()=>$('#boardDialog').showModal();
  $('#boardItems').addEventListener('click',e=>{const button=e.target.closest('[data-remove]');if(button){saved.delete(button.dataset.remove);save();}});
  $('#clearBoard').onclick=()=>{saved.clear();save();notify('A fresh start.');};
  document.querySelectorAll('[data-close]').forEach(button=>button.addEventListener('click',()=>document.getElementById(button.dataset.close).close()));
  document.querySelectorAll('dialog').forEach(dialog=>dialog.addEventListener('click',e=>{if(e.target!==dialog)return;const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close();}));
  // A self-contained SVG board: real vector texture studies, not screenshots.
  function boardSvg(){
    const selected=[...saved].map(id=>samples.find(s=>s.id===id)),width=960,rows=Math.ceil(selected.length/3),height=210+rows*255;
    const defs=selected.map(s=>`<pattern id="p-${s.id}" width="24" height="24" patternUnits="userSpaceOnUse"><rect width="24" height="24" fill="${s.color}"/>${s.family==='timber'?'<path d="M4 0v24m7-24v24m8-24v24" stroke="#302818" stroke-opacity=".16" stroke-width="1"/>':s.family==='textiles'?'<path d="M0 2h24M0 8h24M0 14h24M0 20h24M2 0v24M8 0v24M14 0v24M20 0v24" stroke="#ffffff" stroke-opacity=".18"/>':s.texture==='marble'||s.texture==='rosso'?'<path d="m-5 5 25 19m-4-29 12 18" fill="none" stroke="#746a60" stroke-opacity=".3"/>':'<circle cx="5" cy="8" r="1.2" fill="#ffffff" fill-opacity=".22"/><circle cx="18" cy="19" r="1" fill="#302818" fill-opacity=".16"/>'}</pattern>`).join('');
    const cards=selected.map((s,i)=>{const x=48+i%3*292,y=150+Math.floor(i/3)*255;return `<g><rect x="${x}" y="${y}" width="272" height="177" fill="url(#p-${s.id})"/><text x="${x}" y="${y+204}" font-family="Georgia,serif" font-size="23" fill="#323b30">${escape(s.name)}</text><text x="${x}" y="${y+225}" font-family="Arial,sans-serif" font-size="10" fill="#77796f">${s.id} / ${s.family.toUpperCase()} / ${s.color.toUpperCase()}</text></g>`;}).join('');
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><title>The Sample Room — Your material board</title><defs>${defs}</defs><rect width="100%" height="100%" fill="#f2efe8"/><text x="48" y="65" font-family="Georgia,serif" font-size="35" fill="#323b30">A material story.</text><text x="49" y="98" font-family="Arial,sans-serif" font-size="11" fill="#77796f">THE SAMPLE ROOM / ${selected.length} MATERIAL STUDIES</text>${cards}<text x="48" y="${height-20}" font-family="Arial,sans-serif" font-size="10" fill="#77796f">Illustrative digital textures and colours. Confirm with physical samples.</text></svg>`;
  }
  $('#downloadBoard').onclick=()=>{if(!saved.size)return;const url=URL.createObjectURL(new Blob([boardSvg()],{type:'image/svg+xml'})),a=document.createElement('a');a.href=url;a.download='the-sample-room-board.svg';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);notify('Your material story, ready to keep.');};
  updateDrawers();updateBoard();
})();
