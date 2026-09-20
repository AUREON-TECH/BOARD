import {createNode} from './model.js';

export function createMindMapTemplate(center){
  return {
    nodes:[createNode('central',{x:center.x-110,y:center.y-60})],
    edges:[],
    strokes:[]
  };
}
