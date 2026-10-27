(() => {
  'use strict';
  const faces=['top','bottom','left','right','near','far'];
  const box=(kind,x,y,z,w,h,d,extra='')=>`<div class="case-box ${kind}" style="--bx:${x}px;--by:${y}px;--bz:${z}px;--bw:${w}px;--bh:${h}px;--bd:${d}px;${extra}">${faces.map(f=>`<span class="box-face box-${f}"></span>`).join('')}</div>`;
  function casing(height){return [box('case-timber category-case',400,660,-9,800,1320,18),box('case-timber category-case',400,9,height/2,764,18,height),box('case-timber category-case',9,660,height/2,18,1320,height),box('case-timber category-case',791,660,height/2,18,1320,height),box('case-timber category-case',400,1311,height/2,764,18,height),box('case-metal category-handle',260,1340,height/2,18,40,18),box('case-metal category-handle',540,1340,height/2,18,40,18),box('case-metal category-handle',400,1360,height/2,310,18,18)].join('');}
  const world=document.querySelector('#drawerWorld');
  const active=document.createElement('div');active.className='drawer-level active-drawer';
  while(world.firstChild)active.append(world.firstChild);world.append(active);
  const categories=[{name:'Timber and textile category',kind:'ghost-warm',z:650},{name:'Metal and finish category',kind:'ghost-cool',z:1080}];
  for(const category of categories){const level=document.createElement('div');level.className=`drawer-level category-drawer ghost-drawer ${category.kind}`;level.setAttribute('aria-hidden','true');level.dataset.category=category.name;level.style.setProperty('--level-z',`${category.z}px`);level.innerHTML=casing(190)+Array.from({length:19},(_,i)=>box('ghost-sample',400,120+i*60,180,680,18,280,`--ghost-tone:${category.kind==='ghost-warm'?(i%3?'#b1a38b':'#918977'):(i%3?'#a7b6b4':'#8f9c9f')}`)).join('');world.append(level);}
  const foam=document.createElement('div');foam.className='drawer-level category-drawer foam-drawer';foam.setAttribute('aria-hidden','true');foam.dataset.category='Solid material blocks in fitted foam';foam.style.setProperty('--level-z','1510px');
  let insert=box('foam-piece foam-bed',400,660,25,764,1284,50);
  // Continuous foam webs form twelve actual recessed pockets above the solid bed.
  for(const [a,b] of [[18,56],[256,300],[500,544],[744,782]])insert+=box('foam-piece foam-web',(a+b)/2,660,75,b-a,1284,50);
  for(const [a,b] of [[18,54],[294,378],[618,702],[942,1026],[1266,1302]])insert+=box('foam-piece foam-web',400,(a+b)/2,75,764,b-a,50);
  const blocks=[['block-stone','#c6bfae',72],['block-wood','#9d8261',100],['block-concrete','#92978c',88],['block-cork','#b5a077',64],['block-stone','#ddd8c9',118],['block-metal','#8f9a98',78],['block-wood','#6d5c48',110],['block-concrete','#bbc0b4',68],['block-stone','#a5ae9c',96],['block-metal','#b5ac8c',72],['block-cork','#988263',90],['block-concrete','#787f75',106]];
  blocks.forEach(([kind,tone,depth],i)=>{insert+=box(`material-block ${kind}`,156+(i%3)*244,174+Math.floor(i/3)*324,53+depth/2,176,216,depth,`--block-tone:${tone}`);});
  foam.innerHTML=casing(130)+insert;world.append(foam);
})();
