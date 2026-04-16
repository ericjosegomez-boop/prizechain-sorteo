// src/components/PrizeCard.jsx
export default function PrizeCard({ amount, pool }) {
  return (
    <div style={{
      background: '#2D1B4E',
      border: '0.5px solid #4C1D95',
      borderRadius: 12,
      padding: 18,
      marginBottom: 12,
    }}>
      <p style={{
        fontSize: 12, color: '#9CA3AF',
        fontWeight: 500, letterSpacing: .5,
        textTransform: 'uppercase', marginBottom: 10,
      }}>
        Premio acumulado
      </p>

      {/* Logo + monto */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
        <img
          src="/logo.png"
          alt="PRIZECHAIN"
          style={{
            width: 44, height: 44,
            borderRadius: '50%',
            objectFit: 'cover',
            border: '1.5px solid #3d2800',
            flexShrink: 0,
          }}
        />
        <div>
          <div style={{ fontSize: 34, fontWeight: 600, color: '#F59E0B', lineHeight: 1 }}>
            {amount} USDT
          </div>
          {/* Nombre del token con logo pequeño */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 5 }}>
            <img
              src="/logo.png"
              alt="PRIZE"
              style={{ width: 14, height: 14, borderRadius: '50%', objectFit: 'cover' }}
            />
            <span style={{ fontSize: 12, color: '#6B7280' }}>
              PRIZECHAIN · {pool} boleto{pool !== 1 ? 's' : ''} en el pool
            </span>
          </div>
        </div>
      </div>

      <div style={{ fontSize: 12, color: '#6B7280', marginTop: 4 }}>
        Pago automático al ganador · Sin paso de claim
      </div>
    </div>
  )
}
