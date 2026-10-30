const path=location.pathname;
const current=path.endsWith('case.html')?'case':path.endsWith('mini.html')?(new URLSearchParams(location.search).get('view')==='pockets'?'pockets':'wave'):'binder';
const studies=[
 ['binder','Binder','./','M3 4h7l2 2 2-2h7v16h-7l-2 2-2-2H3zM12 6v16'],
 ['case','Slanted case','case.html','m3 10 9-4 9 4v10H3zM3 10l9 4 9-4M5 9V3h14v6'],
 ['wave','Wave drawer','mini.html?view=wave','M3 9h18v11H3zM5 9V5m4 4V3m4 6V2m4 7V4m-9 11h8'],
 ['pockets','Pocket box','mini.html?view=pockets','M3 4h18v16H3zM3 10h18M3 15h18M9 4v16m6-16v16']
];
const header=document.querySelector('header'),title=header.querySelector('div'),info=header.querySelector('#info');
const archive=document.createElement('a');archive.className='icon archive-link';archive.href='archive.html';archive.title='Archived cabinet';archive.setAttribute('aria-label','Open archived cabinet');archive.innerHTML='<svg viewBox="0 0 24 24"><path d="M4 8h16v13H4zM3 3h18v5H3zM9 12h6"/></svg>';
const nav=document.createElement('nav');nav.className='collection-switch';nav.setAttribute('aria-label','Sample models');
for(const [id,label,url,icon] of studies){const a=document.createElement('a');a.href=url;a.dataset.mode=id;a.title=label;a.setAttribute('aria-label',label);if(id===current)a.setAttribute('aria-current','page');a.innerHTML=`<svg viewBox="0 0 24 24"><path d="${icon}"/></svg><span>${label}</span>`;nav.append(a);}
info.className='icon collection-info';header.replaceChildren(archive,title,nav,info);
const about=document.querySelector('#about');const note=document.createElement('details');note.className='tether-spec';note.innerHTML='<summary>Retractable tether</summary><p>RUIWOR RW5101 · Ø25.2 × 8.3 mm housing, 27.2 mm including the cable outlet. 550 mm travel, 0.6 mm cable, ⅛ lb return force.</p><p>Smallest suitable housing found in the product comparison. Housing envelope follows the published dimensions; mounting brackets are a design concept. Cable retraction does not lift the material’s weight.</p><a href="https://www.ruiwor.com/rw5101-round-mini-anti-lost-recoiler-eyelet-terminal-with-ring-terminal-inner-hole-3mm-4mm-5mm-for-option-product/" target="_blank" rel="noopener">Manufacturer specification ↗</a>';
about?.append(note);
