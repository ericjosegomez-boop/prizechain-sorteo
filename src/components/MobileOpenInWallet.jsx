// src/components/MobileOpenInWallet.jsx
//
// En un celular, conectar desde Chrome o Safari obliga a saltar a la app de la
// wallet y volver (WalletConnect), y ese salto falla seguido. Lo más simple para
// el usuario es abrir esta misma página DENTRO del navegador de su wallet, donde
// la conexión es inmediata. Este bloque aparece solo en celulares que no tienen
// una wallet inyectada (es decir, cuando NO estamos ya dentro de MetaMask/Trust).

import { useEffect, useState } from 'react'

const isMobileUA = () =>
  typeof navigator !== 'undefined' &&
  /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent)

const hasInjectedWallet = () =>
  typeof window !== 'undefined' && !!window.ethereum

export default function MobileOpenInWallet() {
  const [show, setShow]     = useState(false)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    // Algunas wallets inyectan window.ethereum un instante después de cargar.
    const t = setTimeout(() => setShow(isMobileUA() && !hasInjectedWallet()), 600)
    return () => clearTimeout(t)
  }, [])

  if (!show) return null

  const host     = window.location.host                       // prizechain-sorteo.vercel.app
  const fullUrl  = window.location.origin + window.location.pathname
  const metamask = `https://link.metamask.io/dapp/${host}${window.location.pathname}`
  // coin_id 20000714 = BNB Smart Chain en Trust Wallet
  const trust    = `https://link.trustwallet.com/open_url?coin_id=20000714&url=${encodeURIComponent(fullUrl)}`

  async function copy() {
    try { await navigator.clipboard.writeText(fullUrl); setCopied(true); setTimeout(() => setCopied(false), 2000) }
    catch { window.prompt('Copia este enlace:', fullUrl) }
  }

  return (
    <div style={box}>
      <p style={title}>¿Estás en el celular?</p>
      <p style={text}>
        Abre el sorteo dentro de tu wallet y la conexión es inmediata.
      </p>
      <div style={row}>
        <a href={metamask} style={{ ...btn, background: '#F6851B' }}>Abrir en MetaMask</a>
        <a href={trust}    style={{ ...btn, background: '#3375BB' }}>Abrir en Trust Wallet</a>
      </div>
      <a href="/guia.html" style={{ ...linkBtn, display: 'block' }}>¿Primera vez? Guía paso a paso: crear wallet y comprar PRIZE</a>
      <button onClick={copy} style={linkBtn}>
        {copied ? 'Enlace copiado ✓' : 'Otra wallet: copiar enlace y pegarlo en su navegador'}
      </button>
    </div>
  )
}

const box = {
  marginTop: 16, padding: 16, borderRadius: 12,
  background: '#0A1628', border: '1px solid #0E4D7A', maxWidth: 480,
}
const title   = { fontSize: 14, fontWeight: 700, color: '#F0F9FF', margin: '0 0 4px' }
const text    = { fontSize: 13, color: '#94A3B8', margin: '0 0 12px', lineHeight: 1.5 }
const row     = { display: 'flex', gap: 10, flexWrap: 'wrap' }
const btn     = {
  flex: '1 1 150px', textAlign: 'center', padding: '12px 14px', borderRadius: 10,
  color: '#fff', fontWeight: 700, fontSize: 14, textDecoration: 'none',
}
const linkBtn = {
  marginTop: 10, background: 'none', border: 'none', padding: 0,
  color: '#00D4FF', fontSize: 12, cursor: 'pointer', textDecoration: 'underline',
}
