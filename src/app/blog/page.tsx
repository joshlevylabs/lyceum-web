import { StaticPageLayout } from '@/components/StaticPageLayout'
import { Calendar, User, ArrowRight, Tag } from '@phosphor-icons/react/dist/ssr'
import Link from 'next/link'

export const metadata = {
  title: 'Blog | Lyceum',
  description: 'Insights on industrial analytics, engineering best practices, and product updates.'
}

const blogPosts = [
  {
    title: 'Introducing the Automated Test Sequencer',
    excerpt: 'Our new Sequencer feature lets you chain together test actions and post-processing steps into repeatable, auditable workflows.',
    author: 'Engineering Team',
    date: 'December 20, 2024',
    category: 'Product Updates',
    image: null,
    href: '#'
  },
  {
    title: '5 Ways to Reduce Defect Escape Rates in Manufacturing',
    excerpt: 'Learn proven strategies for catching quality issues before they reach your customers.',
    author: 'Quality Team',
    date: 'December 15, 2024',
    category: 'Best Practices',
    image: null,
    href: '#'
  },
  {
    title: 'Understanding Sigma-Based Control Limits',
    excerpt: 'A deep dive into how sigma-distributed control limits work and when to use them.',
    author: 'Data Science Team',
    date: 'December 10, 2024',
    category: 'Technical',
    image: null,
    href: '#'
  },
  {
    title: 'Customer Story: How AudioTech Reduced QC Time by 50%',
    excerpt: 'AudioTech shares their journey to faster, more reliable quality control with Lyceum.',
    author: 'Customer Success',
    date: 'December 5, 2024',
    category: 'Customer Stories',
    image: null,
    href: '#'
  },
  {
    title: 'Best Practices for Organizing Measurement Data',
    excerpt: 'Tips for structuring your projects, tags, and metadata for maximum efficiency.',
    author: 'Product Team',
    date: 'November 28, 2024',
    category: 'Best Practices',
    image: null,
    href: '#'
  },
  {
    title: 'New Integration: Keysight DAQ Support',
    excerpt: 'Lyceum now supports direct data ingestion from Keysight data acquisition systems.',
    author: 'Engineering Team',
    date: 'November 20, 2024',
    category: 'Product Updates',
    image: null,
    href: '#'
  }
]

const categories = ['All', 'Product Updates', 'Best Practices', 'Technical', 'Customer Stories']

export default function BlogPage() {
  return (
    <StaticPageLayout
      title="Blog"
      subtitle="Insights on industrial analytics, engineering best practices, and product updates."
      maxWidth="6xl"
    >
      <div className="space-y-12">
        {/* Categories */}
        <div className="flex flex-wrap gap-2">
          {categories.map((category, idx) => (
            <button
              key={category}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                idx === 0
                  ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                  : 'bg-foreground/5 text-foreground/60 hover:bg-foreground/10'
              }`}
            >
              {category}
            </button>
          ))}
        </div>

        {/* Featured post */}
        <section>
          <Link href={blogPosts[0].href} className="glass-card overflow-hidden group block">
            <div className="grid grid-cols-1 lg:grid-cols-2">
              <div className="aspect-video lg:aspect-auto bg-gradient-to-br from-cyan-500/10 to-purple-500/10 flex items-center justify-center">
                <span className="text-6xl font-bold text-foreground/10">L</span>
              </div>
              <div className="p-8 flex flex-col justify-center">
                <span className="text-xs text-cyan-400 font-medium mb-2">{blogPosts[0].category}</span>
                <h2 className="text-2xl font-bold text-foreground group-hover:text-cyan-400 transition-colors mb-3">
                  {blogPosts[0].title}
                </h2>
                <p className="text-foreground/60 mb-4">{blogPosts[0].excerpt}</p>
                <div className="flex items-center gap-4 text-sm text-foreground/50">
                  <span className="flex items-center gap-1">
                    <User className="w-4 h-4" />
                    {blogPosts[0].author}
                  </span>
                  <span className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    {blogPosts[0].date}
                  </span>
                </div>
              </div>
            </div>
          </Link>
        </section>

        {/* Post grid */}
        <section>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {blogPosts.slice(1).map((post) => (
              <Link
                key={post.title}
                href={post.href}
                className="glass-card overflow-hidden group"
              >
                <div className="aspect-video bg-gradient-to-br from-foreground/5 to-foreground/10 flex items-center justify-center">
                  <span className="text-4xl font-bold text-foreground/10">L</span>
                </div>
                <div className="p-6">
                  <div className="flex items-center gap-2 mb-3">
                    <Tag className="w-3 h-3 text-cyan-400" />
                    <span className="text-xs text-cyan-400 font-medium">{post.category}</span>
                  </div>
                  <h3 className="font-bold text-foreground group-hover:text-cyan-400 transition-colors mb-2 line-clamp-2">
                    {post.title}
                  </h3>
                  <p className="text-sm text-foreground/50 mb-4 line-clamp-2">
                    {post.excerpt}
                  </p>
                  <div className="flex items-center gap-4 text-xs text-foreground/40">
                    <span>{post.author}</span>
                    <span>{post.date}</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* Load more */}
        <div className="text-center">
          <button className="px-8 py-3 rounded-xl border border-foreground/20 text-foreground font-semibold hover:bg-foreground/5 transition-all">
            Load More Posts
          </button>
        </div>

        {/* Newsletter */}
        <section>
          <div className="glass-card p-8 md:p-12 text-center bg-gradient-to-br from-cyan-500/10 to-purple-500/5">
            <h2 className="text-2xl font-bold text-foreground mb-4">Stay Updated</h2>
            <p className="text-foreground/60 mb-6 max-w-xl mx-auto">
              Subscribe to our newsletter for the latest product updates, engineering insights, and best practices.
            </p>
            <form className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
              <input
                type="email"
                placeholder="Enter your email"
                className="flex-1 px-4 py-3 rounded-xl bg-foreground/5 border border-foreground/10 text-foreground placeholder:text-foreground/30 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 transition-colors"
              />
              <button
                type="submit"
                className="px-6 py-3 rounded-xl bg-cyan-500 text-black font-semibold hover:bg-cyan-400 transition-colors flex items-center justify-center gap-2"
              >
                Subscribe
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          </div>
        </section>
      </div>
    </StaticPageLayout>
  )
}
