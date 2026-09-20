import {createProject,createNode,createEdge,deleteNode} from './src/model.js';
import {createHistory} from './src/history.js';
import {clampZoom,screenToWorld,radialChildren,sceneBounds} from './src/geometry.js';
import {createStroke,appendPoint,eraseStrokes} from './src/drawing.js';
import {createMindMapTemplate} from './src/templates.js';
import {readStoredProject,writeStoredProject} from './src/storage.js';
import {renderScene} from './src/render.js';
import {advanceConnection} from './src/interactions.js';
import {pinchViewport,shouldStartNodeDrag} from './src/gesture.js';

const $=selector=>document.querySelector(selector);
const elements={viewport:$('#viewport'),edgeLayer:$('#edgeLayer'),drawLayer:$('#drawLayer'),nodeLayer:$('#nodeLayer')};
const stage=$('#stage'),stageWrap=$('#stageWrap'),projectName=$('#projectName'),pagesList=$('#pagesList');
let project=readStoredProject(localStorage),history=createHistory(project),tool='select',selectedNodeId=null,connectionSourceId=null;
let drag=null,pan=null,activeStroke=null,pinch=null,pinchChanged=false,pendingTouchAction=null,deferredPrompt=null;
const pointers=new Map();

const page=()=>project.pages.find(item=>item.id===project.activePageId)||project.pages[0];
const selectedNode=()=>page().nodes.find(node=>node.id===selectedNodeId)||null;
const stagePoint=event=>{const rect=stage.getBoundingClientRect();return {x:event.clientX-rect.left,y:event.clientY-rect.top};};
const worldPoint=event=>screenToWorld(stagePoint(event),project.viewport);

function save(){
  project.projectName=projectName.value.trim()||'Novo projeto';
  try{writeStoredProject(localStorage,project);$('#saveStatus').textContent='Salvo localmente';}
  catch{$('#saveStatus').textContent='Não foi possível salvar';}
}
function commit(){history.push(project);save();render();}
function restore(next){project=next;projectName.value=project.projectName;selectedNodeId=null;connectionSourceId=null;save();render();}

function render(){
  renderScene(elements,page(),{viewport:project.viewport,selectedNodeId},{onSelectNode:selectNode,onEditNode:editNode,onAddBranch:addBranch,onNodePointerDown:startNodePointer});
  $('#emptyHint').hidden=page().nodes.length>0||page().strokes.length>0;
  $('#propertyBar').hidden=!selectedNode();
  if(selectedNode()){
    $('#shapeSelect').value=selectedNode().shape;$('#fillColor').value=selectedNode().fill;$('#strokeColor').value=selectedNode().stroke;$('#textColor').value=selectedNode().textColor;
  }
  pagesList.replaceChildren();
  for(const item of project.pages){
    const card=document.createElement('div');card.className='page-thumb'+(item.id===project.activePageId?' active':'');
    const title=document.createElement('strong');title.textContent=item.name;const count=document.createElement('small');count.textContent=`${item.nodes.length} pontos`;
    card.append(title,count);card.onclick=()=>{project.activePageId=item.id;selectedNodeId=null;render();save();};pagesList.append(card);
  }
  $('#zoomLabel').textContent=`${Math.round(project.viewport.zoom*100)}%`;
  $('#undoBtn').disabled=!history.canUndo();$('#redoBtn').disabled=!history.canRedo();
}

function setTool(next){tool=next;connectionSourceId=null;document.querySelectorAll('[data-tool]').forEach(button=>button.classList.toggle('active',button.dataset.tool===tool));}
function selectNode(id){
  if(tool==='connect'){
    const next=advanceConnection(connectionSourceId,id,page().edges);connectionSourceId=next.sourceId;selectedNodeId=id;
    if(next.pair){page().edges.push(createEdge(...next.pair));commit();}else render();return;
  }
  selectedNodeId=id;render();
}
function editNode(id){const node=page().nodes.find(item=>item.id===id);if(!node)return;const text=prompt('Nome do ponto:',node.text);if(text!==null&&text.trim()){node.text=text.trim();commit();}}

function addAt(type,point){
  const node=createNode(type,point);if(type==='note'){node.type='note';node.text='Nova nota';}
  page().nodes.push(node);selectedNodeId=node.id;setTool('select');commit();
}
function addBranch(parentId){
  const parent=page().nodes.find(node=>node.id===parentId);if(!parent)return;
  const siblings=page().nodes.filter(node=>node.parentId===parentId);
  const positions=radialChildren(parent,Math.max(6,siblings.length+1),230);
  const position=positions[siblings.length%positions.length];
  const child=createNode('topic',{x:position.x-90,y:position.y-36},parentId);
  page().nodes.push(child);page().edges.push(createEdge(parentId,child.id));selectedNodeId=child.id;commit();
}

function startNodePointer(event,node){
  if(!shouldStartNodeDrag(pointers.size))return;
  if(tool==='connect'){event.stopPropagation();return;}
  if(tool!=='select')return;
  event.stopPropagation();event.preventDefault();selectedNodeId=node.id;
  const point=worldPoint(event);drag={id:node.id,dx:point.x-node.x,dy:point.y-node.y,moved:false};
  stage.setPointerCapture?.(event.pointerId);
}

stage.addEventListener('pointerdown',event=>{
  pointers.set(event.pointerId,stagePoint(event));stage.setPointerCapture?.(event.pointerId);
  if(pointers.size===2){
    const values=[...pointers.values()],midpoint={x:(values[0].x+values[1].x)/2,y:(values[0].y+values[1].y)/2};
    pinch={distance:Math.hypot(values[1].x-values[0].x,values[1].y-values[0].y),midpoint,viewport:{...project.viewport}};
    if(activeStroke)page().strokes=page().strokes.filter(stroke=>stroke.id!==activeStroke.id);
    activeStroke=null;pendingTouchAction=null;drag=null;pan=null;pinchChanged=false;
  }
},true);
stage.addEventListener('pointerdown',event=>{
  if(pointers.size>=2)return;
  if(event.target.closest('.board-node'))return;
  selectedNodeId=null;
  if(tool==='central'||tool==='topic'||tool==='note'){
    if(event.pointerType==='touch')pendingTouchAction={pointerId:event.pointerId,type:tool,point:worldPoint(event)};else addAt(tool,worldPoint(event));return;
  }
  if(tool==='hand'||(tool==='select'&&event.button===1)){pan={start:stagePoint(event),viewport:{...project.viewport}};return;}
  if(tool==='pen'){activeStroke=createStroke('#f4c95d',4,worldPoint(event));page().strokes.push(activeStroke);render();return;}
  if(tool==='eraser'){page().strokes=eraseStrokes(page().strokes,worldPoint(event),18/project.viewport.zoom);render();return;}
  render();
});
stage.addEventListener('pointermove',event=>{
  if(pointers.has(event.pointerId))pointers.set(event.pointerId,stagePoint(event));
  if(pointers.size===2&&pinch){const values=[...pointers.values()],midpoint={x:(values[0].x+values[1].x)/2,y:(values[0].y+values[1].y)/2};project.viewport=pinchViewport(pinch,{midpoint,distance:Math.hypot(values[1].x-values[0].x,values[1].y-values[0].y)});pinchChanged=true;render();return;}
  if(drag){const node=page().nodes.find(item=>item.id===drag.id);if(node){const point=worldPoint(event);node.x=Math.max(0,point.x-drag.dx);node.y=Math.max(0,point.y-drag.dy);drag.moved=true;render();}return;}
  if(pan){const point=stagePoint(event);project.viewport.x=pan.viewport.x+point.x-pan.start.x;project.viewport.y=pan.viewport.y+point.y-pan.start.y;render();return;}
  if(activeStroke){appendPoint(activeStroke,worldPoint(event));render();return;}
  if(tool==='eraser'&&event.buttons){page().strokes=eraseStrokes(page().strokes,worldPoint(event),18/project.viewport.zoom);render();}
});
function endPointer(event){
  const wasPinching=Boolean(pinch);pointers.delete(event.pointerId);if(pointers.size<2)pinch=null;
  if(pendingTouchAction?.pointerId===event.pointerId&&!wasPinching){const pending=pendingTouchAction;pendingTouchAction=null;addAt(pending.type,pending.point);return;}
  pendingTouchAction=null;const changed=(drag?.moved)||pan||activeStroke||(tool==='eraser')||(wasPinching&&pinchChanged);drag=null;pan=null;activeStroke=null;if(changed)commit();
}
stage.addEventListener('pointerup',endPointer);stage.addEventListener('pointercancel',endPointer);
stage.addEventListener('wheel',event=>{event.preventDefault();const point=stagePoint(event),before=screenToWorld(point,project.viewport);const zoom=clampZoom(project.viewport.zoom*(event.deltaY<0?1.12:.89));project.viewport.x=point.x-before.x*zoom;project.viewport.y=point.y-before.y*zoom;project.viewport.zoom=zoom;render();save();},{passive:false});

function updateSelected(key,value){const node=selectedNode();if(!node)return;node[key]=value;commit();}
$('#shapeSelect').onchange=event=>updateSelected('shape',event.target.value);$('#fillColor').oninput=event=>updateSelected('fill',event.target.value);$('#strokeColor').oninput=event=>updateSelected('stroke',event.target.value);$('#textColor').oninput=event=>updateSelected('textColor',event.target.value);$('#branchBtn').onclick=()=>selectedNodeId&&addBranch(selectedNodeId);
document.querySelectorAll('[data-tool]').forEach(button=>button.onclick=()=>setTool(button.dataset.tool));
$('#startMapBtn').onclick=()=>{Object.assign(page(),createMindMapTemplate({x:1200,y:800}));project.viewport={x:stage.clientWidth/2-1200,y:stage.clientHeight/2-800,zoom:1};selectedNodeId=page().nodes[0].id;commit();};
$('#deleteBtn').onclick=()=>{if(!selectedNodeId)return;deleteNode(page(),selectedNodeId);selectedNodeId=null;commit();};
$('#undoBtn').onclick=()=>restore(history.undo());$('#redoBtn').onclick=()=>restore(history.redo());
$('#addPageBtn').onclick=()=>{const fresh=createProject().pages[0];fresh.name=`Página ${project.pages.length+1}`;project.pages.push(fresh);project.activePageId=fresh.id;selectedNodeId=null;commit();};
$('#mobilePagesBtn').onclick=()=>$('#slidesPanel').classList.toggle('open');
projectName.oninput=()=>{project.projectName=projectName.value;$('#saveStatus').textContent='Salvando…';clearTimeout(projectName._timer);projectName._timer=setTimeout(()=>{history.push(project);save();render();},300);};
function zoomBy(factor){project.viewport.zoom=clampZoom(project.viewport.zoom*factor);render();save();}$('#zoomIn').onclick=()=>zoomBy(1.2);$('#zoomOut').onclick=()=>zoomBy(.8);
function fitScene(){const bounds=sceneBounds(page()),rect=stage.getBoundingClientRect(),padding=100;const zoom=clampZoom(Math.min((rect.width-padding)/bounds.width,(rect.height-padding)/bounds.height));project.viewport={zoom,x:(rect.width-bounds.width*zoom)/2-bounds.x*zoom,y:(rect.height-bounds.height*zoom)/2-bounds.y*zoom};render();}
$('#zoomFit').onclick=()=>{fitScene();save();};
function togglePresent(){document.body.classList.toggle('presenting');$('#exitPresentBtn').hidden=!document.body.classList.contains('presenting');$('#presentBtn').textContent=document.body.classList.contains('presenting')?'Sair':'Apresentar';if(document.body.classList.contains('presenting'))fitScene();}$('#presentBtn').onclick=togglePresent;$('#exitPresentBtn').onclick=togglePresent;
document.addEventListener('keydown',event=>{if((event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==='z'){event.preventDefault();restore(event.shiftKey?history.redo():history.undo());}if(event.key==='Delete'&&document.activeElement!==projectName)$('#deleteBtn').click();if(event.key==='Escape'&&document.body.classList.contains('presenting'))togglePresent();});

function updateNetwork(){$('#offlineStatus').textContent=navigator.onLine?'Online':'Offline';}addEventListener('online',updateNetwork);addEventListener('offline',updateNetwork);updateNetwork();
addEventListener('beforeinstallprompt',event=>{event.preventDefault();deferredPrompt=event;$('#installBtn').hidden=false;});$('#installBtn').onclick=async()=>{if(!deferredPrompt)return;deferredPrompt.prompt();await deferredPrompt.userChoice;deferredPrompt=null;$('#installBtn').hidden=true;};
if('serviceWorker'in navigator&&(location.protocol==='https:'||location.hostname==='localhost'))addEventListener('load',()=>navigator.serviceWorker.register('./sw.js?v=v2',{updateViaCache:'none'}).then(registration=>registration.update()).catch(console.error));
projectName.value=project.projectName;render();
