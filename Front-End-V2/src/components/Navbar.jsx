import { useMemo, useState } from 'react'
import { ArrowLeft, LogOut, Menu, X } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import CaloRightLogo from './CaloRightLogo'
import './CSS/navbar.css'

// Make initials from the user name.
function getInitials(name) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')
}

function Navbar({
  variant = 'dashboard',
  userName = 'John',
  onProfileClick,
  onLogoutClick,
  onBackClick,
}) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const initials = useMemo(() => getInitials(userName), [userName])
  const navigate = useNavigate()

  // Close the mobile menu before opening profile.
  const handleProfileClick = () => {
    setMobileMenuOpen(false)
    if (onProfileClick) {
      onProfileClick()
      return
    }

    navigate('/profile')
  }

  // Close the mobile menu before logging out.
  const handleLogoutClick = () => {
    setMobileMenuOpen(false)
    onLogoutClick?.()
  }

  // Close the mobile menu before going back.
  const handleBackClick = () => {
    setMobileMenuOpen(false)
    onBackClick?.()
  }

  // Show the profile page navbar.
  if (variant === 'profile') {
    return (
      <header className="navbar">
        <div className="navbar__inner navbar__inner--profile">
          <button className="navbar__ghost-button" type="button" onClick={handleBackClick}>
            <ArrowLeft size={16} />
            <span>Back to Dashboard</span>
          </button>

          <Link className="navbar__brand navbar__brand-link" to="/">
            <CaloRightLogo />
          </Link>
        </div>
      </header>
    )
  }

  // Show the main dashboard navbar.
  return (
    <header className="navbar">
      <div className="navbar__inner">
        <Link className="navbar__brand navbar__brand-link" to="/">
          <CaloRightLogo subtitle={`Welcome back, ${userName}!`} />
        </Link>

        <div className="navbar__profile navbar__actions--desktop">
          <button className="navbar__outline-button" type="button" onClick={handleProfileClick}>
            <span className="navbar__avatar" aria-hidden="true">
              {initials}
            </span>
            <span>Profile</span>
          </button>
        </div>

        <div className="navbar__logout navbar__actions--desktop">
          <button className="navbar__outline-button" type="button" onClick={handleLogoutClick}>
            <LogOut size={16} />
            <span>Logout</span>
          </button>
        </div>

        <button
          className="navbar__menu-button"
          type="button"
          onClick={() => setMobileMenuOpen((open) => !open)}
          aria-expanded={mobileMenuOpen}
          aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
        >
          {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {mobileMenuOpen ? (
        <div className="navbar__mobile-menu">
          <button
            className="navbar__outline-button navbar__outline-button--mobile"
            type="button"
            onClick={handleProfileClick}
          >
            <span className="navbar__avatar" aria-hidden="true">
              {initials}
            </span>
            <span>Profile</span>
          </button>
          <button
            className="navbar__outline-button navbar__outline-button--mobile"
            type="button"
            onClick={handleLogoutClick}
          >
            <LogOut size={16} />
            <span>Logout</span>
          </button>
        </div>
      ) : null}
    </header>
  )
}

export default Navbar
