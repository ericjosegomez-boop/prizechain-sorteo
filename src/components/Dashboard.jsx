// src/components/Dashboard.jsx
import { useAccount, useReadContract } from 'wagmi'
import { formatUnits } from 'viem'
import { useState } from 'react'
import { CONTRACTS, SORTEO_ABI } from '../config'
import TicketCard      from './TicketCard'
import PrizeCard       from './PrizeCard'
import RegisterButton  from './RegisterButton'
import Countdown       from './Countdown'
import RoundHistory    from './RoundHistory'
import DrawSection     from './DrawSection'
import PoolLive        from './PoolLive'

export default function Dashboard() {
  const { address } = useAccount()
  const [activeTab, setActiveTab] = useState('participar')

  const { data: upcomingId, isLoading: loadingId } = useReadContract({
    address: CONTRACTS.SORTEO, abi: SORTEO_ABI, functionName: 'upcomingRoundId',
  })
  const { data: preview, isLoading: loadingPreview, refetch: refetchPreview } = useReadContract({
    address: CONTRACTS.SORTEO, abi: SORTEO_ABI, functionName: 'previewTickets',
    args: [address], query: { enabled: !!address },
  })
  const { data: roundData, isLoading: loadingRound, refetch: refetchRound } = useReadContract({
    address: CONTRACTS.SORTEO, abi: SORTEO_ABI, functionName: 'rounds',
    args: [upcomingId], query: { enabled: !!upcomingId },
  })
  const { data: poolTotal, refetch: refetchPool } = useReadContract({
    address: CONTRACTS.SORTEO, abi: SORTEO_ABI, functionName: 'totalTickets',
    args: [upcomingId], query: { enabled: !!upcomingId },
  })
  const { data: myRegisteredTickets, refetch: refetchMyTickets } = useReadContract({
    address: CONTRACTS.SORTEO, abi: SORTEO_ABI, functionName: 'walletTickets',
    args: [upcomingId, address], query: { enabled: !!upcomingId && !!address },
  })
  const { data: availableReward } = useReadContract({
    address: CONTRACTS.SORTEO, abi: SORTEO_ABI, functionName: 'currentAvailableReward',
    query: { refetchInterval: 15_000 },
  })
  const { data: isPaused } = useReadContract({
    address: CONTRACTS.SORTEO, abi: SORTEO_ABI, functionName: 'isPrizePaused',
  })

  const tickets           = preview ? Number(preview[0]) : 0
  const ticketSize        = preview ? preview[1] : 0n
  const prizeBalance      = preview ? preview[2] : 0n
  const isRegistered      = myRegisteredTickets ? Number(myRegisteredTickets) > 0 : false
  const registeredTickets = myRegisteredTickets ? Number(myRegisteredTickets) : 0
  const pool              = poolTotal ? Number(poolTotal) : 0
  const roundStatus       = roundData ? Number(roundData[0]) : 0
  const regClosesAt       = roundData ? Number(roundData[2]) : 0
  const scheduledAt       = roundData ? Number(roundData[1]) : 0
  const prizeAmountRaw    = roundData ? roundData[6] : 0n
  const prizeUSDT         = availableReward ? Number(formatUnits(availableReward, 18)).toFixed(2) : '0.00'
  const canRegister       = tickets > 0 && !isRegistered && roundStatus === 1 && !isPaused
  const pct = pool > 0 && (isRegistered ? registeredTickets : tickets) > 0
    ? ((isRegistered ? registeredTickets : tickets) / (pool + (isRegistered ? 0 : tickets))) * 100 : 0

  const now = Math.floor(Date.now() / 1000)
  const drawActive = roundStatus === 2 || roundStatus === 3 || roundStatus === 4 ||
    (roundStatus === 1 && scheduledAt > 0 && now >= scheduledAt)

  function refetchAll() {
    refetchPreview(); refetchRound(); refetchPool(); refetchMyTickets()
  }

  if (loadingId || loadingPreview || loadingRound) {
    return (
      <div style={{ textAlign: 'center', padding: 48 }}>
        <div style={{ width: 32, height: 32, border: '3px solid #4C1D95', borderTopColor: '#A855F7', borderRadius: '50%', animation: 'spin .8s linear infinite', margin: '0 auto 12px' }} />
        <p style={{ fontSize: 13, color: '#6B7280' }}>Cargando datos del sorteo...</p>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    )
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
        <div>
          <p style={{ fontSize: 12, color: '#6B7280', marginBottom: 2 }}>Ronda #{upcomingId?.toString() ?? '—'}</p>
          <RoundStatusBadge status={roundStatus} />
        </div>
        {isPaused && (
          <div style={{ background: '#2A1800', border: '0.5px solid #854F0B', borderRadius: 6, padding: '4px 10px', fontSize: 12, color: '#FDE68A' }}>
            Token en pausa
          </div>
        )}
      </div>

      {/* Tabs — ahora 4 */}
      <div style={{ display: 'flex', gap: 0, marginBottom: 16, background: '#2D1B4E', borderRadius: 10, padding: 4 }}>
        <TabBtn label="Mi participación"  active={activeTab === 'participar'} onClick={() => setActiveTab('participar')} />
        <TabBtn label="Pool en vivo"      active={activeTab === 'pool'}       onClick={() => setActiveTab('pool')} />
        <TabBtn
          label={drawActive ? '🔴 Sorteo' : 'Sorteo'}
          active={activeTab === 'sorteo'}
          onClick={() => setActiveTab('sorteo')}
          highlight={drawActive}
        />
      </div>

      {/* ── Pestaña: Participar ── */}
      {activeTab === 'participar' && (
        <>
          <PrizeCard amount={prizeUSDT} pool={pool} />
          {regClosesAt > 0 && roundStatus === 1 && (
            <Countdown regClosesAt={regClosesAt} scheduledAt={scheduledAt} />
          )}
          <TicketCard
            balance={prizeBalance} ticketSize={ticketSize} tickets={tickets}
            registeredTickets={registeredTickets} isRegistered={isRegistered}
            pool={pool} pct={pct}
          />
          <RegisterButton
            canRegister={canRegister} isRegistered={isRegistered} tickets={tickets}
            registeredTickets={registeredTickets} roundStatus={roundStatus}
            isPaused={!!isPaused} prizeBalance={prizeBalance} ticketSize={ticketSize}
            onSuccess={refetchAll}
          />
          <RoundHistory address={address} upcomingId={upcomingId} />
        </>
      )}

      {/* ── Pestaña: Pool en vivo ── */}
      {activeTab === 'pool' && (
        <PoolLive upcomingId={upcomingId} />
      )}

      {/* ── Pestaña: Sorteo ── */}
      {activeTab === 'sorteo' && (
        <>
          <DrawSection
            roundId={upcomingId} scheduledAt={scheduledAt} roundStatus={roundStatus}
            prizeAmount={prizeAmountRaw || availableReward} onDrawComplete={refetchAll}
          />
          <div style={{ background: '#2D1B4E', border: '0.5px solid #4C1D95', borderRadius: 12, padding: 14, marginBottom: 12 }}>
            <p style={{ fontSize: 12, color: '#9CA3AF', fontWeight: 500, letterSpacing: .5, textTransform: 'uppercase', marginBottom: 10 }}>Estado del pool</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8 }}>
              {[
                { v: pool,    l: 'Boletos totales' },
                { v: registeredTickets > 0 ? registeredTickets : '—', l: 'Tus boletos', accent: true },
                { v: pct > 0 ? pct.toFixed(1)+'%' : '—', l: 'Tu probabilidad' },
              ].map((m,i) => (
                <div key={i} style={{ background: '#1A0A2E', borderRadius: 8, padding: 10, textAlign: 'center' }}>
                  <div style={{ fontSize: 18, fontWeight: 500, color: m.accent ? '#A855F7' : '#F3F0FF' }}>{m.v}</div>
                  <div style={{ fontSize: 11, color: '#6B7280', marginTop: 3 }}>{m.l}</div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

function TabBtn({ label, active, onClick, highlight }) {
  return (
    <button onClick={onClick} style={{
      flex: 1, padding: '8px 6px', borderRadius: 8, border: 'none',
      fontSize: 12, fontWeight: active ? 500 : 400, cursor: 'pointer',
      background: active ? '#1A0A2E' : 'transparent',
      color: active ? '#F3F0FF' : highlight ? '#F59E0B' : '#9CA3AF',
    }}>{label}</button>
  )
}

function RoundStatusBadge({ status }) {
  const C = {
    1: { bg:'#0A1F12', border:'#27500A', color:'#6BCB8B', dot:'#10B981', label:'Registro abierto' },
    2: { bg:'#2A1800', border:'#854F0B', color:'#FDE68A', dot:'#F59E0B', label:'Sorteo en curso'  },
    3: { bg:'#0A1F12', border:'#27500A', color:'#6BCB8B', dot:'#10B981', label:'Completada'       },
    4: { bg:'#1E0A3C', border:'#534AB7', color:'#C4BCFC', dot:'#A855F7', label:'Sin ganador'      },
  }
  const c = C[status] ?? { bg:'#1A0A2E', border:'#4C1D95', color:'#9CA3AF', dot:'#6B7280', label:'Sin iniciar' }
  return (
    <span style={{ display:'inline-flex', alignItems:'center', gap:6, background:c.bg, border:`0.5px solid ${c.border}`, borderRadius:20, padding:'4px 12px', fontSize:12, fontWeight:500, color:c.color }}>
      <span style={{ width:7, height:7, borderRadius:'50%', background:c.dot, display:'inline-block' }}/>
      {c.label}
    </span>
  )
}
