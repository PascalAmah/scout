const FAQS = [
  {
    q: 'Does Scout apply to jobs for me?',
    a: 'No. Scout prepares your resume, cover letter, and outreach — you review and submit every application yourself, outside Scout. There\'s no auto-submit.',
  },
  {
    q: 'Will generated content invent experience I don\'t have?',
    a: 'No. Every generation call is grounded in your base CV; the prompt is explicitly instructed not to add claims, titles, or metrics that aren\'t already there.',
  },
  {
    q: 'Is my CV used to train other models?',
    a: 'No. Your CV and portfolio data is encrypted at rest and never used to train external models. You can delete it at any time.',
  },
  {
    q: 'Which sources can I save from today?',
    a: 'YC company pages and generic careers pages at launch, via the browser extension. Wellfound, Techstars, and Product Hunt are on the roadmap as scheduled sync sources.',
  },
  {
    q: 'What happens to my base resume when Scout generates a tailored version?',
    a: 'Nothing — it\'s untouched. Every generated version is a separate, versioned copy with a diff view against your base resume.',
  },
]

export function Faq() {
  return (
    <section className="section" id="faq">
      <div className="wrap">
        <div className="faq-layout">
          <div className="faq-left">
            <span className="faq-pill">⌘ FAQ</span>
            <h2 className="head">Common questions</h2>
            <p className="lede">
              The honest version of what Scout does and doesn't do. Can't find what you need? Reach
              out to the team.
            </p>
            <div className="contact-card">
              <h5>Still have questions?</h5>
              <p>
                Can't find the answer you're looking for? We're happy to walk through the
                data-sourcing and privacy details in person.
              </p>
              <a className="btn btn-secondary" href="#" style={{ fontSize: 13, padding: '9px 16px' }}>
                Get in touch
              </a>
            </div>
          </div>
          <div className="faq">
            {FAQS.map((item, i) => (
              <details open={i === 0} key={item.q}>
                <summary>
                  {item.q}
                  <span className="plus">+</span>
                </summary>
                <p className="a">{item.a}</p>
              </details>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
