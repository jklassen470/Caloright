import { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import AuthCard from './AuthCard'
import { verifyTwoFactorCode } from '../services/authService'

function TwoFactorPage({ onLoginSuccess }) {
  const navigate = useNavigate()
  const location = useLocation()
  const [code, setCode] = useState('')
  const [error, setError] = useState('')

  // Reading the mode and QR code that LoginPage or SignupPage passed through navigation state.
  const mode = location.state?.mode ?? 'login'
  const qrCode = location.state?.qrCode ?? null
  const secret = location.state?.secret ?? null

  // Stripping non-numeric characters and limiting the input to 6 digits.
  const updateCode = (value) => {
    const digitsOnly = value.replace(/\D/g, '').slice(0, 6)
    setCode(digitsOnly)
  }

  // Sending the code to PHP to verify it, then calling onLoginSuccess and navigating to the dashboard.
  const handleVerify = async (event) => {
    event.preventDefault()

    if (code.length !== 6) {
      setError('Please enter the complete 6-digit code.')
      return
    }

    try {
      const result = await verifyTwoFactorCode(code)
      setError('')
      onLoginSuccess(result.full_name)
      navigate('/dashboard')
    } catch (error) {
      setError(error.message)
    }
  }

  return (
    <AuthCard
      title="Two-Factor Authentication"
      description="Enter the 6-digit code from your authenticator app"
    >
      {mode === 'signup' && qrCode ? (
        <div className="auth-qr">
          <p>Scan this QR code with Google Authenticator to set up 2FA:</p>
          <img src={qrCode} alt="2FA QR Code" />
          <p>Or enter this code manually: <strong>{secret}</strong></p>
        </div>
      ) : null}

      <form className="auth-form" onSubmit={handleVerify}>
        <label className="auth-otp-field" htmlFor="two-factor-code">
          <span className="auth-sr-only">Two-factor authentication code</span>
          <input
            id="two-factor-code"
            type="text"
            inputMode="numeric"
            value={code}
            placeholder="000000"
            onChange={(event) => updateCode(event.target.value)}
          />
        </label>

        {error ? <p className="auth-error">{error}</p> : null}

        <button className="auth-primary-button" type="submit" disabled={code.length !== 6}>
          Verify & Continue
        </button>
      </form>

      <div className="auth-links">
        <Link className="auth-back-link" to="/login">
          Back to login
        </Link>
      </div>
    </AuthCard>
  )
}

export default TwoFactorPage
