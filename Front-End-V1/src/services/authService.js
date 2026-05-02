// These mock functions are ready to be replaced with PHP API calls later.
export async function loginUser({ email, password }) {
  return {
    email,
    passwordVerified: Boolean(password),
    requiresTwoFactor: true,
  }
}

export async function signupUser({ name, email, password }) {
  return {
    name,
    email,
    passwordCreated: Boolean(password),
    requiresTwoFactor: true,
  }
}

export async function verifyTwoFactorCode(code) {
  return {
    verified: code.length === 6,
  }
}
