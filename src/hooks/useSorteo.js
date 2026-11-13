// src/hooks/useSorteo.js
// Todas las lecturas del contrato del sorteo en un solo lugar.
// wagmi agrupa estas llamadas en un multicall y comparte el caché entre componentes.

import { useReadContract } from 'wagmi'
import { formatUnits } from 'viem'
import { CONTRACTS, SORTEO_ABI } from '../config'
import { useNow } from '../components/ui'

const S = { address: CONTRACTS.SORTEO, abi: SORTEO_ABI }

export function useSorteo(address) {
  // Los contadores visibles tienen su propio reloj de 1 s; aquí basta con 5 s.
  const now = useNow(5000)

  const { data: upcomingId, isLoading: loadingId } = useReadContract({ ...S, functionName: 'upcomingRoundId', query: { refetchInterval: 30_000 } })
  const { data: reward } = useReadContract({ ...S, functionName: 'currentAvailableReward', query: { refetchInterval: 15_000 } })
  const { data: nextDrawAt } = useReadContract({ ...S, functionName: 'nextDrawAt', query: { refetchInterval: 30_000 } })
  const { data: minRegAge } = useReadContract({ ...S, functionName: 'minRegistrationAge' })
  const { data: ticketSizeRaw } = useReadContract({ ...S, functionName: 'currentTicketSize', query: { refetchInterval: 60_000 } })
  const { data: isPaused } = useReadContract({ ...S, functionName: 'isPrizePaused', query: { refetchInterval: 60_000 } })
  const { data: roundData, isLoading: loadingRound, refetch: refetchRound } = useReadContract({
    ...S, functionName: 'rounds', args: [upcomingId], query: { enabled: !!upcomingId, refetchInterval: 15_000 },
  })
  const { data: poolRaw, refetch: refetchPool } = useReadContract({
    ...S, functionName: 'totalTickets', args: [upcomingId], query: { enabled: !!upcomingId, refetchInterval: 15_000 },
  })
  const { data: preview, isLoading: loadingPreview, refetch: refetchPreview } = useReadContract({
    ...S, functionName: 'previewTickets', args: [address], query: { enabled: !!address, refetchInterval: 30_000 },
  })
  const { data: myTicketsRaw, refetch: refetchMine } = useReadContract({
    ...S, functionName: 'walletTickets', args: [upcomingId, address], query: { enabled: !!upcomingId && !!address },
  })
  // La ronda que se está sorteando (si hay una) ya no es la "próxima".
  const { data: lastId } = useReadContract({ ...S, functionName: 'lastRequestedRoundId', query: { refetchInterval: 10_000 } })
  const { data: lastRound, refetch: refetchLast } = useReadContract({
    ...S, functionName: 'rounds', args: [lastId], query: { enabled: !!lastId && lastId > 0n, refetchInterval: 10_000 },
  })

  // Mientras Chainlink sortea, la tómbola que importa es la de esa ronda.
  const { data: lastPoolRaw } = useReadContract({
    ...S, functionName: 'totalTickets', args: [lastId], query: { enabled: !!lastId && lastId > 0n },
  })
  const { data: lastMineRaw } = useReadContract({
    ...S, functionName: 'walletTickets', args: [lastId, address], query: { enabled: !!lastId && lastId > 0n && !!address },
  })

  const roundStatus  = roundData ? Number(roundData[0]) : 0
  const unset        = roundStatus === 0
  const scheduledAt  = unset ? Number(nextDrawAt ?? 0) : Number(roundData?.[1] ?? 0)
  const regClosesAt  = unset
    ? (nextDrawAt && minRegAge ? Number(nextDrawAt) - Number(minRegAge) : 0)
    : Number(roundData?.[2] ?? 0)
  const regOpen      = (roundStatus === 0 || roundStatus === 1) && regClosesAt > now
  const drawReady    = (roundStatus === 0 || roundStatus === 1) && scheduledAt > 0 && now >= scheduledAt
  const lastStatus   = lastRound ? Number(lastRound[0]) : -1
  const awaiting     = lastStatus === 2

  return {
    now, upcomingId, loading: loadingId || loadingRound || (!!address && loadingPreview),
    rewardRaw: reward ?? 0n,
    reward: reward ? Number(formatUnits(reward, 18)) : 0,
    ticketSize: ticketSizeRaw ? Number(formatUnits(ticketSizeRaw, 18)) : 0,
    pool: poolRaw ? Number(poolRaw) : 0,
    isPaused: !!isPaused,
    roundData, roundStatus, scheduledAt, regClosesAt, regOpen, drawReady,
    lastId, lastRound, lastStatus, awaiting,
    lastPool: lastPoolRaw ? Number(lastPoolRaw) : 0,
    lastMine: lastMineRaw ? Number(lastMineRaw) : 0,
    // premio que se está jugando: el reservado de la ronda en sorteo, o el disponible
    drawPrize: awaiting && lastRound ? Number(formatUnits(lastRound[6], 18)) : (reward ? Number(formatUnits(reward, 18)) : 0),
    // de la wallet conectada
    preview,
    tickets: preview ? Number(preview[0]) : 0,
    previewTicketSizeRaw: preview ? preview[1] : 0n,
    balanceRaw: preview ? preview[2] : 0n,
    balance: preview ? Number(formatUnits(preview[2], 18)) : 0,
    myTickets: myTicketsRaw ? Number(myTicketsRaw) : 0,
    // tamaño de boleto congelado de la ronda (el que se re-verifica al sortear)
    roundTicketSizeRaw: roundData && roundData[9] > 0n ? roundData[9] : (ticketSizeRaw ?? 0n),
    refetchAll() { refetchPreview(); refetchRound(); refetchPool(); refetchMine(); refetchLast() },
  }
}
