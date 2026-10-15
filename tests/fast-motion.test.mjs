import test from 'node:test';
import assert from 'node:assert/strict';
import * as motion from '../src/lib/motion.mjs';

test('ad edit has 6, 9, or 12 short shots with a stable three-act story',()=>{
 assert.equal(typeof motion.editAt,'function');
 for(const [duration,count] of [[10,6],[15,9],[20,12]]){
  const seen=new Set();const transitions=new Set();
  for(let t=0;t<duration;t+=.04){const shot=motion.editAt(duration,t,'Calm');seen.add(shot.id);transitions.add(shot.transition);assert.ok(shot.length<=1.8);assert.equal(shot.act,Math.min(2,Math.floor(t/(duration/3))));}
  assert.equal(seen.size,count);assert.equal(transitions.size,2);
 }
});

test('transition combinations are curated by energy, rather than using every effect in each ad',()=>{
 const combinations=[];
 for(const mood of ['Calm','Energetic','Bold']){
  const types=new Set();for(let t=0;t<15;t+=.1)types.add(motion.editAt(15,t,mood).transition);
  assert.equal(types.size,2);combinations.push([...types].sort().join(','));
 }
 assert.equal(new Set(combinations).size,3);
});

test('perspective camera creates depth rather than only translating a flat rectangle',()=>{
 assert.equal(typeof motion.projectProduct,'function');
 const pose={x:900,y:380,w:500,h:500,rx:.25,ry:.45,rz:.08,z:0};
 const corners=motion.projectProduct({width:500,height:500},pose);
 assert.equal(corners.length,4);
 const left=Math.hypot(corners[3].x-corners[0].x,corners[3].y-corners[0].y);
 const right=Math.hypot(corners[2].x-corners[1].x,corners[2].y-corners[1].y);
 assert.ok(Math.abs(left-right)>15,'near and far edges must have different projected sizes');
 for(const p of corners)assert.ok(Number.isFinite(p.x)&&Number.isFinite(p.y));
 const far=motion.projectProduct({width:500,height:500},{...pose,z:250});
 assert.ok(Math.hypot(far[1].x-far[0].x,far[1].y-far[0].y)<Math.hypot(corners[1].x-corners[0].x,corners[1].y-corners[0].y));
});
