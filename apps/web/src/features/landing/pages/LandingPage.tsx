import '../landing.css'

import { DarkSteps } from '../components/DarkSteps'
import { Faq } from '../components/Faq'
import { Hero } from '../components/Hero'
import { Matching } from '../components/Matching'
import { SampleWorkspace } from '../components/SampleWorkspace'
import { SiteFooter } from '../components/SiteFooter'
import { SiteNav } from '../components/SiteNav'
import { Sources } from '../components/Sources'
import { Testimonials } from '../components/Testimonials'
import { WorkflowTour } from '../components/WorkflowTour'

export function LandingPage() {
  return (
    <div className="landing" id="top">
      <div className="site-shell">
        <div className="site">
          <SiteNav />
          <main>
            <Hero />
            <Sources />
            <WorkflowTour />
            <Matching />
            <DarkSteps />
            <SampleWorkspace />
            <Testimonials />
            <Faq />
          </main>
          <SiteFooter />
        </div>
      </div>
    </div>
  )
}
