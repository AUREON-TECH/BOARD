const id=()=>crypto.randomUUID();

export function createStroke(color,width,point){
  return {id:id(),color,width,points:[{x:point.x,y:point.y}]};
}

export function appendPoint(stroke,point,minDistance=2){
  const previous=stroke.points.at(-1);
  if(!previous||Math.hypot(point.x-previous.x,point.y-previous.y)>=minDistance){
    stroke.points.push({x:point.x,y:point.y});
  }
  return stroke;
}

export function strokePath(points){
  return points.map((point,index)=>`${index?'L':'M'} ${point.x} ${point.y}`).join(' ');
}

export function eraseStrokes(strokes,point,radius){
  return strokes.filter(stroke=>!stroke.points.some(sample=>Math.hypot(sample.x-point.x,sample.y-point.y)<=radius));
}
