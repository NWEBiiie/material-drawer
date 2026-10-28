// Local surface studies. Uploaded images use the same texture path as these canvases.
export function surfaceCanvas(sample, size=512) {
  const canvas=document.createElement('canvas');canvas.width=canvas.height=size;
  const c=canvas.getContext('2d');c.fillStyle=sample.color||'#bbb6a8';c.fillRect(0,0,size,size);
  let seed=[...sample.id].reduce((n,s)=>n+s.charCodeAt(0),17);
  const rand=()=>{seed=(Math.imul(seed,1664525)+1013904223)|0;return(seed>>>0)/4294967296;};
  if(sample.family==='timber'&&sample.texture!=='cork'){
    for(let i=0;i<380;i++){const x=rand()*size;c.beginPath();c.moveTo(x,0);for(let y=0;y<=size;y+=12)c.lineTo(x+Math.sin(y/90+i)*3+Math.sin(y/37+i)*1.4,y);c.strokeStyle=`rgba(${i%3?'45,29,15':'255,245,210'},${.025+rand()*.12})`;c.lineWidth=.3+rand()*1.3;c.stroke();}
  }else if(sample.family==='textiles'){
    for(let i=0;i<size;i+=3){c.fillStyle=i%2?'#fff2':'#241c161a';c.fillRect(i,0,1,size);c.fillRect(0,i,size,1);}
  }else if(['marble','rosso','slate','travertine'].includes(sample.texture)){
    for(let i=0;i<10;i++){let x=rand()*size*1.5-size*.25;c.beginPath();c.moveTo(x,0);for(let y=0;y<=size;y+=8){x+=Math.sin(y/80+i)*1.8+(rand()-.5)*4;c.lineTo(x+y*.18,y);}c.lineWidth=.4+rand()*2;c.strokeStyle=i%3?'#5d675735':'#faf8e57a';c.stroke();}
  }
  for(let i=0;i<(sample.texture==='terrazzo'?900:8500);i++){
    const x=rand()*size,y=rand()*size,chip=['cork','terrazzo'].includes(sample.texture);
    c.fillStyle=rand()>.5?`rgba(255,248,225,${chip?.2+rand()*.5:.045})`:`rgba(34,30,20,${chip?.1+rand()*.3:.06})`;
    c.beginPath();c.ellipse(x,y,chip?1+rand()*6:.25+rand()*.6,chip?1+rand()*4:.25+rand()*.6,rand()*3,0,Math.PI*2);c.fill();
  }
  return canvas;
}

export function labelCanvas(name,{light=false,small=false}={}){
  const canvas=document.createElement('canvas');canvas.width=1024;canvas.height=small?128:512;const c=canvas.getContext('2d');
  c.fillStyle=light?'#e8e9dc':'#46503f';c.font=small?'32px Arial':'58px Georgia';c.textBaseline='top';
  const words=name.split(/\s+/);let line='',y=small?34:32;
  for(const word of words){if(c.measureText(line+' '+word).width>canvas.width-60&&line){c.fillText(line,28,y);y+=small?38:70;line=word;}else line+=(line?' ':'')+word;}
  c.fillText(line,28,y);return canvas;
}
