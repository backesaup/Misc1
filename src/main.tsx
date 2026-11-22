import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource-variable/bricolage-grotesque'
import '@fontsource/andika/400.css'
import '@fontsource/andika/700.css'
import './index.css'
import App from './App'
import { SettingsProvider } from '@/lib/settings'
import { initAudioSession } from '@/lib/audioSession'

initAudioSession()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <SettingsProvider>
      <App />
    </SettingsProvider>
  </StrictMode>,
)
