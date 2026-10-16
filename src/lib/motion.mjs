import {cameraPose,stageGeometry} from './cinema.mjs';
import {musicFor} from './music.mjs';
import {drawProjectedProduct,projectProduct} from './perspective.mjs';
export {projectProduct};
const clamp=(v,min=0,max=1)=>Math.max(min,Math.min(max,v));
const ease=v=>1-Math.pow(1-clamp(v),3);

function contain(ctx,img,box){const scale=Math.min(box.w/img.width,box.h/img.height);ctx.drawImage(img,box.x+(box.w-img.width*scale)/2,box.y+(box.h-img.height*scale)/2,img.width*scale,img.height*scale);}

// Fit full copy, including unbroken words, instead of cutting it off.
export function fitCopy(ctx,text,width,height,maxSize=64){
 let size=maxSize;let lines=[];
 for(;size>=12;size--){
  ctx.font=`700 ${size}px Arial, sans-serif`;lines=[];let line='';
  for(const paragraph of String(text||'').replace(/\s+/g,' ').trim().split('\n')){
   for(const word of paragraph.split(/\s+/).filter(Boolean)){
    if(ctx.measureText(word).width>width){if(line){lines.push(line);line='';}let chunk='';for(const char of word){if(chunk&&ctx.measureText(chunk+char).width>width){lines.push(chunk);chunk=char;}else chunk+=char;}line=chunk;}
    else if(line&&ctx.measureText(line+' '+word).width>width){lines.push(line);line=word;}else line=line?line+' '+word:word;
   }
   if(line){lines.push(line);line='';}
  }
  if(lines.length*size*1.14<=height)break;
 }
 return {size:Math.max(12,size),lines,lineHeight:Math.max(12,size)*1.14};
}

function copy(ctx,text,box,time,color,maxSize=64,stagger=.075){
 const fit=fitCopy(ctx,text,box.w,box.h,maxSize);ctx.font=`700 ${fit.size}px Arial, sans-serif`;ctx.fillStyle=color;
 ctx.save();ctx.beginPath();ctx.rect(box.x,box.y-3,box.w,box.h+8);ctx.clip();
 fit.lines.forEach((line,i)=>{const reveal=ease((time-i*stagger)/.24);ctx.save();ctx.globalAlpha*=reveal;ctx.fillText(line,box.x,box.y+i*fit.lineHeight+24*(1-reveal));ctx.restore();});ctx.restore();return fit;
}

const mix=(a,b,t)=>a+(b-a)*t;
const smooth=t=>{t=clamp(t);return t*t*(3-2*t);};
const rgb=color=>[1,3,5].map(i=>parseInt(color.slice(i,i+2),16));
function blend(a,b,t){const x=rgb(a),y=rgb(b);return '#'+x.map((v,i)=>Math.round(mix(v,y[i],t)).toString(16).padStart(2,'0')).join('');}
function ink(color){const linear=rgb(color).map(v=>{v/=255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4;});return .2126*linear[0]+.7152*linear[1]+.0722*linear[2]>.179?'#10151b':'#ffffff';}

const timelines=new Map();
export function editTimeline(duration,mood='Energetic',bpm=96){
 const tempo=clamp(Number(bpm)||96,60,180),beat=60/tempo,grid=beat/2;
 const key=`${duration}:${mood}:${tempo}`;if(timelines.has(key))return timelines.get(key);
 const snap=t=>Math.round(t/grid)*grid;
 const bounds=[0,snap(duration/3),snap(duration*2/3),duration];
 const shots=[];
 for(let act=0;act<3;act++){
  const actLength=bounds[act+1]-bounds[act];
  const targetLength=mood==='Calm'?3:mood==='Bold'?2.15:2.8;
  const wanted=Math.max(2,Math.min(4,mood==='Calm'?Math.round(actLength/targetLength):Math.ceil(actLength/targetLength)));
  const minimum=Math.ceil(1.05/grid)*grid,tail=act===2?1.8:minimum;
  const count=Math.max(1,Math.min(wanted,1+Math.floor((actLength-tail+.00001)/minimum)));
  const weights=count===2?[1.12,.88]:count===3?[1.05,.8,1.15]:[1.1,.85,.9,1.15];
  const weightSum=weights.slice(0,count).reduce((sum,v)=>sum+v,0);
  let start=bounds[act],weight=0;
  for(let within=0;within<count;within++){
   weight+=weights[within];
   const remaining=count-within-1;
   const latest=Math.floor((bounds[act+1]-tail-Math.max(0,remaining-1)*minimum+.00001)/grid)*grid;
   const end=remaining?Math.max(start+minimum,Math.min(latest,snap(bounds[act]+actLength*weight/weightSum))):bounds[act+1];
   const id=shots.length;
   const angle=act===2&&within===count-1?'hero':act===0?['orbit-right','high-angle','detail-track','orbit-left'][within%4]:act===1?['orbit-left','low-angle','detail-track','high-angle'][within%4]:['detail-track','high-angle','low-angle'][within%3];
   shots.push({id,act,within,angle,start,end,actStart:bounds[act],actEnd:bounds[act+1],length:end-start,perAct:count});
   start=end;
  }
 }
 shots.forEach(s=>{s.total=shots.length;});
 if(timelines.size>=48)timelines.delete(timelines.keys().next().value);timelines.set(key,shots);return shots;
}
export function editAt(duration,seconds,mood='Energetic',bpm=96){
 const time=clamp(Number.isFinite(seconds)?seconds:0,0,duration-.001);
 const timeline=editTimeline(duration,mood,bpm),shot=timeline.find(s=>time<s.end)||timeline.at(-1);
 const local=time-shot.start;return {...shot,local,progress:local/shot.length,actLocal:time-shot.actStart,previous:timeline[shot.id-1]};
}
function backdrop(ctx,assets,brand,pose,timeOfDay='Morning'){
 const light={Morning:{base:'#273341',horizon:'#786349',tint:'255,214,148',opacity:.20,photo:.64,x:1070,y:60},Afternoon:{base:'#292c30',horizon:'#755637',tint:'255,190,113',opacity:.14,photo:.56,x:940,y:180},Evening:{base:'#070d22',horizon:'#18234a',tint:'97,125,236',opacity:.32,photo:.36,x:1000,y:290}}[timeOfDay]||{base:'#273341',horizon:'#786349',tint:'255,214,148',opacity:.20,photo:.64,x:1070,y:60};
 const stage=stageGeometry(pose,assets.shoe||undefined);
 const dark=blend(brand.colors[0],light.base,.65);
 const gradient=ctx.createLinearGradient(0,0,1280,720);gradient.addColorStop(0,dark);gradient.addColorStop(1,blend(brand.colors[0],light.horizon,.48));ctx.fillStyle=gradient;ctx.fillRect(0,0,1280,720);
 if(assets.background){
  const img=assets.background;const zoom=1.12+clamp((140-pose.z)/1800,0,.1);
  const scale=Math.max(1280/img.width,720/img.height)*zoom;
  ctx.save();ctx.globalAlpha=light.photo;ctx.drawImage(img,(1280-img.width*scale)/2+stage.parallax.x,(720-img.height*scale)/2+stage.parallax.y,img.width*scale,img.height*scale);ctx.restore();
 }
 const shade=ctx.createLinearGradient(0,0,1280,0);shade.addColorStop(0,'rgba(5,10,16,.88)');shade.addColorStop(.5,'rgba(5,10,16,.30)');shade.addColorStop(1,'rgba(5,10,16,.68)');ctx.fillStyle=shade;ctx.fillRect(0,0,1280,720);
 // Change the environment lighting, preserving uploaded product colors and brand panels.
 const daylight=ctx.createRadialGradient(light.x,light.y,0,light.x,light.y,1000);daylight.addColorStop(0,`rgba(${light.tint},${light.opacity})`);daylight.addColorStop(1,`rgba(${light.tint},0)`);ctx.fillStyle=daylight;ctx.fillRect(0,0,1280,720);
 // A consistent environment lets the camera movement carry the edit.
 const tint=rgb(brand.colors[2]).join(',');
 const glow=ctx.createRadialGradient(pose.x-80,300,10,pose.x-80,300,450);glow.addColorStop(0,`rgba(${tint},.15)`);glow.addColorStop(1,`rgba(${tint},0)`);ctx.fillStyle=glow;ctx.fillRect(0,100,1280,570);
 // Project a shallow studio plinth in world space, driven by the same camera.
 const polygon=points=>{ctx.beginPath();points.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.closePath();};
 ctx.save();
 const front=stage.top.slice(16).concat([stage.top[0],stage.bottom[0]],stage.bottom.slice(16).reverse());
 const face=ctx.createLinearGradient(0,stage.center.y-10,0,stage.center.y+65);face.addColorStop(0,blend(brand.colors[0],'#3a4049',.35));face.addColorStop(1,'#070b12');ctx.fillStyle=face;polygon(front);ctx.fill();
 const surface=ctx.createLinearGradient(pose.x-220,stage.center.y-65,pose.x+180,stage.center.y+45);surface.addColorStop(0,blend(brand.colors[0],'#68717e',.4));surface.addColorStop(1,blend(brand.colors[0],'#0b101a',.55));ctx.fillStyle=surface;polygon(stage.top);ctx.fill();
 ctx.strokeStyle=`rgba(${tint},.30)`;ctx.lineWidth=1;ctx.stroke();
 // Contact shadow moves with the floor rather than wobbling independently.
 ctx.translate(stage.center.x,stage.center.y);ctx.scale(1,.16);
 const shadow=ctx.createRadialGradient(0,0,5,0,0,190);shadow.addColorStop(0,'rgba(0,0,0,.65)');shadow.addColorStop(1,'rgba(0,0,0,0)');ctx.fillStyle=shadow;ctx.fillRect(-200,-200,400,400);ctx.restore();

}

function signature(ctx,assets,brand,index,local,length,shot){
 ctx.textBaseline='top';ctx.textAlign='left';
 if(assets.logo)contain(ctx,assets.logo,{x:56,y:40,w:184,h:44});else copy(ctx,brand.name,{x:56,y:43,w:370,h:48},2,'#fff',25,0);
 const color='#fff';ctx.save();ctx.globalAlpha=.55;
 const label=brand.category||brand.name;const labelFit=fitCopy(ctx,label,314,36,14);
 copy(ctx,labelFit.lines.length*labelFit.lineHeight<=36?label:brand.name,{x:910,y:50,w:314,h:36},2,color,14,0);ctx.restore();
 // Three fine rules indicate the story's pacing without adding fake content.
 for(let i=0;i<3;i++){ctx.save();ctx.globalAlpha=.18;ctx.fillStyle=i===index?color:'#fff';ctx.fillRect(56+i*64,671,48,2);ctx.restore();if(i===index){ctx.fillStyle=brand.colors[2];ctx.fillRect(56+i*64,671,48*clamp(local/length),2);}}
}

const sameCopy=(a,b)=>String(a).trim().replace(/[.!?]+$/,'').toLowerCase()===String(b).trim().replace(/[.!?]+$/,'').toLowerCase();
function typography(ctx,result,index,local,length,speed,shot){
 const {brand}=result.input;const {plan}=result;
 const exit=index<2?1-smooth((local-length+.16)/.16):1;
 const delay=index===1?.72:index===2?.16:0;
 const enter=Math.max(0,local-delay+.06);
 const t=enter*speed;
 ctx.save();ctx.globalAlpha=exit*ease((local-delay)/.28);
 const x=index===0?64:694;const width=index===0?540:510;
 const color='#fff';
 // A short rule grows before the headline, then the copy rises through a mask.
 ctx.save();ctx.globalAlpha*=ease(t/.45);ctx.fillStyle=brand.colors[2];ctx.fillRect(x,164,70*ease(t/.65),4);ctx.restore();
 if(index===0){
  const fit=copy(ctx,plan.headline,{x,y:202,w:width,h:275},t,color,84,.045);
  const y=Math.min(509,202+fit.lines.length*fit.lineHeight+32);
  copy(ctx,sameCopy(plan.scenes[0].text,plan.headline)?plan.supporting:plan.scenes[0].text,{x,y,w:width-20,h:102},t-.24,color,25,.04);
 }else if(index===1){
  copy(ctx,plan.scenes[1].text,{x,y:205,w:width,h:295},t,color,60,.045);
  ctx.save();ctx.globalAlpha*=.65;copy(ctx,brand.tagline,{x,y:548,w:width,h:76},t-.22,color,23,.04);ctx.restore();
 }else{
  copy(ctx,brand.product,{x,y:200,w:width,h:160},t,color,58,.045);
  ctx.save();ctx.globalAlpha*=.7;copy(ctx,sameCopy(plan.scenes[2].text,plan.cta)?brand.tagline:plan.scenes[2].text,{x,y:382,w:width,h:74},t-.1,color,25,.04);ctx.restore();
  copy(ctx,brand.price,{x,y:466,w:width,h:55},t-.18,color,38);
  const reveal=ease((t-.28)/.25);ctx.save();ctx.globalAlpha*=reveal;const y=540+18*(1-reveal);
  ctx.fillStyle=brand.colors[2];ctx.beginPath();ctx.roundRect(x,y,width,96,5);ctx.fill();
  const ctaInk=ink(brand.colors[2]);const ctaFit=fitCopy(ctx,plan.cta,width-89,72,26);const textY=y+(96-ctaFit.lines.length*ctaFit.lineHeight)/2;
  copy(ctx,plan.cta,{x:x+24,y:textY,w:width-89,h:72},t-.28,ctaInk,26,0);
  ctx.strokeStyle=ctaInk;ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(x+width-51,y+48);ctx.lineTo(x+width-26,y+48);ctx.moveTo(x+width-34,y+40);ctx.lineTo(x+width-26,y+48);ctx.lineTo(x+width-34,y+56);ctx.stroke();ctx.restore();
 }
 ctx.restore();
}

export function renderMotion(canvas,assets,result,seconds=0,{music=true}={}){
 const ctx=canvas.getContext('2d');const duration=result.input.duration;
 const time=clamp(Number.isFinite(seconds)?seconds:0,0,duration-.001);const track=musicFor(result);
 const shot=editAt(duration,time,result.input.mood,track.bpm);const index=shot.act,local=shot.actLocal,length=shot.actEnd-shot.actStart;
 const speed=result.input.mood==='Calm'?.82:result.input.mood==='Bold'?1.28:1.08;
 const pose=cameraPose(shot,result.input.mood);const {brand}=result.input;
 ctx.save();ctx.scale(canvas.width/1280,canvas.height/720);ctx.globalAlpha=1;
 backdrop(ctx,assets,brand,pose,result.input.time);
 signature(ctx,assets,brand,index,local,length,shot);
 typography(ctx,result,index,local,length,speed,shot);
 // One textured plane with perspective; the clip protects copy during close-ups.
 ctx.save();ctx.beginPath();ctx.rect(clamp(pose.x-316,16,632),110,632,538);ctx.clip();
 if(assets.shoe)drawProjectedProduct(ctx,assets.shoe,pose);
 else{ctx.translate(pose.x,pose.y);ctx.rotate(pose.rz);const depth=1200/(1200+pose.z);ctx.transform(Math.cos(pose.ry)*depth,0,Math.sin(pose.rx)*.2,Math.cos(pose.rx)*depth,0,0);ctx.textBaseline='top';ctx.textAlign='left';copy(ctx,brand.product,{x:-pose.w/2,y:-pose.h/2+90,w:pose.w,h:pose.h-120},time+.2,'#fff',72);}
 ctx.restore();
 if(music){
  // CC BY attribution travels with the recording, including in standalone video exports.
  ctx.fillStyle='rgba(5,10,16,.9)';ctx.fillRect(0,685,1280,35);ctx.fillStyle='#e2e7ec';ctx.textBaseline='top';ctx.textAlign='left';
  const credit=`Music: ${track.title} / Kevin MacLeod (incompetech.com) / CC BY 4.0 / creativecommons.org/licenses/by/4.0 / edited excerpt`;
  const fit=fitCopy(ctx,credit,1168,22,12);ctx.font=`${fit.size}px Arial, sans-serif`;ctx.fillText(credit,56,697);
 }
 ctx.restore();
}
