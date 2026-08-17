import { useEffect, useRef } from 'react'

import { LandingRing } from './LandingRing'

const STEPS = 9

/**
 * The nine-step core loop. On desktop the layout pins (sticky) inside a tall
 * scroll wrapper and the active step is driven by scroll progress; clicking a
 * step scrolls to that step's position. On mobile the wrapper collapses and
 * the radio labels behave as plain tabs (native radio behavior).
 */
export function WorkflowTour() {
  const scrollWrapRef = useRef<HTMLDivElement>(null)
  const layoutRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const scrollWrap = scrollWrapRef.current
    const layout = layoutRef.current
    if (!scrollWrap || !layout) return

    const radios: HTMLInputElement[] = []
    for (let n = 1; n <= STEPS; n++) {
      const r = document.getElementById(`ts${n}`) as HTMLInputElement | null
      if (!r) return
      radios.push(r)
    }

    let ticking = false

    const isPinned = () => getComputedStyle(layout).position === 'sticky'

    const update = () => {
      ticking = false
      if (!isPinned()) return // mobile: fall back to plain click/tap tabs
      const stickyTop = parseFloat(getComputedStyle(layout).top) || 0
      const rect = scrollWrap.getBoundingClientRect()
      const total = scrollWrap.offsetHeight - layout.offsetHeight
      if (total <= 0) return
      const scrolled = stickyTop - rect.top
      const progress = Math.max(0, Math.min(1, scrolled / total))
      let idx = Math.floor(progress * STEPS)
      if (idx >= STEPS) idx = STEPS - 1
      if (idx < 0) idx = 0
      if (!radios[idx].checked) radios[idx].checked = true
    }

    const onScroll = () => {
      if (!ticking) {
        ticking = true
        requestAnimationFrame(update)
      }
    }

    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    update()

    // Clicking / tapping a step scrolls the page to that step's position, so
    // the scroll-driven state and manual selection always agree.
    const tabs = scrollWrap.querySelectorAll('.step-tab')
    tabs.forEach((label, i) => {
      label.addEventListener('click', (e) => {
        if (!isPinned()) return // let native radio behavior handle mobile taps
        e.preventDefault()
        const stickyTop = parseFloat(getComputedStyle(layout).top) || 0
        const rect = scrollWrap.getBoundingClientRect()
        const total = scrollWrap.offsetHeight - layout.offsetHeight
        const targetProgress = (i + 0.5) / STEPS
        const wrapTopAbs = window.scrollY + rect.top
        const targetY = wrapTopAbs - stickyTop + targetProgress * total
        window.scrollTo({ top: targetY, behavior: 'smooth' })
        radios[i].checked = true
      })
    })

    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
    }
  }, [])

  const steps = [
    { who: 'you', color: 'var(--color-charcoal)' },
    { who: 'you', color: 'var(--color-charcoal)' },
    { who: 'scout', color: 'var(--color-emerald)' },
    { who: 'scout', color: 'var(--color-emerald)' },
    { who: 'scout', color: 'var(--color-emerald)' },
    { who: 'scout', color: 'var(--color-emerald)' },
    { who: 'you', color: 'var(--color-charcoal)' },
    { who: 'you', color: 'var(--color-charcoal)' },
    { who: 'scout', color: 'var(--color-emerald)' },
  ]

  return (
    <section className="section" id="workflow">
      <div className="wrap">
        <p className="kicker">The core loop</p>
        <h2 className="head">Nine steps, once each — Scout remembers the rest</h2>
        <p className="lede">
          This is the actual sequence a saved company moves through. Click a step, or let it play —
          nothing here is decorative, each stage is a real, independently-triggerable part of the
          pipeline.
        </p>

        <div className="tour">
          <div className="tour-scroll" ref={scrollWrapRef}>
            <input type="radio" name="tourstep" id="ts1" defaultChecked />
            {Array.from({ length: STEPS - 1 }, (_, i) => (
              <input key={i} type="radio" name="tourstep" id={`ts${i + 2}`} />
            ))}

            <div className="tour-layout" ref={layoutRef}>
              <span className="scroll-hint">
                <svg viewBox="0 0 24 24" fill="none" strokeWidth="2">
                  <path d="M12 5v14M5 12l7 7 7-7" />
                </svg>
                Scroll to move through the loop
              </span>

              <div className="stepper">
                {[
                  ['Discover', 'Find it anywhere'],
                  ['Save', 'One click, any page'],
                  ['Enrich', 'AI reads the details'],
                  ['Analyze', 'Stage, culture, signals'],
                  ['Match', 'Scored against your CV'],
                  ['Generate', 'Resume + outreach'],
                  ['Apply', 'You review, you send'],
                  ['Track', 'One pipeline view'],
                  ['Follow up', 'Nudged at the right time'],
                ].map(([title, sub], i) => (
                  <label className="step-tab" htmlFor={`ts${i + 1}`} key={title}>
                    <span className="num">{i + 1}</span>
                    <span className="body">
                      <b>{title}</b>
                      <span className="sub">{sub}</span>
                    </span>
                    <span className="who-dot" style={{ background: steps[i].color }} />
                    <span className="rail">
                      <i />
                    </span>
                  </label>
                ))}
              </div>

              <div className="stage">
                <div className="stage-glow" />

                {/* 1 — Discover */}
                <div className="stage-panel" data-n="1">
                  <div className="stage-head">
                    <div className="stage-icon who-you">
                      <svg viewBox="0 0 24 24" fill="none" strokeWidth="2">
                        <circle cx="11" cy="11" r="7" />
                        <path d="M21 21l-4.3-4.3" />
                      </svg>
                    </div>
                    <h3>Discover</h3>
                    <span className="stage-who you">You</span>
                  </div>
                  <p className="stage-desc">
                    You find a company organically — a YC listing, a founder's tweet, a friend's
                    referral. Scout doesn't push opportunities at you here; discovery still starts
                    with you.
                  </p>
                  <div className="stage-demo dw-row">
                    <span className="dw-chip">
                      <img src="/assets/logos/yc.png" style={{ height: 12 }} alt="" />
                    </span>
                    <span className="dw-chip">Founder's tweet</span>
                    <span className="dw-chip">Referral</span>
                    <span className="dw-arrow">→</span>
                    <span
                      className="dw-chip"
                      style={{
                        background: 'var(--color-charcoal)',
                        color: '#fff',
                        borderColor: 'var(--color-charcoal)',
                      }}
                    >
                      Worth a closer look
                    </span>
                  </div>
                </div>

                {/* 2 — Save */}
                <div className="stage-panel" data-n="2">
                  <div className="stage-head">
                    <div className="stage-icon who-you">
                      <svg viewBox="0 0 24 24" fill="none" strokeWidth="2">
                        <path d="M6 3h12v18l-6-4-6 4z" />
                      </svg>
                    </div>
                    <h3>Save</h3>
                    <span className="stage-who you">You</span>
                  </div>
                  <p className="stage-desc">
                    One click, from any supported page. The extension pre-fills what it can — company
                    name, source URL, a raw snapshot — before you click anything else.
                  </p>
                  <div className="stage-demo">
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div className="logo-chip" style={{ width: 32, height: 32, fontSize: 11 }}>
                          LH
                        </div>
                        <div>
                          <b style={{ fontSize: 13, display: 'block' }}>Lumina Health</b>
                          <span style={{ fontSize: 11.5, color: 'var(--color-muted)' }}>
                            Detected: YC company page
                          </span>
                        </div>
                      </div>
                      <span
                        className="dw-chip"
                        style={{
                          background: 'var(--color-emerald)',
                          color: '#fff',
                          borderColor: 'var(--color-emerald)',
                        }}
                      >
                        Saved
                      </span>
                    </div>
                  </div>
                </div>

                {/* 3 — Enrich */}
                <div className="stage-panel" data-n="3">
                  <div className="stage-head">
                    <div className="stage-icon">
                      <svg viewBox="0 0 24 24" fill="none" strokeWidth="2">
                        <rect x="4" y="4" width="16" height="16" rx="2" />
                        <path d="M4 10h16M10 4v16" />
                      </svg>
                    </div>
                    <h3>Enrich</h3>
                    <span className="stage-who scout">Scout</span>
                  </div>
                  <p className="stage-desc">
                    Careers page, tech stack, funding, and founder background — pulled and summarized
                    in the background, usually inside a couple of minutes.
                  </p>
                  <div className="stage-demo dw-row" style={{ gap: 16 }}>
                    <span className="job-dot">
                      <span className="dot" style={{ background: 'var(--color-emerald)' }} />
                      Queued
                    </span>
                    <span className="dw-arrow">→</span>
                    <span className="job-dot">
                      <span className="dot dot-running" />
                      Running
                    </span>
                    <span className="dw-arrow">→</span>
                    <span className="job-dot" style={{ fontWeight: 600, color: 'var(--color-emerald-dark)' }}>
                      <span className="dot" style={{ background: 'var(--color-emerald)' }} />
                      Succeeded
                    </span>
                  </div>
                </div>

                {/* 4 — Analyze */}
                <div className="stage-panel" data-n="4">
                  <div className="stage-head">
                    <div className="stage-icon">
                      <svg viewBox="0 0 24 24" fill="none" strokeWidth="2">
                        <path d="M3 3v18h18M7 15l4-5 3 3 5-7" />
                      </svg>
                    </div>
                    <h3>Analyze</h3>
                    <span className="stage-who scout">Scout</span>
                  </div>
                  <p className="stage-desc">
                    Stage, culture signals, and hiring status get structured — so the workspace holds
                    a real profile, not just a bookmark.
                  </p>
                  <div className="stage-demo dw-row">
                    <span className="dw-chip">Stage: Series A</span>
                    <span className="dw-chip">Hiring: Actively</span>
                    <span className="dw-chip">Remote-first</span>
                    <span className="dw-chip">Enriched 3d ago</span>
                  </div>
                </div>

                {/* 5 — Match */}
                <div className="stage-panel" data-n="5">
                  <div className="stage-head">
                    <div className="stage-icon">
                      <svg viewBox="0 0 24 24" fill="none" strokeWidth="2">
                        <circle cx="12" cy="12" r="8" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                    </div>
                    <h3>Match</h3>
                    <span className="stage-who scout">Scout</span>
                  </div>
                  <p className="stage-desc">
                    Scored against your CV, with matched skills and gaps always shown together — a
                    score with no gaps is treated as a bug, not a perfect fit.
                  </p>
                  <div className="stage-demo" style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
                    <LandingRing score={87} size={52} color="#18A058" />
                    <div className="dw-row">
                      <span className="chip chip-match">PYTHON</span>
                      <span className="chip chip-match">FASTAPI</span>
                      <span className="chip chip-gap">K8S — GAP</span>
                    </div>
                  </div>
                </div>

                {/* 6 — Generate */}
                <div className="stage-panel" data-n="6">
                  <div className="stage-head">
                    <div className="stage-icon">
                      <svg viewBox="0 0 24 24" fill="none" strokeWidth="2">
                        <path d="M12 2l2.4 6.6L21 11l-6.6 2.4L12 20l-2.4-6.6L3 11l6.6-2.4z" />
                      </svg>
                    </div>
                    <h3>Generate</h3>
                    <span className="stage-who scout">Scout</span>
                  </div>
                  <p className="stage-desc">
                    A tailored resume, cover letter, and intro — grounded only in what's already in
                    your base CV. Nothing invented, nothing overwritten.
                  </p>
                  <div className="stage-demo" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 13, color: 'var(--color-muted)' }}>Base resume</span>
                    <span className="dw-arrow">→</span>
                    <span
                      className="dw-chip"
                      style={{
                        background: 'var(--color-emerald-tint)',
                        color: 'var(--color-emerald-dark)',
                        borderColor: 'var(--color-emerald-tint-strong)',
                      }}
                    >
                      v3 · tailored for Lumina Health
                    </span>
                  </div>
                </div>

                {/* 7 — Apply */}
                <div className="stage-panel" data-n="7">
                  <div className="stage-head">
                    <div className="stage-icon who-you">
                      <svg viewBox="0 0 24 24" fill="none" strokeWidth="2">
                        <path d="M22 2L11 13" />
                        <path d="M22 2l-7 20-4-9-9-4z" />
                      </svg>
                    </div>
                    <h3>Apply</h3>
                    <span className="stage-who you">You</span>
                  </div>
                  <p className="stage-desc">
                    Every generated version is blocked from download or send until you explicitly mark
                    it reviewed — Scout never auto-submits on your behalf.
                  </p>
                  <div className="stage-demo dw-row">
                    <span className="dw-chip" style={{ color: 'var(--color-muted-2)' }}>
                      reviewed_at: null
                    </span>
                    <span className="dw-arrow">→</span>
                    <span
                      className="dw-chip"
                      style={{
                        background: 'var(--color-charcoal)',
                        color: '#fff',
                        borderColor: 'var(--color-charcoal)',
                      }}
                    >
                      You click &quot;Mark reviewed&quot;
                    </span>
                    <span className="dw-arrow">→</span>
                    <span
                      className="dw-chip"
                      style={{
                        background: 'var(--color-emerald)',
                        color: '#fff',
                        borderColor: 'var(--color-emerald)',
                      }}
                    >
                      Send
                    </span>
                  </div>
                </div>

                {/* 8 — Track */}
                <div className="stage-panel" data-n="8">
                  <div className="stage-head">
                    <div className="stage-icon who-you">
                      <svg viewBox="0 0 24 24" fill="none" strokeWidth="2">
                        <rect x="3" y="4" width="18" height="16" rx="2" />
                        <path d="M9 4v16M15 4v16" />
                      </svg>
                    </div>
                    <h3>Track</h3>
                    <span className="stage-who you">You</span>
                  </div>
                  <p className="stage-desc">
                    One pipeline view across seven statuses — saved through offer or rejected —
                    instead of a spreadsheet that goes stale within a week.
                  </p>
                  <div className="stage-demo dw-row">
                    <span className="badge b-saved">
                      <span className="d" />
                      Saved
                    </span>
                    <span className="badge" style={{ background: 'var(--color-amber-tint)', color: 'var(--color-amber)' }}>
                      <span className="d" style={{ background: 'var(--color-amber)' }} />
                      Interested
                    </span>
                    <span className="badge b-applied">
                      <span className="d" />
                      Applied
                    </span>
                    <span className="badge b-interview">
                      <span className="d" />
                      Interview
                    </span>
                  </div>
                </div>

                {/* 9 — Follow up */}
                <div className="stage-panel" data-n="9">
                  <div className="stage-head">
                    <div className="stage-icon">
                      <svg viewBox="0 0 24 24" fill="none" strokeWidth="2">
                        <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
                        <path d="M13.7 21a2 2 0 0 1-3.4 0" />
                      </svg>
                    </div>
                    <h3>Follow up</h3>
                    <span className="stage-who scout">Scout suggests</span>
                  </div>
                  <p className="stage-desc">
                    Nudged at the right time based on time-since-applied — Scout can draft the
                    follow-up on request, but you decide whether it gets sent.
                  </p>
                  <div className="stage-demo dw-row">
                    <span className="dw-chip">Applied 7 days ago</span>
                    <span className="dw-arrow">→</span>
                    <span
                      className="dw-chip"
                      style={{
                        background: 'var(--color-emerald-tint)',
                        color: 'var(--color-emerald-dark)',
                        borderColor: 'var(--color-emerald-tint-strong)',
                      }}
                    >
                      Suggested: send a follow-up today
                    </span>
                  </div>
                </div>

                <div className="stepdots">
                  {Array.from({ length: STEPS }, (_, i) => (
                    <i key={i} />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
