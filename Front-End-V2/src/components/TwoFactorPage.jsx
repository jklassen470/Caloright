import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import AuthCard from './AuthCard'
import { verifyTwoFactorCode } from '../services/authService'

function TwoFactorPage() {
  const navigate = useNavigate()
  const [code, setCode] = useState('')
  const [error, setError] = useState('')

  // Keep only numbers and limit the code to 6 digits.
  const updateCode = (value) => {
    const digitsOnly = value.replace(/\D/g, '').slice(0, 6)
    setCode(digitsOnly)
  }

  // Verify the demo 2FA code.
  const handleVerify = async (event) => {
    event.preventDefault()

    if (code.length !== 6) {
      setError('Please enter the complete 6-digit code.')
      return
    }

    const result = await verifyTwoFactorCode(code)
    if (!result.verified) {
      setError('Invalid verification code.')
      return
    }

    setError('')
    navigate('/dashboard')
  }

  return (
    <AuthCard
      title="Two-Factor Authentication"
      description="Enter the 6-digit code from your authenticator app"
    >
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

        <p className="auth-helper">Demo: Enter any 6 digits to continue</p>

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
