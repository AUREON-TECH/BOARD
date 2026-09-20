export const PROJECT_VERSION=2;
const id=()=>crypto.randomUUID();

const safeNumber=(value,fallback)=>Number.isFinite(value)?value:fallback;

export function createProject(){
  const page={id:id(),name:'Página 1',nodes:[],edges:[],strokes:[]};
  return {
    version:PROJECT_VERSION,
    projectName:'Novo projeto',
    pages:[page],
    activePageId:page.id,
    viewport:{x:0,y:0,zoom:1}
  };
}

export function createNode(type,{x,y},parentId=null){
  return {
    id:id(),type,text:type==='central'?'Ideia principal':'Nova ideia',
    x:safeNumber(x,0),y:safeNumber(y,0),
    width:type==='central'?220:180,height:type==='central'?120:72,
    shape:type==='central'?'circle':'rounded',
    fill:type==='central'?'#6f8cff':'#15213d',
    stroke:'#89a0ff',textColor:'#ffffff',parentId
  };
}

export function createEdge(sourceId,targetId){
  return {id:id(),sourceId,targetId,directed:false,color:'#8093bd',width:2};
}

export function deleteNode(page,nodeId){
  page.nodes=page.nodes.filter(node=>node.id!==nodeId);
  page.edges=page.edges.filter(edge=>edge.sourceId!==nodeId&&edge.targetId!==nodeId);
}

function normalizeNode(node){
  const base=createNode(node?.type||'topic',{x:node?.x,y:node?.y},node?.parentId??null);
  return {
    ...base,...node,
    id:typeof node?.id==='string'?node.id:base.id,
    text:typeof node?.text==='string'?node.text:base.text,
    x:safeNumber(node?.x,0),y:safeNumber(node?.y,0),
    width:safeNumber(node?.width,base.width),height:safeNumber(node?.height,base.height)
  };
}

function normalizePage(page,index){
  return {
    id:typeof page?.id==='string'?page.id:id(),
    name:typeof page?.name==='string'?page.name:`Página ${index+1}`,
    nodes:Array.isArray(page?.nodes)?page.nodes.map(normalizeNode):[],
    edges:Array.isArray(page?.edges)?page.edges.filter(Boolean):[],
    strokes:Array.isArray(page?.strokes)?page.strokes.filter(stroke=>stroke&&Array.isArray(stroke.points)&&stroke.points.length>0&&stroke.points.every(point=>Number.isFinite(point?.x)&&Number.isFinite(point?.y))).map(stroke=>({id:typeof stroke.id==='string'?stroke.id:id(),color:typeof stroke.color==='string'?stroke.color:'#ffffff',width:Number.isFinite(stroke.width)?stroke.width:4,points:stroke.points.map(point=>({x:point.x,y:point.y}))})):[]
  };
}

function normalize(project){
  const fallback=createProject();
  const pages=Array.isArray(project?.pages)&&project.pages.length
    ?project.pages.map(normalizePage)
    :fallback.pages;
  const activePageId=pages.some(page=>page.id===project?.activePageId)
    ?project.activePageId
    :pages[0].id;
  return {
    version:PROJECT_VERSION,
    projectName:typeof project?.projectName==='string'?project.projectName:'Novo projeto',
    pages,activePageId,
    viewport:{
      x:safeNumber(project?.viewport?.x,0),
      y:safeNumber(project?.viewport?.y,0),
      zoom:Math.min(2.5,Math.max(.25,safeNumber(project?.viewport?.zoom,1)))
    }
  };
}

function migrateLegacy(value){
  const pages=value.slides.map((slide,index)=>({
    id:typeof slide?.id==='string'?slide.id:id(),
    name:typeof slide?.name==='string'?slide.name:`Página ${index+1}`,
    nodes:(Array.isArray(slide?.items)?slide.items:[]).map(item=>normalizeNode({
      ...item,
      type:item?.type==='rect'?'topic':item?.type||'topic',
      shape:item?.type==='rect'?'rect':item?.shape
    })),
    edges:[],strokes:[]
  }));
  const safePages=pages.length?pages:[normalizePage(null,0)];
  const activeIndex=Math.min(Math.max(Number(value.active)||0,0),safePages.length-1);
  return normalize({
    version:PROJECT_VERSION,
    projectName:value.projectName,
    pages:safePages,
    activePageId:safePages[activeIndex].id,
    viewport:{x:0,y:0,zoom:1}
  });
}

export function loadProject(raw){
  if(!raw)return createProject();
  try{
    const value=typeof raw==='string'?JSON.parse(raw):raw;
    if(value?.version===PROJECT_VERSION&&Array.isArray(value.pages))return normalize(value);
    if(Array.isArray(value?.slides))return migrateLegacy(value);
  }catch{}
  return createProject();
}

export function serializeProject(project){return JSON.stringify(normalize(project));}
