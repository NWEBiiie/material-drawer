import {createFinishPicker} from './case-finishes.js?v=folio-plastic-20261113';
import {createStudyDimensions} from './study-dimensions.js?v=3';
import './study-nav.js?v=4';
import {createRetractableTethers} from './retractable-tethers.js?v=2';
import * as THREE from './three.module.min.js';
import {GLTFLoader} from './binder-loader.js';
import {OrbitControls} from './binder-orbit.js';
import {createSampleInspection} from './binder-inspection.js?v=7';

const $=id=>document.getElementById(id),canvas=$('miniScene');
const mode=new URLSearchParams(location.search).get('view')==='pockets'?'pockets':'wave',wave=mode==='wave';
const params=new URLSearchParams(location.search),vp=Number(params.get('volume')),volume=Number.isInteger(vp)&&vp>=1&&vp<=6?vp:1,belt=wave;
const prefix=(belt?'belt':mode)+(volume===1?'':'-volume-'+volume);
let beltMesh,dowel,beltBase,travelDirection=1,dowelInput;
let socketControl, socketChoice, clampChoice, nominalStations, socketMove;
const sockets=[], clamps=[];
const clampKey='sample-room:panel-clamps:chart2:'+volume;
const reduced=matchMedia('(prefers-reduced-motion: reduce)'),I=.0254;
let tethers,dimensions,finishes;
let renderer,scene,camera,controls,model,mixer,action,clip,inspection,data,moving;
let ready=false,opened=0,target=1,last=performance.now(),selected=7,focus=7,focusTarget=7,hovered=null,queuedPick=null,queuedClose=false,lastWheel=0,shaft,playing=false,cutOpen=false;
const followers=[],springs=[],panels=[];
const carriers=[],homes=new Map(),ray=new THREE.Raycaster(),pointer=new THREE.Vector2();
const fraction=n=>{const w=Math.floor(n),num=Math.round((n-w)*32);if(!num)return String(w);let a=num,b=32;while(b)[a,b]=[b,a%b];return `${w?w+' ':''}${num/a}/${32/a}`;};
const size=a=>a.slice(0,2).map(fraction).join(' × ')+'″';
const heading=wave?(belt?'Belt wave drawer':'Wave drawer'):'Pocket box';
document.title=heading+' — UTSW Folio';$('studyTitle').innerHTML=heading+'<span>'+(wave?'03':'04')+'</span>';
document.querySelector(`[data-mode=${mode}]`).setAttribute('aria-current','page');
$('studyDescription').textContent=wave?'Padded blue fabric, stitched binding, and soft pull tabs. A handwheel lifts the samples in a wave.':'Small square samples sit in individual fitted foam pockets. Lift a piece to read its back label.';
$('blendDownload').href=prefix+'-model.blend';$('glbDownload').href=prefix+'-model.glb';

function paintSelection(){const s=data.materials[selected];$('caseCount').textContent=String(selected+1).padStart(2,'0')+' / '+carriers.length;$('caseName').textContent=s.id+' · '+(s.color||s.series||s.manufacturer);if(socketChoice)showSocket(s.id);}
function showSocket(id){
 socketControl.firstChild.textContent=id+' socket ';
 socketChoice.options[0].disabled=selected===0;
 socketChoice.options[2].disabled=selected===carriers.length-1;
 const desired=socketMove?.index===selected?socketMove.end:data.slotPositions[selected];
 socketChoice.value=String(Math.round((desired-nominalStations[selected])/data.mechanism.socketAdjustment));
 const clamp=clamps[selected];
 clampChoice.checked=clamp.tight;
 clampChoice.disabled=Boolean(socketMove)||!target;
 clampChoice.setAttribute('aria-label','Tighten side bolts for '+id);
 socketChoice.disabled=!target||Boolean(socketMove)||clamp.tight||clamp.turn>0;
}
function toggleClamp(index){
 if(socketMove||!target||inspection.active)return;
 select(index);
 const clamp=clamps[index];clamp.tight=!clamp.tight;
 try{localStorage.setItem(clampKey,JSON.stringify(carriers.filter((_,i)=>clamps[i].tight).map(o=>o.userData.material_id)));}catch{}
 paintSelection();
}
function setupSockets(){
 nominalStations=data.slotPositions.slice();
 model.traverse(o=>{if(Number.isInteger(o.userData.socket_index))sockets[o.userData.socket_index]=o;});
 if(sockets.filter(Boolean).length!==carriers.length)throw Error('Incomplete drawer sockets');
 let savedClamps=[];try{const saved=JSON.parse(localStorage.getItem(clampKey));if(Array.isArray(saved))savedClamps=saved;}catch{}
 for(const [i,socket] of sockets.entries()){
  const screws=socket.children.filter(o=>o.userData.bolt_side).map(o=>({part:o,looseX:o.position.x}));
  if(screws.length!==2)throw Error('Missing panel bolt');
  clamps.push({screws,tight:savedClamps.includes(carriers[i].userData.material_id),turn:0});
 }
 socketControl=document.createElement('label');socketControl.append(document.createTextNode('Socket '));
 socketChoice=document.createElement('select');socketChoice.setAttribute('aria-label','Holder position in the panel slots');
 for(const [value,label] of [[-1,'Forward 1/16″'],[0,'Centered'],[1,'Back 1/16″']])socketChoice.add(new Option(label,String(value)));
 socketControl.append(socketChoice);dowelInput.closest('aside').append(socketControl);socketControl.hidden=true;
 const label=document.createElement('label');clampChoice=document.createElement('input');clampChoice.type='checkbox';
 label.append(clampChoice,document.createTextNode(' Tighten side bolts'));socketControl.after(label);
 clampChoice.onchange=()=>toggleClamp(selected);
 const key='sample-room:belt-sockets:chart2:'+volume;
 function valid(step,i){return Number.isInteger(step)&&step>=-1&&step<=1&&!(i===0&&step<0)&&!(i===carriers.length-1&&step>0);}
 const steps=nominalStations.map(()=>0);
 try{const saved=JSON.parse(localStorage.getItem(key));if(Array.isArray(saved))carriers.forEach((_,i)=>{if(valid(saved[i],i)){steps[i]=saved[i];setSocketPosition(i,nominalStations[i]+steps[i]*data.mechanism.socketAdjustment);}});}catch{}
 socketChoice.onchange=()=>{
  const step=Number(socketChoice.value);if(!target||socketMove||clamps[selected].tight||clamps[selected].turn>0||!valid(step,selected))return;
  steps[selected]=step;
  socketMove={index:selected,start:data.slotPositions[selected],end:nominalStations[selected]+step*data.mechanism.socketAdjustment,elapsed:0};
  socketChoice.disabled=true;select(selected);
  try{localStorage.setItem(key,JSON.stringify(steps));}catch{}
 };
}
function setSocketPosition(index,distance){
 sockets[index].position.z=-distance*I;data.slotPositions[index]=distance;
}
function animateSocket(dt){
 for(const [i,clamp] of clamps.entries()){
  const goal=Number(clamp.tight);if(clamp.turn===goal)continue;
  clamp.turn+=Math.sign(goal-clamp.turn)*Math.min(Math.abs(goal-clamp.turn),reduced.matches?1:dt*3);
  for(const {part,looseX} of clamp.screws){
   const side=part.userData.bolt_side;
   part.position.x=looseX-side*clamp.turn*data.mechanism.screwTravel*I;
   part.rotation.x=-side*clamp.turn*Math.PI*1.5;
  }
  if(i===selected&&clamp.turn===goal)paintSelection();
 }
 if(!socketMove)return;
 const move=socketMove;
 move.elapsed+=dt;
 const t=reduced.matches?1:Math.min(1,move.elapsed/.65);
 setSocketPosition(move.index,THREE.MathUtils.lerp(move.start,move.end,THREE.MathUtils.smoothstep(t,0,1)));
 if(t===1){socketMove=null;paintSelection();}
}
function select(i){playing=false;$('motionToggle').setAttribute('aria-pressed','false');$('motionToggle').textContent='▷';const n=carriers.length;selected=belt?Math.max(0,Math.min(n-1,i)):((i%n)+n)%n;focusTarget=belt?selected:focusTarget+(((selected-focusTarget)%n+n*1.5)%n)-n/2;paintSelection();}
function setOpen(value){
 hovered=null;$('hover').hidden=true;
 if(!value&&inspection?.active){queuedClose=true;queuedPick=null;inspection.putBack();return;}
 target=value?1:0;$('lidToggle').textContent=(value?'Close ':'Open ')+(wave?'drawer':'box');$('lidToggle').setAttribute('aria-expanded',String(!!value));
 if(clampChoice)paintSelection();
 for(const id of ['prev','next','pickCurrent'])$(id).disabled=!value;
}
function pick(id){
 if(inspection.active)return;
 const index=data.materials.findIndex(s=>s.id===id);if(index<0)return;
 inspection.audio.unlock();select(index);
 if(opened<.999){queuedPick=id;setOpen(true);return;}
 const object=carriers.find(o=>o.userData.material_id===id);hovered=null;queuedPick=null;
 // Keep the exact wave/hover position for an uninterrupted lift and return.
 object.updateMatrixWorld(true);inspection.pick(object,data.materials[selected]);
}
function changed(h){
 const active=!!h;$('inspection').hidden=!active;$('caseFooter').hidden=active;$('hover').hidden=true;
 for(const id of ['zoomIn','zoomOut','reset','info','mechanismToggle','motionToggle'])$(id).disabled=active;
 if(active){$('heldName').textContent=h.record.id+' · '+(h.record.color||h.record.series||h.record.manufacturer);$('flipSample').textContent=h.face==='back'?'Flip to front':'Flip to back';$('flipSample').disabled=h.phase!=='held';$('returnSample').disabled=h.phase==='returning';}
 canvas.style.cursor=active?'pointer':'grab';
}
function soundUI(){const mute=inspection.audio.muted;$('soundToggle').setAttribute('aria-pressed',String(mute));$('soundToggle').setAttribute('aria-label',mute?'Enable snap sounds':'Mute snap sounds');}
function details(id){
 const s=data.materials.find(s=>s.id===id),c=data.samples.find(s=>s.id===id);
 $('sampleId').textContent=id;$('sampleImage').src=s.preview;$('sampleImage').alt=s.color||s.series||s.manufacturer;$('sampleName').textContent=s.color||s.series||s.manufacturer;$('sampleMaker').textContent=[s.manufacturer,s.series].filter(Boolean).join(' · ');$('sampleCut').textContent=size(s.cut)+(s.planKnown===false?' · display proxy':'');$('sampleThickness').textContent=s.thicknessKnown===false?'Unknown · display proxy':fraction(s.cut[2])+'″ · unchanged';
 $('mountLabel').textContent=wave?'Carrier':'Pocket';$('sampleBoard').textContent=wave?size(c.board):'Fitted foam';
 $('sampleStatus').textContent=s.source.status==='illustrative-placeholder'?'Illustrative color placeholder':s.source.status==='manufacturer-color-reference'?'Manufacturer color reference':'Matching product texture';$('sampleNote').textContent=[s.source.notes,s.scheduleNote].filter(Boolean).join(' ');$('sampleSource').href=s.source.pageURL;$('sampleSource').hidden=!s.source.pageURL;$('details').showModal();
}
function hit(e){
 const r=canvas.getBoundingClientRect();pointer.set((e.clientX-r.left)/r.width*2-1,1-(e.clientY-r.top)/r.height*2);ray.setFromCamera(pointer,camera);
 const first=ray.intersectObject(model,true).find(h=>{let o=h.object;while(o){if(!o.visible)return false;o=o.parent;}return true;});if(!first)return null;
 let o=first.object;while(o){if(o.userData.bolt_side&&opened>.999)return {clamp:o.parent.userData.socket_index};if(o.userData.side_pull)return {sidePull:first.point};if(o.userData.material_id&&opened>.999)return {id:o.userData.material_id};if(o.userData.wave_shaft||o.userData.belt_control)return {drive:true};if(o===moving)return {moving:true};o=o.parent;}return null;
}
function bindSidePull(){
 const plane=new THREE.Plane(),point=new THREE.Vector3(),normal=new THREE.Vector3(1,0,0);
 let drag=null;
 canvas.addEventListener('pointerdown',e=>{
  if(!e.isPrimary||e.button!==0||inspection.active||opened!==target)return;
  const contact=hit(e)?.sidePull;if(!contact||Math.abs(ray.ray.direction.x)<.035)return;
  plane.setFromNormalAndCoplanarPoint(normal,contact);
  const local=moving.worldToLocal(contact.clone());
  drag={id:e.pointerId,offset:dowel.position.z-local.z};
  e.stopImmediatePropagation();canvas.setPointerCapture(e.pointerId);
  playing=false;$('motionToggle').setAttribute('aria-pressed','false');$('motionToggle').textContent='▷';
  hovered=null;$('hover').hidden=true;canvas.style.cursor='grabbing';
 },true);
 canvas.addEventListener('pointermove',e=>{
  if(!drag||drag.id!==e.pointerId)return;
  e.stopImmediatePropagation();
  const r=canvas.getBoundingClientRect();pointer.set((e.clientX-r.left)/r.width*2-1,1-(e.clientY-r.top)/r.height*2);
  ray.setFromCamera(pointer,camera);if(!ray.ray.intersectPlane(plane,point))return;
  const slots=data.slotPositions,y=-(moving.worldToLocal(point).z+drag.offset)/I;
  let i=0;while(i<slots.length-2&&y>slots[i+1])i++;
  focus=focusTarget=i+THREE.MathUtils.clamp((y-slots[i])/(slots[i+1]-slots[i]),0,1);
  selected=Math.round(focus);dowelInput.value=focus;paintSelection();
 },true);
 function end(e){
  if(!drag||drag.id!==e.pointerId)return;
  drag=null;e.stopImmediatePropagation();canvas.style.cursor='grab';
  if(canvas.hasPointerCapture(e.pointerId))canvas.releasePointerCapture(e.pointerId);
 }
 for(const event of ['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(event,end,true);
}
function reset(){camera.zoom=1;camera.position.set(...(belt?[.78,.42,.72]:wave?[.50,.60,.85]:[.45,.65,.66]));controls.target.set(...(wave?[0,.12,.18]:[0,.075,-.035]));camera.lookAt(controls.target);controls.update();resize();}
function resize(){const w=canvas.clientWidth,h=canvas.clientHeight,a=w/h;renderer.setSize(w,h,false);const span=wave?(a<.8?.47/a:.68):(a<.8?.56/a:.60);camera.left=-span*a/2;camera.right=span*a/2;camera.top=span/2;camera.bottom=-span/2;camera.updateProjectionMatrix();inspection?.resize();}
function frame(now){
 const dt=Math.min(.05,(now-last)/1000);last=now;
 animateSocket(dt);
 if(!inspection.active){
  const blend=reduced.matches?1:1-Math.exp(-dt*11);
  opened=reduced.matches?target:opened+Math.sign(target-opened)*Math.min(Math.abs(target-opened),dt/1.1);
  action.time=(data.drawerDuration||clip.duration)*opened;mixer.update(0);
  if(wave){
   const n=carriers.length;
   if(opened===1&&target===1){if(playing&&!reduced.matches){focusTarget+=dt*1.5*(belt?travelDirection:1);if(belt&&(focusTarget>=n-1||focusTarget<=0)){focusTarget=Math.max(0,Math.min(n-1,focusTarget));travelDirection*=-1;}}focus+=(focusTarget-focus)*blend;if(playing){selected=((Math.round(focus)%n)+n)%n;paintSelection();}}
   const theta=focus*Math.PI*2/n,m=data.mechanism;
   if(belt){const slots=data.slotPositions,lo=Math.max(0,Math.min(n-1,Math.floor(focus))),hi=Math.min(n-1,lo+1),c=THREE.MathUtils.lerp(slots[lo],slots[hi],Math.max(0,focus-lo));
    dowel.position.z=-c*I;beltMesh.morphTargetInfluences?.fill(0);const p=beltMesh.geometry.attributes.position;
    for(let j=0;j<p.count;j++)p.setY(j,beltBase[j*3+1]+beltLift(-beltBase[j*3+2]/I,c,m)*I);
    p.needsUpdate=true;beltMesh.geometry.computeVertexNormals();beltMesh.geometry.computeBoundingSphere();
    for(const f of followers){const y=slots[f.userData.wave_follower];f.position.z=-y*I;f.position.y=beltLift(y,c,m)*I;}
    if(dowelInput&&document.activeElement!==dowelInput)dowelInput.value=focus;
   }else{shaft.rotation.set(0,0,-theta);
    for(const f of followers){const lift=camLift(theta,f.userData.wave_follower,m);f.position.y=lift*I;}
    for(const s of springs){const lift=camLift(theta,s.userData.wave_spring,m);s.position.y=(3.09+lift)*I;s.scale.y=m.springFreeSpan-lift;}
   }
  }else for(const o of carriers){const home=homes.get(o.userData.material_id),lift=target===1&&opened>.999&&hovered===o.userData.material_id?.004:0;o.position.lerp(new THREE.Vector3(home.x,home.y+lift,home.z),blend);}
 }
 controls.update();inspection.update(dt);
 if(queuedPick&&opened>.999&&!inspection.active)pick(queuedPick);
 tethers?.update();dimensions?.update(!inspection?.active);finishes?.update(!inspection?.active);renderer.render(scene,inspection?.active?inspection.camera:camera);inspection.render();requestAnimationFrame(frame);
}
function camLift(theta,index,m=data.mechanism){const a=theta-index*Math.PI*2/carriers.length,e=m.eccentricity,r=m.camRadius+m.rollerRadius;return e*Math.cos(a)+Math.sqrt(r*r-e*e*Math.sin(a)**2)-(r-e);}
function beltLift(y,c,m){const width=Math.min(m.halfWidth,y<c?c-m.beltStart:m.beltEnd-c);return width>0&&Math.abs(y-c)<width?m.stroke*.5*(1+Math.cos(Math.PI*(y-c)/width)):0;}
function mechanismView(value){cutOpen=value;panels.forEach(o=>o.visible=!value);if(socketControl)socketControl.hidden=!value;$('mechanismToggle').setAttribute('aria-pressed',String(value));}
async function boot(){try{
 renderer=new THREE.WebGLRenderer({canvas,antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.setClearColor('#eeeae2');renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.25;
 scene=new THREE.Scene();camera=new THREE.OrthographicCamera(-.5,.5,.4,-.4,.001,10);controls=new OrbitControls(camera,canvas);controls.enableDamping=true;controls.enableZoom=false;controls.enablePan=false;controls.maxPolarAngle=Math.PI*.48;controls.minPolarAngle=.1;
 scene.add(new THREE.HemisphereLight(0xffffff,0xa7a99d,2.2));const key=new THREE.DirectionalLight(0xfff7e8,3.1);key.position.set(.3,.8,.6);key.castShadow=true;key.shadow.mapSize.set(2048,2048);Object.assign(key.shadow.camera,{left:-.65,right:.65,top:.7,bottom:-.65,near:.01,far:2});key.shadow.normalBias=.0005;key.shadow.bias=-.0001;scene.add(key);const fill=new THREE.DirectionalLight(0xe3ecff,1.2);fill.position.set(-.6,.4,-.3);scene.add(fill);
 const floor=new THREE.Mesh(new THREE.PlaneGeometry(200,200),new THREE.ShadowMaterial({color:0x414938,opacity:.18}));floor.rotation.x=-Math.PI/2;floor.position.y=-.002;floor.receiveShadow=true;scene.add(floor);
 const assetVersion='textures-20261111';
 const [gltf,records]=await Promise.all([new GLTFLoader().loadAsync(prefix+'-model.glb?v=folio-plastic-20261113'),fetch(prefix+'-data.json?v='+assetVersion).then(r=>{if(!r.ok)throw Error('Missing material data');return r.json();})]);
 data=records;model=gltf.scene;scene.add(model);model.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;const mats=Array.isArray(o.material)?o.material:[o.material];mats.forEach(m=>{if(m.map)m.map.anisotropy=8;});if(o.userData.window_panel){o.castShadow=false;mats.forEach(m=>{m.transparent=true;m.opacity=.14;m.depthWrite=false;});}}if(o.userData.material_id){carriers.push(o);homes.set(o.userData.material_id,o.position.clone());}if(o.userData.motion)moving=o;if(o.userData.wave_shaft)shaft=o;if(o.userData.sliding_belt){beltMesh=o;beltBase=o.geometry.attributes.position.array.slice();o.frustumCulled=false;}if(o.userData.belt_control)dowel=o;if(o.userData.wave_follower!==undefined)followers.push(o);if(o.userData.wave_spring!==undefined)springs.push(o);if(o.userData.cutaway)panels.push(o);});carriers.sort((a,b)=>a.userData.index-b.userData.index);
 clip=gltf.animations[0];if(carriers.length!==data.materials.length||!clip||!moving)throw Error('Incomplete sample study');mixer=new THREE.AnimationMixer(model);action=mixer.clipAction(clip);action.setLoop(THREE.LoopOnce,1);action.clampWhenFinished=true;action.play();action.paused=true;
 finishes=await createFinishPicker({kind:mode});finishes.attach(model,mode);
 dimensions=createStudyDimensions({model,camera,canvas,kind:mode,data});
 tethers=createRetractableTethers({model,scene});
 inspection=createSampleInspection({renderer,scene,camera,controls,tethers,onChange:changed,onReturned(){if(queuedClose){queuedClose=false;setOpen(false);}}});
 $('flipSample').onclick=()=>inspection.flip();$('returnSample').onclick=()=>inspection.putBack();$('sampleInfo').onclick=()=>details(inspection.selection.record.id);$('soundToggle').onclick=()=>{inspection.audio.toggle();soundUI();};soundUI();
 $('lidToggle').onclick=()=>setOpen(!target);$('prev').onclick=()=>{select(selected-1);hovered=data.materials[selected].id;};$('next').onclick=()=>{select(selected+1);hovered=data.materials[selected].id;};$('pickCurrent').onclick=()=>pick(data.materials[selected].id);
 $('mechanismToggle').hidden=!wave;$('motionToggle').hidden=!wave;$('mechanismNotes').hidden=!wave;
 if(belt){if(!beltMesh||!dowel)throw Error('Missing belt mechanism');$('mechanismToggle').setAttribute('aria-label','Show belt and dowel cutaway');$('motionToggle').setAttribute('aria-label','Run sliding dowel demonstration');$('studyDescription').textContent='Drag the wooden grip along the slot on the right side. Each sample has a reel directly beneath its slot. Lift and flip the sample to see the cord pay out through the carriage.';$('mechanismNotes').textContent=data.mechanism.note;dowelInput=document.querySelector('#dowelPosition');dowelInput.max=carriers.length-1;bindSidePull();document.querySelector('#caseFooter .hint').textContent='Drag side grip to browse · Click sample to lift';dowelInput.oninput=()=>{playing=false;$('motionToggle').setAttribute('aria-pressed','false');$('motionToggle').textContent='▷';focusTarget=Number(dowelInput.value);selected=Math.round(focusTarget);paintSelection();setOpen(true);};}
 if(belt){setupSockets();$('studyDescription').textContent='Each gray holder bolts through the slots at the top of the blue panels. Loosen its side bolts to adjust its position in the cutaway.';}
 if(!wave)$('studyDescription').textContent=`${data.pocketGrid[0]} rows of ${data.pocketGrid[1]} pockets. ${carriers.length} filled · ${data.pockets-carriers.length} open. Lift any sample to inspect its reverse.`;
 document.querySelector('#about dd').textContent=carriers.length;
 if(data.materials.some(s=>s.thicknessKnown===false)){document.querySelector('#about dl dt:last-of-type').textContent='Known thicknesses';document.querySelector('#about dl dd:last-of-type').textContent='Preserved · unknown values use a 0.02″ display proxy';}
 if(volume>1||belt)document.querySelector('#about a[href="mini-source.zip"]').hidden=true;
 $('blendDownload').textContent='Blender ↓';$('glbDownload').textContent='GLB ↓';
 $('mechanismToggle').onclick=()=>mechanismView(!cutOpen);$('motionToggle').onclick=()=>{playing=!playing;$('motionToggle').setAttribute('aria-pressed',String(playing));$('motionToggle').textContent=playing?'Ⅱ':'▷';if(playing)setOpen(true);};
 $('zoomIn').onclick=()=>{camera.zoom=Math.min(2.3,camera.zoom*1.15);camera.updateProjectionMatrix();};$('zoomOut').onclick=()=>{camera.zoom=Math.max(.6,camera.zoom/1.15);camera.updateProjectionMatrix();};$('reset').onclick=reset;$('info').onclick=()=>$('about').showModal();
 data.materials.forEach(s=>{const b=document.createElement('button');b.textContent=s.id+' · '+(s.color||s.series||s.manufacturer);b.onclick=()=>{$('about').close();pick(s.id);};$('materialIndex').append(b);});
 canvas.addEventListener('wheel',e=>{e.preventDefault();if(!inspection.active&&target===1&&Math.abs(e.deltaY)>3&&performance.now()-lastWheel>110){select(selected+Math.sign(e.deltaY));hovered=data.materials[selected].id;lastWheel=performance.now();}},{passive:false});
 let down=null;canvas.addEventListener('pointerdown',e=>{down={x:e.clientX,y:e.clientY};});canvas.addEventListener('pointercancel',()=>{down=null;});canvas.addEventListener('pointerup',e=>{if(down&&Math.hypot(e.clientX-down.x,e.clientY-down.y)<6){if(inspection.active){inspection.hit(e)?inspection.flip():inspection.putBack();}else{const h=hit(e);if(h?.id)pick(h.id);else if(h?.clamp!==undefined)toggleClamp(h.clamp);else if(h?.drive)select(selected+1);else if(h?.moving)setOpen(!target);}}down=null;});
 canvas.addEventListener('pointermove',e=>{if(inspection.active||down){$('hover').hidden=true;return;}const h=hit(e);hovered=opened>.999?h?.id:null;canvas.style.cursor=h?.sidePull?'ew-resize':(h?.id||h?.moving||h?.drive||h?.clamp!==undefined)?'pointer':'grab';$('hover').hidden=!hovered;if(hovered){select(data.materials.findIndex(s=>s.id===hovered));$('hover').querySelector('b').textContent=hovered+' · '+(data.materials[selected].color||data.materials[selected].series||data.materials[selected].manufacturer);$('hover').querySelector('span').textContent='Lift sample';$('hover').style.left=Math.max(8,Math.min(innerWidth-255,e.clientX+15))+'px';$('hover').style.top=Math.min(innerHeight-80,e.clientY+15)+'px';}});canvas.addEventListener('pointerleave',()=>{hovered=null;$('hover').hidden=true;});
 addEventListener('keydown',e=>{if(document.querySelector('dialog[open]'))return;if(inspection.active){if(e.key==='Escape'){e.preventDefault();inspection.putBack();}if(e.key.toLowerCase()==='f')inspection.flip();return;}if(e.target.closest('button,a,input,select'))return;if(['ArrowLeft','ArrowRight'].includes(e.key)){e.preventDefault();select(selected+(e.key==='ArrowRight'?1:-1));hovered=data.materials[selected].id;}if(e.key==='Enter'){e.preventDefault();pick(data.materials[selected].id);}if(e.key===' '){e.preventDefault();setOpen(!target);}});
 reset();addEventListener('resize',resize);select(wave?Math.min(7,carriers.length-1):0);setOpen(true);$('loading').hidden=true;ready=true;requestAnimationFrame(frame);
 if(belt&&params.get('cutaway')==='1')mechanismView(true);
 window.miniStudy={get ready(){return ready},get opened(){return opened},get target(){return target},get selected(){return selected},get focus(){return focus},mode,model,carriers,homes,data,renderer,camera,dimensions,finishes,inspection,moving,pick,setOpen,select,shaft,followers,springs,panels,camLift,mechanismView};
}catch(e){console.error(e);$('loading').hidden=true;$('failure').hidden=false;}}
document.querySelectorAll('dialog').forEach(d=>{d.querySelector('.close').onclick=()=>d.close();d.addEventListener('click',e=>{if(e.target===d){const r=d.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)d.close();}});});boot();
