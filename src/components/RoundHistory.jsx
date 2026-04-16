// src/components/RoundHistory.jsx
import { useReadContract } from 'wagmi'
import { formatUnits } from 'viem'
import { CONTRACTS, SORTEO_ABI, ROUND_STATUS } from '../config'

export default function RoundHistory({ address, upcomingId }) {
  const prevId = upcomingId ? (Number(upcomingId) - 1) : null

  const { data: prevRound } = useReadContract({
    address:      CONTRACTS.SORTEO,
    abi:          SORTEO_ABI,
    functionName: 'rounds',
    args:         [BigInt(prevId ?? 0)],
    query:        { enabled: prevId !== null && prevId > 0 },
  })

  const { data: prevTickets } = useReadContract({
    address:      CONTRACTS.SORTEO,
    abi:          SORTEO_ABI,
    functionName: 'walletTickets',
    args:         [BigInt(prevId ?? 0), address],
    query:        { enabled: prevId !== null && prevId > 0 && !!address },
  })

  if (!prevRound || !prevId || prevId < 1) return null

  const status    = Number(prevRound[0])
  const winner    = prevRound[8]
  const prize     = prevRound[6] ? Number(formatUnits(prevRound[6], 18)).toFixed(2) : '0'
  const myTickets = prevTickets ? Number(prevTickets) : 0
  const iWon      = winner?.toLowerCase() === address?.toLowerCase()
  const iPlayed   = myTickets > 0

  return (
    <div style={{ marginTop: 20 }}>
      <p style={{ fontSize: 12, color: '#6B7280', fontWeight: 500, marginBottom: 10, letterSpacing: .5, textTransform: 'uppercase' }}>
        Ronda anterior
      </p>
      <div style={{ background: '#2D1B4E', border: `0.5px solid ${iWon ? '#27500A' : '#4C1D95'}`, borderRadius: 12, padding: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8 }}>
          <div>
            <p style={{ fontSize: 13, color: '#9CA3AF', marginBottom: 4 }}>Ronda #{prevId}</p>
            <p style={{ fontSize: 15, fontWeight: 500, color: iWon ? '#6BCB8B' : '#F3F0FF' }}>
              {iWon ? '🏆 Ganaste ' + prize + ' USDT' : status === 3 ? 'Completada — no ganaste' : status === 4 ? 'Sin ganador' : ROUND_STATUS[status]}
            </p>
            {iPlayed && !iWon && (
              <p style={{ fontSize: 12, color: '#6B7280', marginTop: 2 }}>
                Participaste con {myTickets} boleto{myTickets !== 1 ? 's' : ''}
              </p>
            )}
            {!iPlayed && (
              <p style={{ fontSize: 12, color: '#6B7280', marginTop: 2 }}>No participaste</p>
            )}
          </div>
          <div style={{ textAlign: 'right' }}>
            <p style={{ fontSize: 12, color: '#6B7280', marginBottom: 2 }}>Premio</p>
            <p style={{ fontSize: 16, fontWeight: 500, color: '#F59E0B' }}>{prize} USDT</p>
          </div>
        </div>

        {winner && winner !== '0x0000000000000000000000000000000000000000' && (
          <div style={{ marginTop: 10, padding: '8px 12px', background: '#1A0A2E', borderRadius: 8 }}>
            <p style={{ fontSize: 11, color: '#6B7280', marginBottom: 2 }}>Ganador</p>
            <a
              href={`https://bscscan.com/address/${winner}`}
              target="_blank"
              rel="noreferrer"
              style={{ fontFamily: 'monospace', fontSize: 12, color: '#A855F7' }}
            >
              {winner.slice(0, 6)}...{winner.slice(-4)}
            </a>
          </div>
        )}
      </div>
    </div>
  )
}
