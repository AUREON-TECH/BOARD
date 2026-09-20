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

test('discards malformed strokes and clamps unsafe persisted zoom',()=>{
  const project=loadProject({version:2,projectName:'Seguro',activePageId:'p',viewport:{x:0,y:0,zoom:0},pages:[{id:'p',name:'P',nodes:[],edges:[],strokes:[{id:'bad'},{id:'ok',color:'#fff',width:4,points:[{x:1,y:2}]}]}]});
  assert.equal(project.viewport.zoom,.25);
  assert.equal(project.pages[0].strokes.length,1);
  assert.equal(project.pages[0].strokes[0].id,'ok');
});
