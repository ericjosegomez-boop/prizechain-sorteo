// src/components/Tombola.jsx
//
// La tómbola. Si el equipo soporta 3D se muestra la versión three.js
// (Tombola3D, cargada aparte); si no, o mientras carga, la versión dibujada.
// Cada papelito es un boleto registrado (hasta 160; la cifra real va en el texto)
// y los boletos de la wallet conectada salen en dorado.

import { Component, Suspense, lazy, useMemo, useState } from 'react'

const Tombola3D = lazy(() => import('./Tombola3D'))

let webglOk
function canWebGL() {
  if (webglOk !== undefined) return webglOk
  try {
    const c = document.createElement('canvas')
    webglOk = !!(window.WebGLRenderingContext && (c.getContext('webgl2') || c.getContext('webgl')))
  } catch { webglOk = false }
  return webglOk
}

class Guard extends Component {
  state = { failed: false }
  static getDerivedStateFromError() { return { failed: true } }
  componentDidCatch() { this.props.onFail?.() }
  render() { return this.state.failed ? null : this.props.children }
}

export default function Tombola({ pool = 0, mine = 0, spinning = false, caption = true, hint = true }) {
  const [use3d, setUse3d] = useState(() => typeof window !== 'undefined' && canWebGL())
  const drawn = Math.min(pool, MAX_DRAWN)
  const mineDrawn = pool > 0 ? Math.min(drawn, Math.max(mine > 0 ? 1 : 0, Math.round(drawn * mine / pool))) : 0
  const label = pool > 0 ? `Tómbola con ${pool} boletos` : 'Tómbola vacía'
  const flat = <TombolaSvg pool={pool} mine={mine} spinning={spinning} />
  const fail = () => { webglOk = false; setUse3d(false) }

  return (
    <figure className="stage">
      <span className="rays" aria-hidden="true" />
      <Dial />
      {use3d ? (
        <Guard onFail={fail}>
          <Suspense fallback={<div className="stage__flat">{flat}</div>}>
            <Tombola3D drawn={drawn} mine={mineDrawn} spinning={spinning} label={label} onFail={fail} />
          </Suspense>
        </Guard>
      ) : <div className="stage__flat">{flat}</div>}
      {caption && (
        <figcaption className="stage__cap">
          <span><span className="num">{pool.toLocaleString('es-CL')}</span> {pool === 1 ? 'boleto adentro' : 'boletos adentro'}</span>
          {mine > 0 && <span><span className="num gold">{mine}</span> {mine === 1 ? 'es tuyo' : 'son tuyos'}</span>}
          {use3d && hint && <span className="stage__hint">Gírala con el dedo o el mouse</span>}
        </figcaption>
      )}
    </figure>
  )
}

/* ── Dial de ruleta (37 casillas) que gira lento detrás de la tómbola ── */
function Dial() {
  const N = 37, R1 = 248, R2 = 292, pockets = []
  const pt = (r, a) => `${(r * Math.cos(a)).toFixed(1)} ${(r * Math.sin(a)).toFixed(1)}`
  for (let k = 0; k < N; k++) {
    const a0 = (k / N) * Math.PI * 2, a1 = ((k + 1) / N) * Math.PI * 2
    pockets.push(
      <path key={k} d={`M${pt(R1, a0)} L${pt(R2, a0)} A${R2} ${R2} 0 0 1 ${pt(R2, a1)} L${pt(R1, a1)} A${R1} ${R1} 0 0 0 ${pt(R1, a0)}Z`}
        fill={k === 0 ? 'rgba(25,194,139,.34)' : k % 2 ? 'rgba(240,86,75,.17)' : 'rgba(255,255,255,.035)'}
        stroke="rgba(227,193,111,.34)" strokeWidth=".8" />,
    )
  }
  return (
    <div className="dial" aria-hidden="true">
      <svg viewBox="-300 -300 600 600">
        {pockets}
        <circle r="298" fill="none" stroke="rgba(227,193,111,.5)" strokeWidth="1.2" />
        <circle r="236" fill="none" stroke="rgba(227,193,111,.22)" strokeWidth="1" />
        <circle r="214" fill="none" stroke="rgba(227,193,111,.3)" strokeWidth="1.4" strokeDasharray="1.5 10" strokeLinecap="round" />
        {Array.from({ length: 8 }, (_, k) => (
          <rect key={k} x="-4" y="-4" width="8" height="8" fill="rgba(227,193,111,.5)"
            transform={`rotate(${k * 45}) translate(0 -190) rotate(45)`} />
        ))}
        <circle r="166" fill="none" stroke="rgba(227,193,111,.14)" strokeWidth="1" />
      </svg>
    </div>
  )
}

/* ── Versión dibujada (respaldo) ────────────────────────────── */


const CX = 200, CY = 190, R = 132, INNER = 112, MAX_DRAWN = 160

function rng(seed) {           // pseudoaleatorio determinista: el dibujo no salta entre renders
  let s = seed >>> 0 || 1
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296)
}

function TombolaSvg({ pool = 0, mine = 0, spinning = false }) {
  const drawn = Math.min(pool, MAX_DRAWN)
  const mineDrawn = pool > 0 ? Math.min(drawn, Math.max(mine > 0 ? 1 : 0, Math.round(drawn * mine / pool))) : 0

  const tickets = useMemo(() => {
    const r = rng(9173)
    const fill = Math.min(1, drawn / 120)
    const top = INNER * (0.55 - 1.25 * fill)      // nivel hasta donde llegan los boletos
    const out = []
    let guard = 0
    while (out.length < drawn && guard++ < 20000) {
      const x = (r() * 2 - 1) * INNER, y = (r() * 2 - 1) * INNER
      if (x * x + y * y > (INNER - 8) ** 2) continue
      if (y < top + r() * 18) continue
      out.push({ x: CX + x, y: CY + y, a: Math.round(r() * 180 - 90), d: (r() * 3).toFixed(2) })
    }
    out.sort((p, q) => q.y - p.y)                  // los de abajo primero
    return out
  }, [drawn])

  // tus boletos quedan repartidos entre los demás, no apilados en un rincón
  const isMine = i => mineDrawn > 0 && Math.floor((i + 1) * mineDrawn / drawn) !== Math.floor(i * mineDrawn / drawn)

  const octo = Array.from({ length: 8 }, (_, i) => {
    const t = (Math.PI / 8) + i * Math.PI / 4
    return [CX + R * Math.cos(t), CY + R * Math.sin(t)]
  })

  return (
    <figure className={'tombola' + (spinning ? ' spin' : '')}>
      <svg viewBox="0 0 400 400" role="img"
        aria-label={pool > 0 ? `Tómbola con ${pool} boletos` : 'Tómbola vacía'}>
        <defs>
          <clipPath id="tb-in"><circle cx={CX} cy={CY} r={INNER} /></clipPath>
          <radialGradient id="tb-glow" cx="50%" cy="45%" r="55%">
            <stop offset="0%" stopColor="#E8B341" stopOpacity=".16" />
            <stop offset="100%" stopColor="#E8B341" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* soporte */}
        <g stroke="#283B70" strokeWidth="9" strokeLinecap="round">
          <line x1={CX} y1={CY} x2="96" y2="372" />
          <line x1={CX} y1={CY} x2="304" y2="372" />
        </g>
        <line x1="70" y1="374" x2="330" y2="374" stroke="#283B70" strokeWidth="6" strokeLinecap="round" />

        <circle cx={CX} cy={CY} r={R + 26} fill="url(#tb-glow)" />

        {/* boletos */}
        <g clipPath="url(#tb-in)">
          <circle cx={CX} cy={CY} r={INNER} fill="#0E1A3D" />
          <g className="tombola__tickets">
            {tickets.map((t, i) => (
              <g key={i} transform={`translate(${t.x.toFixed(1)} ${t.y.toFixed(1)}) rotate(${t.a})`}>
                <rect className="tombola__t" x="-9" y="-5" width="18" height="10" rx="2"
                  fill={isMine(i) ? '#E8B341' : '#F2E6C8'}
                  stroke={isMine(i) ? '#B9821C' : '#CBB98C'} strokeWidth=".8" />
                <line x1="4" y1="-4" x2="4" y2="4" stroke={isMine(i) ? '#8A5E10' : '#B5A06C'} strokeWidth=".8" strokeDasharray="1.5 1.5" />
              </g>
            ))}
          </g>
        </g>

        {/* tambor de alambre */}
        <g className="tombola__drum">
          <polygon points={octo.map(p => p.map(n => n.toFixed(1)).join(',')).join(' ')}
            fill="none" stroke="#E8B341" strokeWidth="5" strokeLinejoin="round" />
          {octo.map(([x, y], i) => (
            <line key={i} x1={CX} y1={CY} x2={x} y2={y} stroke="#E8B341" strokeOpacity=".28" strokeWidth="2" />
          ))}
          <circle cx={CX} cy={CY} r={INNER} fill="none" stroke="#E8B341" strokeOpacity=".35" strokeWidth="1.5" strokeDasharray="3 7" />
          <circle cx={CX} cy={CY} r={R * .55} fill="none" stroke="#E8B341" strokeOpacity=".2" strokeWidth="1.5" />
          {octo.map(([x, y], i) => <circle key={'b' + i} cx={x} cy={y} r="5" fill="#E8B341" />)}
        </g>

        {/* eje y manivela */}
        <circle cx={CX} cy={CY} r="15" fill="#121F45" stroke="#E8B341" strokeWidth="4" />
        <line x1={CX} y1={CY} x2={CX + 44} y2={CY - 30} stroke="#F2E6C8" strokeWidth="6" strokeLinecap="round" />
        <circle cx={CX + 44} cy={CY - 30} r="9" fill="#C8372D" stroke="#F2E6C8" strokeWidth="3" />

        {pool === 0 && (
          <text x={CX} y={CY + 64} textAnchor="middle" fill="#6C7AA6"
            style={{ font: '800 26px var(--f-display)', letterSpacing: '.04em' }}>vacía</text>
        )}
      </svg>
    </figure>
  )
}
