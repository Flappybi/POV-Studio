import test from 'node:test';
import assert from 'node:assert/strict';
import * as motion from '../src/lib/motion.mjs';

test('ad edit balances deliberate camera shots with three readable story acts',()=>{
 assert.equal(typeof motion.editAt,'function');
 for(const duration of [10,15,20]){
  const seen=new Set();
  for(let t=0;t<duration;t+=.04){const shot=motion.editAt(duration,t,'Calm');seen.add(shot.id);assert.ok(shot.length<=4.5);assert.ok(t>=shot.actStart&&t<shot.actEnd);}
  assert.ok(seen.size>=6);
 }
});

test('calm gives the camera longer to travel while bold retains a faster edit at the same song tempo',()=>{
 const calm=motion.editTimeline(15,'Calm',96),bold=motion.editTimeline(15,'Bold',96);
 assert.ok(bold.length>calm.length);assert.equal(calm.at(-1).angle,'hero');assert.equal(bold.at(-1).angle,'hero');
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
