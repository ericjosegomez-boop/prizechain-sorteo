// src/components/PoolLive.jsx
//
// Muestra en tiempo real:
//   - Premio USDT acumulado (currentAvailableReward)
//   - Barra de progreso hacia el objetivo configurable
//   - Total de boletos en el pool (totalTickets)
//   - Participantes únicos estimados
//   - Historial de depósitos via eventos RewardFunded
//   - Historial de rondas anteriores (winner o NoWinner)
//
// Se actualiza automáticamente cada 15 segundos y escucha
// el evento RewardFunded en tiempo real.

import { useReadContract, useWatchContractEvent, useBlockNumber } from 'wagmi'
import { formatUnits } from 'viem'
import { useState, useEffect, useRef } from 'react'
import { CONTRACTS, SORTEO_ABI } from '../config'

// ── Objetivo de acumulación configurable ─────────────────────
// Cambia este valor para mostrar la barra de progreso
const PRIZE_TARGET_USDT = 500

export default function PoolLive({ upcomingId }) {
  const [deposits, setDeposits]   = useState([])
  const [flashAmt, setFlashAmt]   = useState(false)
  const [lastUpdate, setLastUpdate] = useState(null)
  const prevAmt = useRef(0)

  // ── Leer premio disponible ────────────────────────────────
  const { data: availableReward, refetch: refetchReward } = useReadContract({
    address:      CONTRACTS.SORTEO,
    abi:          SORTEO_ABI,
    functionName: 'currentAvailableReward',
    query:        { refetchInterval: 15_000 },  // cada 15 segundos
  })

  // ── Leer boletos totales ──────────────────────────────────
  const { data: poolTotal, refetch: refetchPool } = useReadContract({
    address:      CONTRACTS.SORTEO,
    abi:          SORTEO_ABI,
    functionName: 'totalTickets',
    args:         [upcomingId],
    query:        { enabled: !!upcomingId, refetchInterval: 15_000 },
  })

  // ── Leer rondas anteriores ────────────────────────────────
  const prevId1 = upcomingId ? BigInt(Number(upcomingId) - 1) : null
  const prevId2 = upcomingId ? BigInt(Number(upcomingId) - 2) : null
  const prevId3 = upcomingId ? BigInt(Number(upcomingId) - 3) : null

  const { data: round1 } = useReadContract({
    address: CONTRACTS.SORTEO, abi: SORTEO_ABI, functionName: 'rounds',
    args: [prevId1], query: { enabled: !!prevId1 && Number(prevId1) > 0 },
  })
  const { data: round2 } = useReadContract({
    address: CONTRACTS.SORTEO, abi: SORTEO_ABI, functionName: 'rounds',
    args: [prevId2], query: { enabled: !!prevId2 && Number(prevId2) > 0 },
  })
  const { data: round3 } = useReadContract({
    address: CONTRACTS.SORTEO, abi: SORTEO_ABI, functionName: 'rounds',
    args: [prevId3], query: { enabled: !!prevId3 && Number(prevId3) > 0 },
  })

  // ── Escuchar depósitos en tiempo real ─────────────────────
  useWatchContractEvent({
    address:   CONTRACTS.SORTEO,
    abi:       SORTEO_ABI,
    eventName: 'RewardFunded',
    onLogs(logs) {
      logs.forEach(log => {
        const amt    = log.args.amount ? Number(formatUnits(log.args.amount, 18)).toFixed(2) : '?'
        const funder = log.args.funder ?? '0x???'
        setDeposits(prev => [{
          addr:   funder.slice(0,6) + '...' + funder.slice(-4),
          amount: amt,
          time:   'ahora',
          tx:     log.transactionHash,
        }, ...prev].slice(0, 5))
        setLastUpdate(new Date())
        setFlashAmt(true)
        setTimeout(() => setFlashAmt(false), 800)
        refetchReward()
      })
    },
  })

  // ── Detectar cambio en el monto para flash ────────────────
  const amountNum = availableReward ? Number(formatUnits(availableReward, 18)) : 0
  useEffect(() => {
    if (amountNum > prevAmt.current && prevAmt.current > 0) {
      setFlashAmt(true)
      setLastUpdate(new Date())
      setTimeout(() => setFlashAmt(false), 800)
    }
    prevAmt.current = amountNum
  }, [amountNum])

  // ── Derivar valores ───────────────────────────────────────
  const pool       = poolTotal ? Number(poolTotal) : 0
  const pct        = Math.min(Math.round((amountNum / PRIZE_TARGET_USDT) * 100), 100)
  const prevRounds = [
    { id: prevId1, data: round1 },
    { id: prevId2, data: round2 },
    { id: prevId3, data: round3 },
  ].filter(r => r.data && Number(r.data[0]) > 0)

  function fmtAddr(addr) {
    if (!addr) return '—'
    return addr.slice(0,6) + '...' + addr.slice(-4)
  }
  function fmtTime(d) {
    if (!d) return ''
    const diff = Math.floor((Date.now() - d.getTime()) / 1000)
    if (diff < 60)  return 'hace ' + diff + 's'
    if (diff < 3600) return 'hace ' + Math.floor(diff/60) + 'm'
    return 'hace ' + Math.floor(diff/3600) + 'h'
  }
  function roundStatus(data) {
    const s = Number(data[0])
    if (s === 3) return { label: fmtAddr(data[8]) + ' ganó', color: '#6BCB8B' }
    if (s === 4) return { label: 'Sin ganador', color: '#9CA3AF' }
    if (s === 5) return { label: 'Saltada (sin boletos)', color: '#6B7280' }
    return { label: '—', color: '#6B7280' }
  }

  return (
    <div>

      {/* ── Premio acumulado ── */}
      <div style={card}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <p style={cardLabel}>Premio acumulado</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#10B981', display: 'inline-block', animation: 'pulse 1.8s ease-in-out infinite' }} />
            <span style={{ fontSize: 11, color: '#6B7280' }}>En tiempo real</span>
            {lastUpdate && (
              <span style={{ fontSize: 10, color: '#A855F7', background: '#150830', border: '0.5px solid #2D1B4E', borderRadius: 4, padding: '1px 6px' }}>
                {fmtTime(lastUpdate)}
              </span>
            )}
          </div>
        </div>

        {/* Monto grande */}
        <div style={{
          fontSize: 36, fontWeight: 600, color: '#F59E0B',
          transition: 'opacity .3s',
          opacity: flashAmt ? 0.4 : 1,
        }}>
          {amountNum > 0 ? amountNum.toFixed(2) : '0.00'} USDT
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 5 }}>
          <img src="/logo.png" alt="PRIZE" style={{ width: 13, height: 13, borderRadius: '50%', objectFit: 'cover' }} />
          <span style={{ fontSize: 11, color: '#6B7280' }}>
            PRIZECHAIN · pago automático al ganador
          </span>
        </div>

        {/* Barra de progreso */}
        <div style={{ margin: '14px 0 8px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 5 }}>
            <span style={{ color: '#9CA3AF' }}>Progreso hacia objetivo</span>
            <span style={{ color: '#A855F7', fontWeight: 500 }}>{pct}%</span>
          </div>
          <div style={{ background: '#1A0A2E', borderRadius: 6, height: 12, overflow: 'hidden', border: '0.5px solid #2D1B4E' }}>
            <div style={{
              height: '100%', borderRadius: 6,
              width: pct + '%',
              background: pct >= 100 ? '#10B981' : '#A855F7',
              transition: 'width 1.2s ease',
            }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4, fontSize: 10, color: '#6B7280' }}>
            <span>0 USDT</span>
            <span>Objetivo: {PRIZE_TARGET_USDT} USDT</span>
          </div>
        </div>

        {/* Métricas */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8, marginTop: 4 }}>
          <Metric value={upcomingId ? String(Number(upcomingId) - 1) : '—'} label="Rondas acum." />
          <Metric value={pool.toLocaleString()} label="Boletos pool" accent />
          <Metric value={amountNum > 0 ? (amountNum / PRIZE_TARGET_USDT * 100).toFixed(0) + '%' : '—'} label="Del objetivo" />
        </div>
      </div>

      {/* ── Últimos depósitos ── */}
      <div style={card}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <p style={cardLabel}>Últimos depósitos al premio</p>
          <span style={{ fontSize: 11, color: '#6B7280' }}>USDT</span>
        </div>

        {deposits.length === 0 ? (
          <p style={{ fontSize: 12, color: '#6B7280', textAlign: 'center', padding: '12px 0' }}>
            Los depósitos aparecerán aquí en tiempo real
          </p>
        ) : (
          deposits.map((d, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '7px 0', borderBottom: i < deposits.length - 1 ? '0.5px solid #1A0A2E' : 'none',
              fontSize: 12,
            }}>
              <span style={{ fontFamily: 'monospace', color: '#9CA3AF', fontSize: 11, flex: 1 }}>{d.addr}</span>
              <span style={{ color: '#F59E0B', fontWeight: 500 }}>+{d.amount} USDT</span>
              <span style={{ fontSize: 10, color: '#4C1D95', background: '#150830', padding: '1px 6px', borderRadius: 4 }}>{d.time}</span>
            </div>
          ))
        )}

        {/* Botón contribuir */}
        <a
          href={`https://bscscan.com/address/${CONTRACTS.SORTEO}#writeContract`}
          target="_blank"
          rel="noreferrer"
          style={{
            display: 'block', width: '100%', marginTop: 10, padding: '10px',
            background: '#1e0f38', border: '0.5px solid #A855F7',
            borderRadius: 10, fontSize: 12, fontWeight: 500,
            color: '#A855F7', textAlign: 'center', textDecoration: 'none',
          }}
        >
          Contribuir al premio (fundReward) ↗
        </a>
      </div>

      {/* ── Historial de rondas ── */}
      {prevRounds.length > 0 && (
        <div style={card}>
          <p style={{ ...cardLabel, marginBottom: 10 }}>Historial de rondas</p>
          {prevRounds.map(({ id, data }, i) => {
            const st    = roundStatus(data)
            const prize = data[6] ? Number(formatUnits(data[6], 18)).toFixed(2) : '0'
            const accumulated = Number(data[0]) === 4
            return (
              <div key={i} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '8px 0', borderBottom: i < prevRounds.length - 1 ? '0.5px solid #1A0A2E' : 'none',
              }}>
                <div>
                  <div style={{ fontSize: 13, color: '#F3F0FF', fontWeight: 500, marginBottom: 2 }}>
                    Ronda #{id?.toString()}
                  </div>
                  <div style={{ fontSize: 11, color: st.color }}>{st.label}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 13, color: '#F59E0B', fontWeight: 500 }}>{prize} USDT</div>
                  <div style={{ fontSize: 10, color: accumulated ? '#A855F7' : '#6B7280' }}>
                    {accumulated ? '→ acumulado' : 'pagado'}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:.3}}`}</style>
    </div>
  )
}

function Metric({ value, label, accent }) {
  return (
    <div style={{ background: '#1A0A2E', borderRadius: 8, padding: 10, textAlign: 'center' }}>
      <div style={{ fontSize: 17, fontWeight: 500, color: accent ? '#A855F7' : '#F3F0FF' }}>{value}</div>
      <div style={{ fontSize: 10, color: '#6B7280', marginTop: 2 }}>{label}</div>
    </div>
  )
}

const card = {
  background: '#2D1B4E', border: '0.5px solid #4C1D95',
  borderRadius: 12, padding: 16, marginBottom: 12,
}
const cardLabel = {
  fontSize: 11, color: '#9CA3AF', fontWeight: 500,
  letterSpacing: .5, textTransform: 'uppercase', margin: 0,
}
