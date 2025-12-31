import { StaticPageLayout, ContentSection } from '@/components/StaticPageLayout'
import { Code, Key, WebhooksLogo, Lightning, ArrowRight } from '@phosphor-icons/react/dist/ssr'
import Link from 'next/link'

export const metadata = {
  title: 'API Reference | Lyceum',
  description: 'Build custom integrations with the Lyceum REST API.'
}

const apiEndpoints = [
  {
    method: 'GET',
    path: '/api/v1/projects',
    description: 'List all projects'
  },
  {
    method: 'POST',
    path: '/api/v1/data/upload',
    description: 'Upload measurement data'
  },
  {
    method: 'GET',
    path: '/api/v1/measurements/{id}',
    description: 'Get measurement details'
  },
  {
    method: 'POST',
    path: '/api/v1/analysis/limits',
    description: 'Generate control limits'
  },
  {
    method: 'GET',
    path: '/api/v1/reports/yield',
    description: 'Get yield report'
  }
]

const features = [
  {
    icon: Key,
    title: 'API Keys',
    description: 'Secure authentication using API keys with configurable permissions and expiration.'
  },
  {
    icon: WebhooksLogo,
    title: 'Webhooks',
    description: 'Receive real-time notifications when data is uploaded or analysis completes.'
  },
  {
    icon: Lightning,
    title: 'Rate Limits',
    description: 'Generous rate limits with burst capacity for high-volume operations.'
  }
]

export default function ApiReferencePage() {
  return (
    <StaticPageLayout
      title="API Reference"
      subtitle="Build custom integrations with the Lyceum REST API."
      maxWidth="6xl"
    >
      <div className="space-y-12">
        {/* Quick start */}
        <section>
          <div className="glass-card p-8">
            <div className="flex items-start gap-4 mb-6">
              <Code className="w-8 h-8 text-cyan-400 flex-shrink-0" />
              <div>
                <h2 className="text-2xl font-bold text-foreground mb-2">Quick Start</h2>
                <p className="text-foreground/60">
                  Get started with the Lyceum API in minutes. All API requests require authentication
                  using an API key.
                </p>
              </div>
            </div>
            <div className="bg-background/50 rounded-xl p-4 font-mono text-sm overflow-x-auto">
              <pre className="text-foreground/80">
{`curl -X GET "https://api.lyceum.io/v1/projects" \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json"`}
              </pre>
            </div>
          </div>
        </section>

        {/* Features */}
        <section>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {features.map((feature) => {
              const Icon = feature.icon
              return (
                <div key={feature.title} className="glass-card p-6">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500/20 to-cyan-500/5 flex items-center justify-center mb-4">
                    <Icon className="w-6 h-6 text-cyan-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">{feature.title}</h3>
                  <p className="text-sm text-foreground/60">{feature.description}</p>
                </div>
              )
            })}
          </div>
        </section>

        {/* Endpoints */}
        <section>
          <h2 className="text-2xl font-bold text-foreground mb-6">Endpoints</h2>
          <div className="glass-card overflow-hidden">
            <div className="divide-y divide-foreground/10">
              {apiEndpoints.map((endpoint) => (
                <Link
                  key={endpoint.path}
                  href="#"
                  className="flex items-center gap-4 p-4 hover:bg-foreground/5 transition-colors group"
                >
                  <span className={`px-2 py-1 rounded text-xs font-mono font-semibold ${
                    endpoint.method === 'GET'
                      ? 'bg-green-500/20 text-green-400'
                      : 'bg-blue-500/20 text-blue-400'
                  }`}>
                    {endpoint.method}
                  </span>
                  <code className="font-mono text-sm text-foreground flex-1">{endpoint.path}</code>
                  <span className="text-sm text-foreground/50">{endpoint.description}</span>
                  <ArrowRight className="w-4 h-4 text-foreground/30 group-hover:text-cyan-400 group-hover:translate-x-1 transition-all" />
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* Authentication */}
        <section>
          <ContentSection title="Authentication">
            <p className="text-foreground/70 mb-4">
              All API requests require authentication using an API key. You can generate API keys
              from your account settings.
            </p>
            <div className="bg-background/50 rounded-xl p-4 font-mono text-sm mb-4">
              <code className="text-foreground/80">Authorization: Bearer YOUR_API_KEY</code>
            </div>
            <p className="text-foreground/70">
              API keys can be scoped to specific permissions (read-only, read-write, admin) and
              can be configured with expiration dates for security.
            </p>
          </ContentSection>
        </section>

        {/* Rate limits */}
        <section>
          <ContentSection title="Rate Limits">
            <p className="text-foreground/70 mb-4">
              API requests are rate-limited to ensure fair usage and platform stability.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 glass-card">
                <p className="text-2xl font-bold text-cyan-400">1,000</p>
                <p className="text-sm text-foreground/50">Requests per minute</p>
              </div>
              <div className="p-4 glass-card">
                <p className="text-2xl font-bold text-cyan-400">100MB</p>
                <p className="text-sm text-foreground/50">Max upload size</p>
              </div>
              <div className="p-4 glass-card">
                <p className="text-2xl font-bold text-cyan-400">10,000</p>
                <p className="text-sm text-foreground/50">Requests per hour</p>
              </div>
            </div>
          </ContentSection>
        </section>

        {/* SDKs */}
        <section>
          <div className="glass-card p-8">
            <h2 className="text-2xl font-bold text-foreground mb-4">Client Libraries</h2>
            <p className="text-foreground/60 mb-6">
              We provide official SDKs for popular programming languages to make integration easier.
            </p>
            <div className="flex flex-wrap gap-4">
              <span className="px-4 py-2 rounded-lg bg-foreground/10 text-foreground/70 font-mono text-sm">
                Python
              </span>
              <span className="px-4 py-2 rounded-lg bg-foreground/10 text-foreground/70 font-mono text-sm">
                JavaScript/Node
              </span>
              <span className="px-4 py-2 rounded-lg bg-foreground/10 text-foreground/70 font-mono text-sm">
                C#/.NET
              </span>
              <span className="px-4 py-2 rounded-lg bg-foreground/10 text-foreground/30 font-mono text-sm">
                Go (coming soon)
              </span>
            </div>
          </div>
        </section>

        {/* Help */}
        <section>
          <div className="glass-card p-8 text-center">
            <h2 className="text-xl font-bold text-foreground mb-2">Need Help with the API?</h2>
            <p className="text-foreground/60 mb-6">
              Our developer support team can help you build your integration.
            </p>
            <Link
              href="/contact"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-cyan-500 text-black font-semibold hover:bg-cyan-400 transition-colors"
            >
              Contact Developer Support
            </Link>
          </div>
        </section>
      </div>
    </StaticPageLayout>
  )
}
