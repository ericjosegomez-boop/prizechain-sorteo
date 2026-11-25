// src/components/RegisterButton.jsx
// Registro en la ronda: una sola transacción a register(). El contrato lee tu
// saldo de PRIZE y te asigna los boletos; tus tokens no se mueven.

import { useWaitForTransactionReceipt } from 'wagmi'
import { useSafeWrite, rawReason } from '../hooks/useSafeWrite'
import { useEffect } from 'react'
import { CONTRACTS, SORTEO_ABI } from '../config'
import { BUY_URL } from './Bits'
import { fmtInt } from './ui'

const plural = n => (n === 1 ? 'boleto' : 'boletos')

function errorText(err) {
  const m = `${err?.shortMessage ?? ''} ${err?.message ?? ''}`
  if (/rejected|denied|cancel/i.test(m))      return 'Cancelaste la firma en tu wallet. Puedes intentarlo de nuevo.'
  if (m.includes('Already registered'))        return 'Esta wallet ya está registrada en la ronda.'
  if (m.includes('Registration closed'))       return 'El registro de esta ronda ya cerró.'
  if (m.includes('Need >='))                   return 'Tu saldo de PRIZE no alcanza para un boleto.'
  if (m.includes('Ticket pool full'))          return 'La tómbola de esta ronda está llena.'
  if (m.includes('PRIZE token paused'))        return 'El token PRIZE está en pausa. Intenta más tarde.'
  if (m.includes('Excluded'))                  return 'Esta wallet no puede participar en el sorteo.'
  if (/insufficient funds|exceeds the balance|gas required exceeds/i.test(m)) return 'Te falta BNB para pagar el gas. Basta con unos centavos de dólar en BNB (red BSC).'
  if (/chain|network/i.test(m))                return 'Tu wallet está en otra red. Cámbiala a BNB Smart Chain e intenta de nuevo.'
  return 'No se pudo registrar. Revisa tu wallet e intenta de nuevo.'
}

export default function RegisterButton({
  isRegistered, tickets, registeredTickets, regOpen, isPaused,
  balance, ticketSize, roundSize, pool, onSuccess,
}) {
  const { send, checking, data: txHash, isPending, error: writeError } = useSafeWrite()
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash: txHash })

  useEffect(() => { if (isSuccess) onSuccess() }, [isSuccess])

  function handleRegister() {
    send({ address: CONTRACTS.SORTEO, abi: SORTEO_ABI, functionName: 'register' })
  }

  const txLink = txHash && (
    <a className="small" href={`https://bscscan.com/tx/${txHash}`} target="_blank" rel="noreferrer">Ver la transacción en BscScan</a>
  )

  if (isRegistered) {
    return (
      <div className="note note--ok">
        <strong>Estás en la tómbola con {registeredTickets} {plural(registeredTickets)}.</strong>{' '}
        Mantén al menos {fmtInt(roundSize || ticketSize)} PRIZE en esta wallet hasta el sorteo: si tu saldo baja de eso,
        tus boletos no cuentan.
      </div>
    )
  }

  if (isSuccess) {
    return (
      <div className="note note--ok stack" style={{ gap: 6 }}>
        <strong>¡Registrado! Tus {tickets} {plural(tickets)} ya están en la tómbola.</strong>
        {txLink}
      </div>
    )
  }

  if (isPaused) {
    return (
      <div className="stack" style={{ gap: 10 }}>
        <p className="note note--warn">El token PRIZE está en pausa de emergencia. El registro vuelve cuando se reactive.</p>
        <button className="btn btn--block" disabled>Registro no disponible</button>
      </div>
    )
  }

  if (!regOpen) {
    return <p className="note note--info">El registro de esta ronda cerró. Podrás registrarte en la próxima apenas empiece.</p>
  }

  if (tickets === 0) {
    const missing = Math.max(0, Math.ceil(ticketSize - balance))
    return (
      <div className="stack" style={{ gap: 10 }}>
        <p className="note note--warn">
          Necesitas {fmtInt(ticketSize)} PRIZE para tu primer boleto.
          {balance > 0 && ` Te faltan ${fmtInt(missing)} PRIZE.`}
        </p>
        <a className="btn btn--ghost btn--block" href={BUY_URL} target="_blank" rel="noreferrer">Comprar PRIZE en PancakeSwap</a>
      </div>
    )
  }

  if (isPending || isConfirming) {
    return (
      <div className="panel stack" style={{ alignItems: 'center', textAlign: 'center', gap: 10 }} aria-live="polite">
        <div className="spinner" />
        <strong>{checking ? 'Preparando tu registro…' : isPending ? 'Confirma el registro en tu wallet' : 'Registrando tus boletos en BSC…'}</strong>
        <span className="small muted">{checking ? 'Revisando la transacción antes de abrir tu wallet.' : isPending ? 'Revisa MetaMask o Trust Wallet y toca Confirmar.' : 'Suele tardar unos segundos.'}</span>
        {txLink}
      </div>
    )
  }

  const chance = (tickets / (pool + tickets)) * 100
  return (
    <div className="stack" style={{ gap: 10 }}>
      {writeError && (
        <div className="note note--bad stack" role="alert" style={{ gap: 4 }}>
          <span>{errorText(writeError)}</span>
          <span className="tiny">Detalle: {rawReason(writeError)}</span>
        </div>
      )}
      <button className="btn btn--gold btn--block btn--big" onClick={handleRegister}>
        {writeError ? 'Intentar de nuevo' : `Registrarme con ${tickets} ${plural(tickets)}`}
      </button>
      <p className="small muted" style={{ textAlign: 'center' }}>
        {pool > 0
          ? `Con ${fmtInt(pool)} boletos ya en la tómbola, tu probabilidad sería del ${chance >= 99.95 ? '100' : chance.toLocaleString('es-CL', { maximumFractionDigits: 1 })}%. `
          : 'Serías el primero en la tómbola. '}
        Tus PRIZE no se mueven y solo pagas el gas, unos centavos de dólar.
      </p>
    </div>
  )
}
