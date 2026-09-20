# BOARD Mapa Mental Estratégico Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transformar o BOARD atual em um editor estratégico com mapa mental, conexões automáticas e manuais, desenho livre, zoom, histórico e compatibilidade offline.

**Architecture:** Manter o aplicativo estático e sem framework, dividindo o monólito atual em módulos ES responsáveis por modelo, histórico, geometria, interação e renderização. SVG será usado para conectores e traços, enquanto os pontos continuarão como elementos HTML posicionados no canvas transformável.

**Tech Stack:** HTML5, CSS3, JavaScript ES Modules, SVG, Pointer Events, LocalStorage, Service Worker e `node:test`.

**Spec:** `docs/superpowers/specs/2026-09-20-mapa-mental-estrategico-design.md`

## Global Constraints

- Manter instalação PWA e funcionamento offline.
- Preservar e migrar projetos existentes salvos em `board.project.v1`.
- Não apagar projetos atuais quando a nova versão for aberta.
- Suportar desktop e Galaxy A14 com toque.
- Manter o tema azul-escuro atual do BOARD.
- Salvar páginas, pontos, conexões, desenhos, zoom e posição do canvas.
- Conexões devem acompanhar os pontos durante a movimentação.
- A primeira entrega não inclui colaboração, contas, IA ou sincronização em nuvem.

## Review Focus

- LocalStorage vazio, inválido ou parcialmente corrompido deve abrir um projeto utilizável sem apagar silenciosamente uma cópia válida.
- Excluir um ponto com ramificações deve remover somente as conexões associadas, preservando os demais pontos.
- Dois dedos no celular devem controlar zoom/deslocamento e nunca criar pontos ou traços acidentais.
- Zoom mínimo e máximo devem manter o canvas acessível e as coordenadas corretas.
- Reabrir um projeto antigo deve conservar todas as páginas e itens existentes.

---

### Task 1: Modelo versionado e migração segura

**Files:**
- Create: `package.json`
- Create: `src/model.js`
- Create: `tests/model.test.js`
- Modify: `app.js`

**Interfaces:**
- Produces: `createProject()`, `loadProject(raw)`, `serializeProject(project)`, `createNode(type, point, parentId)`, `createEdge(sourceId, targetId)`, `deleteNode(page, nodeId)`.
- Project shape: `{version:2, projectName, pages, activePageId, viewport}`.
- Page shape: `{id,name,nodes,edges,strokes}`.

- [ ] **Step 1: Add the built-in test command**

```json
{
  "name": "aureon-board",
  "private": true,
  "type": "module",
  "scripts": {
    "test": "node --test",
    "check": "node --check app.js && node --check src/model.js"
  }
}
```

- [ ] **Step 2: Write failing model and migration tests**

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createProject, loadProject, createNode, createEdge, deleteNode
} from '../src/model.js';

test('creates a usable version 2 project', () => {
  const project = createProject();
  assert.equal(project.version, 2);
  assert.equal(project.pages.length, 1);
  assert.deepEqual(project.pages[0].edges, []);
  assert.deepEqual(project.pages[0].strokes, []);
});

test('migrates every legacy slide and item', () => {
  const legacy = JSON.stringify({
    projectName: 'Estratégia',
    active: 1,
    slides: [
      {id:'p1',name:'Página 1',items:[{id:'n1',type:'rect',text:'Meta',x:20,y:30}]},
      {id:'p2',name:'Página 2',items:[]}
    ]
  });
  const project = loadProject(legacy);
  assert.equal(project.pages.length, 2);
  assert.equal(project.activePageId, 'p2');
  assert.equal(project.pages[0].nodes[0].text, 'Meta');
});

test('falls back safely for malformed storage', () => {
  assert.equal(loadProject('{broken').version, 2);
  assert.equal(loadProject(null).pages.length, 1);
});

test('deleting a node removes only attached edges', () => {
  const page = {nodes:[],edges:[],strokes:[]};
  const a=createNode('topic',{x:0,y:0});
  const b=createNode('topic',{x:100,y:0});
  const c=createNode('topic',{x:200,y:0});
  page.nodes.push(a,b,c);
  page.edges.push(createEdge(a.id,b.id),createEdge(b.id,c.id));
  deleteNode(page,b.id);
  assert.deepEqual(page.nodes.map(n=>n.id),[a.id,c.id]);
  assert.equal(page.edges.length,0);
});
```

- [ ] **Step 3: Run tests and confirm failure**

Run: `npm test`  
Expected: FAIL because `src/model.js` does not exist.

- [ ] **Step 4: Implement the versioned model**

Implement exact defaults and guards:

```js
export const PROJECT_VERSION=2;
const id=()=>crypto.randomUUID();

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
    x,y,width:type==='central'?220:180,height:type==='central'?120:72,
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

export function loadProject(raw){
  if(!raw)return createProject();
  try{
    const value=typeof raw==='string'?JSON.parse(raw):raw;
    if(value?.version===2&&Array.isArray(value.pages))return normalize(value);
    if(Array.isArray(value?.slides))return migrateLegacy(value);
  }catch{}
  return createProject();
}

export function serializeProject(project){return JSON.stringify(normalize(project));}
```

Add `normalize` and `migrateLegacy` so every legacy slide becomes a page, every item becomes a node, and invalid arrays become empty arrays.

- [ ] **Step 5: Run tests and static checks**

Run: `npm test && npm run check`  
Expected: all tests PASS and both JavaScript files parse.

- [ ] **Step 6: Commit**

```bash
git add package.json src/model.js tests/model.test.js app.js
git commit -m "feat: add versioned board project model"
```

### Task 2: Undo and redo history

**Files:**
- Create: `src/history.js`
- Create: `tests/history.test.js`
- Modify: `app.js`

**Interfaces:**
- Consumes: serializable version 2 projects.
- Produces: `createHistory(initial, limit=50)` returning `{current, push, undo, redo, canUndo, canRedo}`.

- [ ] **Step 1: Write failing history tests**

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import {createHistory} from '../src/history.js';

test('undoes and redoes independent snapshots',()=>{
  const history=createHistory({value:1});
  history.push({value:2});
  assert.equal(history.undo().value,1);
  assert.equal(history.redo().value,2);
});

test('new action after undo clears redo',()=>{
  const history=createHistory({value:1});
  history.push({value:2});
  history.undo();
  history.push({value:3});
  assert.equal(history.canRedo(),false);
});

test('limits retained snapshots',()=>{
  const history=createHistory({value:0},3);
  history.push({value:1});history.push({value:2});history.push({value:3});
  history.undo();history.undo();history.undo();
  assert.equal(history.current().value,1);
});
```

- [ ] **Step 2: Run the focused test**

Run: `node --test tests/history.test.js`  
Expected: FAIL because `src/history.js` does not exist.

- [ ] **Step 3: Implement immutable snapshots**

```js
const clone=value=>structuredClone(value);

export function createHistory(initial,limit=50){
  let past=[],present=clone(initial),future=[];
  return {
    current:()=>clone(present),
    push(next){past.push(clone(present));past=past.slice(-limit);present=clone(next);future=[];return this.current()},
    undo(){if(!past.length)return this.current();future.unshift(clone(present));present=past.pop();return this.current()},
    redo(){if(!future.length)return this.current();past.push(clone(present));present=future.shift();return this.current()},
    canUndo:()=>past.length>0,
    canRedo:()=>future.length>0
  };
}
```

Wire history pushes to completed mutations only: create, delete, edit, connect, finish drag, finish stroke, recolor, reorganize.

- [ ] **Step 4: Run tests**

Run: `npm test`  
Expected: all model and history tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/history.js tests/history.test.js app.js
git commit -m "feat: add undo and redo history"
```

### Task 3: Geometry, zoom, connections and radial layout

**Files:**
- Create: `src/geometry.js`
- Create: `tests/geometry.test.js`
- Modify: `app.js`

**Interfaces:**
- Produces: `clampZoom(value)`, `screenToWorld(point, viewport)`, `edgePath(source,target)`, `radialChildren(parent,count,radius=220)`.

- [ ] **Step 1: Write failing geometry tests**

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import {clampZoom,screenToWorld,edgePath,radialChildren} from '../src/geometry.js';

test('clamps zoom from 25% through 250%',()=>{
  assert.equal(clampZoom(.1),.25);
  assert.equal(clampZoom(3),2.5);
});

test('converts screen coordinates after pan and zoom',()=>{
  assert.deepEqual(screenToWorld({x:300,y:220},{x:100,y:20,zoom:2}),{x:100,y:100});
});

test('builds a connector between node borders',()=>{
  const path=edgePath(
    {x:0,y:0,width:100,height:60},
    {x:300,y:0,width:100,height:60}
  );
  assert.match(path,/^M 100 30 C /);
  assert.match(path,/ 300 30$/);
});

test('distributes children without overlapping angles',()=>{
  const points=radialChildren({x:500,y:500,width:200,height:100},4,200);
  assert.equal(new Set(points.map(p=>p.x+','+p.y)).size,4);
});
```

- [ ] **Step 2: Run the focused test**

Run: `node --test tests/geometry.test.js`  
Expected: FAIL because geometry exports do not exist.

- [ ] **Step 3: Implement geometry**

Use `Math.min(2.5,Math.max(.25,value))` for zoom. Convert coordinates with `(point.x-viewport.x)/viewport.zoom`. Generate cubic SVG paths from the nearest horizontal node borders. Distribute radial child centers with `angle=(Math.PI*2*index/count)-Math.PI/2`.

- [ ] **Step 4: Wire viewport controls**

Add wheel zoom centered under the cursor, `+`, `−`, “Ajustar”, a hand tool, and two-pointer pinch. Store `viewport:{x,y,zoom}` and update `#zoomLabel`. Suppress node creation and drawing while two or more active pointers exist.

- [ ] **Step 5: Wire automatic and manual connections**

When `+ Ramificação` is pressed, create a child node at the next radial position and an edge from selected node to child. In connector mode, first tap stores the source and second tap creates the edge after confirming both IDs still exist.

- [ ] **Step 6: Run tests and checks**

Run: `npm test && npm run check`  
Expected: all tests PASS.

- [ ] **Step 7: Commit**

```bash
git add src/geometry.js tests/geometry.test.js app.js
git commit -m "feat: add board viewport and mind map geometry"
```

### Task 4: Layered renderer and editable topics

**Files:**
- Create: `src/render.js`
- Create: `tests/render.test.js`
- Modify: `index.html`
- Modify: `styles.css`
- Modify: `app.js`

**Interfaces:**
- Consumes: page `nodes`, `edges`, `strokes`, viewport and selected IDs.
- Produces: `renderScene(elements, page, uiState)` and `nodeClass(node,selected)`.

- [ ] **Step 1: Write the renderer classification test**

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import {nodeClass} from '../src/render.js';

test('marks selected central topics accessibly',()=>{
  assert.equal(
    nodeClass({type:'central',shape:'circle'},true),
    'board-node node-central shape-circle selected'
  );
});
```

- [ ] **Step 2: Run the focused test**

Run: `node --test tests/render.test.js`  
Expected: FAIL because `src/render.js` does not exist.

- [ ] **Step 3: Add scene layers**

Inside `#stage`, render:

```html
<div id="viewport">
  <svg id="edgeLayer" aria-hidden="true"></svg>
  <svg id="drawLayer" aria-label="Desenhos"></svg>
  <div id="nodeLayer" aria-label="Pontos do mapa"></div>
</div>
```

Change `app.js` to `<script type="module" src="app.js"></script>`.

- [ ] **Step 4: Implement renderScene**

Use `textContent` for all user text. Render edges before nodes. Apply one CSS transform to `#viewport`: `translate(xpx, ypx) scale(zoom)` with origin `0 0`. Provide buttons on the selected node for “+ Ramificação” and “Conectar”. Double-click or double-tap opens an inline `textarea`, committing on blur or Ctrl+Enter.

- [ ] **Step 5: Add shapes and properties**

Add a compact property bar with shape, fill color, border color and text color controls. CSS must support `.shape-circle`, `.shape-rounded`, `.shape-rect` and selection handles. Ensure touch targets are at least 44px.

- [ ] **Step 6: Run tests and checks**

Run: `npm test && npm run check`  
Expected: all tests PASS.

- [ ] **Step 7: Commit**

```bash
git add src/render.js tests/render.test.js index.html styles.css app.js
git commit -m "feat: render editable mind map topics"
```

### Task 5: Freehand drawing and eraser

**Files:**
- Create: `src/drawing.js`
- Create: `tests/drawing.test.js`
- Modify: `app.js`
- Modify: `styles.css`

**Interfaces:**
- Produces: `createStroke(color,width,point)`, `appendPoint(stroke,point,minDistance=2)`, `strokePath(points)`, `eraseStrokes(strokes,point,radius)`.

- [ ] **Step 1: Write failing drawing tests**

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import {createStroke,appendPoint,strokePath,eraseStrokes} from '../src/drawing.js';

test('ignores noisy adjacent pointer samples',()=>{
  const stroke=createStroke('#fff',4,{x:0,y:0});
  appendPoint(stroke,{x:1,y:1},3);
  appendPoint(stroke,{x:10,y:0},3);
  assert.equal(stroke.points.length,2);
});

test('creates a stable svg path',()=>{
  assert.equal(strokePath([{x:0,y:0},{x:10,y:5}]),'M 0 0 L 10 5');
});

test('eraser removes only strokes inside radius',()=>{
  const near={id:'a',points:[{x:10,y:10}]};
  const far={id:'b',points:[{x:200,y:200}]};
  assert.deepEqual(eraseStrokes([near,far],{x:12,y:12},10).map(s=>s.id),['b']);
});
```

- [ ] **Step 2: Run the focused test**

Run: `node --test tests/drawing.test.js`  
Expected: FAIL because drawing exports do not exist.

- [ ] **Step 3: Implement stroke functions**

Store `{id,color,width,points}`. Append a sample only when Euclidean distance from the previous point meets `minDistance`. Build SVG `M/L` paths. Erase a whole stroke when any sampled point is inside the eraser radius.

- [ ] **Step 4: Wire pointer drawing**

In pen mode, pointer down starts one stroke, pointer move appends world coordinates, pointer up pushes one history snapshot and saves. In eraser mode, remove touched strokes. Set `touch-action:none` only on the interactive stage, and never draw while pinch state is active.

- [ ] **Step 5: Run tests**

Run: `npm test`  
Expected: all tests PASS.

- [ ] **Step 6: Commit**

```bash
git add src/drawing.js tests/drawing.test.js app.js styles.css
git commit -m "feat: add freehand drawing and eraser"
```

### Task 6: Responsive toolbar, templates and presentation

**Files:**
- Modify: `index.html`
- Modify: `styles.css`
- Modify: `app.js`
- Create: `tests/templates.test.js`
- Create: `src/templates.js`

**Interfaces:**
- Produces: `createMindMapTemplate(center)` returning a page fragment with one central node.

- [ ] **Step 1: Write the template test**

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import {createMindMapTemplate} from '../src/templates.js';

test('creates one centered main idea',()=>{
  const result=createMindMapTemplate({x:600,y:400});
  assert.equal(result.nodes.length,1);
  assert.equal(result.nodes[0].type,'central');
  assert.equal(result.edges.length,0);
  assert.equal(result.strokes.length,0);
});
```

- [ ] **Step 2: Run the focused test**

Run: `node --test tests/templates.test.js`  
Expected: FAIL because templates export does not exist.

- [ ] **Step 3: Implement template creation**

Return `{nodes:[createNode('central',{x:center.x-110,y:center.y-60})],edges:[],strokes:[]}`.

- [ ] **Step 4: Redesign controls without removing existing features**

Group toolbar actions into “Mover”, “Ideias”, “Formas”, “Conectar” and “Desenhar”. Add labels through accessible tooltips. On screens under 900px, move tools to a horizontally scrollable bottom bar and expose pages through a sheet button. Preserve Install and Present buttons.

- [ ] **Step 5: Complete presentation mode**

Fit all scene content into the viewport when presentation starts, hide editing controls, retain a visible “Sair” action on touch devices, and restore the prior viewport on exit.

- [ ] **Step 6: Verify responsive behavior manually**

Run: `python3 -m http.server 4173`.  
Check at 1920×1080 and 360×800:

- create a central idea;
- add three automatic branches;
- manually connect two points;
- pan and zoom;
- draw and erase;
- edit colors and names;
- undo and redo;
- enter and exit presentation.

Expected: no control blocks the canvas; every primary action is reachable with mouse and touch emulation.

- [ ] **Step 7: Run automated checks**

Run: `npm test && npm run check`  
Expected: all tests PASS.

- [ ] **Step 8: Commit**

```bash
git add index.html styles.css app.js src/templates.js tests/templates.test.js
git commit -m "feat: complete responsive strategic canvas"
```

### Task 7: Offline update, persistence verification and release

**Files:**
- Modify: `sw.js`
- Modify: `offline.html`
- Modify: `index.html`
- Create: `tests/storage.test.js`
- Create: `src/storage.js`

**Interfaces:**
- Produces: `readStoredProject(storage)` and `writeStoredProject(storage,project)`.
- Uses keys `board.project.v2` and legacy `board.project.v1`.

- [ ] **Step 1: Write persistence tests**

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import {readStoredProject,writeStoredProject} from '../src/storage.js';
import {createProject} from '../src/model.js';

function memoryStorage(seed={}){
  const data=new Map(Object.entries(seed));
  return {getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v),data};
}

test('prefers v2 and retains legacy backup',()=>{
  const legacy=JSON.stringify({projectName:'Antigo',slides:[{id:'p',name:'P',items:[]}],active:0});
  const storage=memoryStorage({'board.project.v1':legacy});
  const project=readStoredProject(storage);
  writeStoredProject(storage,project);
  assert.equal(storage.getItem('board.project.v1'),legacy);
  assert.equal(JSON.parse(storage.getItem('board.project.v2')).version,2);
});

test('round trips viewport and drawing',()=>{
  const storage=memoryStorage();
  const project=createProject();
  project.viewport={x:80,y:-20,zoom:1.5};
  project.pages[0].strokes=[{id:'s',color:'#fff',width:4,points:[{x:1,y:2}]}];
  writeStoredProject(storage,project);
  const restored=readStoredProject(storage);
  assert.deepEqual(restored.viewport,project.viewport);
  assert.equal(restored.pages[0].strokes.length,1);
});
```

- [ ] **Step 2: Run the focused test**

Run: `node --test tests/storage.test.js`  
Expected: FAIL because storage exports do not exist.

- [ ] **Step 3: Implement safe persistence**

Read v2 first, otherwise migrate v1 through `loadProject`. Write only v2 and never delete v1. On quota failure, keep the current in-memory project, set status to “Não foi possível salvar” and avoid replacing valid storage.

- [ ] **Step 4: Update the offline shell**

Bump `CACHE_VERSION` from `v1` to `v2`. Add every `src/*.js` module to `SHELL`. Keep private-path protections unchanged. Add a cache-busting service-worker registration query `?v=v2`.

- [ ] **Step 5: Run complete verification**

Run:

```bash
npm test
npm run check
git diff --check
```

Expected: all tests PASS, parse checks PASS, and no whitespace errors.

- [ ] **Step 6: Browser verification**

Serve with `python3 -m http.server 4173`, create a named multi-page project, add nodes, edges and a stroke, refresh, switch offline in browser tools and refresh again.

Expected: content, page selection and viewport persist; app shell loads offline; legacy storage remains present.

- [ ] **Step 7: Commit**

```bash
git add sw.js offline.html index.html src/storage.js tests/storage.test.js
git commit -m "feat: persist and cache complete board projects"
```

### Task 8: Final user-flow verification

**Files:**
- Modify only files required by defects found during this task.

**Interfaces:**
- Consumes the complete BOARD implementation.
- Produces a verified release candidate with no known blocker in the primary user flow.

- [ ] **Step 1: Run the full automated suite**

Run: `npm test && npm run check && git diff --check`  
Expected: all commands exit 0.

- [ ] **Step 2: Verify the complete desktop story**

At 1920×1080, create “Estratégia Captação”, add one central idea, four branches, two sub-branches, one manual cross-connection and one freehand highlight. Rename and recolor nodes, undo twice, redo twice, present, exit and refresh.

Expected: all content returns in the same logical state and connectors remain attached.

- [ ] **Step 3: Verify the complete Galaxy A14 story**

At a 360×800 mobile viewport with touch emulation, pan with the hand tool, pinch from 100% to approximately 150%, add a branch, draw a stroke and open the pages sheet.

Expected: no accidental node or stroke during pinch; primary controls remain reachable; text remains legible.

- [ ] **Step 4: Verify migration and offline story**

Seed `board.project.v1` with two pages and several legacy items, reload, confirm both pages, then disable network and reload.

Expected: migrated content remains, `board.project.v1` is untouched, and the app works offline.

- [ ] **Step 5: Fix only observed blockers and rerun affected checks**

For each observed blocker, first add the smallest regression test to the owning test file, run it to see failure, apply the smallest fix, then rerun that test and the full suite.

- [ ] **Step 6: Commit the verified release candidate**

```bash
git add .
git commit -m "fix: verify board mind map user flows"
```
