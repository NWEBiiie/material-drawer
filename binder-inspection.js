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

export function createSampleInspection({renderer,scene,camera,controls,onChange,onReturned}){
  const overlay=new THREE.Scene(),inspectionCamera=camera.clone();
  // The actual Blender sample is reparented here, not duplicated or rescaled.
  scene.children.filter(o=>o.isLight).forEach(light=>{const copy=light.clone();copy.castShadow=false;overlay.add(copy);});
  const veilScene=new THREE.Scene(),veilCamera=new THREE.OrthographicCamera(-1,1,1,-1,0,2);
  const veil=new THREE.Mesh(new THREE.PlaneGeometry(2,2),new THREE.MeshBasicMaterial({color:0xeeeae2,transparent:true,opacity:0,depthTest:false,depthWrite:false}));veil.position.z=-1;veilScene.add(veil);
  const reduced=matchMedia('(prefers-reduced-motion: reduce)'),ray=new THREE.Raycaster(),pointer=new THREE.Vector2();
  const audio=snapAudio();let held=null;

  function destinationZoom(){
    const rect=renderer.domElement.getBoundingClientRect(),desired=Math.min(440,rect.width*.72);
    const width=held.object.userData.inspection_width_inches||held.record.cut[0];
    return (inspectionCamera.right-inspectionCamera.left)/(width*.0254)*desired/rect.width;
  }
  function pose(p){
    const h=held,move=smooth((p-.18)/.82),lift=smooth(p/.22),end=h.destination;
    h.object.position.copy(h.homeWorld).addScaledVector(h.liftVector,h.liftDistance*lift);
    h.object.position.lerp(end,move);
    h.object.quaternion.copy(h.homeWorldRotation).slerp(h.faceRotation,smooth((p-.27)/.73));
    inspectionCamera.zoom=THREE.MathUtils.lerp(h.baseZoom,destinationZoom(),smooth((p-.12)/.88));inspectionCamera.updateProjectionMatrix();
    veil.material.opacity=.72*smooth(p);
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
    held={object,record,home,homeWorld:object.position.clone(),homeWorldRotation:object.quaternion.clone(),
      destination:controls.target.clone().addScaledVector(normal,.22),baseZoom:camera.zoom,front,back,faceRotation:back.clone(),
      liftVector:object.userData.extraction_axis?new THREE.Vector3(...object.userData.extraction_axis).applyQuaternion(object.quaternion).normalize():new THREE.Vector3(0,1,0),
      liftDistance:object.userData.extraction_distance||.055,
      progress:0,phase:'lifting',face:'back',flip:null};
    controls.enabled=false;audio.click('detach');onChange?.(held);return true;
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
        held=null;controls.enabled=true;audio.click('attach');onChange?.(null);onReturned?.(h.record.id);
      }else if(!back&&held.progress===1){held.phase='held';onChange?.(held);}
    }else if(held.flip){
      const f=held.flip;f.time=reduced.matches?1:clamp(f.time+dt/.55);held.object.quaternion.copy(f.from).slerp(f.to,smooth(f.time));if(f.time===1)held.flip=null;
    }
  }
  function render(){
    if(!held)return;
    renderer.autoClear=false;renderer.render(veilScene,veilCamera);renderer.clearDepth();renderer.render(overlay,inspectionCamera);renderer.autoClear=true;
  }
  function resize(){if(!held)return;inspectionCamera.copy(camera);held.baseZoom=camera.zoom;inspectionCamera.zoom=THREE.MathUtils.lerp(held.baseZoom,destinationZoom(),smooth((held.progress-.12)/.88));inspectionCamera.updateProjectionMatrix();}
  function hit(event){if(!held)return false;const r=renderer.domElement.getBoundingClientRect();pointer.set((event.clientX-r.left)/r.width*2-1,1-(event.clientY-r.top)/r.height*2);ray.setFromCamera(pointer,inspectionCamera);return ray.intersectObject(held.object,true).length>0;}
  return {pick,flip,putBack,update,render,resize,hit,audio,get active(){return !!held},get selection(){return held},get camera(){return inspectionCamera}};
}
