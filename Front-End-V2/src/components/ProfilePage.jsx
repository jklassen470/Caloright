import { useMemo, useState } from 'react'
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

  const initials = useMemo(() => getInitials(profileData.name), [profileData.name])

  // Update one profile field.
  const updateProfileField = (field, value) => {
    setProfileData((current) => ({
      ...current,
      [field]: value,
    }))
  }

  // Update one password field.
  const updatePasswordField = (field, value) => {
    setPasswordData((current) => ({
      ...current,
      [field]: value,
    }))
  }

  // Save profile form.
  const handleUpdateProfile = (event) => {
    event.preventDefault()

    if (!profileData.name.trim() || !profileData.email.trim()) {
      return
    }

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailPattern.test(profileData.email)) {
      return
    }
  }

  // Save password form.
  const handleChangePassword = (event) => {
    event.preventDefault()

    const { currentPassword, newPassword, confirmPassword } = passwordData
    if (!currentPassword || !newPassword || !confirmPassword) {
      return
    }

    if (newPassword.length < 8) {
      return
    }

    if (newPassword !== confirmPassword) {
      return
    }

    setPasswordData({
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    })
  }

  return (
    <div className="profile-page">
      <Navbar userName={profileData.name} />

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
