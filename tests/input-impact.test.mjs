import test from 'node:test';import assert from 'node:assert/strict';
import {musicOptions,musicFor,validateMusic,freezeSoundtracks,restoreSoundtracks} from '../src/lib/music.mjs';
import {buildPrompt,hasInputChanges} from '../src/lib/core.mjs';
import {input,plan} from './fixtures.mjs';
const result=(overrides={},music={style:'warm',bpm:84,reason:'Story direction'})=>{const value={...input('I sketch city streets before class.'),...overrides};return {input:value,plan:{...plan(value),music}};};
test('explicit energy changes real recording recommendations even when AMD repeats warm direction',()=>{
 const calm=musicOptions(result({mood:'Calm'})),bold=musicOptions(result({mood:'Bold'}));
 assert.notDeepEqual(calm.map(t=>t.key),bold.map(t=>t.key));assert.equal(bold[0].key,'cipher');
 assert.ok(!calm.some(t=>t.key==='cipher'));assert.ok(!bold.some(t=>t.key==='dream-culture'));
});
test('time and AMD story direction both contribute to track ranking',()=>{
 const morning=musicOptions(result({mood:'Calm',time:'Morning'}));const evening=musicOptions(result({mood:'Calm',time:'Evening'}));
 assert.notDeepEqual(morning.map(t=>t.key),evening.map(t=>t.key));
 const bright=musicOptions(result({mood:'Energetic'},{style:'bright',bpm:108,reason:'Joyful city walk'}));
 const driven=musicOptions(result({mood:'Energetic'},{style:'drive',bpm:132,reason:'Intense evening training'}));
 assert.notEqual(bright[0].key,driven[0].key);
});
test('AMD can recommend actual library tracks; invalid optional IDs are rejected',()=>{
 const direction={style:'warm',bpm:84,reason:'Drawing at night',tracks:['airport-lounge','dream-culture','wallpaper']};
 assert.deepEqual(validateMusic(direction).tracks,direction.tracks);
 assert.throws(()=>validateMusic({...direction,tracks:['missing','cipher','carefree']}),/track/i);
 const options=musicOptions(result({mood:'Calm',time:'Evening'},direction));assert.equal(options[0].key,'airport-lounge');
});
test('saved selections freeze actual recordings and legacy histories keep their previous songs',()=>{
 const frozen=freezeSoundtracks({...result({mood:'Calm'}),musicChoice:'groove'});const key=musicFor(frozen).key;
 assert.equal(musicFor({...frozen,input:{...frozen.input,mood:'Bold'}}).key,key);
 assert.deepEqual(restoreSoundtracks(result({mood:'Calm'})).soundtrackKeys,['carefree','airport-lounge','dream-culture']);
 assert.equal(musicFor(restoreSoundtracks({...result({mood:'Calm'}),musicChoice:'groove'})).key,'airport-lounge');
});
test('draft changes are distinguished from the inputs used to generate the visible ad',()=>{
 const value=result();assert.equal(hasInputChanges(value.input,value),false);
 for(const field of [{story:'I train for a race.'},{time:'Evening'},{mood:'Bold'},{duration:20}])assert.equal(hasInputChanges({...value.input,...field},value),true);
 assert.equal(hasInputChanges(input(),null),false);
});
test('AMD receives actual preferences and the available licensed track catalog',()=>{
 const value=input('I sketch city streets before class.');value.mood='Bold';value.time='Evening';
 const messages=buildPrompt(value),data=JSON.parse(messages[1].content);
 assert.deepEqual(data.preferences,{time:'Evening',mood:'Bold',duration:15});assert.equal(data.soundtrackLibrary.length,5);
 assert.match(messages[0].content,/tracks/);assert.match(messages[0].content,/tagline/i);assert.match(messages[0].content,/preferences/i);
 assert.match(messages.at(-1).content,/Generate the AD PLAN now/);assert.match(messages.at(-1).content,/Do not return the input/);
});
