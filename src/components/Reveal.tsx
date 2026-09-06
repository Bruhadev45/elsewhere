import type { ReactNode } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import './reveal.css';

const EASE = [0.22, 1, 0.36, 1] as const;

type Reduced = boolean | null;

/** Spread onto any motion element to fade-and-rise it into view once. */
export function reveal(reduced: Reduced, delay = 0, y = 28) {
  if (reduced) return {};
  return {
    initial: { opacity: 0, y },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true, amount: 0.25 },
    transition: { duration: 0.8, delay, ease: EASE },
  } as const;
}

/** Cap the stagger so a long list never leaves the last item waiting. */
export function stagger(index: number, step = 0.06, max = 6) {
  return Math.min(index, max) * step;
}

type LinesProps = { lines: ReactNode[]; delay?: number; className?: string };

/** Headline lines that rise out from behind their own baseline. */
export function RevealLines({ lines, delay = 0, className }: LinesProps) {
  const reduced = useReducedMotion();
  if (reduced) {
    return (
      <span className={className}>
        {lines.map((line, index) => <span className="reveal-line" key={index}><span>{line}</span></span>)}
      </span>
    );
  }
  // The trigger has to sit on the unclipped wrapper: each line hides itself below
  // its own `overflow:hidden` box, so an observer on the inner span would read 0% visible.
  return (
    <motion.span
      className={`reveal-lines ${className ?? ''}`}
      initial="hidden"
      whileInView="shown"
      viewport={{ once: true, amount: 0.2 }}
    >
      {lines.map((line, index) => (
        <span className="reveal-line" key={index}>
          <motion.span
            variants={{ hidden: { y: '108%' }, shown: { y: 0 } }}
            transition={{ duration: 1, delay: delay + index * 0.11, ease: EASE }}
          >
            {line}
          </motion.span>
        </span>
      ))}
    </motion.span>
  );
}
