// src/components/RoundHistory.jsx — cómo te fue en la ronda anterior
import { useReadContract } from 'wagmi'
import { formatUnits } from 'viem'
import { CONTRACTS, SORTEO_ABI } from '../config'
import { fmtUsd, shortAddr } from './ui'

const ZERO = '0x0000000000000000000000000000000000000000'

export default function RoundHistory({ address, upcomingId }) {
  const prevId = upcomingId ? Number(upcomingId) - 1 : 0

  const { data: prevRound } = useReadContract({
    address: CONTRACTS.SORTEO, abi: SORTEO_ABI, functionName: 'rounds',
    args: [BigInt(prevId)], query: { enabled: prevId > 0 },
  })
  const { data: prevTickets } = useReadContract({
    address: CONTRACTS.SORTEO, abi: SORTEO_ABI, functionName: 'walletTickets',
    args: [BigInt(prevId), address], query: { enabled: prevId > 0 && !!address },
  })

  if (!prevRound || prevId < 1) return null

  const status    = Number(prevRound[0])
  const winner    = prevRound[8]
  const prize     = prevRound[6] ? Number(formatUnits(prevRound[6], 18)) : 0
  const myTickets = prevTickets ? Number(prevTickets) : 0
  const iWon      = winner && address && winner.toLowerCase() === address.toLowerCase()

  let title
  if (iWon) title = `Ganaste $${fmtUsd(prize)} USDT`
  else if (status === 3) title = myTickets > 0 ? `Participaste con ${myTickets} boletos y ganó otra wallet` : 'No participaste'
  else if (status === 4) title = 'No hubo ganador; el premio se acumuló'
  else if (status === 5) title = 'La ronda no tuvo boletos'
  else title = 'Esperando resultado'

  return (
    <section className={'panel stack' + (iWon ? ' panel--win' : '')} style={{ gap: 6 }} aria-label="Ronda anterior">
      <span className="small muted">Ronda Nº {prevId}</span>
      <p className="h3">{title}</p>
      {winner && winner !== ZERO && !iWon && (
        <a className="small" href={`https://bscscan.com/address/${winner}`} target="_blank" rel="noreferrer">
          Ganó {shortAddr(winner)} con ${fmtUsd(prize)} USDT
        </a>
      )}
    </section>
  )
}
