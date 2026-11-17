// src/hooks/usePrizePrice.js
//
// Precio de PRIZE en dólares para la barra superior.
//  - El precio se calcula directo de la blockchain, con las reservas del pool
//    PRIZE/BNB de PancakeSwap v2 y el pool BNB/USDT. No depende de terceros.
//  - La variación de 24 h viene de DexScreener (si no responde, no se muestra
//    y el precio sigue funcionando).

import { useReadContracts } from 'wagmi'
import { useQuery } from '@tanstack/react-query'
import { formatUnits, parseAbi, zeroAddress } from 'viem'
import { CONTRACTS } from '../config'

const FACTORY = '0xcA143Ce32Fe78f1f7019d7d551a6402fC5350c73'   // PancakeSwap v2
const WBNB    = '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c'
const factoryAbi = parseAbi(['function getPair(address, address) view returns (address)'])
const pairAbi = parseAbi([
  'function getReserves() view returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast)',
  'function token0() view returns (address)',
])

// Precio de `base` medido en el otro token del par (ambos con 18 decimales).
function priceOf(reserves, token0, base) {
  if (!reserves || !token0) return 0
  const baseIs0 = token0.toLowerCase() === base.toLowerCase()
  const rb = baseIs0 ? reserves[0] : reserves[1], rq = baseIs0 ? reserves[1] : reserves[0]
  return rb > 0n ? Number(formatUnits(rq, 18)) / Number(formatUnits(rb, 18)) : 0
}

export function usePrizePrice() {
  const { data: pairs } = useReadContracts({
    contracts: [
      { address: FACTORY, abi: factoryAbi, functionName: 'getPair', args: [CONTRACTS.PRIZE, WBNB] },
      { address: FACTORY, abi: factoryAbi, functionName: 'getPair', args: [WBNB, CONTRACTS.USDT] },
    ],
    query: { staleTime: Infinity },
  })
  const pairPrize = pairs?.[0]?.result, pairBnb = pairs?.[1]?.result
  const ready = !!pairPrize && !!pairBnb && pairPrize !== zeroAddress && pairBnb !== zeroAddress

  const { data: r } = useReadContracts({
    contracts: [
      { address: pairPrize, abi: pairAbi, functionName: 'getReserves' },
      { address: pairPrize, abi: pairAbi, functionName: 'token0' },
      { address: pairBnb,   abi: pairAbi, functionName: 'getReserves' },
      { address: pairBnb,   abi: pairAbi, functionName: 'token0' },
    ],
    query: { enabled: ready, refetchInterval: 30_000 },
  })
  const onchain = r ? priceOf(r[0]?.result, r[1]?.result, CONTRACTS.PRIZE) * priceOf(r[2]?.result, r[3]?.result, WBNB) : 0

  const { data: dex } = useQuery({
    queryKey: ['dexscreener', CONTRACTS.PRIZE],
    queryFn: async () => {
      const res = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${CONTRACTS.PRIZE}`)
      if (!res.ok) throw new Error('dexscreener ' + res.status)
      const json = await res.json()
      const list = (json.pairs ?? []).filter(p => p.chainId === 'bsc')
      list.sort((a, b) => (b.liquidity?.usd ?? 0) - (a.liquidity?.usd ?? 0))
      return list[0] ?? null
    },
    refetchInterval: 60_000, staleTime: 30_000, retry: 1,
  })

  const change = dex?.priceChange?.h24
  return {
    price: onchain > 0 ? onchain : Number(dex?.priceUsd ?? 0),
    change: typeof change === 'number' && isFinite(change) ? change : null,
    chartUrl: dex?.url ?? `https://dexscreener.com/bsc/${CONTRACTS.PRIZE}`,
  }
}
