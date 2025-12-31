import { StaticPageLayout, ContentSection } from '@/components/StaticPageLayout'
import { ShieldCheck, Lock, Eye, HardDrives, Key, Users } from '@phosphor-icons/react/dist/ssr'

export const metadata = {
  title: 'Security | Lyceum',
  description: 'Learn about Lyceum\'s security practices and how we protect your data.'
}

const securityFeatures = [
  {
    icon: Lock,
    title: 'End-to-End Encryption',
    description: 'All data in transit is encrypted using TLS 1.3. Data at rest is protected with AES-256 encryption.'
  },
  {
    icon: ShieldCheck,
    title: 'SOC 2 Type II Compliant',
    description: 'We maintain SOC 2 Type II compliance, demonstrating our commitment to security, availability, and confidentiality.'
  },
  {
    icon: Eye,
    title: 'Regular Audits',
    description: 'We conduct regular security audits and penetration testing with third-party security firms.'
  },
  {
    icon: HardDrives,
    title: 'Secure Infrastructure',
    description: 'Our infrastructure is hosted on enterprise-grade cloud providers with multiple layers of security.'
  },
  {
    icon: Key,
    title: 'Access Controls',
    description: 'Role-based access control (RBAC) ensures users only access data they\'re authorized to view.'
  },
  {
    icon: Users,
    title: 'Enterprise SSO',
    description: 'Support for SAML 2.0 and OAuth 2.0 enables seamless integration with your identity provider.'
  }
]

export default function SecurityPage() {
  return (
    <StaticPageLayout
      title="Security"
      subtitle="Your data security is our top priority. Learn about the measures we take to protect your information."
    >
      <div className="space-y-12">
        {/* Security features grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {securityFeatures.map((feature) => {
            const Icon = feature.icon
            return (
              <div key={feature.title} className="glass-card p-6">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500/20 to-cyan-500/5 flex items-center justify-center mb-4">
                  <Icon className="w-6 h-6 text-cyan-400" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">{feature.title}</h3>
                <p className="text-foreground/60 text-sm">{feature.description}</p>
              </div>
            )
          })}
        </div>

        <div className="space-y-8 text-foreground/70 leading-relaxed">
          <ContentSection title="Data Protection">
            <h3 className="text-lg font-semibold text-foreground mt-6 mb-3">Encryption</h3>
            <p>
              We use industry-standard encryption to protect your data:
            </p>
            <ul className="list-disc pl-6 mt-2 space-y-2">
              <li><strong>In Transit:</strong> TLS 1.3 encryption for all data transmission</li>
              <li><strong>At Rest:</strong> AES-256 encryption for stored data</li>
              <li><strong>Key Management:</strong> Hardware security modules (HSMs) for key storage</li>
            </ul>

            <h3 className="text-lg font-semibold text-foreground mt-6 mb-3">Data Isolation</h3>
            <p>
              Each customer's data is logically isolated within our multi-tenant architecture.
              We use database-level row security and application-level access controls to ensure
              complete data separation.
            </p>

            <h3 className="text-lg font-semibold text-foreground mt-6 mb-3">Backup and Recovery</h3>
            <p>
              We maintain automated backups with the following characteristics:
            </p>
            <ul className="list-disc pl-6 mt-2 space-y-2">
              <li>Continuous backups with point-in-time recovery</li>
              <li>Geographic redundancy across multiple regions</li>
              <li>Regular backup restoration testing</li>
              <li>30-day retention for standard backups</li>
            </ul>
          </ContentSection>

          <ContentSection title="Infrastructure Security">
            <h3 className="text-lg font-semibold text-foreground mt-6 mb-3">Cloud Infrastructure</h3>
            <p>
              Lyceum is hosted on enterprise-grade cloud infrastructure with:
            </p>
            <ul className="list-disc pl-6 mt-2 space-y-2">
              <li>ISO 27001, SOC 1/2/3, and FedRAMP certified data centers</li>
              <li>Virtual private cloud (VPC) network isolation</li>
              <li>DDoS protection and web application firewall (WAF)</li>
              <li>24/7 infrastructure monitoring and alerting</li>
            </ul>

            <h3 className="text-lg font-semibold text-foreground mt-6 mb-3">Network Security</h3>
            <p>
              Our network is protected by multiple layers of security:
            </p>
            <ul className="list-disc pl-6 mt-2 space-y-2">
              <li>Firewall rules restricting access to essential services only</li>
              <li>Intrusion detection and prevention systems</li>
              <li>Regular vulnerability scanning</li>
              <li>Network segmentation and micro-segmentation</li>
            </ul>
          </ContentSection>

          <ContentSection title="Application Security">
            <h3 className="text-lg font-semibold text-foreground mt-6 mb-3">Secure Development</h3>
            <p>
              Our development practices include:
            </p>
            <ul className="list-disc pl-6 mt-2 space-y-2">
              <li>Security-focused code reviews</li>
              <li>Automated security testing in CI/CD pipelines</li>
              <li>Static and dynamic application security testing (SAST/DAST)</li>
              <li>Dependency vulnerability scanning</li>
            </ul>

            <h3 className="text-lg font-semibold text-foreground mt-6 mb-3">Authentication</h3>
            <p>
              We support multiple authentication methods:
            </p>
            <ul className="list-disc pl-6 mt-2 space-y-2">
              <li>Email and password with strong password requirements</li>
              <li>Multi-factor authentication (MFA) with TOTP or hardware keys</li>
              <li>SAML 2.0 and OAuth 2.0 for enterprise SSO</li>
              <li>Session management with configurable timeouts</li>
            </ul>
          </ContentSection>

          <ContentSection title="Compliance">
            <p>
              Lyceum maintains compliance with industry standards and regulations:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
              <div className="p-4 glass-card">
                <h4 className="font-semibold text-foreground mb-1">SOC 2 Type II</h4>
                <p className="text-sm">Audited annually for security, availability, and confidentiality</p>
              </div>
              <div className="p-4 glass-card">
                <h4 className="font-semibold text-foreground mb-1">GDPR</h4>
                <p className="text-sm">Compliant with EU data protection regulations</p>
              </div>
              <div className="p-4 glass-card">
                <h4 className="font-semibold text-foreground mb-1">ISO 27001</h4>
                <p className="text-sm">Information security management system certified</p>
              </div>
              <div className="p-4 glass-card">
                <h4 className="font-semibold text-foreground mb-1">CCPA</h4>
                <p className="text-sm">Compliant with California Consumer Privacy Act</p>
              </div>
            </div>
          </ContentSection>

          <ContentSection title="Incident Response">
            <p>
              We maintain a comprehensive incident response program:
            </p>
            <ul className="list-disc pl-6 mt-2 space-y-2">
              <li>24/7 security monitoring and alerting</li>
              <li>Documented incident response procedures</li>
              <li>Regular tabletop exercises and drills</li>
              <li>Post-incident analysis and continuous improvement</li>
            </ul>
            <p className="mt-4">
              In the event of a security incident that affects your data, we will notify you
              within 72 hours as required by applicable regulations.
            </p>
          </ContentSection>

          <ContentSection title="Responsible Disclosure">
            <p>
              We welcome reports from security researchers. If you discover a vulnerability,
              please report it responsibly:
            </p>
            <div className="mt-4 p-6 glass-card">
              <p className="font-semibold text-foreground">Security Team</p>
              <p>Email: security@lyceum.io</p>
              <p className="mt-2 text-sm">
                We aim to acknowledge reports within 24 hours and provide updates on remediation progress.
              </p>
            </div>
          </ContentSection>

          <ContentSection title="Contact">
            <p>
              For security-related questions or concerns, please contact our security team:
            </p>
            <div className="mt-4 p-6 glass-card">
              <p className="font-semibold text-foreground">Lyceum Security Team</p>
              <p>Email: security@lyceum.io</p>
              <p>PGP Key: Available upon request</p>
            </div>
          </ContentSection>
        </div>
      </div>
    </StaticPageLayout>
  )
}
