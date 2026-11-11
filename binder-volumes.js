const volumes=[['Flooring',21],['Paint',11],['Tile & grout',10],['Surfaces',16],['Wall protection',7],['Specialties',10]];
const params=new URLSearchParams(location.search),n=Number(params.get('volume')),current=Number.isInteger(n)&&n>=1&&n<=6?n:1,wave=location.pathname.endsWith('mini.html')&&params.get('view')!=='pockets';
const root=document.createElement('aside');root.className='binder-volumes';root.setAttribute('aria-label','Material volumes');
const label=document.createElement('label');label.textContent='Volume ';const select=document.createElement('select');select.setAttribute('aria-label','Collection volume');
volumes.forEach(([name,count],i)=>{const o=new Option(`${String(i+1).padStart(2,'0')} · ${name} · ${count}`,String(i+1));select.add(o);});select.value=String(current);label.append(select);
select.onchange=()=>{const url=new URL(location.href);url.searchParams.set('volume',select.value);location.assign(url.href);};
const matrix=document.createElement('a');matrix.href='material-matrix.html';matrix.textContent='Matrix ↗';const storage=document.createElement('a');storage.href='storage.html';storage.textContent='Storage ↗';root.append(label,matrix,storage);
if(wave){const l=document.createElement('label');l.textContent='Drive ';const drive=document.createElement('select');drive.setAttribute('aria-label','Wave mechanism');drive.add(new Option('Original cam wheel','cam'));drive.add(new Option('Sliding belt + dowel','belt'));drive.value=params.get('drive')==='belt'?'belt':'cam';drive.onchange=()=>{const url=new URL(location.href);url.searchParams.set('drive',drive.value);location.assign(url.href);};l.append(drive);root.append(l);
 if(drive.value==='belt'){const d=document.createElement('label');d.className='dowel-control';d.textContent='Push / pull dowel ';const slider=document.createElement('input');slider.type='range';slider.min=0;slider.max=17;slider.step=.01;slider.value=7;slider.id='dowelPosition';slider.setAttribute('aria-label','Dowel position');d.append(slider);root.append(d);}
}
if(current!==1){const note=document.createElement('small');note.textContent='Material references · unknown dimensions flagged';root.append(note);}
root.addEventListener('keydown',e=>e.stopPropagation());document.body.append(root);
const inspection=document.getElementById('inspection');new MutationObserver(()=>root.hidden=!inspection.hidden).observe(inspection,{attributes:true,attributeFilter:['hidden']});
