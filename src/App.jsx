// src/App.jsx
import { ConnectButton } from '@rainbow-me/rainbowkit'
import { useAccount } from 'wagmi'
import { useState } from 'react'
import Dashboard from './components/Dashboard'
import PoolLive from './components/PoolLive'
import MobileOpenInWallet from './components/MobileOpenInWallet'
import Tombola from './components/Tombola'
import TicketCalculator from './components/TicketCalculator'
import { StatusChip, Reveal, Tilt, fmtInt, fmtPrice, fmtWhen } from './components/ui'
import { NextMoment, ConnectCta, RoundTicket, Jackpot, Stats, Trust, BUY_URL } from './components/Bits'
import Backdrop from './components/Backdrop'
import { useSorteo } from './hooks/useSorteo'
import { usePrizePrice } from './hooks/usePrizePrice'
import { CONTRACTS } from './config'

// Pega aquí el enlace de YouTube del tutorial cuando lo tengas
// (por ejemplo 'https://www.youtube.com/embed/XXXXXXXX'). Vacío = la sección no se muestra.
const VIDEO_URL = ''


export default function App() {
  const { address, isConnected } = useAccount()
  const s = useSorteo(address)
  return (
    <>
      <Backdrop />
      <Nav />
      {isConnected ? <Dashboard s={s} address={address} /> : <Landing s={s} />}
      <Faq s={s} />
      <Footer />
    </>
  )
}

/* ── Barra superior, con el precio del token ────────────────── */
function Nav() {
  const { price, change, chartUrl } = usePrizePrice()
  const pct = change == null ? null : Math.abs(change).toLocaleString('es-CL', { maximumFractionDigits: 1 })
  return (
    <header className="nav">
      <div className="wrap wrap--wide nav__in">
        <div className="brand">
          <a href="/" aria-label="PRIZECHAIN Sorteo, inicio"><img src="/coin-192.png" alt="" width="40" height="40" /></a>
          <div className="brand__txt">
            <a href="/" className="brand__word" tabIndex={-1} aria-hidden="true"><b>PRIZE</b>CHAIN</a>
            <a className="price" href={chartUrl} target="_blank" rel="noreferrer"
              aria-label={`Precio de PRIZE: ${price > 0 ? fmtPrice(price) + ' dólares' : 'no disponible'}${pct ? `, ${change >= 0 ? 'sube' : 'baja'} ${pct}% en 24 horas` : ''}. Ver el gráfico.`}>
              <strong>{price > 0 ? '$' + fmtPrice(price) : '$ —'}</strong>
              {pct && <span className={'price__chg ' + (change >= 0 ? 'up' : 'down')}>{change >= 0 ? '▲' : '▼'} {pct}%</span>}
            </a>
          </div>
        </div>
        <ConnectButton chainStatus="icon" showBalance={false} accountStatus="address" label="Conectar" />
      </div>
    </header>
  )
}

/* ── Portada (sin wallet conectada) ─────────────────────────── */
function Landing({ s }) {
  return (
    <main>
      <section className="hero">
        <div className="wrap wrap--wide hero__head">
          <StatusChip status={s.awaiting ? 2 : s.roundStatus} regOpen={s.regOpen} drawReady={s.drawReady && !s.awaiting} />
          <h1 className="display h1">Tus PRIZE juegan por ti</h1>
          <p className="lead">
            Cada semana, un sorteo en la blockchain reparte el pozo en USDT entre los holders registrados.
            Sin comprar boletos y sin entregar tus tokens.
          </p>
        </div>

        <Tombola pool={s.awaiting ? s.lastPool : s.pool} spinning={s.awaiting} />

        <div className="wrap hero__foot">
          <Jackpot s={s} />
          <Stats s={s} />
          <NextMoment s={s} />
          <div className="stack center" style={{ gap: 14 }}>
            <ConnectCta />
            <a className="linkbtn" href="/guia.html">¿Primera vez? Guía paso a paso</a>
          </div>
          <Trust />
          <MobileOpenInWallet />
        </div>
      </section>

      <section className="section section--felt">
        <div className="wrap">
          <TicketCalculator ticketSize={s.ticketSize} pool={s.pool} />
        </div>
      </section>

      <Steps s={s} />

      {VIDEO_URL && (
        <section className="section">
          <Reveal className="wrap">
            <div className="section__head"><h2 className="h2">Mira cómo participar</h2></div>
            <div className="video">
              <iframe src={VIDEO_URL} title="Tutorial del sorteo PRIZECHAIN" loading="lazy"
                allow="accelerometer; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
            </div>
          </Reveal>
        </section>
      )}

      <section className="section section--felt">
        <Reveal className="wrap"><PoolLive upcomingId={s.upcomingId} /></Reveal>
      </section>

      <Winners s={s} />
    </main>
  )
}

/* ── Cómo participar: una secuencia real, por eso va numerada ─ */
function Steps({ s }) {
  const size = s.ticketSize > 0 ? fmtInt(s.ticketSize) : '760'
  const steps = [
    { t: 'Consigue PRIZE', d: <>Cómpralo en PancakeSwap con BNB. Con {size} PRIZE ya tienes un boleto. <a href={BUY_URL} target="_blank" rel="noreferrer">Comprar PRIZE</a></> },
    { t: 'Conecta tu wallet', d: 'MetaMask, Trust Wallet u otra de BSC. En el celular, abre esta web dentro de tu wallet.' },
    { t: 'Regístrate', d: 'Un toque en «Registrarme» hasta un día antes del sorteo. Solo pagas el gas: centavos de dólar.' },
    { t: 'Mantén tus PRIZE', d: 'Chainlink elige un boleto al azar y el USDT llega solo a la wallet ganadora.' },
  ]
  return (
    <section className="section">
      <div className="wrap">
        <div className="section__head">
          <h2 className="h2">Cómo participar</h2>
          <a className="linkbtn" href="/guia.html">Guía con capturas para principiantes</a>
        </div>
        <ol className="steps">
          {steps.map((st, i) => (
            <Reveal as="li" key={st.t} className="step" style={{ transitionDelay: `${i * 90}ms` }}>
              <span className="step__n" aria-hidden="true">{i + 1}</span>
              <h3 className="h3">{st.t}</h3>
              <p className="muted small">{st.d}</p>
            </Reveal>
          ))}
        </ol>
      </div>
    </section>
  )
}

/* ── Ganadores ──────────────────────────────────────────────── */
function Winners({ s }) {
  const id = s.upcomingId ? Number(s.upcomingId) : 0
  const ids = id > 1 ? Array.from({ length: Math.min(3, id - 1) }, (_, i) => BigInt(id - 1 - i)) : []
  return (
    <section className="section">
      <Reveal className="wrap">
        <div className="section__head"><h2 className="h2">Ganadores</h2></div>
        {ids.length === 0 ? (
          <div className="empty">
            <p className="h3">Todavía no hay ganadores.</p>
            <p className="muted">
              El primer sorteo es el {fmtWhen(s.scheduledAt)}. La wallet ganadora y su premio aparecerán aquí,
              con el enlace para verificarlo en BscScan.
            </p>
          </div>
        ) : (
          <div className="winners">{ids.map(r => <Tilt key={r.toString()} max={5}><RoundTicket roundId={r} /></Tilt>)}</div>
        )}
      </Reveal>
    </section>
  )
}

/* ── Preguntas frecuentes ───────────────────────────────────── */
function faqs(lang, size, closes) {
  const sz = size > 0 ? fmtInt(size) : '760'
  if (lang === 'en') return [
    ['Do I need to buy tickets?', `No. Your tickets come from the PRIZE you hold: each ticket is 0.1% of the circulating supply (about ${sz} PRIZE today), up to 50 per wallet.`],
    ['Do my PRIZE tokens move?', 'No. The contract only reads your balance. It never transfers or locks your tokens.'],
    ['What does "non-custodial" mean?', 'Nobody holds your tokens for you. They stay in your wallet the whole time, and the prize goes from the contract straight to the winning wallet.'],
    ['How do I know the draw is fair?', 'The winner is chosen by Chainlink VRF, a random number service whose result anyone can verify on BscScan. Nobody can pick or change the winner.'],
    ['Until when can I register?', `Until one day before the draw. For this round, until ${fmtWhen(closes)} (your local time).`],
    ['How do I receive the prize?', 'Automatically. The contract sends the USDT to the winning wallet in the same transaction as the draw.'],
    ['What if nobody wins?', 'If the chosen wallet no longer holds at least one ticket worth of PRIZE, the next one is checked. If none qualifies, the USDT stays for the next round.'],
    ['How much does registering cost?', 'Only BSC gas: a few cents of a dollar.'],
  ]
  return [
    ['¿Tengo que comprar boletos?', `No. Tus boletos salen de los PRIZE que tienes: cada boleto es el 0,1% del supply en circulación (hoy unos ${sz} PRIZE), hasta 50 por wallet.`],
    ['¿Se mueven mis PRIZE?', 'No. El contrato solo lee tu saldo. Nunca transfiere ni bloquea tus tokens.'],
    ['¿Qué significa «sin custodia»?', 'Que nadie guarda tus tokens por ti. Siguen en tu wallet todo el tiempo, y el premio sale del contrato directo a la wallet ganadora.'],
    ['¿Cómo sé que el sorteo es justo?', 'El ganador lo elige Chainlink VRF, un servicio de números aleatorios cuyo resultado cualquiera puede verificar en BscScan. Nadie puede elegir ni cambiar al ganador.'],
    ['¿Hasta cuándo me puedo registrar?', `Hasta un día antes del sorteo. En esta ronda, hasta el ${fmtWhen(closes)} (hora de tu equipo).`],
    ['¿Cómo recibo el premio?', 'Solo. El contrato envía el USDT a la wallet ganadora en la misma transacción del sorteo.'],
    ['¿Qué pasa si nadie gana?', 'Si la wallet elegida ya no tiene PRIZE para al menos un boleto, se revisa la siguiente. Si ninguna cumple, el USDT queda para la próxima ronda.'],
    ['¿Cuánto cuesta registrarme?', 'Solo el gas de BSC: unos centavos de dólar.'],
  ]
}

function Faq({ s }) {
  const [lang, setLang] = useState('es')
  const [open, setOpen] = useState(0)
  const items = faqs(lang, s.ticketSize, s.regClosesAt)
  return (
    <section className="section">
      <div className="wrap">
        <div className="section__head">
          <h2 className="h2">{lang === 'es' ? 'Preguntas frecuentes' : 'Questions'}</h2>
          <div className="seg" role="tablist" aria-label="Idioma" style={{ width: 240 }}>
            {[['es', 'Español'], ['en', 'English']].map(([k, l]) => (
              <button key={k} role="tab" aria-selected={lang === k} onClick={() => { setLang(k); setOpen(0) }}>{l}</button>
            ))}
          </div>
        </div>
        <div className="faq">
          {items.map(([q, a], i) => (
            <div className="faq__item" key={q}>
              <button className="faq__q" aria-expanded={open === i} aria-controls={'faq-' + i}
                onClick={() => setOpen(open === i ? -1 : i)}>
                <span>{q}</span><span aria-hidden="true">+</span>
              </button>
              <div className="faq__a" id={'faq-' + i} data-open={open === i}><div>{a}</div></div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ── Pie ────────────────────────────────────────────────────── */
function Footer() {
  return (
    <footer className="footer">
      <div className="wrap">
        <span className="row" style={{ gap: 10, justifyContent: 'center' }}>
          <img src="/coin-192.png" alt="" width="26" height="26" />
          <span className="small muted">PRIZECHAIN Sorteo en BNB Smart Chain</span>
        </span>
        <nav className="row small" style={{ gap: '8px 22px', justifyContent: 'center' }} aria-label="Enlaces">
          <a href="/guia.html">Guía paso a paso</a>
          <a href={`https://bscscan.com/address/${CONTRACTS.SORTEO}#code`} target="_blank" rel="noreferrer">Contrato verificado en BscScan</a>
          <a href="https://vrf.chain.link" target="_blank" rel="noreferrer">Chainlink VRF</a>
        </nav>
        <p className="tiny" style={{ maxWidth: '58ch' }}>
          Participa con responsabilidad. Solo para mayores de 18 años. El resultado depende del azar y no hay ganancia garantizada.
        </p>
      </div>
    </footer>
  )
}
