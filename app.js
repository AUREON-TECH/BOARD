const STORAGE_KEY='board.project.v4';
const FALLBACK_KEYS=['board.project.v3','board.project.v1'];
const THEME_KEY='board.theme.v1';
const state={projectName:'Novo projeto',slides:[{id:crypto.randomUUID(),name:'Página 1',items:[],connections:[]}],active:0,selected:null,tool:'select',zoom:1,connectFrom:null};
const $=s=>document.querySelector(s);
const stage=$('#stage'),wrap=$('#stageWrap'),slidesList=$('#slidesList'),emptyHint=$('#emptyHint'),saveStatus=$('#saveStatus'),projectName=$('#projectName'),svg=$('#connections');
let deferredPrompt=null;

function uid(){return crypto.randomUUID()}
function current(){return state.slides[state.active]}
function normalize(){
  state.slides.forEach(slide=>{
    if(!Array.isArray(slide.items)) slide.items=[];
    if(!Array.isArray(slide.connections)) slide.connections=[];
    slide.items.forEach(item=>{
      if(item.text==='Duplo clique para editar') item.text='Nova ideia';
      if(item.text==='Ideia / insight') item.text='Nova ideia';
      if(item.type==='arrow') item.type='text';
    });
  });
}
function load(){
  let saved=null;
  for(const key of [STORAGE_KEY,...FALLBACK_KEYS]){
    try{const x=JSON.parse(localStorage.getItem(key)||'null');if(x&&Array.isArray(x.slides)){saved=x;break}}catch{}
  }
  if(saved){state.projectName=saved.projectName||'Novo projeto';state.slides=saved.slides;state.active=Math.min(saved.active||0,state.slides.length-1)}
  normalize();projectName.value=state.projectName;render();save();
}
function save(){
  state.projectName=projectName.value.trim()||'Novo projeto';
  localStorage.setItem(STORAGE_KEY,JSON.stringify({projectName:state.projectName,slides:state.slides,active:state.active}));
  saveStatus.innerHTML='☁ <span>Salvo automaticamente</span>';
}
function esc(v){return String(v).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]))}

function render(){
  [...stage.querySelectorAll('.board-item')].forEach(n=>n.remove());
  if(svg) svg.innerHTML='';
  stage.style.transform=`scale(${state.zoom})`;
  for(const item of current().items) renderItem(item);
  renderConnections();
  emptyHint.hidden=current().items.length>0;
  slidesList.innerHTML='';
  state.slides.forEach((slide,i)=>{
    const el=document.createElement('div');
    el.className='slide-thumb'+(i===state.active?' active':'');
    el.innerHTML=`<strong>${esc(slide.name)}</strong><small>${slide.items.length} elementos</small>`;
    if(state.slides.length>1){
      const remove=document.createElement('button');
      remove.className='slide-delete';
      remove.type='button';
      remove.textContent='×';
      remove.title='Excluir página';
      remove.onclick=e=>{e.stopPropagation();deleteSlide(i)};
      el.appendChild(remove);
    }
    el.onclick=()=>{state.active=i;state.selected=null;state.connectFrom=null;render();save()};
    el.ondblclick=()=>renameSlide(i);
    slidesList.appendChild(el);
  });
  $('#zoomLabel').textContent=Math.round(state.zoom*100)+'%';
}
function renderItem(item){
  const el=document.createElement('div');
  el.className=`board-item ${item.type||'rect'} ${item.variant||''}${state.selected===item.id?' selected':''}`;
  el.dataset.id=item.id;el.style.left=item.x+'px';el.style.top=item.y+'px';el.tabIndex=0;
  if(item.type==='image'){
    el.classList.add('image-item');
    const img=document.createElement('img');img.src=item.src;img.alt='Imagem no quadro';el.appendChild(img);
  }else{
    el.textContent=item.text||'Nova ideia';
  }
  if((item.type==='mind-center'||item.type==='mind-node')&&!item.image){
    const plus=document.createElement('button');plus.className='node-plus';plus.type='button';plus.textContent='＋';plus.title='Criar ramificação';
    plus.onpointerdown=e=>e.stopPropagation();
    plus.onclick=e=>{e.stopPropagation();addChild(item)};
    el.appendChild(plus);
  }
  if(state.selected===item.id){
    const del=document.createElement('button');
    del.className='item-delete';
    del.type='button';
    del.textContent='×';
    del.title='Remover este item';
    del.onpointerdown=e=>e.stopPropagation();
    del.onclick=e=>{e.stopPropagation();deleteItem(item.id)};
    el.appendChild(del);
  }
  el.onclick=e=>handleItemClick(e,item);
  el.ondblclick=e=>{e.stopPropagation();beginEdit(el,item)};
  makeDraggable(el,item);
  stage.appendChild(el);
}
function beginEdit(el,item){
  if(item.type==='image')return;
  el.classList.add('editing');el.contentEditable='true';el.focus();
  const sel=window.getSelection(),range=document.createRange();range.selectNodeContents(el);range.collapse(false);sel.removeAllRanges();sel.addRange(range);
  const finish=()=>{
    el.contentEditable='false';el.classList.remove('editing');
    const plus=el.querySelector('.node-plus');if(plus)plus.remove();
    const val=el.innerText.replace(/\n\+$/,'').trim();
    item.text=val||'Nova ideia';save();render();
  };
  el.onblur=finish;
  el.onkeydown=e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();el.blur()}if(e.key==='Escape'){e.preventDefault();el.blur()}};
}
function handleItemClick(e,item){
  e.stopPropagation();
  if(state.tool==='connect'){
    if(!state.connectFrom){
      state.connectFrom=item.id;state.selected=item.id;showBanner('Agora clique no bloco que deseja conectar');
    }else if(state.connectFrom!==item.id){
      addConnection(state.connectFrom,item.id);state.connectFrom=null;state.selected=item.id;setTool('select');hideBanner();
    }
    render();return;
  }
  state.selected=item.id;render();
}
function addItem(type,x=280,y=210,text){
  const item={id:uid(),type,text:text||({text:'Novo texto',note:'Nova ideia',rect:'Novo bloco'}[type]||'Nova ideia'),x,y};
  current().items.push(item);state.selected=item.id;render();save();return item;
}
function addConnection(from,to,variant=''){
  if(current().connections.some(c=>c.from===from&&c.to===to))return;
  current().connections.push({id:uid(),from,to,variant});save();
}
function addChild(parent){
  const colors=['mind-blue','mind-green','mind-violet','mind-orange'];
  const siblings=current().connections.filter(c=>c.from===parent.id).length;
  const child={id:uid(),type:'mind-node',variant:colors[siblings%colors.length],text:'Nova ramificação',x:parent.x+300,y:Math.max(70,parent.y+(siblings-1.5)*120)};
  current().items.push(child);addConnection(parent.id,child.id,['','soft','violet','orange'][siblings%4]);state.selected=child.id;render();save();
  requestAnimationFrame(()=>{const el=stage.querySelector(`[data-id="${child.id}"]`);if(el)beginEdit(el,child)});
}
function createMindMap(){
  const baseX=Math.max(320,Math.round(wrap.scrollLeft/state.zoom+wrap.clientWidth/(2*state.zoom)-120));
  const baseY=Math.max(190,Math.round(wrap.scrollTop/state.zoom+wrap.clientHeight/(2*state.zoom)-60));
  const center={id:uid(),type:'mind-center',text:'Minha ideia central',x:baseX,y:baseY};
  const nodes=[
    {id:uid(),type:'mind-node',variant:'mind-blue',text:'Objetivos',x:baseX-330,y:baseY-150},
    {id:uid(),type:'mind-node',variant:'mind-green',text:'Ações',x:baseX+330,y:baseY-150},
    {id:uid(),type:'mind-node',variant:'mind-violet',text:'Ideias',x:baseX-330,y:baseY+160},
    {id:uid(),type:'mind-node',variant:'mind-orange',text:'Resultados',x:baseX+330,y:baseY+160}
  ];
  current().items.push(center,...nodes);
  nodes.forEach((n,i)=>current().connections.push({id:uid(),from:center.id,to:n.id,variant:['','soft','violet','orange'][i]}));
  state.selected=center.id;render();save();
  requestAnimationFrame(()=>{const el=stage.querySelector(`[data-id="${center.id}"]`);if(el)beginEdit(el,center)});
}
function renderConnections(){
  if(!svg)return;
  const byId=new Map(current().items.map(i=>[i.id,i]));
  for(const c of current().connections){
    const a=byId.get(c.from),b=byId.get(c.to);if(!a||!b)continue;
    const ax=a.x+(a.type==='mind-center'?105:90), ay=a.y+32;
    const bx=b.x+(b.type==='mind-center'?105:90), by=b.y+32;
    const mid=(ax+bx)/2;
    const p=document.createElementNS('http://www.w3.org/2000/svg','path');
    p.setAttribute('d',`M ${ax} ${ay} C ${mid} ${ay}, ${mid} ${by}, ${bx} ${by}`);
    if(c.variant)p.setAttribute('class',c.variant);
    svg.appendChild(p);
  }
}
function makeDraggable(el,item){
  let drag=null,moved=false;
  el.onpointerdown=e=>{
    if(e.target.classList.contains('node-plus')||el.classList.contains('editing')||state.tool==='connect')return;
    const r=stage.getBoundingClientRect();
    drag={dx:(e.clientX-r.left)/state.zoom-item.x,dy:(e.clientY-r.top)/state.zoom-item.y};
    moved=false;el.setPointerCapture(e.pointerId);
  };
  el.onpointermove=e=>{
    if(!drag)return;moved=true;
    const r=stage.getBoundingClientRect();
    item.x=Math.max(0,(e.clientX-r.left)/state.zoom-drag.dx);item.y=Math.max(0,(e.clientY-r.top)/state.zoom-drag.dy);
    el.style.left=item.x+'px';el.style.top=item.y+'px';renderConnections();
  };
  el.onpointerup=e=>{if(drag){drag=null;if(moved){save();render()}}};
}
function deleteItem(id){
  current().items=current().items.filter(i=>i.id!==id);
  current().connections=current().connections.filter(c=>c.from!==id&&c.to!==id);
  if(state.selected===id)state.selected=null;
  render();save();
}
function deleteSelected(){
  if(!state.selected)return;
  deleteItem(state.selected);
}
function deleteSlide(i){
  if(state.slides.length<=1)return;
  if(!confirm('Excluir esta página e tudo que está nela?'))return;
  state.slides.splice(i,1);
  if(state.active>=state.slides.length)state.active=state.slides.length-1;
  else if(i<state.active)state.active--;
  state.selected=null;state.connectFrom=null;render();save();
}
function clearCurrentPage(){
  if(!current().items.length)return;
  if(!confirm('Remover todos os itens e conexões desta página?'))return;
  current().items=[];current().connections=[];state.selected=null;render();save();
}
function setTool(tool){
  state.tool=tool;state.connectFrom=null;
  document.querySelectorAll('[data-tool]').forEach(b=>b.classList.toggle('active',b.dataset.tool===tool));
  if(tool!=='connect')hideBanner();
}
document.querySelectorAll('[data-tool]').forEach(btn=>btn.onclick=()=>{
  const tool=btn.dataset.tool;
  if(tool==='select'||tool==='connect'){setTool(tool);if(tool==='connect')showBanner('Clique no primeiro bloco da conexão');return}
  setTool('select');addItem(tool,280+wrap.scrollLeft/state.zoom,180+wrap.scrollTop/state.zoom);
  requestAnimationFrame(()=>{const el=stage.querySelector(`[data-id="${state.selected}"]`);const item=current().items.find(i=>i.id===state.selected);if(el&&item)beginEdit(el,item)});
});
stage.onclick=e=>{if(e.target===stage||e.target===svg){state.selected=null;if(state.tool==='connect'){state.connectFrom=null;hideBanner()}render()}};
stage.oncontextmenu=e=>{
  const itemEl=e.target.closest('.board-item');
  if(!itemEl)return;
  e.preventDefault();
  const id=itemEl.dataset.id;
  if(confirm('Remover este item do quadro?'))deleteItem(id);
};

$('#mindMapBtn').onclick=createMindMap;$('#newMindMapBtn').onclick=createMindMap;$('#emptyMapBtn').onclick=createMindMap;
$('#newBlockBtn').onclick=()=>{const it=addItem('rect',300+wrap.scrollLeft/state.zoom,200+wrap.scrollTop/state.zoom);requestAnimationFrame(()=>beginEdit(stage.querySelector(`[data-id="${it.id}"]`),it))};
$('#emptyNoteBtn').onclick=()=>{const it=addItem('note',320,240);requestAnimationFrame(()=>beginEdit(stage.querySelector(`[data-id="${it.id}"]`),it))};
$('#deleteBtn').onclick=()=>{
  if(state.selected) deleteSelected();
  else clearCurrentPage();
};
function addSlide(){state.slides.push({id:uid(),name:`Página ${state.slides.length+1}`,items:[],connections:[]});state.active=state.slides.length-1;state.selected=null;render();save()}
$('#addSlideBtn').onclick=addSlide;$('#newPageBtn').onclick=addSlide;
function renameSlide(i){const n=prompt('Nome da página:',state.slides[i].name);if(n&&n.trim()){state.slides[i].name=n.trim();render();save()}}
function showBanner(msg){hideBanner();const el=document.createElement('div');el.id='connectBanner';el.className='connect-banner';el.textContent=msg;document.body.appendChild(el)}
function hideBanner(){document.querySelector('#connectBanner')?.remove()}
function togglePresent(){document.body.classList.toggle('presenting');$('#presentBtn').innerHTML=document.body.classList.contains('presenting')?'✕ <span>Sair</span>':'▶ <span>Apresentar</span>'}
$('#presentBtn').onclick=togglePresent;
document.addEventListener('keydown',e=>{
  const editing=document.activeElement?.isContentEditable;
  if((e.key==='Delete'||e.key==='Backspace')&&!editing&&document.activeElement!==projectName)deleteSelected();
  if(e.key==='Escape'){if(document.body.classList.contains('presenting'))togglePresent();setTool('select')}
  if(e.key==='Enter'&&state.selected&&!editing){
    const item=current().items.find(i=>i.id===state.selected),el=stage.querySelector(`[data-id="${state.selected}"]`);if(item&&el)beginEdit(el,item)
  }
});
projectName.oninput=()=>{saveStatus.innerHTML='☁ <span>Salvando…</span>';clearTimeout(projectName._t);projectName._t=setTimeout(save,250)};
function applyTheme(theme){document.documentElement.dataset.theme=theme;$('#themeBtn').textContent=theme==='dark'?'☀':'☾';localStorage.setItem(THEME_KEY,theme)}
applyTheme(localStorage.getItem(THEME_KEY)||'light');$('#themeBtn').onclick=()=>applyTheme(document.documentElement.dataset.theme==='dark'?'light':'dark');
function setZoom(z){state.zoom=Math.max(.6,Math.min(1.5,z));render()}$('#zoomIn').onclick=()=>setZoom(state.zoom+.1);$('#zoomOut').onclick=()=>setZoom(state.zoom-.1);

$('#imageBtn').onclick=()=>$('#imageInput').click();
$('#imageInput').onchange=e=>{const f=e.target.files?.[0];if(!f)return;const reader=new FileReader();reader.onload=()=>{current().items.push({id:uid(),type:'image',src:reader.result,x:300+wrap.scrollLeft/state.zoom,y:200+wrap.scrollTop/state.zoom});render();save()};reader.readAsDataURL(f);e.target.value=''};

window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();deferredPrompt=e;$('#installBtn').hidden=false});
$('#installBtn').onclick=async()=>{if(!deferredPrompt)return;deferredPrompt.prompt();await deferredPrompt.userChoice;deferredPrompt=null;$('#installBtn').hidden=true};
window.addEventListener('appinstalled',()=>$('#installBtn').hidden=true);
function updateNetwork(){const on=navigator.onLine;$('#offlineStatus').textContent=on?'● Online':'○ Offline'}window.addEventListener('online',updateNetwork);window.addEventListener('offline',updateNetwork);updateNetwork();
load();