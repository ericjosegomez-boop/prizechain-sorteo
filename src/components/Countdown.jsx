// src/components/Countdown.jsx
import { useState, useEffect } from 'react'

export default function Countdown({ regClosesAt, scheduledAt }) {
  const [now, setNow] = useState(Math.floor(Date.now() / 1000))

  useEffect(() => {
    const t = setInterval(() => setNow(Math.floor(Date.now() / 1000)), 1000)
    return () => clearInterval(t)
  }, [])

  function fmt(secs) {
    if (secs <= 0) return 'Cerrado'
    const d = Math.floor(secs / 86400)
    const h = Math.floor((secs % 86400) / 3600)
    const m = Math.floor((secs % 3600) / 60)
    const s = secs % 60
    if (d > 0) return `${d}d ${h}h ${m}m`
    if (h > 0) return `${h}h ${m}m ${s}s`
    return `${m}m ${s}s`
  }

  const regRemaining  = regClosesAt - now
  const drawRemaining = scheduledAt - now
  const regOpen = regRemaining > 0

  return (
    <div style={{ background: '#2D1B4E', border: '0.5px solid #4C1D95', borderRadius: 12, padding: '14px 18px', marginBottom: 12 }}>
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, textAlign: 'center' }}>
          <p style={{ fontSize: 11, color: '#9CA3AF', marginBottom: 4, textTransform: 'uppercase', letterSpacing: .5 }}>
            Cierra registro
          </p>
          <p style={{ fontSize: 22, fontWeight: 500, color: regOpen ? '#F59E0B' : '#EF4444' }}>
            {fmt(regRemaining)}
          </p>
        </div>
        <div style={{ width: '0.5px', background: '#4C1D95', alignSelf: 'stretch' }} />
        <div style={{ flex: 1, textAlign: 'center' }}>
          <p style={{ fontSize: 11, color: '#9CA3AF', marginBottom: 4, textTransform: 'uppercase', letterSpacing: .5 }}>
            Fecha del sorteo
          </p>
          <p style={{ fontSize: 22, fontWeight: 500, color: '#F3F0FF' }}>
            {fmt(drawRemaining)}
          </p>
        </div>
      </div>
    </div>
  )
}
