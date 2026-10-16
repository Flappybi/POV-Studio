import { createInstrumental } from './music.mjs';
import { renderMotion as drawAd } from './motion.mjs';
import { downloadBlob } from './storage.mjs';
const images = new Map();
function loadImage(src) {
  if (!images.has(src)) images.set(src, new Promise((resolve, reject) => { const image = new Image(); image.onload = () => resolve(image); image.onerror = () => { images.delete(src); reject(new Error('The image asset could not be loaded.')); }; image.src = src; }));
  return images.get(src);
}
export async function loadAssets(brand) {
  const [background, shoe, logo] = await Promise.all([
    brand.backgroundImage ? loadImage(brand.backgroundImage) : Promise.resolve(null),
    brand.productImage ? loadImage(brand.productImage) : Promise.resolve(null), brand.logo ? loadImage(brand.logo) : Promise.resolve(null),
  ]);
  return { background, shoe, logo };
}
export { renderMotion as drawAd } from './motion.mjs';
export async function exportVideo(result, assets, music, onProgress, signal) {
  if (!window.MediaRecorder || !HTMLCanvasElement.prototype.captureStream) throw new Error('Your browser does not support video export. Use Chrome or Edge, or download a PNG.');
  const mime = ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm'].find(type => MediaRecorder.isTypeSupported(type));
  if (!mime) throw new Error('WebM export is not supported by your browser.');
  const canvas = document.createElement('canvas'); canvas.width = 1280; canvas.height = 720;
  drawAd(canvas, assets, result, 0,{music});
  if(signal?.aborted)throw new Error('Export canceled.');
  const stream = canvas.captureStream(30); let beat;
  try { beat = music ? await createInstrumental(result,{destination:true,monitor:false}) : null; } catch(error) {stream.getTracks().forEach(track=>track.stop());throw error;}
  if(signal?.aborted){stream.getTracks().forEach(track=>track.stop());beat?.stop();throw new Error('Export canceled.');}
  if (beat?.stream) beat.stream.getAudioTracks().forEach(track => stream.addTrack(track));
  const recorder = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 6000000, ...(music?{audioBitsPerSecond:192000}:{}) });
  const chunks = []; let frame; let stopped = false;
  const cleanup = () => { cancelAnimationFrame(frame); stream.getTracks().forEach(track => track.stop()); beat?.stop(); signal?.removeEventListener('abort', abort); };
  let rejectPromise;
  const abort = () => { stopped = true; if (recorder.state !== 'inactive') recorder.stop(); cleanup(); rejectPromise?.(new Error('Export canceled.')); };
  return new Promise((resolve, reject) => {
    rejectPromise = reject;
    signal?.addEventListener('abort', abort, { once: true });
    recorder.ondataavailable = e => { if (e.data.size) chunks.push(e.data); };
    recorder.onerror = () => { stopped = true; cleanup(); reject(new Error('Video recording failed. Try downloading a PNG.')); };
    recorder.onstop = () => { cleanup(); if (!stopped) { downloadBlob(new Blob(chunks, { type: 'video/webm' }), `pov-${result.id}.webm`); resolve(); } };
    recorder.start(250); beat?.play(); const start = performance.now();
    const render = () => { const seconds = (performance.now() - start) / 1000; drawAd(canvas, assets, result, Math.min(seconds, result.input.duration - .01),{music}); onProgress(Math.min(100, Math.round(seconds / result.input.duration * 100))); if (seconds >= result.input.duration) recorder.stop(); else frame = requestAnimationFrame(render); };
    frame = requestAnimationFrame(render);
  });
}
