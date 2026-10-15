import test from 'node:test';import assert from 'node:assert/strict';
import {validateMusic,musicFor,buildScore} from '../src/lib/music.mjs';
import {validatePlan} from '../src/lib/core.mjs';
import {input,plan} from './fixtures.mjs';
import * as music from '../src/lib/music.mjs';
test('AI choices are bounded and older results get explicit preference fallback',()=>{
 assert.throws(()=>validateMusic({style:'song-url',bpm:100,reason:'Test'}));assert.throws(()=>validateMusic({style:'warm',bpm:900,reason:'Test'}));
 assert.equal(musicFor({input:{mood:'Calm'},plan:{}}).style,'warm');
 assert.equal(musicFor({input:{mood:'Calm'},plan:{music:{style:'drive',bpm:124,reason:'Aktivitas cepat'}}}).style,'drive');
});
test('score has harmony, melody, bass and percussion and is deterministic',()=>{
 const result={input:{story:'Morning bersama pasangan',duration:15,mood:'Calm'},plan:{music:{style:'warm',bpm:84,reason:'Cerita santai'}}};
 const score=buildScore(result);assert.deepEqual(score,buildScore(result));
 for(const kind of ['pad','lead','bass','kick','hat'])assert.ok(score.some(n=>n.kind===kind));
 assert.ok(score.every(n=>n.time>=0&&n.time<15&&n.length>0));
 assert.notDeepEqual(score,buildScore({...result,plan:{music:{style:'drive',bpm:124,reason:'Aktivitas cepat'}}}));
 assert.notDeepEqual(score,buildScore({...result,plan:{music:{style:'bright',bpm:84,reason:'Ceria'}}}));
});
test('live generation requires music but legacy history can omit it',()=>{const value=input();const p=plan(value);delete p.music;assert.doesNotThrow(()=>validatePlan(p,value.brand));assert.throws(()=>validatePlan(p,value.brand,{requireMusic:true}),/music/);});

test('each ad has three distinct instrumental choices grounded in its existing music direction',()=>{
 assert.equal(typeof music.musicOptions,'function');
 for(const style of ['warm','bright','drive','minimal']){
  const result={input:input(),plan:{music:{style,bpm:100,reason:'Direction from the story'}}};
  const options=music.musicOptions(result);
  assert.equal(options.length,3);assert.equal(new Set(options.map(o=>o.id)).size,3);
  assert.equal(new Set(options.map(o=>o.title)).size,3);
  assert.equal(options[0].style,style);assert.equal(options[0].bpm,100);
  assert.ok(options.every(o=>o.bpm>=72&&o.bpm<=132&&o.description&&o.title));
 }
});

test('selected soundtrack changes actual notes and tempo while preserving the AMD plan',()=>{
 const result={input:input('A calm morning in the city'),plan:{music:{style:'warm',bpm:84,reason:'Calm morning'}}};
 const before=structuredClone(result.plan);const original=buildScore(result);
 for(const id of ['groove','atmosphere']){
  const chosen={...result,musicChoice:id};assert.equal(musicFor(chosen).trackId,id);
  assert.notDeepEqual(buildScore(chosen),original);assert.deepEqual(buildScore(chosen),buildScore(chosen));
 }
 assert.deepEqual(result.plan,before);
 assert.equal(musicFor({...result,musicChoice:'unknown'}).trackId,'original');
 assert.deepEqual(buildScore({...result,musicChoice:'original'}),original);
});
