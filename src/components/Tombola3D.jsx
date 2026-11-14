// src/components/Tombola3D.jsx
//
// La tómbola en 3D (three.js). Se carga aparte del resto de la web; si el
// equipo no soporta 3D, Tombola.jsx muestra la versión dibujada.
//
//  - El tambor dorado gira solo; se puede girar con el dedo o el mouse.
//  - Cada papelito es un boleto del pool (hasta 160); los tuyos van en dorado.
//  - Cuando entran boletos nuevos, caen desde arriba.
//  - Con `spinning` (Chainlink sorteando) el tambor gira rápido.
//  - Alrededor flotan monedas PRIZE.

import { useEffect, useRef } from 'react'
import {
  WebGLRenderer, Scene, PerspectiveCamera, Group, Mesh, InstancedMesh, Object3D, Color,
  TorusGeometry, CylinderGeometry, SphereGeometry, BoxGeometry, CircleGeometry, PlaneGeometry,
  MeshStandardMaterial, MeshPhysicalMaterial, MeshBasicMaterial,
  AmbientLight, DirectionalLight, PointLight, PMREMGenerator, CanvasTexture, TextureLoader,
  ACESFilmicToneMapping, SRGBColorSpace, DoubleSide, Vector3, DynamicDrawUsage,
} from 'three'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'

const MAX = 160
const R = 1.5, L = 1.5, APO = R * Math.cos(Math.PI / 8), R_IN = APO - 0.07
const G = 7.5
const BASE_SLOW = 0.38, BASE_FAST = 2.25
const UP = new Vector3(0, 1, 0)

function rod(a, b, radius, material, seg = 10) {
  const dir = new Vector3().subVectors(b, a)
  const m = new Mesh(new CylinderGeometry(radius, radius, dir.length(), seg), material)
  m.position.copy(a).addScaledVector(dir, 0.5)
  m.quaternion.setFromUnitVectors(UP, dir.clone().normalize())
  return m
}

function ticketTexture() {
  const c = document.createElement('canvas'); c.width = 128; c.height = 72
  const x = c.getContext('2d')
  x.fillStyle = '#fff'; x.fillRect(0, 0, 128, 72)
  x.strokeStyle = 'rgba(60,50,30,.55)'; x.lineWidth = 2; x.setLineDash([5, 5])
  x.beginPath(); x.moveTo(94, 4); x.lineTo(94, 68); x.stroke()
  x.setLineDash([]); x.lineWidth = 3; x.strokeStyle = 'rgba(60,50,30,.35)'; x.strokeRect(3, 3, 122, 66)
  x.fillStyle = '#C8372D'; x.font = '900 30px "Big Shoulders Display", Impact, sans-serif'
  x.textBaseline = 'middle'; x.fillText('PRIZE', 12, 38)
  const t = new CanvasTexture(c); t.colorSpace = SRGBColorSpace; t.anisotropy = 4
  return t
}

function shadowTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 128
  const x = c.getContext('2d')
  const g = x.createRadialGradient(64, 64, 4, 64, 64, 62)
  g.addColorStop(0, 'rgba(0,0,0,.55)'); g.addColorStop(1, 'rgba(0,0,0,0)')
  x.fillStyle = g; x.fillRect(0, 0, 128, 128)
  return new CanvasTexture(c)
}

function createTombola(canvas, host, onFail) {
  const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  const renderer = new WebGLRenderer({ canvas, alpha: true, antialias: true })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
  renderer.toneMapping = ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.12
  renderer.outputColorSpace = SRGBColorSpace

  const scene = new Scene()
  const pmrem = new PMREMGenerator(renderer)
  const envRT = pmrem.fromScene(new RoomEnvironment(), 0.04)
  scene.environment = envRT.texture

  const camera = new PerspectiveCamera(30, 1, 0.1, 60)

  scene.add(new AmbientLight(0xffffff, 0.22))
  const key = new DirectionalLight(0xfff1d6, 2.4); key.position.set(3, 5, 6); scene.add(key)
  const rim = new PointLight(0x3DD6F5, 40, 14); rim.position.set(-4.5, 1.2, -2.5); scene.add(rim)
  const glow = new PointLight(0xE8B341, 2.5, 5); glow.position.set(0, 0.2, 0.3); scene.add(glow)

  const disposables = []
  const keep = o => { disposables.push(o); return o }

  const gold  = keep(new MeshStandardMaterial({ color: 0xE8B341, metalness: 1, roughness: 0.24 }))
  const goldD = keep(new MeshStandardMaterial({ color: 0xC9962E, metalness: 1, roughness: 0.38 }))
  const steel = keep(new MeshStandardMaterial({ color: 0x2C4285, metalness: 0.7, roughness: 0.42 }))
  const red   = keep(new MeshStandardMaterial({ color: 0xC8372D, metalness: 0.1, roughness: 0.35 }))
  const cream = keep(new MeshStandardMaterial({ color: 0xF2E6C8, metalness: 0, roughness: 0.6 }))

  // ── Estructura: todo cuelga de `rig`, que mira un poco de lado ──
  const rig = new Group(); rig.rotation.set(0.06, -0.42, 0); scene.add(rig)
  const drum = new Group(); rig.add(drum)

  const ringG = keep(new TorusGeometry(R, 0.055, 10, 8))
  const wireG = keep(new TorusGeometry(R, 0.02, 6, 8))
  for (const z of [-L / 2, L / 2]) { const m = new Mesh(ringG, gold); m.position.z = z; drum.add(m) }
  for (const z of [-L / 6, L / 6]) { const m = new Mesh(wireG, goldD); m.position.z = z; drum.add(m) }
  const ballG = keep(new SphereGeometry(0.09, 18, 14))
  for (let k = 0; k < 8; k++) {
    const t = k * Math.PI / 4, c = Math.cos(t), s = Math.sin(t)
    drum.add(rod(new Vector3(R * c, R * s, -L / 2), new Vector3(R * c, R * s, L / 2), 0.04, gold))
    const t2 = t + Math.PI / 8
    drum.add(rod(new Vector3(APO * Math.cos(t2), APO * Math.sin(t2), -L / 2), new Vector3(APO * Math.cos(t2), APO * Math.sin(t2), L / 2), 0.016, goldD, 6))
    for (const z of [-L / 2, L / 2]) {
      drum.add(rod(new Vector3(0, 0, z), new Vector3(R * c, R * s, z), 0.022, goldD, 6))
      const b = new Mesh(ballG, gold); b.position.set(R * c, R * s, z); drum.add(b)
    }
  }
  const glass = new Mesh(
    keep(new CylinderGeometry(R * 0.985, R * 0.985, L, 8, 1, true).rotateX(Math.PI / 2)),
    keep(new MeshPhysicalMaterial({ color: 0xBFE6FF, transparent: true, opacity: 0.075, roughness: 0.08, metalness: 0, side: DoubleSide, depthWrite: false, flatShading: true })),
  )
  glass.renderOrder = 2; drum.add(glass)
  const back = new Mesh(keep(new CircleGeometry(R * 0.97, 8)), keep(new MeshBasicMaterial({ color: 0x0A1330, transparent: true, opacity: 0.6, depthWrite: false })))
  back.position.z = -L / 2 + 0.01; drum.add(back)
  const hubG = keep(new CylinderGeometry(0.17, 0.17, 0.12, 24).rotateX(Math.PI / 2))
  for (const z of [-L / 2, L / 2]) { const h = new Mesh(hubG, gold); h.position.z = z; drum.add(h) }
  // manivela (gira con el tambor)
  const zc = L / 2 + 0.34
  drum.add(rod(new Vector3(0, 0, zc), new Vector3(0.5, 0.34, zc), 0.045, cream))
  drum.add(rod(new Vector3(0.5, 0.34, zc - 0.02), new Vector3(0.5, 0.34, zc + 0.34), 0.085, red, 16))
  const cap = new Mesh(keep(new SphereGeometry(0.085, 16, 12)), red); cap.position.set(0.5, 0.34, zc + 0.34); drum.add(cap)

  // eje y soporte (no giran)
  rig.add(rod(new Vector3(0, 0, -L / 2 - 0.3), new Vector3(0, 0, L / 2 + 0.36), 0.06, gold, 14))
  const FY = -2.28
  for (const z of [-L / 2 - 0.24, L / 2 + 0.24]) {
    rig.add(rod(new Vector3(0, 0, z), new Vector3(-1.2, FY, z), 0.055, steel))
    rig.add(rod(new Vector3(0, 0, z), new Vector3(1.2, FY, z), 0.055, steel))
    rig.add(rod(new Vector3(-1.45, FY, z), new Vector3(1.45, FY, z), 0.06, steel))
    const j = new Mesh(keep(new SphereGeometry(0.11, 16, 12)), steel); j.position.set(0, 0, z); rig.add(j)
  }
  for (const x of [-1.2, 1.2]) rig.add(rod(new Vector3(x, FY, -L / 2 - 0.24), new Vector3(x, FY, L / 2 + 0.24), 0.05, steel))
  const shadowTex = keep(shadowTexture())
  const shadow = new Mesh(keep(new PlaneGeometry(5.6, 3.6)), keep(new MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false })))
  shadow.rotation.x = -Math.PI / 2; shadow.position.y = FY - 0.08; rig.add(shadow)

  // ── Boletos ──
  const tex = keep(ticketTexture())
  const tGeo = keep(new BoxGeometry(0.5, 0.275, 0.016))
  const tMat = keep(new MeshStandardMaterial({ map: tex, roughness: 0.85, metalness: 0, envMapIntensity: 0.35 }))
  const tickets = new InstancedMesh(tGeo, tMat, MAX)
  tickets.instanceMatrix.setUsage(DynamicDrawUsage)
  tickets.count = 0; tickets.frustumCulled = false
  rig.add(tickets)
  const P = Array.from({ length: MAX }, () => ({}))
  const dummy = new Object3D(), col = new Color()
  let count = 0, omega = BASE_SLOW, base = reduce ? 0.1 : BASE_SLOW, drumAngle = 0

  const rnd = (a, b) => a + Math.random() * (b - a)
  function seed(p, n, drop) {
    const thick = 0.16 + 0.6 * Math.min(1, n / 140)
    p.rmax = R_IN - Math.pow(Math.random(), 1.4) * thick
    p.fr = rnd(1.5, 4.5)
    p.bias = rnd(-1, 1) * (0.22 + 0.35 * Math.min(1, n / 110))
    p.z = rnd(-L / 2 + 0.16, L / 2 - 0.16)
    p.off = rnd(-0.5, 0.5); p.tilt = rnd(-0.7, 0.7)
    p.rx = p.tilt; p.ry = rnd(-0.4, 0.4); p.rz = rnd(0, 6.28)
    p.sx = p.sy = p.sz = 0
    p.kick = rnd(0, 6)
    if (drop) {                                  // entra cayendo desde arriba
      p.x = rnd(-0.35, 0.35); p.y = rnd(0.3, 1.0); p.vx = rnd(-0.8, 0.8); p.vy = rnd(-1, 0.5)
      p.sx = rnd(-6, 6); p.sz = rnd(-6, 6)
    } else {                                     // ya descansa abajo
      const a = -Math.PI / 2 + p.bias * 0.9 + 0.15
      p.x = p.rmax * Math.cos(a); p.y = p.rmax * Math.sin(a); p.vx = p.vy = 0
    }
  }
  function setTickets(n, mine) {
    n = Math.max(0, Math.min(MAX, n))
    const first = count === 0
    if (n < count) for (let i = 0; i < n; i++) seed(P[i], n, false)
    for (let i = count; i < n; i++) seed(P[i], n, !first)
    count = n; tickets.count = n
    for (let i = 0; i < n; i++) {
      const isMine = mine > 0 && Math.floor((i + 1) * mine / n) !== Math.floor(i * mine / n)
      if (isMine) col.setHex(0xE39A12)
      else col.setHex(0xE4D2A4).multiplyScalar(0.86 + ((i * 37) % 10) / 70)
      tickets.setColorAt(i, col)
    }
    if (tickets.instanceColor) tickets.instanceColor.needsUpdate = true
  }
  function stepTickets(dt) {
    const kickRate = reduce ? 0 : 0.03 + Math.abs(omega) * 0.13
    for (let i = 0; i < count; i++) {
      const p = P[i]
      p.vy -= G * dt
      p.x += p.vx * dt; p.y += p.vy * dt
      const r = Math.hypot(p.x, p.y)
      let touching = false
      if (r > p.rmax) {
        touching = true
        const nx = p.x / r, ny = p.y / r, tx = -ny, ty = nx
        p.x = nx * p.rmax; p.y = ny * p.rmax
        let vn = p.vx * nx + p.vy * ny, vt = p.vx * tx + p.vy * ty
        if (vn > 0) vn = -vn * 0.12
        vt += (omega * p.rmax - vt) * Math.min(1, p.fr * dt)
        vt += G * p.bias * dt
        p.kick -= dt * kickRate * 6
        if (p.kick <= 0) {                        // el tambor lo levanta: salta hacia adentro
          p.kick = rnd(2, 8)
          vn = -rnd(1.3, 2.9); vt += Math.sign(omega || 1) * rnd(0.2, 1.3)
          p.sx = rnd(-7, 7); p.sy = rnd(-4, 4); p.sz = rnd(-7, 7)
        }
        p.vx = vn * nx + vt * tx; p.vy = vn * ny + vt * ty
      }
      if (touching) {
        const k = Math.min(1, 5 * dt)
        p.sx *= 1 - k; p.sy *= 1 - k; p.sz *= 1 - k
        const target = Math.atan2(p.y, p.x) + Math.PI / 2 + p.off
        let d = (target - p.rz) % (Math.PI * 2); if (d > Math.PI) d -= Math.PI * 2; if (d < -Math.PI) d += Math.PI * 2
        p.rz += d * k; p.rx += (p.tilt - p.rx) * k
      }
      p.rx += p.sx * dt; p.ry += p.sy * dt; p.rz += p.sz * dt
      dummy.position.set(p.x, p.y, p.z); dummy.rotation.set(p.rx, p.ry, p.rz); dummy.updateMatrix()
      tickets.setMatrixAt(i, dummy.matrix)
    }
    tickets.instanceMatrix.needsUpdate = true
  }

  // ── Monedas PRIZE flotando ──
  const coinG = keep(new CylinderGeometry(0.5, 0.5, 0.085, 56).rotateX(Math.PI / 2))
  const faceTex = keep(new TextureLoader().load('/coin.jpg')); faceTex.colorSpace = SRGBColorSpace; faceTex.anisotropy = 4; faceTex.center.set(0.5, 0.5); faceTex.rotation = Math.PI / 2
  const face = keep(new MeshStandardMaterial({ map: faceTex, metalness: 0.4, roughness: 0.42, envMapIntensity: 0.7 }))
  const coinDefs = [
    { sx: -1, y: 1.05, z: 0.5, s: 0.95, sp: 0.9, ph: 0 },
    { sx: 1, y: -0.75, z: 0.9, s: 0.72, sp: -1.2, ph: 2 },
    { sx: 0.82, y: 1.72, z: -1.0, s: 0.52, sp: 1.5, ph: 4 },
  ]
  const coins = coinDefs.map(d => { const m = new Mesh(coinG, [gold, face, face]); m.scale.setScalar(d.s); scene.add(m); return m })

  // ── Tamaño y cámara ──
  let coinX = 2.6
  function resize() {
    const w = host.clientWidth || 300, h = host.clientHeight || 300
    renderer.setSize(w, h, false)
    const aspect = w / h, t = Math.tan((camera.fov / 2) * Math.PI / 180)
    const D = Math.max(2.36 / t, 2.45 / (t * aspect))
    camera.aspect = aspect; camera.position.set(0, 0.3, D); camera.lookAt(0, -0.46, 0); camera.updateProjectionMatrix()
    const halfW = t * D * aspect
    coinX = Math.max(1.95, Math.min(3.5, halfW * 0.76))
  }
  const ro = new ResizeObserver(resize); ro.observe(host); resize()

  // ── Interacción: arrastrar gira el tambor; el puntero inclina la escena ──
  let dragging = false, lastX = 0, moved = 0, px = 0, py = 0
  const down = e => { dragging = true; lastX = e.clientX; moved = 0; canvas.setPointerCapture?.(e.pointerId); canvas.style.cursor = 'grabbing' }
  const move = e => {
    if (!dragging) return
    const dx = e.clientX - lastX; lastX = e.clientX; moved += Math.abs(dx)
    omega = Math.max(-7, Math.min(7, omega - dx * 0.035))
  }
  const up = () => {
    if (!dragging) return
    dragging = false; canvas.style.cursor = 'grab'
    if (moved < 6) omega = Math.max(-7, Math.min(7, omega + 3.2))   // un toque también la empuja
  }
  const hover = e => { px = e.clientX / window.innerWidth - 0.5; py = e.clientY / window.innerHeight - 0.5 }
  canvas.addEventListener('pointerdown', down); canvas.addEventListener('pointermove', move)
  canvas.addEventListener('pointerup', up); canvas.addEventListener('pointercancel', up)
  window.addEventListener('pointermove', hover, { passive: true })
  const lost = e => { e.preventDefault(); onFail?.() }
  canvas.addEventListener('webglcontextlost', lost)

  // ── Bucle ──
  let raf = 0, last = 0, visible = true, alive = true, time = 0
  function frame(now) {
    if (!alive) return
    raf = requestAnimationFrame(frame)
    // el reloj del navegador puede ir un poco atrás en el primer cuadro: nunca dt negativo
    const dt = last ? Math.max(0, Math.min(0.034, (now - last) / 1000)) : 0; last = now
    if (!visible || document.hidden) return
    time += dt
    if (!dragging) omega += (base - omega) * (1 - Math.exp(-dt / 1.3))
    drumAngle += omega * dt; drum.rotation.z = drumAngle
    stepTickets(dt / 2); stepTickets(dt / 2)
    rig.rotation.y += (-0.42 + px * 0.22 - rig.rotation.y) * Math.min(1, dt * 3)
    rig.rotation.x += (0.06 + py * 0.1 - rig.rotation.x) * Math.min(1, dt * 3)
    coins.forEach((m, i) => {
      const d = coinDefs[i]
      m.position.set(d.sx * coinX + px * 0.25 * (i + 1), d.y + Math.sin(time * 0.9 + d.ph) * 0.14, d.z)
      m.rotation.y = time * d.sp + d.ph; m.rotation.x = Math.sin(time * 0.6 + d.ph) * 0.25
    })
    renderer.render(scene, camera)
  }
  raf = requestAnimationFrame(frame)
  const io = new IntersectionObserver(es => { visible = es[0].isIntersecting }, { rootMargin: '80px' })
  io.observe(host)

  return {
    setTickets,
    setSpin(on) { base = on ? BASE_FAST : (reduce ? 0.1 : BASE_SLOW) },
    dispose() {
      alive = false; cancelAnimationFrame(raf); ro.disconnect(); io.disconnect()
      canvas.removeEventListener('pointerdown', down); canvas.removeEventListener('pointermove', move)
      canvas.removeEventListener('pointerup', up); canvas.removeEventListener('pointercancel', up)
      canvas.removeEventListener('webglcontextlost', lost)
      window.removeEventListener('pointermove', hover)
      scene.traverse(o => { if (o.isMesh && !disposables.includes(o.geometry)) o.geometry.dispose() })
      disposables.forEach(d => d.dispose?.())
      tickets.dispose(); envRT.dispose(); pmrem.dispose(); renderer.dispose()
    },
  }
}

export default function Tombola3D({ drawn = 0, mine = 0, spinning = false, label, onFail }) {
  const host = useRef(null), canvas = useRef(null), api = useRef(null)

  useEffect(() => {
    try { api.current = createTombola(canvas.current, host.current, onFail) }
    catch (e) { console.warn('Tómbola 3D no disponible:', e); onFail?.(); return }
    return () => { api.current?.dispose(); api.current = null }
  }, [])

  useEffect(() => { api.current?.setTickets(drawn, mine) }, [drawn, mine])
  useEffect(() => { api.current?.setSpin(spinning) }, [spinning])

  return (
    <div ref={host} className="stage__gl">
      <canvas ref={canvas} role="img" aria-label={label} />
    </div>
  )
}
