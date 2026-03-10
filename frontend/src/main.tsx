import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@arco-design/web-react/dist/css/arco.css';
import './utils/setup-monaco'; // Setup monaco workers
import './i18n'; // Initialize i18n
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
