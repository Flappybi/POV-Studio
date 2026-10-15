import test from 'node:test';
import assert from 'node:assert/strict';
import {exportVideo} from '../src/lib/renderer.mjs';
test('recorder failure rejects without downloading the subsequent stopped recording',async t=>{
 const names=['window','document','MediaRecorder','HTMLCanvasElement','requestAnimationFrame','cancelAnimationFrame'];const previous=new Map(names.map(name=>[name,Object.getOwnPropertyDescriptor(globalThis,name)]));
 t.after(()=>{for(const name of names){const old=previous.get(name);if(old)Object.defineProperty(globalThis,name,old);else delete globalThis[name];}});
 let downloads=0;const noop=()=>{};const ctx=new Proxy({},{get:(_,key)=>key==='createLinearGradient'||key==='createRadialGradient'?()=>({addColorStop:noop}):key==='measureText'?text=>({width:text.length*10}):noop});
 const stream={getTracks:()=>[{stop:noop}]};class Recorder{static isTypeSupported(){return true;}state='inactive';start(){this.state='recording';queueMicrotask(()=>{this.onerror();this.state='inactive';this.onstop();});}stop(){this.state='inactive';}}
 globalThis.MediaRecorder=Recorder;globalThis.window={MediaRecorder:Recorder};globalThis.HTMLCanvasElement=class {};HTMLCanvasElement.prototype.captureStream=noop;
 globalThis.document={createElement:type=>type==='canvas'?{width:1280,height:720,getContext:()=>ctx,captureStream:()=>stream}:{click:()=>downloads++}};globalThis.requestAnimationFrame=()=>1;globalThis.cancelAnimationFrame=noop;
 const brand={name:'Uji',product:'Produk',tagline:'Pesan',price:'Rp 100',colors:['#202020','#ffffff','#ff7426']};
 await assert.rejects(exportVideo({id:'test',input:{brand,duration:10,mood:'Calm'},plan:{headline:'Cerita',supporting:'Pesan',cta:'Lihat',scenes:[{}, {text:'Cerita'}, {}]}},{background:null,shoe:null,logo:null},false,noop),/recording failed/);
 assert.equal(downloads,0);
});
