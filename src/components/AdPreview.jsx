import {createInstrumental,musicFor,musicCredit} from '../lib/music.mjs';
import { useEffect, useRef, useState } from 'react';
import { Play, Pause, Volume2, VolumeX, Maximize, Download, Image as ImageIcon, FileJson, Check, Clock3, BarChart3, Sparkles, ChevronDown, X, Music2 } from 'lucide-react';
import { loadAssets, drawAd, exportVideo } from '../lib/renderer.mjs';
import { downloadBlob, downloadJSON } from '../lib/storage.mjs';
import MusicPicker from './MusicPicker.jsx';

export default function AdPreview(props) {
  if(!props.result)return <section className="panel preview-panel"><h2>Your ad preview</h2><p className="panel-intro">Created from your story and brand assets.</p><div className="preview-empty"><ImageIcon size={44}/><h3>No ad yet</h3><p>Set up your Brand Kit, share your story, then create an ad with AMD.</p><button className="secondary" onClick={props.onBrand} disabled={props.busy}>Set up Brand Kit</button></div></section>;
  return <GeneratedPreview {...props}/>;
}
function GeneratedPreview({ result, onRate, onMusicChoice, notify, busy, onExportState, draftChanged }) {
  const canvas = useRef(null); const stage = useRef(null); const assets = useRef(null); const audio = useRef(null); const exporting = useRef(null);
  const [ready, setReady] = useState(false); const [playing, setPlaying] = useState(false); const [seconds, setSeconds] = useState(0); const [sound, setSound] = useState(true); const [exportProgress, setExportProgress] = useState(null); const [menu, setMenu] = useState(false); const [loadError, setLoadError] = useState('');
  const position=useRef(0); position.current=seconds;
  useEffect(() => {
    let active = true; assets.current=null; setReady(false); setLoadError(''); setPlaying(false); setSeconds(0);
    loadAssets(result.input.brand).then(value => { if (active) {assets.current = value; setReady(true); drawAd(canvas.current, value, result, 0); } }).catch(error => { if (active) setLoadError(error.message); });
    return () => { active = false;assets.current=null; };
  }, [result.id]);
  useEffect(() => { if (ready && assets.current)try{drawAd(canvas.current, assets.current, result, seconds,{music:sound});}catch(error){setLoadError(error.message);setReady(false);setPlaying(false);} }, [ready, seconds, result, sound]);
  useEffect(() => {
    if (!playing) return;
    let frame; let elapsed = seconds; let last = performance.now();
    const tick = (now) => { elapsed += Math.max(0, now - last) / 1000; last = now; if (elapsed >= result.input.duration) { setSeconds(0); setPlaying(false); } else { setSeconds(elapsed); frame = requestAnimationFrame(tick); } };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [playing, result.input.duration]);
  useEffect(() => { let active=true; if(playing&&sound)createInstrumental(result).then(player=>{if(active){audio.current=player;player.play(position.current);}else player.stop();}).catch(error=>{if(active){setSound(false);notify(error.message,'error');}}); return()=>{active=false;audio.current?.stop();audio.current=null;}; },[playing,sound,result.id,result.musicChoice]);
  useEffect(() => () => { exporting.current?.abort(); }, []);
  const disabled = busy || exportProgress !== null || !ready;
  async function savePNG() {
    setMenu(false);
    try { const blob = await new Promise(resolve => canvas.current.toBlob(resolve, 'image/png')); if (!blob) throw new Error('The image could not be exported.'); downloadBlob(blob, `pov-${result.id}.png`); notify('PNG downloaded.'); } catch (e) { notify(e.message, 'error'); }
  }
  async function saveVideo() {
    setMenu(false); setPlaying(false); setExportProgress(0); onExportState(true); exporting.current = new AbortController();
    try { await exportVideo(result, assets.current, sound, setExportProgress, exporting.current.signal); notify('WebM video downloaded.'); }
    catch (e) { notify(e.message, 'error'); }
    finally { setExportProgress(null); onExportState(false); exporting.current = null; }
  }
  const modelTime = result.generationMs < 1000 ? `${result.generationMs} ms` : `${(result.generationMs / 1000).toFixed(1)} seconds`;
  const music=musicFor(result);
  const downloadControl=<div className="download-group"><button className="secondary" onClick={()=>setMenu(!menu)} disabled={disabled} aria-expanded={menu}><Download size={16}/> Download <ChevronDown size={14}/></button>{menu?<><button className="menu-scrim" aria-label="Close download menu" onClick={()=>setMenu(false)}/><div className="download-menu"><button onClick={savePNG}><ImageIcon size={16}/> PNG image</button><button onClick={saveVideo}><Play size={16}/> WebM video Â· {result.input.duration}s</button><button onClick={()=>{setMenu(false);downloadJSON({...result,visual:{method:assets.current?.shoe?'photo-animation':'typography'},soundtrack:{...musicFor(result),credit:musicCredit(result),includedInVideo:sound}},`pov-${result.id}.json`);notify('Ad plan downloaded.');}}><FileJson size={16}/> Plan & metrics JSON</button></div></>:null}</div>;
  return <section className="panel preview-panel">
    <div className="preview-heading"><div><h2>Your ad preview</h2><p className="panel-intro">Created from your story and brand assets.</p></div>{downloadControl}</div>
    <div className="applied-preferences"><span>{draftChanged?'Previous version':'Applied preferences'}</span><strong>{result.input.time} Â· {result.input.mood} Â· {result.input.duration}s</strong></div>
    {draftChanged?<p className="preview-draft-notice" role="status">Inputs have changed. Create an updated ad to refresh this preview and its soundtrack recommendations.</p>:null}
    <div className="ad-stage" ref={stage}>
      <canvas ref={canvas} width={1280} height={720} aria-label={`Ad ${result.input.brand.name}: ${result.plan.headline}`} role="img"/>
      {loadError?<div className="media-error" role="alert">{loadError}</div>:!ready?<div className="media-loading"><span className="spinner"/> Preparing product preview...</div>:null}
      {exportProgress!==null?<div className="export-overlay"><span className="spinner"/><strong>Exporting video Â· {exportProgress}%</strong><p>Keep this tab open.</p><button onClick={()=>exporting.current?.abort()}><X size={14}/> Cancel</button></div>:null}
      <div className="player-controls"><button aria-label={playing?'Pause ad':'Play ad'} onClick={()=>setPlaying(!playing)} disabled={disabled}>{playing?<Pause size={16} fill="currentColor"/>:<Play size={16} fill="currentColor"/>}</button><span>{`00:${String(Math.floor(seconds)).padStart(2,'0')} / 00:${result.input.duration}`}</span><input type="range" aria-label="Video position" min={0} max={result.input.duration-.01} step={.1} value={seconds} onChange={e=>{setPlaying(false);setSeconds(Number(e.target.value));}} disabled={disabled}/><button aria-label={sound?'Mute music':'Enable instrumental music'} onClick={()=>setSound(!sound)} disabled={disabled}>{sound?<Volume2 size={18}/>:<VolumeX size={18}/>}</button><button aria-label="Full screen" onClick={()=>{if(document.fullscreenElement)document.exitFullscreen().catch(()=>notify('Unable to exit full screen.','error'));else stage.current.requestFullscreen?.().catch(()=>notify('Full screen is unavailable.','error'));}} disabled={disabled}><Maximize size={18}/></button></div>
    </div>
    <MusicPicker key={result.id} result={result} onSelect={onMusicChoice} onPreviewStart={()=>setPlaying(false)} videoPlaying={playing} busy={disabled} muted={!sound} notify={notify}/>
    <div className="preview-actions"><div className="rating-control"><span>Does it feel like you?</span><div role="group" aria-label="Rate relevance">{[1,2,3,4,5].map(n=><button key={n} className={result.rating===n?'selected':''} aria-label={`Relevance ${n} out of 5`} onClick={()=>onRate(n)} disabled={busy||exportProgress!==null}>{n}</button>)}</div></div><span className="result-meta">{result.model} Â· {modelTime}</span></div>
    <div className="scene-grid scene-overview">{result.plan.scenes.map((scene,i)=><div key={i}><span className="scene-number">0{i+1}</span><div><span className="scene-title">0{i+1} Â· {scene.title}</span><span className="scene-time">{Math.round(i*result.input.duration/3)}â€“{Math.round((i+1)*result.input.duration/3)} seconds</span><strong>{scene.text}</strong></div></div>)}</div>
    <details className="storyboard"><summary>Story & brand checks <ChevronDown size={14}/></summary><p>{result.plan.personalization}</p><p className="helper">Music: {music.reason}</p><p className="check-note">Logo, images, CTA, price and approved facts use your Brand Kit. Review the creative copy before publishing; these checks cannot verify every claim semantically.</p><div className="cost-note">Token: {result.usage?.total_tokens??'â€”'} Â· Inference cost: {result.cost===null?'not available':`$${result.cost.toFixed(6)}`} Â· Render: animated assets, not generated footage.</div></details>
  </section>;
}
