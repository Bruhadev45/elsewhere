import { lazy, Suspense, useEffect, useState } from 'react';
import { Check, Cloud, Download, Globe2, Image, Moon, Save, Sparkles, Sun } from 'lucide-react';
import Dialog from './Dialog';
import { findWorld, worlds } from '../worlds';
import type { SceneDraft, WorldId } from '../worlds';
const WorldOrb=lazy(()=>import('./WorldOrb'));
export type StudioRequest = {key:number;worldId:WorldId;prompt?:string;draft?:SceneDraft;savedId?:string};
export default function Studio({request,open,onClose,onSave,onNotify,notification}:{request:StudioRequest;open:boolean;onClose:()=>void;onSave:(draft:SceneDraft)=>boolean;onNotify:(message:string)=>void;notification:string}) {
  const [draft,setDraft]=useState<SceneDraft>({worldId:'forest',name:'My little elsewhere',prompt:worlds[0].prompt,light:65,mist:true});
  const [view,setView]=useState<'art'|'3d'>('art');
  const [saved,setSaved]=useState(false);
  useEffect(()=>{const w=findWorld(request.worldId);setDraft(request.draft??{worldId:w.id,name:w.name,prompt:request.prompt||w.prompt,light:65,mist:true});setSaved(false);},[request]);
  const world=findWorld(draft.worldId);
  const update=(patch:Partial<SceneDraft>)=>{setDraft(d=>({...d,...patch}));setSaved(false);};
  const download=()=>{
    if(!draft.name.trim()){onNotify('Give your world a name before exporting.');return;}
    const content=JSON.stringify({format:'elsewhere-scene-v1',...draft,name:draft.name.trim(),type:'curated-demo-preset'},null,2);
    const url=URL.createObjectURL(new Blob([content],{type:'application/json'}));
    const a=document.createElement('a');a.href=url;a.download=`elsewhere-${draft.worldId}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);onNotify('Scene settings exported.');
  };
  return <Dialog open={open} onClose={onClose} label="World studio" className="studio-dialog">
    <div className="studio-top"><span className="mini-brand"><span className="portal-mark"/> ELSEWHERE / STUDIO</span><span className="demo-chip">Interactive preview</span></div>
    <div className="studio-layout">
      <div className="studio-visual" style={{'--scene-light':`${0.45+draft.light/100*0.8}`} as React.CSSProperties}>
        {view==='art'?<><img src={world.image} alt={world.description} className={`studio-art ${draft.mist?'has-mist':''}`}/>{draft.mist&&<div className="studio-fog"/>}<div className="studio-art-caption"><span>YOUR CORNER OF THE UNIVERSE</span><h3>{draft.name||'An unnamed world'}</h3></div></>:<Suspense fallback={<div className="orb-loading">Bringing your planet into view…</div>}><WorldOrb variant={world.orbVariant??(draft.worldId==='city'?'city':draft.worldId==='ocean'?'ocean':'forest')} light={draft.light} mist={draft.mist}/></Suspense>}
        <div className="view-toggle" aria-label="Preview mode"><button aria-pressed={view==='art'} onClick={()=>setView('art')}><Image size={15}/> Landscape</button><button aria-pressed={view==='3d'} onClick={()=>setView('3d')}><Globe2 size={15}/> 3D planet</button></div>
      </div>
      <form className="studio-controls" onSubmit={e=>{e.preventDefault();if(saved)return;if(onSave({...draft,name:draft.name.trim()}))setSaved(true);}}>
        <div><span className="green-kicker"><Sparkles size={15}/> A place to play</span><h2>Make it yours.</h2><p>Start with a curated world. Follow your curiosity.</p></div>
        <label className="field-label">World name<input value={draft.name} required maxLength={64} onChange={e=>update({name:e.target.value})} placeholder="What will you call it?"/></label>
        <fieldset className="preset-field"><legend>Choose your world</legend><div className="studio-presets">{worlds.map(w=><button key={w.id} type="button" aria-label={w.name} aria-pressed={draft.worldId===w.id} onClick={()=>update({worldId:w.id})}><img src={w.image} alt=""/><span>{w.label??(w.id==='forest'?'Floating wilds':w.id==='city'?'Future city':'Alien ocean')}</span>{draft.worldId===w.id&&<Check size={15}/>}</button>)}</div></fieldset>
        <label className="field-label">The idea behind it<textarea maxLength={500} value={draft.prompt} onChange={e=>update({prompt:e.target.value})} rows={2}/></label>
        <div className="lighting-label"><label htmlFor="light-slider">Time of day</label><output htmlFor="light-slider">{draft.light<30?'Blue hour':draft.light<70?'Golden hour':'Daylight'}</output></div><div className="lighting-slider"><Moon size={16}/><input id="light-slider" type="range" min="0" max="100" value={draft.light} onChange={e=>update({light:Number(e.target.value)})}/><Sun size={18}/></div>
        <button type="button" className="mist-toggle" role="switch" aria-checked={draft.mist} onClick={()=>update({mist:!draft.mist})}><span><Cloud size={18}/> Dreamlike atmosphere</span><span className="switch-track"><span/></span></button>
        <p className="studio-note">Your prompt is saved with this preset. This preview does not generate new artwork.</p>
        <div className="studio-actions"><button type="submit" className="button button-dark" disabled={saved}>{saved?<Check size={17}/>:<Save size={17}/>} {saved?'Saved to your worlds':request.savedId?'Save changes':'Save my world'}</button><button type="button" className="icon-button export-button" aria-label="Export scene settings" onClick={download}><Download size={19}/></button></div>
        <p className="studio-status" role="status" aria-live="polite">{notification}</p><span className="local-note">Just for you. Saved in this browser.</span>
      </form>
    </div>
  </Dialog>;
}
