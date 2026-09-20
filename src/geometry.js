export const clampZoom=value=>Number.isFinite(value)?Math.min(2.5,Math.max(.25,value)):1;

export function screenToWorld(point,viewport){
  return {
    x:(point.x-viewport.x)/viewport.zoom,
    y:(point.y-viewport.y)/viewport.zoom
  };
}

export function edgePath(source,target){
  const sourceCenter={x:source.x+source.width/2,y:source.y+source.height/2};
  const targetCenter={x:target.x+target.width/2,y:target.y+target.height/2};
  const horizontal=Math.abs(targetCenter.x-sourceCenter.x)>=Math.abs(targetCenter.y-sourceCenter.y);
  let start,end;
  if(horizontal){
    const right=targetCenter.x>=sourceCenter.x;
    start={x:right?source.x+source.width:source.x,y:sourceCenter.y};
    end={x:right?target.x:target.x+target.width,y:targetCenter.y};
  }else{
    const down=targetCenter.y>=sourceCenter.y;
    start={x:sourceCenter.x,y:down?source.y+source.height:source.y};
    end={x:targetCenter.x,y:down?target.y:target.y+target.height};
  }
  if(horizontal){
    const middle=(start.x+end.x)/2;
    return `M ${start.x} ${start.y} C ${middle} ${start.y}, ${middle} ${end.y}, ${end.x} ${end.y}`;
  }
  const middle=(start.y+end.y)/2;
  return `M ${start.x} ${start.y} C ${start.x} ${middle}, ${end.x} ${middle}, ${end.x} ${end.y}`;
}

export function radialChildren(parent,count,radius=220){
  if(count<=0)return [];
  const center={x:parent.x+parent.width/2,y:parent.y+parent.height/2};
  return Array.from({length:count},(_,index)=>{
    const angle=Math.PI*2*index/count-Math.PI/2;
    return {x:center.x+Math.cos(angle)*radius,y:center.y+Math.sin(angle)*radius};
  });
}

export function sceneBounds(page){
  const nodes=page?.nodes||[];
  const points=nodes.flatMap(node=>[
    {x:node.x,y:node.y},{x:node.x+node.width,y:node.y+node.height}
  ]);
  for(const stroke of page?.strokes||[])points.push(...stroke.points);
  if(!points.length)return {x:0,y:0,width:1200,height:800};
  const xs=points.map(p=>p.x),ys=points.map(p=>p.y);
  const minX=Math.min(...xs),maxX=Math.max(...xs),minY=Math.min(...ys),maxY=Math.max(...ys);
  return {x:minX,y:minY,width:Math.max(1,maxX-minX),height:Math.max(1,maxY-minY)};
}
