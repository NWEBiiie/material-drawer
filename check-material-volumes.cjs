const fs=require('node:fs'),assert=require('node:assert/strict'),path=require('node:path');
process.chdir(__dirname);const read=p=>JSON.parse(fs.readFileSync(p,'utf8')),catalog=read('material-volumes.json');
assert.equal(catalog.defaultVolume,1);assert.equal(catalog.materials.length,72);assert.equal(new Set(catalog.materials.map(s=>s.id)).size,72);
const counts=[];
for(const g of catalog.groups){const rows=catalog.materials.filter(s=>s.volume===g.id),data=read(g.data);assert.equal(rows.length,g.count);assert.deepEqual(data.materials.map(s=>s.id),rows.map(s=>s.id));assert.deepEqual(g.pages.flatMap(p=>p.materials).sort(),rows.map(s=>s.id).sort());
 const bytes=fs.readFileSync(g.model),doc=JSON.parse(bytes.subarray(20,20+bytes.readUInt32LE(12)).toString());assert.equal(doc.buffers.length,1);assert(!doc.buffers[0].uri);assert(doc.animations.length>0);
 const samples=doc.nodes.filter(n=>n.extras?.material_id);assert.equal(samples.length,g.count);assert.equal(doc.nodes.filter(n=>n.extras?.tether_reel).length,g.count);
 for(const node of samples){const s=rows.find(s=>s.id===node.extras.material_id);assert(s);assert.equal(node.extras.snap_count,4);const record=data.materials.find(r=>r.id===s.id);
  if(s.original[2]!==null){assert.equal(record.cut[2],s.original[2]);assert.equal(node.extras.thickness_inches,s.original[2]);}
  else{assert.equal(record.thicknessKnown,false);assert.equal(record.cut[2],.02);assert.equal(record.original[2],null);}
  if(s.original[0]!==null){assert(record.cut[0]<=s.original[0]);assert(record.cut[1]<=s.original[1]);}else assert.equal(record.planKnown,false);
  assert.equal(record.cut[0],record.cut[1]);const mesh=doc.meshes[node.mesh];const mins=[Infinity,Infinity,Infinity],maxs=[-Infinity,-Infinity,-Infinity];for(const p of mesh.primitives){const a=doc.accessors[p.attributes.POSITION];a.min.forEach((x,i)=>mins[i]=Math.min(mins[i],x));a.max.forEach((x,i)=>maxs[i]=Math.max(maxs[i],x));}const dims=maxs.map((x,i)=>(x-mins[i])/.0254).sort((a,b)=>a-b),expected=[...record.cut].sort((a,b)=>a-b);dims.forEach((x,i)=>assert(Math.abs(x-expected[i])<.0001,`${s.id} mesh dimension ${x} vs ${expected[i]}`));
 }
 assert(data.validation.rightStackHeightInches<3);assert(data.validation.leftStackHeightInches<3);counts.push([g.id,g.count,g.pages.length]);
}
const original=read('binder-data.json');catalog.materials.filter(s=>s.volume===1).forEach((s,i)=>{assert.deepEqual(s.original,original.materials[i].original);assert.deepEqual(s.cut,original.materials[i].cut);});
console.log(JSON.stringify({passed:true,volumes:counts,materials:72,checks:'IDs, all page allocations, embedded GLB buffers, real mesh dimensions, preserved thickness, square cuts, four snaps, tethers, spine capacity, original default schedule'}));
