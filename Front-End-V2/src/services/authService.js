// This file is the authentication service layer.
// Right now these functions are mocked so the login/signup screens can work
// before we build the real PHP authentication endpoints.
// Later, each function can be changed to use fetch() just like dashboardService.

// Simulate logging in with an email and password.
// Boolean(password) means "true if the user typed any password".
export async function loginUser({ email, password }) {
  return {
    email,
    passwordVerified: Boolean(password),
    requiresTwoFactor: true,
  }
}

// Simulate creating a new user account.
// The returned object uses simple flags that the UI can check.
export async function signupUser({ name, email, password }) {
  return {
    name,
    email,
    passwordCreated: Boolean(password),
    requiresTwoFactor: true,
  }
}

// Simulate checking a two-factor authentication code.
// For the mock version, any 6-character code is accepted.
export async function verifyTwoFactorCode(code) {
  return {
    verified: code.length === 6,
  }
}
