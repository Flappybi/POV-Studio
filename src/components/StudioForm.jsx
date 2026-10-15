import { ArrowRight, Clock3, Moon, Sparkles, Sun, Sunset, Zap, Leaf, Flame, ChevronDown, ShieldCheck, Image as ImageIcon } from 'lucide-react';
import BrandMark from './BrandMark.jsx';
export default function StudioForm({ brand, form, setForm, busy, progress, onGenerate, onBrand }) {
  const update = (key, value) => setForm(previous => ({ ...previous, [key]: value }));
  const times = { Morning: Sun, Afternoon: Sunset, Evening: Moon };
  const moods = { Energetic: Zap, Calm: Leaf, Bold: Flame };
  return <div className="input-column">
    <form className="panel story-panel" onSubmit={onGenerate}>
      <h2>Tell your story</h2><p className="panel-intro">Choose your brand and share your story. Create an ad that feels made for you.</p>
      <label className="field-label">Selected brand</label>
      <div className="brand-picker"><button type="button" className="brand-select" onClick={onBrand} disabled={busy}>{brand.productImage?<img src={brand.productImage} alt={brand.product}/>:<span className="brand-placeholder"><ImageIcon size={25}/></span>}<div><strong>{brand.name||'Add your brand'}</strong><span>{brand.name?'Your brand identity and assets are ready':'Set up your identity and assets'}</span></div><ChevronDown size={16}/></button><button type="button" className="text-button brand-edit-link" onClick={onBrand} disabled={busy}>{brand.name?'Edit Brand Kit':'Set up Brand Kit'}<ArrowRight size={13}/></button></div>
      <label className="field-label" htmlFor="story">Your story <span>Start with what matters to you</span></label>
      <div className="textarea-wrap"><textarea id="story" maxLength={500} value={form.story} onChange={e => update('story', e.target.value)} placeholder="What are your goals? What do you enjoy? Tell us in your own words." disabled={busy} required/><span className="character-count">{form.story.length}/500</span></div>
      <label className="field-label">Ad preferences</label>
      <div className="preferences">
        <div className="preference-field"><span className="preference-name">Time of day</span><div className="select-chip"><span>{(() => { const Icon = times[form.time]; return <Icon size={18}/>; })()}</span><select aria-label="Time of day" value={form.time} onChange={e => update('time', e.target.value)} disabled={busy}>{Object.keys(times).map(t => <option key={t}>{t}</option>)}</select></div></div>
        <div className="preference-field"><span className="preference-name">Energy</span><div className="select-chip"><span>{(() => { const Icon = moods[form.mood]; return <Icon size={18}/>; })()}</span><select aria-label="Energy" value={form.mood} onChange={e => update('mood', e.target.value)} disabled={busy}>{Object.keys(moods).map(t => <option key={t}>{t}</option>)}</select></div></div>
        <div className="preference-field"><span className="preference-name">Duration</span><div className="select-chip"><Clock3 size={18}/><select aria-label="Duration" value={form.duration} onChange={e => update('duration', Number(e.target.value))} disabled={busy}>{[10,15,20].map(t => <option key={t} value={t}>{t} s</option>)}</select></div></div>
      </div>
      <button className="primary generate-button" disabled={busy||!brand.name} type="submit"><Sparkles size={19}/><span>{busy ? progress : 'Create personalized ad'}</span>{busy ? <span className="spinner"/> : <ArrowRight size={20}/>}</button>
      <p className="form-footnote">Your story is sent to AMD to create this ad.</p>
    </form>
    <section className="panel kit-summary"><div className="section-label"><h3>Brand Kit <span>(consistent)</span></h3><button className="text-button" onClick={onBrand} disabled={busy}>Edit <ArrowRight size={13}/></button></div><p>The identity that connects every version.</p>
      <div className="kit-items"><div className="kit-item"><div className="kit-visual"><BrandMark brand={brand}/></div><span>Brand logo</span></div><div className="kit-item"><div className="kit-visual">{brand.productImage?<img src={brand.productImage} alt="Consistent product photo"/>:<span className="asset-empty-label">No photo yet</span>}</div><span>Product image</span></div><div className="kit-item colors-item"><span>Brand colors</span><div className="swatches">{brand.colors.map((color,i) => <span key={i} style={{background:color}} title={color}/>)}</div></div></div>
      <div className="kit-lock"><ShieldCheck size={14}/><span>Approved product facts and CTA</span></div>
    </section>
  </div>;
}
