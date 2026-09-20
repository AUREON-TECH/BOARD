import {clampZoom,screenToWorld} from './geometry.js';

export function pinchViewport(start,current){
  const anchor=screenToWorld(start.midpoint,start.viewport);
  const zoom=clampZoom(start.viewport.zoom*(current.distance/start.distance));
  return {x:current.midpoint.x-anchor.x*zoom,y:current.midpoint.y-anchor.y*zoom,zoom};
}

export const shouldStartNodeDrag=pointerCount=>pointerCount<2;
