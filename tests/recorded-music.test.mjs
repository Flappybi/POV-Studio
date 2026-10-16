import test from 'node:test';import assert from 'node:assert/strict';
import {readFileSync,statSync} from 'node:fs';
import {musicFor,musicOptions,musicCredit} from '../src/lib/music.mjs';
import {input} from './fixtures.mjs';
test('each AMD direction recommends three distinct bundled, credited recordings',()=>{
 for(const style of ['warm','bright','drive','minimal']){
  const result={input:input(),plan:{music:{style,bpm:100,reason:'Direction from story'}}};
  const options=musicOptions(result);
  assert.equal(options.length,3);assert.deepEqual(options.map(o=>o.id),['original','groove','atmosphere']);
  assert.equal(new Set(options.map(o=>o.src)).size,3);
  for(const track of options){
   assert.equal(track.style,style);assert.ok(track.bpm>=60&&track.bpm<=160);assert.equal(track.composer,'Kevin MacLeod');
   assert.equal(track.license,'CC BY 4.0');assert.match(track.sourceURL,/^https:\/\/incompetech.com\//);
   assert.match(track.src,/^\/music\/[a-z-]+\.mp3$/);
   assert.ok(statSync(new URL('../public'+track.src,import.meta.url)).size>100000);
   const provenance=JSON.parse(readFileSync(new URL('../public/music/provenance.json',import.meta.url)));
   assert.equal(provenance.find(p=>p.key===track.key).bpm,track.bpm);
  }
 }
});
test('selection changes recording without altering AMD plan, with portable attribution',()=>{
 const result={input:input(),plan:{music:{style:'warm',bpm:84,reason:'Calm morning'}}};const before=structuredClone(result.plan);
 const sources=['original','groove','atmosphere'].map(id=>musicFor({...result,musicChoice:id}).src);assert.equal(new Set(sources).size,3);
 assert.equal(musicFor({...result,musicChoice:'unknown'}).trackId,'original');assert.deepEqual(result.plan,before);
 for(const text of ['Kevin MacLeod','CC BY 4.0','https://creativecommons.org/licenses/by/4.0/','excerpt','https://incompetech.com/'])assert.ok(musicCredit(result).includes(text));
});
