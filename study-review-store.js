export const MODELS = {binder:'Binder',case:'Slanted case',wave:'Wave drawer',pockets:'Pocket box',belt:'Wave drawer · sliding belt'};
export const CRITERIA = [
  ['portability','Portability'],['intuitiveness','Intuitiveness'],
  ['visibility','Sample visibility'],['cost','Cost efficiency'],
  ['compactness','Compact storage']
];
export const LEVELS = ['Poor','Fair','Good','Very good','Excellent'];
export const DEFAULT_REVIEWS = {
  binder: {
    scores: {portability:3,intuitiveness:2,visibility:4,cost:5,compactness:4},
    pros:'- Can group subcategories on a single page.\n- Easy to edit and remove individual sheets.',
    cons:'- Too generic.\n- Uneven when stacked.'
  },
  case: {
    scores: {portability:3,intuitiveness:3,visibility:3,cost:4,compactness:4},
    pros:'- Sockets fit a wide range of dimensions.',
    cons:'- May be structurally difficult to maintain the angled position.\n- Difficult to view without lifting each piece.'
  },
  wave: {
    scores: {portability:3,intuitiveness:3,visibility:3,cost:2,compactness:4},
    pros:'- Visually appealing.',
    cons:'- May be overly complicated for its intended purpose.'
  },
  pockets: {
    scores: {portability:3,intuitiveness:4,visibility:5,cost:4,compactness:3},
    pros:'- Simple and highly adaptable.\n- Potentials for multiple layers.',
    cons:'- May take up too much space.'
  }
};
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
export function defaultReview(model,field){
  if(!valid(model,field))throw new Error('Unknown review field');
  const review=DEFAULT_REVIEWS[model==='belt'?'wave':model];
  return field.startsWith('score.')?review.scores[field.slice(6)]:review[field];
}
export function readReview(storage,model,field){
  const value=storage.getItem(reviewKey(model,field));
  return value===null?defaultReview(model,field):decodeReviewValue(field,value);
}
export function writeReview(storage,model,field,value){
  const key=reviewKey(model,field);
  if(field.startsWith('score.')){
    // An explicit blank preserves Clear scores across reloads; a missing key uses the default.
    if(value===null){storage.setItem(key,'');return;}
    if(!Number.isInteger(value)||value<1||value>5)throw new Error('Invalid score');
  }else if(typeof value!=='string')throw new Error('Invalid note');
  storage.setItem(key,String(value));
}
