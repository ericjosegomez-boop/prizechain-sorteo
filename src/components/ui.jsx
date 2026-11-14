// src/components/ui.jsx — piezas pequeñas compartidas
import { useEffect, useRef, useState } from 'react'

/** Segundos Unix actuales, actualizados cada `ms`. */
export function useNow(ms = 1000) {
  const [now, setNow] = useState(() => Math.floor(Date.now() / 1000))
  useEffect(() => {
    const t = setInterval(() => setNow(Math.floor(Date.now() / 1000)), ms)
    return () => clearInterval(t)
  }, [ms])
  return now
}

/** Anima un número desde su valor anterior hasta `value` (respeta reduced-motion). */
export function useCountUp(value, ms = 900) {
  const [shown, setShown] = useState(value)
  const from = useRef(value)
  useEffect(() => {
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    if (reduce || !isFinite(value)) { setShown(value); from.current = value; return }
    const start = performance.now(), a = from.current, b = value
    let raf
    const step = t => {
      const k = Math.max(0, Math.min(1, (t - start) / ms))
      const e = 1 - Math.pow(1 - k, 3)
      setShown(a + (b - a) * e)
      if (k < 1) raf = requestAnimationFrame(step); else from.current = b
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [value, ms])
  return shown
}

export const fmtInt = n => Math.floor(n).toLocaleString('es-CL')
export const fmtUsd = n => Number(n).toLocaleString('es-CL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
export const shortAddr = a => (a ? a.slice(0, 6) + '…' + a.slice(-4) : '')

const DAYS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado']
const MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']
/** "domingo 29 nov, 20:00" en la hora local del visitante. */
export function fmtWhen(ts) {
  if (!ts) return '—'
  const d = new Date(ts * 1000)
  return `${DAYS[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]}, ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

/** Una tarjeta del contador: al cambiar el número, la mitad de arriba cae como en un reloj de aeropuerto. */
function Flip({ value }) {
  const [prev, setPrev] = useState(value)
  const [flipping, setFlipping] = useState(false)
  useEffect(() => {
    if (value === prev) return
    setFlipping(true)
    const t = setTimeout(() => { setPrev(value); setFlipping(false) }, 560)
    return () => clearTimeout(t)
  }, [value])
  return (
    <span className={'flip' + (flipping ? ' is-flipping' : '')} aria-hidden="true">
      <span className="flip__half flip__top">{value}</span>
      <span className="flip__half flip__bottom">{prev}</span>
      <span className="flip__half flip__top flip__top--move">{prev}</span>
      <span className="flip__half flip__bottom flip__bottom--move">{value}</span>
    </span>
  )
}

/** Cuenta regresiva con tarjetas que se voltean: días, horas, min, seg. */
export function Countdown({ to, small = false, label }) {
  const now = useNow(1000)
  const left = Math.max(0, (to || 0) - now)
  const d = Math.floor(left / 86400), h = Math.floor((left % 86400) / 3600)
  const m = Math.floor((left % 3600) / 60), s = left % 60
  const parts = [[d, 'días'], [h, 'horas'], [m, 'min'], [s, 'seg']]
  return (
    <div role="timer" aria-label={`${label ?? 'Faltan'}: ${d} días, ${h} horas y ${m} minutos`}
      className={'count' + (small ? ' count--sm' : '')}>
      {parts.map(([n, l]) => (
        <span className="count__u" key={l}>
          <Flip value={String(n).padStart(2, '0')} />
          <span className="count__l" aria-hidden="true">{l}</span>
        </span>
      ))}
    </div>
  )
}

/** Inclina su contenido en 3D siguiendo el dedo o el mouse; en reposo se mece solo. */
export function Tilt({ children, max = 7 }) {
  const ref = useRef(null)
  const move = e => {
    const el = ref.current; if (!el) return
    const r = el.getBoundingClientRect()
    const px = (e.clientX - r.left) / r.width - 0.5, py = (e.clientY - r.top) / r.height - 0.5
    el.style.setProperty('--ry', (px * max * 2).toFixed(2) + 'deg')
    el.style.setProperty('--rx', (-py * max * 2).toFixed(2) + 'deg')
    el.style.setProperty('--gx', (px * 120 + 50).toFixed(1) + '%')
    el.classList.add('is-live')
  }
  const leave = () => { ref.current?.classList.remove('is-live') }
  return (
    <div ref={ref} className="tilt" onPointerMove={move} onPointerLeave={leave} onPointerCancel={leave}
      onPointerUp={e => { if (e.pointerType !== 'mouse') leave() }}>
      {children}
    </div>
  )
}

/** Hace entrar su contenido la primera vez que aparece en pantalla. */
export function Reveal({ children, as: Tag = 'div', className = '', ...rest }) {
  const ref = useRef(null)
  const [seen, setSeen] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el || !('IntersectionObserver' in window)) { setSeen(true); return }
    const io = new IntersectionObserver(es => { if (es[0].isIntersecting) { setSeen(true); io.disconnect() } }, { threshold: 0.15 })
    io.observe(el)
    return () => io.disconnect()
  }, [])
  return <Tag ref={ref} className={`reveal ${seen ? 'is-in' : ''} ${className}`} {...rest}>{children}</Tag>
}

/** Estado de la ronda como chip. */
export function StatusChip({ status, regOpen, drawReady }) {
  if (drawReady)  return <span className="chip chip--hot"><span className="dot" style={{ background: 'var(--gold)' }} />Hora del sorteo</span>
  if (regOpen)    return <span className="chip chip--open"><span className="dot" />Registro abierto</span>
  const map = { 2: ['chip--hot', 'Sorteando con Chainlink'], 3: ['chip--done', 'Ronda completada'], 4: ['chip--done', 'Sin ganador'], 5: ['chip--done', 'Ronda saltada'] }
  const [cls, txt] = map[status] ?? ['chip--done', 'Registro cerrado']
  return <span className={'chip ' + cls}>{txt}</span>
}

/** Lanza confeti dorado y crema (carga la librería solo cuando hace falta). */
export async function celebrate() {
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return
  const { default: confetti } = await import('canvas-confetti')
  const colors = ['#E8B341', '#F2E6C8', '#3DD6F5', '#C8372D']
  confetti({ particleCount: 90, spread: 70, origin: { y: .7 }, colors, scalar: 1.1 })
  setTimeout(() => confetti({ particleCount: 60, angle: 60, spread: 60, origin: { x: 0, y: .75 }, colors }), 180)
  setTimeout(() => confetti({ particleCount: 60, angle: 120, spread: 60, origin: { x: 1, y: .75 }, colors }), 300)
}
