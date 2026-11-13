// src/components/MobileOpenInWallet.jsx
//
// En un celular, conectar desde Chrome o Safari obliga a saltar a la app de la
// wallet y volver (WalletConnect), y ese salto falla seguido. Lo más simple es
// abrir esta misma página DENTRO del navegador de la wallet, donde la conexión
// es inmediata. Este bloque aparece solo en celulares sin wallet inyectada
// (es decir, cuando NO estamos ya dentro de MetaMask o Trust Wallet).

import { useEffect, useState } from 'react'

const isMobileUA = () =>
  typeof navigator !== 'undefined' && /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent)
const hasInjectedWallet = () => typeof window !== 'undefined' && !!window.ethereum

export default function MobileOpenInWallet() {
  const [show, setShow]     = useState(false)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    // Algunas wallets inyectan window.ethereum un instante después de cargar.
    const t = setTimeout(() => setShow(isMobileUA() && !hasInjectedWallet()), 600)
    return () => clearTimeout(t)
  }, [])

  if (!show) return null

  const host     = window.location.host
  const fullUrl  = window.location.origin + window.location.pathname
  const metamask = `https://link.metamask.io/dapp/${host}${window.location.pathname}`
  // coin_id 20000714 = BNB Smart Chain en Trust Wallet
  const trust    = `https://link.trustwallet.com/open_url?coin_id=20000714&url=${encodeURIComponent(fullUrl)}`

  async function copy() {
    try { await navigator.clipboard.writeText(fullUrl); setCopied(true); setTimeout(() => setCopied(false), 2000) }
    catch { window.prompt('Copia este enlace:', fullUrl) }
  }

  return (
    <div className="panel stack mobile-open" style={{ gap: 12 }}>
      <div>
        <p className="h3">¿Estás en el celular?</p>
        <p className="small muted">Abre el sorteo dentro de tu wallet y la conexión es inmediata.</p>
      </div>
      <div className="row" style={{ gap: 10 }}>
        <a href={metamask} className="btn wallet-btn wallet-btn--mm">Abrir en MetaMask</a>
        <a href={trust} className="btn wallet-btn wallet-btn--tw">Abrir en Trust Wallet</a>
      </div>
      <button className="linkbtn" onClick={copy} style={{ alignSelf: 'flex-start' }}>
        {copied ? 'Enlace copiado' : 'Otra wallet: copiar el enlace para pegarlo en su navegador'}
      </button>
    </div>
  )
}
