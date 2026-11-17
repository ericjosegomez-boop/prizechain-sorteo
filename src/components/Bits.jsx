// src/components/Bits.jsx — piezas usadas por la portada y por el panel
import { ConnectButton } from '@rainbow-me/rainbowkit'
import { useReadContract } from 'wagmi'
import { formatUnits } from 'viem'
import { CONTRACTS, SORTEO_ABI } from '../config'
import { Countdown, Odometer, Icon, fmtInt, fmtUsd, fmtWhen, shortAddr } from './ui'

export const BUY_URL = `https://pancakeswap.finance/swap?chain=bsc&outputCurrency=${CONTRACTS.PRIZE}`
const ZERO = '0x0000000000000000000000000000000000000000'

/* ── Qué viene ahora: registro, sorteo o Chainlink ──────────── */
export function NextMoment({ s, small = false }) {
  if (s.awaiting) return <p className="note note--warn">Chainlink está eligiendo al ganador de la ronda Nº {s.lastId?.toString()}. El resultado aparece aquí en segundos.</p>
  if (s.regOpen) return (
    <div className="stack" style={{ gap: 6 }}>
      <span className="small muted">El registro cierra en</span>
      <Countdown to={s.regClosesAt} small={small} label="Tiempo para registrarse" />
    </div>
  )
  if (s.scheduledAt > s.now) return (
    <div className="stack" style={{ gap: 6 }}>
      <span className="small muted">El registro cerró. El sorteo empieza en</span>
      <Countdown to={s.scheduledAt} small={small} label="Tiempo para el sorteo" />
    </div>
  )
  if (s.drawReady) return <p className="note note--warn">Llegó la hora del sorteo. Cualquiera puede ejecutarlo desde esta web.</p>
  return null
}

export function ConnectCta({ label = 'Conectar wallet y ver mis boletos' }) {
  return (
    <ConnectButton.Custom>
      {({ openConnectModal }) => (
        <button type="button" className="btn btn--gold" onClick={openConnectModal}>{label}</button>
      )}
    </ConnectButton.Custom>
  )
}

export function RoundTicket({ roundId }) {
  const { data: r } = useReadContract({ address: CONTRACTS.SORTEO, abi: SORTEO_ABI, functionName: 'rounds', args: [roundId] })
  if (!r) return <div className="ticket ticket--round" aria-busy="true" style={{ minHeight: 150 }} />
  const status = Number(r[0])
  const won = r[8] && r[8] !== ZERO
  const prize = Number(formatUnits(r[6], 18))
  return (
    <article className="ticket ticket--round">
      <div className="stack" style={{ gap: 10 }}>
        <span className="ticket__serial">Ronda Nº {roundId.toString()}</span>
        {won ? (
          <>
            <span className="num goldtext" style={{ fontSize: 30, paddingBottom: 3 }}>${fmtUsd(prize)} <span style={{ fontSize: 14 }}>USDT</span></span>
            <a className="small" style={{ color: 'var(--text)', fontWeight: 600 }}
              href={`https://bscscan.com/address/${r[8]}`} target="_blank" rel="noreferrer">
              Ganó {shortAddr(r[8])}
            </a>
          </>
        ) : (
          <p style={{ fontSize: 15 }}>
            {status === 5 ? 'Ronda sin boletos.' : 'Sin ganador elegible.'} El premio pasó a la ronda siguiente.
          </p>
        )}
      </div>
      {won && <span className="stamp stamp--sm" aria-hidden="true">Pagado</span>}
    </article>
  )
}


const MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']

/* ── El pozo, con rodillos ──────────────────────────────────── */
export function Jackpot({ s, small = false }) {
  return (
    <div className={'jackpot' + (small ? ' jackpot--sm' : '')}>
      <span className="jackpot__label"><span className="dot" />Pozo acumulado</span>
      <span className="jackpot__row">
        <Odometer value={s.drawPrize} />
        <span className="jackpot__unit">USDT</span>
      </span>
      {!small && s.scheduledAt > 0 && <span className="small muted">Se sortea el {fmtWhen(s.scheduledAt)}</span>}
    </div>
  )
}

/* ── Tres cifras de la ronda ────────────────────────────────── */
export function Stats({ s }) {
  const d = s.scheduledAt ? new Date(s.scheduledAt * 1000) : null
  const hhmm = d ? `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}` : ''
  return (
    <dl className="stats">
      <div className="stat"><dd className="stat__v">{fmtInt(s.awaiting ? s.lastPool : s.pool)}</dd><dt className="stat__l">Boletos en juego</dt></div>
      <div className="stat"><dd className="stat__v">{s.ticketSize > 0 ? fmtInt(s.ticketSize) : '—'} PRIZE</dd><dt className="stat__l">Valor de un boleto</dt></div>
      <div className="stat"><dd className="stat__v">{d ? `${d.getDate()} ${MONTHS[d.getMonth()]}` : '—'}</dd><dt className="stat__l">{d ? `Sorteo a las ${hhmm}` : 'Próximo sorteo'}</dt></div>
    </dl>
  )
}

/* ── Sellos de confianza ────────────────────────────────────── */
export function Trust() {
  return (
    <ul className="trust">
      <li>{Icon.dice}<span><strong>Azar verificable.</strong> El ganador lo elige <a href="https://vrf.chain.link" target="_blank" rel="noreferrer">Chainlink VRF</a>, no una persona.</span></li>
      <li>{Icon.shield}<span><strong>Contrato público.</strong> Código <a href={`https://bscscan.com/address/${CONTRACTS.SORTEO}#code`} target="_blank" rel="noreferrer">verificado en BscScan</a>.</span></li>
      <li>{Icon.lock}<span><strong>Sin custodia.</strong> Tus PRIZE nunca salen de tu wallet.</span></li>
    </ul>
  )
}
