// src/components/TicketStubs.jsx
// La boletera: 50 casillas (el máximo por wallet). Cada boleto que te toca es
// un talón de papel con su número; los vacíos quedan punteados.

export default function TicketStubs({ count = 0, max = 50, gold = false, stamped = false, fly = false, label }) {
  const n = Math.max(0, Math.min(count, max))
  return (
    <div style={{ position: 'relative' }}>
      <div className={'stubs' + (fly ? ' fly' : '')} role="img"
        aria-label={label ?? `${n} de ${max} boletos posibles`}>
        {Array.from({ length: max }, (_, i) => (
          <span key={i} className={'stub' + (i < n ? ' on' : '') + (i < n && gold ? ' mine' : '')}
            style={{ '--i': i }} aria-hidden="true">
            {i < n ? String(i + 1).padStart(2, '0') : ''}
          </span>
        ))}
      </div>
      {stamped && <span className="stamp" aria-hidden="true">En la tómbola</span>}
    </div>
  )
}
