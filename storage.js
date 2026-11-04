import * as THREE from './three.module.min.js';
import {OrbitControls} from './binder-orbit.js';
const $=id=>document.getElementById(id),views=[];
const names={binder:'Binders',case:'Slanted cases',wave:'Wave drawers',pockets:'Pocket boxes'};
// Closed envelopes share the same dimensions as the detailed study models.
const material=(color,roughness=.8)=>new THREE.MeshStandardMaterial({color,roughness});
const white=material('#e7ebeb'),edge=material('#bcc7ce'),blue=material('#0064a0'),navy=material('#002d4f'),gray=material('#8b9ba4'),dark=material('#1b3543'),paper=material('#dddcd5');
function box(parent,w,h,d,x,y,z,mat){const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat);mesh.position.set(x,y,z);mesh.castShadow=true;mesh.receiveShadow=true;parent.add(mesh);return mesh;}
function labelTexture(text,subtitle){const c=document.createElement('canvas');c.width=512;c.height=128;const ctx=c.getContext('2d');ctx.fillStyle='#edf0ee';ctx.fillRect(0,0,512,128);ctx.fillStyle='#003e64';ctx.font='bold 42px Arial';ctx.fillText(text,22,53);ctx.font='24px Arial';ctx.fillText(subtitle,22,94);const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;return new THREE.MeshBasicMaterial({map:t});}
function url(item){const u=new URL(item.url,location.href);if(item.kind==='wave')u.searchParams.set('drive',$('drive').value);return u.href;}
function buildItem(item,scene,pickables){const group=new THREE.Group(),[w,d,h]=item.dimensions;group.position.set(...item.position);group.userData.item=item;scene.add(group);pickables.push(group);
 if(item.kind==='binder'){box(group,w,h-.32,d,0,0,0,paper);for(const y of [-h/2+.08,h/2-.08])box(group,w,.16,d,0,y,0,blue);box(group,w,h,.18,0,0,d/2,blue);for(const x of [-w*.35,w*.35])box(group,.12,h-.6,.05,x,0,d/2+.1,gray);}
 else if(item.kind==='wave'){box(group,w,7,d,0,-h/2+3.5,0,blue);box(group,w-.3,6.6,.11,0,-h/2+3.5,d/2+.06,navy);for(const x of [-w/2+.12,w/2-.12])box(group,.12,6.8,.10,x,-h/2+3.5,d/2+.13,gray);box(group,3.8,.24,.45,0,h/2-.12,0,navy);for(const x of [-1.8,1.8])box(group,.22,.85,.35,x,h/2-.55,0,navy);box(group,1.9,.22,.38,0,-.7,d/2+.24,gray);}
 else {const lid=item.kind==='case'?3.1:.65;box(group,w,h-lid,d,0,-lid/2,0,white);box(group,w,lid-.05,d,0,(h-lid)/2+.025,0,item.kind==='case'?blue:navy);box(group,w+.02,.05,d+.02,0,(h-lid)/2-lid/2,0,gray);for(const x of [-w*.32,w*.32])box(group,.32,.58,.14,x,(h-lid)/2-lid/2,d/2+.08,gray);}
 const tag=new THREE.Mesh(new THREE.PlaneGeometry(Math.min(w-.6,6),.95),labelTexture(String(item.volume).padStart(2,'0')+'  '+item.name.toUpperCase(),item.count+' MATERIALS'));tag.position.set(0,item.kind==='wave'?-.6:0,d/2+.17);group.add(tag);
}

function inches(n){return Math.floor(n)+(['','¼','½','¾'][Math.round(n%1*4)]||'');}
function createView(shelf,rack,items){
 const card=document.createElement('article');card.className='shelf-card';card.dataset.kind=rack.kind;
 const [rw,rd,rh]=rack.required,requiredText=rack.required.map(inches).join(' × ')+'″';
 const {width:w,depth:d,height:h,panel:p}=shelf,clearWidth=w-2*p;
 card.innerHTML=`<div class="card-heading"><div><h2>${names[rack.kind]}</h2><p>6 volumes · ${rack.arrangement}</p></div><strong>${requiredText}<small>SPACE NEEDED · W × D × H</small></strong></div><div class="scene-wrap"><canvas aria-label="${names[rack.kind]} in a standard shelf. Six volumes need ${requiredText} including clearance. Drag to orbit or click a volume to open."></canvas><div class="dimensions" aria-hidden="true"></div><button class="reset" aria-label="Reset ${names[rack.kind].toLowerCase()} view">⌖</button></div><div class="space-summary"><div class="width-meter" aria-hidden="true"><i style="width:${100*rw/clearWidth}%"></i></div><span>${inches(clearWidth-rw)}″ of shelf width free</span></div><nav class="volume-links" aria-label="${names[rack.kind]} volumes"></nav>`;
 $('shelves').append(card);
 const canvas=card.querySelector('canvas'),renderer=new THREE.WebGLRenderer({canvas,antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.setClearColor('#eeeae2');renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.2;
 const scene=new THREE.Scene(),camera=new THREE.OrthographicCamera(-26,26,20,-20,.1,300),controls=new OrbitControls(camera,canvas);controls.enableDamping=true;controls.enablePan=false;controls.enableZoom=false;controls.minPolarAngle=.25;controls.maxPolarAngle=Math.PI*.49;
 scene.add(new THREE.HemisphereLight(0xffffff,0xa8b2b8,2));const light=new THREE.DirectionalLight(0xfff8eb,3);light.position.set(30,60,50);light.castShadow=true;light.shadow.mapSize.set(1024,1024);Object.assign(light.shadow.camera,{left:-32,right:32,top:32,bottom:-32,near:1,far:160});light.shadow.normalBias=.025;scene.add(light);const fill=new THREE.DirectionalLight(0xd8eaff,1.5);fill.position.set(-40,30,-25);scene.add(fill);
 const unit=new THREE.Group();scene.add(unit);
 // Independent open-front shelf unit: floor, roof, two sides and back.
 for(const y of [p/2,h-p/2])box(unit,w,p,d,0,y,0,white);
 for(const x of [-w/2+p/2,w/2-p/2])box(unit,p,h-2*p,d,x,h/2,0,white);
 box(unit,w-2*p,h-2*p,p,0,h/2,-d/2+p/2,edge);
 // The dashed envelope shares the front-left datum with the packed samples.
 const frame=new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(rw,rh,rd)),new THREE.LineDashedMaterial({color:'#178985',dashSize:.40,gapSize:.24}));
 frame.position.set(-clearWidth/2+rw/2,p+rh/2,d/2-rd/2+.025);
 frame.computeLineDistances();scene.add(frame);
 const pickables=[];items.forEach(item=>buildItem(item,scene,pickables));
 const floor=new THREE.Mesh(new THREE.PlaneGeometry(200,200),new THREE.ShadowMaterial({opacity:.13,color:'#334c56'}));floor.rotation.x=-Math.PI/2;floor.position.y=-.015;floor.receiveShadow=true;scene.add(floor);
 const labels=[];
 function dimension(a,b,text,offset){const pts=[new THREE.Vector3(...a),new THREE.Vector3(...b)];scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts),new THREE.LineBasicMaterial({color:'#738893'})));const el=document.createElement('span');el.className='dimension';el.textContent=text;card.querySelector('.dimensions').append(el);labels.push({element:el,point:pts[0].clone().add(pts[1]).multiplyScalar(.5).add(new THREE.Vector3(...offset))});}
 dimension([-w/2,0,d/2+2],[w/2,0,d/2+2],w+'″',[0,-1,1]);dimension([w/2+2,0,-d/2],[w/2+2,0,d/2],d+'″',[1.3,-.8,0]);dimension([-w/2-2,0,d/2],[-w/2-2,h,d/2],h+'″',[-1,0,0]);
 function reset(){camera.position.set(35,31+h/2,70);controls.target.set(0,h/2,0);controls.update();}reset();card.querySelector('.reset').onclick=reset;
 const view={card,canvas,renderer,camera,controls,scene,labels,resize(){const width=canvas.clientWidth,height=canvas.clientHeight;if(!width||!height)return;renderer.setSize(width,height,false);const aspect=width/height,span=Math.max(52/aspect,27);camera.left=-span*aspect/2;camera.right=span*aspect/2;camera.top=span/2;camera.bottom=-span/2;camera.updateProjectionMatrix();}};views.push(view);
 for(const item of items){const a=document.createElement('a');a.href=url(item);a.title=item.name;a.setAttribute('aria-label',`${names[item.kind]} volume ${item.volume}: ${item.name}`);a.textContent=String(item.volume).padStart(2,'0');a.dataset.kind=item.kind;a.dataset.volume=item.volume;card.querySelector('nav').append(a);}
 let down;canvas.onpointerdown=e=>down=[e.clientX,e.clientY];canvas.onpointercancel=()=>down=null;canvas.onpointerup=e=>{const start=down;down=null;if(!start||Math.hypot(e.clientX-start[0],e.clientY-start[1])>5)return;const rect=canvas.getBoundingClientRect(),ray=new THREE.Raycaster();ray.setFromCamera(new THREE.Vector2((e.clientX-rect.left)/rect.width*2-1,1-(e.clientY-rect.top)/rect.height*2),camera);const hits=ray.intersectObjects([unit,...pickables],true);if(hits[0]){let o=hits[0].object;while(o&&!o.userData.item)o=o.parent;if(o)location.href=url(o.userData.item);}};
}
function show(kind){document.querySelectorAll('[data-show]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.show===kind)));$('shelves').classList.toggle('focused',kind!=='all');for(const v of views)v.card.hidden=kind!=='all'&&v.card.dataset.kind!==kind;requestAnimationFrame(()=>views.forEach(v=>v.resize()));}
function render(){for(const v of views){if(v.card.hidden)continue;v.controls.update();for(const l of v.labels){const pt=l.point.clone().project(v.camera);l.element.style.left=(pt.x+1)*v.canvas.clientWidth/2+'px';l.element.style.top=(1-pt.y)*v.canvas.clientHeight/2+'px';}v.renderer.render(v.scene,v.camera);}requestAnimationFrame(render);}
async function boot(){try{const data=await fetch('storage-data.json?v=3').then(r=>{if(!r.ok)throw Error('Missing shelf sizes');return r.json();});const {shelf}=data;$('shelfSize').textContent=[shelf.width,shelf.depth,shelf.height].join(' × ')+'″';for(const rack of data.racks)createView(shelf,rack,data.items.filter(i=>i.kind===rack.kind));
 $('drive').onchange=()=>document.querySelectorAll('[data-kind="wave"][data-volume]').forEach(a=>a.href=url(data.items.find(i=>i.kind==='wave'&&i.volume===Number(a.dataset.volume))));
 document.querySelectorAll('[data-show]').forEach(b=>b.onclick=()=>show(b.dataset.show));addEventListener('resize',()=>views.forEach(v=>v.resize()));show('all');$('loading').hidden=true;render();
 }catch(e){console.error(e);$('loading').hidden=true;$('error').hidden=false;}}
boot();
