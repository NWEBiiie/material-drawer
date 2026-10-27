(() => {
  'use strict';
  const faces=['top','bottom','left','right','near','far'];
  const box=(kind,x,y,z,w,h,d,extra='')=>`<div class="case-box ${kind}" style="--bx:${x}px;--by:${y}px;--bz:${z}px;--bw:${w}px;--bh:${h}px;--bd:${d}px;${extra}">${faces.map(f=>`<span class="box-face box-${f}"></span>`).join('')}</div>`;
  function casing(height){return [box('case-timber category-case',400,660,-9,800,1320,18),box('case-timber category-case',400,9,height/2,764,18,height),box('case-timber category-case',9,660,height/2,18,1320,height),box('case-timber category-case',791,660,height/2,18,1320,height),box('case-timber category-case',400,1311,height/2,764,18,height),box('case-metal category-handle',260,1340,height/2,18,40,18),box('case-metal category-handle',540,1340,height/2,18,40,18),box('case-metal category-handle',400,1360,height/2,310,18,18)].join('');}
  const world=document.querySelector('#drawerWorld');
  // Clear the 1360px cabinet front even at the -552px end of sample travel.
  const extension=2000;
  document.documentElement.style.setProperty('--drawer-extension',`${extension}px`);
  const active=document.createElement('div');active.className='drawer-level active-drawer';
  while(world.firstChild)active.append(world.firstChild);world.append(active);
  const categories=[{name:'Timber and textiles',z:430},{name:'Stone and finishes',z:860}];
  for(const category of categories){const level=document.createElement('div');level.className='drawer-level category-drawer file-category';level.dataset.category=category.name;level.style.setProperty('--level-z',`${category.z}px`);level.innerHTML=casing(190);world.append(level);}
  const foam=document.createElement('div');foam.className='drawer-level category-drawer foam-drawer';foam.dataset.category='Solid material blocks';foam.style.setProperty('--level-z','1290px');
  let insert=box('foam-piece foam-bed',400,660,25,764,1284,50);
  // Continuous foam webs form twelve actual recessed pockets above the solid bed.
  for(const [a,b] of [[18,56],[256,300],[500,544],[744,782]])insert+=box('foam-piece foam-web',(a+b)/2,660,75,b-a,1284,50);
  for(const [a,b] of [[18,54],[294,378],[618,702],[942,1026],[1266,1302]])insert+=box('foam-piece foam-web',400,(a+b)/2,75,764,b-a,50);
  const blocks=[['block-stone','#c6bfae',72],['block-wood','#9d8261',100],['block-concrete','#92978c',88],['block-cork','#b5a077',64],['block-stone','#ddd8c9',118],['block-metal','#8f9a98',78],['block-wood','#6d5c48',110],['block-concrete','#bbc0b4',68],['block-stone','#a5ae9c',96],['block-metal','#b5ac8c',72],['block-cork','#988263',90],['block-concrete','#787f75',106]];
  blocks.forEach(([kind,tone,depth],i)=>{insert+=box(`material-block ${kind}`,156+(i%3)*244,174+Math.floor(i/3)*324,53+depth/2,176,216,depth,`--block-tone:${tone}`);});
  foam.innerHTML=casing(130)+insert;world.append(foam);
  const cabinet=document.createElement('div');cabinet.className='cabinet-shell';cabinet.setAttribute('aria-hidden','true');
  cabinet.innerHTML=[box('case-timber cabinet-panel',400,660,-32,860,1400,28),box('case-timber cabinet-panel',400,660,1614,860,1400,28),box('case-timber cabinet-panel',-16,660,791,28,1400,1618),box('case-timber cabinet-panel',816,660,791,28,1400,1618),box('case-timber cabinet-panel',400,-26,791,804,28,1618),box('case-timber cabinet-stile',-16,1345,791,28,30,1618),box('case-timber cabinet-stile',816,1345,791,28,30,1618),...[[240,430],[620,860],[1050,1290],[1420,1600]].map(([a,b])=>box('case-timber cabinet-apron',400,1333,(a+b)/2,804,18,b-a))].join('');world.prepend(cabinet);
  const levels=[active,...world.querySelectorAll('.category-drawer')],names=['Acrylic collection','Timber and textiles','Stone and finishes','Solid material blocks'];
  const icons=['<rect x="5" y="4" width="10" height="14"/><path d="M9 7h10v13H9"/>','<path d="M5 5h14v14H5zM8 5v14m4-14v14m4-14v14"/>','<path d="m12 3 9 8-9 10-9-10zM3 11h18M12 3v18"/>','<path d="m4 8 8-4 8 4v9l-8 4-8-4zM4 8l8 4 8-4m-8 4v9"/>'];
  const picker=document.createElement('nav');picker.className='category-picker';picker.setAttribute('aria-label','Drawer categories');picker.innerHTML=[3,2,1,0].map(i=>`<button class="round-control category-choice" data-category="${i}" aria-label="Open ${names[i]}" title="${names[i]}" aria-pressed="false"><svg viewBox="0 0 24 24" aria-hidden="true">${icons[i]}</svg></button>`).join('');document.body.append(picker);
  let selected=-1;document.body.dataset.drawer='closed';
  function frame(index,open){const z=[0,430,860,1290][index]+(open?(index===3?100:410):[120,95,95,65][index]),y=open?extension:675;document.documentElement.style.setProperty('--camera-x',`${y/Math.sqrt(2)}px`);document.documentElement.style.setProperty('--camera-y',`${z*Math.sqrt(2/3)-y/Math.sqrt(6)}px`);}
  function select(index){const next=index===selected?-1:index;selected=next;frame(index,next>=0);levels.forEach((level,i)=>{level.classList.toggle('is-open',i===next);level.style.setProperty('--focus-travel','0px');level.querySelector('.drawer-pull').setAttribute('aria-expanded',String(i===next));});picker.querySelectorAll('button').forEach(button=>button.setAttribute('aria-pressed',String(Number(button.dataset.category)===next)));document.body.dataset.drawer=next<0?'closed':next===3?'blocks':'files';window.dispatchEvent(new CustomEvent('drawer-category-change',{detail:{index:next}}));}
  levels.forEach((level,i)=>{const pull=document.createElement('button');pull.className='drawer-pull';pull.setAttribute('aria-label',`Open or close ${names[i]} drawer`);pull.setAttribute('aria-expanded','false');pull.style.setProperty('--handle-z',`${[120,95,95,65][i]}px`);pull.onclick=()=>select(i);level.append(pull);});picker.addEventListener('click',e=>{const button=e.target.closest('[data-category]');if(button)select(Number(button.dataset.category));});
  window.DrawerCabinet={select,get index(){return selected;},track(value){if(selected>=0&&selected<3)levels[selected].style.setProperty('--focus-travel',`${value}px`);}};
})();
