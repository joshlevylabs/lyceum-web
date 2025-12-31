import { StaticPageLayout, ContentSection } from '@/components/StaticPageLayout'
import { Briefcase, MapPin, Clock, Heart, Rocket, Users, Coffee, Laptop } from '@phosphor-icons/react/dist/ssr'

export const metadata = {
  title: 'Careers | Lyceum',
  description: 'Join the Lyceum team and help transform how engineers work with measurement data.'
}

const benefits = [
  {
    icon: Heart,
    title: 'Health & Wellness',
    description: 'Comprehensive health, dental, and vision insurance for you and your family.'
  },
  {
    icon: Laptop,
    title: 'Remote-First',
    description: 'Work from anywhere. We believe great work happens when you have flexibility.'
  },
  {
    icon: Rocket,
    title: 'Growth Budget',
    description: '$2,000 annual learning budget for courses, conferences, and books.'
  },
  {
    icon: Coffee,
    title: 'Equipment Stipend',
    description: '$1,500 to set up your ideal home office and stay productive.'
  }
]

const openPositions = [
  {
    title: 'Senior Full-Stack Engineer',
    department: 'Engineering',
    location: 'Remote (US/EU)',
    type: 'Full-time',
    description: 'Help build the future of industrial analytics. Work on challenging data visualization and real-time processing problems.'
  },
  {
    title: 'Product Designer',
    department: 'Design',
    location: 'Remote (US/EU)',
    type: 'Full-time',
    description: 'Design intuitive interfaces for complex engineering workflows. Make powerful analytics feel effortless.'
  },
  {
    title: 'Customer Success Engineer',
    department: 'Customer Success',
    location: 'Remote (US)',
    type: 'Full-time',
    description: 'Help engineering teams get the most out of Lyceum. Technical background with audio/electronics experience preferred.'
  },
  {
    title: 'DevOps Engineer',
    department: 'Engineering',
    location: 'Remote (US/EU)',
    type: 'Full-time',
    description: 'Build and maintain the infrastructure that powers Lyceum. Focus on reliability, scalability, and security.'
  }
]

export default function CareersPage() {
  return (
    <StaticPageLayout
      title="Careers at Lyceum"
      subtitle="Join us in transforming how engineers work with measurement data."
      maxWidth="6xl"
    >
      <div className="space-y-16">
        {/* Mission statement */}
        <section>
          <div className="glass-card p-8 md:p-12">
            <div className="max-w-3xl">
              <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-6">Why Join Lyceum?</h2>
              <p className="text-lg text-foreground/70 leading-relaxed mb-4">
                We're building the platform we always wished we had as engineers. Every day,
                we help teams turn data chaos into actionable insights.
              </p>
              <p className="text-foreground/70 leading-relaxed">
                If you're excited about solving hard problems, working with cutting-edge
                technology, and making a real impact on how engineers work, we'd love to
                meet you.
              </p>
            </div>
          </div>
        </section>

        {/* Benefits */}
        <section>
          <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-8 text-center">Benefits & Perks</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {benefits.map((benefit) => {
              const Icon = benefit.icon
              return (
                <div key={benefit.title} className="glass-card p-6 text-center">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500/20 to-cyan-500/5 flex items-center justify-center mx-auto mb-4">
                    <Icon className="w-6 h-6 text-cyan-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">{benefit.title}</h3>
                  <p className="text-sm text-foreground/60">{benefit.description}</p>
                </div>
              )
            })}
          </div>
        </section>

        {/* Open positions */}
        <section>
          <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-8 text-center">Open Positions</h2>
          <div className="space-y-4">
            {openPositions.map((position) => (
              <div key={position.title} className="glass-card p-6 hover:border-cyan-500/30 transition-colors cursor-pointer group">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div>
                    <h3 className="text-xl font-semibold text-foreground group-hover:text-cyan-400 transition-colors mb-2">
                      {position.title}
                    </h3>
                    <p className="text-foreground/60 mb-3">{position.description}</p>
                    <div className="flex flex-wrap gap-4 text-sm text-foreground/50">
                      <span className="flex items-center gap-1">
                        <Briefcase className="w-4 h-4" />
                        {position.department}
                      </span>
                      <span className="flex items-center gap-1">
                        <MapPin className="w-4 h-4" />
                        {position.location}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        {position.type}
                      </span>
                    </div>
                  </div>
                  <div className="flex-shrink-0">
                    <span className="inline-flex items-center px-4 py-2 rounded-lg bg-cyan-500/20 text-cyan-400 text-sm font-medium group-hover:bg-cyan-500 group-hover:text-black transition-colors">
                      Apply Now
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Culture */}
        <section>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="glass-card p-8">
              <Users className="w-8 h-8 text-cyan-400 mb-4" />
              <h3 className="text-xl font-bold text-foreground mb-4">Our Culture</h3>
              <ul className="space-y-3 text-foreground/70">
                <li className="flex items-start gap-3">
                  <span className="text-cyan-400 mt-1">•</span>
                  <span><strong className="text-foreground">Transparency:</strong> Open communication and honest feedback</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-cyan-400 mt-1">•</span>
                  <span><strong className="text-foreground">Ownership:</strong> Take initiative and drive results</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-cyan-400 mt-1">•</span>
                  <span><strong className="text-foreground">Curiosity:</strong> Always learning, always improving</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-cyan-400 mt-1">•</span>
                  <span><strong className="text-foreground">Balance:</strong> Sustainable pace, no burnout culture</span>
                </li>
              </ul>
            </div>
            <div className="glass-card p-8">
              <Rocket className="w-8 h-8 text-cyan-400 mb-4" />
              <h3 className="text-xl font-bold text-foreground mb-4">How We Work</h3>
              <ul className="space-y-3 text-foreground/70">
                <li className="flex items-start gap-3">
                  <span className="text-cyan-400 mt-1">•</span>
                  <span><strong className="text-foreground">Async-first:</strong> Thoughtful written communication over meetings</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-cyan-400 mt-1">•</span>
                  <span><strong className="text-foreground">Deep work:</strong> Dedicated focus time, minimal interruptions</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-cyan-400 mt-1">•</span>
                  <span><strong className="text-foreground">Small teams:</strong> Autonomous squads with end-to-end ownership</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-cyan-400 mt-1">•</span>
                  <span><strong className="text-foreground">Ship fast:</strong> Iterate quickly, learn from users</span>
                </li>
              </ul>
            </div>
          </div>
        </section>

        {/* Don't see a fit? */}
        <section>
          <div className="glass-card p-8 md:p-12 text-center">
            <h2 className="text-2xl font-bold text-foreground mb-4">Don't See a Perfect Fit?</h2>
            <p className="text-foreground/60 mb-6 max-w-2xl mx-auto">
              We're always looking for talented people who are passionate about what we're building.
              Send us your resume and tell us how you'd like to contribute.
            </p>
            <a
              href="mailto:careers@lyceum.io"
              className="inline-flex items-center px-6 py-3 rounded-xl border border-foreground/20 text-foreground font-semibold hover:bg-foreground/5 transition-all"
            >
              Send Us Your Resume
            </a>
          </div>
        </section>
      </div>
    </StaticPageLayout>
  )
}
