import test from 'node:test';
import assert from 'node:assert/strict';
import {pinchViewport,shouldStartNodeDrag} from '../src/gesture.js';

test('pinch keeps the world point under the moving midpoint',()=>{
  const start={viewport:{x:20,y:30,zoom:1},midpoint:{x:100,y:100},distance:100};
  const next=pinchViewport(start,{midpoint:{x:130,y:120},distance:200});
  assert.equal(next.zoom,2);
  assert.deepEqual(next,{x:-30,y:-20,zoom:2});
});

test('second pinch pointer cannot start a node drag',()=>{
  assert.equal(shouldStartNodeDrag(1),true);
  assert.equal(shouldStartNodeDrag(2),false);
});
