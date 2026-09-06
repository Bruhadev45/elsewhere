import { useEffect, useRef, useState } from 'react';
import { motion, useReducedMotion, type MotionStyle } from 'framer-motion';
import { Pause, Play } from 'lucide-react';
export default function HeroVideo({active,src,mediaStyle}:{active:boolean;src:string;mediaStyle?:MotionStyle}){
  const ref=useRef<HTMLVideoElement>(null);
  const reduced=useReducedMotion();
  const [paused,setPaused]=useState(false);
  const [failed,setFailed]=useState(false);
  const [visible,setVisible]=useState(true);
  const [playing,setPlaying]=useState(false);
  useEffect(()=>{if(!ref.current)return;const observer=new IntersectionObserver(([entry])=>setVisible(entry.isIntersecting),{threshold:.1});observer.observe(ref.current);return()=>observer.disconnect();},[]);
  useEffect(()=>{
    const video=ref.current;if(!video)return;
    const sync=()=>{if(active&&visible&&!paused&&!reduced&&!document.hidden){void video.play().catch(()=>setPlaying(false));}else video.pause();};
    sync();document.addEventListener('visibilitychange',sync);return()=>document.removeEventListener('visibilitychange',sync);
  },[active,visible,paused,reduced]);
  const togglePlayback=()=>{
    const video=ref.current;if(!video)return;
    if(!video.paused){setPaused(true);video.pause();}
    else{setPaused(false);void video.play().catch(()=>{setPlaying(false);setPaused(true);});}
  };
  if(failed)return null;
  return <><motion.video style={mediaStyle} ref={ref} className={`hero-video ${active?'active':''}`} src={src} poster="/assets/hero-forest.webp" muted loop playsInline preload="metadata" aria-hidden="true" onPlay={()=>setPlaying(true)} onPause={()=>setPlaying(false)} onError={()=>setFailed(true)}/>{active&&!reduced&&<button className="scenery-motion" aria-label={playing?'Pause scenery motion':'Play scenery motion'} onClick={togglePlayback}>{playing?<Pause size={12}/>:<Play size={12}/>}<span>{playing?'Living scenery':'Motion paused'}</span></button>}</>;
}
