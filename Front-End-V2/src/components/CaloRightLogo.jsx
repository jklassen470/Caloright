import { Apple } from 'lucide-react'
import './CSS/navbar.css'

function CaloRightLogo({ subtitle }) {
  return (
    <div className="navbar__brand">
      <div className="navbar__logo" aria-hidden="true">
        <Apple size={24} />
      </div>
      <div className="navbar__brand-copy">
        <div className="navbar__title">CaloRight</div>
        {subtitle ? <p className="navbar__welcome">{subtitle}</p> : null}
      </div>
    </div>
  )
}

export default CaloRightLogo
