import { useEffect, useRef, useState } from 'react';
import { motion, useReducedMotion, useScroll, useTransform } from 'framer-motion';
import ExperienceEffects from './components/ExperienceEffects';
import ScrollJourney from './components/ScrollJourney';
import HeroVideo from './components/HeroVideo';
import './hero-scroll.css';
import { ArrowDown, ArrowRight, ArrowUpRight, AudioLines, Check, ChevronDown, Globe2, Heart, Menu, MoveUpRight, Play, Plus, Search, Shuffle, SlidersHorizontal, Sparkles, Trash2, Volume2, VolumeX, X } from 'lucide-react';
import LowerSections from './components/LowerSections';
import { RevealLines, reveal, stagger } from './components/Reveal';
import ScrollStatement from './components/ScrollStatement';
import Dialog from './components/Dialog';
import Studio from './components/Studio';
import type { StudioRequest } from './components/Studio';
import { findWorld, featuredWorlds, loadFavorites, loadSavedWorlds, FAVORITES_KEY, STORAGE_KEY, worlds } from './worlds';
import type { SavedWorld, SceneDraft, World, WorldId } from './worlds';

const STARTERS = [
  'What if gravity forgot one island?',
  'What if a library grew on the seabed?',
  'What if dusk lasted a whole year?',
  'What if a city grew like moss?',
  'What if the desert remembered rain?',
  'What if two moons kept arguing?',
];

function Brand(){return <span className="brand"><span className="portal-mark"/>elsewhere<span className="brand-dot">®</span></span>;}
export default function App(){
  const [selected,setSelected]=useState<WorldId>('forest');
  const [menu,setMenu]=useState(false);
  const [mega,setMega]=useState(false);
  const [prompt,setPrompt]=useState('');
  const [studioOpen,setStudioOpen]=useState(false);
  const [request,setRequest]=useState<StudioRequest>({key:0,worldId:'forest'});
  const [filter,setFilter]=useState('All worlds');
  const [favorites,setFavorites]=useState<WorldId[]>(loadFavorites);
  const [savedWorlds,setSavedWorlds]=useState<SavedWorld[]>(loadSavedWorlds);
  const [details,setDetails]=useState<World|null>(null);
  const [tour,setTour]=useState(false);
  const [tourStep,setTourStep]=useState(0);
  const [toast,setToast]=useState('');
  const [sound,setSound]=useState(false);
  const [audioBusy,setAudioBusy]=useState(false);
  const [search,setSearch]=useState('');
  const [searchOpen,setSearchOpen]=useState(false);
  const audio=useRef<AudioContext|null>(null);
  const hero=useRef<HTMLDivElement>(null);
  const world=findWorld(selected);
  const reduced=useReducedMotion();
  const {scrollYProgress:bandProgress}=useScroll({target:hero,offset:['start end','end start']});
  const bandY=useTransform(bandProgress,[0,1],['-5%','5%']);
  const bandScale=useTransform(bandProgress,[0,.5,1],[1.05,1,1.05]);
  useEffect(()=>{if(!toast)return;const t=setTimeout(()=>setToast(''),4200);return()=>clearTimeout(t);},[toast]);
  useEffect(()=>()=>{void audio.current?.close();},[]);
  useEffect(()=>{const close=(e:KeyboardEvent)=>{if(e.key==='Escape'){setMega(false);setMenu(false);}};window.addEventListener('keydown',close);return()=>window.removeEventListener('keydown',close);},[]);
  const notify=(message:string)=>setToast(message);
  const openStudio=(id:WorldId=selected,idea?:string,draft?:SceneDraft & {id?:string})=>{setDetails(null);setTour(false);setMenu(false);setMega(false);setRequest({key:Date.now(),worldId:id,prompt:idea,draft,savedId:draft?.id});setStudioOpen(true);};
  const saveWorld=(draft:SceneDraft)=>{
    if(!draft.name.trim()){notify('Give your world a name first.');return false;}
    if(savedWorlds.length>=50&&!request.savedId){notify('Your collection is full. Remove a saved world to make room.');return false;}
    const entry:SavedWorld={...draft,name:draft.name.trim(),id:request.savedId??crypto.randomUUID(),savedAt:new Date().toISOString()};
    const next=[entry,...savedWorlds.filter(w=>w.id!==entry.id)];
    try{localStorage.setItem(STORAGE_KEY,JSON.stringify(next));setSavedWorlds(next);notify(`“${entry.name}” saved to your worlds.`);return true;}catch{notify('Browser storage is unavailable. Export your scene settings to keep this world.');return false;}
  };
  const deleteWorld=(id:string)=>{const next=savedWorlds.filter(w=>w.id!==id);try{localStorage.setItem(STORAGE_KEY,JSON.stringify(next));setSavedWorlds(next);notify('World removed from this browser.');}catch{notify('Could not update browser storage. Your world has not been removed.');}};
  const toggleAudio=async()=>{
    if(audioBusy)return;setAudioBusy(true);
    try{
      if(sound){await audio.current?.suspend();setSound(false);return;}
      if(!audio.current){
        const ctx=new AudioContext();audio.current=ctx;
        const master=ctx.createGain();master.gain.value=0.025;master.connect(ctx.destination);
        [130.81,196,261.63].forEach((frequency,i)=>{const osc=ctx.createOscillator();const gain=ctx.createGain();osc.type='sine';osc.frequency.value=frequency;gain.gain.value=0.3/(i+1);osc.connect(gain);gain.connect(master);osc.start();});
      }
      await audio.current.resume();setSound(true);
    }catch{setSound(false);notify('Ambient sound could not start in this browser.');}finally{setAudioBusy(false);}
  };
  const toggleFavorite=(id:WorldId)=>{const next=favorites.includes(id)?favorites.filter(x=>x!==id):[...favorites,id];setFavorites(next);try{localStorage.setItem(FAVORITES_KEY,JSON.stringify(next));}catch{notify("Favorite kept for this visit. Browser storage is unavailable.");}};
  const openSaved=()=>{setFilter('Your worlds');setMenu(false);setMega(false);document.getElementById('worlds')?.scrollIntoView({behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});};
  const chooseWorld=(id:WorldId)=>{setSelected(id);};
  const exploreList=worlds.filter(w=>(filter==='All worlds'||filter===w.category||filter==='Favorites'&&favorites.includes(w.id))&&`${w.name} ${w.description}`.toLowerCase().includes(search.toLowerCase()));
  const savedList=savedWorlds.filter(w=>`${w.name} ${w.prompt}`.toLowerCase().includes(search.toLowerCase()));
  return <>
    <ExperienceEffects/>
    <a className="skip-link" href="#main">Skip to content</a>
    <header className="site-header hero-site-header">
      <a href="#" aria-label="ELSEWHERE home" className="brand-link"><Brand/></a>
      <nav className={`primary-nav ${menu?'is-open':''}`} aria-label="Main navigation">
        <div className="explore-nav"><button className="nav-link" aria-expanded={mega} aria-controls="explore-menu" onClick={()=>setMega(!mega)}>Explore <ChevronDown size={14}/></button>{mega&&<div className="mega-menu" id="explore-menu"><span className="mega-caption">WHERE WILL YOU GO?</span>{featuredWorlds.map(w=><button key={w.id} onClick={()=>{chooseWorld(w.id);setMega(false);setMenu(false);document.getElementById('main')?.scrollIntoView();}}><img src={w.image} alt=""/><span><strong>{w.name}</strong><small>{w.category}</small></span><ArrowUpRight size={17}/></button>)}<button className="mega-saved" onClick={openSaved}><Heart size={17}/> Your saved worlds <span>{savedWorlds.length}</span></button></div>}</div>
        <a href="#how-it-works" onClick={()=>setMenu(false)}>How it works</a><button className="nav-link" onClick={openSaved}>Your worlds</button>
      </nav>
      <div className="header-actions"><span className="beta-note"><span/> A little preview of what’s possible</span><button className="button button-lime header-cta" onClick={()=>openStudio()}>Open studio <ArrowUpRight size={17}/></button><button className="icon-button mobile-menu" aria-label={menu?'Close navigation':'Open navigation'} aria-expanded={menu} onClick={()=>{setMenu(!menu);setMega(false);}}>{menu?<X/>:<Menu/>}</button></div>
    </header>
    <main id="main">
      <ScrollJourney onOpenStudio={()=>openStudio()}/>
      <section className="scene-band section-wrap" aria-label="Choose a starting scene">
        <motion.div className="section-heading" {...reveal(reduced)}><div><span className="section-kicker">Pick a starting point</span><h2><RevealLines lines={["Change your","scenery."]}/></h2></div><p>Three worlds to begin with. Switch the scene,<br/>then open the studio and make it yours.</p></motion.div>
        <div className={`scene-stage hero hero-${selected}`} ref={hero} onPointerMove={e=>{if(e.pointerType!=='mouse'||window.matchMedia('(prefers-reduced-motion: reduce)').matches)return;const box=e.currentTarget.getBoundingClientRect();e.currentTarget.style.setProperty('--pointer-x',`${((e.clientX-box.left)/box.width-.5)*12}px`);e.currentTarget.style.setProperty('--pointer-y',`${((e.clientY-box.top)/box.height-.5)*9}px`);}} onPointerLeave={()=>{hero.current?.style.setProperty('--pointer-x','0px');hero.current?.style.setProperty('--pointer-y','0px');}}>
          <motion.div className="hero-scenes" aria-hidden="true" style={reduced?undefined:{y:bandY,scale:bandScale}}>{featuredWorlds.map(w=><img className={`hero-landscape ${selected===w.id?'active':''}`} key={w.id} src={w.image} alt="" loading="lazy" fetchPriority="low"/>)}</motion.div><HeroVideo active src={selected==='city'?"/assets/neon-city-loop.mp4":selected==='ocean'?"/assets/alien-ocean-loop.mp4":"/assets/hero-forest-loop.mp4"} mediaStyle={reduced?undefined:{y:bandY,scale:bandScale}}/><div className="hero-shade"/>
          <button className="world-hotspot" onClick={()=>setDetails(world)} aria-label={`Explore ${world.name}`}><span className="hotspot-plus"><Plus size={20}/></span><span>THERE’S A STORY HERE<em>{world.name}</em></span></button>
          <div className="hero-bottom"><div className="scene-picker"><span className="scene-label">Three to start with</span><div className="scene-options">{featuredWorlds.map(w=><button key={w.id} className={selected===w.id?'selected':''} aria-label={`Preview ${w.name}`} aria-pressed={selected===w.id} onClick={()=>chooseWorld(w.id)}><img src={w.image} alt=""/><span>{w.id==='forest'?'Floating wilds':w.id==='city'?'Future city':'Alien ocean'}</span>{selected===w.id&&<Check size={13}/>}</button>)}</div></div><div className="hero-utility"><span className="scene-count">0{worlds.findIndex(w=>w.id===selected)+1}<span> / 03</span></span><button className={`sound-button ${sound?'sound-on':''}`} aria-label={sound?'Mute ambient sound':'Play ambient sound'} aria-pressed={sound} disabled={audioBusy} onClick={()=>void toggleAudio()}>{sound?<Volume2 size={16}/>:<VolumeX size={16}/>}<span>{sound?'Sound on':'Sound off'}</span><AudioLines size={19}/></button></div></div>
        </div>
        <motion.div className="scene-band-actions" {...reveal(reduced,.12)}><button className="button button-lime" onClick={()=>openStudio()}>Start imagining <Sparkles size={17}/></button><button className="button button-dark" onClick={()=>{setTourStep(0);setTour(true);}}><span className="play-disc"><Play size={11} fill="currentColor"/></span>Take a little tour</button><span className="scene-band-note">A free playground for your imagination. No sign-up.</span></motion.div>
      </section>
      <motion.section id="imagine" initial={false} whileInView={{y:0}} className="prompt-dock" aria-label="Start a world"><form onSubmit={e=>{e.preventDefault();openStudio(selected,prompt);}}><div className="prompt-icon"><Sparkles size={22}/></div><div className="prompt-field"><label htmlFor="world-prompt">Every world starts with a what if.</label><input id="world-prompt" maxLength={500} value={prompt} onChange={e=>setPrompt(e.target.value)} placeholder="A quiet little planet where the forest touches the sky…"/></div><button type="button" className="icon-button shuffle-button" aria-label="Try an example idea" onClick={()=>{const i=(featuredWorlds.findIndex(w=>w.id===selected)+1)%featuredWorlds.length;setSelected(featuredWorlds[i].id);setPrompt(featuredWorlds[i].prompt);}}><Shuffle size={18}/></button><button className="button button-dark" type="submit">Make it a world <ArrowUpRight size={18}/></button></form><div className="prompt-meta"><span><span className="live-dot"/> Try a curated scene. Make it your own.</span><span>Big imagination. Small learning curve.</span></div></motion.section>
      <section className="intro section-wrap">
        <div className="intro-top"><motion.div className="intro-lede" {...reveal(reduced)}><motion.div className="intro-symbol" aria-hidden="true" initial={reduced?false:{opacity:0,rotate:-28,scale:.82}} whileInView={{opacity:1,rotate:0,scale:1}} viewport={{once:true,amount:.4}} transition={{duration:1.1,ease:[.22,1,.36,1]}}><Globe2 strokeWidth={1}/><span className="orbit-cross">✳</span></motion.div><span className="section-kicker">Permission to get a little lost</span><h2><RevealLines lines={["The best places",<>don’t exist. <span>Yet.</span></>]} delay={.1}/></h2></motion.div><motion.div className="intro-description" {...reveal(reduced,.18)}><p>For the daydreamers, the “what if” people, and everyone with a universe living rent-free in their head.</p><p>ELSEWHERE is your space to turn a spark of an idea into somewhere worth exploring. No rulebook required.</p><a href="#worlds">Find your starting point <ArrowDown size={17}/></a></motion.div></div>
        <motion.div className="intro-starters" {...reveal(reduced,.22)}>
          <div className="intro-starters-head"><span className="section-kicker">Start from a what if</span><span>{worlds.length} original worlds · endless variations</span></div>
          <div className="intro-starter-list">{STARTERS.map(idea=><button key={idea} className="intro-starter" onClick={()=>openStudio(selected,idea)}><span>{idea}</span><ArrowUpRight size={15}/></button>)}</div>
        </motion.div>
      </section>
      <ScrollStatement onOpenStudio={()=>openStudio()}/>
      <div className="world-marquee" aria-hidden="true"><div className="world-marquee-track">{[0,1].map(run=><div className="world-marquee-run" key={run}>{worlds.map(w=><span key={w.id}>{w.name}<i/></span>)}</div>)}</div></div>
      <section id="worlds" className="worlds-section section-wrap"><motion.div className="section-heading" {...reveal(reduced)}><div><span className="section-kicker">From the ELSEWHERE collection</span><h2><RevealLines lines={["A world for every","kind of wonder."]}/></h2></div><p>{worlds.length} original worlds. A thousand possibilities.<br/>Pick a place that pulls you in.</p></motion.div>
        <motion.div className="gallery-toolbar" {...reveal(reduced,.1,18)}><div className="gallery-filters" aria-label="Filter worlds">{['All worlds','Dreamscapes','Future cities','Otherworldly','Favorites','Your worlds'].map(f=><button key={f} aria-pressed={filter===f} onClick={()=>setFilter(f)}>{f}{f==='Your worlds'&&savedWorlds.length>0&&<span>{savedWorlds.length}</span>}</button>)}</div><div className="gallery-search">{searchOpen&&<input aria-label="Search worlds" placeholder="Find a world…" value={search} onChange={e=>setSearch(e.target.value)} autoFocus/>}<button className="icon-button" aria-label={searchOpen?'Close world search':'Search worlds'} aria-expanded={searchOpen} onClick={()=>{setSearchOpen(!searchOpen);if(searchOpen)setSearch('');}}>{searchOpen?<X size={18}/>:<Search size={18}/>}</button></div></motion.div>
        <div className="world-grid" aria-live="polite">
          {filter!=='Your worlds'?exploreList.map((w,i)=><motion.article {...reveal(reduced,stagger(i))} className={`world-card world-card-${w.id}`} key={w.id} onPointerMove={e=>{if(reduced||e.pointerType!=="mouse")return;const r=e.currentTarget.getBoundingClientRect();e.currentTarget.style.setProperty("--card-rx",`${-((e.clientY-r.top)/r.height-.5)*5}deg`);e.currentTarget.style.setProperty("--card-ry",`${((e.clientX-r.left)/r.width-.5)*5}deg`);}} onPointerLeave={e=>{e.currentTarget.style.setProperty("--card-rx","0deg");e.currentTarget.style.setProperty("--card-ry","0deg");}}><button className="world-image-button" onClick={()=>setDetails(w)} aria-label={`Explore ${w.name}`}><img src={w.image} alt={w.description} loading="lazy"/><span className="world-image-shade"/><span className="world-category">{w.category}</span><span className="world-enter"><MoveUpRight size={23}/></span><span className="world-image-caption"><span>COME GET LOST</span><strong>{w.name}</strong></span></button><button className={`favorite-button ${favorites.includes(w.id)?'is-favorite':''}`} aria-label={`${favorites.includes(w.id)?'Unfavorite':'Favorite'} ${w.name}`} aria-pressed={favorites.includes(w.id)} onClick={()=>toggleFavorite(w.id)}><Heart size={17} fill={favorites.includes(w.id)?'currentColor':'none'}/></button><div className="world-card-footer"><span className="creator-avatar" style={{background:w.color}}><Globe2 size={14}/></span><span>ELSEWHERE Originals</span><span className="world-number">World {String(worlds.findIndex(item=>item.id===w.id)+1).padStart(3,'0')}</span></div></motion.article>):savedList.map(w=><article className="world-card saved-world" key={w.id}><button className="world-image-button" onClick={()=>openStudio(w.worldId,w.prompt,w)} aria-label={`Open saved world ${w.name}`}><img src={findWorld(w.worldId).image} alt={findWorld(w.worldId).description} loading="lazy" style={{filter:`brightness(${.45+w.light/100*.8})`}}/><span className="world-image-shade"/><span className="world-category">Your creation</span><span className="world-enter"><SlidersHorizontal size={22}/></span><span className="world-image-caption"><span>YOUR LITTLE ELSEWHERE</span><strong>{w.name}</strong></span></button><div className="world-card-footer"><span className="creator-avatar"><Check size={14}/></span><span>Saved in this browser</span><button className="icon-button delete-world" aria-label={`Delete ${w.name}`} onClick={()=>deleteWorld(w.id)}><Trash2 size={16}/></button></div></article>)}
          {(filter==='Your worlds'?savedList.length:exploreList.length)===0&&<div className="gallery-empty"><Globe2 size={36}/><h3>{search?'No worlds found.':filter==='Favorites'?'Keep the worlds that move you.':'Your universe starts here.'}</h3><p>{search?'Try a different name or clear your search.':filter==='Favorites'?'Tap the heart on a world to collect it here.':'Create a scene in the studio, then save it to make it yours.'}</p><button className="button button-dark" onClick={()=>{if(search)setSearch('');else if(filter==='Favorites')setFilter('All worlds');else openStudio();}}>{search?'Clear search':filter==='Favorites'?'Explore worlds':'Create my first world'}<ArrowUpRight size={17}/></button></div>}
        </div><motion.div className="gallery-note" {...reveal(reduced)}><span><Sparkles size={15}/> A few doors into something bigger.</span><button onClick={()=>openStudio()}>Imagine your own <ArrowUpRight size={16}/></button></motion.div>
      </section>
      <LowerSections onOpenStudio={()=>openStudio()} onNotify={notify}/>
    </main>
    <Studio request={request} open={studioOpen} onClose={()=>setStudioOpen(false)} onSave={saveWorld} onNotify={notify} notification={toast}/>
    <Dialog open={Boolean(details)} onClose={()=>setDetails(null)} label="World details" className="details-dialog">{details&&<><div className="details-art"><img src={details.image} alt={details.description}/><span className="world-category">{details.category}</span></div><div className="details-copy"><span className="section-kicker">An ELSEWHERE original</span><h2>{details.name}</h2><p>{details.description}</p><div className="details-specs"><span><Globe2 size={16}/> Explorable 3D planet</span><span><SunIcon/> Adjustable lighting</span><span><CloudIcon/> Optional atmosphere</span></div><button className="button button-dark" onClick={()=>openStudio(details.id)}>Make this world yours <ArrowUpRight size={17}/></button><small>Start with this curated scene in the studio.</small></div></>}</Dialog>
    <Dialog open={tour} onClose={()=>setTour(false)} label="ELSEWHERE tour" className="tour-dialog"><div className="tour-art"><img src={worlds[tourStep].image} alt={worlds[tourStep].description}/><span className="tour-step">0{tourStep+1} / 03</span></div><div className="tour-copy"><span className="section-kicker">A little tour of ELSEWHERE</span><h2>{['Find your elsewhere.','Change the atmosphere.','Keep a little universe.'][tourStep]}</h2><p>{['Explore twelve original worlds, from floating forests to neon-lit cities. Every one is a place to begin.','Open the studio to change the light, bring in the mist, or spin an interactive 3D planet.','Give your creation a name and save it in this browser. Export its settings to take the idea with you.'][tourStep]}</p><div className="tour-actions"><div className="tour-dots">{featuredWorlds.map((_,i)=><button key={i} aria-label={`Tour step ${i+1}`} aria-current={tourStep===i?'step':undefined} onClick={()=>setTourStep(i)}/>)}</div><button className="button button-dark" onClick={()=>tourStep<2?setTourStep(tourStep+1):openStudio()}>{tourStep<2?'Keep exploring':'Let’s make a world'}<ArrowRight size={17}/></button></div></div></Dialog>
    <div className={`toast ${toast?'show':''}`} role="status" aria-live="polite">{toast&&<><Check size={17}/><span>{toast}</span><button aria-label="Dismiss notification" onClick={()=>setToast('')}><X size={16}/></button></>}</div>
  </>;
}
function SunIcon(){return <span className="tiny-symbol" aria-hidden="true">☼</span>;}
function CloudIcon(){return <span className="tiny-symbol" aria-hidden="true">☁</span>;}
