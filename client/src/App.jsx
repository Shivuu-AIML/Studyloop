import { Routes, Route, Navigate } from 'react-router-dom'
import InputScreen from './pages/InputScreen'

function PlaceholderReview() {
  return (
    <main style={{
      minHeight: '100vh',
      background: 'var(--paper)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: "'Instrument Sans', system-ui, sans-serif",
      color: 'var(--ink-soft)',
      fontSize: 18,
    }}>
      Topic review screen — coming soon.
    </main>
  )
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<InputScreen />} />
      <Route path="/review" element={<PlaceholderReview />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
