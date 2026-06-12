import { Link } from 'react-router-dom'
import { useAuth } from '../AuthContext'

export default function Landing() {
  const { user } = useAuth()

  return (
    <div className="page">
      <section className="hero">
        <h1>
          Every drop counts.
          <br />
          <span className="accent-text">Find a donor in minutes.</span>
        </h1>
        <p>
          LifeLine connects people who urgently need blood with nearby, compatible donors —
          matched by blood type and location, and alerted the moment a request goes out.
        </p>
        <div className="hero-cta">
          {user ? (
            <Link to={user.role === 'Donor' ? '/donor' : '/requester'} className="btn btn-primary">
              Go to your dashboard
            </Link>
          ) : (
            <>
              <Link to="/register?role=Donor" className="btn btn-primary">
                Become a donor
              </Link>
              <Link to="/register?role=Requester" className="btn btn-ghost">
                I need blood
              </Link>
            </>
          )}
        </div>

        <div className="stat-row">
          <div className="glass stat-card">
            <div className="num">1 in 7</div>
            <div className="label">hospital patients need blood</div>
          </div>
          <div className="glass stat-card">
            <div className="num">3 lives</div>
            <div className="label">saved by a single donation</div>
          </div>
          <div className="glass stat-card">
            <div className="num">50 km</div>
            <div className="label">smart proximity matching</div>
          </div>
          <div className="glass stat-card">
            <div className="num">Live</div>
            <div className="label">instant donor alerts</div>
          </div>
        </div>
      </section>
    </div>
  )
}
