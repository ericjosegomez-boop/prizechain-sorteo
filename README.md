# PRIZECHAIN dApp — Sorteo

Interfaz web para participar en el sorteo semanal de PRIZECHAIN.
Conecta tu wallet, ve tus boletos y regístrate con un clic.

---

## Configuración antes de deployar

Edita `src/config.js` y reemplaza:

```js
CONTRACTS.SORTEO = '0xTU_CONTRATO_SORTEO'   // dirección del contrato PrizeQuickDraw
CONTRACTS.PRIZE  = '0xTU_TOKEN_PRIZE'        // dirección del token PRIZECHAIN

wagmiConfig.projectId = 'TU_WALLETCONNECT_PROJECT_ID'
// Obtén uno gratis en: https://cloud.walletconnect.com
```

---

## Instalar y correr en local

```bash
npm install
npm run dev
# Abre http://localhost:5173
```

## Build para producción

```bash
npm run build
# Los archivos quedan en /dist — sube esa carpeta a Vercel/Netlify
```

---

## Deploy en Vercel (gratis, recomendado)

1. Sube este código a GitHub
2. Entra a vercel.com → "New Project" → importa el repo
3. Vercel detecta Vite automáticamente
4. Haz clic en "Deploy"
5. Tu dApp estará en `prizechain.vercel.app` o tu dominio propio

**Cada vez que hagas push a GitHub, Vercel re-deploya automáticamente.**

---

## Deploy en Netlify (alternativa gratis)

```bash
npm run build
# Arrastra la carpeta /dist a netlify.com/drop
```

---

## Estructura de archivos

```
src/
  config.js              ← Direcciones de contratos y ABI
  main.jsx               ← Entry point con providers
  App.jsx                ← Navbar + pantalla conectado/desconectado
  components/
    Dashboard.jsx        ← Lee datos del contrato en tiempo real
    TicketCard.jsx       ← Muestra saldo PRIZE y boletos calculados
    PrizeCard.jsx        ← Muestra el premio acumulado en USDT
    RegisterButton.jsx   ← Botón con flujo completo de tx
    Countdown.jsx        ← Cuenta regresiva al cierre del registro
    RoundHistory.jsx     ← Historial de la ronda anterior
```

---

## Tecnologías

- **React + Vite** — UI rápida y liviana
- **wagmi + viem** — Lee y escribe en el contrato BSC
- **RainbowKit** — Botón de conectar wallet (MetaMask, Trust, WalletConnect)
- **@tanstack/react-query** — Caché de datos del contrato

Sin backend. Sin base de datos. Todo directo desde la blockchain.

---

## Personalización

Para cambiar colores edita `src/index.css` — las variables `--purple`, `--gold`, `--bg`, etc.

Para agregar más rondas al historial, duplica la lógica de `RoundHistory.jsx`
y pásale roundIds anteriores.
