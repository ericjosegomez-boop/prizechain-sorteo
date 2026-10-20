// src/components/DrawSection.jsx
//
// Muestra el panel de sorteo con 3 estados posibles:
//   1. LISTO     — llegó la hora, botón "Ejecutar sorteo"
//   2. ESPERANDO — VRF request enviado, spinner animado
//   3. GANADOR   — fulfillRandomWords ejecutado, muestra ganador con celebración
//
// Cualquier wallet puede llamar requestDraw() / advance() —
// no requiere ser el owner.

import { useState, useEffect, useRef } from 'react'
import { useWriteContract, useWaitForTransactionReceipt, useWatchContractEvent, useReadContract } from 'wagmi'
import { useAccount } from 'wagmi'
import { formatUnits, keccak256, toHex } from 'viem'
import { CONTRACTS, SORTEO_ABI } from '../config'

// Estados del panel
const DRAW_STATE = {
  NOT_YET:   'not_yet',    // aún no es hora
  READY:     'ready',      // hora llegó, nadie llamó aún
  SENDING:   'sending',    // tx de requestDraw en curso
  AWAITING:  'awaiting',   // esperando callback de Chainlink VRF
  WINNER:    'winner',     // ganador seleccionado
  NO_WINNER: 'no_winner',  // nadie elegible
  SKIPPED:   'skipped',    // v3: ronda sin boletos, se abrió la siguiente
}

const ROUND_SKIPPED_TOPIC = keccak256(toHex('RoundSkipped(uint256,uint64)'))
const VRF_RETRY_DELAY     = 24 * 60 * 60

export default function DrawSection({ roundId, scheduledAt, roundStatus, prizeAmount, onDrawComplete }) {
  const { address } = useAccount()
  const [drawState, setDrawState] = useState(DRAW_STATE.NOT_YET)
  const [winner, setWinner]       = useState(null)
  const [winnerTickets, setWinnerTickets] = useState(0)
  const [randomWord, setRandomWord] = useState(null)
  const [txHash, setTxHash]       = useState(null)
  const [secondsLeft, setSecondsLeft] = useState(0)
  const tickRef = useRef(null)

  // v3: la ronda sorteada pasa a ser lastRequestedRoundId y la "próxima" ya es otra.
  //     Se lee aparte para mostrar la espera de Chainlink y el reintento.
  const { data: lastId } = useReadContract({
    address: CONTRACTS.SORTEO, abi: SORTEO_ABI, functionName: 'lastRequestedRoundId',
    query: { refetchInterval: 10_000 },
  })
  const { data: lastRound, refetch: refetchLast } = useReadContract({
    address: CONTRACTS.SORTEO, abi: SORTEO_ABI, functionName: 'rounds',
    args: [lastId], query: { enabled: !!lastId && lastId > 0n, refetchInterval: 10_000 },
  })
  const lastStatus      = lastRound ? Number(lastRound[0]) : -1
  const lastRequestedAt = lastRound ? Number(lastRound[3]) : 0

  // ── Derivar estado inicial desde roundStatus ──────────────
  useEffect(() => {
    const now = Math.floor(Date.now() / 1000)
    if (lastStatus === 2) { setDrawState(DRAW_STATE.AWAITING); return }
    if (drawState === DRAW_STATE.SKIPPED) return
    if (roundStatus === 3) { setDrawState(DRAW_STATE.WINNER);   return }
    if (roundStatus === 4) { setDrawState(DRAW_STATE.NO_WINNER); return }
    if (roundStatus === 2) { setDrawState(DRAW_STATE.AWAITING);  return }
    if ((roundStatus === 0 || roundStatus === 1) && scheduledAt > 0 && now >= scheduledAt) {
      setDrawState(DRAW_STATE.READY)
    } else {
      setDrawState(DRAW_STATE.NOT_YET)
    }
  }, [roundStatus, scheduledAt, lastStatus])

  // ── Countdown hasta la hora del sorteo ───────────────────
  useEffect(() => {
    if (drawState !== DRAW_STATE.NOT_YET) return
    tickRef.current = setInterval(() => {
      const now = Math.floor(Date.now() / 1000)
      const diff = scheduledAt - now
      if (diff <= 0) {
        setDrawState(DRAW_STATE.READY)
        clearInterval(tickRef.current)
      } else {
        setSecondsLeft(diff)
      }
    }, 1000)
    return () => clearInterval(tickRef.current)
  }, [drawState, scheduledAt])

  // ── Leer datos de la ronda si ya completó ─────────────────
  const { data: roundData } = useReadContract({
    address:      CONTRACTS.SORTEO,
    abi:          SORTEO_ABI,
    functionName: 'rounds',
    args:         [roundId],
    query:        { enabled: !!roundId && (roundStatus === 3 || roundStatus === 4) },
  })

  useEffect(() => {
    if (!roundData) return
    if (Number(roundData[0]) === 3) {
      setWinner(roundData[8])
      setRandomWord(roundData[5])
      setWinnerTickets(0)
      setDrawState(DRAW_STATE.WINNER)
    }
    if (Number(roundData[0]) === 4) {
      setDrawState(DRAW_STATE.NO_WINNER)
    }
  }, [roundData])

  // ── Escuchar eventos en tiempo real ───────────────────────
  useWatchContractEvent({
    address:   CONTRACTS.SORTEO,
    abi:       SORTEO_ABI,
    eventName: 'WinnerSelected',
    onLogs(logs) {
      const log = logs[0]
      if (!log) return
      setWinner(log.args.winner)
      setWinnerTickets(Number(log.args.ticketsOwned ?? 0))
      setRandomWord(log.args.randomWord)
      setDrawState(DRAW_STATE.WINNER)
      if (onDrawComplete) onDrawComplete()
    },
  })

  useWatchContractEvent({
    address:   CONTRACTS.SORTEO,
    abi:       SORTEO_ABI,
    eventName: 'RoundClosedWithoutWinner',
    onLogs() {
      setDrawState(DRAW_STATE.NO_WINNER)
      if (onDrawComplete) onDrawComplete()
    },
  })

  // ── Escribir: requestDraw / advance ───────────────────────
  const { writeContract, isPending: isSending, error: writeErr } = useWriteContract()

  const { isLoading: isConfirming, isSuccess: txConfirmed, data: receipt } = useWaitForTransactionReceipt({
    hash: txHash,
  })

  useEffect(() => {
    if (!txConfirmed) return
    const skipped = receipt?.logs?.some(l => l.topics?.[0] === ROUND_SKIPPED_TOPIC)
    setDrawState(skipped ? DRAW_STATE.SKIPPED : DRAW_STATE.AWAITING)
    refetchLast()
    if (onDrawComplete) onDrawComplete()
  }, [txConfirmed])

  function handleRetry() {
    writeContract(
      { address: CONTRACTS.SORTEO, abi: SORTEO_ABI, functionName: 'retryDraw' },
      { onSuccess(hash) { setTxHash(hash); setDrawState(DRAW_STATE.SENDING) } }
    )
  }
  const canRetry = lastStatus === 2 && lastRequestedAt > 0 &&
    Math.floor(Date.now() / 1000) >= lastRequestedAt + VRF_RETRY_DELAY

  function handleRequestDraw() {
    writeContract(
      {
        address:      CONTRACTS.SORTEO,
        abi:          SORTEO_ABI,
        functionName: 'advance',
      },
      {
        onSuccess(hash) {
          setTxHash(hash)
          setDrawState(DRAW_STATE.SENDING)
        },
      }
    )
  }

  // ── Formatear tiempo ──────────────────────────────────────
  function fmtSecs(s) {
    if (s <= 0) return '00:00:00'
    const h = Math.floor(s / 3600)
    const m = Math.floor((s % 3600) / 60)
    const sec = s % 60
    if (h > 0) return `${h}h ${String(m).padStart(2,'0')}m`
    return `${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`
  }

  function shortAddr(addr) {
    if (!addr) return ''
    return addr.slice(0, 6) + '...' + addr.slice(-4)
  }

  const prize = prizeAmount ? Number(formatUnits(prizeAmount, 18)).toFixed(2) : '0.00'
  const isMe  = winner && address && winner.toLowerCase() === address.toLowerCase()

  // ── Renders por estado ────────────────────────────────────
  return (
    <div style={{ marginTop: 8 }}>

      {/* ── NO_YET: countdown ── */}
      {drawState === DRAW_STATE.NOT_YET && (
        <div style={card('#2D1B4E', '#4C1D95')}>
          <p style={label}>Próximo sorteo</p>
          <div style={{ fontSize: 32, fontWeight: 500, color: '#F59E0B', textAlign: 'center', margin: '8px 0' }}>
            {fmtSecs(secondsLeft)}
          </div>
          <p style={{ fontSize: 12, color: '#6B7280', textAlign: 'center' }}>
            Cuando el contador llegue a cero cualquiera puede ejecutar el sorteo
          </p>
        </div>
      )}

      {/* ── READY: botón de ejecutar ── */}
      {drawState === DRAW_STATE.READY && (
        <div style={card('#1E0A3C', '#7C3AED')}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#A855F7', display: 'inline-block', animation: 'pulse 1.4s ease-in-out infinite' }} />
            <p style={{ ...label, margin: 0, color: '#C4BCFC' }}>Es hora del sorteo</p>
          </div>
          <p style={{ fontSize: 13, color: '#9CA3AF', marginBottom: 14, lineHeight: 1.6 }}>
            La ronda #{roundId?.toString()} está lista. Cualquier persona puede ejecutar el sorteo.
            El USDT se transfiere automáticamente al ganador. Si la ronda no tiene boletos,
            se cierra sola y se abre la siguiente.
          </p>
          <button onClick={handleRequestDraw} disabled={isSending} style={{
            width: '100%', padding: 14, borderRadius: 10,
            background: isSending ? '#4C1D95' : '#A855F7',
            color: '#fff', border: 'none', fontSize: 15, fontWeight: 500,
            cursor: isSending ? 'not-allowed' : 'pointer',
          }}>
            {isSending ? 'Confirmando en wallet...' : `Ejecutar sorteo — ${prize} USDT en juego`}
          </button>
          {writeErr && (
            <p style={{ fontSize: 12, color: '#EF4444', marginTop: 8, textAlign: 'center' }}>
              {writeErr.message?.includes('No USDT funded') ? 'El contrato no tiene USDT como premio. El owner debe fondearlo.' :
               writeErr.message?.includes('Retry too early') ? 'Aún no pasan 24 horas desde la solicitud a Chainlink.' :
               writeErr.message?.includes('Too early') ? 'Todavía no es la hora del sorteo.' :
               writeErr.message?.includes('No tickets') ? 'No hay boletos registrados en esta ronda.' :
               'Error al ejecutar. Intenta de nuevo.'}
            </p>
          )}
          <p style={{ fontSize: 11, color: '#6B7280', textAlign: 'center', marginTop: 8 }}>
            Solo pagas gas de BSC (~0.001 BNB)
          </p>
          <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}`}</style>
        </div>
      )}

      {/* ── SENDING: tx enviada, esperando confirmación ── */}
      {drawState === DRAW_STATE.SENDING && (
        <div style={{ ...card('#2D1B4E', '#4C1D95'), textAlign: 'center' }}>
          <Spinner />
          <p style={{ fontSize: 14, fontWeight: 500, color: '#F3F0FF', marginBottom: 6 }}>
            Transacción enviada
          </p>
          <p style={{ fontSize: 12, color: '#9CA3AF', marginBottom: 10 }}>
            Esperando confirmación en BSC...
          </p>
          {txHash && (
            <a href={`https://bscscan.com/tx/${txHash}`} target="_blank" rel="noreferrer"
              style={{ fontSize: 12, color: '#A855F7' }}>
              Ver en BscScan ↗
            </a>
          )}
        </div>
      )}

      {/* ── SKIPPED: ronda sin boletos (v3) ── */}
      {drawState === DRAW_STATE.SKIPPED && (
        <div style={{ ...card('#2D1B4E', '#4C1D95'), textAlign: 'center' }}>
          <p style={{ fontSize: 15, fontWeight: 500, color: '#F3F0FF', marginBottom: 6 }}>
            La ronda no tenía boletos y se cerró
          </p>
          <p style={{ fontSize: 12, color: '#9CA3AF', lineHeight: 1.6 }}>
            El premio se mantiene para la próxima ronda, que ya tiene el registro abierto.
          </p>
        </div>
      )}

      {/* ── AWAITING: esperando Chainlink VRF ── */}
      {drawState === DRAW_STATE.AWAITING && (
        <div style={{ ...card('#2D1B4E', '#4C1D95'), textAlign: 'center' }}>
          <div style={{ position: 'relative', width: 56, height: 56, margin: '0 auto 14px' }}>
            <div style={{
              width: 56, height: 56, borderRadius: '50%',
              border: '3px solid #4C1D95', borderTopColor: '#A855F7',
              animation: 'spin .9s linear infinite',
            }} />
            <div style={{
              position: 'absolute', top: '50%', left: '50%',
              transform: 'translate(-50%,-50%)',
              fontSize: 20,
            }}>⛓️</div>
          </div>
          <p style={{ fontSize: 15, fontWeight: 500, color: '#F3F0FF', marginBottom: 6 }}>
            Chainlink VRF generando número aleatorio
          </p>
          <p style={{ fontSize: 12, color: '#9CA3AF', marginBottom: 10, lineHeight: 1.6 }}>
            Los oráculos de Chainlink están creando una prueba criptográfica verificable.
            Esto toma entre 10 y 30 segundos en BSC.
          </p>
          <div style={{ background: '#1A0A2E', borderRadius: 8, padding: '8px 14px', fontSize: 12, color: '#6B7280' }}>
            Esta página se actualizará automáticamente cuando llegue el resultado.
          </div>
          {canRetry && (
            <div style={{ marginTop: 12 }}>
              <p style={{ fontSize: 12, color: '#FDE68A', marginBottom: 8 }}>
                Chainlink no respondió en 24 horas. Cualquiera puede volver a pedir el número.
              </p>
              <button onClick={handleRetry} disabled={isSending} style={{
                width: '100%', padding: 12, borderRadius: 10, background: '#F59E0B',
                color: '#1A0A2E', border: 'none', fontSize: 14, fontWeight: 600, cursor: 'pointer',
              }}>{isSending ? 'Confirmando en wallet...' : 'Reintentar sorteo'}</button>
            </div>
          )}
          <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        </div>
      )}

      {/* ── WINNER: ganador seleccionado ── */}
      {drawState === DRAW_STATE.WINNER && winner && (
        <div style={{ ...card(isMe ? '#0A2014' : '#1E0A3C', isMe ? '#27500A' : '#534AB7') }}>
          <div style={{ textAlign: 'center', marginBottom: 16 }}>
            <div style={{ fontSize: 40, marginBottom: 8 }}>🏆</div>
            <p style={{ fontSize: 16, fontWeight: 600, color: isMe ? '#6BCB8B' : '#F3F0FF', marginBottom: 4 }}>
              {isMe ? '¡Ganaste esta ronda!' : 'Ganador seleccionado'}
            </p>
            <p style={{ fontSize: 13, color: '#9CA3AF' }}>
              Ronda #{roundId?.toString()} · {prize} USDT transferidos
            </p>
          </div>

          {/* Card del ganador */}
          <div style={{
            background: '#1A0A2E', borderRadius: 10,
            border: `0.5px solid ${isMe ? '#27500A' : '#4C1D95'}`,
            padding: 16, marginBottom: 12,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
              <div style={{
                width: 44, height: 44, borderRadius: '50%',
                background: isMe ? '#0A1F12' : '#2D1B4E',
                border: `1.5px solid ${isMe ? '#27500A' : '#4C1D95'}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 18, flexShrink: 0,
              }}>
                {isMe ? '🎉' : '👤'}
              </div>
              <div>
                <p style={{ fontSize: 13, fontWeight: 500, color: '#F3F0FF', marginBottom: 2 }}>
                  {isMe ? 'Tu wallet' : shortAddr(winner)}
                </p>
                {!isMe && (
                  <a href={`https://bscscan.com/address/${winner}`} target="_blank" rel="noreferrer"
                    style={{ fontSize: 11, color: '#A855F7' }}>
                    Ver en BscScan ↗
                  </a>
                )}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <div style={{ background: '#2D1B4E', borderRadius: 8, padding: 10, textAlign: 'center' }}>
                <div style={{ fontSize: 20, fontWeight: 500, color: '#F59E0B' }}>{prize} USDT</div>
                <div style={{ fontSize: 11, color: '#6B7280', marginTop: 2 }}>Premio recibido</div>
              </div>
              <div style={{ background: '#2D1B4E', borderRadius: 8, padding: 10, textAlign: 'center' }}>
                <div style={{ fontSize: 20, fontWeight: 500, color: '#A855F7' }}>
                  {winnerTickets > 0 ? winnerTickets : '—'}
                </div>
                <div style={{ fontSize: 11, color: '#6B7280', marginTop: 2 }}>Boletos tenía</div>
              </div>
            </div>
          </div>

          {/* Verificación VRF */}
          {randomWord && (
            <div style={{ background: '#1A0A2E', borderRadius: 8, padding: '10px 14px' }}>
              <p style={{ fontSize: 11, color: '#6B7280', marginBottom: 4 }}>
                Número VRF verificable on-chain
              </p>
              <p style={{ fontFamily: 'monospace', fontSize: 10, color: '#9CA3AF', wordBreak: 'break-all', lineHeight: 1.5 }}>
                {randomWord.toString().slice(0, 40)}...
              </p>
              <a
                href={`https://bscscan.com/address/${CONTRACTS.SORTEO}#events`}
                target="_blank" rel="noreferrer"
                style={{ fontSize: 11, color: '#A855F7', display: 'block', marginTop: 6 }}
              >
                Verificar sorteo en BscScan ↗
              </a>
            </div>
          )}

          {isMe && (
            <div style={{ background: '#0A1F12', border: '0.5px solid #27500A', borderRadius: 8, padding: '10px 14px', marginTop: 10 }}>
              <p style={{ fontSize: 12, color: '#6BCB8B', lineHeight: 1.6 }}>
                El USDT ya está en tu wallet. Puedes verificarlo en BscScan o en tu aplicación de wallet.
              </p>
            </div>
          )}
        </div>
      )}

      {/* ── NO_WINNER: nadie elegible ── */}
      {drawState === DRAW_STATE.NO_WINNER && (
        <div style={card('#2D1B4E', '#4C1D95')}>
          <div style={{ textAlign: 'center', marginBottom: 14 }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>📭</div>
            <p style={{ fontSize: 15, fontWeight: 500, color: '#F3F0FF', marginBottom: 4 }}>
              Sin ganador en esta ronda
            </p>
            <p style={{ fontSize: 13, color: '#9CA3AF', lineHeight: 1.6 }}>
              Ningún participante mantuvo su saldo de PRIZE hasta el momento del sorteo.
            </p>
          </div>
          <div style={{ background: '#1A0A2E', borderRadius: 8, padding: '10px 14px' }}>
            <p style={{ fontSize: 12, color: '#C4BCFC', marginBottom: 4, fontWeight: 500 }}>
              ¿Qué pasa con el premio?
            </p>
            <p style={{ fontSize: 12, color: '#9CA3AF', lineHeight: 1.6 }}>
              Los {prize} USDT se suman automáticamente al premio de la siguiente ronda.
              El próximo sorteo tendrá un premio acumulado más grande.
            </p>
          </div>
        </div>
      )}

    </div>
  )
}

function Spinner() {
  return (
    <>
      <div style={{
        width: 36, height: 36,
        border: '3px solid #4C1D95', borderTopColor: '#A855F7',
        borderRadius: '50%', animation: 'spin .8s linear infinite',
        margin: '0 auto 12px',
      }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </>
  )
}

function card(bg, border) {
  return {
    background: bg,
    border: `0.5px solid ${border}`,
    borderRadius: 12,
    padding: 18,
    marginBottom: 12,
  }
}

const label = {
  fontSize: 12, color: '#9CA3AF',
  fontWeight: 500, letterSpacing: .5,
  textTransform: 'uppercase', marginBottom: 8,
}
