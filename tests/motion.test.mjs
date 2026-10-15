import test from 'node:test';
import assert from 'node:assert/strict';
import {drawAd} from '../src/lib/renderer.mjs';
import {fitCopy} from '../src/lib/motion.mjs';
const brand={name:'BRAND UJI',product:'Produk uji',tagline:'Pesan utama',cta:'Lihat produk',price:'Rp 100.000',colors:['#173f35','#fff4df','#c96b3d']};
const result={input:{brand,duration:15,mood:'Calm'},plan:{headline:'Awal ceritamu',supporting:'Pesan relevan',scenes:[{text:'Awal'},{text:'Momen yang berarti'},{text:'Akhir'}],cta:brand.cta}};
function render(time,ratio=1,value=result){const calls=[];const noop=()=>{};const ctx=new Proxy({font:'700 20px Arial'},{get:(target,key)=>key==='font'?target.font:key==='createLinearGradient'||key==='createRadialGradient'?()=>({addColorStop:noop}):key==='measureText'?text=>({width:[...text].reduce((sum,c)=>sum+(c==='W'?.95:.6),0)*parseFloat(target.font.split(' ')[1])}):(...args)=>calls.push([key,...args])});drawAd({width:1280,height:720,getContext:()=>ctx},{shoe:{width:500*ratio,height:500},background:null,logo:null},value,time);return calls;}
test('CTA only appears in closing scene',()=>{for(const time of [1,6])assert.ok(!render(time).some(c=>c[0]==='fillText'&&c[1]===brand.cta));assert.ok(render(12).some(c=>c[0]==='fillText'&&c[1]===brand.cta));});
function vertices(calls){const start=calls.findIndex(c=>c[0]==='rect'&&c[3]===632&&c[4]===538);return calls.slice(start).filter(c=>['moveTo','lineTo'].includes(c[0])).map(c=>({x:c[1],y:c[2]}));}
test('product uses large independent space and changes composition',()=>{const first=vertices(render(1));const second=vertices(render(6));assert.ok(Math.max(...first.map(p=>p.x))-Math.min(...first.map(p=>p.x))>=400);assert.ok(first[0].x>second[0].x+300);});
test('product perspective changes within an individual scene',()=>{assert.notDeepEqual(render(1).find(c=>c[0]==='transform'),render(2).find(c=>c[0]==='transform'));});
test('wide and tall images project to finite, nondegenerate triangles at invalid and final times',()=>{for(const time of [-1,NaN,0,5,10,15,99])for(const ratio of [.2,5]){for(const c of render(time,ratio).filter(c=>c[0]==='transform')){assert.ok(c.slice(1).every(Number.isFinite));assert.ok(Math.abs(c[1]*c[4]-c[2]*c[3])>0);}}});
test('valid multiline and long unbroken copy fully fits its box',()=>{
 const ctx={font:'',measureText(text){return {width:text.length*parseFloat(this.font.split(' ')[1])*.6};}};
 for(const text of ['A\n'.repeat(44)+'A','W'.repeat(160)]){const fit=fitCopy(ctx,text,496,54,28);assert.ok(fit.lines.length*fit.lineHeight<=54);}
});

test('scene transitions draw one product and never overlay outgoing and incoming copy',()=>{
 for(const time of [5.1,5.25,10.1,10.25]){
  const calls=render(time);
  assert.equal(calls.filter(c=>c[0]==='rect'&&c[3]===632&&c[4]===538).length,1);
  assert.ok(calls.some(c=>c[0]==='drawImage'));
  const text=calls.filter(c=>c[0]==='fillText').map(c=>c[1]).join(' ');
  if(time<10)assert.ok(!text.includes(result.plan.headline));
  else assert.ok(!text.includes(result.plan.scenes[1].text));
 }
});

test('product position remains continuous across scene boundaries',()=>{
 for(const boundary of [5,10]){
  const before=render(boundary-.00001).find(c=>c[0]==='transform');
  const after=render(boundary+.00001).find(c=>c[0]==='transform');
  assert.ok(Math.hypot(before[5]-after[5],before[6]-after[6])<.5,'product must not teleport between camera targets');
 }
});

test('maximum legal CTA fits its actual closing box and oversized category uses brand signature',()=>{
 const value=structuredClone(result);value.input.brand.category='W'.repeat(160);value.plan.cta='W'.repeat(160);
 const calls=render(14,1,value);
 assert.ok(!calls.some(c=>c[0]==='fillText'&&/^W+$/.test(c[1])&&c[3]===50),'category must not be clipped in the small header');
 const box=calls.find(c=>c[0]==='rect'&&c[1]===718);
 assert.ok(box,'CTA mask exists');
 const ctx={font:'',measureText(text){return {width:text.length*.95*parseFloat(this.font.split(' ')[1])};}};
 const fit=fitCopy(ctx,value.plan.cta,box[3],box[4]-8,26);
 assert.ok(fit.lines.length*fit.lineHeight<=box[4]-8,'full CTA must fit inside its visible mask');
});
