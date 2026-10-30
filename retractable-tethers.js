import * as THREE from './three.module.min.js';

// The reel housings and eyelets are native Blender geometry. This continuous cable
// connects their actual world-space endpoints during page turns, waves and pickup.
export function createRetractableTethers({model,scene}){
 const entries=new Map(),limit=.55,radius=.0003,segments=32;
 const get=id=>{if(!entries.has(id))entries.set(id,{id,length:0});return entries.get(id);};
 model.traverse(o=>{
  for(const [key,field] of [['tether_anchor','anchor'],['tether_guide','guide'],['tether_end','end'],['tether_reel','reel']])if(o.userData[key])get(o.userData[key])[field]=o;
  if(o.userData.tether_rest)o.visible=false;
 });
 const geometry=new THREE.CylinderGeometry(radius,radius,1,7,1),material=new THREE.MeshStandardMaterial({color:0x626c68,metalness:.85,roughness:.3});
 const axis=new THREE.Vector3(0,1,0),dummy=new THREE.Object3D(),direction=new THREE.Vector3(),a=new THREE.Vector3(),b=new THREE.Vector3(),c=new THREE.Vector3(),point=new THREE.Vector3(),previous=new THREE.Vector3();
 for(const e of entries.values()){
  if(!e.anchor||!e.guide||!e.end||!e.reel)throw Error('Incomplete tether '+e.id);
  e.wire=new THREE.InstancedMesh(geometry,material,segments);e.wire.name='Live_tether_'+e.id;e.wire.frustumCulled=false;e.wire.userData.tether_id=e.id;e.wire.instanceMatrix.setUsage(THREE.DynamicDrawUsage);scene.add(e.wire);
 }
 function constrain(object){
  const e=entries.get(object.userData.material_id);if(!e)return;
  object.updateMatrixWorld(true);e.anchor.getWorldPosition(a);e.guide.getWorldPosition(b);e.end.getWorldPosition(c);
  const free=limit-a.distanceTo(b)-.006,distance=c.distanceTo(b);
  if(distance>free){direction.copy(c).sub(b).normalize().multiplyScalar(free-distance);object.position.add(direction);object.updateMatrixWorld(true);}
 }
 function update(){
  model.updateMatrixWorld(true);
  for(const e of entries.values()){
   e.anchor.getWorldPosition(a);e.guide.getWorldPosition(b);e.end.getWorldPosition(c);
   const fixed=a.distanceTo(b),free=b.distanceTo(c),sag=Math.min(.003,free*.035),fixedSteps=8;
   previous.copy(a);e.length=0;
   for(let i=1;i<=segments;i++){
    if(i<=fixedSteps)point.copy(a).lerp(b,i/fixedSteps);
    else{const t=(i-fixedSteps)/(segments-fixedSteps);point.copy(b).lerp(c,t);point.y-=4*sag*t*(1-t);}
    direction.copy(point).sub(previous);const length=direction.length();dummy.position.copy(previous).add(point).multiplyScalar(.5);dummy.quaternion.setFromUnitVectors(axis,direction.normalize());dummy.scale.set(1,Math.max(length,.000001),1);dummy.updateMatrix();e.wire.setMatrixAt(i-1,dummy.matrix);e.length+=length;previous.copy(point);
   }
   e.wire.instanceMatrix.needsUpdate=true;e.extension=Math.max(0,e.length-(e.restLength??e.length));e.restLength??=e.length;
  }
 }
 function hold(object,overlay){
  for(const e of entries.values()){const held=e.id===object?.userData.material_id;(held?overlay:scene).add(e.wire);e.held=held;}
 }
 update();return {entries,update,constrain,hold,limit,radius};
}
