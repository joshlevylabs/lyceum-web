import { StaticPageLayout, ContentSection } from '@/components/StaticPageLayout'
import { Handshake, Plugs, Storefront, GraduationCap, ArrowRight } from '@phosphor-icons/react/dist/ssr'

export const metadata = {
  title: 'Partners | Lyceum',
  description: 'Partner with Lyceum to bring industrial analytics to more engineering teams.'
}

const partnerTypes = [
  {
    icon: Plugs,
    title: 'Technology Partners',
    description: 'Integrate your hardware or software with Lyceum to provide seamless experiences for mutual customers.',
    benefits: [
      'Native integration support',
      'Joint marketing opportunities',
      'Technical collaboration',
      'Early access to new features'
    ]
  },
  {
    icon: Storefront,
    title: 'Reseller Partners',
    description: 'Add Lyceum to your product portfolio and help your customers modernize their analytics workflow.',
    benefits: [
      'Competitive margins',
      'Sales enablement resources',
      'Deal registration program',
      'Co-selling opportunities'
    ]
  },
  {
    icon: GraduationCap,
    title: 'Consulting Partners',
    description: 'Deliver implementation and training services to help customers get the most from Lyceum.',
    benefits: [
      'Partner certification program',
      'Implementation playbooks',
      'Referral commissions',
      'Priority support access'
    ]
  }
]

const currentPartners = [
  { name: 'Klippel', category: 'Technology' },
  { name: 'Audio Precision', category: 'Technology' },
  { name: 'Keysight', category: 'Technology' },
  { name: 'National Instruments', category: 'Technology' }
]

export default function PartnersPage() {
  return (
    <StaticPageLayout
      title="Partner with Lyceum"
      subtitle="Join our partner ecosystem and help engineering teams transform their analytics workflow."
      maxWidth="6xl"
    >
      <div className="space-y-16">
        {/* Intro */}
        <section>
          <div className="glass-card p-8 md:p-12">
            <div className="flex items-start gap-6">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-500/30 to-cyan-500/10 flex items-center justify-center flex-shrink-0">
                <Handshake className="w-8 h-8 text-cyan-400" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-foreground mb-4">Why Partner with Us?</h2>
                <p className="text-foreground/70 leading-relaxed mb-4">
                  Lyceum is building the future of industrial analytics. Our platform integrates
                  with leading test equipment and serves engineering teams across manufacturing,
                  audio engineering, and R&D.
                </p>
                <p className="text-foreground/70 leading-relaxed">
                  By partnering with Lyceum, you can expand your reach, add value to your
                  offerings, and help customers unlock the full potential of their measurement data.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Partner types */}
        <section>
          <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-8 text-center">Partnership Programs</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {partnerTypes.map((type) => {
              const Icon = type.icon
              return (
                <div key={type.title} className="glass-card p-8 h-full flex flex-col">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-cyan-500/5 flex items-center justify-center mb-6">
                    <Icon className="w-7 h-7 text-cyan-400" />
                  </div>
                  <h3 className="text-xl font-bold text-foreground mb-3">{type.title}</h3>
                  <p className="text-foreground/60 mb-6">{type.description}</p>
                  <div className="mt-auto">
                    <p className="text-sm font-semibold text-foreground mb-3">Benefits include:</p>
                    <ul className="space-y-2">
                      {type.benefits.map((benefit, idx) => (
                        <li key={idx} className="flex items-center gap-2 text-sm text-foreground/70">
                          <svg className="w-4 h-4 text-cyan-400 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                          {benefit}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )
            })}
          </div>
        </section>

        {/* Current partners */}
        <section>
          <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-8 text-center">Our Partners</h2>
          <div className="glass-card p-8">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {currentPartners.map((partner) => (
                <div key={partner.name} className="text-center p-6 rounded-xl bg-foreground/5">
                  <div className="w-16 h-16 rounded-xl bg-foreground/10 flex items-center justify-center mx-auto mb-3">
                    <span className="text-2xl font-bold text-foreground/30">
                      {partner.name.charAt(0)}
                    </span>
                  </div>
                  <p className="font-semibold text-foreground">{partner.name}</p>
                  <p className="text-xs text-foreground/50">{partner.category}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* How it works */}
        <section>
          <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-8 text-center">How to Get Started</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="glass-card p-6 text-center">
              <div className="w-10 h-10 rounded-full bg-cyan-500/20 flex items-center justify-center mx-auto mb-4">
                <span className="text-cyan-400 font-bold">1</span>
              </div>
              <h3 className="font-semibold text-foreground mb-2">Apply</h3>
              <p className="text-sm text-foreground/60">
                Fill out our partner application form with details about your business.
              </p>
            </div>
            <div className="glass-card p-6 text-center">
              <div className="w-10 h-10 rounded-full bg-cyan-500/20 flex items-center justify-center mx-auto mb-4">
                <span className="text-cyan-400 font-bold">2</span>
              </div>
              <h3 className="font-semibold text-foreground mb-2">Connect</h3>
              <p className="text-sm text-foreground/60">
                Our partnerships team will reach out to discuss fit and opportunities.
              </p>
            </div>
            <div className="glass-card p-6 text-center">
              <div className="w-10 h-10 rounded-full bg-cyan-500/20 flex items-center justify-center mx-auto mb-4">
                <span className="text-cyan-400 font-bold">3</span>
              </div>
              <h3 className="font-semibold text-foreground mb-2">Grow</h3>
              <p className="text-sm text-foreground/60">
                Start collaborating and unlock new opportunities together.
              </p>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section>
          <div className="glass-card p-8 md:p-12 text-center bg-gradient-to-br from-cyan-500/10 to-purple-500/5">
            <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-4">
              Ready to Partner?
            </h2>
            <p className="text-foreground/60 mb-8 max-w-2xl mx-auto">
              We're always looking for strategic partners who share our vision of making
              industrial analytics accessible to every engineering team.
            </p>
            <a
              href="mailto:partners@lyceum.io"
              className="inline-flex items-center gap-2 px-8 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-cyan-600 text-black font-semibold hover:from-cyan-400 hover:to-cyan-500 transition-all"
            >
              Become a Partner
              <ArrowRight className="w-5 h-5" />
            </a>
          </div>
        </section>
      </div>
    </StaticPageLayout>
  )
}
