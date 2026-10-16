import {projectProduct} from './perspective.mjs';
const clamp=value=>Math.max(0,Math.min(1,value));
const mix=(a,b,t)=>a+(b-a)*t;
// Zero velocity and acceleration at either end, without spring overshoot.
const glide=value=>{const t=clamp(value);return t*t*t*(t*(t*6-15)+10);};
const MOVES={
 'orbit-right':{size:[582,536],from:[-34,12,.12,-.34,.012,175],to:[18,-6,.045,.13,0,36]},
 'high-angle':{size:[610,560],from:[22,28,-.34,.12,0,100],to:[-14,-12,-.17,-.09,0,18]},
 'orbit-left':{size:[586,540],from:[32,12,.1,.32,-.012,135],to:[-24,-4,.025,-.21,0,24]},
 'low-angle':{size:[608,558],from:[-16,32,.31,-.15,0,100],to:[12,6,.17,.14,0,22]},
 'detail-track':{size:[786,722],from:[30,32,-.08,.13,0,18],to:[-24,-20,.04,-.08,0,-52]},
 'hero':{size:[558,516],from:[-12,12,.07,-.12,0,100],to:[0,0,.025,.025,0,16]},
};
function target(shot,progress,mood){
 const move=MOVES[shot.angle]||MOVES['orbit-right'];
 const t=glide(progress/(shot.angle==='hero'?.72:1));
 const values=move.from.map((value,index)=>mix(value,move.to[index],t));
 const amplitude=mood==='Calm'?.85:mood==='Bold'?1.08:1;
 const [x,y,rx,ry,rz,z]=values;
 return {x:(shot.act===0?944:330)+x,y:388+y,w:move.size[0],h:move.size[1],rx:rx*amplitude,ry:ry*amplitude,rz,z};
}
export function transitionDuration(shot,mood='Energetic'){
 const crossing=shot.previous&&shot.previous.act!==shot.act;
 return Math.min(shot.length*.72,crossing?.95:mood==='Calm'?.76:.62);
}
export function cameraPose(shot,mood='Energetic'){
 const pose=target(shot,shot.progress,mood);
 if(shot.previous){
  const from=target(shot.previous,1,mood),t=glide(shot.local/transitionDuration(shot,mood));
  for(const key of Object.keys(pose))pose[key]=mix(from[key],pose[key],t);
 }else{
  // A slow opening dolly, not a short zoom kick that rebounds.
  pose.z+=110*(1-glide(shot.local/Math.min(1.2,shot.length*.7)));
 }
 return pose;
}
export function stageGeometry(pose,image={width:pose.w,height:pose.h}){
 const corners=projectProduct(image,pose);
 const center={x:(corners[2].x+corners[3].x)/2,y:(corners[2].y+corners[3].y)/2};
 const fit=Math.min(pose.w/image.width,pose.h/image.height),radius=Math.max(100,Math.min(340,image.width*fit*.57));
 const yaw=pose.ry*.65,pitch=.43+pose.rx*.5;
 const project=(x,y,z)=>{
  const a=x*Math.cos(yaw)+z*Math.sin(yaw),depth=-x*Math.sin(yaw)+z*Math.cos(yaw);
  const b=y*Math.cos(pitch)-depth*Math.sin(pitch),d=y*Math.sin(pitch)+depth*Math.cos(pitch);
  const scale=1200/(1200+d+pose.z);
  return {x:center.x+a*scale,y:center.y+b*scale};
 };
 const top=[],bottom=[];
 for(let i=0;i<32;i++){const angle=i/32*Math.PI*2,x=Math.cos(angle)*radius,z=Math.sin(angle)*radius*.5;top.push(project(x,0,z));bottom.push(project(x,25,z));}
 return {top,bottom,center,parallax:{x:-pose.ry*78-(pose.x-640)*.05,y:pose.rx*54,z:pose.z}};
}
