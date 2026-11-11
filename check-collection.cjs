const fs=require('fs'),assert=require('assert/strict');process.chdir(__dirname);
const read=p=>JSON.parse(fs.readFileSync(p)),catalog=read('material-volumes.json'),summary=[];
for(const kind of ['case','wave','pockets','belt'])for(let v=1;v<=6;v++){
 const prefix=kind+(v===1?'':'-volume-'+v),data=read(prefix+'-data.json'),records=data.materials||read('binder-data.json').materials,expected=catalog.materials.filter(s=>s.volume===v);
 assert.deepEqual(records.map(s=>s.id),expected.map(s=>s.id));const b=fs.readFileSync(prefix+'-model.glb'),g=JSON.parse(b.subarray(20,20+b.readUInt32LE(12)));assert(g.animations.length);assert.equal(g.nodes.filter(n=>n.extras?.tether_reel).length,expected.length);assert.equal(g.nodes.filter(n=>n.extras?.material_id).length,expected.length);
 for(const s of records){const source=expected.find(r=>r.id===s.id),n=g.nodes.find(n=>n.extras?.sample_id===s.id);assert(n);assert.equal(s.cut[0],s.cut[1]);if(source.original[2]!==null)assert.equal(s.cut[2],source.original[2]);else{assert.equal(s.thicknessKnown,false);assert.equal(s.original[2],null);}
  const min=[Infinity,Infinity,Infinity],max=[-Infinity,-Infinity,-Infinity];for(const p of g.meshes[n.mesh].primitives){const a=g.accessors[p.attributes.POSITION];a.min.forEach((x,i)=>min[i]=Math.min(min[i],x));a.max.forEach((x,i)=>max[i]=Math.max(max[i],x));}const dim=max.map((x,i)=>(x-min[i])/.0254).sort((a,b)=>a-b),target=[...s.cut].sort((a,b)=>a-b);dim.forEach((x,i)=>assert(Math.abs(x-target[i])<.0002,prefix+' '+s.id));
 }
 if(kind==='wave'||kind==='belt'){const slots=data.slotPositions||records.map((_,i)=>-5.45+i*.64);for(let i=1;i<slots.length;i++)assert(slots[i]-slots[i-1]>records[i].cut[2]+.13,`${prefix} slot gap ${i}`);assert.equal(g.nodes.filter(n=>n.extras?.wave_follower!==undefined).length,records.length);}
 if(kind==='belt'){assert(!g.nodes.some(n=>n.extras?.wave_shaft||n.extras?.cam_index!==undefined));assert(g.nodes.some(n=>n.extras?.sliding_belt));assert(g.nodes.some(n=>n.extras?.belt_control));const m=data.mechanism;for(const c of data.slotPositions){for(const y of [m.beltStart,m.beltEnd]){const w=Math.min(m.halfWidth,y<c?c-m.beltStart:m.beltEnd-c);const lift=w>0&&Math.abs(y-c)<w?.5*(1+Math.cos(Math.PI*(y-c)/w)):0;assert(Math.abs(lift)<1e-10);}}}
 if(kind==='pockets'){
  const capacity=21;assert.deepEqual(data.case,[13.5,8,3]);assert.deepEqual(data.pocketGrid,[3,7]);assert.equal(data.slots.length,capacity);
  assert.equal(data.pockets,capacity);assert.equal(new Set(data.slots.map(s=>s.center.join(','))).size,capacity);
  assert.deepEqual(data.slots.map(s=>s.sample).filter(Boolean),records.map(r=>r.id));
  assert.equal(g.nodes.filter(n=>Number.isInteger(n.extras?.pocket_index)).length,capacity);
  assert.equal(g.nodes.filter(n=>n.name?.startsWith('Vacant_Open_')).length,capacity-records.length);
 }
 summary.push([kind,v,records.length]);
}
assert.equal(read('storage-data.json').items.length,24);console.log(JSON.stringify({passed:true,models:summary.length,checks:'All volume IDs, real sample mesh dimensions, known thickness preserved, unknown thickness flagged, all carriers and tethers, wave slot clearance, alternative contains no cams, both belt ends fixed, 24 shelf envelopes'}));
