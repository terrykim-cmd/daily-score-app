const KEY = 'daily-score-v1';
const seed = [
  {id:'wake', name:'早起', type:'作息', levels:[{label:'6 点前起床',score:5},{label:'7 点前起床',score:3}]},
  {id:'tennis', name:'网球', type:'运动', levels:[{label:'练基础 + 实战',score:5},{label:'练实战',score:3}]},
  {id:'gym', name:'健身', type:'运动', levels:[{label:'60 min',score:5},{label:'30 min',score:3}]}
];
let state = JSON.parse(localStorage.getItem(KEY) || 'null') || {goals:seed, records:{}};
let editingId = null, selectedGoal = null, days = 7;
const $ = s => document.querySelector(s);
const dateKey = () => new Date().toISOString().slice(0,10);
const todayRecord = () => state.records[dateKey()] || {};
const save = () => localStorage.setItem(KEY, JSON.stringify(state));
const max = g => Math.max(...g.levels.map(l=>Number(l.score)||0),0);
const allocated = () => state.goals.reduce((a,g)=>a+max(g),0);
const todayScore = () => Object.values(todayRecord()).reduce((a,x)=>a+(x.score||0),0);
const fmtDate = d => new Intl.DateTimeFormat('zh-CN',{month:'long',day:'numeric',weekday:'short'}).format(d);

function renderGoals(){
  const used=allocated(), allowed=100-used;
  $('#allocatedScore').textContent=used; $('#scoreMeter').style.width=Math.min(used,100)+'%';
  $('#scoreHint').textContent=allowed >= 0 ? `还可分配 ${allowed} 分` : `超出 ${Math.abs(allowed)} 分，请调整项目分值`;
  $('#scoreHint').style.color=allowed>=0?'var(--green)':'var(--danger)';
  $('#goalList').innerHTML=state.goals.map((g,i)=>`<article class="goal-row card" draggable="true" data-id="${g.id}"><span class="drag">⠿</span><div class="goal-copy"><b>${escapeHtml(g.name)}</b><small>${escapeHtml(g.type||'未分类')} · ${g.levels.map(x=>`${escapeHtml(x.label)} ${x.score}分`).join(' / ')}</small></div><span class="goal-points">${max(g)}分</span><span class="move-buttons"><button class="move-goal" data-direction="-1" ${i===0?'disabled':''} aria-label="上移">⌃</button><button class="move-goal" data-direction="1" ${i===state.goals.length-1?'disabled':''} aria-label="下移">⌄</button></span><button class="icon-button edit-goal" aria-label="编辑 ${escapeHtml(g.name)}">›</button></article>`).join('') || '<p class="tip">还没有项目，添加一个开始吧。</p>';
  document.querySelectorAll('.edit-goal').forEach((b,i)=>b.onclick=()=>openGoal(state.goals[i].id));
  document.querySelectorAll('.move-goal').forEach(b=>b.onclick=()=>{const from=state.goals.findIndex(g=>g.id===b.closest('.goal-row').dataset.id),to=from+(+b.dataset.direction);[state.goals[from],state.goals[to]]=[state.goals[to],state.goals[from]];save();renderAll()});
  enableGoalDrag();
}
function renderCheckin(){
  const rec=todayRecord(), total=state.goals.reduce((a,g)=>a+max(g),0), score=todayScore();
  $('#todayLabel').textContent=fmtDate(new Date()); $('#todayScore').textContent=score; $('#totalPossible').textContent=total;
  $('#progressRing').style.background=`conic-gradient(var(--accent) ${total?score/total*360:0}deg,#e9eef7 0deg)`;
  const firstOpen=state.goals.findIndex(g=>!rec[g.id]);
  $('#progressText').textContent=state.goals.length && firstOpen===-1?'今日目标已全部完成，真棒！':firstOpen<0?'先设定一个目标':'可按自己的节奏完成任一项目';
  $('#checkinPath').innerHTML=state.goals.map((g,i)=>{
    const done=rec[g.id], current=!done && i===firstOpen;
    return `<div class="path-item ${done?'done':''} ${current?'current':''}"><div class="path-marker"><span class="path-dot">${done?'✓':i+1}</span>${i<state.goals.length-1?'<i class="path-line"></i>':''}</div><button class="path-card" data-id="${g.id}"><div class="path-copy"><b>${escapeHtml(g.name)}</b><small>${done?escapeHtml(done.label):g.levels.map(x=>x.score+'分').join(' / ')}</small></div>${done?`<span class="earned">+${done.score}</span>`:`<span>›</span>`}</button></div>`;
  }).join('') || '<p class="tip center">请先在「目标设定」中添加打卡项目。</p>';
  document.querySelectorAll('.path-card').forEach(b=>b.onclick=()=>openLevel(b.dataset.id));
}
function renderReview(){
  const data=[]; for(let i=days-1;i>=0;i--){const d=new Date();d.setDate(d.getDate()-i);const k=d.toISOString().slice(0,10), r=state.records[k]||{};data.push({d,k,score:Object.values(r).reduce((a,x)=>a+x.score,0)});}
  const active=data.filter(x=>x.score>0), sum=data.reduce((a,x)=>a+x.score,0);
  $('#averageScore').textContent=(sum/days).toFixed(1);$('#activeDays').textContent=active.length;$('#bestScore').textContent=Math.max(0,...data.map(x=>x.score));
  const cap=Math.max(1,...data.map(x=>x.score),allocated());
  $('#scoreChart').innerHTML=data.map(x=>`<div class="bar-wrap" title="${x.k}: ${x.score}分"><i class="bar" style="height:${Math.max(3,x.score/cap*100)}%"></i><small>${x.d.slice(5).replace('-','/')}</small></div>`).join('');
  const types={};state.goals.forEach(g=>types[g.type||'未分类']=(types[g.type||'未分类']||0)+max(g)); const typeTotal=Math.max(1,Object.values(types).reduce((a,x)=>a+x,0));
  $('#typeDistribution').innerHTML=Object.entries(types).map(([t,s])=>`<div class="dist-row"><span>${escapeHtml(t)}</span><div class="dist-track"><i style="width:${s/typeTotal*100}%"></i></div><b>${s}分</b></div>`).join('') || '<p class="tip">暂无目标类型。</p>';
}
function openGoal(id){
  editingId=id||null; const g=state.goals.find(x=>x.id===id);
  $('#goalDialogTitle').textContent=g?'编辑项目':'新增项目'; $('#goalName').value=g?.name||'';$('#goalType').value=g?.type||''; $('#deleteGoal').hidden=!g;
  $('#levelInputs').innerHTML='';(g?.levels||[{label:'完成',score:1}]).forEach(addLevelInput);$('#goalDialog').showModal();
}
function addLevelInput(l={label:'',score:''}){const row=document.createElement('div');row.className='level-line';row.innerHTML=`<input required maxlength="30" value="${escapeAttr(l.label)}" placeholder="例如：60 min"><input required type="number" min="0" max="100" value="${l.score}" placeholder="分数"><button type="button" class="remove-level">×</button>`;row.querySelector('button').onclick=()=>{if($('#levelInputs').children.length>1)row.remove()};$('#levelInputs').append(row)}
function openLevel(id){selectedGoal=id;const g=state.goals.find(x=>x.id===id);$('#levelDialogTitle').textContent=g.name+' · 完成等级';$('#levelChoices').innerHTML=g.levels.sort((a,b)=>b.score-a.score).map(l=>`<button type="button" class="level-choice" data-label="${escapeAttr(l.label)}" data-score="${l.score}"><span>${escapeHtml(l.label)}</span><b>+${l.score} 分</b></button>`).join('');document.querySelectorAll('.level-choice').forEach(b=>b.onclick=()=>{state.records[dateKey()]={...todayRecord(),[selectedGoal]:{label:b.dataset.label,score:+b.dataset.score}};save();$('#levelDialog').close();renderAll()});$('#levelDialog').showModal()}
function renderAll(){renderGoals();renderCheckin();renderReview()}
function enableGoalDrag(){let source;document.querySelectorAll('.goal-row').forEach(el=>{el.ondragstart=()=>source=el;el.ondragover=e=>e.preventDefault();el.ondrop=e=>{e.preventDefault();if(source===el)return;const from=state.goals.findIndex(g=>g.id===source.dataset.id),to=state.goals.findIndex(g=>g.id===el.dataset.id);state.goals.splice(to,0,state.goals.splice(from,1)[0]);save();renderAll()}})}
function escapeHtml(x){return String(x).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]))}function escapeAttr(x){return escapeHtml(x)}

$('#addGoal').onclick=()=>openGoal();$('#addLevel').onclick=()=>addLevelInput();
$('#goalForm').onsubmit=e=>{e.preventDefault();const levels=[...document.querySelectorAll('.level-line')].map(r=>({label:r.children[0].value.trim(),score:+r.children[1].value}));const g={id:editingId||crypto.randomUUID(),name:$('#goalName').value.trim(),type:$('#goalType').value.trim(),levels};const next=state.goals.filter(x=>x.id!==editingId);if(next.reduce((a,x)=>a+max(x),0)+max(g)>100){alert('总分不能超过 100 分，请降低此项目的最高等级分数。');return} editingId?state.goals=state.goals.map(x=>x.id===editingId?g:x):state.goals.push(g);save();$('#goalDialog').close();renderAll()};
$('#deleteGoal').onclick=()=>{if(confirm('删除这个项目？历史打卡记录将保留。')){state.goals=state.goals.filter(x=>x.id!==editingId);save();$('#goalDialog').close();renderAll()}};
document.querySelectorAll('[data-close]').forEach(b=>b.onclick=()=>b.closest('dialog').close());
document.querySelectorAll('.bottom-nav button').forEach(b=>b.onclick=()=>{document.querySelectorAll('.page').forEach(p=>p.hidden=p.id!==b.dataset.page);document.querySelectorAll('.bottom-nav button').forEach(x=>x.classList.toggle('active',x===b));$('#pageTitle').textContent=b.textContent.trim();$('#resetToday').style.visibility=b.dataset.page==='checkinPage'?'visible':'hidden'});
document.querySelectorAll('.period-tabs button').forEach(b=>b.onclick=()=>{days=+b.dataset.days;document.querySelectorAll('.period-tabs button').forEach(x=>x.classList.toggle('active',x===b));renderReview()});
$('#resetToday').onclick=()=>{if(confirm('清空今日所有打卡？')){delete state.records[dateKey()];save();renderAll()}};
renderAll();
