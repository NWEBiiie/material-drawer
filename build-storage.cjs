const fs=require('fs');const read=f=>JSON.parse(fs.readFileSync(f));const catalog=read('material-volumes.json');
const panel=.75,sideClearance=.75,headroom=1.5,rearClearance=.5,frontClearance=1;
const items=[],racks=[];
for(const kind of ['binder','case','wave','pockets']){
 let stacks={};const own=[];
 for(let v=1;v<=6;v++){
  const prefix=kind==='binder'?(v===1?'binder':'volume-'+v):kind+(v===1?'':'-volume-'+v),data=read(prefix+'-data.json');
  const size=kind==='binder'?[data.binder.cover[0],data.binder.cover[1],data.binder.spine+.32]:data.case;
  // Pocket cases are turned on the shelf; their modeled dimensions are unchanged.
  const dims=kind==='pockets'?[size[1],size[0],size[2]]:size;
  const col=kind==='wave'?v-1:kind==='binder'?Math.floor((v-1)/3):Math.floor((v-1)/2);
  const cols=kind==='wave'?6:kind==='binder'?2:3,gap=kind==='wave'?.5:.65;
  const x=(col-(cols-1)/2)*(dims[0]+gap),base=stacks[col]||panel;stacks[col]=base+dims[2]+.08;
  own.push({kind,volume:v,name:catalog.groups[v-1].name,count:catalog.groups[v-1].count,dimensions:dims,originalDimensions:size,position:[x,base+dims[2]/2,(panel+rearClearance-frontClearance)/2],url:kind==='binder'?`binder.html?volume=${v}`:kind==='case'?`case.html?volume=${v}`:`mini.html?view=${kind}&volume=${v}`});
 }
 const halfWidth=Math.max(...own.map(a=>Math.abs(a.position[0])+a.dimensions[0]/2));
 const depth=Math.max(...own.map(a=>a.dimensions[1]));const occupiedTop=Math.max(...own.map(a=>a.position[1]+a.dimensions[2]/2));
 const rack={kind,panel,width:Math.ceil(halfWidth*2+2*(panel+sideClearance)),depth:Math.ceil(depth+panel+rearClearance+frontClearance),height:Math.ceil(occupiedTop+headroom+panel),arrangement:{binder:'2 stacks of 3',case:'3 stacks of 2',wave:'6 side by side',pockets:'3 stacks of 2'}[kind]};
 rack.clearWidth=rack.width-2*panel;rack.clearDepth=rack.depth-panel;rack.clearHeight=rack.height-2*panel;
 for(const a of own){const [w,d,h]=a.dimensions,[x,y,z]=a.position;if(Math.abs(x)+w/2>rack.clearWidth/2-sideClearance||z-d/2 < -rack.depth/2+panel+rearClearance||z+d/2+.45>rack.depth/2||y+h/2>rack.height-panel-headroom)throw Error('Does not fit '+a.kind+a.volume);}
 for(let i=0;i<own.length;i++)for(let j=i+1;j<own.length;j++){const a=own[i],b=own[j];if(a.position.every((p,k)=>Math.abs(p-b.position[k])<(a.dimensions[[0,2,1][k]]+b.dimensions[[0,2,1][k]])/2-.001))throw Error('Overlap '+a.kind+a.volume+' '+b.kind+b.volume);}
 items.push(...own);racks.push(rack);
}
fs.writeFileSync('storage-data.json',JSON.stringify({racks,items,notes:'Four separate proposed shelf units, one set of six per unit. Dimensions derive from the unchanged model envelopes plus 0.75-inch panels, side clearance and 1.5-inch headroom; shelf sizes round up to whole inches. No shared cabinet and no product load-rating claim. Binder includes both covers; wave includes its handle.'},null,2));console.log(JSON.stringify(racks.map(r=>({kind:r.kind,size:[r.width,r.depth,r.height],volumes:items.filter(i=>i.kind===r.kind).length})),null,2));
