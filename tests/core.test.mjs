import test from 'node:test';
import assert from 'node:assert/strict';
import {defaultBrand,validateInput,validatePlan,buildPrompt,tokenCost,validHistory,isExampleBrand} from '../src/lib/core.mjs';
import {input,plan} from './fixtures.mjs';
test('new application starts without sample brand or photos',()=>{
 assert.equal(defaultBrand.name,'');assert.equal(defaultBrand.product,'');
 assert.equal(defaultBrand.productImage,'');assert.equal(defaultBrand.backgroundImage,'');assert.deepEqual(defaultBrand.claims,[]);
});
test('rejects blank stories, oversized input and unsupported durations',()=>{
 assert.throws(()=>validateInput(input(' ')),/story/i);assert.throws(()=>validateInput(input('x'.repeat(501))),/500/);
 assert.throws(()=>validateInput({...input(),duration:1}),/duration/i);
});
test('text-only brand and uploaded assets are supported without default photos',()=>{
 assert.doesNotThrow(()=>validateInput(input()));
 const value=input();value.brand.backgroundImage='https://example.com/photo.png';assert.throws(()=>validateInput(value),/uploaded/);
});
test('brand checker rejects invented facts, CTA and broken scenes',()=>{
 const value=input();const good=plan(value);assert.equal(validatePlan(good,value.brand).brandName,'ACME');
 assert.throws(()=>validatePlan({...good,claims:['Fakta buatan']},value.brand),/facts/);
 assert.throws(()=>validatePlan({...good,cta:'Diskon 90%'},value.brand),/CTA/);
 assert.throws(()=>validatePlan({...good,scenes:[]},value.brand),/scenes/);
 assert.throws(()=>validatePlan({...good,audience:'https://example.com'},value.brand),/audience/i);
});
test('AMD prompt uses actual story and brand, not a fixed audience gallery',()=>{
 const value=input('Aku ingin merawat tanaman di apartemen.');value.brand.backgroundImage='data:image/png;base64,AA==';
 const messages=buildPrompt(value);assert.match(messages[0].content,/untrusted/i);assert.match(messages[0].content,/JSON/);
 assert.doesNotMatch(messages[0].content,/running\|basketball\|streetwear/);
 const data=JSON.parse(messages[1].content);assert.equal(data.brand.name,'ACME');assert.equal(data.story,value.story);
 assert.equal(data.brand.backgroundImage,undefined);
 assert.equal(data.assets.backgroundUploaded,true);
 const metadata=input();metadata.assets={productUploaded:true,backgroundUploaded:true};
 assert.deepEqual(JSON.parse(buildPrompt(metadata)[1].content).assets,metadata.assets);
});
test('unknown costs remain unavailable',()=>{
 assert.equal(tokenCost({prompt_tokens:100,completion_tokens:50},{}),null);
 assert.equal(tokenCost({prompt_tokens:1000000,completion_tokens:1000000},{input:2,output:3}),5);
});
test('long audience descriptions fit the label without rewriting ad copy',()=>{const value=input();const raw={...plan(value),audience:'A design student who walks through the city in the morning, pausing to draw anything that catches their eye.'};const parsed=validatePlan(raw,value.brand);assert.ok(parsed.audience.length<=80);assert.equal(parsed.headline,raw.headline);assert.throws(()=>validatePlan({...raw,audience:'x'.repeat(90)+' https://example.com'},value.brand),/audience/i);});
test('legacy sample content is excluded while real uploaded brands are preserved',()=>{
 const good={id:'one',input:input(),plan:plan(),mode:'amd',model:'test-model',createdAt:new Date().toISOString(),generationMs:5,rating:null,cost:null,usage:null};
 assert.equal(validHistory([good,{...good,mode:'demo'},{...good,model:{}},{...good,input:{}}]).length,1);
 const legacy={name:'STRIDE',product:'Stride Everyday',category:'Sepatu lari',tagline:'Setiap langkah punya cerita.',cta:'Mulai langkahmu',price:'Rp 899.000',colors:['#202020','#ffffff','#ff7426'],claims:['Sepatu untuk aktivitas sehari-hari','Desain mesh putih dengan aksen oranye'],productImage:'',logo:''};
 assert.equal(isExampleBrand(legacy),true);
 assert.equal(isExampleBrand({...legacy,price:'Rp 500.000'}),false);
 assert.equal(isExampleBrand({...legacy,backgroundImage:'data:image/png;base64,AA=='}),false);
 assert.equal(isExampleBrand({...good.input.brand}),false);
});
