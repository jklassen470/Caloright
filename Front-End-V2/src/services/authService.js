// Authentication service for the React frontend.
// Each function calls a real PHP endpoint and returns the response as a JS object.

const API_BASE_URL = 'http://localhost/CaloServer'

const LOGIN_URL = `${API_BASE_URL}/api_login.php`
const REGISTER_URL = `${API_BASE_URL}/api_register.php`
const VERIFY_2FA_URL = `${API_BASE_URL}/api_verify2fa.php`
const LOGOUT_URL = `${API_BASE_URL}/logout.php`

// Sending the email and password to PHP and returning the response.
// If the credentials are correct, PHP starts a pending session and the app moves to the 2FA step.
export async function loginUser({ email, password }) {
  const response = await fetch(LOGIN_URL, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })

  const data = await response.json()

  if (!response.ok) {
    throw new Error(data.error ?? 'Login failed')
  }

  return data
}

// Sending the name, email, and password to PHP to create the account.
// PHP returns a QR code URI so the 2FA page can display it for Google Authenticator.
export async function signupUser({ name, email, password }) {
  const response = await fetch(REGISTER_URL, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, email, password }),
  })

  const data = await response.json()

  if (!response.ok) {
    throw new Error(data.error ?? 'Registration failed')
  }

  return data
}

// Sending the 6-digit code to PHP to verify it against the stored 2FA secret.
// If correct, PHP promotes the pending session to a full session.
export async function verifyTwoFactorCode(code) {
  const response = await fetch(VERIFY_2FA_URL, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code }),
  })

  const data = await response.json()

  if (!response.ok) {
    throw new Error(data.error ?? 'Verification failed')
  }

  return data
}

// Calling the logout endpoint to destroy the PHP session.
export async function logoutUser() {
  await fetch(LOGOUT_URL, {
    method: 'POST',
    credentials: 'include',
  })
}
