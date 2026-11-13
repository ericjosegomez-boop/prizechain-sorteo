// src/components/PoolLive.jsx
// Aportes al premio en tiempo real (evento RewardFunded), avance hacia la meta
// y las últimas rondas. Lee el contrato cada 15 s.

import { useReadContract, useWatchContractEvent } from 'wagmi'
import { formatUnits } from 'viem'
import { useState } from 'react'
import { CONTRACTS, SORTEO_ABI } from '../config'
import { fmtUsd, shortAddr } from './ui'

// Meta que se muestra en la barra. Cámbiala cuando quieras.
const PRIZE_TARGET_USDT = 500

export default function PoolLive({ upcomingId }) {
  const [deposits, setDeposits] = useState([])

  const { data: availableReward, refetch: refetchReward } = useReadContract({
    address: CONTRACTS.SORTEO, abi: SORTEO_ABI, functionName: 'currentAvailableReward',
    query: { refetchInterval: 15_000 },
  })

  const id = upcomingId ? Number(upcomingId) : 0
  const prevIds = [id - 1, id - 2, id - 3].map(n => (n > 0 ? BigInt(n) : null))
  const r1 = useReadContract({ address: CONTRACTS.SORTEO, abi: SORTEO_ABI, functionName: 'rounds', args: [prevIds[0]], query: { enabled: !!prevIds[0] } })
  const r2 = useReadContract({ address: CONTRACTS.SORTEO, abi: SORTEO_ABI, functionName: 'rounds', args: [prevIds[1]], query: { enabled: !!prevIds[1] } })
  const r3 = useReadContract({ address: CONTRACTS.SORTEO, abi: SORTEO_ABI, functionName: 'rounds', args: [prevIds[2]], query: { enabled: !!prevIds[2] } })

  useWatchContractEvent({
    address: CONTRACTS.SORTEO, abi: SORTEO_ABI, eventName: 'RewardFunded',
    onLogs(logs) {
      logs.forEach(log => {
        const amount = log.args.amount ? Number(formatUnits(log.args.amount, 18)) : 0
        setDeposits(prev => [{ addr: log.args.funder, amount, at: Date.now(), tx: log.transactionHash }, ...prev].slice(0, 5))
      })
      refetchReward()
    },
  })

  const amount = availableReward ? Number(formatUnits(availableReward, 18)) : 0
  const pct = Math.min(100, (amount / PRIZE_TARGET_USDT) * 100)
  const history = [[prevIds[0], r1.data], [prevIds[1], r2.data], [prevIds[2], r3.data]].filter(([, d]) => d && Number(d[0]) > 0)

  return (
    <section className="panel stack" aria-labelledby="pool-h">
      <div className="row between">
        <h2 id="pool-h" className="h3">El premio en vivo</h2>
        <span className="small muted row" style={{ gap: 8 }}><span className="dot" />Se actualiza solo</span>
      </div>

      <div className="stack" style={{ gap: 8 }}>
        <div className="bar" role="progressbar" aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100}
          aria-label="Avance del premio hacia la meta"><i style={{ width: pct + '%' }} /></div>
        <div className="row between small">
          <span><strong className="gold">${fmtUsd(amount)}</strong> <span className="muted">de una meta de ${PRIZE_TARGET_USDT} USDT</span></span>
          <span className="muted">{Math.floor(pct)}%</span>
        </div>
      </div>

      <div className="stack" style={{ gap: 4 }}>
        <p className="small" style={{ fontWeight: 600 }}>Últimos aportes al premio</p>
        {deposits.length === 0 ? (
          <p className="small muted">Cuando alguien aporte USDT al premio, aparece aquí al instante.</p>
        ) : (
          <ul className="list">
            {deposits.map(d => (
              <li key={d.tx + d.at} className="list__row deposit-in">
                <a href={`https://bscscan.com/tx/${d.tx}`} target="_blank" rel="noreferrer" className="small">{shortAddr(d.addr)}</a>
                <span className="num gold" style={{ fontSize: 20 }}>+${fmtUsd(d.amount)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <a className="btn btn--ghost btn--block" href={`https://bscscan.com/address/${CONTRACTS.SORTEO}#writeContract`} target="_blank" rel="noreferrer">
        Aportar USDT al premio en BscScan
      </a>

      {history.length > 0 && (
        <div className="stack" style={{ gap: 4 }}>
          <p className="small" style={{ fontWeight: 600 }}>Rondas anteriores</p>
          <ul className="list">
            {history.map(([rid, d]) => {
              const st = Number(d[0])
              const prize = Number(formatUnits(d[6], 18))
              return (
                <li key={rid.toString()} className="list__row">
                  <span className="small">
                    <strong>Ronda Nº {rid.toString()}</strong>{' '}
                    <span className="muted">
                      {st === 3 ? `ganó ${shortAddr(d[8])}` : st === 4 ? 'sin ganador, premio acumulado' : st === 5 ? 'sin boletos' : ''}
                    </span>
                  </span>
                  {st === 3 && <span className="num gold" style={{ fontSize: 20 }}>${fmtUsd(prize)}</span>}
                </li>
              )
            })}
          </ul>
        </div>
      )}
    </section>
  )
}
