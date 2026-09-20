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
