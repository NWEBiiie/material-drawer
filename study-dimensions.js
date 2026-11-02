import * as THREE from './three.module.min.js';

const NS='http://www.w3.org/2000/svg', INCH=.0254;
const inches=n=>Math.round(n/INCH)+'″';
function element(tag,attrs={}){const e=document.createElementNS(NS,tag);for(const [k,v] of Object.entries(attrs))e.setAttribute(k,v);return e;}

// Use the container geometry only: lifted samples, tethers, and an open lid
// must not change the stored size of the box.
export function createStudyDimensions({model,kind,camera,canvas,compact=false,data={}}){
 const patterns={binder:/^(Cover_left|Cover_right|Spine_3_in)$/,case:/^(Base|Tray_side|Tray_end)(\.|$)/,wave:/^Cabinet_(top|bottom|side|back)(\.|$)/,pockets:/^Case_(base|side|end)(\.|$)/};
 model.updateWorldMatrix(true,true);
 const inverse=model.matrixWorld.clone().invert(),box=new THREE.Box3(),spine=new THREE.Box3();
 model.traverse(o=>{if(!o.isMesh)return;const match=patterns[kind].test(o.name),isSpine=o.name==='Spine_3_in';if(!match)return;
  o.geometry.computeBoundingBox();const b=o.geometry.boundingBox.clone().applyMatrix4(new THREE.Matrix4().multiplyMatrices(inverse,o.matrixWorld));
  box.union(b);if(isSpine)spine.union(b);
 });
 if(box.isEmpty())throw Error('Missing dimension geometry: '+kind);
 if(kind==='case'||kind==='pockets')box.max.y=box.min.y+data.case[2]*INCH;
 const svg=element('svg',{'class':'study-dimensions'+(compact?' compact':''),'aria-label':kind+' outer dimensions rounded to whole inches'+(kind==='wave'?', excluding handle':''),role:'img','data-study':kind});
 Object.assign(svg.style,{position:'fixed',inset:'0',width:'100%',height:'100%',pointerEvents:'none',zIndex:'1',overflow:'hidden'});
 const style=element('style');style.textContent='.study-dimensions path{fill:none;stroke:#52665b;stroke-width:.85;opacity:.7;vector-effect:non-scaling-stroke}.study-dimensions text{fill:#344b40;stroke:#eeeae2;stroke-width:5px;stroke-linejoin:round;paint-order:stroke;font:11px Arial,Helvetica,sans-serif;text-anchor:middle;dominant-baseline:central;letter-spacing:.025em}.study-dimensions.compact text{font-size:10px}.study-dimensions[hidden]{display:none}@media(max-width:600px){.study-dimensions text{font-size:10px}.study-dimensions.compact text{font-size:9px}}';svg.append(style);
 const lengths=box.getSize(new THREE.Vector3());
 const labels=[inches(lengths.x)+(kind==='binder'?' open':''),inches(lengths.z),kind==='binder'?inches(spine.max.x-spine.min.x)+' spine':inches(lengths.y)+(['case','pockets'].includes(kind)?' closed':'')];
 const items=labels.map((label,i)=>{const g=element('g',{'data-axis':['width','depth','height'][i]});const title=element('title');title.textContent=label;const path=element('path'),text=element('text');text.textContent=label;g.append(title,path,text);svg.append(g);return{g,path,text};});
 const title=element('title');title.textContent=labels.join(' × ');svg.prepend(title);document.body.append(svg);
 const v=(x,y,z)=>new THREE.Vector3(x,y,z),center=box.getCenter(new THREE.Vector3());
 function update(visible=true){
  svg.toggleAttribute('hidden',!visible);if(!visible)return;
  const rect=canvas.getBoundingClientRect();camera.updateMatrixWorld();model.updateWorldMatrix(true,false);
  const project=p=>{const q=p.clone().applyMatrix4(model.matrixWorld).project(camera);return{x:rect.left+(q.x+1)*rect.width/2,y:rect.top+(1-q.y)*rect.height/2};};
  const cam=model.worldToLocal(camera.getWorldPosition(new THREE.Vector3())),front=cam.z>=center.z?box.max.z:box.min.z,side=cam.x>=center.x?box.max.x:box.min.x,other=side===box.max.x?box.min.x:box.max.x;
  const back=front===box.max.z?box.min.z:box.max.z,depthSide=kind==='binder'?other:side;
  const pairs=[
   kind==='wave'?[v(box.min.x,box.max.y,back),v(box.max.x,box.max.y,back)]:[v(box.min.x,box.min.y,front),v(box.max.x,box.min.y,front)],
   [v(depthSide,box.min.y,box.min.z),v(depthSide,box.min.y,box.max.z)],
   kind==='binder'?[v(spine.min.x,spine.min.y,back),v(spine.max.x,spine.min.y,back)]:[v(side,box.min.y,back),v(side,box.max.y,back)]
  ];
  const c=project(center),offset=compact?17:25;
  pairs.forEach(([start,end],i)=>{
   const a=project(start),b=project(end),dx=b.x-a.x,dy=b.y-a.y,len=Math.hypot(dx,dy),item=items[i];
   let nx=-dy/(len||1),ny=dx/(len||1);if(nx*((a.x+b.x)/2-c.x)+ny*((a.y+b.y)/2-c.y)<0){nx=-nx;ny=-ny;}
   if(len<2){nx=i===2?1:0;ny=i===2?0:1;}
   const p={x:a.x+nx*offset,y:a.y+ny*offset},q={x:b.x+nx*offset,y:b.y+ny*offset};
   const tick=4,tx=(dx/(len||1)+nx)*tick*.7,ty=(dy/(len||1)+ny)*tick*.7;
   item.path.setAttribute('d',`M${a.x+nx*3},${a.y+ny*3}L${p.x+nx*5},${p.y+ny*5}M${b.x+nx*3},${b.y+ny*3}L${q.x+nx*5},${q.y+ny*5}M${p.x},${p.y}L${q.x},${q.y}M${p.x-tx},${p.y-ty}l${tx*2},${ty*2}M${q.x-tx},${q.y-ty}l${tx*2},${ty*2}`);
   let angle=Math.atan2(dy,dx)*180/Math.PI;if(angle>90)angle-=180;if(angle<-90)angle+=180;
   const x=(p.x+q.x)/2+nx*10,y=(p.y+q.y)/2+ny*10;
   item.text.setAttribute('transform',`translate(${x} ${y}) rotate(${len<2?0:angle})`);
  });
 }
 return{update,element:svg,labels,bounds:box,dispose(){svg.remove();}};
}
