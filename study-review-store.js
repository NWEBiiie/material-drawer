export const MODELS = {binder:'Binder',case:'Slanted case',wave:'Wave drawer',pockets:'Pocket box',belt:'Wave drawer · sliding belt'};
export const CRITERIA = [
  ['portability','Portability'],['intuitiveness','Intuitiveness'],
  ['visibility','Sample visibility'],['cost','Cost efficiency'],
  ['compactness','Compact storage']
];
export const LEVELS = ['Poor','Fair','Good','Very good','Excellent'];
const PREFIX='sample-room-review-v1:';
const fields=new Set(['pros','cons',...CRITERIA.map(([id])=>'score.'+id)]);
const valid=(model,field)=>Object.hasOwn(MODELS,model)&&fields.has(field);
export function reviewKey(model,field){
  if(!valid(model,field))throw new Error('Unknown review field');
  return PREFIX+model+':'+field;
}
export function parseReviewKey(key){
  if(!key?.startsWith(PREFIX))return null;
  const [model,field,...rest]=key.slice(PREFIX.length).split(':');
  return !rest.length&&valid(model,field)?{model,field}:null;
}
export function decodeReviewValue(field,value){
  if(!field.startsWith('score.'))return typeof value==='string'?value:'';
  return /^[1-5]$/.test(value??'')?Number(value):null;
}
export function readReview(storage,model,field){return decodeReviewValue(field,storage.getItem(reviewKey(model,field)));}
export function writeReview(storage,model,field,value){
  const key=reviewKey(model,field);
  if(field.startsWith('score.')){
    if(value===null){storage.removeItem(key);return;}
    if(!Number.isInteger(value)||value<1||value>5)throw new Error('Invalid score');
  }else if(typeof value!=='string')throw new Error('Invalid note');
  storage.setItem(key,String(value));
}
