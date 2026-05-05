import { useMemo, useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { updateProfile, changePassword, getProfile } from '../services/profileService'
import { Lock, Save, Shield, User } from 'lucide-react'
import Navbar from './Navbar'
import './CSS/profile.css'

const PROFILE_EMAIL = 'john.doe@email.com'

const SECURITY_OPTIONS = [
  {
    title: 'Two-Factor Authentication',
    description: 'Add an extra layer of security to your account',
    actionLabel: 'Manage',
    badge: 'Enabled',
  },
]

// Make initials from the user name.
function getInitials(name) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')
}

function ProfileCardHeader({ icon: Icon, title, description, danger = false }) {
  return (
    <div className="profile-card__header">
      <div className="profile-card__title-row">
        {Icon ? <Icon size={20} /> : null}
        <div>
          <h2 className={danger ? 'profile-card__danger-title' : undefined}>{title}</h2>
          <p>{description}</p>
        </div>
      </div>
    </div>
  )
}

function ProfileField({ label, type, value, placeholder, helperText, onChange }) {
  return (
    <label className="profile-field">
      <span>{label}</span>
      <input type={type} value={value} placeholder={placeholder} onChange={onChange} required />
      {helperText ? <small>{helperText}</small> : null}
    </label>
  )
}

function ProfilePage({ userName = 'John Doe' }) {
  const [profileData, setProfileData] = useState({
    name: userName,
    email: PROFILE_EMAIL,
  })
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  })

  // Error and success state variables
  const [profileError, setProfileError] = useState('')
  const [profileSuccess, setProfileSuccess] = useState('')
  const [passwordError, setPasswordError] = useState('')
  const [passwordSuccess, setPasswordSuccess] = useState('')

  const navigate = useNavigate()

  const initials = useMemo(() => getInitials(profileData.name), [profileData.name])

  // Loading the user's real name and email from PHP when the profile page opens.
  useEffect(() => {
    getProfile()
      .then((data) => {
        setProfileData({
          name: data.full_name,
          email: data.email,
        })
      })
      .catch(() => {})
  }, [])

  // Updating one field in the profile form state without overwriting the others.
  const updateProfileField = (field, value) => {
    setProfileData((current) => ({
      ...current,
      [field]: value,
    }))
  }

  // Updating one field in the password form state without overwriting the others.
  const updatePasswordField = (field, value) => {
    setPasswordData((current) => ({
      ...current,
      [field]: value,
    }))
  }

  // Validating the profile form and calling PHP to save the updated name and email.
  const handleUpdateProfile = async (event) => {
    event.preventDefault()
    setProfileError('')
    setProfileSuccess('')

    if (!profileData.name.trim() || !profileData.email.trim()) {
      setProfileError('Name and email are required.')
      return
    }

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailPattern.test(profileData.email)) {
      setProfileError('Please enter a valid email address.')
      return
    }

    try {
      await updateProfile({ full_name: profileData.name, email: profileData.email })
      setProfileSuccess('Profile updated successfully.')
    } catch (error) {
      setProfileError(error.message)
    }
  }

  // Validating the password form and calling PHP to verify the current password and save the new one.
  const handleChangePassword = async (event) => {
    event.preventDefault()
    setPasswordError('')
    setPasswordSuccess('')

    const { currentPassword, newPassword, confirmPassword } = passwordData
    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordError('Please fill in all fields.')
      return
    }

    if (newPassword.length < 8) {
      setPasswordError('New password must be at least 8 characters.')
      return
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('Passwords do not match.')
      return
    }

    try {
      await changePassword({ current_password: currentPassword, new_password: newPassword })
      setPasswordSuccess('Password updated successfully.')
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' })
    } catch (error) {
      setPasswordError(error.message)
    }
  }

  return (
    <div className="profile-page">
      <Navbar variant="profile" userName={profileData.name} onBackClick={() => navigate('/dashboard')} />

      <main className="profile-page__content">
        {/* Page heading */}
        <section className="profile-page__heading">
          <h1>Account Settings</h1>
          <p>Manage your profile and account preferences</p>
        </section>

        {/* Profile information */}
        <section className="profile-card">
          <ProfileCardHeader
            icon={User}
            title="Profile Information"
            description="Update your personal information"
          />

          <form className="profile-card__body" onSubmit={handleUpdateProfile}>
            <div className="profile-avatar">
              <div className="profile-avatar__circle">{initials}</div>
              <div className="profile-avatar__copy">
                <h3>Profile Picture</h3>
                <button className="profile-button profile-button--outline" type="button">
                  Change Avatar
                </button>
              </div>
            </div>

            <div className="profile-form-grid">
              <ProfileField
                label="Full Name"
                type="text"
                value={profileData.name}
                placeholder="John Doe"
                onChange={(event) => updateProfileField('name', event.target.value)}
              />
              <ProfileField
                label="Email Address"
                type="email"
                value={profileData.email}
                placeholder="your@email.com"
                helperText="We'll send a verification email if you change your address"
                onChange={(event) => updateProfileField('email', event.target.value)}
              />
            </div>

            <div className="profile-card__actions">
              {profileError ? <p className="auth-error">{profileError}</p> : null}
              {profileSuccess ? <p className="auth-success">{profileSuccess}</p> : null}
              <button className="profile-button profile-button--primary" type="submit">
                <Save size={16} />
                <span>Save Changes</span>
              </button>
            </div>
          </form>
        </section>

        {/* Password section */}
        <section className="profile-card">
          <ProfileCardHeader
            icon={Lock}
            title="Change Password"
            description="Update your password to keep your account secure"
          />

          <form className="profile-card__body" onSubmit={handleChangePassword}>
            <div className="profile-form-grid">
              <ProfileField
                label="Current Password"
                type="password"
                value={passwordData.currentPassword}
                placeholder="••••••••"
                onChange={(event) => updatePasswordField('currentPassword', event.target.value)}
              />
              <ProfileField
                label="New Password"
                type="password"
                value={passwordData.newPassword}
                placeholder="••••••••"
                helperText="Must be at least 8 characters long"
                onChange={(event) => updatePasswordField('newPassword', event.target.value)}
              />
              <ProfileField
                label="Confirm New Password"
                type="password"
                value={passwordData.confirmPassword}
                placeholder="••••••••"
                onChange={(event) => updatePasswordField('confirmPassword', event.target.value)}
              />
            </div>

            <div className="profile-card__actions">
              {passwordError ? <p className="auth-error">{passwordError}</p> : null}
              {passwordSuccess ? <p className="auth-success">{passwordSuccess}</p> : null}
              <button className="profile-button profile-button--primary" type="submit">
                <Lock size={16} />
                <span>Update Password</span>
              </button>
            </div>
          </form>
        </section>

        {/* Security section */}
        <section className="profile-card">
          <ProfileCardHeader
            icon={Shield}
            title="Security Settings"
            description="Manage your account security preferences"
          />

          <div className="profile-card__body">
            {SECURITY_OPTIONS.map((option) => (
              <div className="security-item" key={option.title}>
                <div className="security-item__copy">
                  <div className="security-item__top">
                    <h3>{option.title}</h3>
                    {option.badge ? <span className="security-badge">{option.badge}</span> : null}
                  </div>
                  <p>{option.description}</p>
                </div>
                <button className="profile-button profile-button--outline" type="button">
                  {option.actionLabel}
                </button>
              </div>
            ))}
          </div>
        </section>

        {/* Dangerous actions */}
        <section className="profile-card profile-card--danger">
          <ProfileCardHeader
            title="Danger Zone"
            description="Irreversible account actions"
            danger
          />

          <div className="profile-card__body">
            <div className="security-item security-item--danger">
              <div className="security-item__copy">
                <h3>Delete Account</h3>
                <p>Permanently delete your account and all data</p>
              </div>
              <button className="profile-button profile-button--danger" type="button">
                Delete Account
              </button>
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}

export default ProfilePage
