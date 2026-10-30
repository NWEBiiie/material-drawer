import * as THREE from './three.module.min.js';

const clamp=n=>Math.max(0,Math.min(1,n));
const smooth=n=>{n=clamp(n);return n*n*(3-2*n);};

// Short synthesized snap sounds; no remote audio or autoplay.
function snapAudio(){
  let context=null,muted=false;
  try{muted=localStorage.getItem('sample-binder-muted')==='true';}catch{}
  const events=[];
  function unlock(){
    if(muted)return;
    try{context ||= new (window.AudioContext||window.webkitAudioContext)();if(context.state==='suspended')context.resume().catch(()=>{});}catch{}
  }
  function click(type){
    const entry={type,played:false};events.push(entry);if(muted)return;
    unlock();if(!context)return;
    const play=()=>{
      if(muted||context.state!=='running')return;
      const start=context.currentTime+.003;
      for(let i=0;i<2;i++){
        const t=start+i*(type==='attach'?.022:.032),gain=context.createGain();
        gain.gain.setValueAtTime((i?.045:.085)*(type==='attach'?1:.8),t);
        gain.gain.exponentialRampToValueAtTime(.0001,t+.045);gain.connect(context.destination);
        const osc=context.createOscillator();osc.type='triangle';osc.frequency.setValueAtTime(type==='attach'?1550:2100,t);osc.frequency.exponentialRampToValueAtTime(420,t+.026);osc.connect(gain);osc.start(t);osc.stop(t+.05);
        const buffer=context.createBuffer(1,Math.floor(context.sampleRate*.028),context.sampleRate),samples=buffer.getChannelData(0);
        for(let n=0;n<samples.length;n++)samples[n]=(Math.random()*2-1)*.3*(1-n/samples.length);
        const noise=context.createBufferSource();noise.buffer=buffer;const filter=context.createBiquadFilter();filter.type='highpass';filter.frequency.value=1700;noise.connect(filter);filter.connect(gain);noise.start(t);noise.stop(t+.03);
        osc.onended=()=>{osc.disconnect();noise.disconnect();filter.disconnect();gain.disconnect();};
      }
      entry.played=true;
    };
    if(context.state==='running')play();else context.resume().then(play).catch(()=>{});
  }
  return {unlock,click,events,get muted(){return muted},get state(){return context?.state||'uninitialized'},toggle(){muted=!muted;try{localStorage.setItem('sample-binder-muted',String(muted));}catch{}if(!muted)unlock();return muted;}};
}

export function createSampleInspection({renderer,scene,camera,controls,tethers,onChange,onReturned}){
  const overlay=new THREE.Scene(),inspectionCamera=camera.clone();
  // The actual Blender sample is reparented here, not duplicated or rescaled.
  scene.children.filter(o=>o.isLight).forEach(light=>{const copy=light.clone();copy.castShadow=false;overlay.add(copy);});
  const veilScene=new THREE.Scene(),veilCamera=new THREE.OrthographicCamera(-1,1,1,-1,0,2);
  const veil=new THREE.Mesh(new THREE.PlaneGeometry(2,2),new THREE.MeshBasicMaterial({color:0xeeeae2,transparent:true,opacity:0,depthTest:false,depthWrite:false}));veil.position.z=-1;veilScene.add(veil);
  const reduced=matchMedia('(prefers-reduced-motion: reduce)'),ray=new THREE.Raycaster(),pointer=new THREE.Vector2();
  const audio=snapAudio();let held=null;

  function frameTether(){
    const h=held,base=h.baseCamera,rect=renderer.domElement.getBoundingClientRect(),entry=tethers?.entries.get(h.record.id);
    const bounds=new THREE.Box3(),inverse=base.quaternion.clone().invert();
    const add=point=>bounds.expandByPoint(point.clone().applyQuaternion(inverse));
    const box=new THREE.Box3().setFromObject(h.object),center=box.getCenter(new THREE.Vector3());
    // A fixed sample radius keeps the camera still while the material flips.
    const local=center.clone().applyQuaternion(inverse),r=h.frameRadius;
    bounds.expandByPoint(local.clone().addScalar(r));bounds.expandByPoint(local.clone().addScalar(-r));
    if(entry){
      for(const node of [entry.anchor,entry.guide,entry.end])add(node.getWorldPosition(new THREE.Vector3()));
      const reelBox=new THREE.Box3().setFromObject(entry.reel);
      for(const x of [reelBox.min.x,reelBox.max.x])for(const y of [reelBox.min.y,reelBox.max.y])for(const z of [reelBox.min.z,reelBox.max.z])add(new THREE.Vector3(x,y,z));
    }
    const size=bounds.getSize(new THREE.Vector3()),focus=bounds.getCenter(new THREE.Vector3()).applyQuaternion(base.quaternion);
    const usableHeight=rect.width<600?.49:.64,usableWidth=rect.width<600?.84:.76;
    const zoom=Math.min((base.right-base.left)*usableWidth/(size.x+.025),(base.top-base.bottom)*usableHeight/(size.y+.025));
    const normal=new THREE.Vector3(0,0,1).applyQuaternion(base.quaternion),progress=smooth((h.progress-.12)/.88);
    const destination=focus.addScaledVector(normal,1.25);
    inspectionCamera.position.copy(base.position).lerp(destination,progress);inspectionCamera.quaternion.copy(base.quaternion);
    inspectionCamera.zoom=THREE.MathUtils.lerp(h.baseZoom,zoom,progress);inspectionCamera.updateProjectionMatrix();inspectionCamera.updateMatrixWorld(true);
  }
  function pose(p){
    const h=held,move=smooth((p-.18)/.82),lift=smooth(p/.22),end=h.destination;
    if(h.clearancePath){
      // Leave the slot vertically, clear the cabinet's front edge, then flip.
      // Reverse the same path on return; never slide diagonally through a rim.
      const rise=smooth(p/.42),out=smooth((p-.42)/.20),present=smooth((p-.62)/.38);
      h.object.position.copy(h.homeWorld).addScaledVector(h.liftVector,h.liftDistance*rise).addScaledVector(h.outward,.046*out);
      h.object.position.lerp(end,present);
      h.object.quaternion.copy(h.homeWorldRotation).slerp(h.faceRotation,present);
    }else{
      h.object.position.copy(h.homeWorld).addScaledVector(h.liftVector,h.liftDistance*lift);
      h.object.position.lerp(end,move);
      h.object.quaternion.copy(h.homeWorldRotation).slerp(h.faceRotation,smooth((p-.27)/.73));
    }
    tethers?.constrain(h.object);
    frameTether();
    veil.material.opacity=.28*smooth(p);
  }
  function pick(object,record){
    if(held)return false;
    audio.unlock();scene.updateMatrixWorld(true);
    const home={parent:object.parent,position:object.position.clone(),quaternion:object.quaternion.clone(),scale:object.scale.clone()};
    overlay.attach(object);inspectionCamera.copy(camera);
    const normal=new THREE.Vector3();camera.getWorldDirection(normal).negate();
    const view=camera.quaternion.clone().multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(.06,-.14,0)));
    const front=view.clone().multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1,0,0),Math.PI/2));
    const back=view.clone().multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1,0,0),-Math.PI/2));
    const entry=tethers?.entries.get(record.id),anchor=entry?entry.anchor.getWorldPosition(new THREE.Vector3()):controls.target.clone();
    const right=new THREE.Vector3(1,0,0).applyQuaternion(camera.quaternion),up=new THREE.Vector3(0,1,0).applyQuaternion(camera.quaternion);
    const width=object.userData.inspection_width_inches||record.cut[0],height=object.userData.board_height_inches||record.cut[1];
    const radius=Math.max(width,height)*.0254*.68;
    held={object,record,home,homeWorld:object.position.clone(),homeWorldRotation:object.quaternion.clone(),
      destination:anchor.addScaledVector(right,-Math.max(.105,radius*2.2)).addScaledVector(up,.045).addScaledVector(normal,.14),baseZoom:camera.zoom,baseCamera:camera.clone(),frameRadius:radius,front,back,faceRotation:back.clone(),
      liftVector:object.userData.extraction_axis?new THREE.Vector3(...object.userData.extraction_axis).applyQuaternion(object.quaternion).normalize():new THREE.Vector3(0,1,0),
      liftDistance:object.userData.extraction_distance||.055,
      progress:0,phase:'lifting',face:'back',flip:null};
    if(object.userData.inspection_clearance_path){
      held.clearancePath=true;held.outward=new THREE.Vector3(0,0,1).transformDirection(home.parent.matrixWorld);
      // Parent coordinates in the exported drawer have +Z toward its opening.
      held.destination.y=Math.max(held.destination.y,held.homeWorld.y+held.liftDistance);
      held.destination.z=Math.max(held.destination.z,held.homeWorld.z+.046);
    }
    tethers?.hold(object,overlay);controls.enabled=false;audio.click('detach');onChange?.(held);return true;
  }
  function flip(){
    if(!held||held.phase!=='held')return;
    held.face=held.face==='back'?'front':'back';held.faceRotation.copy(held[held.face]);
    held.flip={from:held.object.quaternion.clone(),to:held.faceRotation.clone(),time:0};onChange?.(held);
  }
  function putBack(){
    if(!held||held.phase==='returning')return;
    audio.unlock();if(held.phase==='held')held.faceRotation.copy(held.object.quaternion);
    held.flip=null;held.phase='returning';onChange?.(held);
  }
  function update(dt){
    if(!held)return;
    if(held.phase==='lifting'||held.phase==='returning'){
      const back=held.phase==='returning';held.progress=reduced.matches?(back?0:1):clamp(held.progress+(back?-1:1)*dt/.95);pose(held.progress);
      if(back&&held.progress===0){
        const h=held;h.home.parent.add(h.object);h.object.position.copy(h.home.position);h.object.quaternion.copy(h.home.quaternion);h.object.scale.copy(h.home.scale);h.object.updateMatrixWorld(true);
        held=null;tethers?.hold(null,overlay);controls.enabled=true;audio.click('attach');onChange?.(null);onReturned?.(h.record.id);
      }else if(!back&&held.progress===1){held.phase='held';onChange?.(held);}
    }else if(held.flip){
      const f=held.flip;f.time=reduced.matches?1:clamp(f.time+dt/.55);held.object.quaternion.copy(f.from).slerp(f.to,smooth(f.time));tethers?.constrain(held.object);if(f.time===1)held.flip=null;
    }
    if(held?.phase==='held')frameTether();
  }
  function render(){
    if(!held)return;
    renderer.autoClear=false;renderer.render(veilScene,veilCamera);
    // The drawer must occlude a sample while it is still in its slot.
    if(!held.clearancePath)renderer.clearDepth();
    renderer.render(overlay,inspectionCamera);renderer.autoClear=true;
  }
  function resize(){if(!held)return;inspectionCamera.copy(camera);held.baseCamera.copy(camera);held.baseZoom=camera.zoom;frameTether();}
  function hit(event){if(!held)return false;const r=renderer.domElement.getBoundingClientRect();pointer.set((event.clientX-r.left)/r.width*2-1,1-(event.clientY-r.top)/r.height*2);ray.setFromCamera(pointer,inspectionCamera);return ray.intersectObject(held.object,true).length>0;}
  return {pick,flip,putBack,update,render,resize,hit,audio,tethers,get active(){return !!held},get selection(){return held},get camera(){return inspectionCamera}};
}
