import { useEffect, useRef, useState } from 'react';
import { ArrowRight, Bell, X, CheckCircle2, AlertCircle, Settings2, Cpu, ExternalLink, Film, Image as ImageIcon, BarChart3 } from 'lucide-react';
import StudioForm from './components/StudioForm.jsx';
import AdPreview from './components/AdPreview.jsx';
import BrandEditor from './components/BrandEditor.jsx';
import Results from './components/Results.jsx';
import SplashScreen from './components/SplashScreen.jsx';
import { defaultBrand, validateInput, validHistory, isExampleBrand } from './lib/core.mjs';
import { readStored, writeStored } from './lib/storage.mjs';
import { MUSIC_CHOICE_IDS } from './lib/music.mjs';

function initialBrand() { const b=readStored('brand',defaultBrand); if(isExampleBrand(b))return structuredClone(defaultBrand); try { validateInput({brand:b, story:'test', duration:15, time:'Morning', mood:'Energetic'}); return {...b,backgroundImage:b.backgroundImage||''}; } catch { return structuredClone(defaultBrand); } }
export default function App() {
  const [showSplash,setShowSplash]=useState(true);
  useEffect(()=>{const timer=setTimeout(()=>setShowSplash(false),1500);return()=>clearTimeout(timer);},[]);
  const [brand,setBrand]=useState(initialBrand);
  const [form,setForm]=useState(() => ({story:'',time:'Morning',mood:'Energetic',duration:15}));
  const [result,setResult]=useState(null);
  const [history,setHistory]=useState(() => validHistory(readStored('history',[])));
  const [page,setPage]=useState('Studio'); const [status,setStatus]=useState(null); const [busy,setBusy]=useState(false); const [exporting,setExporting]=useState(false); const [progress,setProgress]=useState(''); const [toast,setToast]=useState(null); const [connection,setConnection]=useState(false); const [notice,setNotice]=useState(false); const [deleteId,setDeleteId]=useState(null);
  const toastTimer=useRef(); const abort=useRef();
  const dialogOpener=useRef(null);
  function openConnection(){dialogOpener.current=document.activeElement;setConnection(true);}
  function requestDelete(id){dialogOpener.current=document.activeElement;setDeleteId(id);}
  function notify(message,type='success') { clearTimeout(toastTimer.current); setToast({message,type}); toastTimer.current=setTimeout(() => setToast(null),6000); }
  useEffect(() => { fetch('/api/status').then(r=>{if(!r.ok)throw new Error();return r.json();}).then(setStatus).catch(()=>setStatus({mode:'offline',configured:false})); return()=>{abort.current?.abort();clearTimeout(toastTimer.current);}; },[]);
  useEffect(() => {
    if (!connection && !deleteId) return;
    const previousFocus = dialogOpener.current;
    const dialog = document.querySelector('[role="dialog"]');
    const handleKey = event => {
      if (event.key === 'Escape') { setConnection(false); setDeleteId(null); }
      if (event.key !== 'Tab' || !dialog) return;
      const controls = [...dialog.querySelectorAll('button:not(:disabled), a[href], input:not(:disabled)')];
      const first = controls[0]; const last = controls.at(-1);
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    };
    document.addEventListener('keydown', handleKey);
    return () => { document.removeEventListener('keydown', handleKey); queueMicrotask(()=>{if(previousFocus?.isConnected&&!previousFocus.disabled)previousFocus.focus();else document.querySelector('.workspace-header h1')?.focus();}); };
  }, [connection,deleteId]);
  function saveHistory(next) { setHistory(next); if(!writeStored('history',next)) notify('The ad is ready, but browser storage is full. Export your data or remove older ads.','error'); }
  async function generate(event) {
    event.preventDefault(); if(busy||exporting)return;
    const input={...form,brand:structuredClone(brand)};
    try { validateInput(input); } catch(e) { notify(e.message,'error'); return; }
    setBusy(true); setProgress('Creating your story…'); const start=performance.now();
    abort.current=new AbortController(); const timeout=setTimeout(()=>abort.current.abort(),status?.requestTimeoutMs || 250000);
    const progressTimer=setInterval(()=>setProgress(previous=>status?.configured && performance.now()-start>10000 ? 'Waiting for AMD…' : previous==='Creating your story…'?'Checking your Brand Kit…':'Preparing your ad…'),1800);
    try {
      const {logo,productImage,backgroundImage,...metadataBrand}=input.brand;
      const response=await fetch('/api/generate',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...input,brand:metadataBrand,assets:{productUploaded:Boolean(productImage),backgroundUploaded:Boolean(backgroundImage)}}),signal:abort.current.signal});
      const data=await response.json(); if(!response.ok)throw new Error(data.error||'The ad could not be created.');
      const next={...data,id:crypto.randomUUID(),input,createdAt:new Date().toISOString(),rating:null,totalMs:Math.round(performance.now()-start)};
      setResult(next);saveHistory([next,...history].slice(0,12));notify('Your personalized ad was created with AMD.');
    } catch(e) { notify(e.name==='AbortError'?'The request timed out. Please try again.':e.message==='Failed to fetch'?'The server is unavailable. Start the app with npm run dev.':e.message,'error'); }
    finally {setBusy(false);clearTimeout(timeout);clearInterval(progressTimer);abort.current=null;}
  }
  function chooseMusic(musicChoice) { if(!result||busy||exporting||!MUSIC_CHOICE_IDS.includes(musicChoice))return; const next={...result,musicChoice};setResult(next);saveHistory(history.map(item=>item.id===next.id?next:item)); }
  function rate(rating) { if(!result)return; const next={...result,rating};setResult(next);saveHistory(history.map(item=>item.id===next.id?next:item)); }
  function saveBrand(next) { setBrand(next); const saved=writeStored('brand',next);setResult(null);setPage('Studio');notify(saved?'Brand Kit saved. Create an ad with your updated identity.':'Brand Kit updated, but browser storage is full and changes could not be saved.',saved?'success':'error'); }
  function resetBrand() { const empty=structuredClone(defaultBrand); setBrand(empty); setResult(null); const saved=writeStored('brand',empty); notify(saved?'Brand Kit cleared.':'Brand Kit cleared, but the change could not be saved in this browser.',saved?'success':'error'); }
  function openResult(item) {setResult(item);setForm({...item.input,brand:undefined});setBrand(item.input.brand);setPage('Studio');window.scrollTo({top:0,behavior:'smooth'});}
  const locked=busy||exporting;
  return <>{showSplash?<SplashScreen/>:null}<div className="app-content" inert={showSplash?true:undefined}><aside className="app-sidebar"><a className="app-logo" href="#" onClick={e=>{e.preventDefault();if(!locked)setPage('Studio');}}><span className="pov-symbol"/><strong>POV <span>Studio</span></strong></a><nav aria-label="Main navigation">{['Studio','Brand Kit','Results'].map(tab=>{const Icon=tab==='Studio'?Film:tab==='Brand Kit'?ImageIcon:BarChart3;return <button className={page===tab?'active':''} aria-current={page===tab?'page':undefined} onClick={()=>setPage(tab)} disabled={locked} key={tab}><Icon size={19}/><span>{tab}</span>{tab==='Results'&&history.length?<span className="nav-count">{history.length}</span>:null}</button>;})}</nav><div className="sidebar-footer">Advertising From Your POV<span>POV Studio</span></div></aside><div className="workspace"><header className="workspace-header"><div><h1 tabIndex={-1}>{page==='Studio'?'Ad studio':page==='Brand Kit'?'Brand Kit':'Your ads'}</h1><p>{page==='Studio'?'One brand. A story that feels like yours.':page==='Brand Kit'?'A consistent identity for every story.':'All the stories you have created.'}</p></div><div className="header-actions"><button className={`mode-badge ${status?.configured?'amd':''}`} onClick={openConnection}><span/>{status?.configured?'AMD configured':status?.mode==='offline'?'Backend offline':'Connect AMD'}</button><button className="icon-button notification-button" aria-label="App information" onClick={()=>setNotice(!notice)}><Bell size={19}/>{history.length?<span/>:null}</button></div></header>
    <main>{page==='Studio'?<><div className="studio-grid"><StudioForm brand={brand} form={form} setForm={setForm} busy={locked} progress={progress} onGenerate={generate} onBrand={()=>{if(!locked)setPage('Brand Kit');}}/><AdPreview result={result} onBrand={()=>{if(!locked)setPage('Brand Kit');}} onRate={rate} onMusicChoice={chooseMusic} notify={notify} busy={busy} onExportState={setExporting}/></div></>:page==='Brand Kit'?<BrandEditor brand={brand} onSave={saveBrand} onReset={resetBrand} onBack={()=>setPage('Studio')} notify={notify}/>:<Results history={history} onOpen={openResult} onDelete={requestDelete} onStudio={()=>setPage('Studio')}/>}</main>
    <footer className="app-footer"><span>POV Studio <span className="footer-dot">·</span> Advertising From Your POV</span><button onClick={openConnection}><Cpu size={13}/>{status?.configured?'AMD model configured for personalization':'AMD is not configured'}<ArrowRight size={12}/></button></footer></div>
    {toast?<div className={`toast ${toast.type}`} role="status">{toast.type==='error'?<AlertCircle size={20}/>:<CheckCircle2 size={20}/>}<span>{toast.message}</span><button aria-label="Dismiss message" onClick={()=>setToast(null)}><X size={16}/></button></div>:null}
    {notice?<div className="notification-popover"><div><strong>Welcome to POV Studio</strong><button className="icon-button" aria-label="Dismiss information" onClick={()=>setNotice(false)}><X size={16}/></button></div><p>Share your story, create an ad, then rate its relevance. Results are saved in this browser.</p><span>{history.length} saved ads · {status?.configured?'AMD configured':'not configured'}</span></div>:null}
    {connection?<div className="modal-backdrop" onClick={()=>setConnection(false)}><section className="modal" role="dialog" aria-modal="true" aria-labelledby="connection-title" onClick={e=>e.stopPropagation()}><button className="modal-close icon-button" aria-label="Close settings" onClick={()=>setConnection(false)} autoFocus><X size={20}/></button><div className="modal-icon"><Settings2 size={26}/></div><h2 id="connection-title">AMD connection</h2><p>{status?.configured?`Model ${status.model} is configured on the server.`:'Connect AMD to create ads from user stories.'}</p><ol><li>Copy <code>.env.example</code> to <code>.env</code>.</li><li>Set <code>AMD_BASE_URL</code>, <code>AMD_MODEL</code>, dan <code>AMD_API_KEY</code> from your AMD account.</li><li>Restart the app. Your API key stays on the server.</li></ol><p className="helper">Use an OpenAI-compatible chat completions endpoint. Set token prices only when known; unknown costs are not estimated.</p><a className="secondary" href="https://notebooks.amd.com/tokenfactory" target="_blank" rel="noreferrer">Open AMD Token Factory <ExternalLink size={15}/></a><button className="primary" onClick={()=>setConnection(false)}>Got it</button></section></div>:null}
    {deleteId?<div className="modal-backdrop"><section className="modal small-modal" role="dialog" aria-modal="true" aria-labelledby="delete-title"><h2 id="delete-title">Delete this ad?</h2><p>This removes the ad from this browser. Downloaded files are kept.</p><div className="editor-buttons"><button className="secondary" onClick={()=>setDeleteId(null)} autoFocus>Cancel</button><button className="primary" onClick={()=>{saveHistory(history.filter(item=>item.id!==deleteId));setDeleteId(null);notify('Ad deleted.');}}>Delete ad</button></div></section></div>:null}
  </div></>;
}
