import CaloRightLogo from './CaloRightLogo'
import './CSS/auth.css'

function AuthCard({ title, description, children }) {
  return (
    <main className="auth-page">
      <section className="auth-card">
        <div className="auth-card__header">
          <div className="auth-card__logo">
            <CaloRightLogo />
          </div>
          <h1>{title}</h1>
          <p>{description}</p>
        </div>

        <div className="auth-card__content">{children}</div>
      </section>
    </main>
  )
}

export default AuthCard
