import React from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import Layout from './Layout'

// Page imports
// @ts-ignore
import Dashboard from './pages/Dashboard'
// @ts-ignore
import Leads from './pages/Leads'
// @ts-ignore
import Progress from './pages/Progress'
// @ts-ignore
import Settings from './pages/Settings'
// @ts-ignore
import Schedule from './pages/Schedule'

const App: React.FC = () => {
  return (
    <Router>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/leads" element={<Leads />} />
          <Route path="/progress" element={<Progress />} />
          <Route path="/schedule" element={<Schedule />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Route>
      </Routes>
    </Router>
  )
}

export default App 