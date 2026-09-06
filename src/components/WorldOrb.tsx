import { useEffect, useId, useRef, useState } from 'react'
import * as THREE from 'three'
import './world-orb.css'

export type WorldOrbProps = {
  variant: 'forest' | 'city' | 'ocean'
  light: number
  mist?: boolean
  className?: string
}

type Variant = WorldOrbProps['variant']
type OrbController = {
  update: (variant: Variant, light: number, mist: boolean) => void
  rotate: (horizontal: number, vertical?: number) => void
  reset: () => void
  setMotion: (enabled: boolean) => void
  dispose: () => void
}

const PALETTES = {
  forest: { deep: '#031b27', water: '#137d81', land: '#28654b', peak: '#b7c291', glow: '#6be5bd', threshold: 0.47 },
  city: { deep: '#061a25', water: '#174e5b', land: '#365958', peak: '#a0b4a0', glow: '#a1ffd2', threshold: 0.46 },
  ocean: { deep: '#042341', water: '#21a0af', land: '#348f80', peak: '#bfded0', glow: '#80efff', threshold: 0.58 },
} satisfies Record<Variant, Record<'deep' | 'water' | 'land' | 'peak' | 'glow', string> & { threshold: number }>

const NOISE_GLSL = `
  float hash(vec3 p) {
    p = fract(p * 0.3183099 + vec3(0.1, 0.2, 0.3));
    p *= 17.0;
    return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
  }
  float noise(vec3 p) {
    vec3 i = floor(p), f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(mix(mix(hash(i), hash(i + vec3(1,0,0)), f.x),
      mix(hash(i + vec3(0,1,0)), hash(i + vec3(1,1,0)), f.x), f.y),
      mix(mix(hash(i + vec3(0,0,1)), hash(i + vec3(1,0,1)), f.x),
      mix(hash(i + vec3(0,1,1)), hash(i + vec3(1,1,1)), f.x), f.y), f.z);
  }
`

const ATMOSPHERE_VERTEX = `
  varying vec3 vNormal;
  varying vec3 vView;
  varying vec3 vPosition;
  void main() {
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vNormal = normalize(normalMatrix * normal);
    vView = -mv.xyz;
    vPosition = position;
    gl_Position = projectionMatrix * mv;
  }
`

function noise3(x: number, y: number, z: number): number {
  const ix = Math.floor(x), iy = Math.floor(y), iz = Math.floor(z)
  const smooth = (t: number) => t * t * (3 - 2 * t)
  const fx = smooth(x - ix), fy = smooth(y - iy), fz = smooth(z - iz)
  const hash = (a: number, b: number, c: number) => {
    const n = Math.sin(a * 127.1 + b * 311.7 + c * 74.7) * 43758.5453
    return n - Math.floor(n)
  }
  const mix = THREE.MathUtils.lerp
  return mix(
    mix(mix(hash(ix, iy, iz), hash(ix + 1, iy, iz), fx), mix(hash(ix, iy + 1, iz), hash(ix + 1, iy + 1, iz), fx), fy),
    mix(mix(hash(ix, iy, iz + 1), hash(ix + 1, iy, iz + 1), fx), mix(hash(ix, iy + 1, iz + 1), hash(ix + 1, iy + 1, iz + 1), fx), fy),
    fz,
  )
}

function elevation(x: number, y: number, z: number): number {
  return noise3(x * 2.6 + 4, y * 2.6 + 1, z * 2.6 + 8) * 0.58
    + noise3(x * 6.2, y * 6.2 + 4, z * 6.2) * 0.28
    + noise3(x * 15.5, y * 15.5, z * 15.5) * 0.14
}

function createTerrain(variant: Variant): THREE.SphereGeometry {
  const geometry = new THREE.SphereGeometry(1, 112, 80)
  const positions = geometry.getAttribute('position')
  const colors = new Float32Array(positions.count * 3)
  const palette = PALETTES[variant]
  const deep = new THREE.Color(palette.deep), water = new THREE.Color(palette.water)
  const land = new THREE.Color(palette.land), peak = new THREE.Color(palette.peak)
  const color = new THREE.Color()
  const normal = new THREE.Vector3()

  for (let i = 0; i < positions.count; i++) {
    normal.fromBufferAttribute(positions, i).normalize()
    const { x, y, z } = normal
    const height = elevation(x, y, z)
    const detail = noise3(x * 55, y * 55, z * 55)
    const landHeight = Math.max(0, height - palette.threshold)
    const radius = 1 + landHeight * 0.3 + landHeight * detail * 0.035
    positions.setXYZ(i, x * radius, y * radius, z * radius)
    if (height < palette.threshold) {
      color.copy(deep).lerp(water, THREE.MathUtils.smoothstep(height, palette.threshold - 0.18, palette.threshold))
    } else {
      color.copy(land).lerp(peak, THREE.MathUtils.smoothstep(landHeight, 0.03, 0.28))
      color.multiplyScalar(0.77 + detail * 0.36)
    }
    color.toArray(colors, i * 3)
  }
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))
  geometry.computeVertexNormals()
  return geometry
}

function createStars(): THREE.Points<THREE.BufferGeometry, THREE.PointsMaterial> {
  const positions = new Float32Array(180 * 3)
  for (let i = 0; i < 180; i++) {
    const angle = i * 2.39996323
    const radius = 2.1 + (i % 31) * 0.12
    positions.set([Math.cos(angle) * radius, Math.sin(angle) * radius * 0.7, -2 - (i % 7) * 0.45], i * 3)
  }
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  return new THREE.Points(geometry, new THREE.PointsMaterial({ color: '#b7ded9', size: 0.015, transparent: true, opacity: 0.6, depthWrite: false }))
}

function createOrb(host: HTMLDivElement, onFailure: () => void): OrbController | null {
  const canvas = document.createElement('canvas')
  canvas.setAttribute('role', 'img')
  const context = canvas.getContext('webgl2', { alpha: true, antialias: true, powerPreference: 'low-power' })
  if (!context) return null

  let renderer: THREE.WebGLRenderer
  try {
    renderer = new THREE.WebGLRenderer({ canvas, context, alpha: true, antialias: true })
  } catch {
    context.getExtension('WEBGL_lose_context')?.loseContext()
    return null
  }
  renderer.setClearColor(0x000000, 0)
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5))
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.25
  host.appendChild(canvas)

  const scene = new THREE.Scene()
  const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 40)
  const world = new THREE.Group()
  const surfaceMaterial = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.79, metalness: 0.14 })
  const surface = new THREE.Mesh(createTerrain('forest'), surfaceMaterial)
  world.add(surface)

  const atmosphereMaterial = new THREE.ShaderMaterial({
    uniforms: { uColor: { value: new THREE.Color(PALETTES.forest.glow) }, uBrightness: { value: 1 } },
    vertexShader: ATMOSPHERE_VERTEX,
    fragmentShader: `
      varying vec3 vNormal; varying vec3 vView;
      uniform vec3 uColor; uniform float uBrightness;
      void main() {
        float rim = pow(1.0 - max(dot(normalize(vNormal), normalize(vView)), 0.0), 3.4);
        gl_FragColor = vec4(uColor * uBrightness, rim * 0.58);
        #include <colorspace_fragment>
      }
    `,
    transparent: true, blending: THREE.AdditiveBlending, depthWrite: false,
  })
  const atmosphere = new THREE.Mesh(new THREE.SphereGeometry(1.075, 64, 48), atmosphereMaterial)
  world.add(atmosphere)

  const cloudMaterial = new THREE.ShaderMaterial({
    uniforms: { uBrightness: { value: 1 } },
    vertexShader: ATMOSPHERE_VERTEX,
    fragmentShader: `
      varying vec3 vNormal; varying vec3 vView; varying vec3 vPosition;
      uniform float uBrightness;
      ${NOISE_GLSL}
      void main() {
        vec3 p = normalize(vPosition);
        float n = noise(p * vec3(4.0, 9.0, 4.0)) * 0.7 + noise(p * 18.0) * 0.3;
        float clouds = smoothstep(0.56, 0.73, n);
        float sun = 0.25 + 0.75 * max(dot(normalize(vNormal), normalize(vec3(-0.6, 0.8, 1.0))), 0.0);
        gl_FragColor = vec4(vec3(0.73, 0.91, 0.88) * sun * uBrightness, clouds * 0.4);
        #include <colorspace_fragment>
      }
    `,
    transparent: true, depthWrite: false,
  })
  const clouds = new THREE.Mesh(new THREE.SphereGeometry(1.06, 64, 48), cloudMaterial)
  world.add(clouds)

  const orbit = new THREE.Group()
  orbit.rotation.set(1.13, 0.18, -0.32)
  const ringMaterial = new THREE.MeshBasicMaterial({ color: '#76c9b3', transparent: true, opacity: 0.42 })
  orbit.add(new THREE.Mesh(new THREE.TorusGeometry(1.57, 0.0035, 6, 160), ringMaterial))
  orbit.add(new THREE.Mesh(new THREE.RingGeometry(1.48, 1.67, 160), new THREE.MeshBasicMaterial({ color: '#64ceb7', side: THREE.DoubleSide, transparent: true, opacity: 0.055, depthWrite: false })))
  const moonMaterial = new THREE.MeshStandardMaterial({ color: '#c5d2bf', roughness: 0.96 })
  const moon = new THREE.Mesh(new THREE.IcosahedronGeometry(0.087, 2), moonMaterial)
  moon.position.set(1.57, 0, 0)
  orbit.add(moon)
  const smallMoon = new THREE.Mesh(new THREE.IcosahedronGeometry(0.039, 1), moonMaterial)
  smallMoon.position.set(-0.85, 1.32, 0)
  orbit.add(smallMoon)
  world.add(orbit)

  const cityPositions: number[] = []
  for (let i = 0; i < 1400; i++) {
    const y = 1 - (i / 1399) * 2
    const r = Math.sqrt(1 - y * y), angle = i * 2.39996323
    const x = r * Math.cos(angle), z = r * Math.sin(angle)
    const height = elevation(x, y, z)
    if (height > PALETTES.city.threshold + 0.015 && height < 0.63 && noise3(x * 23, y * 23, z * 23) > 0.57) {
      const radius = 1.016 + (height - PALETTES.city.threshold) * 0.335
      cityPositions.push(x * radius, y * radius, z * radius)
    }
  }
  const cityGeometry = new THREE.BufferGeometry()
  cityGeometry.setAttribute('position', new THREE.Float32BufferAttribute(cityPositions, 3))
  const cityLights = new THREE.Points(cityGeometry, new THREE.PointsMaterial({ color: '#bfffcb', size: 0.014, transparent: true, opacity: 0.94, blending: THREE.AdditiveBlending, depthWrite: false }))
  cityLights.visible = false
  world.add(cityLights)

  scene.add(world, createStars())
  const ambient = new THREE.HemisphereLight('#b6e6db', '#071c30', 1.4)
  const sun = new THREE.DirectionalLight('#edffda', 3.7)
  sun.position.set(-3, 4, 5)
  const edge = new THREE.DirectionalLight('#3bd5df', 2.1)
  edge.position.set(4, -1, -2)
  scene.add(ambient, sun, edge)
  const initialRotation = new THREE.Euler(0.11, -0.48, -0.13)
  world.rotation.copy(initialRotation)

  let disposed = false, failed = false, frame = 0, lastTime = 0
  let autoRotate = false, intersecting = true, hasSize = false
  let currentVariant: Variant = 'forest'
  let drag: { id: number; x: number; y: number } | null = null

  const visible = () => !disposed && !failed && intersecting && hasSize && !document.hidden
  function fail() {
    if (disposed || failed) return
    failed = true
    cancelAnimationFrame(frame)
    frame = 0
    onFailure()
  }
  renderer.debug.onShaderError = fail

  function render() {
    if (!visible()) return
    try { renderer.render(scene, camera) } catch { fail() }
  }
  function tick(time: number) {
    frame = 0
    if (!visible() || !autoRotate) return
    const delta = lastTime ? Math.min((time - lastTime) / 1000, 0.05) : 0
    lastTime = time
    if (!drag) {
      world.rotation.y += delta * 0.09
      clouds.rotation.y += delta * 0.018
    }
    render()
    if (visible()) frame = requestAnimationFrame(tick)
  }
  function syncAnimation() {
    cancelAnimationFrame(frame)
    frame = 0
    lastTime = 0
    render()
    if (visible() && autoRotate) frame = requestAnimationFrame(tick)
  }
  function rotate(horizontal: number, vertical = 0) {
    world.rotation.y += horizontal
    world.rotation.x = THREE.MathUtils.clamp(world.rotation.x + vertical, -1.1, 1.1)
    render()
  }
  function resize() {
    const { width, height } = host.getBoundingClientRect()
    hasSize = width > 0 && height > 0
    if (hasSize) {
      camera.aspect = width / height
      camera.position.z = Math.max(6.2, 5.9 / camera.aspect)
      camera.updateProjectionMatrix()
      renderer.setSize(width, height, false)
    }
    syncAnimation()
  }
  function pointerDown(event: PointerEvent) {
    if (!event.isPrimary || event.button !== 0 || failed) return
    drag = { id: event.pointerId, x: event.clientX, y: event.clientY }
    canvas.setPointerCapture(event.pointerId)
    canvas.classList.add('world-orb__canvas--dragging')
  }
  function pointerMove(event: PointerEvent) {
    if (!drag || event.pointerId !== drag.id) return
    rotate((event.clientX - drag.x) * 0.007, (event.clientY - drag.y) * 0.005)
    drag = { id: drag.id, x: event.clientX, y: event.clientY }
  }
  function pointerEnd(event: PointerEvent) {
    if (!drag || event.pointerId !== drag.id) return
    drag = null
    if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId)
    canvas.classList.remove('world-orb__canvas--dragging')
  }
  function contextLost(event: Event) {
    event.preventDefault()
    fail()
  }

  canvas.addEventListener('pointerdown', pointerDown)
  canvas.addEventListener('pointermove', pointerMove)
  canvas.addEventListener('pointerup', pointerEnd)
  canvas.addEventListener('pointercancel', pointerEnd)
  canvas.addEventListener('lostpointercapture', pointerEnd)
  canvas.addEventListener('webglcontextlost', contextLost)
  document.addEventListener('visibilitychange', syncAnimation)
  const resizeObserver = new ResizeObserver(resize)
  resizeObserver.observe(host)
  const intersectionObserver = new IntersectionObserver(([entry]) => {
    intersecting = entry?.isIntersecting ?? false
    syncAnimation()
  })
  intersectionObserver.observe(host)
  resize()

  return {
    rotate,
    reset() { world.rotation.copy(initialRotation); clouds.rotation.set(0, 0, 0); render() },
    setMotion(enabled) { autoRotate = enabled; syncAnimation() },
    update(variant, light, mist) {
      clouds.visible = mist
      atmosphere.visible = mist
      if (disposed || failed) return
      if (variant !== currentVariant) {
        const oldGeometry = surface.geometry
        surface.geometry = createTerrain(variant)
        oldGeometry.dispose()
        currentVariant = variant
      }
      const brightness = THREE.MathUtils.clamp(Number.isFinite(light) ? light : 65, 0, 100) / 100
      atmosphereMaterial.uniforms.uColor.value.set(PALETTES[variant].glow)
      atmosphereMaterial.uniforms.uBrightness.value = 0.6 + brightness * 0.55
      cloudMaterial.uniforms.uBrightness.value = 0.4 + brightness * 0.7
      sun.intensity = 0.65 + brightness * 4.6
      ambient.intensity = 0.45 + brightness * 1.15
      cityLights.visible = variant === 'city'
      canvas.setAttribute('aria-label', `Interactive ${variant} planet with textured terrain, an orbital ring and two moons. Use the rotation controls below to change the view.`)
      render()
    },
    dispose() {
      disposed = true
      cancelAnimationFrame(frame)
      resizeObserver.disconnect()
      intersectionObserver.disconnect()
      document.removeEventListener('visibilitychange', syncAnimation)
      canvas.removeEventListener('pointerdown', pointerDown)
      canvas.removeEventListener('pointermove', pointerMove)
      canvas.removeEventListener('pointerup', pointerEnd)
      canvas.removeEventListener('pointercancel', pointerEnd)
      canvas.removeEventListener('lostpointercapture', pointerEnd)
      canvas.removeEventListener('webglcontextlost', contextLost)
      if (drag && canvas.hasPointerCapture(drag.id)) canvas.releasePointerCapture(drag.id)
      const geometries = new Set<THREE.BufferGeometry>()
      const materials = new Set<THREE.Material>()
      scene.traverse((object) => {
        if (object instanceof THREE.Mesh || object instanceof THREE.Points) {
          geometries.add(object.geometry)
          const objectMaterials = Array.isArray(object.material) ? object.material : [object.material]
          objectMaterials.forEach((material) => materials.add(material))
        }
      })
      geometries.forEach((geometry) => geometry.dispose())
      materials.forEach((material) => material.dispose())
      scene.clear()
      renderer.dispose()
      renderer.forceContextLoss()
      canvas.remove()
    },
  }
}

export default function WorldOrb({ variant, light, mist = true, className = '' }: WorldOrbProps) {
  const hostRef = useRef<HTMLDivElement>(null)
  const controllerRef = useRef<OrbController | null>(null)
  const [unavailable, setUnavailable] = useState(false)
  const [autoRotate, setAutoRotate] = useState(true)
  const [reducedMotion, setReducedMotion] = useState(() => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches)
  const descriptionId = useId()

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)')
    const update = () => setReducedMotion(media.matches)
    media.addEventListener('change', update)
    return () => media.removeEventListener('change', update)
  }, [])

  useEffect(() => {
    if (!hostRef.current) return
    setUnavailable(false)
    const controller = createOrb(hostRef.current, () => setUnavailable(true))
    controllerRef.current = controller
    if (!controller) setUnavailable(true)
    return () => { controller?.dispose(); controllerRef.current = null }
  }, [])

  useEffect(() => { controllerRef.current?.update(variant, light, mist) }, [variant, light, mist])
  useEffect(() => { controllerRef.current?.setMotion(autoRotate && !reducedMotion) }, [autoRotate, reducedMotion])

  return (
    <div className={`world-orb world-orb--${variant} ${className}`}>
      <div className="world-orb__coordinates" aria-hidden="true"><span>ORBITAL VIEW</span><span>01 / ∞</span></div>
      <div ref={hostRef} className="world-orb__viewport" aria-hidden={unavailable || undefined} />
      {unavailable && <div className="world-orb__fallback" role="status">
        <div className="world-orb__fallback-sphere" aria-hidden="true" />
        <p>3D preview is unavailable in this browser.<br />Your world settings are still ready to explore.</p>
      </div>}
      <div className="world-orb__footer">
        <p id={descriptionId} className="world-orb__hint">{unavailable ? 'PLANET PREVIEW' : reducedMotion ? 'DRAG TO EXPLORE · MOTION REDUCED' : 'DRAG TO EXPLORE YOUR WORLD'}</p>
        <div className="world-orb__controls" role="group" aria-label="Planet rotation" aria-describedby={descriptionId}>
          <button type="button" onClick={() => controllerRef.current?.rotate(-0.3)} disabled={unavailable} aria-label="Rotate planet left" title="Rotate left">←</button>
          <button type="button" onClick={() => controllerRef.current?.rotate(0, -0.2)} disabled={unavailable} aria-label="Tilt planet up" title="Tilt up">↑</button>
          <button type="button" className="world-orb__reset" onClick={() => controllerRef.current?.reset()} disabled={unavailable}>Reset view</button>
          <button type="button" onClick={() => controllerRef.current?.rotate(0, 0.2)} disabled={unavailable} aria-label="Tilt planet down" title="Tilt down">↓</button>
          <button type="button" onClick={() => controllerRef.current?.rotate(0.3)} disabled={unavailable} aria-label="Rotate planet right" title="Rotate right">→</button>
          <button type="button" className="world-orb__motion" onClick={() => setAutoRotate((playing) => !playing)} disabled={unavailable || reducedMotion} aria-pressed={autoRotate && !reducedMotion} aria-label="Automatic planet rotation" title={reducedMotion ? 'Automatic rotation is off for reduced motion' : undefined}>{autoRotate && !reducedMotion ? 'Pause' : 'Play'}</button>
        </div>
      </div>
    </div>
  )
}
