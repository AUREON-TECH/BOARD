import test from 'node:test';
import assert from 'node:assert/strict';
import {readStoredProject,writeStoredProject} from '../src/storage.js';
import {createProject} from '../src/model.js';

function memoryStorage(seed={}){
  const data=new Map(Object.entries(seed));
  return {getItem:key=>data.get(key)??null,setItem:(key,value)=>data.set(key,value),data};
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

test('falls back to valid legacy data when v2 is corrupt',()=>{
  const legacy=JSON.stringify({projectName:'Recuperado',slides:[{id:'p1',name:'P1',items:[]},{id:'p2',name:'P2',items:[]}],active:1});
  const storage=memoryStorage({'board.project.v2':'{broken','board.project.v1':legacy});
  const project=readStoredProject(storage);
  assert.equal(project.projectName,'Recuperado');
  assert.equal(project.pages.length,2);
});
