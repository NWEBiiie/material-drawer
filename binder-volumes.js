const volumes=[['Flooring',18],['Paint',11],['Tile & grout',10],['Surfaces',16],['Wall protection',7],['Specialties',10]];
const n=Number(new URLSearchParams(location.search).get('volume')),current=Number.isInteger(n)&&n>=1&&n<=6?n:1;
const root=document.createElement('aside');root.className='binder-volumes';root.setAttribute('aria-label','Material volumes');
const label=document.createElement('label');label.textContent='Volume ';const select=document.createElement('select');select.setAttribute('aria-label','Binder volume');
volumes.forEach(([name,count],i)=>{const o=new Option(`${String(i+1).padStart(2,'0')} · ${name} · ${count}`,String(i+1));select.add(o);});select.value=String(current);label.append(select);
select.onchange=()=>location.assign('binder.html'+(select.value==='1'?'':'?volume='+select.value));
const link=document.createElement('a');link.href='material-matrix.html';link.textContent='Material matrix ↗';root.append(label,link);
if(current!==1){const note=document.createElement('small');note.textContent='Color mockup · unknown dimensions flagged';root.append(note);}
root.addEventListener('keydown',e=>e.stopPropagation());document.body.append(root);
const inspection=document.getElementById('inspection');new MutationObserver(()=>root.hidden=!inspection.hidden).observe(inspection,{attributes:true,attributeFilter:['hidden']});
