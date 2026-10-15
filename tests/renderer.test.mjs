import test from 'node:test';
import assert from 'node:assert/strict';
import { drawAd } from '../src/lib/renderer.mjs';
import { testBrand as defaultBrand, plan as demoPlan } from './fixtures.mjs';
test('negative first-frame timestamps render the first scene without crashing', () => {
  const noop = () => {};
  const ctx = new Proxy({}, { get:(_target,key) => key === 'createLinearGradient' || key === 'createRadialGradient' ? () => ({addColorStop:noop}) : key === 'measureText' ? text => ({width:text.length*15}) : noop });
  const canvas = { width:1280,height:720,getContext:()=>ctx };
  const image = {width:1280,height:720};
  const assets = {background:null,shoe:null,logo:null};
  const input = {brand:defaultBrand,story:'Aku lari pagi',duration:15,time:'Morning',mood:'Energetic'};
  const result = {plan:demoPlan(input),input};
  assert.doesNotThrow(() => drawAd(canvas,assets,result,-.01));
  assert.doesNotThrow(() => drawAd(canvas,assets,result,NaN));
});
