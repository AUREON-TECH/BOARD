import {edgePath} from './geometry.js';
import {strokePath} from './drawing.js';

const SVG_NS='http://www.w3.org/2000/svg';
let lastActivation={id:null,time:0};

export function nodeClass(node,selected){
  return `board-node node-${node.type} shape-${node.shape}${selected?' selected':''}`;
}

function svgElement(name,attributes={}){
  const element=document.createElementNS(SVG_NS,name);
  for(const [key,value] of Object.entries(attributes))element.setAttribute(key,value);
  return element;
}

export function renderScene(elements,page,uiState,handlers={}){
  const {viewport,edgeLayer,drawLayer,nodeLayer}=elements;
  viewport.style.transform=`translate(${uiState.viewport.x}px,${uiState.viewport.y}px) scale(${uiState.viewport.zoom})`;
  edgeLayer.replaceChildren();
  drawLayer.replaceChildren();
  nodeLayer.replaceChildren();

  const byId=new Map(page.nodes.map(node=>[node.id,node]));
  for(const edge of page.edges){
    const source=byId.get(edge.sourceId),target=byId.get(edge.targetId);
    if(!source||!target)continue;
    const path=svgElement('path',{d:edgePath(source,target),stroke:edge.color||'#8093bd','stroke-width':edge.width||2,fill:'none','marker-end':edge.directed?'url(#arrowHead)':''});
    path.classList.add('edge-path');
    edgeLayer.append(path);
  }
  for(const stroke of page.strokes){
    drawLayer.append(svgElement('path',{d:strokePath(stroke.points),stroke:stroke.color,'stroke-width':stroke.width,fill:'none','stroke-linecap':'round','stroke-linejoin':'round'}));
  }
  for(const node of page.nodes){
    const element=document.createElement('article');
    element.className=nodeClass(node,uiState.selectedNodeId===node.id);
    element.dataset.id=node.id;
    element.style.cssText=`left:${node.x}px;top:${node.y}px;width:${node.width}px;height:${node.height}px;background:${node.fill};border-color:${node.stroke};color:${node.textColor}`;
    element.tabIndex=0;
    element.setAttribute('role','button');
    element.setAttribute('aria-label',node.text);
    const label=document.createElement('span');
    label.className='node-label';
    label.textContent=node.text;
    element.append(label);
    if(uiState.selectedNodeId===node.id){
      const add=document.createElement('button');
      add.className='node-add';add.type='button';add.textContent='+';add.title='Nova ramificação';
      add.addEventListener('pointerdown',event=>event.stopPropagation());
      add.addEventListener('click',event=>{event.stopPropagation();handlers.onAddBranch?.(node.id);});
      element.append(add);
    }
    element.addEventListener('pointerdown',event=>handlers.onNodePointerDown?.(event,node));
    element.addEventListener('click',event=>{event.stopPropagation();const now=Date.now();if(lastActivation.id===node.id&&now-lastActivation.time<450)handlers.onEditNode?.(node.id);else handlers.onSelectNode?.(node.id);lastActivation={id:node.id,time:now};});
    element.addEventListener('dblclick',event=>{event.stopPropagation();handlers.onEditNode?.(node.id);});
    nodeLayer.append(element);
  }
}
