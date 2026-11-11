const fs=require('fs'),path=require('path');
const schedule=JSON.parse(fs.readFileSync(path.join(__dirname,'material-schedule.json')));
const groups=[
 {id:1,name:'Flooring',types:['LVT','RT','SV','EF','RS','TZ','CPT','RB'],count:21},
 {id:2,name:'Paint',types:['PT'],count:11},
 {id:3,name:'Tile & grout',types:['T','TS','GR'],count:10},
 {id:4,name:'Surfaces',types:['PL','SSM','QTZ'],count:16},
 {id:5,name:'Wall protection',types:['WP','FRP'],count:7},
 {id:6,name:'Specialties',types:['ACT','WT','DF','CC','CCT'],count:10}
];
const items=schedule.materials.map(s=>{const type=s.id.split('-')[0],volume=groups.find(g=>g.types.includes(type)).id,side=Math.min(s.original[0]||2,s.original[1]||2,2);let texturePath=null;if(s.source){const b=fs.readFileSync(path.join(__dirname,s.source.path));texturePath='data:image/jpeg;base64,'+b.toString('base64');}return {...s,type,volume,cut:[side,side,s.original[2]],texture:s.source?.status||'illustrative-placeholder',texturePath,sourceURL:s.source?.pageURL||null,reference:'shown',inventory:'unknown',existing:!!s.previousId};});
for(const g of groups){const rows=items.filter(x=>x.volume===g.id);if(rows.length!==g.count)throw Error(g.name);g.pages=[];if(g.id===1)g.pages=[{title:'Luxury vinyl & terrazzo',materials:['LVT-1','LVT-2','LVT-3','LVT-4','TZ-1']},{title:'Rubber',materials:['RT-1','RT-2','RT-3','RB-1','RS-1','RS-2']},{title:'Sheet vinyl',materials:['SV-1','SV-2','SV-3','SV-4']},{title:'Resin & carpet',materials:['EF-1','EF-2','CPT-1','CPT-2','CPT-3','CPT-4']}];else for(let i=0;i<rows.length;i+=6){const p=rows.slice(i,i+6);g.pages.push({title:[...new Set(p.map(s=>s.type))].join(' / '),materials:p.map(s=>s.id)});}g.url='binder.html'+(g.id===1?'':'?volume='+g.id);g.model=g.id===1?'binder-model.glb':'volume-'+g.id+'-model.glb';g.data=g.id===1?'binder-data.json':'volume-'+g.id+'-data.json';}
if(items.length!==75||new Set(items.map(s=>s.id)).size!==75)throw Error('Schedule mismatch');
fs.writeFileSync(path.join(__dirname,'material-volumes.json'),JSON.stringify({version:2,units:'inches',source:schedule.source+' Received '+schedule.received,referenceNote:'All rows are shown in the revised chart. N/A dimensions remain unknown. Inventory is independently editable.',defaultVolume:1,groups,materials:items},null,2)+'\n');
console.log('Catalog:',items.length,'materials');
