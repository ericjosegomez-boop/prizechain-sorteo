// src/App.jsx
import { ConnectButton } from '@rainbow-me/rainbowkit'
import { useAccount, useReadContract } from 'wagmi'
import { formatUnits } from 'viem'
import { useState } from 'react'
import Dashboard from './components/Dashboard'
import MobileOpenInWallet from './components/MobileOpenInWallet'
import { CONTRACTS, SORTEO_ABI } from './config'

const C = {
  bg:'#050D1A',bgCard:'#0A1628',bgCard2:'#0D1E35',
  border:'#1B3A5C',border2:'#0E4D7A',
  cyan:'#00D4FF',cyanDim:'#0EA5C9',
  gold:'#F59E0B',white:'#F0F9FF',gray:'#64748B',grayLt:'#94A3B8',
  green:'#10B981',
}

const FAQ_ES=[
  {q:'¿Necesito comprar boletos?',a:'No. Los boletos se calculan automáticamente según cuántos tokens PRIZE tienes. Cada boleto equivale al 0.1% del supply circulante (hoy unos 760 PRIZE), hasta un máximo de 50.'},
  {q:'¿Se mueven mis tokens PRIZE?',a:'No. El contrato solo lee tu balance. Nunca transfiere ni bloquea tus tokens. Siguen siendo tuyos en todo momento.'},
  {q:'¿Cómo sé que el sorteo es justo?',a:'El ganador lo elige Chainlink VRF — un servicio externo de números aleatorios criptográficamente verificables. Nadie puede manipular el resultado.'},
  {q:'¿Cómo recibo el premio si gano?',a:'Automáticamente. El contrato transfiere el USDT directamente a tu wallet en el mismo instante del sorteo. No hay que reclamar nada.'},
  {q:'¿Qué pasa si nadie gana?',a:'El USDT no desaparece. Se suma al premio de la siguiente ronda, haciendo el próximo sorteo más grande.'},
  {q:'¿Cada cuánto hay sorteo?',a:'Cada 7 días. Cualquier persona puede ejecutarlo cuando llega la hora pagando solo el gas de BSC (centavos de dólar).'},
  {q:'¿Qué wallet puedo usar?',a:'Cualquier wallet compatible con BSC Mainnet: MetaMask, Trust Wallet, Coinbase Wallet, y más. En el celular, abre esta página desde el navegador interno de tu wallet: la conexión es inmediata.'},
  {q:'¿Cuánto cuesta registrarme?',a:'Solo el gas de BSC — aproximadamente $0.01 USD.'},
]
const FAQ_EN=[
  {q:'Do I need to buy tickets?',a:'No. Tickets are calculated automatically based on how many PRIZE tokens you hold. Each ticket equals 0.1% of the circulating supply (about 760 PRIZE today), up to a maximum of 50.'},
  {q:'Do my PRIZE tokens move?',a:'No. The contract only reads your balance. It never transfers or locks your tokens. They remain yours at all times.'},
  {q:'How do I know the draw is fair?',a:'The winner is chosen by Chainlink VRF — an external service providing cryptographically verifiable random numbers. Nobody can manipulate the result.'},
  {q:'How do I receive the prize if I win?',a:'Automatically. The contract transfers USDT directly to your wallet the moment the draw occurs. There is nothing to claim.'},
  {q:'What happens if nobody wins?',a:'The USDT does not disappear. It is added to the next round prize, making the next draw larger.'},
  {q:'How often is the draw?',a:'Every 7 days. Anyone can execute it when the time comes by paying only BSC gas (cents of a dollar).'},
  {q:'Which wallet can I use?',a:'Any wallet compatible with BSC Mainnet: MetaMask, Trust Wallet, Coinbase Wallet, and more. On mobile, open this page from your wallet\'s built-in browser: it connects instantly.'},
  {q:'How much does it cost to register?',a:'Only BSC gas — approximately $0.01 USD.'},
]
const STEPS_ES=[
  {n:'01',title:'Compra PRIZE',desc:'Consigue tokens PRIZE en PancakeSwap usando BNB.'},
  {n:'02',title:'Conecta tu wallet',desc:'Haz clic en "Conectar Wallet" y acepta la conexión.'},
  {n:'03',title:'Regístrate',desc:'Un clic en "Registrarme". Tus boletos se asignan automáticamente.'},
  {n:'04',title:'Espera el sorteo',desc:'Cada 7 días. El USDT llega solo a tu wallet si ganas.'},
]
const STEPS_EN=[
  {n:'01',title:'Buy PRIZE',desc:'Get PRIZE tokens on PancakeSwap using BNB.'},
  {n:'02',title:'Connect wallet',desc:'Click "Connect Wallet" and accept the connection.'},
  {n:'03',title:'Register',desc:'One click on "Register". Your tickets are assigned automatically.'},
  {n:'04',title:'Wait for the draw',desc:'Every 7 days. USDT arrives automatically to your wallet if you win.'},
]

export default function App() {
  const { isConnected } = useAccount()
  return (
    <div style={{background:C.bg,minHeight:'100vh',color:C.white,fontFamily:'-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif'}}>
      <style>{`
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes glow{0%,100%{opacity:1}50%{opacity:.6}}
        @keyframes fadeIn{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:none}}
        *{box-sizing:border-box}
        button{cursor:pointer}
        ::-webkit-scrollbar{width:6px}
        ::-webkit-scrollbar-track{background:#050D1A}
        ::-webkit-scrollbar-thumb{background:#1B3A5C;border-radius:3px}
        a{color:#00D4FF;text-decoration:none}
        a:hover{text-decoration:underline}
        @media(max-width:900px){
          .hero-grid{grid-template-columns:1fr !important}
          .connected-grid{grid-template-columns:1fr !important}
          .steps-grid{grid-template-columns:1fr 1fr !important}
          .winners-grid{grid-template-columns:1fr !important}
        }
        @media(max-width:600px){
          .hero-title{font-size:32px !important}
          .steps-grid{grid-template-columns:1fr !important}
        }
      `}</style>
      <Navbar />
      {isConnected ? <ConnectedLayout /> : <LandingPage />}
      <Footer />
    </div>
  )
}

function LiveBadge() {
  const {data:reward}=useReadContract({address:CONTRACTS.SORTEO,abi:SORTEO_ABI,functionName:'currentAvailableReward',query:{refetchInterval:15000}})
  const usdt=reward?Number(formatUnits(reward,18)).toFixed(2):'—'
  return (
    <div style={{display:'flex',alignItems:'center',gap:6,background:C.bgCard,border:`1px solid ${C.border2}`,borderRadius:20,padding:'6px 14px'}}>
      <span style={{width:7,height:7,borderRadius:'50%',background:C.green,display:'inline-block',animation:'glow 2s ease-in-out infinite'}}/>
      <span style={{fontSize:13,color:C.grayLt}}>Premio:</span>
      <span style={{fontSize:13,fontWeight:700,color:C.gold}}>${usdt} USDT</span>
    </div>
  )
}

function Navbar() {
  return (
    <nav style={{borderBottom:`1px solid ${C.border}`,background:'rgba(5,13,26,.97)',backdropFilter:'blur(10px)',position:'sticky',top:0,zIndex:100}}>
      <div style={{maxWidth:1200,margin:'0 auto',padding:'0 24px',display:'flex',alignItems:'center',justifyContent:'space-between',height:64,gap:12,flexWrap:'wrap'}}>
        <div style={{display:'flex',alignItems:'center',gap:10}}>
          <img src="/logo.png" alt="PRIZECHAIN" style={{width:36,height:36,borderRadius:'50%',objectFit:'cover',border:`2px solid ${C.gold}`}}/>
          <div style={{display:'flex',alignItems:'baseline',gap:2}}>
            <span style={{fontSize:20,fontWeight:700,color:C.cyan}}>PRIZE</span>
            <span style={{fontSize:20,fontWeight:700,color:C.white}}>CHAIN</span>
            <span style={{fontSize:11,color:C.gray,marginLeft:8,background:C.bgCard,border:`1px solid ${C.border}`,borderRadius:4,padding:'1px 7px'}}>Sorteo</span>
          </div>
        </div>
        <div style={{display:'flex',alignItems:'center',gap:12,flexWrap:'wrap'}}>
          <LiveBadge/>
          <ConnectButton chainStatus="icon" showBalance={false} label="Conectar Wallet"/>
        </div>
      </div>
    </nav>
  )
}

function ConnectedLayout() {
  return (
    <div style={{maxWidth:1200,margin:'0 auto',padding:'32px 24px 60px'}}>
      <div className="connected-grid" style={{display:'grid',gridTemplateColumns:'minmax(0,1fr) minmax(0,420px)',gap:28,alignItems:'start'}}>
        <div style={{display:'flex',flexDirection:'column',gap:20}}>
          <WinnerHighlight/>
          <HowItWorksCompact/>
        </div>
        <div style={{background:C.bgCard,border:`1px solid ${C.border}`,borderRadius:16,padding:24,animation:'fadeIn .4s ease'}}>
          <Dashboard/>
        </div>
      </div>
    </div>
  )
}

function WinnerHighlight() {
  const {data:upcomingId}=useReadContract({address:CONTRACTS.SORTEO,abi:SORTEO_ABI,functionName:'upcomingRoundId'})
  const prevId=upcomingId&&upcomingId>1n?upcomingId-1n:null
  const {data:prevRound}=useReadContract({address:CONTRACTS.SORTEO,abi:SORTEO_ABI,functionName:'rounds',args:[prevId],query:{enabled:!!prevId}})
  const hasWinner=prevRound&&prevRound[8]&&prevRound[8]!=='0x0000000000000000000000000000000000000000'
  const winner=hasWinner?prevRound[8]:null
  const prize=hasWinner?Number(formatUnits(prevRound[6],18)).toFixed(2):null
  const roundNum=prevId?prevId.toString():null
  return (
    <div style={{background:C.bgCard,border:`1px solid ${hasWinner?C.gold:C.border}`,borderRadius:16,padding:24,animation:'fadeIn .4s ease'}}>
      {hasWinner?(
        <>
          <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:16}}>
            <span style={{fontSize:24}}>🏆</span>
            <div>
              <p style={{fontSize:11,color:C.gold,fontWeight:600,letterSpacing:1,textTransform:'uppercase',marginBottom:2}}>Último ganador — Ronda #{roundNum}</p>
              <p style={{fontSize:13,color:C.grayLt}}>Premio pagado automáticamente en USDT</p>
            </div>
          </div>
          <div style={{background:'rgba(245,158,11,.08)',border:`1px solid rgba(245,158,11,.3)`,borderRadius:12,padding:'16px 20px',display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:12}}>
            <div>
              <p style={{fontSize:11,color:C.gray,marginBottom:4}}>Wallet ganadora</p>
              <p style={{fontSize:14,fontWeight:600,color:C.white,fontFamily:'monospace'}}>{winner.slice(0,8)}...{winner.slice(-6)}</p>
            </div>
            <div style={{textAlign:'right'}}>
              <p style={{fontSize:11,color:C.gray,marginBottom:4}}>Premio recibido</p>
              <p style={{fontSize:32,fontWeight:700,color:C.gold}}>${prize} <span style={{fontSize:14}}>USDT</span></p>
            </div>
          </div>
        </>
      ):(
        <>
          <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:10}}>
            <span style={{fontSize:20}}>🎯</span>
            <p style={{fontSize:14,fontWeight:600,color:C.cyan}}>Sin ganador aún — el premio se acumula</p>
          </div>
          <p style={{fontSize:13,color:C.grayLt,lineHeight:1.6}}>{prevRound&&Number(prevRound[0])===5?'La ronda anterior no tuvo boletos. El USDT sigue en el premio actual.':'Nadie mantuvo sus PRIZE hasta el sorteo anterior. El USDT se suma al premio actual.'}</p>
        </>
      )}
    </div>
  )
}

function HowItWorksCompact() {
  return (
    <div style={{background:C.bgCard,border:`1px solid ${C.border}`,borderRadius:16,padding:24}}>
      <p style={{fontSize:11,color:C.cyan,fontWeight:600,letterSpacing:1,textTransform:'uppercase',marginBottom:16}}>Cómo participar</p>
      <div className="steps-grid" style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
        {STEPS_ES.map(s=>(
          <div key={s.n} style={{background:C.bgCard2,border:`1px solid ${C.border}`,borderRadius:10,padding:14}}>
            <div style={{fontSize:11,fontWeight:700,color:C.cyan,marginBottom:6}}>{s.n}</div>
            <div style={{fontSize:14,fontWeight:600,color:C.white,marginBottom:4}}>{s.title}</div>
            <div style={{fontSize:12,color:C.grayLt,lineHeight:1.5}}>{s.desc}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

function LandingPage() {
  const [faqLang,setFaqLang]=useState('es')
  const [openFaq,setOpenFaq]=useState(null)
  const faqs=faqLang==='es'?FAQ_ES:FAQ_EN
  const {data:reward}=useReadContract({address:CONTRACTS.SORTEO,abi:SORTEO_ABI,functionName:'currentAvailableReward',query:{refetchInterval:15000}})
  const usdt=reward?Number(formatUnits(reward,18)).toFixed(2):'—'

  return (
    <div>
      {/* Hero */}
      <section style={{maxWidth:1200,margin:'0 auto',padding:'80px 24px 60px'}}>
        <div className="hero-grid" style={{display:'grid',gridTemplateColumns:'minmax(0,1fr) minmax(0,460px)',gap:48,alignItems:'center'}}>
          <div style={{animation:'fadeIn .5s ease'}}>
            <div style={{display:'inline-flex',alignItems:'center',gap:8,background:C.bgCard,border:`1px solid ${C.border2}`,borderRadius:20,padding:'6px 16px',marginBottom:24}}>
              <span style={{width:8,height:8,borderRadius:'50%',background:C.green,display:'inline-block'}}/>
              <span style={{fontSize:12,color:C.grayLt}}>BSC Mainnet · Chainlink VRF · Sin custodia</span>
            </div>
            <h1 className="hero-title" style={{fontSize:52,fontWeight:800,lineHeight:1.1,marginBottom:20,color:C.white}}>
              El sorteo semanal de <span style={{color:C.cyan}}>PRIZECHAIN</span>
            </h1>
            <p style={{fontSize:17,color:C.grayLt,lineHeight:1.7,marginBottom:32,maxWidth:480}}>
              Holders de PRIZE participan automáticamente. Sin comprar boletos. El premio en USDT llega directo a tu wallet si ganas.
            </p>
            <div style={{marginTop:-16,marginBottom:28}}><MobileOpenInWallet/></div>
            <div style={{display:'flex',alignItems:'center',gap:20,flexWrap:'wrap',marginBottom:40}}>
              <div style={{background:`linear-gradient(135deg,${C.cyanDim},${C.cyan})`,borderRadius:14,padding:'18px 28px',textAlign:'center',minWidth:140}}>
                <p style={{fontSize:11,color:'rgba(0,0,0,.6)',fontWeight:600,marginBottom:4}}>PREMIO ACTUAL</p>
                <p style={{fontSize:38,fontWeight:800,color:'#050D1A',lineHeight:1}}>${usdt}</p>
                <p style={{fontSize:12,color:'rgba(0,0,0,.5)',marginTop:2}}>USDT</p>
              </div>
              <div>
                {[{i:'🎫',t:'Boletos automáticos'},{i:'🔒',t:'Tus PRIZE no se mueven'},{i:'⚡',t:'Pago automático al ganador'}].map(f=>(
                  <div key={f.t} style={{display:'flex',alignItems:'center',gap:10,marginBottom:12}}>
                    <span style={{width:32,height:32,borderRadius:'50%',background:C.bgCard,border:`1px solid ${C.border}`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:15}}>{f.i}</span>
                    <span style={{fontSize:14,color:C.grayLt}}>{f.t}</span>
                  </div>
                ))}
              </div>
            </div>
            <ConnectButton chainStatus="icon" showBalance={false} label="Conectar Wallet y ver mis boletos"/>
          </div>
          <div style={{background:C.bgCard,border:`1px solid ${C.border}`,borderRadius:20,padding:28,animation:'fadeIn .7s ease'}}>
            <p style={{fontSize:11,color:C.cyan,fontWeight:600,letterSpacing:1,textTransform:'uppercase',marginBottom:20}}>Cómo funciona</p>
            {STEPS_ES.map((s,i)=>(
              <div key={s.n} style={{display:'flex',gap:16,paddingBottom:i<STEPS_ES.length-1?20:0,marginBottom:i<STEPS_ES.length-1?20:0,borderBottom:i<STEPS_ES.length-1?`1px solid ${C.border}`:'none'}}>
                <div style={{width:40,height:40,borderRadius:10,background:'rgba(0,212,255,.1)',border:`1px solid ${C.border2}`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:13,fontWeight:700,color:C.cyan,flexShrink:0}}>{s.n}</div>
                <div>
                  <p style={{fontSize:14,fontWeight:600,color:C.white,marginBottom:4}}>{s.title}</p>
                  <p style={{fontSize:13,color:C.grayLt,lineHeight:1.5}}>{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Video Tutorial */}
      <section style={{background:C.bgCard,borderTop:`1px solid ${C.border}`,borderBottom:`1px solid ${C.border}`}}>
        <div style={{maxWidth:1200,margin:'0 auto',padding:'60px 24px'}}>
          <div style={{textAlign:'center',marginBottom:40}}>
            <p style={{fontSize:11,color:C.cyan,fontWeight:600,letterSpacing:1,textTransform:'uppercase',marginBottom:10}}>Tutorial</p>
            <h2 style={{fontSize:32,fontWeight:700,color:C.white,marginBottom:12}}>Aprende a participar en 2 minutos</h2>
            <p style={{fontSize:15,color:C.grayLt}}>Mira el video y sigue los pasos. Es más fácil de lo que parece.</p>
          </div>
          <div style={{maxWidth:760,margin:'0 auto',background:C.bgCard2,border:`1px solid ${C.border}`,borderRadius:16,overflow:'hidden',aspectRatio:'16/9',display:'flex',alignItems:'center',justifyContent:'center',flexDirection:'column',gap:16}}>
            <div style={{width:72,height:72,borderRadius:'50%',background:'rgba(0,212,255,.12)',border:`2px solid ${C.cyan}`,display:'flex',alignItems:'center',justifyContent:'center'}}>
              <div style={{width:0,height:0,borderTop:'14px solid transparent',borderBottom:'14px solid transparent',borderLeft:`24px solid ${C.cyan}`,marginLeft:6}}/>
            </div>
            <p style={{fontSize:14,color:C.gray}}>Video tutorial próximamente</p>
            <p style={{fontSize:12,color:C.gray,opacity:.6}}>Agrega tu URL de YouTube en App.jsx para activarlo</p>
          </div>
        </div>
      </section>

      {/* Últimos ganadores */}
      <section style={{maxWidth:1200,margin:'0 auto',padding:'60px 24px'}}>
        <div style={{textAlign:'center',marginBottom:40}}>
          <p style={{fontSize:11,color:C.gold,fontWeight:600,letterSpacing:1,textTransform:'uppercase',marginBottom:10}}>Historial</p>
          <h2 style={{fontSize:32,fontWeight:700,color:C.white}}>Últimos ganadores</h2>
        </div>
        <LastWinnersSection/>
      </section>

      {/* FAQ */}
      <section style={{background:C.bgCard,borderTop:`1px solid ${C.border}`}}>
        <div style={{maxWidth:800,margin:'0 auto',padding:'60px 24px'}}>
          <div style={{textAlign:'center',marginBottom:40}}>
            <p style={{fontSize:11,color:C.cyan,fontWeight:600,letterSpacing:1,textTransform:'uppercase',marginBottom:10}}>FAQ</p>
            <h2 style={{fontSize:32,fontWeight:700,color:C.white,marginBottom:20}}>Preguntas frecuentes</h2>
            <div style={{display:'inline-flex',background:C.bgCard2,border:`1px solid ${C.border}`,borderRadius:8,padding:3}}>
              {['es','en'].map(l=>(
                <button key={l} onClick={()=>{setFaqLang(l);setOpenFaq(null)}} style={{padding:'6px 20px',borderRadius:6,border:'none',fontSize:13,fontWeight:500,background:faqLang===l?C.cyanDim:'transparent',color:faqLang===l?C.white:C.gray,transition:'all .2s'}}>
                  {l==='es'?'🇪🇸 Español':'🇺🇸 English'}
                </button>
              ))}
            </div>
          </div>
          <div style={{display:'flex',flexDirection:'column',gap:8}}>
            {faqs.map((f,i)=>(
              <div key={i} style={{background:C.bgCard2,border:`1px solid ${openFaq===i?C.border2:C.border}`,borderRadius:12,overflow:'hidden',transition:'border-color .2s'}}>
                <button onClick={()=>setOpenFaq(openFaq===i?null:i)} style={{width:'100%',padding:'16px 20px',background:'none',border:'none',display:'flex',alignItems:'center',justifyContent:'space-between',gap:12,textAlign:'left'}}>
                  <span style={{fontSize:15,fontWeight:500,color:C.white}}>{f.q}</span>
                  <span style={{fontSize:20,color:C.cyan,flexShrink:0,transform:openFaq===i?'rotate(45deg)':'none',transition:'transform .2s',display:'inline-block'}}>+</span>
                </button>
                {openFaq===i&&(
                  <div style={{padding:'0 20px 16px',borderTop:`1px solid ${C.border}`,paddingTop:14,fontSize:14,color:C.grayLt,lineHeight:1.7}}>{f.a}</div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}

function LastWinnersSection() {
  const {data:upcomingId}=useReadContract({address:CONTRACTS.SORTEO,abi:SORTEO_ABI,functionName:'upcomingRoundId'})
  const roundsToCheck=upcomingId?Array.from({length:Math.min(3,Number(upcomingId)-1)},(_,i)=>upcomingId-BigInt(i+1)):[]
  if(!upcomingId||Number(upcomingId)<=1){
    return (
      <div style={{textAlign:'center',background:C.bgCard,border:`1px solid ${C.border}`,borderRadius:16,padding:48}}>
        <span style={{fontSize:40,display:'block',marginBottom:12}}>🎯</span>
        <p style={{fontSize:16,color:C.grayLt}}>El primer sorteo aún no ha ocurrido.</p>
        <p style={{fontSize:14,color:C.gray,marginTop:6}}>¡Sé el primero en participar!</p>
      </div>
    )
  }
  return (
    <div className="winners-grid" style={{display:'grid',gridTemplateColumns:'repeat(3,minmax(0,1fr))',gap:16}}>
      {roundsToCheck.map(rid=><RoundCard key={rid.toString()} roundId={rid}/>)}
    </div>
  )
}

function RoundCard({roundId}) {
  const {data:round}=useReadContract({address:CONTRACTS.SORTEO,abi:SORTEO_ABI,functionName:'rounds',args:[roundId]})
  if(!round)return null
  const winner=round[8]
  const hasWinner=winner&&winner!=='0x0000000000000000000000000000000000000000'
  const prize=Number(formatUnits(round[6],18)).toFixed(2)
  return (
    <div style={{background:C.bgCard,border:`1px solid ${hasWinner?'rgba(245,158,11,.5)':C.border}`,borderRadius:14,padding:22}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:14}}>
        <p style={{fontSize:12,color:C.gray}}>Ronda #{roundId.toString()}</p>
        <span style={{fontSize:11,padding:'2px 10px',borderRadius:20,background:hasWinner?'rgba(16,185,129,.15)':'rgba(100,116,139,.15)',color:hasWinner?C.green:C.gray}}>
          {hasWinner?'✓ Ganador':Number(round[0])===5?'Sin boletos':'Sin ganador'}
        </span>
      </div>
      {hasWinner?(
        <>
          <p style={{fontSize:11,color:C.gray,marginBottom:4}}>Wallet ganadora</p>
          <p style={{fontSize:13,fontWeight:600,color:C.white,fontFamily:'monospace',marginBottom:14}}>{winner.slice(0,8)}...{winner.slice(-6)}</p>
          <p style={{fontSize:30,fontWeight:700,color:C.gold}}>${prize} <span style={{fontSize:13,color:C.gray}}>USDT</span></p>
        </>
      ):(
        <p style={{fontSize:14,color:C.grayLt,lineHeight:1.6}}>Premio acumulado para la siguiente ronda.</p>
      )}
    </div>
  )
}

function Footer() {
  return (
    <footer style={{borderTop:`1px solid ${C.border}`,padding:'28px 24px'}}>
      <div style={{maxWidth:1200,margin:'0 auto',display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:16}}>
        <div style={{display:'flex',alignItems:'center',gap:8}}>
          <img src="/logo.png" alt="PRIZECHAIN" style={{width:22,height:22,borderRadius:'50%',objectFit:'cover'}}/>
          <span style={{fontSize:13,color:C.gray}}>PRIZECHAIN Sorteo · BSC Mainnet</span>
        </div>
        <div style={{display:'flex',gap:24,fontSize:13,color:C.gray,flexWrap:'wrap'}}>
          <a href="/guia.html" style={{color:C.cyan,fontWeight:600}}>Guía paso a paso</a>
          <a href={`https://bscscan.com/address/${CONTRACTS.SORTEO}`} target="_blank" rel="noreferrer">Contrato en BscScan</a>
          <a href="https://vrf.chain.link" target="_blank" rel="noreferrer">Chainlink VRF</a>
          <span>Verificado en BscScan</span>
        </div>
      </div>
    </footer>
  )
}
