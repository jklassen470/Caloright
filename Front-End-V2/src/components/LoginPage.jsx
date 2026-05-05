import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import AuthCard from './AuthCard'
import { loginUser } from '../services/authService'

function LoginPage() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  // Validating the form and calling the login endpoint, then navigating to the 2FA step if successful.
  const handleLogin = async (event) => {
    event.preventDefault()

    if (!email || !password) {
      setError('Please fill in all fields.')
      return
    }

    try {
      await loginUser({ email, password })
      setError('')
      navigate('/2fa', { state: { mode: 'login' } })
    } catch (error) {
      setError(error.message)
    }
  }

  return (
    <AuthCard
      title="Welcome to CaloRight"
      description="Sign in to track your nutrition journey"
    >
      <form className="auth-form" onSubmit={handleLogin}>
        <label className="auth-field" htmlFor="login-email">
          <span>Email</span>
          <input
            id="login-email"
            type="email"
            value={email}
            placeholder="your@email.com"
            autoComplete="email"
            onChange={(event) => setEmail(event.target.value)}
          />
        </label>

        <label className="auth-field" htmlFor="login-password">
          <span>Password</span>
          <input
            id="login-password"
            type="password"
            value={password}
            placeholder="••••••••"
            autoComplete="current-password"
            onChange={(event) => setPassword(event.target.value)}
          />
        </label>

        {error ? <p className="auth-error">{error}</p> : null}

        <button className="auth-primary-button" type="submit">
          Sign In
        </button>
      </form>

      <div className="auth-links">
        <p>
          Don&apos;t have an account? <Link to="/signup">Sign up</Link>
        </p>
        <Link className="auth-back-link" to="/">
          ← Back to home
        </Link>
      </div>
    </AuthCard>
  )
}

export default LoginPage
