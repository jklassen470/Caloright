import { useEffect, useState } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import DashboardPage from './components/DashboardPage'
import LoginPage from './components/LoginPage'
import ProfilePage from './components/ProfilePage'
import SignupPage from './components/SignupPage'
import TwoFactorPage from './components/TwoFactorPage'

const SESSION_URL = 'http://localhost/CaloServer/getSession.php'

function App() {
  const [userName, setUserName] = useState(null)
  const [sessionLoaded, setSessionLoaded] = useState(false)

  // Calling the session endpoint when the app loads to check if the user is already logged in.
  useEffect(() => {
    fetch(SESSION_URL, { credentials: 'include' })
      .then((res) => res.json())
      .then((data) => {
        if (data.user?.full_name) {
          setUserName(data.user.full_name)
        }
      })
      .catch(() => {})
      .finally(() => setSessionLoaded(true))
  }, [])

  // Waiting until the session check finishes before rendering any routes.
  // This prevents the login page from flashing before the app knows the user is logged in.
  if (!sessionLoaded) {
    return null
  }

  return (
    <Routes>
      <Route path="/" element={userName ? <DashboardPage userName={userName} onLogout={() => setUserName(null)} /> : <Navigate to="/login" replace />} />
      <Route path="/dashboard" element={userName ? <DashboardPage userName={userName} onLogout={() => setUserName(null)} /> : <Navigate to="/login" replace />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignupPage />} />
      <Route path="/2fa" element={<TwoFactorPage onLoginSuccess={(name) => setUserName(name)} />} />
      <Route path="/profile" element={userName ? <ProfilePage userName={userName} /> : <Navigate to="/login" replace />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App
