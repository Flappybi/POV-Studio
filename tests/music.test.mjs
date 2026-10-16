import test from 'node:test';import assert from 'node:assert/strict';
import {validateMusic,musicFor} from '../src/lib/music.mjs';
import {validatePlan} from '../src/lib/core.mjs';
import {input,plan} from './fixtures.mjs';
import * as music from '../src/lib/music.mjs';
test('AI choices are bounded and older results get explicit preference fallback',()=>{
 assert.throws(()=>validateMusic({style:'song-url',bpm:100,reason:'Test'}));assert.throws(()=>validateMusic({style:'warm',bpm:900,reason:'Test'}));
 assert.equal(musicFor({input:{mood:'Calm'},plan:{}}).style,'warm');
 assert.equal(musicFor({input:{mood:'Calm'},plan:{music:{style:'drive',bpm:124,reason:'Aktivitas cepat'}}}).style,'drive');
});
test('live generation requires music but legacy history can omit it',()=>{const value=input();const p=plan(value);delete p.music;assert.doesNotThrow(()=>validatePlan(p,value.brand));assert.throws(()=>validatePlan(p,value.brand,{requireMusic:true}),/music/);});
