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
