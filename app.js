(() => {
  'use strict';
  const samples=[
    ['timber','Natural oak','oak','#b09b7c','Warm / linear grain','Matte, open grain','The easy warmth of pale oak. A quiet foundation that plays beautifully with stone and soft, woven textures.'],
    ['stone','Silver limestone','rosso','#aba895','Warm / russet vein','Honed','A warm, dusky red with pale mineral lines. A small dose adds character to an otherwise quiet board.'],
    ['timber','White ash','ash','#c7bfa8','Light / subtle grain','Natural, brushed','A light and uncomplicated timber study. Its understated grain leaves room for stronger textures nearby.'],
    ['timber','Smoked oak','smoked','#908a77','Earthy / smoky grey','Brushed, low sheen','Warmth, with a slightly moodier character. A grounded companion to linen, slate, and muted greens.'],
    ['timber','Natural cork','cork','#aa9270','Tactile / warm fleck','Fine granule','Soft-looking, speckled, and wonderfully unpolished. A playful texture that brings warmth to a palette.'],
    ['timber','Charred timber','charred','#494a41','Dark / linear grain','Textured, matte','A deeply toned timber study with a visible linear rhythm. Use it to anchor a softer collection.'],
    ['stone','Ivory travertine','travertine','#c3beac','Warm / layered','Honed, vein-cut','Quiet layers, little pores, and a warm mineral tone. A natural counterpart to oak and washed linen.'],
    ['stone','Cloud marble','marble','#d4d4c8','Pale / delicate vein','Honed','A pale stone study traced with soft grey veins. A little movement without too much noise.'],
    ['stone','Warm terrazzo','terrazzo','#bcbcac','Playful / mixed chip','Polished','Earthy fragments in a soft, warm field. Let the tiny flecks bring the rest of your palette together.'],
    ['stone','Green slate','slate','#727a6e','Cool / layered green','Natural cleft','A dark mineral green with a layered surface. It sits comfortably beside warm metals and timber.'],
    ['stone','Quiet limestone','limestone','#c4c4b5','Neutral / fine grain','Honed','A gentle sand-coloured study with a fine mineral texture. An easy neutral for a layered material story.'],
    ['timber','American walnut','walnut','#6f5e4c','Rich / warm brown','Satin, straight grain','Deep brown grain with a gentle glow. Pair with pale plaster or aged brass for a little contrast.'],
    ['textiles','Washed linen','linen','#b8b6a1','Natural / woven','Plain weave','Relaxed, airy, and softly irregular. A woven neutral that helps harder materials feel a little gentler.'],
    ['textiles','Ivory bouclé','boucle','#d1d1bf','Soft / looped','Looped weave','A small landscape of loops and shadows. Pair its softness with a clean stone or smooth metal.'],
    ['textiles','Moss wool','wool','#919b85','Green / herringbone','Twill weave','A muted moss study with a fine diagonal rhythm. A soft way to introduce colour without overpowering a room.'],
    ['textiles','Taupe velvet','velvet','#939081','Warm / soft sheen','Short pile','Earthy colour with a quiet shift in light. Rich beside walnut, or softened with pale limestone.'],
    ['textiles','Greige leather','leather','#a0967e','Warm / fine grain','Low sheen','A familiar cognac tone with a fine-grained surface. A warm accent for natural and mineral materials.'],
    ['textiles','Pebble felt','felt','#a3a798','Neutral / soft fibre','Pressed fibre','A simple grey study with a soft, compact texture. A useful pause between more expressive surfaces.'],
    ['finishes','Brushed brass','brass','#a6a28a','Warm / metallic','Directional brushed','A warm metal study that catches the light. An accent rather than a shout, especially beside darker timber.'],
    ['finishes','Satin steel','steel','#b5bcb2','Cool / metallic','Fine brushed','Cool, calm, and lightly reflective. A crisp contrast to woven textures and warm, earthy surfaces.'],
    ['finishes','Lime plaster','plaster','#c9c9b9','Warm / mineral','Hand-trowelled','A softly varied plaster study. Its subtle movement gives a pale surface a little life.'],
    ['finishes','Sand ceramic','clay','#b6ad98','Earthy / baked clay','Unglazed, matte','The warmth of baked clay, without the gloss. A natural bridge between green textiles and pale stone.'],
    ['finishes','Sage lacquer','sage','#9da88e','Green / smooth','Super matte','A gently muted green study. Keep the palette tonal, or bring in a little warm brass for contrast.'],
    ['finishes','Pearl glaze','glaze','#bdc6b6','Cool / soft reflection','Gloss glaze','A watery green-blue glaze with a soft reflection. A small, bright counterpoint to grounded natural textures.']
  ].map((s,i)=>({family:s[0],name:s[1],texture:s[2],color:s[3],character:s[4],finish:s[5],description:s[6],id:`SR-${String(i+1).padStart(2,'0')}`}));
  const $=selector=>document.querySelector(selector),storageKey='sample-room-board-v1';
  let saved=new Set();
  try{const ids=JSON.parse(localStorage.getItem(storageKey)||'[]');if(Array.isArray(ids))saved=new Set(ids.filter(id=>samples.some(s=>s.id===id)));}catch{}
  const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  let visibleSamples=samples;
  const {pose,track,clamp}=window.SampleWave,reduced=matchMedia('(prefers-reduced-motion:reduce)');
  const colors={timber:'#bdb99b',stone:'#b8c0b2',textiles:'#c5aa96',finishes:'#b1bec1'};
  const plusIcon='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>',checkIcon='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 12 4 4 8-8"/></svg>',closeIcon='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m7 7 10 10M17 7 7 17"/></svg>';
  let currentIndex=-1,position=0,target=0,lastTime=0,velocity=0,frame=0,step=140,slots=[],announceTimer;
  function fileMarkup(s,i){return `<div class="file-slot" data-file="${s.id}" style="--sample-tone:${s.color}"><button class="sample file-card" data-sample="${s.id}" tabindex="-1" aria-label="Inspect ${escape(s.name)} in frosted acrylic"><span class="file-back" aria-hidden="true"></span><span class="file-core-back material ${s.texture}" aria-hidden="true"></span><span class="core-edge core-left" aria-hidden="true"></span><span class="core-edge core-right" aria-hidden="true"></span><span class="core-edge core-top" aria-hidden="true"></span><span class="core-edge core-bottom" aria-hidden="true"></span><span class="file-edge edge-top" aria-hidden="true"></span><span class="file-edge edge-bottom" aria-hidden="true"></span><span class="file-edge edge-left" aria-hidden="true"></span><span class="file-edge edge-right" aria-hidden="true"></span><span class="file-front"><span class="file-art material ${s.texture}" aria-hidden="true"></span><span class="acrylic-glaze" aria-hidden="true"></span><span class="file-tab" aria-hidden="true"></span><span class="file-saved" ${saved.has(s.id)?'':'hidden'} aria-label="Saved"></span></span></button></div>`;}
  function updateCurrent(){
    const next=clamp(Math.round(position),0,visibleSamples.length-1);if(next===currentIndex)return;currentIndex=next;
    $('#previousFile').disabled=next===0;$('#nextFile').disabled=next===visibleSamples.length-1;
    slots.forEach((slot,i)=>{slot.classList.toggle('is-current',i===next);slot.querySelector('button').tabIndex=i===next?0:-1;});
    clearTimeout(announceTimer);announceTimer=setTimeout(()=>{$('#currentAnnouncement').textContent=`${next+1} of ${visibleSamples.length}: ${visibleSamples[next].name}`;},180);
  }
  function draw(time){
    frame=0;const dt=Math.min(40,Math.max(1,time-(lastTime||time-16)));lastTime=time;const before=position;
    position=reduced.matches?target:position+(target-position)*(1-Math.exp(-dt/105));velocity=reduced.matches?0:(position-before)/dt;
    if(Math.abs(target-position)<.0005){position=target;velocity=0;}
    slots.forEach((slot,i)=>{const p=pose(i,position,velocity,reduced.matches);slot.style.visibility=Math.abs(p.y+track(position))<550?'visible':'hidden';slot.style.transform=`translate3d(${p.x}px,${p.y}px,${p.z}px) rotateX(${p.rx}deg) rotateY(${p.ry}deg) rotateZ(${p.rz}deg)`;});
    window.DrawerCabinet.track(track(position));
    updateCurrent();if(Math.abs(target-position)>.0005)requestDraw();
  }
  function requestDraw(){if(!frame)frame=requestAnimationFrame(draw);}
  function syncScroll(){target=clamp(window.scrollY/step,0,visibleSamples.length-1);requestDraw();}
  function resize(){step=innerWidth<=760?115:140;$('#scrollTrack').style.setProperty('--track-height',`${innerHeight+(visibleSamples.length-1)*step}px`);const scale=Math.min(1.02,(innerWidth-84)/1100,(innerHeight-70)/820);document.documentElement.style.setProperty('--drawer-scale',Math.max(.42,scale));syncScroll();}
  function goTo(index,focus=false){index=clamp(index,0,visibleSamples.length-1);window.scrollTo({top:index*step,behavior:'instant'});target=index;requestDraw();if(focus)slots[index].querySelector('button').focus({preventScroll:true});}
  function renderFiles(){$('#files').innerHTML=visibleSamples.map(fileMarkup).join('');slots=[...document.querySelectorAll('.file-slot')];currentIndex=-1;resize();position=target=Math.floor((visibleSamples.length-1)/2);window.scrollTo({top:position*step,behavior:'instant'});draw(performance.now());}
  addEventListener('drawer-category-change',e=>{if(e.detail.index===0)renderFiles();});
  addEventListener('scroll',syncScroll,{passive:true});addEventListener('resize',resize);reduced.addEventListener('change',requestDraw);
  $('#previousFile').onclick=()=>goTo(currentIndex-1);$('#nextFile').onclick=()=>goTo(currentIndex+1);
  addEventListener('keydown',e=>{if(document.body.dataset.drawer!=='files'||document.querySelector('dialog[open]')||e.altKey||e.ctrlKey||e.metaKey)return;const indices={ArrowDown:currentIndex+1,ArrowUp:currentIndex-1,PageDown:currentIndex+4,PageUp:currentIndex-4,Home:0,End:visibleSamples.length-1};if(e.key in indices){e.preventDefault();goTo(indices[e.key],!!e.target.closest('.file-card'));}});
  function notify(message){$('#toast').textContent=message;}
  function save(){try{localStorage.setItem(storageKey,JSON.stringify([...saved]));}catch{notify('Saved for this visit.');}updateBoard();}
  function toggleSample(id){saved.has(id)?saved.delete(id):saved.add(id);save();const b=$('#detailSave');if(b){b.innerHTML=saved.has(id)?checkIcon:plusIcon;b.setAttribute('aria-pressed',saved.has(id));b.setAttribute('aria-label',saved.has(id)?'Remove saved sample':'Save sample');}notify(saved.has(id)?'Sample saved':'Sample removed');}
  function inspect(id){const s=samples.find(s=>s.id===id);if(!s)return;$('#sampleDetail').innerHTML=`<div class="detail-art material ${s.texture}" style="--sample-tone:${s.color}" role="img" aria-label="${escape(s.name)} texture"></div><div class="detail-actions"><button id="detailSave" class="round-control" aria-label="${saved.has(id)?'Remove saved sample':'Save sample'}" aria-pressed="${saved.has(id)}">${saved.has(id)?checkIcon:plusIcon}</button></div>`;$('#sampleDialog').setAttribute('aria-label',s.name);$('#detailSave').onclick=()=>toggleSample(id);$('#sampleDialog').showModal();}
  $('#files').addEventListener('click',e=>{const b=e.target.closest('[data-sample]');if(!b)return;const index=visibleSamples.findIndex(s=>s.id===b.dataset.sample);goTo(index);inspect(b.dataset.sample);});
  function updateBoard(){
    $('#boardDot').hidden=!saved.size;$('#boardToggle').setAttribute('aria-label',`Open saved samples, ${saved.size} saved`);
    document.querySelectorAll('.file-saved').forEach(marker=>{marker.hidden=!saved.has(marker.closest('[data-sample]').dataset.sample);});
    $('#boardItems').innerHTML=saved.size?[...saved].map(id=>{const s=samples.find(s=>s.id===id);return `<article class="board-item"><div class="material ${s.texture}" style="--sample-tone:${s.color}" role="img" aria-label="${escape(s.name)} texture"></div><button class="remove-sample" data-remove="${s.id}" aria-label="Remove ${escape(s.name)}">${closeIcon}</button></article>`;}).join(''):`<div class="board-empty" role="status" aria-label="No saved samples"><svg viewBox="0 0 48 48" aria-hidden="true"><rect x="8" y="8" width="13" height="13" rx="1"/><rect x="27" y="8" width="13" height="13" rx="1"/><rect x="8" y="27" width="13" height="13" rx="1"/><rect x="27" y="27" width="13" height="13" rx="1"/></svg></div>`;
    $('#downloadBoard').disabled=!saved.size;$('#clearBoard').disabled=!saved.size;
  }
  $('#boardToggle').onclick=()=>$('#boardDialog').showModal();$('#boardItems').addEventListener('click',e=>{const b=e.target.closest('[data-remove]');if(b){saved.delete(b.dataset.remove);save();}});$('#clearBoard').onclick=()=>{saved.clear();save();};
  document.querySelectorAll('[data-close]').forEach(b=>b.addEventListener('click',()=>document.getElementById(b.dataset.close).close()));
  document.querySelectorAll('dialog').forEach(dialog=>dialog.addEventListener('click',e=>{if(e.target!==dialog)return;const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close();}));

  // A self-contained SVG board: real vector texture studies, not screenshots.
  function boardSvg(){
    const selected=[...saved].map(id=>samples.find(s=>s.id===id)),width=960,rows=Math.ceil(selected.length/3),height=210+rows*255;
    const defs=selected.map(s=>`<pattern id="p-${s.id}" width="24" height="24" patternUnits="userSpaceOnUse"><rect width="24" height="24" fill="${s.color}"/>${s.family==='timber'?'<path d="M4 0v24m7-24v24m8-24v24" stroke="#302818" stroke-opacity=".16" stroke-width="1"/>':s.family==='textiles'?'<path d="M0 2h24M0 8h24M0 14h24M0 20h24M2 0v24M8 0v24M14 0v24M20 0v24" stroke="#ffffff" stroke-opacity=".18"/>':s.texture==='marble'||s.texture==='rosso'?'<path d="m-5 5 25 19m-4-29 12 18" fill="none" stroke="#746a60" stroke-opacity=".3"/>':'<circle cx="5" cy="8" r="1.2" fill="#ffffff" fill-opacity=".22"/><circle cx="18" cy="19" r="1" fill="#302818" fill-opacity=".16"/>'}</pattern>`).join('');
    const cards=selected.map((s,i)=>{const x=48+i%3*292,y=150+Math.floor(i/3)*255;return `<g><rect x="${x}" y="${y}" width="272" height="177" fill="url(#p-${s.id})"/><text x="${x}" y="${y+204}" font-family="Georgia,serif" font-size="23" fill="#323b30">${escape(s.name)}</text><text x="${x}" y="${y+225}" font-family="Arial,sans-serif" font-size="10" fill="#77796f">${s.id} / ${s.family.toUpperCase()} / ${s.color.toUpperCase()}</text></g>`;}).join('');
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><title>The Sample Room — Your material board</title><defs>${defs}</defs><rect width="100%" height="100%" fill="#f2efe8"/><text x="48" y="65" font-family="Georgia,serif" font-size="35" fill="#323b30">A material story.</text><text x="49" y="98" font-family="Arial,sans-serif" font-size="11" fill="#77796f">THE SAMPLE ROOM / ${selected.length} MATERIAL STUDIES</text>${cards}<text x="48" y="${height-20}" font-family="Arial,sans-serif" font-size="10" fill="#77796f">Illustrative digital textures and colours. Confirm with physical samples.</text></svg>`;
  }
  $('#downloadBoard').onclick=()=>{if(!saved.size)return;const url=URL.createObjectURL(new Blob([boardSvg()],{type:'image/svg+xml'})),a=document.createElement('a');a.href=url;a.download='the-sample-room-board.svg';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);notify('Your material story, ready to keep.');};
  window.MaterialLibrary={samples,inspect};
  renderFiles();updateBoard();window.DrawerCabinet.select(0);
})();
