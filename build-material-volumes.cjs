// Transcribed from the user's schedule screenshot and six outlined groups.
// Z=0 and N/A are unknown, never a verified zero-thickness product.
const fs=require('node:fs'),path=require('node:path');
const root=__dirname,base=JSON.parse(fs.readFileSync(path.join(root,'binder-data.json'),'utf8'));
const groups=[
 {id:1,name:'Flooring',types:['LVT','RT','SV','EF','CPT','RB'],count:18},
 {id:2,name:'Paint',types:['PT'],count:11},
 {id:3,name:'Tile & grout',types:['T','TS','GR'],count:10},
 {id:4,name:'Surfaces',types:['PL','SSM','QTZ'],count:16},
 {id:5,name:'Wall protection',types:['WP','FRP'],count:7},
 {id:6,name:'Specialties',types:['ACT','WT','DF','CC','CCT'],count:10}
];
const missing=new Set(['TS-1','GR-1','WP-5','FRP-1','FRP-2','ACT-3','ACT-4','DF-2','CCT-1']);
const items=base.materials.map(s=>({id:s.id,type:s.id.split('-')[0],volume:1,manufacturer:s.manufacturer,series:s.series,color:s.color,original:s.original,cut:s.cut,hex:s.source.colorHex,texture:s.source.status,texturePath:s.preview,sourceURL:s.source.pageURL,reference:'shown',inventory:'unknown',existing:true}));
function add(id,maker,series,color,size,hex){const type=id.split('-')[0],volume=groups.find(g=>g.types.includes(type)).id;const original=size||[null,null,null],side=original[0]&&original[1]?Math.min(original[0],original[1],2):2;items.push({id,type,volume,manufacturer:maker,series,color,original,cut:[side,side,original[2]],hex,texture:'illustrative-placeholder',texturePath:null,sourceURL:null,reference:missing.has(id)?'question-mark':'shown',inventory:'unknown',existing:false});}
[
 ['Sherwin Williams','SW7005 Pure White','#f1eee5'],['Sherwin Williams','SW6258 Tricorn Black','#292929'],['Sherwin Williams','SW7645 Thunder Gray','#575954'],['PPG','1006-1 Gypsum','#eeeee5'],['Sherwin Williams','SW7016 Mindful Gray','#bdb8ad'],['Benjamin Moore','OC-9 Ballet White','#d9d2bf'],['Sherwin Williams','SW7044 Amazing Gray','#bfb8a8'],['Sherwin Williams','SW7043 Worldly Gray','#c6c0b5'],['Sherwin Williams','SW6517 Regatta','#24617a'],['Sherwin Williams','SW6508 Secure Blue','#5389a0'],['Benjamin Moore','2129-40 Normandy','#6d818a']
].forEach(([maker,color,hex],i)=>add('PT-'+(i+1),maker,'',color,[8.5,11,null],hex));
// The schedule's PT-11 manufacturer cell says SW; its product/name cells say
// Benjamin Moore 2129-40 Normandy. Retain that conflict for review.
items.at(-1).scheduleNote='Manufacturer conflict: manufacturer cell says Sherwin Williams; product/name cells identify Benjamin Moore 2129-40 Normandy.';
[
 ['Concept Surfaces','Oche Series','Aqua',[12,24,.375],'#8b9186'],['Concept Surfaces','Harmony','Ash',[12,12,.375],'#72736c'],['Concept Surfaces','Oz','Fair',[12,12,.375],'#d1c9b8'],['Daltile','Fabrique','P685 Blanc Linen',[11.5,8,.375],'#c5c2b5'],['Medici Mosaics','Nova Roma','Pantheon',[5.5,9.5,.25],'#989c97'],['Daltile','Revalia Glazed Ceramic','RV06 Cream, gloss',[2,8.5,.25],'#d9d3c1'],['Knoxtile','Interstyle','Mosaic',[4,4,.25],'#798d96'],['Trinity Surfaces','Arabella','Tide',[2,10,.1875],'#728395']
].forEach((r,i)=>add('T-'+(i+1),...r));
add('TS-1','Schluter','','Brushed Stainless Steel 304',null,'#b7b9b8');add('GR-1','Laticrete','','44 Bright White',null,'#e3e1d8');
[
 ['Wilsonart','','7985-38 Morelia Mango, fine velvet texture','#6d5745'],['Wilsonart','','7965K-12 Walnut Heights','#705444'],['Wilsonart','','7850-60 Beigewood, textured','#bca281'],['Wilsonart','','Columbian Walnut 7943K-07','#60453d'],['Wilsonart','','7925-35 Monticello Maple','#ba8c5b'],['Wilsonart','','7957K-78 Zanzibar','#826044'],['Formica','','9285-58 White Twill','#d8d7c9'],['Wilsonart','','D90-60 North Sea','#858d8d'],['Wilsonart','Chemsurf','D354-60 Designer White','#f2f1e8'],['Wilsonart','Linen Velvet','15511 Ultra Matte','#eee8d6']
].forEach(([m,s,c,h],i)=>add('PL-'+(i+1),m,s,c,[3.5,5,.03125],h));
[['Corian','Modern White',[2,2,.375],'#e1ded7'],['Corian','Deep Nocturne',[2,2,.375],'#25282b'],['Corian','Ash Concrete',[2,2,.375],'#9c9d98'],['Kewaunee','Kemresin Grey',[4,4.5,1],'#9d9f9b']].forEach(([m,c,s,h],i)=>add('SSM-'+(i+1),m,'',c,s,h));
add('QTZ-1','Corian Quartz','Quartz','Calacatta Natura',[2,2,.75],'#e9e5dc');add('QTZ-2','Cambria','','Weybourne',[3,3,.5],'#e6e4da');
[['CS Acrovyn','SM-20N','108 Black','#202324'],['CS Group','Acrovyn SM-20N','933 Mission White','#e9e8e0'],['CS Acrovyn','Wall Protection','White 949','#e4e5dc'],['CS Acrovyn','Rigid','929 Oyster Gray','#b9b5a7']].forEach(([m,s,c,h],i)=>add('WP-'+(i+1),m,s,c,[8,8,.03125],h));
add('WP-5','CS','','Stainless Steel — Type 304 Alloy',null,'#adb4b7');add('FRP-1','Glassteel','Glasliner','Almond',null,'#d8cfba');add('FRP-2','Glassteel','Glasliner','Ivory',null,'#e8e3d1');
add('ACT-1','Armstrong','Optima Tegular','3253',[6,6,1],'#e7e7df');add('ACT-2','Armstrong','Clean Room VL','868',[6,6,.75],'#d9dcd7');add('ACT-3','Armstrong','Ultima Health','1395',null,'#e7e8e2');add('ACT-4','Armstrong','Ultima Health','171935UC1',null,'#dce0dc');
add('WT-1','Mechoshade','Soho','1922 Mocha',[8.5,11,null],'#777169');add('DF-1','3M','Crystal Glass Glazing','Dusted (7725SE-314)',[8,11.5,null],'#d8dfe0');add('DF-2','LightGard','RC-3','Vivarium',null,'#73534e');add('CC-1','Maharam','Immerse','Fader w Beige Mesh',[8,36,null],'#c9c1b2');add('CC-2','Maharam','Carry','511466-004 Eventide',[8,36,null],'#a4aab0');add('CCT-1','Construction Specialties','Standard Track','6062',null,'#c9cecb');
for(const g of groups){const rows=items.filter(x=>x.volume===g.id);if(rows.length!==g.count)throw Error('Wrong count '+g.name);g.pages=g.id===1?base.pages:[];if(g.id!==1)for(let i=0;i<rows.length;i+=6){const p=rows.slice(i,i+6);g.pages.push({title:[...new Set(p.map(s=>s.type))].join(' / '),materials:p.map(s=>s.id)});}g.url='binder.html'+(g.id===1?'':'?volume='+g.id);g.model=g.id===1?'binder-model.glb':'volume-'+g.id+'-model.glb';g.data=g.id===1?'binder-data.json':'volume-'+g.id+'-data.json';}
if(items.length!==72||new Set(items.map(s=>s.id)).size!==72)throw Error('Schedule mismatch');
fs.writeFileSync(path.join(root,'material-volumes.json'),JSON.stringify({version:1,units:'inches',source:'User Excel screenshot and six outlined material groups, received 2026-11-03',referenceNote:'Question marks are copied from the grouping image. They do not confirm physical stock. Inventory is editable and initially unconfirmed.',defaultVolume:1,groups,materials:items},null,2)+'\n');
console.log(JSON.stringify({materials:items.length,volumes:groups.map(g=>[g.name,g.count]),markedUncertain:missing.size,unknownThickness:items.filter(s=>s.original[2]===null).length}));
