(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.SampleWave=factory();})(typeof window!=='undefined'?window:globalThis,function(){
'use strict';const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
function pose(index,position,velocity=0,reduced=false){const d=index-position,focus=Math.exp(-d*d/5.6),shoulder=Math.exp(-d*d/24),ripple=reduced?0:Math.sin(d*1.1)*shoulder*clamp(velocity*180,-12,12);return {x:0,y:(index-11.5)*26,z:145+focus*92+ripple,rx:-90+focus*7,ry:0,rz:0,visible:true};}
return {pose,clamp};});
