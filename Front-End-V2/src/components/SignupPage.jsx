import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import AuthCard from './AuthCard'
import { signupUser } from '../services/authService'

function SignupPage() {
  const navigate = useNavigate()
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  })
  const [error, setError] = useState('')

  // Update one signup field.
  const updateFormData = (field, value) => {
    setFormData((current) => ({
      ...current,
      [field]: value,
    }))
  }

  // Validate the form, then move to 2FA.
  const handleSignup = async (event) => {
    event.preventDefault()

    if (!formData.name || !formData.email || !formData.password || !formData.confirmPassword) {
      setError('Please fill in all fields.')
      return
    }

    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    await signupUser(formData)
    setError('')
    navigate('/2fa')
  }

  return (
    <AuthCard
      title="Create Your Account"
      description="Join CaloRight and start your health journey"
    >
      <form className="auth-form" onSubmit={handleSignup}>
        <label className="auth-field" htmlFor="signup-name">
          <span>Full Name</span>
          <input
            id="signup-name"
            type="text"
            value={formData.name}
            placeholder="John Doe"
            autoComplete="name"
            onChange={(event) => updateFormData('name', event.target.value)}
          />
        </label>

        <label className="auth-field" htmlFor="signup-email">
          <span>Email</span>
          <input
            id="signup-email"
            type="email"
            value={formData.email}
            placeholder="your@email.com"
            autoComplete="email"
            onChange={(event) => updateFormData('email', event.target.value)}
          />
        </label>

        <label className="auth-field" htmlFor="signup-password">
          <span>Password</span>
          <input
            id="signup-password"
            type="password"
            value={formData.password}
            placeholder="••••••••"
            autoComplete="new-password"
            onChange={(event) => updateFormData('password', event.target.value)}
          />
        </label>

        <label className="auth-field" htmlFor="signup-confirm-password">
          <span>Confirm Password</span>
          <input
            id="signup-confirm-password"
            type="password"
            value={formData.confirmPassword}
            placeholder="••••••••"
            autoComplete="new-password"
            onChange={(event) => updateFormData('confirmPassword', event.target.value)}
          />
        </label>

        {error ? <p className="auth-error">{error}</p> : null}

        <button className="auth-primary-button" type="submit">
          Create Account
        </button>
      </form>

      <div className="auth-links">
        <p>
          Already have an account? <Link to="/login">Sign in</Link>
        </p>
        <Link className="auth-back-link" to="/">
          ← Back to home
        </Link>
      </div>
    </AuthCard>
  )
}

export default SignupPage
