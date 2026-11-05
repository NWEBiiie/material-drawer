const fs=require('fs');const read=f=>JSON.parse(fs.readFileSync(f));const catalog=read('material-volumes.json');
const panel=.75,sideClearance=.75,headroom=1.5,rearClearance=.5,frontClearance=1;
const shelf={width:36,depth:16,height:16,panel};
const clear=[shelf.width-2*panel,shelf.depth-panel,shelf.height-2*panel];
const upToQuarter=value=>Math.ceil(value*4-1e-8)/4;
const items=[],racks=[];
for(const kind of ['binder','case','wave','pockets']){
 let stacks={};const own=[];
 for(let v=1;v<=6;v++){
  const prefix=kind==='binder'?(v===1?'binder':'volume-'+v):kind+(v===1?'':'-volume-'+v),data=read(prefix+'-data.json');
  const size=data.storageEnvelope||(kind==='binder'?[data.binder.cover[0],data.binder.cover[1],data.binder.spine+.32]:data.case);
  // Pocket cases are turned on the shelf; their modeled dimensions are unchanged.
  const dims=kind==='pockets'?[size[1],size[0],size[2]]:size;
  const col=kind==='wave'?v-1:kind==='binder'?Math.floor((v-1)/3):Math.floor((v-1)/2);
  const cols=kind==='wave'?6:kind==='binder'?2:3,gap=kind==='wave'?.5:.65;
  const x=(col-(cols-1)/2)*(dims[0]+gap),base=stacks[col]||panel;stacks[col]=base+dims[2]+.08;
  own.push({kind,volume:v,name:catalog.groups[v-1].name,count:catalog.groups[v-1].count,dimensions:dims,originalDimensions:size,position:[x,base+dims[2]/2,shelf.depth/2-frontClearance-dims[1]/2],url:kind==='binder'?`binder.html?volume=${v}`:kind==='case'?`case.html?volume=${v}`:`mini.html?view=${kind}&volume=${v}`});
 }
 const left=Math.min(...own.map(a=>a.position[0]-a.dimensions[0]/2));
 const right=Math.max(...own.map(a=>a.position[0]+a.dimensions[0]/2));
 const depth=Math.max(...own.map(a=>a.dimensions[1]));
 const top=Math.max(...own.map(a=>a.position[1]+a.dimensions[2]/2));
 // Reserve the right-hand grip for either wave drive so changing drives never changes the shelf.
 const sideHardware=kind==='wave'?.36:0;
 const required=[right-left+sideHardware+2*sideClearance,depth+frontClearance+rearClearance,top-panel+headroom].map(upToQuarter);
 if(required.some((n,i)=>n>clear[i]))throw Error('Standard shelf too small for '+kind);
 const rack={kind,required,arrangement:{binder:'2 stacks of 3',case:'3 stacks of 2',wave:'6 side by side',pockets:'3 stacks of 2'}[kind]};
 for(const a of own)a.position[0]+=-clear[0]/2+sideClearance-left;
 for(const a of own){const [w,d,h]=a.dimensions,[x,y,z]=a.position;if(x-w/2 < -clear[0]/2+sideClearance-1e-8 || x+w/2+sideHardware>clear[0]/2-sideClearance+1e-8 || z-d/2 < -shelf.depth/2+panel+rearClearance || z+d/2+.45>shelf.depth/2 || y+h/2>shelf.height-panel-headroom)throw Error('Does not fit '+a.kind+a.volume);}
 for(let i=0;i<own.length;i++)for(let j=i+1;j<own.length;j++){const a=own[i],b=own[j];if(a.position.every((p,k)=>Math.abs(p-b.position[k])<(a.dimensions[[0,2,1][k]]+b.dimensions[[0,2,1][k]])/2-.001))throw Error('Overlap '+a.kind+a.volume+' '+b.kind+b.volume);}
 items.push(...own);racks.push(rack);
}
fs.writeFileSync('storage-data.json',JSON.stringify({shelf,racks,items},null,2));
console.log('Standard shelf W/D/H',shelf.width,shelf.depth,shelf.height,'Clear',clear);
for(const rack of racks)console.log(rack.kind,'reserved W/D/H',rack.required);
