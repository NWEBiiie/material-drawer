const fs=require('fs');const read=f=>JSON.parse(fs.readFileSync(f));const catalog=read('material-volumes.json');
const rack={width:36,depth:18,height:72,clearWidth:34,clearDepth:17,shelfTops:[4.5,20.5,36.5,52.5,68.5],source:'https://www.homedepot.ca/product/hdx-5-shelf-resin-storage-unit/1000425439'};
const items=[];
for(const kind of ['wave','case','binder','pockets']){
 const row={wave:0,case:1,binder:2,pockets:3}[kind];let stacks={};
 for(let v=1;v<=6;v++){
  const prefix=kind==='binder'?(v===1?'binder':'volume-'+v):kind+(v===1?'':'-volume-'+v),data=read(prefix+'-data.json');
  const size=kind==='binder'?[data.binder.cover[0],data.binder.cover[1],data.binder.spine+.32]:data.case;
  // Pocket cases are turned on the shelf; their modeled dimensions are unchanged.
  const dims=kind==='pockets'?[size[1],size[0],size[2]]:size;
  const col=kind==='wave'?v-1:kind==='binder'?Math.floor((v-1)/3):Math.floor((v-1)/2);
  const cols=kind==='wave'?6:kind==='binder'?2:3,gap=kind==='wave'?.5:.65;
  const x=(col-(cols-1)/2)*(dims[0]+gap),base=stacks[col]||rack.shelfTops[row];stacks[col]=base+dims[2]+.08;
  items.push({kind,volume:v,name:catalog.groups[v-1].name,count:catalog.groups[v-1].count,dimensions:dims,originalDimensions:size,position:[x,base+dims[2]/2,0],row,url:kind==='binder'?`binder.html?volume=${v}`:kind==='case'?`case.html?volume=${v}`:`mini.html?view=${kind}&volume=${v}`});
 }
}
for(const a of items){const [w,d,h]=a.dimensions,[x,y,z]=a.position;if(Math.abs(x)+w/2>17||Math.abs(z)+d/2>8.5||y+h/2>rack.shelfTops[a.row+1]-1.25)throw Error('Does not fit '+a.kind+a.volume);}
for(let i=0;i<items.length;i++)for(let j=i+1;j<items.length;j++){const a=items[i],b=items[j];if(a.position.every((p,k)=>Math.abs(p-b.position[k])<(a.dimensions[[0,2,1][k]]+b.dimensions[[0,2,1][k]])/2-.001))throw Error('Overlap '+a.kind+a.volume+' '+b.kind+b.volume);}
fs.writeFileSync('storage-data.json',JSON.stringify({rack,items,notes:'Closed storage envelopes based on modeled case dimensions. Binder envelope includes two 0.16-inch covers around the 3-inch spine. Wave height includes the carry handle. Hardware details and shelf structure are illustrative; no load rating is asserted.'},null,2));console.log('24 volumes fit inside 34 × 17-inch clear shelves, without overlap.');
