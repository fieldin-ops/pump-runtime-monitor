import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import './index.css'
import App from './App.tsx'
import { PasswordGate } from './components/PasswordGate.tsx'
import { AlertsPage } from './pages/AlertsPage.tsx'
import { HomePage } from './pages/HomePage.tsx'
import { PumpAlertsPage } from './pages/PumpAlertsPage.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <PasswordGate>
      <BrowserRouter basename="/pump-runtime-monitor">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/alerts" element={<AlertsPage />} />
          <Route path="/pump/:siteId" element={<App />} />
          <Route path="/pump/:siteId/alerts" element={<PumpAlertsPage />} />
        </Routes>
      </BrowserRouter>
    </PasswordGate>
  </StrictMode>,
)
