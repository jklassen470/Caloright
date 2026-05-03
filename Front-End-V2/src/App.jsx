import { Navigate, Route, Routes } from 'react-router-dom'
import DashboardPage from './components/DashboardPage'
import LoginPage from './components/LoginPage'
import ProfilePage from './components/ProfilePage'
import SignupPage from './components/SignupPage'
import TwoFactorPage from './components/TwoFactorPage'

function App() {
  const userName = 'John Doe'

  return (
    <Routes>
      <Route path="/" element={<DashboardPage userName={userName} />} />
      <Route path="/dashboard" element={<DashboardPage userName={userName} />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignupPage />} />
      <Route path="/2fa" element={<TwoFactorPage />} />
      <Route path="/profile" element={<ProfilePage userName={userName} />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App
