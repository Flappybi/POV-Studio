export const MUSIC_STYLES={warm:'Warm & relaxed',bright:'Bright & playful',drive:'Energetic & bold',minimal:'Minimal & elegant'};
export const MUSIC_CHOICE_IDS=['original','groove','atmosphere'];
export function validateMusic(music){
 if(!music||!Object.hasOwn(MUSIC_STYLES,music.style)||!Number.isInteger(music.bpm)||music.bpm<72||music.bpm>132||typeof music.reason!=='string'||!music.reason.trim()||music.reason.length>240)throw new Error('AI response: invalid music selection.');
 if(music.tracks!==undefined&&(!Array.isArray(music.tracks)||music.tracks.length!==3||new Set(music.tracks).size!==3||music.tracks.some(key=>!Object.hasOwn(RECORDINGS,key))))throw new Error('AI response: select three distinct music track IDs from the library.');
 return {style:music.style,bpm:music.bpm,reason:music.reason.trim(),...(music.tracks?{tracks:[...music.tracks]}:{})};
}
function baseMusic(result){
 if(result.plan?.music)return validateMusic(result.plan.music);
 const mood=result.input.mood;return {style:mood==='Calm'?'warm':mood==='Bold'?'drive':'bright',bpm:mood==='Calm'?84:mood==='Bold'?124:108,reason:'Based on your energy preference; older ads do not include an AMD music selection.'};
}
const RECORDINGS={
 'carefree':{title:'Carefree',bpm:96,isrc:'USUAN1400037',description:'Acoustic ukulele, bright marimba and light percussion.'},
 'airport-lounge':{title:'Airport Lounge',bpm:129,isrc:'USUAN1100806',description:'Laid-back lounge groove with electric piano, bass and vibes.'},
 'dream-culture':{title:'Dream Culture',bpm:70,isrc:'USUAN1300046',description:'Dreamy piano, spacious textures and a soft rhythmic pulse.'},
 'cipher':{title:'Cipher',bpm:150,isrc:'USUAN1100844',description:'A punchy electronic groove with a driving melodic hook.'},
 'wallpaper':{title:'Wallpaper',bpm:92,isrc:'USUAN1100843',description:'Clean synth hooks, warm guitar and a steady drum groove.'},
};
// Affinities describe the actual recordings, not the listener's identity.
const CHARACTER={
 'carefree':{energy:.46,styles:{warm:.95,bright:1,drive:.1,minimal:.2},times:{Morning:.8,Afternoon:.6,Evening:0}},
 'airport-lounge':{energy:.43,styles:{warm:.7,bright:.45,drive:.35,minimal:.75},times:{Morning:.2,Afternoon:.5,Evening:1}},
 'dream-culture':{energy:.17,styles:{warm:.65,bright:.1,drive:0,minimal:1},times:{Morning:.2,Afternoon:0,Evening:1}},
 'cipher':{energy:.96,styles:{warm:.1,bright:.4,drive:1,minimal:.1},times:{Morning:.2,Afternoon:.8,Evening:.7}},
 'wallpaper':{energy:.64,styles:{warm:.4,bright:.8,drive:.8,minimal:.5},times:{Morning:.6,Afternoon:1,Evening:.5}},
};
const LEGACY_KEYS={warm:['carefree','airport-lounge','dream-culture'],bright:['carefree','wallpaper','airport-lounge'],drive:['cipher','wallpaper','airport-lounge'],minimal:['dream-culture','airport-lounge','wallpaper']};
const validKeys=keys=>Array.isArray(keys)&&keys.length===3&&new Set(keys).size===3&&keys.every(key=>Object.hasOwn(RECORDINGS,key));
export function musicLibrary(){return Object.entries(RECORDINGS).map(([id,track])=>({id,title:track.title,bpm:track.bpm,character:track.description}));}
function recommendKeys(result,base){
 const mood=result.input.mood||'Energetic',time=result.input.time||'Morning';
 const desired={Calm:.25,Energetic:.72,Bold:.98}[mood]??.72;
 const energy=mood==='Energetic'?Math.min(1,desired+(base.style==='drive'?.12:base.style==='minimal'?-.1:0)):desired;
 const targetTempo=base.bpm*.4+({Calm:82,Energetic:116,Bold:140}[mood]||116)*.6;
 const eligible=key=>mood==='Calm'?key!=='cipher':mood==='Bold'?['cipher','wallpaper','airport-lounge'].includes(key):key!=='dream-culture';
 const score=key=>{
  const track=RECORDINGS[key],character=CHARACTER[key],aiOrder=base.tracks?.indexOf(key)??-1;
  return character.styles[base.style]*5-Math.abs(character.energy-energy)*14+character.times[time]*2-Math.abs(track.bpm-targetTempo)/45+(aiOrder>=0?12-aiOrder*3:0);
 };
 return Object.keys(RECORDINGS).filter(eligible).sort((a,b)=>score(b)-score(a)||a.localeCompare(b)).slice(0,3);
}
export function musicOptions(result){
 const base=baseMusic(result),keys=validKeys(result.soundtrackKeys)?result.soundtrackKeys:recommendKeys(result,base);
 return keys.map((key,index)=>({...base,...RECORDINGS[key],key,id:MUSIC_CHOICE_IDS[index],src:`/music/${key}.mp3`,composer:'Kevin MacLeod',license:'CC BY 4.0',licenseURL:'https://creativecommons.org/licenses/by/4.0/',sourceURL:`https://incompetech.com/music/royalty-free/index.html?isrc=${RECORDINGS[key].isrc}`,recommended:index===0}));
}
export function freezeSoundtracks(result){return {...result,soundtrackKeys:musicOptions(result).map(track=>track.key)};}
export function restoreSoundtracks(result){return validKeys(result.soundtrackKeys)?result:{...result,soundtrackKeys:[...LEGACY_KEYS[baseMusic(result).style]]};}
export function musicFor(result){
 const options=musicOptions(result);const chosen=options.find(option=>option.id===result.musicChoice)||options[0];return {...chosen,trackId:chosen.id};
}
export function musicCredit(result){
 const track=musicFor(result);
 return `"${track.title}" by ${track.composer} (incompetech.com)\nSource: ${track.sourceURL}\nLicensed under ${track.license}: ${track.licenseURL}\nChanges: trimmed excerpt, loudness levelled, fade-in and fade-out.\n`;
}
const decoded=new Map(),rendered=new Map();
export async function renderMusic(result){
 const track=musicFor(result),duration=Number(result.input.duration),key=`${track.key}:${duration}:recording-v1`;
 if(!Number.isFinite(duration)||duration<=0||duration>20)throw new Error('Soundtrack duration must be between 1 and 20 seconds.');
 if(rendered.has(key))return rendered.get(key);
 const render=async()=>{
  const Offline=window.OfflineAudioContext||window.webkitOfflineAudioContext;if(!Offline)throw new Error('Your browser does not support instrumental playback.');
  const ctx=new Offline(2,Math.ceil(48000*duration),48000);
  if(!decoded.has(track.src)){
   const pending=fetch(track.src).then(response=>{if(!response.ok)throw new Error('Recording unavailable. Reload the app and try again.');return response.arrayBuffer();}).then(data=>ctx.decodeAudioData(data)).catch(error=>{decoded.delete(track.src);throw new Error(`Unable to load ${track.title}. ${error.message}`);});
   decoded.set(track.src,pending);
  }
  const buffer=await decoded.get(track.src);if(buffer.duration<duration)throw new Error('The bundled recording is shorter than the ad.');
  const source=ctx.createBufferSource(),level=ctx.createGain();source.buffer=buffer;
  // Original recording tempo and timbre are retained. Both preview and export use this buffer.
  level.gain.setValueAtTime(0,0);level.gain.linearRampToValueAtTime(.85,.018);level.gain.setValueAtTime(.85,Math.max(.02,duration-.65));level.gain.linearRampToValueAtTime(0,duration);
  source.connect(level);level.connect(ctx.destination);source.start(0);source.stop(duration);
  return ctx.startRendering();
 };
 const pending=render().catch(error=>{rendered.delete(key);throw error;});rendered.set(key,pending);if(rendered.size>8)rendered.delete(rendered.keys().next().value);return pending;
}
export async function createInstrumental(result,{offset=0,destination=false,monitor=true}={}){
 const Audio=window.AudioContext||window.webkitAudioContext;if(!Audio)throw new Error('Your browser does not support audio.');
 const ctx=new Audio();const resume=ctx.resume();resume.catch(()=>{});
 try{const buffer=await renderMusic(result);await resume;const source=ctx.createBufferSource();source.buffer=buffer;const output=destination?ctx.createMediaStreamDestination():null;if(monitor)source.connect(ctx.destination);if(output)source.connect(output);let played=false,stopped=false;return {stream:output?.stream,play:(position=offset)=>{if(!played&&!stopped){played=true;source.start(0,Math.max(0,Math.min(position,buffer.duration-.01)));}},stop:()=>{if(stopped)return;stopped=true;try{source.stop();}catch{}void ctx.close().catch(()=>{});}};}catch(error){void ctx.close().catch(()=>{});throw error;}
}
