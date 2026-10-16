import test from 'node:test';import assert from 'node:assert/strict';
import {editTimeline,editAt} from '../src/lib/motion.mjs';
test('beat-aware shots cover each duration, retain three acts and resolve on a readable closing shot',()=>{
 for(const duration of [10,15,20])for(const bpm of [70,96,129,150])for(const mood of ['Calm','Energetic','Bold']){
  const timeline=editTimeline(duration,mood,bpm);assert.equal(timeline[0].start,0);assert.equal(timeline.at(-1).end,duration);
  assert.equal(new Set(timeline.map(s=>s.act)).size,3);
  timeline.forEach((shot,i)=>{assert.ok(shot.end>shot.start);if(i)assert.equal(shot.start,timeline[i-1].end);assert.equal(editAt(duration,(shot.start+shot.end)/2,mood,bpm).id,i);});
  const last=timeline.at(-1);assert.ok(last.end-last.start>=1.8-1e-9,'CTA needs a steady final hold');
  assert.ok(new Set(timeline.map(s=>(s.end-s.start).toFixed(2))).size>1,'rhythm includes short inserts and longer holds');
  for(const shot of timeline.slice(1))assert.ok(Math.abs(shot.start/(60/bpm)*2-Math.round(shot.start/(60/bpm)*2))<.001,'cuts fall on half-beats');
 }
});
test('changing soundtrack tempo changes edit timing',()=>{
 assert.notDeepEqual(editTimeline(15,'Energetic',96),editTimeline(15,'Energetic',129));
 const slow=editTimeline(15,'Calm',70);assert.ok(slow.length>=6);assert.ok(editTimeline(15,'Bold',150).length>slow.length);
});
