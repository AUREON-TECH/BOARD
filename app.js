const LIBRARY_KEY='board.projects.v1';
const ACTIVE_PROJECT_KEY='board.activeProject.v1';
const LEGACY_KEYS=['board.project.v4','board.project.v3','board.project.v1'];
const THEME_KEY='board.theme.v1';
let projectId=null;
const state={projectName:'Novo projeto',slides:[{id:crypto.randomUUID(),name:'Página 1',items:[],connections:[]}],active:0,selected:null,tool:'select',zoom:1,connectFrom:null};
const $=s=>document.querySelector(s);
const stage=$('#stage'),wrap=$('#stageWrap'),slidesList=$('#slidesList'),emptyHint=$('#emptyHint'),saveStatus=$('#saveStatus'),projectName=$('#projectName'),svg=$('#connections');
let deferredPrompt=null;
const history={undo:[],redo:[],limit:50,suspended:false};
function snapshot(){return JSON.stringify({projectName:projectName?.value||state.projectName,slides:state.slides,active:state.active})}
function checkpoint(){
  if(history.suspended)return;
  const snap=snapshot();
  if(history.undo.at(-1)!==snap)history.undo.push(snap);
  if(history.undo.length>history.limit)history.undo.shift();
  history.redo=[];updateHistoryButtons();
}
function restoreSnapshot(raw){
  if(!raw)return;
  const data=JSON.parse(raw);history.suspended=true;
  state.projectName=data.projectName||'Novo projeto';state.slides=data.slides||[];state.active=Math.min(data.active||0,state.slides.length-1);
  state.selected=null;state.connectFrom=null;projectName.value=state.projectName;normalize();render();save();history.suspended=false;updateHistoryButtons();
}
function undo(){if(!history.undo.length)return;history.redo.push(snapshot());restoreSnapshot(history.undo.pop())}
function redo(){if(!history.redo.length)return;history.undo.push(snapshot());restoreSnapshot(history.redo.pop())}
function updateHistoryButtons(){if($('#undoBtn'))$('#undoBtn').disabled=!history.undo.length;if($('#redoBtn'))$('#redoBtn').disabled=!history.redo.length}

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
      const label=String(item.text||'').trim().toUpperCase().replace(/\s+/g,' ');
      if(!item.smartMetric){
        if(/^TOTAL\s+CASA(?:L|IS)$/.test(label))item.smartMetric='casais';
        else if(/^TOTAL\s+VENDAS?$/.test(label))item.smartMetric='vendas';
        else if(/^TOTAL\s+VGV$/.test(label)||/^TOTAL\s+VGB$/.test(label))item.smartMetric='vgv';
      }
      if(item.smartMetric)item.type='smart-total';
    });
  });
}
function blankProject(name='Novo projeto'){
  return {id:uid(),name,createdAt:Date.now(),updatedAt:Date.now(),active:0,slides:[{id:uid(),name:'Página 1',items:[],connections:[]}]};
}
function readLibrary(){
  try{
    const lib=JSON.parse(localStorage.getItem(LIBRARY_KEY)||'[]');
    return Array.isArray(lib)?lib:[];
  }catch{return []}
}
function writeLibrary(lib){localStorage.setItem(LIBRARY_KEY,JSON.stringify(lib))}
function migrateLegacy(){
  const existing=readLibrary();
  if(existing.length)return existing;
  for(const key of LEGACY_KEYS){
    try{
      const old=JSON.parse(localStorage.getItem(key)||'null');
      if(old&&Array.isArray(old.slides)){
        const p={id:uid(),name:old.projectName||'Meu primeiro projeto',createdAt:Date.now(),updatedAt:Date.now(),active:old.active||0,slides:old.slides};
        writeLibrary([p]);localStorage.setItem(ACTIVE_PROJECT_KEY,p.id);return [p];
      }
    }catch{}
  }
  const p=blankProject();writeLibrary([p]);localStorage.setItem(ACTIVE_PROJECT_KEY,p.id);return [p];
}
function loadProject(id){
  const lib=readLibrary();
  const p=lib.find(x=>x.id===id)||lib[0];
  if(!p)return;
  projectId=p.id;localStorage.setItem(ACTIVE_PROJECT_KEY,projectId);
  state.projectName=p.name||'Novo projeto';state.slides=p.slides||[];state.active=Math.min(p.active||0,Math.max(0,state.slides.length-1));
  state.selected=null;state.tool='select';state.zoom=1;state.connectFrom=null;
  normalize();projectName.value=state.projectName;history.undo=[];history.redo=[];render();renderProjects();updateHistoryButtons();saveStatus.innerHTML='☁ <span>Salvo automaticamente</span>';
}
function load(){
  const lib=migrateLegacy();
  const active=localStorage.getItem(ACTIVE_PROJECT_KEY);
  loadProject(lib.some(p=>p.id===active)?active:lib[0].id);
}
function save(){
  if(!projectId)return;
  state.projectName=projectName.value.trim()||'Novo projeto';
  const lib=readLibrary();
  const idx=lib.findIndex(p=>p.id===projectId);
  const payload={id:projectId,name:state.projectName,createdAt:idx>=0?(lib[idx].createdAt||Date.now()):Date.now(),updatedAt:Date.now(),active:state.active,slides:state.slides};
  if(idx>=0)lib[idx]=payload;else lib.unshift(payload);
  writeLibrary(lib);
  saveStatus.innerHTML='☁ <span>Salvo automaticamente</span>';
  renderProjects();
}
function esc(v){return String(v).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]))}

function parseBRNumber(raw){
  let s=String(raw||'').trim().replace(/\s/g,'').replace(/R\$/gi,'');
  if(!s)return 0;
  if(s.includes(',')){
    s=s.replace(/\./g,'').replace(',','.');
  }else{
    const dots=(s.match(/\./g)||[]).length;
    if(dots>1)s=s.replace(/\./g,'');
    else if(dots===1){
      const parts=s.split('.');
      if(parts[1]?.length===3)s=parts.join('');
    }
  }
  const n=Number(s.replace(/[^0-9.-]/g,''));
  return Number.isFinite(n)?n:0;
}
function extractTotals(){
  const totals={vendas:0,casais:0,vgv:0};
  for(const item of current().items){
    if(item.smartMetric||item.type==='smart-total')continue;
    const text=String(item.text||'');
    for(const m of text.matchAll(/(\d+(?:[.,]\d+)?)\s*VENDAS?/gi))totals.vendas+=parseBRNumber(m[1]);
    for(const m of text.matchAll(/(\d+(?:[.,]\d+)?)\s*CASAIS?/gi))totals.casais+=parseBRNumber(m[1]);
    for(const m of text.matchAll(/(?:VGV|VGB)\s*(?:R\$\s*)?([\d.]+(?:,\d{1,2})?)/gi))totals.vgv+=parseBRNumber(m[1]);
  }
  return totals;
}
function formatSmartValue(metric,value){
  if(metric==='vgv')return value.toLocaleString('pt-BR',{style:'currency',currency:'BRL',minimumFractionDigits:2,maximumFractionDigits:2});
  return Math.round(value).toLocaleString('pt-BR');
}
function smartLabel(metric){
  return metric==='casais'?'TOTAL CASAIS':metric==='vendas'?'TOTAL VENDAS':'TOTAL VGV';
}
function refreshSmartTotals(){
  const totals=extractTotals();
  current().items.forEach(item=>{
    if(item.smartMetric){
      item.smartValue=totals[item.smartMetric]||0;
      const el=stage.querySelector(`[data-id="${item.id}"] .smart-value`);
      if(el)el.textContent=formatSmartValue(item.smartMetric,item.smartValue);
    }
  });
}
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
  if(item.fontSize)el.style.setProperty('--item-font-size',item.fontSize+'px');
  if(item.bold)el.classList.add('is-bold');
  if(item.color){el.classList.add('custom-color');el.style.setProperty('--item-color',item.color);el.style.setProperty('--item-text-color',contrastText(item.color));}
  if(item.type==='image'){
    el.classList.add('image-item');
    const img=document.createElement('img');img.src=item.src;img.alt='Imagem no quadro';el.appendChild(img);
  }else if(item.type==='smart-total'||item.smartMetric){
    el.classList.add('smart-total');
    const totals=extractTotals();
    item.smartValue=totals[item.smartMetric]||0;
    const badge=document.createElement('span');badge.className='smart-badge';badge.textContent='Σ AUTO';
    const label=document.createElement('div');label.className='smart-label';label.textContent=smartLabel(item.smartMetric);
    const value=document.createElement('div');value.className='smart-value';value.textContent=formatSmartValue(item.smartMetric,item.smartValue);
    el.append(badge,label,value);
  }else{
    const text=document.createElement('div');
    text.className='item-text';
    text.contentEditable='true';
    text.spellcheck=true;
    text.textContent=item.text||'Nova ideia';
    text.onpointerdown=e=>e.stopPropagation();
    text.onclick=e=>{e.stopPropagation();showSelection(item)};
    text.onfocus=()=>{if(!el.classList.contains('editing'))checkpoint();showSelection(item);el.classList.add('editing')};
    text.oninput=()=>{item.text=text.innerText;saveStatus.innerHTML='☁ <span>Salvando…</span>';refreshSmartTotals()};
    text.onblur=()=>{item.text=text.innerText.trim()||'Nova ideia';el.classList.remove('editing');save();};
    text.onkeydown=e=>{
      if(e.key==='Escape'){e.preventDefault();text.blur();}
    };
    el.appendChild(text);
    const dragHandle=document.createElement('button');
    dragHandle.className='drag-handle';
    dragHandle.type='button';
    dragHandle.textContent='⋮⋮';
    dragHandle.title='Arrastar';
    dragHandle.onpointerdown=e=>e.stopPropagation();
    el.appendChild(dragHandle);
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
  if(item.type==='image'||item.type==='smart-total'||item.smartMetric)return;
  const text=el.querySelector('.item-text');
  if(!text)return;
  showSelection(item);
  text.focus();
  const sel=window.getSelection(),range=document.createRange();
  range.selectNodeContents(text);range.collapse(false);sel.removeAllRanges();sel.addRange(range);
}
function contrastText(hex){
  if(!hex||hex[0]!=='#'||hex.length<7)return '#ffffff';
  const r=parseInt(hex.slice(1,3),16),g=parseInt(hex.slice(3,5),16),b=parseInt(hex.slice(5,7),16);
  return (r*299+g*587+b*114)/1000>165?'#111827':'#ffffff';
}
function positionFormatBar(){
  const bar=$('#formatBar');if(!bar)return;
  if(!state.selected){bar.hidden=true;return}
  const el=stage.querySelector(`[data-id="${state.selected}"]`);if(!el){bar.hidden=true;return}
  const r=el.getBoundingClientRect();bar.hidden=false;
  const width=bar.offsetWidth||330;
  let left=r.left+r.width/2-width/2;left=Math.max(96,Math.min(window.innerWidth-width-18,left));
  let top=r.top-48;if(top<76)top=r.bottom+10;
  bar.style.left=left+'px';bar.style.top=top+'px';
}
function showSelection(item){
  state.selected=item.id;
  stage.querySelectorAll('.board-item').forEach(node=>{
    const active=node.dataset.id===item.id;
    node.classList.toggle('selected',active);
    if(!active)node.querySelector('.item-delete')?.remove();
  });
  const el=stage.querySelector(`[data-id="${item.id}"]`);
  if(el&&!el.querySelector('.item-delete')){
    const del=document.createElement('button');
    del.className='item-delete';del.type='button';del.textContent='×';del.title='Remover este item';
    del.onpointerdown=ev=>ev.stopPropagation();
    del.onclick=ev=>{ev.stopPropagation();deleteItem(item.id)};
    el.appendChild(del);
  }
  requestAnimationFrame(positionFormatBar);
}
function handleItemClick(e,item){
  e.stopPropagation();
  if(state.tool==='connect'){
    if(!state.connectFrom){
      state.connectFrom=item.id;showSelection(item);showBanner('Agora clique no bloco que deseja conectar');
    }else if(state.connectFrom!==item.id){
      addConnection(state.connectFrom,item.id);state.connectFrom=null;showSelection(item);setTool('select');hideBanner();
      renderConnections();
    }
    return;
  }
  showSelection(item);
}
function addItem(type,x=280,y=210,text){
  checkpoint();
  const item={id:uid(),type,text:text||({text:'Novo texto',note:'Nova ideia',rect:'Novo bloco'}[type]||'Nova ideia'),x,y};
  current().items.push(item);state.selected=item.id;render();save();return item;
}
function addConnection(from,to,variant=''){
  if(current().connections.some(c=>c.from===from&&c.to===to))return;
  current().connections.push({id:uid(),from,to,variant});save();
}
function addChild(parent){
  checkpoint();
  const colors=['mind-blue','mind-green','mind-violet','mind-orange'];
  const siblings=current().connections.filter(c=>c.from===parent.id).length;
  const child={id:uid(),type:'mind-node',variant:colors[siblings%colors.length],text:'Nova ramificação',x:parent.x+300,y:Math.max(70,parent.y+(siblings-1.5)*120)};
  current().items.push(child);addConnection(parent.id,child.id,['','soft','violet','orange'][siblings%4]);state.selected=child.id;render();save();
  requestAnimationFrame(()=>{const el=stage.querySelector(`[data-id="${child.id}"]`);if(el)beginEdit(el,child)});
}
function createMindMap(){
  checkpoint();
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
    if(e.target.closest('.item-text,.node-plus,.item-delete')||el.classList.contains('editing')||state.tool==='connect')return;
    const r=stage.getBoundingClientRect();
    drag={dx:(e.clientX-r.left)/state.zoom-item.x,dy:(e.clientY-r.top)/state.zoom-item.y};
    moved=false;el.setPointerCapture(e.pointerId);
  };
  const handle=el.querySelector('.drag-handle');
  if(handle){
    handle.onpointerdown=e=>{
      if(state.tool==='connect')return;
      e.stopPropagation();
      const r=stage.getBoundingClientRect();
      drag={dx:(e.clientX-r.left)/state.zoom-item.x,dy:(e.clientY-r.top)/state.zoom-item.y};
      moved=false;handle.setPointerCapture(e.pointerId);
    };
    handle.onpointermove=e=>{
      if(!drag)return;moved=true;
      const r=stage.getBoundingClientRect();
      item.x=Math.max(0,(e.clientX-r.left)/state.zoom-drag.dx);item.y=Math.max(0,(e.clientY-r.top)/state.zoom-drag.dy);
      el.style.left=item.x+'px';el.style.top=item.y+'px';renderConnections();
    };
    handle.onpointerup=()=>{if(drag){drag=null;if(moved){save();render()}}};
  }
  el.onpointermove=e=>{
    if(!drag)return;moved=true;
    const r=stage.getBoundingClientRect();
    item.x=Math.max(0,(e.clientX-r.left)/state.zoom-drag.dx);item.y=Math.max(0,(e.clientY-r.top)/state.zoom-drag.dy);
    el.style.left=item.x+'px';el.style.top=item.y+'px';renderConnections();
  };
  el.onpointerup=e=>{if(drag){drag=null;if(moved){save();render()}}};
}
function deleteItem(id){
  checkpoint();
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
  checkpoint();
  state.slides.splice(i,1);
  if(state.active>=state.slides.length)state.active=state.slides.length-1;
  else if(i<state.active)state.active--;
  state.selected=null;state.connectFrom=null;render();save();
}
function clearCurrentPage(){
  if(!current().items.length)return;
  if(!confirm('Remover todos os itens e conexões desta página?'))return;
  checkpoint();
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
stage.onclick=e=>{if(e.target===stage||e.target===svg){state.selected=null;$('#formatBar').hidden=true;if(state.tool==='connect'){state.connectFrom=null;hideBanner()}render()}};
stage.oncontextmenu=e=>{
  const itemEl=e.target.closest('.board-item');
  if(!itemEl)return;
  e.preventDefault();
  const id=itemEl.dataset.id;
  if(confirm('Remover este item do quadro?'))deleteItem(id);
};


function ensureSmartTotals(){
  checkpoint();
  const existing={};
  current().items.forEach(i=>{if(i.smartMetric)existing[i.smartMetric]=i});
  const baseX=Math.max(1100,Math.round(wrap.scrollLeft/state.zoom+wrap.clientWidth/state.zoom-330));
  const baseY=Math.max(120,Math.round(wrap.scrollTop/state.zoom+120));
  let header=current().items.find(i=>String(i.text||'').trim().toUpperCase()==='RESULTADO TOTAL');
  if(!header){
    header={id:uid(),type:'mind-center',text:'RESULTADO TOTAL',x:baseX,y:baseY};
    current().items.push(header);
  }
  const defs=[
    ['casais','mind-green',baseY+180],
    ['vendas','mind-orange',baseY+350],
    ['vgv','mind-violet',baseY+520]
  ];
  defs.forEach(([metric,variant,y])=>{
    let item=existing[metric];
    if(!item){
      item={id:uid(),type:'smart-total',smartMetric:metric,text:smartLabel(metric),variant,x:baseX+40,y,bold:true};
      current().items.push(item);
    }else{
      item.type='smart-total';item.smartMetric=metric;
    }
    if(!current().connections.some(c=>c.from===header.id&&c.to===item.id)){
      current().connections.push({id:uid(),from:header.id,to:item.id,variant:metric==='casais'?'soft':metric==='vendas'?'orange':'violet'});
    }
  });
  state.selected=header.id;render();save();setTimeout(fitView,30);
}

$('#mindMapBtn').onclick=createMindMap;$('#newMindMapBtn').onclick=createMindMap;$('#emptyMapBtn').onclick=createMindMap;$('#smartTotalsBtn').onclick=ensureSmartTotals;
$('#newBlockBtn').onclick=()=>{const it=addItem('rect',300+wrap.scrollLeft/state.zoom,200+wrap.scrollTop/state.zoom);requestAnimationFrame(()=>beginEdit(stage.querySelector(`[data-id="${it.id}"]`),it))};
$('#emptyNoteBtn').onclick=()=>{const it=addItem('note',320,240);requestAnimationFrame(()=>beginEdit(stage.querySelector(`[data-id="${it.id}"]`),it))};
$('#deleteBtn').onclick=()=>{
  if(state.selected) deleteSelected();
  else clearCurrentPage();
};
function addSlide(){checkpoint();state.slides.push({id:uid(),name:`Página ${state.slides.length+1}`,items:[],connections:[]});state.active=state.slides.length-1;state.selected=null;render();save()}
$('#addSlideBtn').onclick=addSlide;$('#newPageBtn').onclick=addSlide;
function renameSlide(i){const n=prompt('Nome da página:',state.slides[i].name);if(n&&n.trim()){checkpoint();state.slides[i].name=n.trim();render();save()}}
function showBanner(msg){hideBanner();const el=document.createElement('div');el.id='connectBanner';el.className='connect-banner';el.textContent=msg;document.body.appendChild(el)}
function hideBanner(){document.querySelector('#connectBanner')?.remove()}
function togglePresent(){document.body.classList.toggle('presenting');$('#presentBtn').innerHTML=document.body.classList.contains('presenting')?'✕ <span>Sair</span>':'▶ <span>Apresentar</span>'}
$('#presentBtn').onclick=togglePresent;
document.addEventListener('keydown',e=>{
  const editing=document.activeElement?.isContentEditable;
  const mod=e.ctrlKey||e.metaKey;
  if(mod&&e.key.toLowerCase()==='z'&&!e.shiftKey&&!editing){e.preventDefault();undo();return}
  if((mod&&e.key.toLowerCase()==='y'||mod&&e.shiftKey&&e.key.toLowerCase()==='z')&&!editing){e.preventDefault();redo();return}
  if(mod&&e.key.toLowerCase()==='d'&&state.selected&&!editing){e.preventDefault();duplicateSelected();return}
  if((e.key==='Delete'||e.key==='Backspace')&&!editing&&document.activeElement!==projectName)deleteSelected();
  if(e.key==='Escape'){if(document.body.classList.contains('presenting'))togglePresent();setTool('select')}
  if(e.key==='Enter'&&state.selected&&!editing){
    const item=current().items.find(i=>i.id===state.selected),el=stage.querySelector(`[data-id="${state.selected}"]`);if(item&&el)beginEdit(el,item)
  }
});
projectName.onfocus=()=>checkpoint();
projectName.oninput=()=>{saveStatus.innerHTML='☁ <span>Salvando…</span>';clearTimeout(projectName._t);projectName._t=setTimeout(save,250)};
function applyTheme(theme){document.documentElement.dataset.theme=theme;$('#themeBtn').textContent=theme==='dark'?'☀':'☾';localStorage.setItem(THEME_KEY,theme)}
applyTheme(localStorage.getItem(THEME_KEY)||'light');$('#themeBtn').onclick=()=>applyTheme(document.documentElement.dataset.theme==='dark'?'light':'dark');
function setZoom(z){state.zoom=Math.max(.55,Math.min(1.6,z));render();setTimeout(positionFormatBar,0)}
$('#zoomIn').onclick=()=>setZoom(state.zoom+.1);$('#zoomOut').onclick=()=>setZoom(state.zoom-.1);
function fitView(){
  const items=current().items;if(!items.length){setZoom(1);wrap.scrollTo(0,0);return}
  const minX=Math.min(...items.map(i=>i.x)),minY=Math.min(...items.map(i=>i.y)),maxX=Math.max(...items.map(i=>i.x+240)),maxY=Math.max(...items.map(i=>i.y+100));
  const w=maxX-minX+160,h=maxY-minY+160;const z=Math.min(1.15,Math.max(.55,Math.min(wrap.clientWidth/w,wrap.clientHeight/h)));
  state.zoom=z;render();wrap.scrollTo(Math.max(0,minX*z-80),Math.max(0,minY*z-80));
}
$('#fitViewBtn').onclick=fitView;
wrap.addEventListener('wheel',e=>{if(e.ctrlKey){e.preventDefault();setZoom(state.zoom+(e.deltaY<0?.08:-.08))}},{passive:false});


function selectedItem(){return current().items.find(i=>i.id===state.selected)}
function updateSelectedStyle(mutator){
  const item=selectedItem();if(!item)return;checkpoint();mutator(item);render();save();
}
function duplicateSelected(){
  const item=selectedItem();if(!item)return;checkpoint();
  const copy=JSON.parse(JSON.stringify(item));copy.id=uid();copy.x+=28;copy.y+=28;
  current().items.push(copy);state.selected=copy.id;render();save();
}
$('#undoBtn').onclick=undo;$('#redoBtn').onclick=redo;
$('#formatBold').onclick=()=>updateSelectedStyle(i=>i.bold=!i.bold);
$('#fontUp').onclick=()=>updateSelectedStyle(i=>i.fontSize=Math.min(40,(i.fontSize||16)+2));
$('#fontDown').onclick=()=>updateSelectedStyle(i=>i.fontSize=Math.max(10,(i.fontSize||16)-2));
document.querySelectorAll('[data-color]').forEach(b=>b.onclick=()=>updateSelectedStyle(i=>i.color=b.dataset.color));
$('#duplicateItemBtn').onclick=duplicateSelected;
$('#deleteItemBtn').onclick=deleteSelected;
$('#connectItemBtn').onclick=()=>{if(!state.selected)return;state.connectFrom=state.selected;setTool('connect');showBanner('Clique no bloco que deseja conectar')};
window.addEventListener('resize',positionFormatBar);wrap.addEventListener('scroll',positionFormatBar,{passive:true});

function addTemplateCard(text,x,y,color){
  const item={id:uid(),type:'rect',text,x,y,color,bold:true,fontSize:16};current().items.push(item);return item;
}
function applyTemplate(type){
  checkpoint();
  current().items=[];current().connections=[];
  const cx=Math.max(420,Math.round(wrap.scrollLeft/state.zoom+wrap.clientWidth/(2*state.zoom)));
  const cy=Math.max(300,Math.round(wrap.scrollTop/state.zoom+wrap.clientHeight/(2*state.zoom)));
  if(type==='mind'){createMindMap();closeTemplates();return}
  if(type==='swot'){
    addTemplateCard('FORÇAS\nO que fazemos bem?',cx-360,cy-190,'#2d5bff');
    addTemplateCard('FRAQUEZAS\nO que precisa melhorar?',cx+40,cy-190,'#7c3aed');
    addTemplateCard('OPORTUNIDADES\nOnde podemos crescer?',cx-360,cy+40,'#10b981');
    addTemplateCard('AMEAÇAS\nO que pode nos impedir?',cx+40,cy+40,'#f59e0b');
  }else if(type==='5w2h'){
    const labels=['WHAT — O quê?','WHY — Por quê?','WHERE — Onde?','WHEN — Quando?','WHO — Quem?','HOW — Como?','HOW MUCH — Quanto?'];
    labels.forEach((t,i)=>addTemplateCard(t,cx-420+(i%3)*290,cy-210+Math.floor(i/3)*150,['#2d5bff','#7c3aed','#10b981','#f59e0b'][i%4]));
  }else if(type==='kanban'){
    ['A FAZER','EM ANDAMENTO','CONCLUÍDO'].forEach((t,i)=>{
      addTemplateCard(t,cx-430+i*320,cy-210,['#2d5bff','#f59e0b','#10b981'][i]);
      ['Nova tarefa','Nova tarefa','Nova tarefa'].forEach((v,j)=>{const n=addTemplateCard(v,cx-430+i*320,cy-120+j*110,'#ffffff');n.bold=false});
    });
  }
  state.selected=null;render();save();closeTemplates();setTimeout(fitView,30);
}
function openTemplates(){$('#templatesModal').hidden=false}
function closeTemplates(){$('#templatesModal').hidden=true}
$('#templatesBtn').onclick=openTemplates;$('#closeTemplatesBtn').onclick=closeTemplates;
document.querySelectorAll('[data-close-templates]').forEach(x=>x.onclick=closeTemplates);
document.querySelectorAll('[data-template]').forEach(x=>x.onclick=()=>applyTemplate(x.dataset.template));

$('#imageBtn').onclick=()=>$('#imageInput').click();
$('#imageInput').onchange=e=>{const f=e.target.files?.[0];if(!f)return;const reader=new FileReader();reader.onload=()=>{current().items.push({id:uid(),type:'image',src:reader.result,x:300+wrap.scrollLeft/state.zoom,y:200+wrap.scrollTop/state.zoom});render();save()};reader.readAsDataURL(f);e.target.value=''};


function renderProjects(){
  const grid=$('#projectsGrid');if(!grid)return;
  const lib=readLibrary().sort((a,b)=>(b.updatedAt||0)-(a.updatedAt||0));
  grid.innerHTML='';
  lib.forEach(p=>{
    const card=document.createElement('article');
    card.className='project-card'+(p.id===projectId?' active':'');
    const count=(p.slides||[]).reduce((n,s)=>n+(s.items?.length||0),0);
    const date=new Date(p.updatedAt||Date.now()).toLocaleString('pt-BR',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'});
    card.innerHTML=`<div class="project-card-icon">✦</div><div class="project-card-body"><strong>${esc(p.name||'Sem título')}</strong><small>${p.slides?.length||1} páginas · ${count} elementos</small><span>Atualizado ${date}</span></div><div class="project-card-actions"></div>`;
    card.onclick=()=>{loadProject(p.id);closeProjects()};
    const actions=card.querySelector('.project-card-actions');
    const dup=document.createElement('button');dup.textContent='⧉';dup.title='Duplicar';dup.onclick=e=>{e.stopPropagation();duplicateProject(p.id)};
    const del=document.createElement('button');del.textContent='×';del.title='Excluir';del.onclick=e=>{e.stopPropagation();deleteProject(p.id)};
    actions.append(dup,del);grid.appendChild(card);
  });
}
function openProjects(){renderProjects();$('#projectsModal').hidden=false}
function closeProjects(){$('#projectsModal').hidden=true}
function createProject(){
  save();
  const name=prompt('Nome do novo projeto:','Novo projeto')||'Novo projeto';
  const p=blankProject(name.trim()||'Novo projeto');const lib=readLibrary();lib.unshift(p);writeLibrary(lib);loadProject(p.id);closeProjects();
}
function duplicateProject(id=projectId){
  const lib=readLibrary();const src=lib.find(p=>p.id===id);if(!src)return;
  const copy=JSON.parse(JSON.stringify(src));copy.id=uid();copy.name=(src.name||'Projeto')+' — Cópia';copy.createdAt=Date.now();copy.updatedAt=Date.now();
  lib.unshift(copy);writeLibrary(lib);renderProjects();
}
function deleteProject(id){
  let lib=readLibrary();if(lib.length<=1){alert('Crie outro projeto antes de excluir este.');return}
  const p=lib.find(x=>x.id===id);if(!p||!confirm(`Excluir o projeto "${p.name}"?`))return;
  lib=lib.filter(x=>x.id!==id);writeLibrary(lib);
  if(id===projectId)loadProject(lib[0].id);else renderProjects();
}
function exportCurrentProject(){
  save();const p=readLibrary().find(x=>x.id===projectId);if(!p)return;
  const blob=new Blob([JSON.stringify(p,null,2)],{type:'application/json'});const url=URL.createObjectURL(blob);
  const a=document.createElement('a');a.href=url;a.download=(p.name||'board').replace(/[^a-z0-9-_]+/gi,'-')+'.board.json';a.click();URL.revokeObjectURL(url);
}
function importProject(file){
  const reader=new FileReader();reader.onload=()=>{
    try{
      const p=JSON.parse(reader.result);if(!p||!Array.isArray(p.slides))throw new Error();
      p.id=uid();p.name=(p.name||'Projeto importado');p.createdAt=Date.now();p.updatedAt=Date.now();
      const lib=readLibrary();lib.unshift(p);writeLibrary(lib);loadProject(p.id);closeProjects();
    }catch{alert('Arquivo de projeto inválido.')}
  };reader.readAsText(file);
}
$('#projectsBtn').onclick=openProjects;$('#closeProjectsBtn').onclick=closeProjects;
document.querySelectorAll('[data-close-projects]').forEach(x=>x.onclick=closeProjects);
$('#createProjectBtn').onclick=createProject;$('#duplicateProjectBtn').onclick=()=>duplicateProject(projectId);$('#exportProjectBtn').onclick=exportCurrentProject;
$('#importProjectInput').onchange=e=>{const f=e.target.files?.[0];if(f)importProject(f);e.target.value=''};

window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();deferredPrompt=e;$('#installBtn').hidden=false});
$('#installBtn').onclick=async()=>{if(!deferredPrompt)return;deferredPrompt.prompt();await deferredPrompt.userChoice;deferredPrompt=null;$('#installBtn').hidden=true};
window.addEventListener('appinstalled',()=>$('#installBtn').hidden=true);
function updateNetwork(){const on=navigator.onLine;$('#offlineStatus').textContent=on?'● Online':'○ Offline'}window.addEventListener('online',updateNetwork);window.addEventListener('offline',updateNetwork);updateNetwork();
load();