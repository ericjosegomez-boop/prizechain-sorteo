// src/components/RegisterButton.jsx
import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { useEffect } from 'react'
import { CONTRACTS, SORTEO_ABI } from '../config'
import { formatUnits } from 'viem'

export default function RegisterButton({
  canRegister, isRegistered, tickets, registeredTickets,
  roundStatus, isPaused, prizeBalance, ticketSize, onSuccess,
}) {
  const { writeContract, data: txHash, isPending, error: writeError } = useWriteContract()

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash: txHash })

  useEffect(() => {
    if (isSuccess) { onSuccess() }
  }, [isSuccess])

  function handleRegister() {
    writeContract({
      address:      CONTRACTS.SORTEO,
      abi:          SORTEO_ABI,
      functionName: 'register',
    })
  }

  // Ya registrado
  if (isRegistered) {
    return (
      <div>
        <div style={{ background: '#0A1F12', border: '0.5px solid #27500A', borderRadius: 10, padding: '12px 16px', marginBottom: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <span style={{ fontSize: 16 }}>✅</span>
            <span style={{ fontSize: 14, fontWeight: 500, color: '#6BCB8B' }}>
              Registrado con {registeredTickets} boleto{registeredTickets !== 1 ? 's' : ''}
            </span>
          </div>
          <p style={{ fontSize: 12, color: '#9CA3AF', lineHeight: 1.6 }}>
            Mantén tus PRIZE en esta wallet hasta el sorteo. Si los vendes antes, perderás la elegibilidad.
          </p>
        </div>
        <button disabled style={btnStyle('disabled')}>
          Ya estás registrado en esta ronda
        </button>
      </div>
    )
  }

  // Token pausado
  if (isPaused) {
    return (
      <div>
        <div style={warnBox}>El token PRIZE está en pausa de emergencia. El registro estará disponible cuando el equipo reactive el token.</div>
        <button disabled style={btnStyle('disabled')}>Registro no disponible</button>
      </div>
    )
  }

  // Registro cerrado
  if (roundStatus !== 1) {
    return (
      <div>
        <div style={infoBox}>El período de registro está cerrado. Vuelve en la próxima ronda.</div>
        <button disabled style={btnStyle('disabled')}>Registro cerrado</button>
      </div>
    )
  }

  // Sin suficiente PRIZE
  if (tickets === 0) {
    const bal = prizeBalance ? Number(formatUnits(prizeBalance, 18)) : 0
    const sz  = ticketSize   ? Number(formatUnits(ticketSize, 18))   : 800
    return (
      <div>
        <div style={warnBox}>
          Necesitas al menos {sz.toLocaleString('es', { maximumFractionDigits: 0 })} PRIZE para participar.
          {bal > 0 && ` Te faltan ${Math.ceil(sz - bal).toLocaleString('es', { maximumFractionDigits: 0 })} PRIZE.`}
        </div>
        <a
          href="https://pancakeswap.finance/swap"
          target="_blank"
          rel="noreferrer"
          style={{
            display: 'block', width: '100%', padding: 14,
            background: '#2D1B4E', border: '0.5px solid #4C1D95',
            borderRadius: 10, fontSize: 15, fontWeight: 500,
            color: '#A855F7', textAlign: 'center', textDecoration: 'none',
          }}
        >
          Comprar PRIZE en PancakeSwap ↗
        </a>
      </div>
    )
  }

  // Transacción en curso
  if (isPending || isConfirming) {
    return (
      <div style={{ background: '#2D1B4E', border: '0.5px solid #4C1D95', borderRadius: 10, padding: 20, textAlign: 'center' }}>
        <div style={{ width: 32, height: 32, border: '3px solid #4C1D95', borderTopColor: '#A855F7', borderRadius: '50%', animation: 'spin .8s linear infinite', margin: '0 auto 12px' }} />
        <p style={{ fontSize: 14, fontWeight: 500, color: '#F3F0FF', marginBottom: 6 }}>
          {isPending ? 'Confirma en tu wallet...' : 'Confirmando transacción...'}
        </p>
        <p style={{ fontSize: 12, color: '#9CA3AF' }}>
          {isPending ? 'Revisa MetaMask o Trust Wallet' : 'Esperando confirmación en BSC'}
        </p>
        {txHash && (
          <a href={`https://bscscan.com/tx/${txHash}`} target="_blank" rel="noreferrer"
            style={{ fontSize: 11, color: '#A855F7', display: 'block', marginTop: 8 }}>
            Ver en BscScan ↗
          </a>
        )}
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    )
  }

  // Éxito
  if (isSuccess) {
    return (
      <div style={{ background: '#0A1F12', border: '0.5px solid #27500A', borderRadius: 10, padding: 20, textAlign: 'center' }}>
        <div style={{ fontSize: 32, marginBottom: 8 }}>🎉</div>
        <p style={{ fontSize: 15, fontWeight: 500, color: '#6BCB8B', marginBottom: 6 }}>¡Registrado con éxito!</p>
        <p style={{ fontSize: 12, color: '#9CA3AF', marginBottom: 10 }}>
          Tus {tickets} boleto{tickets !== 1 ? 's' : ''} están en el pool.
        </p>
        {txHash && (
          <a href={`https://bscscan.com/tx/${txHash}`} target="_blank" rel="noreferrer"
            style={{ fontSize: 12, color: '#A855F7' }}>
            Ver transacción en BscScan ↗
          </a>
        )}
      </div>
    )
  }

  // Error
  if (writeError) {
    const msg = writeError.message?.includes('Already registered')
      ? 'Ya estás registrado en esta ronda.'
      : writeError.message?.includes('Registration closed')
      ? 'El registro ya cerró para esta ronda.'
      : writeError.message?.includes('Insufficient')
      ? 'Saldo de PRIZE insuficiente.'
      : 'Hubo un error. Intenta de nuevo.'

    return (
      <div>
        <div style={{ ...warnBox, marginBottom: 10 }}>{msg}</div>
        <button onClick={handleRegister} style={btnStyle('primary')}>
          Intentar de nuevo
        </button>
      </div>
    )
  }

  // Listo para registrarse
  return (
    <div>
      <div style={{ background: '#1E0A3C', border: '0.5px solid #534AB7', borderRadius: 8, padding: '10px 14px', fontSize: 12, color: '#C4BCFC', marginBottom: 10, lineHeight: 1.6 }}>
        Con {tickets} boleto{tickets !== 1 ? 's' : ''} tu probabilidad actual es del {
          tickets > 0 ? ((tickets / (tickets + 143)) * 100).toFixed(1) : '0'
        }%. Tus PRIZE no se moverán de tu wallet.
      </div>
      <button onClick={handleRegister} style={btnStyle('primary')}>
        Registrarme con {tickets} boleto{tickets !== 1 ? 's' : ''}
      </button>
      <p style={{ fontSize: 11, color: '#6B7280', textAlign: 'center', marginTop: 8 }}>
        Solo pagas gas de BSC (~0.001 BNB · ~$0.50 USD)
      </p>
    </div>
  )
}

const warnBox = {
  background: '#2A1800', border: '0.5px solid #854F0B',
  borderRadius: 8, padding: '10px 14px',
  fontSize: 12, color: '#FDE68A', lineHeight: 1.6, marginBottom: 10,
}

const infoBox = {
  background: '#1E0A3C', border: '0.5px solid #534AB7',
  borderRadius: 8, padding: '10px 14px',
  fontSize: 12, color: '#C4BCFC', lineHeight: 1.6, marginBottom: 10,
}

function btnStyle(variant) {
  const base = {
    width: '100%', padding: '14px', borderRadius: 10,
    fontSize: 15, fontWeight: 500, border: 'none',
    transition: 'opacity .2s',
  }
  if (variant === 'primary')  return { ...base, background: '#A855F7', color: '#fff', cursor: 'pointer' }
  if (variant === 'disabled') return { ...base, background: '#2D1B4E', color: '#6B7280', cursor: 'not-allowed', border: '0.5px solid #4C1D95' }
  return base
}
