const KEY = 'daily-score-v1';
const seed = [
  {id:'wake', name:'早起', type:'作息', timeStart:'05:30', timeEnd:'06:00', levels:[{label:'6 点前起床',score:8},{label:'7 点前起床',score:5},{label:'8 点前起床',score:2}]},
  {id:'ai', name:'学 AI', type:'学习成长', timeStart:'19:00', timeEnd:'20:30', levels:[{label:'深度学习 / 实操 90 min',score:16},{label:'学习 / 实操 45 min',score:10},{label:'学习 15 min',score:4}]},
  {id:'gym', name:'健身', type:'运动健康', timeStart:'08:30', timeEnd:'09:30', levels:[{label:'有效训练 60 min',score:12},{label:'有效训练 30 min',score:7},{label:'拉伸 / 轻训练',score:3}]},
  {id:'tennis', name:'网球', type:'运动健康', timeStart:'06:30', timeEnd:'08:00', levels:[{label:'基础 + 实战 60 min',score:12},{label:'实战 / 专项训练',score:8},{label:'挥拍 / 步伐练习',score:3}]},
  {id:'diet', name:'控食', type:'饮食管理', timeStart:'22:30', timeEnd:'23:00', levels:[{label:'完全按计划饮食',score:10},{label:'仅一餐偏离计划',score:5},{label:'记录饮食',score:2}]},
  {id:'language', name:'外语学习', type:'学习成长', timeStart:'12:45', timeEnd:'13:30', levels:[{label:'输入 + 输出 45 min',score:10},{label:'有效学习 30 min',score:6},{label:'学习 15 min',score:3}]},
  {id:'ip', name:'IP', type:'事业输出', timeStart:'21:30', timeEnd:'23:00', levels:[{label:'完成发布 / 核心作品',score:18},{label:'脚本、素材或剪辑推进',score:10},{label:'选题 / 素材整理',score:4}]},
  {id:'sidejob', name:'Sidejob', type:'事业输出', timeStart:'20:30', timeEnd:'21:30', levels:[{label:'关键交付 / 收入推进',score:14},{label:'有效工作推进',score:8},{label:'处理单项事务',score:3}]}
];
let state = JSON.parse(localStorage.getItem(KEY) || 'null') || {goals:seed, records:{}};
if (!state.goalCatalogVersion) {
  state.goals = seed;
  state.goalCatalogVersion = 2;
}
if (state.goalCatalogVersion < 3) {state.goals=state.goals.map(g=>{const preset=seed.find(x=>x.id===g.id);return preset&&!g.timeStart?{...g,timeStart:preset.timeStart,timeEnd:preset.timeEnd}:g});state.goalCatalogVersion=3;localStorage.setItem(KEY, JSON.stringify(state));}
if (state.goalCatalogVersion < 4) {state.goals=state.goals.map(g=>{const preset=seed.find(x=>x.id===g.id);return preset?{...g,timeStart:preset.timeStart,timeEnd:preset.timeEnd}:g});state.goalCatalogVersion=4;localStorage.setItem(KEY, JSON.stringify(state));}
let editingId = null, selectedGoal = null, days = 7, activeDayOffset = 0;
const $ = s => document.querySelector(s);
const dateKey = () => new Date().toISOString().slice(0,10);
const activeDateKey = () => {const d=new Date();d.setDate(d.getDate()+activeDayOffset);return d.toISOString().slice(0,10)};
const todayRecord = () => state.records[activeDateKey()] || {};
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
  $('#goalList').innerHTML=state.goals.map((g,i)=>`<article class="goal-row card" draggable="true" data-id="${g.id}"><span class="drag">⠿</span><div class="goal-copy"><b>${escapeHtml(g.name)}</b><small>${escapeHtml(g.type||'未分类')} · ${g.timeStart&&g.timeEnd?`建议 ${g.timeStart}–${g.timeEnd} · `:''}${g.levels.map(x=>`${escapeHtml(x.label)} ${x.score}分`).join(' / ')}</small></div><span class="goal-points">${max(g)}分</span><span class="move-buttons"><button class="move-goal" data-direction="-1" ${i===0?'disabled':''} aria-label="上移">⌃</button><button class="move-goal" data-direction="1" ${i===state.goals.length-1?'disabled':''} aria-label="下移">⌄</button></span><button class="icon-button edit-goal" aria-label="编辑 ${escapeHtml(g.name)}">›</button></article>`).join('') || '<p class="tip">还没有项目，添加一个开始吧。</p>';
  document.querySelectorAll('.edit-goal').forEach((b,i)=>b.onclick=()=>openGoal(state.goals[i].id));
  document.querySelectorAll('.move-goal').forEach(b=>b.onclick=()=>{const from=state.goals.findIndex(g=>g.id===b.closest('.goal-row').dataset.id),to=from+(+b.dataset.direction);[state.goals[from],state.goals[to]]=[state.goals[to],state.goals[from]];save();renderAll()});
  enableGoalDrag();
}
function renderCheckin(){
  const rec=todayRecord(), total=state.goals.reduce((a,g)=>a+max(g),0), score=todayScore();
  const activeDate=new Date();activeDate.setDate(activeDate.getDate()+activeDayOffset);
  $('#todayLabel').textContent=fmtDate(activeDate); $('#selectedDate').textContent=activeDayOffset===0?'今天':activeDayOffset===-1?'昨天':'前天'; $('#previousDate').disabled=activeDayOffset<=-2; $('#nextDate').disabled=activeDayOffset>=0;
  $('#todayScore').textContent=score; $('#totalPossible').textContent=total;
  $('#progressRing').style.background=`conic-gradient(var(--accent) ${total?score/total*360:0}deg,#e9eef7 0deg)`;
  const firstOpen=state.goals.findIndex(g=>!rec[g.id]);
  $('#progressText').textContent=state.goals.length && firstOpen===-1?'今日目标已全部完成，真棒！':firstOpen<0?'先设定一个目标':'可按自己的节奏完成任一项目';
  $('#checkinPath').innerHTML=state.goals.map((g,i)=>{
    const done=rec[g.id], current=!done && i===firstOpen;
    return `<div class="path-item ${done?'done':''} ${current?'current':''}"><div class="path-marker"><span class="path-dot">${done?'✓':i+1}</span>${i<state.goals.length-1?'<i class="path-line"></i>':''}</div><button class="path-card" data-id="${g.id}"><div class="path-copy"><b>${escapeHtml(g.name)}</b><small>${done?escapeHtml(done.label):g.levels.map(x=>x.score+'分').join(' / ')}</small></div>${done?`<span class="earned">+${done.score}</span>`:`<span>›</span>`}</button></div>`;
  }).join('') || '<p class="tip center">请先在「目标设定」中添加打卡项目。</p>';
  document.querySelectorAll('.path-card').forEach(b=>b.onclick=()=>openLevel(b.dataset.id));
  renderSchedule(rec);
}
function renderSchedule(rec){
  const startMinutes=5*60, slotHeight=28, endMinutes=24*60;
  const rows=[];for(let minute=startMinutes;minute<endMinutes;minute+=30){const h=Math.floor(minute/60).toString().padStart(2,'0'),m=(minute%60).toString().padStart(2,'0');rows.push(`<div class="schedule-tick">${m==='00'?`${h}:${m}`:''}</div>`)}
  const blocks=state.goals.slice().sort((a,b)=>(a.timeStart||'').localeCompare(b.timeStart||'')).map(g=>{if(!g.timeStart||!g.timeEnd)return '';const toMin=t=>{const [h,m]=t.split(':').map(Number);return h*60+m};const from=Math.max(startMinutes,toMin(g.timeStart)),to=Math.min(endMinutes,toMin(g.timeEnd));if(to<=from)return '';const done=rec[g.id];return `<button type="button" class="schedule-block ${done?'done':''}" data-id="${g.id}" style="top:${(from-startMinutes)/30*slotHeight}px;height:${Math.max(slotHeight,(to-from)/30*slotHeight-2)}px" title="${escapeAttr(g.name)} ${g.timeStart}–${g.timeEnd}"><b>${escapeHtml(g.name)}</b><small>${g.timeStart}</small></button>`}).join('');
  $('#scheduleTimeline').innerHTML=rows.join('')+blocks;
  document.querySelectorAll('.schedule-block').forEach(b=>b.onclick=()=>openLevel(b.dataset.id));
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
  $('#goalDialogTitle').textContent=g?'编辑项目':'新增项目'; $('#goalName').value=g?.name||'';$('#goalType').value=g?.type||'';$('#goalStart').value=g?.timeStart||'';$('#goalEnd').value=g?.timeEnd||''; $('#deleteGoal').hidden=!g;
  $('#levelInputs').innerHTML='';(g?.levels||[{label:'完成',score:1}]).forEach(addLevelInput);$('#goalDialog').showModal();
}
function addLevelInput(l={label:'',score:''}){const row=document.createElement('div');row.className='level-line';row.innerHTML=`<input required maxlength="30" value="${escapeAttr(l.label)}" placeholder="例如：60 min"><input required type="number" min="0" max="100" value="${l.score}" placeholder="分数"><button type="button" class="remove-level">×</button>`;row.querySelector('button').onclick=()=>{if($('#levelInputs').children.length>1)row.remove()};$('#levelInputs').append(row)}
function openLevel(id){selectedGoal=id;const g=state.goals.find(x=>x.id===id);$('#levelDialogTitle').textContent=g.name+' · 完成等级';$('#undoLevel').hidden=!todayRecord()[id];$('#levelChoices').innerHTML=g.levels.sort((a,b)=>b.score-a.score).map(l=>`<button type="button" class="level-choice" data-label="${escapeAttr(l.label)}" data-score="${l.score}"><span>${escapeHtml(l.label)}</span><b>+${l.score} 分</b></button>`).join('');document.querySelectorAll('.level-choice').forEach(b=>b.onclick=()=>{state.records[activeDateKey()]={...todayRecord(),[selectedGoal]:{label:b.dataset.label,score:+b.dataset.score}};save();$('#levelDialog').close();renderAll()});$('#levelDialog').showModal()}
function renderAll(){renderGoals();renderCheckin();renderReview()}
function enableGoalDrag(){let source;document.querySelectorAll('.goal-row').forEach(el=>{el.ondragstart=()=>source=el;el.ondragover=e=>e.preventDefault();el.ondrop=e=>{e.preventDefault();if(source===el)return;const from=state.goals.findIndex(g=>g.id===source.dataset.id),to=state.goals.findIndex(g=>g.id===el.dataset.id);state.goals.splice(to,0,state.goals.splice(from,1)[0]);save();renderAll()}})}
function escapeHtml(x){return String(x).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]))}function escapeAttr(x){return escapeHtml(x)}

$('#addGoal').onclick=()=>openGoal();$('#addLevel').onclick=()=>addLevelInput();
$('#goalForm').onsubmit=e=>{e.preventDefault();const levels=[...document.querySelectorAll('.level-line')].map(r=>({label:r.children[0].value.trim(),score:+r.children[1].value}));const timeStart=$('#goalStart').value,timeEnd=$('#goalEnd').value;if((timeStart&&!timeEnd)||(!timeStart&&timeEnd)||(timeStart&&timeEnd&&timeStart>=timeEnd)){alert('请填写完整且正确的建议时间段。');return}const g={id:editingId||crypto.randomUUID(),name:$('#goalName').value.trim(),type:$('#goalType').value.trim(),timeStart,timeEnd,levels};const next=state.goals.filter(x=>x.id!==editingId);if(next.reduce((a,x)=>a+max(x),0)+max(g)>100){alert('总分不能超过 100 分，请降低此项目的最高等级分数。');return} editingId?state.goals=state.goals.map(x=>x.id===editingId?g:x):state.goals.push(g);save();$('#goalDialog').close();renderAll()};
$('#deleteGoal').onclick=()=>{if(confirm('删除这个项目？历史打卡记录将保留。')){state.goals=state.goals.filter(x=>x.id!==editingId);save();$('#goalDialog').close();renderAll()}};
document.querySelectorAll('[data-close]').forEach(b=>b.onclick=()=>b.closest('dialog').close());
document.querySelectorAll('.bottom-nav button').forEach(b=>b.onclick=()=>{document.querySelectorAll('.page').forEach(p=>p.hidden=p.id!==b.dataset.page);document.querySelectorAll('.bottom-nav button').forEach(x=>x.classList.toggle('active',x===b));$('#pageTitle').textContent=b.textContent.trim();$('#resetToday').style.visibility=b.dataset.page==='checkinPage'?'visible':'hidden'});
document.querySelectorAll('.period-tabs button').forEach(b=>b.onclick=()=>{days=+b.dataset.days;document.querySelectorAll('.period-tabs button').forEach(x=>x.classList.toggle('active',x===b));renderReview()});
$('#resetToday').onclick=()=>{const label=activeDayOffset===0?'今日':activeDayOffset===-1?'昨日':'前天';if(confirm(`清空${label}所有打卡？`)){delete state.records[activeDateKey()];save();renderAll()}};
$('#undoLevel').onclick=()=>{if(!selectedGoal||!todayRecord()[selectedGoal])return;if(confirm('取消本项打卡？该项目本次得分将被移除。')){const record={...todayRecord()};delete record[selectedGoal];if(Object.keys(record).length)state.records[activeDateKey()]=record;else delete state.records[activeDateKey()];save();$('#levelDialog').close();renderAll()}};
$('#clearYesterday').onclick=()=>{const yesterday=new Date(Date.now()-86400000).toISOString().slice(0,10);if(!state.records[yesterday]){alert('昨天没有可清除的打卡记录。');return}if(confirm('清除昨天的全部打卡记录？此操作无法恢复。')){delete state.records[yesterday];save();renderAll()}};
$('#previousDate').onclick=()=>{if(activeDayOffset>-2){activeDayOffset--;renderCheckin()}};
$('#nextDate').onclick=()=>{if(activeDayOffset<0){activeDayOffset++;renderCheckin()}};
renderAll();
