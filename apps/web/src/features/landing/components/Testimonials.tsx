const QUOTES = [
  {
    init: 'JM',
    quote:
      "I stopped re-Googling the same 40 companies every week. Everything I'd already looked into was just there.",
    name: 'Jordan M.',
    role: 'Software Engineer',
    style: { background: 'linear-gradient(160deg,#2C3B52,#1F2937)' },
  },
  {
    init: 'PS',
    quote:
      "The gap callouts are what sold me — it tells me what's missing instead of pretending my portfolio is a perfect fit.",
    name: 'Priya S.',
    role: 'Product Designer',
    style: { background: 'linear-gradient(160deg,#0F6E56,#0B4738)' },
  },
  {
    init: 'AK',
    quote:
      'As a student applying to 60+ internships, the batch save-then-generate flow saved me a full week.',
    name: 'Aiden K.',
    role: 'CS Student',
    style: { background: 'linear-gradient(160deg,#B8791A,#8A5A11)' },
  },
  {
    init: 'RD',
    quote: 'I finally have one pipeline instead of five browser tabs and a stale spreadsheet.',
    name: 'Renee D.',
    role: 'AI Researcher',
    style: { background: 'linear-gradient(160deg,#3E5C8A,#2A3F60)' },
  },
]

export function Testimonials() {
  return (
    <section className="section" style={{ paddingTop: 0 }}>
      <div className="wrap">
        <div className="t-head">
          <div className="left">
            <p className="kicker">From the people using it</p>
            <h2 className="head" style={{ marginBottom: 0 }}>
              Five different job searches,
              <br />
              one workspace
            </h2>
          </div>
          <div className="t-arrows">
            <button type="button" className="t-arrow" aria-label="Previous">
              <svg viewBox="0 0 24 24" fill="none" strokeWidth="2">
                <path d="M15 18l-6-6 6-6" />
              </svg>
            </button>
            <button type="button" className="t-arrow filled" aria-label="Next">
              <svg viewBox="0 0 24 24" fill="none" strokeWidth="2">
                <path d="M9 6l6 6-6 6" />
              </svg>
            </button>
          </div>
        </div>
        <div className="t-grid">
          {QUOTES.map((card) => (
            <div className="t-card" style={card.style} key={card.name}>
              <span className="quote-mark">&rdquo;</span>
              <div className="init">{card.init}</div>
              <p className="t-quote">&quot;{card.quote}&quot;</p>
              <div className="t-person">
                <b>{card.name}</b>
                <span>{card.role}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
