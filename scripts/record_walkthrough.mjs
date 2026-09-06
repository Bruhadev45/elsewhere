/**
 * Records a scroll-through of the site as an mp4, for sharing.
 *
 *   node scripts/record_walkthrough.mjs [url] [outfile]
 *
 * Drives a real Chrome at a fixed viewport, steps the page down frame by frame
 * with eased holds on the sections worth reading, then encodes with ffmpeg.
 */
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { spawn } from 'node:child_process'
import puppeteer from 'puppeteer-core'

const URL = process.argv[2] ?? 'http://127.0.0.1:5199/'
const OUT = process.argv[3] ?? `${process.env.HOME}/Desktop/elsewhere-walkthrough.mp4`
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const WIDTH = 1280
const HEIGHT = 720
const FPS = 30
// Scroll pace. ~24px/frame at 30fps reads as an ordinary reading scroll.
const PX_PER_FRAME = 24

// Sections worth pausing on, matched by selector, with a hold in seconds.
const HOLDS = [
  { selector: '.scroll-journey', at: 0.02, hold: 0.8 },
  { selector: '.scene-band', at: 0.5, hold: 0.7 },
  { selector: '.intro-starters', at: 0.5, hold: 0.8 },
  { selector: '.statement', at: 0.55, hold: 0.8 },
  { selector: '#worlds', at: 0.25, hold: 0.7 },
  { selector: '.lower-workflow', at: 0.4, hold: 0.7 },
]

const run = (cmd, args) => new Promise((resolve, reject) => {
  const child = spawn(cmd, args, { stdio: ['ignore', 'inherit', 'inherit'] })
  child.on('error', reject)
  child.on('close', code => (code === 0 ? resolve() : reject(new Error(`${cmd} exited ${code}`))))
})

const frames = await mkdtemp(join(tmpdir(), 'elsewhere-frames-'))
const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: 'shell',
  args: [
    '--autoplay-policy=no-user-gesture-required',
    '--hide-scrollbars',
    '--force-device-scale-factor=1',
    '--enable-unsafe-swiftshader',
    `--window-size=${WIDTH},${HEIGHT}`,
  ],
  defaultViewport: { width: WIDTH, height: HEIGHT, deviceScaleFactor: 2 },
})

try {
  const page = await browser.newPage()
  await page.goto(URL, { waitUntil: 'networkidle2', timeout: 90000 })
  await page.evaluate(() => {
    history.scrollRestoration = 'manual'
    document.documentElement.style.scrollBehavior = 'auto'
    window.scrollTo(0, 0)
  })
  await new Promise(r => setTimeout(r, 2500))

  const total = await page.evaluate(() => document.documentElement.scrollHeight - window.innerHeight)
  const stops = []
  for (const entry of HOLDS) {
    const y = await page.evaluate((sel, at) => {
      const el = document.querySelector(sel)
      if (!el) return null
      const rect = el.getBoundingClientRect()
      return Math.round(rect.top + window.scrollY + rect.height * at - window.innerHeight * 0.5)
    }, entry.selector, entry.at)
    if (y !== null) stops.push({ y: Math.max(0, Math.min(total, y)), hold: entry.hold })
  }
  stops.sort((a, b) => a.y - b.y)

  // Build the scroll timeline: glide between stops, pause on each.
  const timeline = []
  let current = 0
  const glide = (from, to) => {
    const distance = Math.abs(to - from)
    const steps = Math.max(10, Math.round(distance / PX_PER_FRAME))
    for (let i = 1; i <= steps; i++) {
      const t = i / steps
      const eased = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2
      timeline.push(Math.round(from + (to - from) * eased))
    }
  }
  for (const stop of stops) {
    glide(current, stop.y)
    for (let i = 0; i < Math.round(stop.hold * FPS); i++) timeline.push(stop.y)
    current = stop.y
  }
  glide(current, total)
  for (let i = 0; i < Math.round(FPS * 1.2); i++) timeline.push(total)

  console.log(`page height ${total}px · ${timeline.length} frames · ~${(timeline.length / FPS).toFixed(1)}s`)

  for (let i = 0; i < timeline.length; i++) {
    await page.evaluate(y => window.scrollTo(0, y), timeline[i])
    await page.screenshot({ path: join(frames, `f${String(i).padStart(5, '0')}.png`), optimizeForSpeed: true })
    if (i % 90 === 0) console.log(`  ${i}/${timeline.length}`)
  }

  await run('ffmpeg', [
    '-y', '-hide_banner', '-loglevel', 'error',
    '-framerate', String(FPS), '-i', join(frames, 'f%05d.png'),
    '-c:v', 'libx264', '-preset', 'slow', '-crf', '20',
    '-pix_fmt', 'yuv420p', '-movflags', '+faststart',
    '-vf', `scale=${WIDTH}:${HEIGHT}:flags=lanczos`,
    OUT,
  ])
  console.log(`\nwrote ${OUT}`)
} finally {
  await browser.close()
  await rm(frames, { recursive: true, force: true })
}
