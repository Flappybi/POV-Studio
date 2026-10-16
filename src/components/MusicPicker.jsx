import {useEffect,useRef,useState} from 'react';
import {Play,Square,Music2,LoaderCircle} from 'lucide-react';
import {createInstrumental,musicFor,musicOptions,musicCredit} from '../lib/music.mjs';
import {downloadBlob} from '../lib/storage.mjs';
import './music-picker.css';

export default function MusicPicker({result,onSelect,onPreviewStart,videoPlaying,busy,muted,notify}){
 const [previewId,setPreviewId]=useState(null);const [loading,setLoading]=useState(false);
 const player=useRef(null),timer=useRef(null),request=useRef(0);
 const options=musicOptions(result),selected=musicFor(result);
 function cancelAudio(){request.current++;clearTimeout(timer.current);player.current?.stop();player.current=null;}
 function stopPreview(){cancelAudio();setPreviewId(null);setLoading(false);}
 useEffect(()=>()=>cancelAudio(),[]);
 useEffect(()=>{if(busy||videoPlaying)stopPreview();},[busy,videoPlaying]);
 async function preview(option){
  if(previewId===option.id){stopPreview();return;}
  cancelAudio();onPreviewStart();const token=request.current;
  setPreviewId(option.id);setLoading(true);
  try{
   const next=await createInstrumental({...result,musicChoice:option.id});
   if(token!==request.current){next.stop();return;}
   player.current=next;next.play();setLoading(false);
   timer.current=setTimeout(()=>{if(token===request.current)stopPreview();},6000);
  }catch(error){if(token===request.current){stopPreview();notify(error.message,'error');}}
 }
 function select(id){stopPreview();onSelect(id);}
 return <section className="soundtrack-picker" aria-labelledby={`soundtrack-${result.id}`}>
  <div className="soundtrack-heading"><span className="soundtrack-heading-icon"><Music2 size={19}/></span><div><h3 id={`soundtrack-${result.id}`}>Choose your soundtrack</h3><p>Real instrumental recordings. Preview for 6 seconds, then choose.</p></div></div>
  <fieldset className="soundtrack-options" disabled={busy}><legend className="soundtrack-legend">Instrumental soundtrack</legend>
   {options.map((option,index)=>{const active=previewId===option.id;return <article className={`soundtrack-option ${selected.trackId===option.id?'selected':''}`} key={option.id}>
    <div className="soundtrack-option-top"><span className="soundtrack-number">0{index+1}</span>{option.recommended?<span className="soundtrack-recommended">Recommended</span>:null}</div>
    <h4>{option.title}</h4><p className="soundtrack-description">{option.description}</p><span className="soundtrack-tempo">{option.bpm} BPM · No vocals</span>
    <div className="soundtrack-buttons"><button type="button" className={`soundtrack-preview ${active?'auditioning':''}`} aria-label={`${active?'Stop preview':'Preview'} ${option.title}`} aria-pressed={active} onClick={()=>preview(option)}>{active&&loading?<LoaderCircle size={14} className="soundtrack-spinner"/>:active?<Square size={13}/>:<Play size={13}/>}<span>{active?(loading?'Preparing…':'Stop'):'Preview'}</span></button>
     <label className="soundtrack-use"><input type="radio" name={`music-choice-${result.id}`} value={option.id} checked={selected.trackId===option.id} onChange={()=>select(option.id)}/><span>{selected.trackId===option.id?'Selected':'Use track'}</span><span className="soundtrack-legend"> {option.title}</span></label></div>
   </article>;})}
  </fieldset>
  <p className="soundtrack-note" role="status">{muted?'Video music is muted. Unmute the player to include your track in the export.':`${selected.title} will play in your ad and video export.`}</p>
  <p className="soundtrack-source">{result.input.mood} energy · {result.input.time}. {result.plan.music?'Ranked from AMD’s story direction and these preferences.':'Ranked from these preferences.'} Editing follows the selected recording’s tempo.</p>
  <div className="soundtrack-credit"><span>Music by Kevin MacLeod · <a href={selected.licenseURL} target="_blank" rel="noreferrer">CC BY 4.0</a>. Credit is included in music-enabled video exports.</span><button type="button" disabled={busy} onClick={()=>downloadBlob(new Blob([musicCredit(result)],{type:'text/plain;charset=utf-8'}),`pov-${result.id}-music-credit.txt`)}>Download music credit</button></div>
 </section>;
}
