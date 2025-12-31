import { StaticPageLayout, ContentSection } from '@/components/StaticPageLayout'

export const metadata = {
  title: 'Privacy Policy | Lyceum',
  description: 'Learn how Lyceum collects, uses, and protects your personal information.'
}

export default function PrivacyPolicyPage() {
  return (
    <StaticPageLayout
      title="Privacy Policy"
      subtitle="Last updated: December 2024"
    >
      <div className="space-y-8 text-foreground/70 leading-relaxed">
        <ContentSection title="Introduction">
          <p>
            At Lyceum, we take your privacy seriously. This Privacy Policy explains how we collect,
            use, disclose, and safeguard your information when you use our industrial analytics platform.
          </p>
          <p>
            Please read this privacy policy carefully. If you do not agree with the terms of this
            privacy policy, please do not access the platform.
          </p>
        </ContentSection>

        <ContentSection title="Information We Collect">
          <h3 className="text-lg font-semibold text-foreground mt-6 mb-3">Personal Information</h3>
          <p>We may collect personal information that you voluntarily provide when you:</p>
          <ul className="list-disc pl-6 mt-2 space-y-2">
            <li>Register for an account</li>
            <li>Subscribe to our services</li>
            <li>Request customer support</li>
            <li>Participate in surveys or promotions</li>
          </ul>
          <p className="mt-4">This information may include:</p>
          <ul className="list-disc pl-6 mt-2 space-y-2">
            <li>Name and email address</li>
            <li>Company name and job title</li>
            <li>Billing information</li>
            <li>Phone number</li>
          </ul>

          <h3 className="text-lg font-semibold text-foreground mt-6 mb-3">Usage Data</h3>
          <p>
            We automatically collect certain information when you access our platform, including:
          </p>
          <ul className="list-disc pl-6 mt-2 space-y-2">
            <li>Device and browser information</li>
            <li>IP address and location data</li>
            <li>Pages visited and features used</li>
            <li>Time spent on the platform</li>
          </ul>

          <h3 className="text-lg font-semibold text-foreground mt-6 mb-3">Measurement Data</h3>
          <p>
            The measurement and analytics data you upload to Lyceum remains your property.
            We process this data solely to provide our services to you and do not use it for
            any other purpose without your explicit consent.
          </p>
        </ContentSection>

        <ContentSection title="How We Use Your Information">
          <p>We use the information we collect to:</p>
          <ul className="list-disc pl-6 mt-2 space-y-2">
            <li>Provide, maintain, and improve our services</li>
            <li>Process transactions and send related information</li>
            <li>Send technical notices and support messages</li>
            <li>Respond to your comments and questions</li>
            <li>Analyze usage patterns to improve user experience</li>
            <li>Detect and prevent fraudulent or unauthorized activity</li>
          </ul>
        </ContentSection>

        <ContentSection title="Data Sharing and Disclosure">
          <p>We may share your information in the following circumstances:</p>
          <ul className="list-disc pl-6 mt-2 space-y-2">
            <li><strong>Service Providers:</strong> With third-party vendors who assist in providing our services</li>
            <li><strong>Legal Requirements:</strong> When required by law or to protect our rights</li>
            <li><strong>Business Transfers:</strong> In connection with a merger, acquisition, or sale of assets</li>
            <li><strong>With Your Consent:</strong> When you have given us explicit permission</li>
          </ul>
          <p className="mt-4">
            We do not sell your personal information to third parties.
          </p>
        </ContentSection>

        <ContentSection title="Data Security">
          <p>
            We implement appropriate technical and organizational measures to protect your personal
            information against unauthorized access, alteration, disclosure, or destruction. These
            measures include:
          </p>
          <ul className="list-disc pl-6 mt-2 space-y-2">
            <li>End-to-end encryption for data in transit</li>
            <li>AES-256 encryption for data at rest</li>
            <li>Regular security audits and penetration testing</li>
            <li>Access controls and authentication mechanisms</li>
            <li>Employee training on data protection</li>
          </ul>
        </ContentSection>

        <ContentSection title="Your Rights">
          <p>Depending on your location, you may have the following rights:</p>
          <ul className="list-disc pl-6 mt-2 space-y-2">
            <li>Access your personal information</li>
            <li>Correct inaccurate data</li>
            <li>Request deletion of your data</li>
            <li>Object to or restrict processing</li>
            <li>Data portability</li>
            <li>Withdraw consent</li>
          </ul>
          <p className="mt-4">
            To exercise these rights, please contact us at privacy@lyceum.io
          </p>
        </ContentSection>

        <ContentSection title="Data Retention">
          <p>
            We retain your personal information for as long as necessary to fulfill the purposes
            outlined in this policy, unless a longer retention period is required by law. When
            you delete your account, we will delete or anonymize your personal information within
            30 days, except where we are required to retain it for legal purposes.
          </p>
        </ContentSection>

        <ContentSection title="International Transfers">
          <p>
            Your information may be transferred to and processed in countries other than your
            country of residence. We ensure appropriate safeguards are in place to protect your
            information in accordance with this privacy policy.
          </p>
        </ContentSection>

        <ContentSection title="Changes to This Policy">
          <p>
            We may update this privacy policy from time to time. We will notify you of any changes
            by posting the new policy on this page and updating the "Last updated" date. You are
            advised to review this policy periodically for any changes.
          </p>
        </ContentSection>

        <ContentSection title="Contact Us">
          <p>
            If you have questions or concerns about this privacy policy, please contact us at:
          </p>
          <div className="mt-4 p-6 glass-card">
            <p className="font-semibold text-foreground">Lyceum Privacy Team</p>
            <p>Email: privacy@lyceum.io</p>
            <p>Address: [Company Address]</p>
          </div>
        </ContentSection>
      </div>
    </StaticPageLayout>
  )
}
