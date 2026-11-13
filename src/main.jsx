// src/main.jsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import { WagmiProvider } from 'wagmi'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { RainbowKitProvider, darkTheme } from '@rainbow-me/rainbowkit'
import '@rainbow-me/rainbowkit/styles.css'

// Tipografías incluidas en la web (no dependen de Google Fonts)
import '@fontsource/big-shoulders-display/800'
import '@fontsource/big-shoulders-display/900'
import '@fontsource/onest/400'
import '@fontsource/onest/500'
import '@fontsource/onest/600'
import '@fontsource/onest/700'

import { wagmiConfig } from './config'
import App from './App'
import './index.css'

const queryClient = new QueryClient()

const theme = darkTheme({
  accentColor:           '#E8B341',
  accentColorForeground: '#1A1405',
  borderRadius:          'large',
  fontStack:             'system',
})
theme.colors.modalBackground = '#121F45'
theme.colors.modalBorder     = '#283B70'
theme.fonts.body             = "'Onest', system-ui, sans-serif"

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider theme={theme} locale="es">
          <App />
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  </React.StrictMode>
)
