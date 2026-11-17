// src/components/Dashboard.jsx
// Panel con la wallet conectada: tu boletera (izquierda) y la tómbola (derecha).
// Las lecturas del contrato vienen de useSorteo (App las pasa como `s`).

import { useRef, useState } from 'react'
import Tombola        from './Tombola'
import TicketStubs    from './TicketStubs'
import RegisterButton from './RegisterButton'
import DrawSection    from './DrawSection'
import PoolLive       from './PoolLive'
import RoundHistory   from './RoundHistory'
import { NextMoment } from './Bits'
import { StatusChip, Tilt, useCountUp, fmtInt, fmtUsd, fmtWhen, shortAddr, celebrate } from './ui'
import { formatUnits } from 'viem'

const fmtPct = p => (p >= 99.95 ? '100' : p.toLocaleString('es-CL', { maximumFractionDigits: 1 })) + '%'

export default function Dashboard({ s, address }) {
  const [phase, setPhase]         = useState('idle')   // idle → fly → done (animación al registrarse)
  const [burst, setBurst]         = useState(false)    // la tómbola gira un momento al recibir tus boletos
  const [drawPhase, setDrawPhase] = useState(null)

  const prize = useCountUp(s.drawPrize, 1200)

  const isRegistered   = s.myTickets > 0
  const showRegistered = isRegistered || phase === 'done'
  const shown          = isRegistered ? s.myTickets : s.tickets
  const count          = useCountUp(shown, 700)
  const canRegister    = s.tickets > 0 && !isRegistered && s.regOpen && !s.isPaused
  const chancePool     = isRegistered ? s.pool : s.pool + s.tickets
  const inPlay         = isRegistered || (s.regOpen && !s.isPaused)
  const chance         = inPlay && shown > 0 && chancePool > 0 ? (shown / chancePool) * 100 : 0
  const roundSize      = s.roundTicketSizeRaw ? Number(formatUnits(s.roundTicketSizeRaw, 18)) : s.ticketSize
  const lowBalance     = isRegistered && s.roundTicketSizeRaw > 0n && s.balanceRaw < s.roundTicketSizeRaw
  const spinning       = s.awaiting || drawPhase === 'sending' || drawPhase === 'awaiting' || burst
  const id             = s.upcomingId ? s.upcomingId.toString() : '—'

  const tombolaRef = useRef(null)
  // A la hora del sorteo la tómbola pasa arriba; antes, primero va tu boletera.
  const drawFirst = s.drawReady || s.awaiting || ['sending', 'awaiting', 'winner', 'no_winner'].includes(drawPhase)

  function onRegistered() {
    setPhase('fly'); setBurst(true); celebrate()
    setTimeout(() => { setPhase('done'); s.refetchAll() }, 750)
    // baja hasta la tómbola para ver caer tus boletos dorados
    setTimeout(() => tombolaRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 1100)
    setTimeout(() => setBurst(false), 4200)
  }

  if (s.loading) {
    return (
      <main className="wrap dash" aria-busy="true">
        <div className="panel stack" style={{ alignItems: 'center', padding: 48 }}>
          <div className="spinner" />
          <p className="muted">Leyendo tus boletos en el contrato…</p>
        </div>
      </main>
    )
  }

  return (
    <main className="wrap dash">
      <header className="dash-head">
        <div className="row" style={{ gap: 8, justifyContent: 'center' }}>
          <StatusChip status={s.awaiting ? 2 : s.roundStatus} regOpen={s.regOpen} drawReady={s.drawReady && !s.awaiting} />
          {s.isPaused && <span className="chip chip--hot">Token PRIZE en pausa</span>}
        </div>
        <h1 className="display dash-title">Ronda Nº {id}</h1>
        {s.scheduledAt > 0 && (
          <p className="muted">{id === '1' ? 'Primer sorteo' : 'Sorteo'} el {fmtWhen(s.scheduledAt)}</p>
        )}
        <NextMoment s={s} small />
      </header>

      <div className={'dash__body' + (drawFirst ? ' draw-first' : '')}>
        {/* ── Tu boletera ── */}
        <div className="stack mine">
          <Tilt>
            <article className="ticket boletera" aria-label="Tus boletos">
              <div className="boletera__stub" aria-hidden="true">
                <span>Tu boletera</span>
                <span className="ticket__serial">Ronda Nº {id}</span>
              </div>
              <div className="boletera__main">
                <div className="row between" style={{ alignItems: 'flex-end', gap: 16 }}>
                  <div>
                    <span className="num boletera__n">{Math.round(count)}</span>
                    <span className="boletera__l">
                      {shown === 1 ? 'boleto' : 'boletos'} {showRegistered ? 'en la tómbola' : inPlay ? 'para esta ronda' : 'sin registrar en esta ronda'}
                    </span>
                  </div>
                  {chance > 0 && (
                    <div className="boletera__chance">
                      <span className="num">{fmtPct(chance)}</span>
                      <span>probabilidad actual</span>
                    </div>
                  )}
                </div>
                <TicketStubs count={shown} gold={showRegistered} stamped={showRegistered} fly={phase === 'fly'}
                  label={`${shown} de 50 boletos posibles`} />
                <p className="boletera__foot">
                  Tienes {fmtInt(s.balance)} PRIZE en {shortAddr(address)}. Cada boleto vale {fmtInt(roundSize)} PRIZE
                  {shown >= 50 ? ' y ya tienes el máximo.' : '.'}
                </p>
              </div>
            </article>
          </Tilt>

          {lowBalance && (
            <p className="note note--bad">
              Tu saldo bajó de {fmtInt(roundSize)} PRIZE. Si sigue así al momento del sorteo, tus boletos no cuentan.
            </p>
          )}

          <RegisterButton
            canRegister={canRegister} isRegistered={isRegistered} tickets={s.tickets}
            registeredTickets={s.myTickets} regOpen={s.regOpen} isPaused={s.isPaused}
            balance={s.balance} ticketSize={s.ticketSize} roundSize={roundSize} pool={s.pool}
            onSuccess={onRegistered}
          />

          <RoundHistory address={address} upcomingId={s.upcomingId} />
        </div>

        {/* ── La tómbola ── */}
        <section className="panel tombola-panel" aria-label="La tómbola de esta ronda" ref={tombolaRef}>
          <Tombola
            pool={s.awaiting ? s.lastPool : s.pool}
            mine={s.awaiting ? s.lastMine : showRegistered ? shown : 0}
            spinning={spinning} />
          <div className="prize prize--sm">
            <span className="num prize__amt">${fmtUsd(prize)}</span>
            <span className="prize__unit">USDT en juego</span>
          </div>
          <DrawSection
            roundId={s.upcomingId} scheduledAt={s.scheduledAt} roundStatus={s.roundStatus}
            prizeAmount={(s.roundData && s.roundData[6]) || s.rewardRaw}
            onDrawComplete={s.refetchAll} onPhase={setDrawPhase}
          />
        </section>

        <PoolLive upcomingId={s.upcomingId} />
      </div>
    </main>
  )
}
