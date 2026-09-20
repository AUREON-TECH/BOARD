import test from 'node:test';
import assert from 'node:assert/strict';
import {advanceConnection} from '../src/interactions.js';

test('first point starts and second point completes a connection',()=>{
  const started=advanceConnection(null,'a',[]);
  assert.deepEqual(started,{sourceId:'a',pair:null});
  const completed=advanceConnection(started.sourceId,'b',[]);
  assert.deepEqual(completed,{sourceId:null,pair:['a','b']});
});

test('reselecting the source cancels without creating an edge',()=>{
  assert.deepEqual(advanceConnection('a','a',[]),{sourceId:null,pair:null});
});

test('does not duplicate an existing connection',()=>{
  const edges=[{sourceId:'a',targetId:'b'}];
  assert.deepEqual(advanceConnection('a','b',edges),{sourceId:null,pair:null});
});
