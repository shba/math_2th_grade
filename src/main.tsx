import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource/rubik/400.css'
import '@fontsource/rubik/500.css'
import '@fontsource/rubik/700.css'
import '@fontsource-variable/fredoka/index.css'
import '@fontsource/noto-sans-hebrew/400.css'
import '@fontsource/noto-sans-hebrew/700.css'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
