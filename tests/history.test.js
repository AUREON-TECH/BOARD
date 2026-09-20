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
  const history=createHistory({value:0},2);
  history.push({value:1});history.push({value:2});history.push({value:3});
  history.undo();history.undo();history.undo();
  assert.equal(history.current().value,1);
});
