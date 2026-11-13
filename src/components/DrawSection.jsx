// src/components/DrawSection.jsx
//
// El momento del sorteo, debajo de la tómbola:
//   NOT_YET   — todavía no es la hora (una línea de texto)
//   READY     — llegó la hora: botón "Ejecutar el sorteo" (cualquier wallet puede)
//   SENDING   — transacción enviada
//   AWAITING  — esperando el número de Chainlink VRF (la tómbola gira rápido)
//   WINNER    — ganador elegido (confeti)
//   NO_WINNER — nadie elegible, el premio queda para la próxima
//   SKIPPED   — la ronda no tenía boletos y se abrió la siguiente
//
// La lógica es la misma del v4: advance(), retryDraw() tras 24 h y los eventos
// WinnerSelected / RoundClosedWithoutWinner.

import { useState, useEffect } from 'react'
import { useWriteContract, useWaitForTransactionReceipt, useWatchContractEvent, useReadContract, useAccount } from 'wagmi'
import { formatUnits, keccak256, toHex } from 'viem'
import { CONTRACTS, SORTEO_ABI } from '../config'
import { fmtUsd, shortAddr, celebrate } from './ui'

const DRAW_STATE = {
  NOT_YET:   'not_yet',
  READY:     'ready',
  SENDING:   'sending',
  AWAITING:  'awaiting',
  WINNER:    'winner',
  NO_WINNER: 'no_winner',
  SKIPPED:   'skipped',
}

const ROUND_SKIPPED_TOPIC = keccak256(toHex('RoundSkipped(uint256,uint64)'))
const VRF_RETRY_DELAY     = 24 * 60 * 60

export default function DrawSection({ roundId, scheduledAt, roundStatus, prizeAmount, onDrawComplete, onPhase }) {
  const { address } = useAccount()
  const [drawState, setDrawState] = useState(DRAW_STATE.NOT_YET)
  const [winner, setWinner]       = useState(null)
  const [winnerTickets, setWinnerTickets] = useState(0)
  const [randomWord, setRandomWord] = useState(null)
  const [txHash, setTxHash]       = useState(null)
  const [wonAmount, setWonAmount] = useState(null)   // premio pagado, tomado del evento

  useEffect(() => { onPhase?.(drawState) }, [drawState])

  // La ronda sorteada pasa a ser lastRequestedRoundId y la "próxima" ya es otra.
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

  // ── Estado inicial según la ronda ─────────────────────────
  useEffect(() => {
    const now = Math.floor(Date.now() / 1000)
    if (lastStatus === 2) { setDrawState(DRAW_STATE.AWAITING); return }
    if (drawState === DRAW_STATE.SKIPPED) return
    if (roundStatus === 3) { setDrawState(DRAW_STATE.WINNER);    return }
    if (roundStatus === 4) { setDrawState(DRAW_STATE.NO_WINNER); return }
    if (roundStatus === 2) { setDrawState(DRAW_STATE.AWAITING);  return }
    if ((roundStatus === 0 || roundStatus === 1) && scheduledAt > 0 && now >= scheduledAt) {
      setDrawState(DRAW_STATE.READY)
    } else {
      setDrawState(DRAW_STATE.NOT_YET)
    }
  }, [roundStatus, scheduledAt, lastStatus])

  // ── Pasar a READY justo cuando llega la hora ──────────────
  useEffect(() => {
    if (drawState !== DRAW_STATE.NOT_YET || !scheduledAt) return
    const t = setInterval(() => {
      if (Math.floor(Date.now() / 1000) >= scheduledAt) { setDrawState(DRAW_STATE.READY); clearInterval(t) }
    }, 1000)
    return () => clearInterval(t)
  }, [drawState, scheduledAt])

  // ── Datos de la ronda si ya terminó ───────────────────────
  const { data: roundData } = useReadContract({
    address: CONTRACTS.SORTEO, abi: SORTEO_ABI, functionName: 'rounds',
    args: [roundId], query: { enabled: !!roundId && (roundStatus === 3 || roundStatus === 4) },
  })
  useEffect(() => {
    if (!roundData) return
    if (Number(roundData[0]) === 3) {
      setWinner(roundData[8]); setRandomWord(roundData[5]); setWinnerTickets(0); setWonAmount(roundData[6])
      setDrawState(DRAW_STATE.WINNER)
    }
    if (Number(roundData[0]) === 4) setDrawState(DRAW_STATE.NO_WINNER)
  }, [roundData])

  // ── Eventos en tiempo real ────────────────────────────────
  useWatchContractEvent({
    address: CONTRACTS.SORTEO, abi: SORTEO_ABI, eventName: 'WinnerSelected',
    onLogs(logs) {
      const log = logs[0]
      if (!log) return
      setWinner(log.args.winner)
      setWinnerTickets(Number(log.args.ticketsOwned ?? 0))
      setRandomWord(log.args.randomWord)
      if (log.args.prizeAmount != null) setWonAmount(log.args.prizeAmount)
      setDrawState(DRAW_STATE.WINNER)
      celebrate()
      if (onDrawComplete) onDrawComplete()
    },
  })
  useWatchContractEvent({
    address: CONTRACTS.SORTEO, abi: SORTEO_ABI, eventName: 'RoundClosedWithoutWinner',
    onLogs() {
      setDrawState(DRAW_STATE.NO_WINNER)
      if (onDrawComplete) onDrawComplete()
    },
  })

  // ── Escribir: advance / retryDraw ─────────────────────────
  const { writeContract, isPending: isSending, error: writeErr } = useWriteContract()
  const { isSuccess: txConfirmed, data: receipt } = useWaitForTransactionReceipt({ hash: txHash })

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
      { address: CONTRACTS.SORTEO, abi: SORTEO_ABI, functionName: 'advance' },
      { onSuccess(hash) { setTxHash(hash); setDrawState(DRAW_STATE.SENDING) } }
    )
  }

  const prize = prizeAmount ? Number(formatUnits(prizeAmount, 18)) : 0
  const isMe  = winner && address && winner.toLowerCase() === address.toLowerCase()
  const txLink = txHash && <a className="small" href={`https://bscscan.com/tx/${txHash}`} target="_blank" rel="noreferrer">Ver en BscScan</a>

  const errMsg = writeErr && (() => {
    const m = `${writeErr.shortMessage ?? ''} ${writeErr.message ?? ''}`
    if (/rejected|denied/i.test(m))    return 'Cancelaste la firma en tu wallet.'
    if (m.includes('No USDT funded'))  return 'El contrato no tiene USDT para el premio todavía.'
    if (m.includes('Retry too early')) return 'Aún no pasan 24 horas desde la solicitud a Chainlink.'
    if (m.includes('Too early'))       return 'Todavía no es la hora del sorteo.'
    if (m.includes('VRF pending'))     return 'Ya hay un sorteo esperando a Chainlink.'
    return 'No se pudo ejecutar. Intenta de nuevo.'
  })()

  switch (drawState) {
    case DRAW_STATE.NOT_YET:
      return (
        <p className="small muted draw-note">
          Cuando llegue la hora, aquí aparece el botón para ejecutar el sorteo. Lo puede hacer cualquiera.
        </p>
      )

    case DRAW_STATE.READY:
      return (
        <div className="draw stack">
          <p className="h3">Es la hora del sorteo</p>
          <p className="small muted">
            Cualquier wallet puede girar la tómbola. Chainlink elige el boleto y el USDT va solo a la wallet ganadora.
            Si la ronda no tiene boletos, se cierra y se abre la siguiente.
          </p>
          <button className="btn btn--gold btn--block btn--big" onClick={handleRequestDraw} disabled={isSending}>
            {isSending ? 'Confirma en tu wallet…' : `Ejecutar el sorteo de $${fmtUsd(prize)} USDT`}
          </button>
          {errMsg && <p className="note note--bad" role="alert">{errMsg}</p>}
          <p className="tiny" style={{ textAlign: 'center' }}>Solo pagas el gas de BSC.</p>
        </div>
      )

    case DRAW_STATE.SENDING:
      return (
        <div className="draw stack" style={{ alignItems: 'center', textAlign: 'center' }} aria-live="polite">
          <p className="h3">Transacción enviada</p>
          <p className="small muted">Esperando la confirmación en BSC…</p>
          {txLink}
        </div>
      )

    case DRAW_STATE.SKIPPED:
      return (
        <div className="draw stack" style={{ textAlign: 'center' }}>
          <p className="h3">La ronda no tenía boletos y se cerró</p>
          <p className="small muted">El premio sigue completo para la próxima ronda, que ya tiene el registro abierto.</p>
        </div>
      )

    case DRAW_STATE.AWAITING:
      return (
        <div className="draw stack" style={{ textAlign: 'center' }} aria-live="polite">
          <p className="h3">Chainlink está eligiendo el boleto</p>
          <p className="small muted">
            El número aleatorio llega con una prueba que cualquiera puede verificar. En BSC suele tardar menos de un minuto,
            y esta página se actualiza sola.
          </p>
          {canRetry && (
            <div className="stack" style={{ gap: 10, marginTop: 6 }}>
              <p className="note note--warn">Chainlink no respondió en 24 horas. Cualquiera puede volver a pedir el número.</p>
              <button className="btn btn--gold btn--block" onClick={handleRetry} disabled={isSending}>
                {isSending ? 'Confirma en tu wallet…' : 'Reintentar el sorteo'}
              </button>
            </div>
          )}
        </div>
      )

    case DRAW_STATE.WINNER:
      if (!winner) return null
      return (
        <div className={'draw draw--win stack' + (isMe ? ' draw--me' : '')} aria-live="polite">
          <p className="display" style={{ fontSize: 40 }}>{isMe ? '¡Ganaste!' : 'Tenemos ganador'}</p>
          <div className="row between">
            <div>
              <div className="small muted">Wallet ganadora</div>
              {isMe ? <strong>Tu wallet</strong> : (
                <a href={`https://bscscan.com/address/${winner}`} target="_blank" rel="noreferrer"><strong>{shortAddr(winner)}</strong></a>
              )}
            </div>
            <div style={{ textAlign: 'right' }}>
              <div className="small muted">Premio enviado</div>
              <span className="num gold" style={{ fontSize: 34 }}>${fmtUsd(wonAmount != null ? Number(formatUnits(wonAmount, 18)) : prize)}</span>
            </div>
          </div>
          {winnerTickets > 0 && <p className="small muted">Ganó con {winnerTickets} {winnerTickets === 1 ? 'boleto' : 'boletos'}.</p>}
          {isMe && <p className="note note--ok">El USDT ya está en tu wallet. Puedes verlo en tu app o en BscScan.</p>}
          {randomWord && (
            <a className="small" href={`https://bscscan.com/address/${CONTRACTS.SORTEO}#events`} target="_blank" rel="noreferrer">
              Verificar el número de Chainlink en BscScan
            </a>
          )}
        </div>
      )

    case DRAW_STATE.NO_WINNER:
      return (
        <div className="draw stack" style={{ textAlign: 'center' }}>
          <p className="h3">Sin ganador en esta ronda</p>
          <p className="small muted">
            Ninguna wallet elegida mantuvo PRIZE suficiente hasta el sorteo. Los ${fmtUsd(prize)} USDT se suman al premio de la
            próxima ronda.
          </p>
        </div>
      )

    default:
      return null
  }
}
