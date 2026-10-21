function pointSegmentDistance(point,segment){const dx=segment.x2-segment.x1,dy=segment.y2-segment.y1,length=dx*dx+dy*dy;if(!Number.isFinite(length)||!Number.isFinite(point.x)||!Number.isFinite(point.y))return Infinity;const t=length?Math.max(0,Math.min(1,((point.x-segment.x1)*dx+(point.y-segment.y1)*dy)/length)):0;return Math.hypot(point.x-segment.x1-t*dx,point.y-segment.y1-t*dy);}
function nearestSegment(point,segments,tolerance){let best=null,distance=tolerance;for(const segment of segments){const d=pointSegmentDistance(point,segment);if(d<distance){best=segment;distance=d;}}return best?{...best,distance}:null;}
function pickOutput(point,markers,rays){return nearestSegment(point,markers,7)||nearestSegment(point,rays,3);}
const outputKey=row=>JSON.stringify([row.plan,row.record?.stage,row.path]);
module.exports={pointSegmentDistance,pickOutput,outputKey};
