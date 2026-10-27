(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.SampleWave=factory();})(typeof window!=='undefined'?window:globalThis,function(){
'use strict';const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
function pose(index,position,velocity=0,reduced=false){const d=index-position,focus=Math.exp(-d*d/4),shoulder=Math.exp(-d*d/18),ripple=reduced?0:Math.sin(d*1.15)*shoulder*clamp(velocity*100,-7,7);return {x:0,y:(index-11.5)*48,z:190+focus*80+Math.exp(-d*d/.55)*140+ripple,rx:-90+focus*10,ry:0,rz:0,visible:true};}
function track(position){return -(position-11.5)*48;}
return {pose,track,clamp};});

