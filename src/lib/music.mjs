export const MUSIC_STYLES={warm:'Warm & relaxed',bright:'Bright & playful',drive:'Energetic & bold',minimal:'Minimal & elegant'};
export const MUSIC_CHOICE_IDS=['original','groove','atmosphere'];
export function validateMusic(music){
 if(!music||!Object.hasOwn(MUSIC_STYLES,music.style)||!Number.isInteger(music.bpm)||music.bpm<72||music.bpm>132||typeof music.reason!=='string'||!music.reason.trim()||music.reason.length>240)throw new Error('AI response: invalid music selection.');
 return {style:music.style,bpm:music.bpm,reason:music.reason.trim()};
}
function baseMusic(result){
 if(result.plan?.music)return validateMusic(result.plan.music);
 const mood=result.input.mood;return {style:mood==='Calm'?'warm':mood==='Bold'?'drive':'bright',bpm:mood==='Calm'?84:mood==='Bold'?124:108,reason:'Based on your energy preference; older ads do not include an AMD music selection.'};
}
export function musicOptions(result){
 const base=baseMusic(result);const bpm=value=>Math.max(72,Math.min(132,value));
 const names={warm:['Warm keys','Easy groove','Airy atmosphere'],bright:['Sunlit keys','Bright groove','Light atmosphere'],drive:['Driving keys','Neon groove','Cinematic pulse'],minimal:['Quiet keys','Soft groove','Open atmosphere']}[base.style];
 return [
  {...base,id:'original',title:names[0],voice:'keys',description:'Layered keys, rounded bass and a light rhythmic bed.',recommended:true},
  {...base,id:'groove',title:names[1],bpm:bpm(base.bpm+8),voice:'pluck',description:'Plucked melody, syncopated bass and a tighter beat.',recommended:false},
  {...base,id:'atmosphere',title:names[2],bpm:bpm(base.bpm-8),voice:'soft',description:'Spacious chords, a sparse melody and gentle low-end pulse.',recommended:false},
 ];
}
export function musicFor(result){
 const options=musicOptions(result);const chosen=options.find(option=>option.id===result.musicChoice)||options[0];
 return {...chosen,trackId:chosen.id};
}
export function buildScore(result){
 const music=musicFor(result),beat=60/music.bpm,duration=result.input.duration;
 let seed=2166136261;for(const c of `${result.input.story||''}:${music.trackId}`)seed=Math.imul(seed^c.charCodeAt(0),16777619)>>>0;
 const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
 const chords=music.style==='drive'?[[45,48,52],[41,45,48],[48,52,55],[43,47,50]]:music.style==='bright'?[[48,52,55],[53,57,60],[55,59,62],[48,52,55]]:[[48,52,55,59],[45,48,52,55],[41,45,48,52],[43,47,50,55]];
 const events=[];const add=(kind,time,length,note,gain)=>{if(time<duration)events.push({kind,time,length:Math.min(length,duration-time),note,gain});};
 const motif=Array.from({length:8},()=>Math.floor(random()*4));
 const atmosphere=music.trackId==='atmosphere',groove=music.trackId==='groove';
 for(let bar=0;bar*4*beat<duration;bar++){
  const chord=chords[bar%4];const start=bar*4*beat;
  for(const note of chord)add('pad',start,4.1*beat,note+12,atmosphere?.038:.026);
  for(let step=0;step<8;step++){
   const time=start+step*.5*beat+(groove&&step%2?beat*.065:0);
   if(atmosphere?step===0:groove?[0,3,4,6].includes(step):step%2===0)add('bass',time,beat*(atmosphere?2:.7),chord[0]-12,music.style==='drive'?.13:.085);
   if(atmosphere?[0,4].includes(step):groove?step!==7:step%2===0||music.style==='drive')add('lead',time+.009,beat*(atmosphere?1.5:groove?.55:.85),chord[motif[(step+bar%2*2)%8]%chord.length]+12,atmosphere?.055:.09);
   if(!atmosphere&&(music.style!=='minimal'||groove)){add('hat',time,.06,0,music.style==='drive'?.065:.025);if(step===0||step===4||groove&&step===3)add('kick',time,.23,0,.18);if(step===2||step===6)add('snare',time,.13,0,music.style==='drive'?.07:.027);}
   else if(atmosphere&&step===0)add('kick',time,.3,0,.075);
  }
 }
 return events;
}
const cached=new Map();
export async function renderMusic(result){
 const settings=musicFor(result);const key=JSON.stringify([settings.style,settings.bpm,settings.trackId,result.input.story,result.input.duration]);
 if(cached.has(key))return cached.get(key);
 const render=async()=>{
  const Offline=window.OfflineAudioContext||window.webkitOfflineAudioContext;if(!Offline)throw new Error('Your browser does not support instrumental rendering.');
  const duration=result.input.duration,ctx=new Offline(2,Math.ceil(44100*duration),44100),master=ctx.createGain();master.gain.setValueAtTime(0,0);master.gain.linearRampToValueAtTime(.8,.18);master.gain.setValueAtTime(.8,Math.max(.2,duration-.8));master.gain.linearRampToValueAtTime(0,duration);master.connect(ctx.destination);
  const echo=ctx.createDelay(1);echo.delayTime.value=Math.min(.8,60/settings.bpm*.75);const echoGain=ctx.createGain();echoGain.gain.value=settings.trackId==='atmosphere'?.22:.11;echo.connect(echoGain);echoGain.connect(master);
  const noise=ctx.createBuffer(1,44100,44100);let seed=17;const data=noise.getChannelData(0);for(let i=0;i<data.length;i++){seed=(Math.imul(seed,1664525)+1013904223)>>>0;data[i]=seed/2147483648-1;}
  for(const event of buildScore(result)){
   const {kind,time,length,note,gain}=event;const envelope=ctx.createGain();envelope.connect(master);const end=time+length;envelope.gain.setValueAtTime(0,time);
   const attack=kind==='pad'?Math.min(.18,length*.2):Math.min(.006,length*.2);envelope.gain.linearRampToValueAtTime(gain,time+attack);envelope.gain.exponentialRampToValueAtTime(.0001,end);
   if(kind==='hat'||kind==='snare'){const source=ctx.createBufferSource();source.buffer=noise;const filter=ctx.createBiquadFilter();filter.type='highpass';filter.frequency.value=kind==='hat'?6500:1800;source.connect(filter);filter.connect(envelope);source.start(time);source.stop(end);}
   else if(kind==='lead'){
    const tone=ctx.createBiquadFilter();tone.type='lowpass';tone.frequency.setValueAtTime(settings.voice==='pluck'?3200:2200,time);tone.frequency.exponentialRampToValueAtTime(settings.voice==='pluck'?650:1400,end);tone.connect(envelope);envelope.connect(echo);
    for(const [multiple,level,type]of settings.voice==='pluck'?[[1,.7,'triangle'],[2,.16,'sine'],[3,.06,'sine']]:settings.voice==='soft'?[[1,.8,'sine'],[2,.06,'sine']]:[[1,.7,'sine'],[2,.20,'triangle'],[3,.07,'sine']]){
     const osc=ctx.createOscillator(),partial=ctx.createGain();osc.type=type;osc.frequency.value=440*Math.pow(2,(note-69)/12)*multiple;partial.gain.value=level;osc.connect(partial);partial.connect(tone);osc.start(time);osc.stop(end);
    }
   }else {const osc=ctx.createOscillator();osc.type=kind==='bass'?'triangle':'sine';if(kind==='kick'){osc.frequency.setValueAtTime(125,time);osc.frequency.exponentialRampToValueAtTime(42,end);}else osc.frequency.value=440*Math.pow(2,(note-69)/12);osc.connect(envelope);osc.start(time);osc.stop(end);}
  }
  const buffer=await ctx.startRendering();let peak=0,energy=0,count=0;
  for(let ch=0;ch<buffer.numberOfChannels;ch++){const samples=buffer.getChannelData(ch);for(let i=0;i<samples.length;i++){samples[i]=Math.tanh(samples[i]*1.2)*.8;peak=Math.max(peak,Math.abs(samples[i]));energy+=samples[i]**2;count++;}}
  // Match audition loudness while retaining headroom for the rhythmic attacks.
  const rms=Math.sqrt(energy/count),level=rms>0?Math.min(5,.085/rms,.85/peak):1;
  for(let ch=0;ch<buffer.numberOfChannels;ch++){const samples=buffer.getChannelData(ch);for(let i=0;i<samples.length;i++)samples[i]*=level;}
  return buffer;
 };
 const pending=render().catch(error=>{cached.delete(key);throw error;});cached.set(key,pending);if(cached.size>8)cached.delete(cached.keys().next().value);return pending;
}
export async function createInstrumental(result,{offset=0,destination=false,monitor=true}={}){
 const Audio=window.AudioContext||window.webkitAudioContext;if(!Audio)throw new Error('Your browser does not support audio.');
 const ctx=new Audio();const resume=ctx.resume();resume.catch(()=>{});
 try{const buffer=await renderMusic(result);await resume;const source=ctx.createBufferSource();source.buffer=buffer;const output=destination?ctx.createMediaStreamDestination():null;if(monitor)source.connect(ctx.destination);if(output)source.connect(output);let played=false,stopped=false;return {stream:output?.stream,play:(position=offset)=>{if(!played&&!stopped){played=true;source.start(0,Math.max(0,Math.min(position,buffer.duration-.01)));}},stop:()=>{if(stopped)return;stopped=true;try{source.stop();}catch{}void ctx.close().catch(()=>{});}};}catch(error){void ctx.close().catch(()=>{});throw error;}
}
