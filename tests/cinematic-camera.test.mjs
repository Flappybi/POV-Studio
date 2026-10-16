import test from 'node:test';import assert from 'node:assert/strict';
import {cameraPose,stageGeometry} from '../src/lib/cinema.mjs';
import {editAt,editTimeline} from '../src/lib/motion.mjs';
import {projectProduct} from '../src/lib/perspective.mjs';
const at=(time,duration=15,mood='Calm',bpm=96)=>cameraPose(editAt(duration,time,mood,bpm),mood);
test('a camera sequence covers lateral orbit, high and low angles, detail and a closing hero',()=>{
 const timeline=editTimeline(15,'Calm',96),moves=timeline.map(s=>s.angle);
 for(const angle of ['orbit-right','orbit-left','high-angle','low-angle','detail-track','hero'])assert.ok(moves.includes(angle),angle);
 assert.equal(timeline.at(-1).angle,'hero');
 const high=timeline.find(s=>s.angle==='high-angle'),low=timeline.find(s=>s.angle==='low-angle');
 assert.ok(at(high.start+high.length*.75).rx<-.12);assert.ok(at(low.start+low.length*.75).rx>.12);
});
test('camera motion is continuous, velocity-bounded and has restrained roll',()=>{
 for(const duration of [10,15,20])for(const mood of ['Calm','Energetic','Bold'])for(const bpm of [70,96,150]){
  const timeline=editTimeline(duration,mood,bpm);
  for(const shot of timeline.slice(1)){
   const a=at(shot.start-.00001,duration,mood,bpm),b=at(shot.start+.00001,duration,mood,bpm);
   for(const key of ['x','y','w','h','rx','ry','rz','z'])assert.ok(Math.abs(a[key]-b[key])<.01,`${key} jumps at ${shot.start}`);
  }
  let before=at(0,duration,mood,bpm);
  for(let time=1/60;time<duration;time+=1/60){const pose=at(time,duration,mood,bpm);assert.ok(Object.values(pose).every(Number.isFinite));assert.ok(Math.abs(pose.rz)<=.035);assert.ok(Math.hypot(pose.x-before.x,pose.y-before.y)<35);assert.ok(Math.abs(pose.ry-before.ry)<.05);before=pose;}
 }
});
test('each shot has a deliberate one-way camera travel, with an exactly still closing hold',()=>{
 for(const shot of editTimeline(15,'Calm',96)){
  if(shot.angle==='hero')continue;
  const samples=[.65,.75,.85,.95].map(p=>at(shot.start+shot.length*p));
  const signs=samples.slice(1).map((p,i)=>Math.sign(p.ry-samples[i].ry)).filter(Boolean);
  assert.ok(new Set(signs).size<=1,'no repeated sway inside a camera move');
 }
 const a=at(14.65),b=at(14.99);assert.deepEqual(a,b);
});
test('projected floor stage stays finite and follows camera depth instead of an unrelated wobble',()=>{
 const a=stageGeometry(at(.6)),b=stageGeometry(at(7));
 assert.notDeepEqual(a,b);assert.ok(a.top.length>=16);assert.equal(a.top.length,a.bottom.length);
 for(const point of [...a.top,...a.bottom,...b.top,...b.bottom])assert.ok(Number.isFinite(point.x)&&Number.isFinite(point.y));
 const center=at(5.5),left=stageGeometry({...center,x:639.9999}),right=stageGeometry({...center,x:640.0001});
 assert.ok(Math.abs(left.parallax.x-right.parallax.x)<.01,'background must not jump as the camera crosses screen center');
});
test('the floor contact follows the projected image base for wide and tall product assets',()=>{
 const pose=at(1);
 for(const image of [{width:1800,height:300},{width:300,height:1800},{width:609,height:650}]){
  const stage=stageGeometry(pose,image),corners=projectProduct(image,pose);
  const foot={x:(corners[2].x+corners[3].x)/2,y:(corners[2].y+corners[3].y)/2};
  assert.ok(Math.hypot(stage.center.x-foot.x,stage.center.y-foot.y)<1);
 }
});
