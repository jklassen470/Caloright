const UPDATE_PROFILE_URL = 'http://localhost/CaloServer/updateProfile.php'
const CHANGE_PASSWORD_URL = 'http://localhost/CaloServer/changePassword.php'
const GET_PROFILE_URL = 'http://localhost/CaloServer/getProfile.php'

// Sending the updated name and email to PHP and returning the saved values.
export async function updateProfile({ full_name, email }) {
  const response = await fetch(UPDATE_PROFILE_URL, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ full_name, email }),
  })

  if (!response.ok) {
    const data = await response.json()
    throw new Error(data.error ?? 'Failed to update profile')
  }

  return await response.json()
}

// Sending the current password and new password to PHP to verify and save the change.
export async function changePassword({ current_password, new_password }) {
  const response = await fetch(CHANGE_PASSWORD_URL, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ current_password, new_password }),
  })

  if (!response.ok) {
    const data = await response.json()
    throw new Error(data.error ?? 'Failed to change password')
  }

  return await response.json()
}

// Fetching the logged in user's name and email from PHP.
export async function getProfile() {
  const response = await fetch(GET_PROFILE_URL, {
    credentials: 'include',
  })

  if (!response.ok) {
    const data = await response.json()
    throw new Error(data.error ?? 'Failed to load profile')
  }

  return await response.json()
}
