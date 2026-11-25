// src/hooks/useSafeWrite.js
//
// Envía una transacción al contrato de forma que funcione igual en MetaMask,
// Trust Wallet y las demás wallets:
//
//  1. Antes de abrir la wallet, la web prueba la transacción en un nodo público
//     de BSC. Si el contrato la rechazaría (ya registrado, registro cerrado,
//     saldo insuficiente…), la web muestra el motivo y no molesta a la wallet.
//  2. La web calcula el gas y el precio del gas y se los entrega a la wallet.
//     Trust Wallet a veces no logra calcularlo por su cuenta y se queda en la
//     pantalla "Transacción sin procesar"; con el gas ya calculado, no lo necesita.

import { useState } from 'react'
import { useAccount, usePublicClient, useWriteContract } from 'wagmi'

const BSC = 56

export function useSafeWrite() {
  const { address } = useAccount()
  const client = usePublicClient({ chainId: BSC })
  const w = useWriteContract()
  const [checking, setChecking] = useState(false)
  const [preError, setPreError] = useState(null)

  async function send(params, options) {
    setPreError(null); w.reset(); setChecking(true)
    try {
      const call = { ...params, account: address }
      await client.simulateContract(call)                       // ¿la aceptaría el contrato?
      const [gas, gasPrice] = await Promise.all([
        client.estimateContractGas(call),
        client.getGasPrice(),
      ])
      setChecking(false)
      w.writeContract({
        ...params,
        chainId: BSC,
        gas: (gas * 13n) / 10n + 20_000n,                         // 30% de margen
        gasPrice,
      }, options)
    } catch (e) {
      setChecking(false)
      setPreError(e)
    }
  }

  return {
    send,
    checking,
    isPending: checking || w.isPending,
    data: w.data,
    error: preError ?? w.error,
    reset() { setPreError(null); w.reset() },
  }
}

/** El motivo técnico del rechazo, para mostrarlo en letra chica. */
export function rawReason(err) {
  if (!err) return ''
  return err.cause?.reason ?? err.reason ?? err.shortMessage ?? String(err.message ?? '').split('\n')[0]
}
