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

export function editAt(duration,seconds,mood='Energetic'){
 const time=clamp(Number.isFinite(seconds)?seconds:0,0,duration-.001),actLength=duration/3;
 const perAct=Math.max(2,Math.round(actLength/(mood==='Bold'?1.3:1.65)));
 const length=actLength/perAct,act=Math.min(2,Math.floor(time/actLength));
 const within=Math.min(perAct-1,Math.floor((time-act*actLength)/length));
 const id=act*perAct+within,local=clamp(time-id*length,0,length);
 const transitions=mood==='Calm'?['zoom','rotate']:mood==='Bold'?['rotate','slide']:['zoom','slide'];
 return {id,act,within,perAct,total:perAct*3,length,local,progress:local/length,transition:transitions[id%transitions.length],look:['image','studio','paper'][(within+act)%3],actLocal:time-act*actLength};
}

function targetPose(shot,progress){
 const detail=shot.within%3===1;
 const last=shot.act===2&&shot.within===shot.perAct-1;
 const side=shot.act===0?1:-1;
 return {x:side===1?944:330,y:detail?382:388,w:detail?696:556,h:detail?638:510,
  rx:(detail?-.13:.09)+Math.sin(progress*Math.PI)*.055,
  ry:last?mix(-.14,.04,progress):mix(side*(detail?.3:-.25),side*(detail?-.2:.19),progress),
  rz:side*(detail?-.06:.045)*Math.cos(progress*Math.PI),
  z:last?mix(45,0,progress):mix(detail?-45:60,detail?-95:-20,progress)};
}
function camera(shot,time,speed){
 const target=targetPose(shot,shot.progress);const transition=clamp(shot.local/(.24/speed));
 if(shot.id>0){
  const previous={...shot,within:shot.within?shot.within-1:shot.perAct-1,act:shot.within?shot.act:shot.act-1};
  const from=targetPose(previous,1);const t=ease(transition);
  for(const key of Object.keys(target))target[key]=mix(from[key],target[key],t);
  const pulse=Math.sin(transition*Math.PI);
  if(shot.transition==='zoom')target.z-=200*pulse;
  if(shot.transition==='slide')target.x+=(shot.act===0?1:-1)*76*pulse;
  if(shot.transition==='rotate'){target.ry+=.32*pulse;target.rz-=.10*pulse;}
 }else target.z+=150*(1-ease(time/.35));
 target.y+=Math.sin(time*2)*3;
 return target;
}

function backdrop(ctx,assets,brand,seconds,duration,pose,speed,shot){
 const middle=shot.look==='paper'?1:0;
 const dark=blend(brand.colors[0],'#080d14',.65);
 const gradient=ctx.createLinearGradient(0,0,1280,720);gradient.addColorStop(0,dark);gradient.addColorStop(1,blend(brand.colors[0],'#10151b',.4));ctx.fillStyle=gradient;ctx.fillRect(0,0,1280,720);
 if(assets.background&&shot.look!=='studio'){
  const img=assets.background;const zoom=shot.within%3===1?1.30:1.10;
  const scale=Math.max(1280/img.width,720/img.height)*(zoom+shot.progress*.10);
  ctx.save();ctx.globalAlpha=.40;ctx.drawImage(img,(1280-img.width*scale)/2+Math.sin(seconds*.8)*24,(720-img.height*scale)/2-24*shot.progress,img.width*scale,img.height*scale);ctx.restore();
 }
 const shade=ctx.createLinearGradient(0,0,1280,0);shade.addColorStop(0,'rgba(5,10,16,.88)');shade.addColorStop(.5,'rgba(5,10,16,.24)');shade.addColorStop(1,'rgba(5,10,16,.38)');ctx.fillStyle=shade;ctx.fillRect(0,0,1280,720);
 // A brand-colored editorial panel replaces a second full-frame dissolve.
 ctx.save();ctx.globalAlpha=middle;ctx.fillStyle=brand.colors[1];ctx.beginPath();ctx.moveTo(662,0);ctx.lineTo(1280,0);ctx.lineTo(1280,720);ctx.lineTo(580,720);ctx.closePath();ctx.fill();ctx.restore();
 const glow=ctx.createRadialGradient(pose.x,pose.y+60,20,pose.x,pose.y+60,410);const tint=rgb(brand.colors[2]).join(',');glow.addColorStop(0,`rgba(${tint},.4)`);glow.addColorStop(1,`rgba(${tint},0)`);
 ctx.save();ctx.globalAlpha=.22;ctx.fillStyle=glow;ctx.beginPath();ctx.ellipse(pose.x,pose.y+60,390,310,0,0,Math.PI*2);ctx.fill();ctx.restore();
 // A tilted plane and floor establish a stage in depth, behind the image plane.
 const plane=projectProduct({width:600,height:470},{...pose,w:640,h:525,ry:-pose.ry*.7,rx:.22,rz:-pose.rz,z:180});
 ctx.save();ctx.globalAlpha=.12;ctx.fillStyle=brand.colors[2];ctx.beginPath();plane.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.closePath();ctx.fill();ctx.restore();
 ctx.save();ctx.globalAlpha=.09;ctx.strokeStyle=brand.colors[2];ctx.lineWidth=1;
 for(let i=-2;i<=2;i++){ctx.beginPath();ctx.moveTo(pose.x+i*32,548);ctx.lineTo(pose.x+i*145,720);ctx.stroke();}
 ctx.beginPath();ctx.ellipse(pose.x,635,260,35,-pose.rz,0,Math.PI*2);ctx.stroke();ctx.restore();
 // Soft ground contact keeps cutout products from feeling pasted onto the frame.
 const shadow=ctx.createRadialGradient(pose.x,633,6,pose.x,633,230);shadow.addColorStop(0,'rgba(0,0,0,.5)');shadow.addColorStop(1,'rgba(0,0,0,0)');
 ctx.save();ctx.translate(pose.x,633);ctx.scale(1,.16);ctx.fillStyle=shadow;ctx.translate(-pose.x,-633);ctx.fillRect(pose.x-235,398,470,470);ctx.restore();
}

function signature(ctx,assets,brand,index,local,length,shot){
 ctx.textBaseline='top';ctx.textAlign='left';
 if(assets.logo)contain(ctx,assets.logo,{x:56,y:40,w:184,h:44});else copy(ctx,brand.name,{x:56,y:43,w:370,h:48},2,'#fff',25,0);
 const color=shot.look==='paper'?ink(brand.colors[1]):'#fff';ctx.save();ctx.globalAlpha=.55;
 const label=brand.category||brand.name;const labelFit=fitCopy(ctx,label,314,36,14);
 copy(ctx,labelFit.lines.length*labelFit.lineHeight<=36?label:brand.name,{x:910,y:50,w:314,h:36},2,color,14,0);ctx.restore();
 // Three fine rules indicate the story's pacing without adding fake content.
 for(let i=0;i<3;i++){ctx.save();ctx.globalAlpha=.18;ctx.fillStyle=i===index?color:'#fff';ctx.fillRect(56+i*64,671,48,2);ctx.restore();if(i===index){ctx.fillStyle=brand.colors[2];ctx.fillRect(56+i*64,671,48*clamp(local/length),2);}}
}

function typography(ctx,result,index,local,length,speed,shot){
 const {brand}=result.input;const {plan}=result;
 const exit=index<2?1-smooth((local-length+.16)/.16):1;
 const enter=local+.06;
 const t=enter*speed;
 ctx.save();ctx.globalAlpha=exit;
 const x=index===0?64:694;const width=index===0?540:510;
 const color=index!==0&&shot.look==='paper'?ink(brand.colors[1]):'#fff';
 // A short rule grows before the headline, then the copy rises through a mask.
 ctx.save();ctx.globalAlpha*=ease(t/.45);ctx.fillStyle=brand.colors[2];ctx.fillRect(x,164,70*ease(t/.65),4);ctx.restore();
 if(index===0){
  const fit=copy(ctx,plan.headline,{x,y:202,w:width,h:275},t,color,84,.045);
  const y=Math.min(509,202+fit.lines.length*fit.lineHeight+32);
  copy(ctx,plan.supporting,{x,y,w:width-20,h:102},t-.24,color,25,.04);
 }else if(index===1){
  copy(ctx,plan.scenes[1].text,{x,y:205,w:width,h:295},t,color,60,.045);
  ctx.save();ctx.globalAlpha*=.65;copy(ctx,brand.tagline,{x,y:548,w:width,h:76},t-.22,color,23,.04);ctx.restore();
 }else{
  copy(ctx,brand.product,{x,y:200,w:width,h:160},t,color,58,.045);
  ctx.save();ctx.globalAlpha*=.7;copy(ctx,brand.tagline,{x,y:382,w:width,h:74},t-.1,color,25,.04);ctx.restore();
  copy(ctx,brand.price,{x,y:466,w:width,h:55},t-.18,color,38);
  const reveal=ease((t-.28)/.25);ctx.save();ctx.globalAlpha*=reveal;const y=540+18*(1-reveal);
  ctx.fillStyle=brand.colors[2];ctx.beginPath();ctx.roundRect(x,y,width,96,5);ctx.fill();
  const ctaInk=ink(brand.colors[2]);const ctaFit=fitCopy(ctx,plan.cta,width-89,72,26);const textY=y+(96-ctaFit.lines.length*ctaFit.lineHeight)/2;
  copy(ctx,plan.cta,{x:x+24,y:textY,w:width-89,h:72},t-.28,ctaInk,26,0);
  ctx.strokeStyle=ctaInk;ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(x+width-51,y+48);ctx.lineTo(x+width-26,y+48);ctx.moveTo(x+width-34,y+40);ctx.lineTo(x+width-26,y+48);ctx.lineTo(x+width-34,y+56);ctx.stroke();ctx.restore();
 }
 ctx.restore();
}

export function renderMotion(canvas,assets,result,seconds=0){
 const ctx=canvas.getContext('2d');const duration=result.input.duration;
 const time=clamp(Number.isFinite(seconds)?seconds:0,0,duration-.001);const length=duration/3;const index=Math.min(2,Math.floor(time/length));const local=time-index*length;
 const speed=result.input.mood==='Calm'?.82:result.input.mood==='Bold'?1.28:1.08;
 const shot=editAt(duration,time,result.input.mood);const pose=camera(shot,time,speed);const {brand}=result.input;
 ctx.save();ctx.scale(canvas.width/1280,canvas.height/720);ctx.globalAlpha=1;
 backdrop(ctx,assets,brand,time,duration,pose,speed,shot);
 signature(ctx,assets,brand,index,local,length,shot);
 typography(ctx,result,index,local,length,speed,shot);
 // One textured plane with perspective; the clip protects copy during close-ups.
 ctx.save();ctx.beginPath();ctx.rect(index===0?632:16,110,632,538);ctx.clip();
 if(assets.shoe)drawProjectedProduct(ctx,assets.shoe,pose);
 else{ctx.translate(pose.x,pose.y);ctx.rotate(pose.rz);const depth=1200/(1200+pose.z);ctx.transform(Math.cos(pose.ry)*depth,0,Math.sin(pose.rx)*.2,Math.cos(pose.rx)*depth,0,0);ctx.textBaseline='top';ctx.textAlign='left';copy(ctx,brand.product,{x:-pose.w/2,y:-pose.h/2+90,w:pose.w,h:pose.h-120},time+.2,'#fff',72);}
 ctx.restore();ctx.restore();
}
