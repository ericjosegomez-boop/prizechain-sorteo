// src/App.jsx
import { ConnectButton } from '@rainbow-me/rainbowkit'
import { useAccount } from 'wagmi'
import Dashboard from './components/Dashboard'

export default function App() {
  const { isConnected } = useAccount()

  return (
    <div style={{ maxWidth: 520, margin: '0 auto', padding: '0 16px 60px' }}>

      {/* ── Navbar ── */}
      <nav style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '16px 0', marginBottom: 24,
        borderBottom: '0.5px solid #4C1D95',
      }}>
        {/* Logo + nombre */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <img
            src="/logo.png"
            alt="PRIZECHAIN"
            style={{
              width: 32, height: 32,
              borderRadius: '50%',
              objectFit: 'cover',
              border: '1.5px solid #3d2800',
            }}
          />
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 1 }}>
            <span style={{ fontSize: 18, fontWeight: 600, color: '#A855F7' }}>PRIZE</span>
            <span style={{ fontSize: 18, fontWeight: 600, color: '#F3F0FF' }}>CHAIN</span>
            <span style={{ fontSize: 11, color: '#6B7280', marginLeft: 6, fontWeight: 400 }}>Sorteo</span>
          </div>
        </div>

        {/* Botón de wallet */}
        <ConnectButton
          chainStatus="icon"
          showBalance={false}
          label="Conectar Wallet"
        />
      </nav>

      {/* ── Contenido ── */}
      {isConnected ? <Dashboard /> : <Welcome />}
    </div>
  )
}

function Welcome() {
  return (
    <div style={{ textAlign: 'center', padding: '48px 16px' }}>
      <img
        src="/logo.png"
        alt="PRIZECHAIN"
        style={{
          width: 80, height: 80,
          borderRadius: '50%',
          objectFit: 'cover',
          border: '2px solid #3d2800',
          margin: '0 auto 20px',
          display: 'block',
        }}
      />
      <h1 style={{ fontSize: 24, fontWeight: 600, marginBottom: 10, color: '#F3F0FF' }}>
        Sorteo semanal de PRIZECHAIN
      </h1>
      <p style={{ fontSize: 14, color: '#9CA3AF', lineHeight: 1.7, marginBottom: 28, maxWidth: 380, margin: '0 auto 28px' }}>
        Conecta tu wallet para ver cuántos boletos tienes y registrarte en el sorteo
        con un solo clic. El premio se paga automáticamente en USDT.
      </p>
      <div style={{ display: 'flex', justifyContent: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 20 }}>
        {[
          { icon: '🎫', text: 'Boletos automáticos' },
          { icon: '🔒', text: 'Tus PRIZE no se mueven' },
          { icon: '⚡', text: 'Un solo clic' },
        ].map(item => (
          <div key={item.text} style={{
            background: '#2D1B4E', border: '0.5px solid #4C1D95',
            borderRadius: 8, padding: '8px 14px',
            fontSize: 13, color: '#C4BCFC',
            display: 'flex', alignItems: 'center', gap: 6,
          }}>
            <span style={{ fontSize: 16 }}>{item.icon}</span>
            {item.text}
          </div>
        ))}
      </div>
      <p style={{ fontSize: 12, color: '#6B7280' }}>
        BSC Mainnet · Compatible con MetaMask y Trust Wallet
      </p>
    </div>
  )
}
