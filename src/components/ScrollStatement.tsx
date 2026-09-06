import { useRef } from 'react';
import { motion, useReducedMotion, useScroll, useTransform, type MotionValue } from 'framer-motion';
import './scroll-statement.css';

const LINES = [
  'Every world here started',
  'as a passing thought.',
  'A half-formed picture.',
  'A what if nobody wrote down.',
];

const WORDS = LINES.join(' ').split(' ');

function Word({ progress, start, end, children }: { progress: MotionValue<number>; start: number; end: number; children: string }) {
  const opacity = useTransform(progress, [start, end], [0.13, 1]);
  return <motion.span style={{ opacity }}>{children}</motion.span>;
}

export default function ScrollStatement({ onOpenStudio }: { onOpenStudio: () => void }) {
  const section = useRef<HTMLElement>(null);
  const reduced = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: section, offset: ['start 0.82', 'end 0.6'] });

  // Each word lights up over its own slice, with a little overlap so the sweep reads as one motion.
  const span = 1 / WORDS.length;
  let cursor = 0;

  return (
    <section ref={section} className="statement" aria-label="What ELSEWHERE is for">
      <div className="statement-inner section-wrap">
        <span className="section-kicker">Somewhere to put the daydream</span>
        <p className="statement-copy">
          {reduced
            ? WORDS.join(' ')
            : LINES.map((line, lineIndex) => (
                <span className="statement-line" key={lineIndex}>
                  {line.split(' ').map(word => {
                    const start = cursor * span;
                    const end = Math.min(1, (cursor + 2.6) * span);
                    cursor += 1;
                    return <Word progress={scrollYProgress} start={start} end={end} key={`${word}-${cursor}`}>{`${word} `}</Word>;
                  })}
                </span>
              ))}
        </p>
        <button className="statement-cta" onClick={onOpenStudio}>
          Give yours somewhere to land
          <span aria-hidden="true">↗</span>
        </button>
      </div>
    </section>
  );
}
