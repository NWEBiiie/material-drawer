export const cabinets = [
  {name:'Acrylic samples', count:24, max:24},
  {name:'Sample binder', count:24, max:30},
  {name:'Slanted samples', count:6, max:10},
  {name:'Foam blocks', count:12, max:12},
];
export const cabinetKey='sample-room-cabinets-v1';
export function normalizeCabinets(value){
  return cabinets.map((spec,c)=>{
    const input=value?.[c], n=Number(input?.count);
    return {count:Number.isFinite(n)?Math.max(1,Math.min(spec.max,Math.round(n))):spec.count,
      textures:Array.from({length:spec.max},(_,i)=>typeof input?.textures?.[i]==='string'?input.textures[i]:null)};
  });
}
export function slotInfo(id){const match=/^slot-([0-3])-(\d+)$/.exec(id);if(!match)return null;const c=Number(match[1]),i=Number(match[2]);return i<cabinets[c].max?{cabinet:c,index:i}:null;}
export function materialSlot(config,c,i,lookup){
  const textureId=config[c].textures[i], texture=textureId?lookup(textureId):null;
  return {...(texture||{name:`Material ${String(i+1).padStart(2,'0')}`,family:'neutral',texture:'default',color:'#c9c5bb',finish:'Default texture'}),
    id:`slot-${c}-${i}`,textureId:texture?.id||null,placeholder:!texture,cabinet:c,slot:i};
}
