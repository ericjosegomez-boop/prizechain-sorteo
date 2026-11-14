// src/components/TicketCalculator.jsx
// Calculadora de la portada: "¿cuántos boletos me tocan con X PRIZE?"
// Usa el precio real del boleto y el pool actual leídos del contrato.

import { useState } from 'react'
import TicketStubs from './TicketStubs'
import { fmtInt, Reveal, Tilt } from './ui'

export default function TicketCalculator({ ticketSize = 0, pool = 0 }) {
  const size = ticketSize > 0 ? ticketSize : 760
  const maxPrize = Math.ceil(size * 50)
  const [picked, setPrize] = useState(null)        // null = el visitante aún no movió nada
  const prize = picked ?? Math.round(size * 12)
  const tickets = Math.min(50, Math.floor(prize / size))
  const chance = tickets > 0 ? (tickets / (pool + tickets)) * 100 : 0
  const pct = Math.min(100, (prize / maxPrize) * 100)

  return (
    <div className="calc">
      <div className="section__head" style={{ marginBottom: 0 }}>
        <h2 className="h2">¿Cuántos boletos te tocan?</h2>
        <p className="muted" style={{ maxWidth: '46ch' }}>Cada <strong style={{ color: 'var(--text)' }}>{fmtInt(size)} PRIZE</strong> en
          tu wallet es un boleto, hasta 50. Mueve la barra y mira.</p>
      </div>

      <Reveal className="panel stack" style={{ gap: 14 }}>
        <label htmlFor="calc-prize" className="small muted">Tus PRIZE</label>
        <input id="calc-prize" className="input-num" inputMode="numeric" value={fmtInt(prize)}
          onChange={e => {
            const v = Number(e.target.value.replace(/\D/g, '')) || 0
            setPrize(Math.min(v, 10_000_000))
          }} />
        <input type="range" className="range" min="0" max={maxPrize} step={Math.max(1, Math.round(size / 4))}
          value={Math.min(prize, maxPrize)} style={{ '--p': pct + '%' }}
          onChange={e => setPrize(Number(e.target.value))} aria-label="Tus PRIZE" />
      </Reveal>

      <Tilt>
        <div className="ticket ticket--split">
          <div className="ticket__main">
            <div className="row between" style={{ alignItems: 'flex-end' }}>
              <div>
                <span className="num boletera__n">{tickets}</span>
                <span className="boletera__l">{tickets === 1 ? 'boleto' : 'boletos'} en tu boletera</span>
              </div>
            </div>
            <TicketStubs count={tickets} label={`${tickets} boletos con ${fmtInt(prize)} PRIZE`} />
            {tickets === 0 && prize > 0 && (
              <p style={{ fontSize: 14 }}>Te faltan {fmtInt(size - prize)} PRIZE para el primer boleto.</p>
            )}
            {prize >= maxPrize && (
              <p style={{ fontSize: 14 }}>Llegaste al máximo: más PRIZE no suma boletos.</p>
            )}
          </div>
          <div className="ticket__stub">
            <span className="num">{tickets > 0 ? (chance >= 99.95 ? '100' : chance.toLocaleString('es-CL', { maximumFractionDigits: 1 })) + '%' : '—'}</span>
            <span>{pool > 0 ? `de ganar con los ${fmtInt(pool)} boletos que ya hay` : 'si nadie más se registra'}</span>
          </div>
        </div>
      </Tilt>
    </div>
  )
}
