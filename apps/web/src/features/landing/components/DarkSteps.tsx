const STEPS = [
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.8">
        <path d="M12 2l2.4 6.6L21 11l-6.6 2.4L12 20l-2.4-6.6L3 11l6.6-2.4z" />
      </svg>
    ),
    tag: 'You',
    time: 'Instant',
    title: 'Save from any page',
    body: 'One click on a YC listing, a careers page, or a job post. The extension pre-fills what it can before you click anything.',
    now: false,
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.8">
        <rect x="4" y="4" width="16" height="16" rx="2" />
        <path d="M4 10h16M10 4v16" />
      </svg>
    ),
    tag: 'Scout',
    time: '~2 min',
    title: 'Enrichment runs in the background',
    body: 'Careers page, tech stack, funding, and founder background — pulled and summarized, usually inside a couple of minutes.',
    now: true,
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.8">
        <circle cx="12" cy="12" r="8" />
        <circle cx="12" cy="12" r="3" />
      </svg>
    ),
    tag: 'Scout',
    time: 'Cached',
    title: 'Fit is scored, with reasons',
    body: 'Your CV is checked against the role, not just matched by keyword — matched skills and gaps are stored, not regenerated on every view.',
    now: true,
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.8">
        <path d="M22 2L11 13" />
        <path d="M22 2l-7 20-4-9-9-4z" />
      </svg>
    ),
    tag: 'You',
    time: 'You decide',
    title: 'Review and send',
    body: 'Generated resume and outreach are editable from the start, diffed against your base resume, and never sent without your review.',
    now: false,
  },
]

export function DarkSteps() {
  return (
    <div className="dark-section">
      <p className="kicker">How it works</p>
      <h2 className="head">Save normally. Scout does the rest.</h2>
      <p className="lede">
        Four moments the extension and dashboard hand off to each other automatically — you only
        ever touch two of them.
      </p>
      <div className="steps-timeline">
        {STEPS.map((step, i) => (
          <div className={`step-row${step.now ? ' now' : ''}`} key={step.title}>
            <div className="step-node">{i + 1}</div>
            <div className="step-card-h">
              <div className="top-line">
                <div className="step-icon">{step.icon}</div>
                <span className="step-tag">{step.tag}</span>
                <span className="step-time">{step.time}</span>
              </div>
              <h4>{step.title}</h4>
              <p>{step.body}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
