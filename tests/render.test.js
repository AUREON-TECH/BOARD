import test from 'node:test';
import assert from 'node:assert/strict';
import {nodeClass} from '../src/render.js';

test('marks selected central topics accessibly',()=>{
  assert.equal(nodeClass({type:'central',shape:'circle'},true),'board-node node-central shape-circle selected');
});
