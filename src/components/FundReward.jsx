// src/components/FundReward.jsx
//
// Aportar USDT al premio sin salir de la web: escribes la cantidad y confirmas
// UNA vez en tu wallet.
//
// Cómo funciona: es una transferencia normal de USDT a la dirección del
// contrato del sorteo. El contrato calcula el premio como "USDT que tengo
// menos lo ya reservado", así que el aporte se suma solo, sin el paso previo
// de "approve" que pide fundReward() en BscScan.

import { useEffect, useState } from 'react'
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { useQueryClient } from '@tanstack/react-query'
import { erc20Abi, formatUnits, parseUnits } from 'viem'
import { CONTRACTS } from '../config'
import { ConnectCta } from './Bits'
import { fmtUsd, celebrate } from './ui'

const QUICK = ['1', '5', '10', '25']

function errorText(err) {
  const m = `${err?.shortMessage ?? ''} ${err?.message ?? ''}`
  if (/rejected|denied|cancel/i.test(m))            return 'Cancelaste la firma en tu wallet. No se envió nada.'
  if (/exceeds balance|insufficient balance/i.test(m)) return 'No tienes suficiente USDT en esta wallet.'
  if (/insufficient funds|gas/i.test(m))            return 'Te falta BNB para pagar el gas. Basta con unos centavos de dólar en BNB.'
  return 'No se pudo enviar el aporte. Revisa tu wallet e intenta de nuevo.'
}

export default function FundReward() {
  const { address, isConnected } = useAccount()
  const qc = useQueryClient()
  const [text, setText] = useState('5')
  const [sent, setSent] = useState(null)             // cantidad ya confirmada, para el mensaje de gracias

  const { data: balRaw, refetch: refetchBal } = useReadContract({
    address: CONTRACTS.USDT, abi: erc20Abi, functionName: 'balanceOf', args: [address],
    query: { enabled: !!address, refetchInterval: 30_000 },
  })
  const { writeContract, data: txHash, isPending, error, reset } = useWriteContract()
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash: txHash })

  // acepta "5", "5,5" o "5.50"
  const clean = text.replace(',', '.')
  const valid = /^\d+(\.\d{1,6})?$/.test(clean) && Number(clean) > 0
  const amount = valid ? parseUnits(clean, 18) : 0n
  const balance = balRaw ?? 0n
  const tooMuch = isConnected && balRaw !== undefined && amount > balance

  useEffect(() => {
    if (!isSuccess) return
    setSent(clean); celebrate(); refetchBal()
    qc.invalidateQueries()                           // el premio y la barra se actualizan al tiro
  }, [isSuccess])

  function send() {
    writeContract({ address: CONTRACTS.USDT, abi: erc20Abi, functionName: 'transfer', args: [CONTRACTS.SORTEO, amount] })
  }
  function again() { setSent(null); reset() }

  if (sent) {
    return (
      <div className="note note--ok stack" style={{ gap: 8 }}>
        <strong>¡Gracias! Sumaste ${fmtUsd(Number(sent))} USDT al premio.</strong>
        <span className="row" style={{ gap: 16 }}>
          {txHash && <a className="small" href={`https://bscscan.com/tx/${txHash}`} target="_blank" rel="noreferrer">Ver la transacción en BscScan</a>}
          <button className="linkbtn" onClick={again}>Aportar otra vez</button>
        </span>
      </div>
    )
  }

  if (isPending || isConfirming) {
    return (
      <div className="stack" style={{ alignItems: 'center', textAlign: 'center', gap: 10, padding: '8px 0' }} aria-live="polite">
        <div className="spinner" />
        <strong>{isPending ? 'Confirma el aporte en tu wallet' : 'Enviando tu aporte al premio…'}</strong>
        <span className="small muted">{isPending ? `Vas a enviar ${fmtUsd(Number(clean))} USDT al contrato del sorteo.` : 'Suele tardar unos segundos.'}</span>
        {txHash && <a className="small" href={`https://bscscan.com/tx/${txHash}`} target="_blank" rel="noreferrer">Ver en BscScan</a>}
      </div>
    )
  }

  return (
    <div className="fund stack" style={{ gap: 12 }}>
      <label htmlFor="fund-amt" className="small" style={{ fontWeight: 600 }}>Aporta USDT al premio</label>
      <div className="fund__field">
        <span className="fund__cur" aria-hidden="true">$</span>
        <input id="fund-amt" className="input-num" inputMode="decimal" autoComplete="off" placeholder="0"
          value={text} onChange={e => setText(e.target.value.replace(/[^\d.,]/g, '').slice(0, 12))} />
        <span className="fund__unit" aria-hidden="true">USDT</span>
      </div>
      <div className="seg" role="group" aria-label="Cantidades rápidas">
        {QUICK.map(q => (
          <button key={q} type="button" aria-selected={clean === q} onClick={() => setText(q)}>${q}</button>
        ))}
      </div>

      {error && <p className="note note--bad" role="alert">{errorText(error)}</p>}
      {tooMuch && <p className="note note--warn">Tienes ${fmtUsd(Number(formatUnits(balance, 18)))} USDT en esta wallet. Baja la cantidad o carga más USDT (red BSC).</p>}

      {isConnected ? (
        <button className="btn btn--gold btn--block" onClick={send} disabled={!valid || tooMuch}>
          {valid ? `Aportar $${fmtUsd(Number(clean))} USDT al premio` : 'Escribe una cantidad'}
        </button>
      ) : (
        <ConnectCta label="Conectar wallet para aportar" />
      )}
      <p className="tiny" style={{ textAlign: 'center' }}>
        {isConnected && balRaw !== undefined && !tooMuch && `Tienes $${fmtUsd(Number(formatUnits(balance, 18)))} USDT. `}
        Una sola confirmación en tu wallet. El aporte va directo al contrato del sorteo y no se puede devolver.
      </p>
    </div>
  )
}
