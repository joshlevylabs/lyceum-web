import { StaticPageLayout } from '@/components/StaticPageLayout'
import { Book, Rocket, Plugs, Code, Question, ArrowRight } from '@phosphor-icons/react/dist/ssr'
import Link from 'next/link'

export const metadata = {
  title: 'Documentation | Lyceum',
  description: 'Learn how to use Lyceum with our comprehensive documentation and guides.'
}

const docCategories = [
  {
    icon: Rocket,
    title: 'Getting Started',
    description: 'Set up your account and start analyzing data in minutes.',
    links: [
      { title: 'Quick Start Guide', href: '#' },
      { title: 'Account Setup', href: '#' },
      { title: 'First Data Import', href: '#' },
      { title: 'Dashboard Overview', href: '#' }
    ]
  },
  {
    icon: Plugs,
    title: 'Integrations',
    description: 'Connect Lyceum to your test equipment and data sources.',
    links: [
      { title: 'Klippel QC Integration', href: '#' },
      { title: 'APx500 Integration', href: '#' },
      { title: 'Custom Data Import', href: '#' },
      { title: 'API Integration', href: '#' }
    ]
  },
  {
    icon: Book,
    title: 'Features',
    description: 'Learn about all the features Lyceum has to offer.',
    links: [
      { title: 'Data Flagging & Search', href: '#' },
      { title: 'Control Limits', href: '#' },
      { title: 'Yield Analysis', href: '#' },
      { title: 'Team Collaboration', href: '#' }
    ]
  },
  {
    icon: Code,
    title: 'API Reference',
    description: 'Build custom integrations with our REST API.',
    links: [
      { title: 'Authentication', href: '#' },
      { title: 'Data Endpoints', href: '#' },
      { title: 'Webhooks', href: '#' },
      { title: 'Rate Limits', href: '#' }
    ]
  }
]

const popularArticles = [
  { title: 'How to import data from Klippel QC', category: 'Integrations' },
  { title: 'Setting up control limits for production', category: 'Features' },
  { title: 'Understanding yield calculations', category: 'Features' },
  { title: 'Configuring team permissions', category: 'Admin' },
  { title: 'Exporting data and reports', category: 'Features' }
]

export default function DocsPage() {
  return (
    <StaticPageLayout
      title="Documentation"
      subtitle="Everything you need to get the most out of Lyceum."
      maxWidth="6xl"
    >
      <div className="space-y-12">
        {/* Search */}
        <div className="glass-card p-6">
          <div className="relative">
            <input
              type="text"
              placeholder="Search documentation..."
              className="w-full px-4 py-3 pl-12 rounded-xl bg-foreground/5 border border-foreground/10 text-foreground placeholder:text-foreground/30 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 transition-colors"
            />
            <svg
              className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-foreground/30"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>

        {/* Categories */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {docCategories.map((category) => {
            const Icon = category.icon
            return (
              <div key={category.title} className="glass-card p-6">
                <div className="flex items-start gap-4 mb-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500/20 to-cyan-500/5 flex items-center justify-center flex-shrink-0">
                    <Icon className="w-6 h-6 text-cyan-400" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-foreground mb-1">{category.title}</h2>
                    <p className="text-sm text-foreground/60">{category.description}</p>
                  </div>
                </div>
                <ul className="space-y-2">
                  {category.links.map((link) => (
                    <li key={link.title}>
                      <Link
                        href={link.href}
                        className="flex items-center gap-2 text-foreground/70 hover:text-cyan-400 transition-colors py-1"
                      >
                        <ArrowRight className="w-4 h-4" />
                        {link.title}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )
          })}
        </div>

        {/* Popular articles */}
        <div>
          <h2 className="text-2xl font-bold text-foreground mb-6">Popular Articles</h2>
          <div className="glass-card divide-y divide-foreground/10">
            {popularArticles.map((article) => (
              <Link
                key={article.title}
                href="#"
                className="flex items-center justify-between p-4 hover:bg-foreground/5 transition-colors group"
              >
                <div>
                  <h3 className="font-medium text-foreground group-hover:text-cyan-400 transition-colors">
                    {article.title}
                  </h3>
                  <p className="text-sm text-foreground/50">{article.category}</p>
                </div>
                <ArrowRight className="w-5 h-5 text-foreground/30 group-hover:text-cyan-400 group-hover:translate-x-1 transition-all" />
              </Link>
            ))}
          </div>
        </div>

        {/* Help CTA */}
        <div className="glass-card p-8 text-center">
          <Question className="w-12 h-12 text-foreground/20 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-foreground mb-2">Can't find what you're looking for?</h2>
          <p className="text-foreground/60 mb-6">
            Our support team is here to help with any questions.
          </p>
          <Link
            href="/contact"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-cyan-500 text-black font-semibold hover:bg-cyan-400 transition-colors"
          >
            Contact Support
          </Link>
        </div>
      </div>
    </StaticPageLayout>
  )
}
