// src/components/TicketCard.jsx
import { formatUnits } from 'viem'

export default function TicketCard({ balance, ticketSize, tickets, registeredTickets, isRegistered, pool, pct }) {
  const balNum  = balance    ? Number(formatUnits(balance,    18)) : 0
  const sizeNum = ticketSize ? Number(formatUnits(ticketSize, 18)) : 800
  const leftover = balNum > 0 && sizeNum > 0 ? balNum % sizeNum : 0
  const activeTickets = isRegistered ? registeredTickets : tickets
  const barPct = Math.min(pct * 4, 100)

  return (
    <div style={{ background: '#2D1B4E', border: '0.5px solid #4C1D95', borderRadius: 12, padding: 18, marginBottom: 12 }}>
      <p style={{ fontSize: 12, color: '#9CA3AF', fontWeight: 500, letterSpacing: .5, textTransform: 'uppercase', marginBottom: 12 }}>
        Tus boletos
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginBottom: 14 }}>
        {/* Saldo PRIZE con logo */}
        <Metric
          value={balNum > 0 ? balNum.toLocaleString('es', { maximumFractionDigits: 0 }) : '—'}
          label={<LogoLabel text="PRIZE" />}
        />
        {/* Boletos */}
        <Metric
          value={activeTickets > 0 ? activeTickets : (tickets === 0 && balNum > 0 ? '0' : '—')}
          label="Tus boletos"
          accent
        />
        {/* PRIZE por boleto */}
        <Metric
          value={sizeNum > 0 ? sizeNum.toLocaleString('es', { maximumFractionDigits: 0 }) : '—'}
          label={<LogoLabel text="por boleto" />}
        />
      </div>

      {/* Barra de probabilidad */}
      {activeTickets > 0 && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
            <span style={{ fontSize: 12, color: '#9CA3AF' }}>Tu participación en el pool</span>
            <span style={{ fontSize: 12, fontWeight: 500, color: isRegistered ? '#10B981' : '#A855F7' }}>
              {pct.toFixed(1)}%
            </span>
          </div>
          <div style={{ background: '#1A0A2E', borderRadius: 5, height: 10, overflow: 'hidden' }}>
            <div style={{
              height: '100%', borderRadius: 5,
              width: barPct + '%',
              background: isRegistered ? '#10B981' : '#A855F7',
              transition: 'width .6s',
            }} />
          </div>
          {leftover > 0 && (
            <p style={{ fontSize: 11, color: '#6B7280', marginTop: 6 }}>
              {leftover.toLocaleString('es', { maximumFractionDigits: 0 })} PRIZE sobrantes no suman boleto extra
            </p>
          )}
        </div>
      )}

      {tickets === 0 && balNum > 0 && (
        <div style={{ background: '#2A1800', border: '0.5px solid #854F0B', borderRadius: 8, padding: '10px 14px', fontSize: 12, color: '#FDE68A', marginTop: 10 }}>
          Necesitas al menos {sizeNum.toLocaleString('es', { maximumFractionDigits: 0 })} PRIZE para 1 boleto.
          Te faltan {Math.ceil(sizeNum - balNum).toLocaleString('es', { maximumFractionDigits: 0 })} PRIZE.
        </div>
      )}

      {balNum === 0 && (
        <div style={{ background: '#2A1800', border: '0.5px solid #854F0B', borderRadius: 8, padding: '10px 14px', fontSize: 12, color: '#FDE68A', marginTop: 10 }}>
          No tienes PRIZE en esta wallet. Compra en PancakeSwap con slippage 10–12%.
        </div>
      )}
    </div>
  )
}

function Metric({ value, label, accent }) {
  return (
    <div style={{ background: '#1A0A2E', borderRadius: 8, padding: 12, textAlign: 'center' }}>
      <div style={{ fontSize: 20, fontWeight: 500, color: accent ? '#A855F7' : '#F3F0FF' }}>{value}</div>
      <div style={{ fontSize: 11, color: '#6B7280', marginTop: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 3 }}>
        {label}
      </div>
    </div>
  )
}

// Logo pequeño + texto para métricas
function LogoLabel({ text }) {
  return (
    <>
      <img
        src="/logo.png"
        alt="PRIZE"
        style={{ width: 12, height: 12, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
      />
      <span>{text}</span>
    </>
  )
}
