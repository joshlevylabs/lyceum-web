import { StaticPageLayout } from '@/components/StaticPageLayout'
import { Play, Clock, BookOpen, ArrowRight } from '@phosphor-icons/react/dist/ssr'
import Link from 'next/link'

export const metadata = {
  title: 'Tutorials | Lyceum',
  description: 'Learn how to use Lyceum with step-by-step tutorials and video guides.'
}

const tutorials = [
  {
    title: 'Getting Started with Lyceum',
    description: 'Set up your account, import your first data, and create your first dashboard.',
    duration: '15 min',
    level: 'Beginner',
    thumbnail: null,
    href: '#'
  },
  {
    title: 'Importing Data from Klippel QC',
    description: 'Learn how to connect Lyceum to your Klippel QC system and automate data import.',
    duration: '12 min',
    level: 'Intermediate',
    thumbnail: null,
    href: '#'
  },
  {
    title: 'Creating Control Limits',
    description: 'Generate sigma-distributed control limits from your production data.',
    duration: '18 min',
    level: 'Intermediate',
    thumbnail: null,
    href: '#'
  },
  {
    title: 'Real-Time Yield Analysis',
    description: 'Set up real-time yield monitoring for your production line.',
    duration: '20 min',
    level: 'Advanced',
    thumbnail: null,
    href: '#'
  },
  {
    title: 'Team Collaboration Features',
    description: 'Share projects, manage permissions, and collaborate with your team.',
    duration: '10 min',
    level: 'Beginner',
    thumbnail: null,
    href: '#'
  },
  {
    title: 'Building Custom Dashboards',
    description: 'Create personalized dashboards with the charts and data you need.',
    duration: '25 min',
    level: 'Intermediate',
    thumbnail: null,
    href: '#'
  }
]

const getLevelColor = (level: string) => {
  switch (level) {
    case 'Beginner':
      return 'bg-green-500/20 text-green-400'
    case 'Intermediate':
      return 'bg-yellow-500/20 text-yellow-400'
    case 'Advanced':
      return 'bg-red-500/20 text-red-400'
    default:
      return 'bg-foreground/20 text-foreground'
  }
}

export default function TutorialsPage() {
  return (
    <StaticPageLayout
      title="Tutorials"
      subtitle="Step-by-step guides to help you master Lyceum."
      maxWidth="6xl"
    >
      <div className="space-y-12">
        {/* Featured tutorial */}
        <section>
          <div className="glass-card overflow-hidden">
            <div className="aspect-video bg-gradient-to-br from-cyan-500/10 to-purple-500/10 flex items-center justify-center relative group cursor-pointer">
              <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="w-20 h-20 rounded-full bg-cyan-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Play weight="fill" className="w-10 h-10 text-cyan-400 ml-1" />
              </div>
              <div className="absolute bottom-4 left-4 right-4">
                <div className="glass-card p-4">
                  <span className="text-xs text-cyan-400 font-medium">FEATURED TUTORIAL</span>
                  <h2 className="text-xl font-bold text-foreground mt-1">Complete Lyceum Walkthrough</h2>
                  <p className="text-sm text-foreground/60 mt-1">
                    A comprehensive tour of all Lyceum features in 30 minutes.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Tutorial grid */}
        <section>
          <h2 className="text-2xl font-bold text-foreground mb-6">All Tutorials</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {tutorials.map((tutorial) => (
              <Link
                key={tutorial.title}
                href={tutorial.href}
                className="glass-card overflow-hidden group"
              >
                {/* Thumbnail placeholder */}
                <div className="aspect-video bg-gradient-to-br from-foreground/5 to-foreground/10 flex items-center justify-center relative">
                  <Play weight="fill" className="w-12 h-12 text-foreground/20 group-hover:text-cyan-400/50 transition-colors" />
                  <div className="absolute bottom-2 right-2 px-2 py-1 rounded bg-black/50 text-white/70 text-xs font-mono flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {tutorial.duration}
                  </div>
                </div>
                <div className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${getLevelColor(tutorial.level)}`}>
                      {tutorial.level}
                    </span>
                  </div>
                  <h3 className="font-semibold text-foreground group-hover:text-cyan-400 transition-colors mb-1">
                    {tutorial.title}
                  </h3>
                  <p className="text-sm text-foreground/50 line-clamp-2">
                    {tutorial.description}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* Learning paths */}
        <section>
          <h2 className="text-2xl font-bold text-foreground mb-6">Learning Paths</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="glass-card p-6">
              <BookOpen className="w-8 h-8 text-cyan-400 mb-4" />
              <h3 className="text-xl font-bold text-foreground mb-2">For New Users</h3>
              <p className="text-foreground/60 text-sm mb-4">
                Start here if you're new to Lyceum. This path covers the essentials.
              </p>
              <ol className="space-y-2 text-sm mb-4">
                <li className="flex items-center gap-2 text-foreground/70">
                  <span className="w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-400 text-xs flex items-center justify-center">1</span>
                  Getting Started with Lyceum
                </li>
                <li className="flex items-center gap-2 text-foreground/70">
                  <span className="w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-400 text-xs flex items-center justify-center">2</span>
                  Team Collaboration Features
                </li>
                <li className="flex items-center gap-2 text-foreground/70">
                  <span className="w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-400 text-xs flex items-center justify-center">3</span>
                  Building Custom Dashboards
                </li>
              </ol>
              <Link href="#" className="text-cyan-400 hover:text-cyan-300 text-sm font-medium flex items-center gap-1">
                Start Learning <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
            <div className="glass-card p-6">
              <BookOpen className="w-8 h-8 text-purple-400 mb-4" />
              <h3 className="text-xl font-bold text-foreground mb-2">For Production Engineers</h3>
              <p className="text-foreground/60 text-sm mb-4">
                Learn how to use Lyceum for production quality control.
              </p>
              <ol className="space-y-2 text-sm mb-4">
                <li className="flex items-center gap-2 text-foreground/70">
                  <span className="w-5 h-5 rounded-full bg-purple-500/20 text-purple-400 text-xs flex items-center justify-center">1</span>
                  Importing Data from Klippel QC
                </li>
                <li className="flex items-center gap-2 text-foreground/70">
                  <span className="w-5 h-5 rounded-full bg-purple-500/20 text-purple-400 text-xs flex items-center justify-center">2</span>
                  Creating Control Limits
                </li>
                <li className="flex items-center gap-2 text-foreground/70">
                  <span className="w-5 h-5 rounded-full bg-purple-500/20 text-purple-400 text-xs flex items-center justify-center">3</span>
                  Real-Time Yield Analysis
                </li>
              </ol>
              <Link href="#" className="text-purple-400 hover:text-purple-300 text-sm font-medium flex items-center gap-1">
                Start Learning <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </section>

        {/* Request tutorial */}
        <section>
          <div className="glass-card p-8 text-center">
            <h2 className="text-xl font-bold text-foreground mb-2">Need a Specific Tutorial?</h2>
            <p className="text-foreground/60 mb-6">
              Let us know what topics you'd like us to cover next.
            </p>
            <Link
              href="/contact"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl border border-foreground/20 text-foreground font-semibold hover:bg-foreground/5 transition-all"
            >
              Request a Tutorial
            </Link>
          </div>
        </section>
      </div>
    </StaticPageLayout>
  )
}
