import { useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import { X } from 'lucide-react';
export default function Dialog({open,onClose,label,children,className=''}:{open:boolean;onClose:()=>void;label:string;children:ReactNode;className?:string}) {
  const ref=useRef<HTMLDialogElement>(null);
  const onCloseRef=useRef(onClose); onCloseRef.current=onClose;
  useEffect(()=>{
    const dialog=ref.current;
    if(!dialog || !open) return;
    const previous=document.activeElement as HTMLElement | null;
    dialog.showModal();
    const overflow=document.body.style.overflow; document.body.style.overflow='hidden';
    return ()=>{dialog.close();document.body.style.overflow=overflow;previous?.focus();};
  },[open]);
  return <dialog ref={ref} className={`dialog ${className}`} aria-label={label} onCancel={e=>{e.preventDefault();onCloseRef.current();}} onClick={e=>{if(e.target===ref.current){const rect=ref.current.getBoundingClientRect();if(e.clientX<rect.left||e.clientX>rect.right||e.clientY<rect.top||e.clientY>rect.bottom)onCloseRef.current();}}}>
    <button className="icon-button dialog-close" aria-label={`Close ${label}`} onClick={onClose}><X size={21}/></button>
    {open?children:null}
  </dialog>;
}
