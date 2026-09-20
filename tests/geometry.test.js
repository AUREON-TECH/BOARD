import test from 'node:test';
import assert from 'node:assert/strict';
import {clampZoom,screenToWorld,edgePath,radialChildren} from '../src/geometry.js';

test('clamps zoom from 25% through 250%',()=>{
  assert.equal(clampZoom(.1),.25);
  assert.equal(clampZoom(3),2.5);
});

test('uses a safe zoom for nonfinite input',()=>{
  assert.equal(clampZoom(Number.NaN),1);
  assert.equal(clampZoom(Number.POSITIVE_INFINITY),1);
});

test('converts screen coordinates after pan and zoom',()=>{
  assert.deepEqual(screenToWorld({x:300,y:220},{x:100,y:20,zoom:2}),{x:100,y:100});
});

test('builds a connector between node borders',()=>{
  const path=edgePath({x:0,y:0,width:100,height:60},{x:300,y:0,width:100,height:60});
  assert.match(path,/^M 100 30 C /);
  assert.match(path,/ 300 30$/);
});

test('distributes children without overlapping angles',()=>{
  const points=radialChildren({x:500,y:500,width:200,height:100},4,200);
  assert.equal(new Set(points.map(p=>p.x+','+p.y)).size,4);
});
