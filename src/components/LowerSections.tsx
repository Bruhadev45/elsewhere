import { useId, useRef, useState, type CSSProperties } from 'react';
import { motion, useReducedMotion, useScroll, useTransform } from 'framer-motion';
import { ArrowUpRight, Globe2, MoonStar, MoveUpRight, Orbit, Plus, Sparkles, Sun, Sunset } from 'lucide-react';
import './lower-sections.css';

type LowerSectionsProps = {
  onOpenStudio: () => void;
  onNotify: (message: string) => void;
};

const atmospheres = [
  { id: 'day', label: 'Day', icon: Sun, intensity: 82, brightness: 1.12, saturation: 1.08 },
  { id: 'dusk', label: 'Dusk', icon: Sunset, intensity: 65, brightness: 0.94, saturation: 1.34 },
  { id: 'night', label: 'After dark', icon: MoonStar, intensity: 44, brightness: 0.66, saturation: 0.88 },
] as const;


const questions = [
  {
    question: 'What can I make with Elsewhere?',
    answer: 'Think impossible landscapes, quiet hideaways, and places that only exist in your head. Elsewhere imagines a way to turn a few words into an explorable world, for creative play, moodboards, and the first spark of a bigger idea.',
  },
  {
    question: 'Do I need to know anything about 3D?',
    answer: 'Just bring an idea. The experience is designed around everyday language, so you can start with a place, a feeling, or something wonderfully specific. No modeling experience required to explore the preview.',
  },
  {
    question: 'Does this preview generate real 3D worlds?',
    answer: 'This is an interactive product concept. The studio uses a curated collection of visual worlds to let you try the experience. It does not generate new 3D scenes, connect to a paid AI service, or export 3D models.',
  },
  {
    question: 'What should I put in my first prompt?',
    answer: 'Start with a place, then add one unexpected detail: “a glass cabin in a lavender forest” or “a tiny island beneath two moons.” A little atmosphere goes a long way. Try a time of day, a color, or a feeling and see where it takes you.',
  },
];

export default function LowerSections({ onOpenStudio, onNotify }: LowerSectionsProps) {
  const [atmosphere, setAtmosphere] = useState<(typeof atmospheres)[number]['id']>('day');
  const [intensity, setIntensity] = useState(82);
  const lightInputId = useId();
  const storyboardRef = useRef<HTMLDivElement>(null);
  const finalRef = useRef<HTMLElement>(null);
  const reducedMotion = Boolean(useReducedMotion());
  const { scrollYProgress: storyboardProgress } = useScroll({ target: storyboardRef, offset: ['start end', 'end start'] });
  const { scrollYProgress: finalProgress } = useScroll({ target: finalRef, offset: ['start end', 'end start'] });
  const storyboardY = useTransform(storyboardProgress, [0, 1], ['-5%', '5%']);
  const finalY = useTransform(finalProgress, [0, 1], [18, -18]);
  const currentAtmosphere = atmospheres.find((item) => item.id === atmosphere) ?? atmospheres[0];
  const imageFilter = `brightness(${currentAtmosphere.brightness * (0.48 + intensity / 130)}) saturate(${currentAtmosphere.saturation})`;

  return (
    <div className="lower-sections">
      <section className="lower-workflow" id="how-it-works" aria-labelledby="lower-workflow-title">
        <div className="lower-container">
          <div className="lower-section-intro">
            <h2 id="lower-workflow-title">Less learning curves.<br />More otherworldly.</h2>
            <p>Your imagination already knows the way.<br className="lower-desktop-break" /> Give it a place to wander.</p>
          </div>

          <div className={`lower-storyboard lower-atmosphere-${atmosphere}`} ref={storyboardRef}>
            <motion.img
              className="lower-storyboard-image"
              src="/assets/alien-ocean.webp"
              alt="An imagined ocean world with an otherworldly coastline"
              loading="lazy"
              decoding="async"
              style={{ y: reducedMotion ? 0 : storyboardY, filter: imageFilter }}
            />
            <motion.div className="lower-atmosphere-wash lower-atmosphere-wash-dusk" animate={{ opacity: atmosphere === 'dusk' ? 0.68 : 0 }} transition={{ duration: reducedMotion ? 0 : 0.65 }} aria-hidden="true" />
            <motion.div className="lower-atmosphere-wash lower-atmosphere-wash-night" animate={{ opacity: atmosphere === 'night' ? 0.65 : 0 }} transition={{ duration: reducedMotion ? 0 : 0.65 }} aria-hidden="true" />
            <div className="lower-storyboard-shade" />
            <div className="lower-storyboard-content">
              <div className="lower-storyboard-eyebrow"><Globe2 size={17} aria-hidden="true" /> No ordinary places.</div>
              <p className="lower-storyboard-title">Make the<br />impossible,<br />yours.</p>
              <button className="lower-world-button" onClick={onOpenStudio}>
                Step into the studio <ArrowUpRight size={19} aria-hidden="true" />
              </button>
            </div>
            <div className="lower-storyboard-coordinate" aria-hidden="true">
              <span className="lower-crosshair" />
              <span>Somewhere beyond<br />your everyday.</span>
            </div>
            <div className="lower-atmosphere-controls">
              <div className="lower-atmosphere-heading"><span>Set the atmosphere</span><span className="lower-live-indicator">Live preview</span></div>
              <div className="lower-atmosphere-options" role="group" aria-label="World atmosphere">
                {atmospheres.map(({ id, label, icon: Icon, intensity: presetIntensity }) => (
                  <button key={id} type="button" aria-pressed={atmosphere === id} onClick={() => { setAtmosphere(id); setIntensity(presetIntensity); }}>
                    <Icon size={17} strokeWidth={1.5} aria-hidden="true" /><span>{label}</span>
                  </button>
                ))}
              </div>
              <div className="lower-light-label"><label htmlFor={lightInputId}>Light intensity</label><output htmlFor={lightInputId}>{intensity}%</output></div>
              <input
                id={lightInputId}
                className="lower-light-range"
                type="range"
                min={20}
                max={100}
                value={intensity}
                onChange={(event) => setIntensity(Number(event.target.value))}
                style={{ '--lower-light-progress': `${(intensity - 20) / 0.8}%` } as CSSProperties}
              />
            </div>
            <button className="lower-prompt" onClick={onOpenStudio} aria-label="Open the studio preview and imagine your own world">
              <Sparkles size={19} aria-hidden="true" />
              <span>An ocean at the edge of another planet...</span>
              <span className="lower-prompt-arrow"><ArrowUpRight size={19} aria-hidden="true" /></span>
            </button>
          </div>

          <div className="lower-steps">
            <div className="lower-step">
              <span className="lower-step-number">01 <span className="lower-step-line" /></span>
              <h3>Start with a what if.</h3>
              <p>A floating forest. A city made of clouds. Write down the place you can’t stop thinking about.</p>
            </div>
            <div className="lower-step">
              <span className="lower-step-number">02 <span className="lower-step-line" /></span>
              <h3>Find your kind of far away.</h3>
              <p>Explore the preview collection. Follow a feeling, change the scenery, and make room for the unexpected.</p>
            </div>
            <div className="lower-step">
              <span className="lower-step-number">03 <span className="lower-step-line" /></span>
              <h3>See where it takes you.</h3>
              <p>Keep your favorite worlds close. Let one small idea become the beginning of something bigger.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="lower-faq" id="faq" aria-labelledby="lower-faq-title">
        <div className="lower-container lower-faq-layout">
          <div className="lower-faq-intro">
            <span className="lower-small-label">A few things to know</span>
            <h2 id="lower-faq-title">Wondering<br />about something?</h2>
            <p>Curiosity looks good on you.<br />Here’s a little more about Elsewhere.</p>
            <span className="lower-faq-orbit" aria-hidden="true"><Orbit size={76} strokeWidth={0.7} /></span>
          </div>
          <div className="lower-questions">
            {questions.map(({ question, answer }, index) => (
              <details key={question} className="lower-question" open={index === 0 ? true : undefined}>
                <summary><span>{question}</span><Plus size={20} aria-hidden="true" /></summary>
                <p>{answer}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="lower-final-cta" aria-labelledby="lower-final-title" ref={finalRef}>
        <div className="lower-container">
          <div className="lower-final-topline"><span className="lower-small-label"><span className="lower-status-dot" /> Your next idea starts here.</span><span className="lower-final-hint">A little curious?<br />Good. You’re in the right place.</span></div>
          <h2 id="lower-final-title">
            <motion.button className="lower-final-button" onClick={onOpenStudio} aria-label="Go somewhere new. Open the studio preview." initial="rest" whileHover="hover" animate="rest">
              <motion.span style={{ y: reducedMotion ? 0 : finalY }}>Let’s go<br />elsewhere.</motion.span>
              <motion.span className="lower-final-arrow" variants={{ rest: { rotate: 0 }, hover: { rotate: reducedMotion ? 0 : 12 } }} transition={{ duration: reducedMotion ? 0 : 0.35 }}><MoveUpRight aria-hidden="true" /></motion.span>
            </motion.button>
          </h2>
          <div className="lower-final-bottom"><p>Bring your imagination. Leave the ordinary.</p><button onClick={onOpenStudio}>Try the studio preview <ArrowUpRight size={19} aria-hidden="true" /></button></div>
        </div>
      </section>

      <footer className="lower-footer">
        <div className="lower-container lower-footer-top">
          <a className="lower-footer-brand" href="#" aria-label="Elsewhere, back to top"><Globe2 size={23} strokeWidth={1.6} aria-hidden="true" /> elsewhere</a>
          <nav aria-label="Footer navigation">
            <a href="#how-it-works">How it works</a>
            <a href="#faq">Questions</a>
            <button onClick={() => onNotify('Elsewhere is an interactive product concept. Explore curated worlds in the free studio preview.')}>About this demo <ArrowUpRight size={14} aria-hidden="true" /></button>
          </nav>
        </div>
        <div className="lower-container lower-footer-bottom"><p>© 2026 Elsewhere. An independent product concept.</p><p>For the places we haven’t been. Yet.</p></div>
      </footer>
    </div>
  );
}
