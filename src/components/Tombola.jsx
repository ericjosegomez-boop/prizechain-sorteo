// src/components/Tombola.jsx
//
// La tómbola: un tambor de alambre octogonal con los boletos del pool adentro.
// Cada papelito es un boleto registrado (se dibujan hasta 160; la cifra real va
// en el texto). Los boletos de la wallet conectada salen en dorado.
// En reposo el tambor gira lento y los boletos descansan abajo; mientras
// Chainlink sortea (spinning) el tambor gira rápido y los boletos dan vueltas.

import { useMemo } from 'react'

const CX = 200, CY = 190, R = 132, INNER = 112, MAX_DRAWN = 160

function rng(seed) {           // pseudoaleatorio determinista: el dibujo no salta entre renders
  let s = seed >>> 0 || 1
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296)
}

export default function Tombola({ pool = 0, mine = 0, spinning = false, caption = true }) {
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
      {caption && (
        <figcaption className="row" style={{ justifyContent: 'center', gap: 18, marginTop: 6 }}>
          <span><span className="num" style={{ fontSize: 34 }}>{pool.toLocaleString('es-CL')}</span> <span className="muted small">boletos adentro</span></span>
          {mine > 0 && <span><span className="num gold" style={{ fontSize: 34 }}>{mine}</span> <span className="muted small">son tuyos</span></span>}
        </figcaption>
      )}
    </figure>
  )
}
