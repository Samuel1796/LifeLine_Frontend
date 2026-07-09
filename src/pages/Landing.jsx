import { Link } from 'react-router-dom'

// Editorial one-pager per DESIGN.md §3.1. The board is static markup — it
// demonstrates the status language before signup, so it stays aria-hidden.
export default function Landing() {
  return (
    <>
      <main className="container page">
        <section className="masthead">
          <div className="masthead-grid">
            <div>
              <p className="kicker">Desk booking for the office</p>
              <h1 className="masthead-title">Find your spot.</h1>
              <p className="masthead-lede">
                Nook shows you every desk on the floor — who's at them, and until when. Pick a
                free one, book it, done.
              </p>
              <div className="masthead-cta">
                <Link className="btn btn-accent btn-lg" to="/register">
                  Create account
                </Link>
                <Link className="btn btn-outline btn-lg" to="/login">
                  Sign in
                </Link>
              </div>
            </div>
            <div className="board" aria-hidden="true">
              <div className="board-head">
                <span className="board-title">The Studio</span>
                <span className="board-caption tnum">Today, 09:41</span>
              </div>
              <div className="board-row">
                <span className="status-dot free"></span>
                <span className="board-name">Desk 1</span>
                <span className="status-text free">Free</span>
              </div>
              <div className="board-row">
                <span className="status-dot taken"></span>
                <span className="board-name">Desk 2</span>
                <span className="status-text taken tnum">Busy until 17:00</span>
              </div>
              <div className="board-row">
                <span className="status-dot yours"></span>
                <span className="board-name">Desk 3</span>
                <span className="stamp stamp-yours">Yours</span>
              </div>
            </div>
          </div>
        </section>

        <section className="steps">
          <div className="step">
            <span className="step-num" aria-hidden="true">
              01
            </span>
            <h2 className="step-title">See the board</h2>
            <p className="step-text">Five offices, fifteen desks, live. Green dot means go.</p>
          </div>
          <div className="step">
            <span className="step-num" aria-hidden="true">
              02
            </span>
            <h2 className="step-title">Pick a window</h2>
            <p className="step-text">Right now, the morning, the whole day — your call.</p>
          </div>
          <div className="step">
            <span className="step-num" aria-hidden="true">
              03
            </span>
            <h2 className="step-title">Sit down</h2>
            <p className="step-text">Booked in two clicks. Cancel in one if plans change.</p>
          </div>
        </section>

        <section className="fact-strip">
          <div className="fact">
            <span className="fact-num tnum">5</span>
            <span className="fact-label">Offices</span>
          </div>
          <div className="fact">
            <span className="fact-num tnum">15</span>
            <span className="fact-label">Desks</span>
          </div>
          <div className="fact">
            <span className="fact-num tnum">12h</span>
            <span className="fact-label">Max booking</span>
          </div>
          <div className="fact">
            <span className="fact-num tnum">2</span>
            <span className="fact-label">Clicks to book</span>
          </div>
        </section>
      </main>
      <footer className="footer">
        <div className="container footer-inner">
          <span className="footer-brand">
            <span className="brand-mark" aria-hidden="true"></span>Nook
          </span>
          <span className="footer-note">Made for people who like a good desk.</span>
        </div>
      </footer>
    </>
  )
}
