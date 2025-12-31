import { StaticPageLayout, ContentSection } from '@/components/StaticPageLayout'
import { Target, Lightbulb, Heart, Users, Rocket, Globe } from '@phosphor-icons/react/dist/ssr'

export const metadata = {
  title: 'About Us | Lyceum',
  description: 'Learn about Lyceum, our mission, and the team behind the industrial analytics platform.'
}

const values = [
  {
    icon: Target,
    title: 'Engineer-First Design',
    description: 'Every feature is built by engineers, for engineers. We understand your workflow because we live it.'
  },
  {
    icon: Lightbulb,
    title: 'Data Liberation',
    description: 'Your measurement data should work for you, not against you. We break down silos and unify your analytics.'
  },
  {
    icon: Heart,
    title: 'Crafted with Care',
    description: 'We obsess over the details—from millisecond response times to intuitive interfaces that just make sense.'
  }
]

const stats = [
  { value: '2019', label: 'Founded' },
  { value: '500+', label: 'Companies Served' },
  { value: '5M+', label: 'Data Points Daily' },
  { value: '99.9%', label: 'Uptime' }
]

export default function AboutPage() {
  return (
    <StaticPageLayout
      title="About Lyceum"
      subtitle="We're on a mission to transform how engineers work with measurement data."
      maxWidth="6xl"
    >
      <div className="space-y-16">
        {/* Mission */}
        <section>
          <div className="glass-card p-8 md:p-12">
            <div className="max-w-3xl">
              <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-6">Our Mission</h2>
              <p className="text-lg text-foreground/70 leading-relaxed mb-4">
                Engineers spend too much time wrestling with data instead of analyzing it. We're
                changing that.
              </p>
              <p className="text-foreground/70 leading-relaxed">
                Lyceum was born from a simple frustration: the tools that should help engineers
                make sense of their measurement data were instead creating more work. Data
                scattered across five different systems. Hours reformatting Excel files. Critical
                insights buried in folders no one could find.
              </p>
              <p className="text-foreground/70 leading-relaxed mt-4">
                We built Lyceum to be the platform we wished we had—a unified home for all your
                measurement data, with powerful analytics that just work. Today, engineering
                teams around the world use Lyceum to turn data chaos into actionable insights.
              </p>
            </div>
          </div>
        </section>

        {/* Stats */}
        <section>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {stats.map((stat) => (
              <div key={stat.label} className="glass-card p-6 text-center">
                <p className="text-3xl md:text-4xl font-bold text-cyan-400 mb-2">{stat.value}</p>
                <p className="text-sm text-foreground/50">{stat.label}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Values */}
        <section>
          <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-8 text-center">Our Values</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {values.map((value) => {
              const Icon = value.icon
              return (
                <div key={value.title} className="glass-card p-8 text-center">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-cyan-500/5 flex items-center justify-center mx-auto mb-6">
                    <Icon className="w-7 h-7 text-cyan-400" />
                  </div>
                  <h3 className="text-xl font-bold text-foreground mb-3">{value.title}</h3>
                  <p className="text-foreground/60 leading-relaxed">{value.description}</p>
                </div>
              )
            })}
          </div>
        </section>

        {/* Story */}
        <section>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="glass-card p-8">
              <div className="flex items-center gap-3 mb-6">
                <Rocket className="w-6 h-6 text-cyan-400" />
                <h3 className="text-xl font-bold text-foreground">How It Started</h3>
              </div>
              <div className="space-y-4 text-foreground/70 leading-relaxed">
                <p>
                  Lyceum started as an internal tool at a speaker manufacturing company. The
                  engineering team was drowning in test data from Klippel analyzers, Audio
                  Precision equipment, and custom DAQ systems—all in different formats, none
                  talking to each other.
                </p>
                <p>
                  So we built a solution. A unified platform that could ingest data from any
                  source, organize it intelligently, and make analysis effortless. Within weeks,
                  it was transforming how the team worked.
                </p>
              </div>
            </div>
            <div className="glass-card p-8">
              <div className="flex items-center gap-3 mb-6">
                <Globe className="w-6 h-6 text-cyan-400" />
                <h3 className="text-xl font-bold text-foreground">Where We're Going</h3>
              </div>
              <div className="space-y-4 text-foreground/70 leading-relaxed">
                <p>
                  Word spread. Other companies wanted in. That internal tool became Lyceum—a
                  full-fledged platform serving engineering teams around the world.
                </p>
                <p>
                  Today, we're focused on expanding our equipment integrations, enhancing our
                  analytics capabilities with machine learning, and building the collaboration
                  features that modern distributed teams need. Our goal: make Lyceum the
                  command center for every engineering team's measurement data.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Team placeholder */}
        <section>
          <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-8 text-center">Our Team</h2>
          <div className="glass-card p-8 md:p-12 text-center">
            <Users className="w-20 h-20 text-foreground/20 mx-auto mb-6" />
            <h3 className="text-xl font-semibold text-foreground mb-2">Engineers Building for Engineers</h3>
            <p className="text-foreground/60 max-w-2xl mx-auto">
              Our team brings together decades of experience in audio engineering, electronics
              manufacturing, and software development. We've walked in your shoes, and we're
              building the tools we always wished we had.
            </p>
          </div>
        </section>

        {/* CTA */}
        <section>
          <div className="glass-card p-8 md:p-12 text-center bg-gradient-to-br from-cyan-500/10 to-purple-500/5">
            <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-4">
              Ready to Transform Your Analytics Workflow?
            </h2>
            <p className="text-foreground/60 mb-8 max-w-2xl mx-auto">
              Join hundreds of engineering teams who have already made the switch to Lyceum.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a
                href="/signup"
                className="px-8 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-cyan-600 text-black font-semibold hover:from-cyan-400 hover:to-cyan-500 transition-all"
              >
                Start Free Trial
              </a>
              <a
                href="/contact"
                className="px-8 py-3 rounded-xl border border-foreground/20 text-foreground font-semibold hover:bg-foreground/5 transition-all"
              >
                Contact Sales
              </a>
            </div>
          </div>
        </section>
      </div>
    </StaticPageLayout>
  )
}
