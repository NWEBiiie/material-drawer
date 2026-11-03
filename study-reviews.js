import {MODELS,CRITERIA,LEVELS,reviewKey,parseReviewKey,decodeReviewValue,readReview,writeReview} from './study-review-store.js?v=3';

const path=location.pathname;
const fixedModel=path.endsWith('binder.html')?'binder':path.endsWith('case.html')?'case':path.endsWith('mini.html')?(new URLSearchParams(location.search).get('view')==='pockets'?'pockets':new URLSearchParams(location.search).get('drive')==='belt'?'belt':'wave'):null;
let selected=fixedModel||'binder',storage,readFailed=false;
try{storage=localStorage;}catch{readFailed=true;}
const drafts=new Map(),pending=new Map();
const fields=['pros','cons',...CRITERIA.map(([id])=>'score.'+id)];
const root=document.createElement('aside');
root.className='study-review';root.dataset.view=fixedModel||'shelf';root.setAttribute('aria-label','Option review');
root.innerHTML=`<button class="review-toggle" aria-expanded="false" aria-controls="review-panel"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 4h14v16H5zM8 8h8M8 12h8M8 16h4"/></svg><span>Pros, cons & scores</span></button>
  <section id="review-panel" aria-labelledby="review-title" hidden>
    <div class="review-heading"><h2 id="review-title">Option review</h2><button class="review-close" aria-label="Close option review">×</button></div>
    ${fixedModel?`<p class="review-model">${MODELS[fixedModel]}</p>`:`<label class="review-model-select">Option<select aria-label="Option to review">${Object.entries(MODELS).map(([id,name])=>`<option value="${id}">${name}</option>`).join('')}</select></label>`}
    <table class="review-matrix"><caption>1 Poor · 2 Fair · 3 Good · 4 Very good · 5 Excellent</caption><thead><tr><th scope="col">Criteria</th>${LEVELS.map((level,i)=>`<th scope="col" title="${level}">${i+1}</th>`).join('')}</tr></thead><tbody>${CRITERIA.map(([id,label])=>`<tr><th scope="row">${label}</th>${LEVELS.map((level,i)=>`<td><label class="review-score"><input type="radio" name="review-${id}" value="${i+1}" data-score="${id}" aria-label="${label}: ${i+1} — ${level}"><span aria-hidden="true"></span></label></td>`).join('')}</tr>`).join('')}</tbody></table>
    <div class="review-score-summary"><span class="review-rated"></span><button class="review-clear" type="button">Clear scores</button></div>
    <label class="review-note">Pros<textarea data-note="pros" rows="3" placeholder="What works well?"></textarea></label>
    <label class="review-note">Cons<textarea data-note="cons" rows="3" placeholder="What could be improved?"></textarea></label>
    <p class="review-status" role="status" aria-live="polite"></p>
    <p class="review-privacy">Private to this browser. Retained after closing.</p>
  </section>`;
document.body.append(root);
const panel=root.querySelector('#review-panel'),toggle=root.querySelector('.review-toggle'),status=root.querySelector('.review-status');
function get(model,field){
  const key=reviewKey(model,field);
  if(!drafts.has(key)){
    try{drafts.set(key,readReview(storage,model,field));}
    catch{readFailed=true;drafts.set(key,field.startsWith('score.')?null:'');}
  }
  return drafts.get(key);
}
function showStatus(saved=false){
  const failed=readFailed||pending.size>0;
  status.dataset.state=failed?'error':'saved';
  status.textContent=failed?'Couldn’t save. Keep this page open and copy your notes.':saved?'Saved on this browser':'Autosaves on this browser';
}
function updateScores(){
  for(const input of root.querySelectorAll('[data-score]'))input.checked=get(selected,'score.'+input.dataset.score)===Number(input.value);
  const count=CRITERIA.filter(([id])=>get(selected,'score.'+id)!==null).length;
  root.querySelector('.review-rated').textContent=count?`${count} of ${CRITERIA.length} rated`:'Not rated yet';
  root.querySelector('.review-clear').disabled=!count;
}
function render(){
  for(const textarea of root.querySelectorAll('[data-note]'))textarea.value=get(selected,textarea.dataset.note);
  updateScores();showStatus(fields.some(field=>{const value=get(selected,field);return value!==null&&value!=='';}));
}
function flush(){
  for(const [key,{model,field,value}] of pending){
    try{writeReview(storage,model,field,value);pending.delete(key);readFailed=false;}catch{}
  }
  showStatus(true);
}
function save(field,value){
  const key=reviewKey(selected,field);
  drafts.set(key,value);pending.set(key,{model:selected,field,value});
  // Save every edit immediately, including the last keystroke before closing.
  flush();
}
function close(){panel.hidden=true;toggle.setAttribute('aria-expanded','false');}
toggle.onclick=()=>{panel.hidden=!panel.hidden;toggle.setAttribute('aria-expanded',String(!panel.hidden));if(!panel.hidden)render();};
root.querySelector('.review-close').onclick=()=>{close();toggle.focus();};
root.querySelector('select')?.addEventListener('change',e=>{selected=e.target.value;render();});
for(const textarea of root.querySelectorAll('[data-note]'))textarea.addEventListener('input',()=>save(textarea.dataset.note,textarea.value));
for(const input of root.querySelectorAll('[data-score]'))input.addEventListener('change',()=>{save('score.'+input.dataset.score,Number(input.value));updateScores();});
root.querySelector('.review-clear').onclick=()=>{for(const [id] of CRITERIA)save('score.'+id,null);updateScores();};
root.addEventListener('keydown',e=>{e.stopPropagation();if(e.key==='Escape'){e.preventDefault();close();toggle.focus();}});
document.addEventListener('pointerdown',e=>{if(!root.contains(e.target))close();});
addEventListener('pagehide',()=>{if(pending.size)flush();});
addEventListener('storage',e=>{
  if(e.storageArea!==storage)return;
  // One key per model/field prevents edits to another option overwriting notes.
  if(e.key===null){for(const key of drafts.keys())if(!pending.has(key))drafts.delete(key);render();return;}
  const parsed=parseReviewKey(e.key);if(!parsed||pending.has(e.key))return;
  drafts.set(e.key,decodeReviewValue(parsed.field,e.newValue));
  if(parsed.model===selected){
    if(parsed.field.startsWith('score.'))updateScores();
    else root.querySelector(`[data-note="${parsed.field}"]`).value=get(selected,parsed.field);
    showStatus(true);
  }
});
const inspection=document.querySelector('#inspection');
if(inspection){
  const sync=()=>{root.hidden=!inspection.hidden;if(root.hidden)close();};
  new MutationObserver(sync).observe(inspection,{attributes:true,attributeFilter:['hidden']});sync();
}
render();
