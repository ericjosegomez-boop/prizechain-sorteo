// src/components/Backdrop.jsx
// El fondo de la feria: dos focos que barren el cielo, luces desenfocadas y
// boletos y monedas que flotan hacia arriba. Todo es CSS (sin 3D pesado), va
// detrás del contenido y no recibe toques. La guirnalda de ampolletas va
// aparte porque se queda arriba de la página.

function rng(seed) {
  let s = seed >>> 0
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296)
}
const r = rng(4711)
const pick = arr => arr[Math.floor(r() * arr.length)]

const GLOWS = Array.from({ length: 16 }, (_, i) => ({
  left: r() * 100, top: r() * 100, size: 60 + r() * 190,
  color: pick(['232,179,65', '232,179,65', '61,214,245', '242,230,200']),
  alpha: 0.07 + r() * 0.13, dur: 18 + r() * 22, delay: -r() * 30,
  dx: (r() - 0.5) * 120, dy: (r() - 0.5) * 160, key: i,
}))

const SIDES = [4, 10, 17, 24, 76, 83, 90, 96, 50, 33, 67]
const FLOATERS = SIDES.map((left, i) => ({
  left, kind: i % 3 === 1 ? 'coin' : 'ticket', gold: i % 4 === 0,
  scale: 0.55 + r() * 0.65, alpha: 0.32 + r() * 0.3, blur: r() > 0.6 ? 2.5 : 0,
  rise: 30 + r() * 26, spin: 8 + r() * 9, delay: -r() * 50, key: i,
}))

export default function Backdrop() {
  return (
    <div className="backdrop" aria-hidden="true">
      <span className="backdrop__beam backdrop__beam--l" />
      <span className="backdrop__beam backdrop__beam--r" />
      {GLOWS.map(g => (
        <span key={g.key} className="backdrop__glow" style={{
          left: g.left + '%', top: g.top + '%', width: g.size, height: g.size,
          background: `radial-gradient(circle, rgba(${g.color},${g.alpha.toFixed(2)}) 0%, rgba(${g.color},0) 68%)`,
          animationDuration: g.dur + 's', animationDelay: g.delay + 's', '--dx': g.dx + 'px', '--dy': g.dy + 'px',
        }} />
      ))}
      {FLOATERS.map(f => (
        <span key={f.key} className="floater" style={{
          left: f.left + '%', opacity: f.alpha, filter: f.blur ? `blur(${f.blur}px)` : undefined,
          animationDuration: f.rise + 's', animationDelay: f.delay + 's', '--s': f.scale,
        }}>
          <span className={'floater__in floater__in--' + f.kind + (f.gold ? ' is-gold' : '')}
            style={{ animationDuration: f.spin + 's', animationDelay: f.delay + 's' }} />
        </span>
      ))}
    </div>
  )
}

/** Guirnalda de ampolletas bajo la barra superior. */
export function Garland() {
  const SW = 200, N = 12, colors = ['#E8B341', '#F2E6C8', '#3DD6F5', '#C8372D']
  const bulbs = []
  let path = ''
  for (let k = 0; k < N; k++) {
    const x0 = k * SW, x1 = x0 + SW, cx = x0 + SW / 2, y0 = 6, cy = 82
    path += `M${x0} ${y0} Q${cx} ${cy} ${x1} ${y0} `
    for (const t of [0.14, 0.38, 0.62, 0.86]) {
      const x = (1 - t) ** 2 * x0 + 2 * (1 - t) * t * cx + t * t * x1
      const y = (1 - t) ** 2 * y0 + 2 * (1 - t) * t * cy + t * t * y0
      bulbs.push({ x, y, c: colors[bulbs.length % colors.length], d: (bulbs.length * 0.37) % 2.8 })
    }
  }
  return (
    <div className="garland" aria-hidden="true">
      <svg width={SW * N} height="70" viewBox={`0 0 ${SW * N} 70`}>
        <path d={path} fill="none" stroke="#3A4F8F" strokeWidth="2" />
        {bulbs.map((b, i) => (
          <g key={i} className="garland__bulb" style={{ animationDelay: b.d + 's', color: b.c }}>
            <circle cx={b.x} cy={b.y + 9} r="15" fill="currentColor" opacity=".16" />
            <rect x={b.x - 3} y={b.y - 1} width="6" height="6" rx="1.5" fill="#3A4F8F" />
            <circle cx={b.x} cy={b.y + 10} r="6.5" fill="currentColor" />
            <circle cx={b.x - 2} cy={b.y + 8} r="2" fill="#fff" opacity=".7" />
          </g>
        ))}
      </svg>
    </div>
  )
}
