const STORAGE_KEY='board.project.v3';
const LEGACY_KEY='board.project.v1';
const THEME_KEY='board.theme.v1';
const state={projectName:'Novo projeto',slides:[{id:crypto.randomUUID(),name:'Página 1',items:[]}],active:0,selected:null,tool:'select',zoom:1};
const $=s=>document.querySelector(s);
const stage=$('#stage'),slidesList=$('#slidesList'),emptyHint=$('#emptyHint'),saveStatus=$('#saveStatus'),projectName=$('#projectName');
let deferredPrompt=null;

function applyTheme(theme){
  const next=theme==='dark'?'dark':'light';
  document.documentElement.dataset.theme=next;
  $('#themeBtn').textContent=next==='dark'?'☀':'☾';
  document.querySelector('meta[name="theme-color"]').setAttribute('content',next==='dark'?'#0d1830':'#ffffff');
  localStorage.setItem(THEME_KEY,next);
}
applyTheme(localStorage.getItem(THEME_KEY)||'light');

function load(){
  try{
    const raw=localStorage.getItem(STORAGE_KEY)||localStorage.getItem(LEGACY_KEY)||'null';
    const saved=JSON.parse(raw);
    if(saved&&Array.isArray(saved.slides)){Object.assign(state,saved);state.selected=null;state.zoom=1}
  }catch{}
  projectName.value=state.projectName||'Novo projeto';
  render();
}
function save(){
  state.projectName=projectName.value.trim()||'Novo projeto';
  localStorage.setItem(STORAGE_KEY,JSON.stringify({projectName:state.projectName,slides:state.slides,active:state.active}));
  saveStatus.innerHTML='☁ <span>Salvo automaticamente</span>';
}
function current(){return state.slides[state.active]}
function render(){
  stage.innerHTML='';
  stage.style.transform=`scale(${state.zoom})`;
  for(const item of current().items){
    const el=document.createElement('div');
    el.className=`board-item ${item.type}${state.selected===item.id?' selected':''}`;
    el.dataset.id=item.id;el.style.left=item.x+'px';el.style.top=item.y+'px';el.textContent=item.text;el.tabIndex=0;
    makeDraggable(el,item);
    el.ondblclick=()=>editItem(item);
    el.onclick=e=>{e.stopPropagation();state.selected=item.id;render()};
    stage.appendChild(el);
  }
  emptyHint.hidden=current().items.length>0;
  slidesList.innerHTML='';
  state.slides.forEach((slide,i)=>{
    const b=document.createElement('div');
    b.className='slide-thumb'+(i===state.active?' active':'');
    b.innerHTML=`<strong>${escapeHtml(slide.name)}</strong><small>${slide.items.length} ${slide.items.length===1?'elemento':'elementos'}</small>`;
    b.onclick=()=>{state.active=i;state.selected=null;render();save()};
    b.ondblclick=()=>renameSlide(i);
    slidesList.appendChild(b);
  });
  $('#zoomLabel').textContent=Math.round(state.zoom*100)+'%';
}
function escapeHtml(v){return String(v).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]))}
function addItem(type,x=250,y=190){
  const labels={text:'Título estratégico',note:'Nova ideia',rect:'Bloco estratégico',arrow:'→'};
  current().items.push({id:crypto.randomUUID(),type,text:labels[type]||'Novo item',x,y});
  state.selected=current().items.at(-1).id;render();save();
}
function editItem(item){
  if(item.type==='arrow')return;
  const next=prompt('Editar conteúdo:',item.text);
  if(next!==null){item.text=next.trim()||item.text;render();save()}
}
function renameSlide(i){
  const next=prompt('Nome da página:',state.slides[i].name);
  if(next!==null&&next.trim()){state.slides[i].name=next.trim();render();save()}
}
function makeDraggable(el,item){
  let drag=null;
  el.onpointerdown=e=>{
    if(state.tool!=='select')return;
    el.setPointerCapture(e.pointerId);
    const r=stage.getBoundingClientRect();
    drag={dx:(e.clientX-r.left)/state.zoom-item.x,dy:(e.clientY-r.top)/state.zoom-item.y};
    state.selected=item.id;
  };
  el.onpointermove=e=>{
    if(!drag)return;
    const r=stage.getBoundingClientRect();
    item.x=Math.max(0,(e.clientX-r.left)/state.zoom-drag.dx);
    item.y=Math.max(0,(e.clientY-r.top)/state.zoom-drag.dy);
    el.style.left=item.x+'px';el.style.top=item.y+'px';
  };
  el.onpointerup=()=>{if(drag){drag=null;save();render()}};
}
function deleteSelected(){
  if(!state.selected)return;
  current().items=current().items.filter(i=>i.id!==state.selected);state.selected=null;render();save();
}
function chooseTool(tool,btn){
  state.tool=tool;
  document.querySelectorAll('[data-tool]').forEach(b=>b.classList.toggle('active',b===btn));
  if(tool!=='select'){
    addItem(tool);
    state.tool='select';
    document.querySelectorAll('[data-tool]').forEach(b=>b.classList.toggle('active',b.dataset.tool==='select'));
  }
}
document.querySelectorAll('[data-tool]').forEach(btn=>btn.onclick=()=>chooseTool(btn.dataset.tool,btn));
document.querySelectorAll('[data-quick]').forEach(btn=>btn.onclick=()=>addItem(btn.dataset.quick,360+Math.random()*120,220+Math.random()*120));

stage.onclick=e=>{
  state.selected=null;
  if(state.tool!=='select'){
    const r=stage.getBoundingClientRect();
    addItem(state.tool,(e.clientX-r.left)/state.zoom,(e.clientY-r.top)/state.zoom);
  }else render();
};
$('#deleteBtn').onclick=deleteSelected;
$('#imageBtn').onclick=()=>alert('Ferramenta de imagem preparada para a próxima etapa.');
document.addEventListener('keydown',e=>{
  if((e.key==='Delete'||e.key==='Backspace')&&document.activeElement!==projectName)deleteSelected();
  if(e.key==='Escape'&&document.body.classList.contains('presenting'))togglePresent();
});
function addSlide(){
  state.slides.push({id:crypto.randomUUID(),name:`Página ${state.slides.length+1}`,items:[]});
  state.active=state.slides.length-1;state.selected=null;render();save();
}
$('#addSlideBtn').onclick=addSlide;$('#newPageBtn').onclick=addSlide;
function togglePresent(){
  document.body.classList.toggle('presenting');
  $('#presentBtn').innerHTML=document.body.classList.contains('presenting')?'✕ <span>Sair</span>':'▶ <span>Apresentar</span>';
}
$('#presentBtn').onclick=togglePresent;
projectName.oninput=()=>{
  saveStatus.innerHTML='☁ <span>Salvando…</span>';
  clearTimeout(projectName._t);projectName._t=setTimeout(save,250);
};
$('#themeBtn').onclick=()=>applyTheme(document.documentElement.dataset.theme==='dark'?'light':'dark');
function setZoom(next){state.zoom=Math.min(1.5,Math.max(.6,next));render()}
$('#zoomIn').onclick=()=>setZoom(state.zoom+.1);$('#zoomOut').onclick=()=>setZoom(state.zoom-.1);
window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();deferredPrompt=e;$('#installBtn').hidden=false});
$('#installBtn').onclick=async()=>{if(!deferredPrompt)return;deferredPrompt.prompt();await deferredPrompt.userChoice;deferredPrompt=null;$('#installBtn').hidden=true};
window.addEventListener('appinstalled',()=>{$('#installBtn').hidden=true});
function updateNetwork(){
  const online=navigator.onLine;$('#offlineStatus').textContent=online?'● Online':'○ Offline';$('#offlineStatus').title=online?'Conectado':'Modo offline';
}
window.addEventListener('online',updateNetwork);window.addEventListener('offline',updateNetwork);updateNetwork();load();