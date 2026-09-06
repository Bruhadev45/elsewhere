import { useEffect, useRef, useState } from 'react'
import { motion, useMotionValueEvent, useReducedMotion, useScroll, useSpring, useTransform, useVelocity, type MotionValue } from 'framer-motion'
import { ArrowUpRight } from 'lucide-react'
import './scroll-journey.css'

type ScrollJourneyProps = { onOpenStudio: () => void }

function ChapterProgress({ progress, start, end, label }: { progress: MotionValue<number>; start: number; end: number; label: string }) {
  const fill = useTransform(progress, [start, end], [0, 1])
  return <div className="journey-chapter"><span>{label}</span><div className="journey-chapter-track"><motion.div style={{ scaleX: fill }} /></div></div>
}

function JourneyButton({ onOpenStudio }: ScrollJourneyProps) {
  return <button className="journey-create" onClick={onOpenStudio}>Make this world yours <ArrowUpRight size={19} aria-hidden="true" /></button>
}

type SceneLayerProps = {
  src: string
  poster: string
  active: boolean
  className: string
  style: Record<string, unknown>
  priority?: boolean
}

function SceneLayer({ src, poster, active, className, style, priority }: SceneLayerProps) {
  const video = useRef<HTMLVideoElement>(null)
  const reducedMotion = useReducedMotion()
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    const element = video.current
    if (!element || reducedMotion || failed) return
    const sync = () => {
      if (active && !document.hidden) void element.play().catch(() => undefined)
      else element.pause()
    }
    sync()
    document.addEventListener('visibilitychange', sync)
    return () => document.removeEventListener('visibilitychange', sync)
  }, [active, reducedMotion, failed])

  // Reduced motion and decode failures fall back to the still the video was built from.
  if (reducedMotion || failed) {
    return <motion.img className={className} src={poster} alt="" loading={priority ? 'eager' : 'lazy'} style={style} />
  }
  return (
    <motion.video
      ref={video}
      className={className}
      src={src}
      poster={poster}
      muted
      loop
      playsInline
      preload={priority ? 'auto' : 'none'}
      aria-hidden="true"
      onError={() => setFailed(true)}
      style={style}
    />
  )
}

function AnimatedJourney({ onOpenStudio }: ScrollJourneyProps) {
  const section = useRef<HTMLElement>(null)
  const { scrollYProgress } = useScroll({ target: section, offset: ['start start', 'end end'] })
  const progress = useSpring(scrollYProgress, { stiffness: 120, damping: 32, restDelta: 0.001 })
  const [canCreate, setCanCreate] = useState(false)
  const [scene, setScene] = useState(0)
  const previousScene = useRef(0)
  const previousCanCreate = useRef(false)
  useMotionValueEvent(progress, 'change', value => {
    const nextScene = value < 0.42 ? 0 : value < 0.75 ? 1 : 2
    if (nextScene !== previousScene.current) {
      previousScene.current = nextScene
      setScene(nextScene)
    }
    const next = value >= 0.84
    if (next !== previousCanCreate.current) {
      previousCanCreate.current = next
      setCanCreate(next)
    }
  })

  // Reveal a full-resolution scene instead of magnifying a small portal image.
  const portalClip = useTransform(progress, [0, 0.09, 0.35], ['inset(14% 23% 14% 23% round 48% 48% 3% 3%)', 'inset(12% 21% 12% 21% round 45% 45% 3% 3%)', 'inset(0% 0% 0% 0% round 0% 0% 0% 0%)'])
  const openingScale = useTransform(progress, [0, 0.48], [1.12, 1.02])
  const openingY = useTransform(progress, [0, 0.48], ['2%', '-2%'])
  const cityScale = useTransform(progress, [0.34, 0.74], [1.09, 1.02])
  const cityX = useTransform(progress, [0.34, 0.74], ['-1.5%', '1%'])
  const oceanScale = useTransform(progress, [0.68, 1], [1.08, 1.01])
  const oceanY = useTransform(progress, [0.68, 1], ['2%', '0%'])
  const openingOpacity = useTransform(progress, [0.37, 0.48], [1, 0])
  const oceanOpacity = useTransform(progress, [0.69, 0.81], [0, 1])
  const introOpacity = useTransform(progress, [0, 0.12, 0.29], [1, 1, 0])
  const introXLeft = useTransform(progress, [0, 0.31], ['0%', '-32%'])
  const introXRight = useTransform(progress, [0, 0.31], ['0%', '32%'])
  const introScale = useTransform(progress, [0, 0.31], [1, 1.12])
  const middleOpacity = useTransform(progress, [0.43, 0.51, 0.64, 0.73], [0, 1, 1, 0])
  const middleY = useTransform(progress, [0.43, 0.73], [38, -26])
  const orbitRotation = useTransform(progress, [0.32, 0.8], [-24, 25])
  const finalOpacity = useTransform(progress, [0.8, 0.87], [0, 1])
  const finalY = useTransform(progress, [0.8, 0.9], [45, 0])
  const shadeOpacity = useTransform(progress, [0.35, 0.75, 1], [0.15, 0.32, 0.5])

  // The stage reacts to how hard you are scrolling, not just how far.
  const velocity = useSpring(useVelocity(scrollYProgress), { stiffness: 220, damping: 42, restDelta: 0.0005 })
  const stageSkew = useTransform(velocity, [-2.6, 0, 2.6], [1.6, 0, -1.6], { clamp: true })
  const stageStretch = useTransform(velocity, [-2.6, 0, 2.6], [1.035, 1, 1.035], { clamp: true })
  // Outgoing scenes soften as they hand over, so the crossfades read as depth.
  const openingBlur = useTransform(progress, [0.3, 0.48], ['blur(0px)', 'blur(13px)'])
  const cityBlur = useTransform(progress, [0.62, 0.81], ['blur(0px)', 'blur(13px)'])
  // A mist layer running faster than the scene behind it.
  const mistY = useTransform(progress, [0, 1], ['12%', '-26%'])
  const mistOpacity = useTransform(progress, [0, 0.18, 0.85, 1], [0, 0.17, 0.17, 0.05])
  const grainOpacity = useTransform(progress, [0, 0.5, 1], [0.07, 0.13, 0.07])
  const cueOpacity = useTransform(progress, [0, 0.08], [1, 0])

  return (
    <section id="journey" ref={section} className="scroll-journey" aria-label="A journey through worlds">
      <div className="journey-stage">
        <motion.div className="journey-grain" style={{ opacity: grainOpacity }} aria-hidden="true" />
        <motion.div className="journey-portal" style={{ clipPath: portalClip, skewY: stageSkew, scaleY: stageStretch }} aria-hidden="true">
          <SceneLayer className="journey-world journey-world-city" src="/assets/neon-city-loop.mp4" poster="/assets/neon-city.webp" active={scene === 1} style={{ scale: cityScale, x: cityX, filter: cityBlur }} />
          <SceneLayer className="journey-world" src="/assets/sky-library-loop.mp4" poster="/assets/sky-library.webp" active={scene === 0} priority style={{ opacity: openingOpacity, scale: openingScale, y: openingY, filter: openingBlur }} />
          <SceneLayer className="journey-world" src="/assets/alien-ocean-loop.mp4" poster="/assets/alien-ocean.webp" active={scene === 2} style={{ opacity: oceanOpacity, scale: oceanScale, y: oceanY }} />
        </motion.div>
        <motion.div className="journey-shade" style={{ opacity: shadeOpacity }} aria-hidden="true" />
        <motion.div className="journey-mist" style={{ y: mistY, opacity: mistOpacity }} aria-hidden="true" />
        <motion.div className="journey-intro" style={{ opacity: introOpacity, scale: introScale }}>
          <span className="journey-kicker"><b>01 / Dream</b>A little further from ordinary</span>
          <motion.h2 initial="hidden" animate="shown" aria-label="A little less here. A little more elsewhere.">
            <motion.span style={{ x: introXLeft }} aria-hidden="true">
              {'A little less here.'.split(' ').map((word, index) => (
                <motion.i
                  key={word + index}
                  variants={{ hidden: { y: '110%', opacity: 0 }, shown: { y: 0, opacity: 1 } }}
                  transition={{ duration: 1.05, delay: 0.3 + index * 0.09, ease: [0.22, 1, 0.36, 1] }}
                >{word}</motion.i>
              ))}
            </motion.span>
            <motion.span style={{ x: introXRight }} aria-hidden="true">
              {'A little more elsewhere.'.split(' ').map((word, index) => (
                <motion.i
                  key={word + index}
                  variants={{ hidden: { y: '110%', opacity: 0 }, shown: { y: 0, opacity: 1 } }}
                  transition={{ duration: 1.05, delay: 0.52 + index * 0.09, ease: [0.22, 1, 0.36, 1] }}
                >{word}</motion.i>
              ))}
            </motion.span>
          </motion.h2>
          <motion.span className="journey-scroll-cue" style={{ opacity: cueOpacity }}><span />Keep wandering</motion.span>
        </motion.div>
        <motion.div className="journey-atmosphere" style={{ opacity: middleOpacity, y: middleY }} aria-hidden="true">
          <motion.div className="journey-orbit" style={{ rotate: orbitRotation }}><i /></motion.div>
          <div className="journey-atmosphere-copy">
            <span className="journey-scene-label">02 / Wander — Somewhere, 2089</span>
            <p>Change the<br />atmosphere.</p>
            <span className="journey-atmosphere-note">Same imagination. Entirely new possibilities.</span>
          </div>
        </motion.div>
        <motion.div className="journey-finale" style={{ opacity: finalOpacity, y: finalY }} aria-hidden={!canCreate}>
          <div className="journey-finale-copy">
            <span className="journey-scene-label">03 / Create — Beyond the Blue</span>
            <span className="journey-finale-note">Somewhere only you could imagine.</span>
            <p>You could get<br />lost here.</p>
            {canCreate && <JourneyButton onOpenStudio={onOpenStudio} />}
          </div>
        </motion.div>
        <div className="journey-footer">
          <span className="journey-coordinate" aria-hidden="true">Beyond the familiar <span>↗</span></span>
          <div className="journey-chapters" aria-label="Journey chapters">
            <ChapterProgress progress={progress} start={0} end={0.4} label="Dream" />
            <ChapterProgress progress={progress} start={0.4} end={0.77} label="Wander" />
            <ChapterProgress progress={progress} start={0.77} end={1} label="Create" />
          </div>
          <span className="journey-endnote" aria-hidden="true">An elsewhere experience</span>
        </div>
      </div>
    </section>
  )
}

export default function ScrollJourney({ onOpenStudio }: ScrollJourneyProps) {
  const reducedMotion = useReducedMotion()
  if (reducedMotion) return (
    <section id="journey" className="journey-static" aria-label="A journey through worlds">
      <img src="/assets/alien-ocean.webp" alt="An otherworldly ocean beneath an alien sky" loading="lazy" />
      <div className="journey-static-content"><span>Somewhere only you could imagine.</span><h2>You could get<br />lost here.</h2><JourneyButton onOpenStudio={onOpenStudio} /></div>
    </section>
  )
  return <AnimatedJourney onOpenStudio={onOpenStudio} />
}
