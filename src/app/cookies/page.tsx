import { StaticPageLayout, ContentSection } from '@/components/StaticPageLayout'

export const metadata = {
  title: 'Cookie Policy | Lyceum',
  description: 'Learn how Lyceum uses cookies and similar technologies.'
}

export default function CookiePolicyPage() {
  return (
    <StaticPageLayout
      title="Cookie Policy"
      subtitle="Last updated: December 2024"
    >
      <div className="space-y-8 text-foreground/70 leading-relaxed">
        <ContentSection title="What Are Cookies">
          <p>
            Cookies are small text files that are placed on your device when you visit a website.
            They are widely used to make websites work more efficiently and to provide information
            to website owners.
          </p>
          <p>
            We use cookies and similar technologies (such as local storage and pixels) to enhance
            your experience on our platform.
          </p>
        </ContentSection>

        <ContentSection title="How We Use Cookies">
          <p>We use cookies for the following purposes:</p>

          <h3 className="text-lg font-semibold text-foreground mt-6 mb-3">Essential Cookies</h3>
          <p>
            These cookies are necessary for the platform to function properly. They enable core
            functionality such as:
          </p>
          <ul className="list-disc pl-6 mt-2 space-y-2">
            <li>User authentication and session management</li>
            <li>Security features and fraud prevention</li>
            <li>Load balancing and server optimization</li>
            <li>Remembering your preferences and settings</li>
          </ul>

          <h3 className="text-lg font-semibold text-foreground mt-6 mb-3">Performance Cookies</h3>
          <p>
            These cookies help us understand how visitors interact with our platform by collecting
            and reporting information anonymously:
          </p>
          <ul className="list-disc pl-6 mt-2 space-y-2">
            <li>Page load times and performance metrics</li>
            <li>Error tracking and debugging</li>
            <li>Feature usage analytics</li>
          </ul>

          <h3 className="text-lg font-semibold text-foreground mt-6 mb-3">Functional Cookies</h3>
          <p>
            These cookies enable enhanced functionality and personalization:
          </p>
          <ul className="list-disc pl-6 mt-2 space-y-2">
            <li>Language and region preferences</li>
            <li>Dashboard customization settings</li>
            <li>Chart and visualization preferences</li>
          </ul>

          <h3 className="text-lg font-semibold text-foreground mt-6 mb-3">Analytics Cookies</h3>
          <p>
            We use analytics cookies to understand how our platform is used and improve the
            user experience:
          </p>
          <ul className="list-disc pl-6 mt-2 space-y-2">
            <li>Which features are most popular</li>
            <li>How users navigate through the platform</li>
            <li>Where users encounter issues</li>
          </ul>
        </ContentSection>

        <ContentSection title="Cookies We Use">
          <div className="overflow-x-auto mt-4">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-foreground/10">
                  <th className="py-3 px-4 font-semibold text-foreground">Cookie Name</th>
                  <th className="py-3 px-4 font-semibold text-foreground">Purpose</th>
                  <th className="py-3 px-4 font-semibold text-foreground">Duration</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-foreground/10">
                <tr>
                  <td className="py-3 px-4 font-mono text-sm">lyceum_session</td>
                  <td className="py-3 px-4">User authentication</td>
                  <td className="py-3 px-4">Session</td>
                </tr>
                <tr>
                  <td className="py-3 px-4 font-mono text-sm">lyceum_preferences</td>
                  <td className="py-3 px-4">User preferences</td>
                  <td className="py-3 px-4">1 year</td>
                </tr>
                <tr>
                  <td className="py-3 px-4 font-mono text-sm">lyceum_csrf</td>
                  <td className="py-3 px-4">Security token</td>
                  <td className="py-3 px-4">Session</td>
                </tr>
                <tr>
                  <td className="py-3 px-4 font-mono text-sm">_ga, _gid</td>
                  <td className="py-3 px-4">Google Analytics</td>
                  <td className="py-3 px-4">2 years / 24 hours</td>
                </tr>
              </tbody>
            </table>
          </div>
        </ContentSection>

        <ContentSection title="Third-Party Cookies">
          <p>
            We may use third-party services that set their own cookies. These include:
          </p>
          <ul className="list-disc pl-6 mt-2 space-y-2">
            <li><strong>Google Analytics:</strong> For understanding platform usage</li>
            <li><strong>Stripe:</strong> For payment processing</li>
            <li><strong>Intercom:</strong> For customer support chat</li>
          </ul>
          <p className="mt-4">
            We encourage you to review the privacy policies of these third-party services.
          </p>
        </ContentSection>

        <ContentSection title="Managing Cookies">
          <h3 className="text-lg font-semibold text-foreground mt-6 mb-3">Browser Settings</h3>
          <p>
            Most web browsers allow you to control cookies through their settings. You can:
          </p>
          <ul className="list-disc pl-6 mt-2 space-y-2">
            <li>View cookies stored on your device</li>
            <li>Delete all or specific cookies</li>
            <li>Block cookies from specific websites</li>
            <li>Block all cookies</li>
          </ul>
          <p className="mt-4">
            Please note that blocking essential cookies may affect the functionality of our platform.
          </p>

          <h3 className="text-lg font-semibold text-foreground mt-6 mb-3">Our Cookie Settings</h3>
          <p>
            You can manage your cookie preferences in your account settings. We provide options to:
          </p>
          <ul className="list-disc pl-6 mt-2 space-y-2">
            <li>Opt out of analytics cookies</li>
            <li>Manage functional cookie preferences</li>
            <li>Control third-party integrations</li>
          </ul>
        </ContentSection>

        <ContentSection title="Do Not Track">
          <p>
            Some browsers have a "Do Not Track" feature that signals to websites that you do not
            want your online activity tracked. We currently do not respond to Do Not Track signals,
            but you can manage cookies through your browser settings and our cookie preferences.
          </p>
        </ContentSection>

        <ContentSection title="Updates to This Policy">
          <p>
            We may update this Cookie Policy from time to time to reflect changes in our practices
            or for operational, legal, or regulatory reasons. We will notify you of any material
            changes by updating the date at the top of this policy.
          </p>
        </ContentSection>

        <ContentSection title="Contact Us">
          <p>
            If you have questions about our use of cookies, please contact us at:
          </p>
          <div className="mt-4 p-6 glass-card">
            <p className="font-semibold text-foreground">Lyceum Privacy Team</p>
            <p>Email: privacy@lyceum.io</p>
          </div>
        </ContentSection>
      </div>
    </StaticPageLayout>
  )
}
