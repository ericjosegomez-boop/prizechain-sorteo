// src/config.js
import { getDefaultConfig } from '@rainbow-me/rainbowkit'
import { bsc } from 'wagmi/chains'

export const CONTRACTS = {
  SORTEO: '0xa7EA6501B774E9f9b3AD74e42c7f7c8EDC906cEe',
  PRIZE:  '0x8967442975F6081Bd1218778AE6a01a83d4Bd8C5',
  USDT:   '0x55d398326f99059fF775485246999027B3197955',
}

export const wagmiConfig = getDefaultConfig({
  appName:   'PRIZECHAIN Sorteo',
  projectId: 'f8fb9c8230a9d4a4080470499a0f30fa',
  chains:    [bsc],
  ssr:       false,
})

export const SORTEO_ABI = [
  {
    name: 'previewTickets',
    type: 'function',
    stateMutability: 'view',
    inputs:  [{ name: 'wallet', type: 'address' }],
    outputs: [
      { name: 'tickets', type: 'uint256' },
      { name: 'tSize',   type: 'uint256' },
      { name: 'balance', type: 'uint256' },
    ],
  },
  {
    name: 'rounds',
    type: 'function',
    stateMutability: 'view',
    inputs:  [{ name: 'roundId', type: 'uint256' }],
    outputs: [
      { name: 'status',               type: 'uint8'   },
      { name: 'scheduledAt',          type: 'uint64'  },
      { name: 'registrationClosesAt', type: 'uint64'  },
      { name: 'requestedAt',          type: 'uint64'  },
      { name: 'vrfRequestId',         type: 'uint256' },
      { name: 'randomWord',           type: 'uint256' },
      { name: 'prizeAmount',          type: 'uint256' },
      { name: 'winnerTicketIndex',    type: 'uint256' },
      { name: 'winner',               type: 'address' },
      { name: 'ticketSize',           type: 'uint256' },
      { name: 'circulatingSnapshot',  type: 'uint256' },
    ],
  },
  {
    name: 'upcomingRoundId',
    type: 'function',
    stateMutability: 'view',
    inputs:  [],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'totalTickets',
    type: 'function',
    stateMutability: 'view',
    inputs:  [{ name: 'roundId', type: 'uint256' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'walletTickets',
    type: 'function',
    stateMutability: 'view',
    inputs:  [
      { name: 'roundId', type: 'uint256' },
      { name: 'wallet',  type: 'address' },
    ],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'currentAvailableReward',
    type: 'function',
    stateMutability: 'view',
    inputs:  [],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'currentTicketSize',
    type: 'function',
    stateMutability: 'view',
    inputs:  [],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'isPrizePaused',
    type: 'function',
    stateMutability: 'view',
    inputs:  [],
    outputs: [{ name: '', type: 'bool' }],
  },
  {
    name: 'register',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs:  [],
    outputs: [],
  },
  {
    name: 'Registered',
    type: 'event',
    inputs: [
      { name: 'roundId',          type: 'uint256', indexed: true  },
      { name: 'account',          type: 'address', indexed: true  },
      { name: 'ticketCount',      type: 'uint256', indexed: false },
      { name: 'ticketIndexStart', type: 'uint256', indexed: false },
      { name: 'ticketIndexEnd',   type: 'uint256', indexed: false },
    ],
  },
  {
    name: 'WinnerSelected',
    type: 'event',
    inputs: [
      { name: 'roundId',            type: 'uint256', indexed: true  },
      { name: 'winner',             type: 'address', indexed: true  },
      { name: 'winningTicketIndex', type: 'uint256', indexed: true  },
      { name: 'ticketsOwned',       type: 'uint256', indexed: false },
      { name: 'prizeAmount',        type: 'uint256', indexed: false },
      { name: 'randomWord',         type: 'uint256', indexed: false },
    ],
  },
]

export const PRIZE_ABI = [
  {
    name: 'balanceOf',
    type: 'function',
    stateMutability: 'view',
    inputs:  [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
]

export const ROUND_STATUS = {
  0: 'Sin iniciar',
  1: 'Registro abierto',
  2: 'Esperando VRF',
  3: 'Completada',
  4: 'Sin ganador',
}
