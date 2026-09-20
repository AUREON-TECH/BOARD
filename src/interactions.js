export function advanceConnection(sourceId,targetId,edges){
  if(!sourceId)return {sourceId:targetId,pair:null};
  if(sourceId===targetId)return {sourceId:null,pair:null};
  const exists=edges.some(edge=>(edge.sourceId===sourceId&&edge.targetId===targetId)||(edge.sourceId===targetId&&edge.targetId===sourceId));
  return {sourceId:null,pair:exists?null:[sourceId,targetId]};
}
