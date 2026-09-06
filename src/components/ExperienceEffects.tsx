import { useEffect, useState } from 'react';
import { motion, useMotionValue, useReducedMotion, useScroll, useSpring, useTransform } from 'framer-motion';
import { ArrowUp } from 'lucide-react';

export default function ExperienceEffects() {
  const reduced=useReducedMotion();
  const {scrollYProgress}=useScroll();
  const progress=useSpring(scrollYProgress,{stiffness:130,damping:30});
  const progressPercent=useTransform(progress,v=>`${Math.round(v*100)}%`);
  const mouseX=useMotionValue(-200), mouseY=useMotionValue(-200);
  const x=useSpring(mouseX,{stiffness:250,damping:27}), y=useSpring(mouseY,{stiffness:250,damping:27});
  const [hovered,setHovered]=useState(false);
  useEffect(()=>{
    if(reduced||!window.matchMedia('(pointer:fine)').matches)return;
    const move=(event:PointerEvent)=>{mouseX.set(event.clientX-34);mouseY.set(event.clientY-34);const element=event.target;setHovered(element instanceof Element&&Boolean(element.closest('.world-image-button')));};
    const leave=()=>setHovered(false);
    document.addEventListener('pointermove',move,{passive:true});document.addEventListener('pointerleave',leave);
    return()=>{document.removeEventListener('pointermove',move);document.removeEventListener('pointerleave',leave);};
  },[reduced,mouseX,mouseY]);
  return <><motion.div className="reading-progress" style={{scaleX:reduced?scrollYProgress:progress}} aria-hidden="true"/>{!reduced&&<motion.div className="explore-cursor" style={{x,y}} animate={{opacity:hovered?1:0,scale:hovered?1:.65}} transition={{duration:.18}} aria-hidden="true">Explore<br/>↗</motion.div>}<a className="back-to-top" href="#" aria-label="Back to top"><ArrowUp size={14}/><motion.span>{progressPercent}</motion.span></a></>;
}
