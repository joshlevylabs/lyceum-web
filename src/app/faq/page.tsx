import { StaticPageLayout, FAQAccordion } from '@/components/StaticPageLayout'
import Link from 'next/link'

export const metadata = {
  title: 'FAQ | Lyceum',
  description: 'Frequently asked questions about Lyceum and industrial analytics.'
}

const faqCategories = [
  {
    title: 'Getting Started',
    faqs: [
      {
        question: 'What is Lyceum?',
        answer: 'Lyceum is a cloud-based industrial analytics platform designed for engineers and analysts. It allows you to collect, analyze, and visualize measurement data from various test equipment in one centralized location. Think of it as the command center for all your measurement data.'
      },
      {
        question: 'How do I get started with Lyceum?',
        answer: 'Getting started is easy! Sign up for a free 30-day trial, and you\'ll have immediate access to all features. Our onboarding wizard will guide you through connecting your first data source and creating your first dashboard. Most users are up and running within 15 minutes.'
      },
      {
        question: 'What equipment does Lyceum support?',
        answer: 'Lyceum supports a wide range of test equipment including Klippel QC analyzers, Audio Precision APx500 series, Keysight DAQ systems, and many more. We also support custom data formats through our API. Check our Plugins page for the full list of supported integrations.'
      },
      {
        question: 'Can I import existing data into Lyceum?',
        answer: 'Yes! Lyceum supports importing historical data from CSV, Excel, and various proprietary formats. Our data import wizard helps you map your data fields and set up the correct metadata. You can also use our API for programmatic bulk imports.'
      }
    ]
  },
  {
    title: 'Pricing & Plans',
    faqs: [
      {
        question: 'Is there a free trial?',
        answer: 'Yes, we offer a 30-day free trial with full access to all features. No credit card required to start. At the end of your trial, you can choose the plan that best fits your needs.'
      },
      {
        question: 'What\'s the difference between the plans?',
        answer: 'Our Starter plan is perfect for small teams getting started with analytics. Professional adds advanced features like control limits, API access, and priority support. Enterprise includes SSO, dedicated support, and custom integrations. See our Pricing page for a detailed comparison.'
      },
      {
        question: 'Can I change plans later?',
        answer: 'Absolutely! You can upgrade or downgrade your plan at any time. When upgrading, you\'ll get immediate access to new features. When downgrading, the change takes effect at your next billing cycle.'
      },
      {
        question: 'Do you offer discounts for annual billing?',
        answer: 'Yes, you can save 20% by choosing annual billing instead of monthly. We also offer special pricing for educational institutions and nonprofits. Contact our sales team for more information.'
      }
    ]
  },
  {
    title: 'Features & Functionality',
    faqs: [
      {
        question: 'What are control limits and how do they work?',
        answer: 'Control limits are statistical boundaries that help you identify when a process is out of control. Lyceum can automatically generate sigma-distributed control limits from your production data, including features like jitter compensation and floating limits. These help you catch quality issues before they become problems.'
      },
      {
        question: 'Can multiple team members access the same data?',
        answer: 'Yes! Lyceum is built for team collaboration. You can invite team members with different permission levels (viewer, editor, admin), share specific projects or dashboards, and even collaborate in real-time. Enterprise plans include advanced team management features.'
      },
      {
        question: 'How does the Sequencer feature work?',
        answer: 'The Sequencer lets you chain together test actions and post-processing steps into automated workflows. You can define test sequences, data processing steps, and conditional logic—all with a visual editor. Once configured, sequences run automatically and create complete audit trails.'
      },
      {
        question: 'Can I export my data from Lyceum?',
        answer: 'Yes, your data is always accessible. You can export to CSV, Excel, or via our API at any time. We believe in data portability—if you ever decide to leave, you can take all your data with you.'
      }
    ]
  },
  {
    title: 'Security & Privacy',
    faqs: [
      {
        question: 'Is my data secure?',
        answer: 'Absolutely. We use industry-standard encryption (TLS 1.3 in transit, AES-256 at rest), maintain SOC 2 Type II compliance, and conduct regular security audits. Your measurement data is logically isolated and never shared with other customers. See our Security page for more details.'
      },
      {
        question: 'Where is my data stored?',
        answer: 'Lyceum uses enterprise-grade cloud infrastructure with data centers in the US and EU. You can choose your preferred region during setup. Enterprise customers can request dedicated infrastructure or specific geographic requirements.'
      },
      {
        question: 'Does Lyceum sell my data?',
        answer: 'No, never. Your data belongs to you. We don\'t sell, share, or use your data for any purpose other than providing the service. See our Privacy Policy for complete details.'
      },
      {
        question: 'Do you support SSO?',
        answer: 'Yes, Enterprise plans include SSO support via SAML 2.0 and OAuth 2.0. This allows you to integrate Lyceum with your existing identity provider (Okta, Azure AD, etc.) for seamless and secure authentication.'
      }
    ]
  },
  {
    title: 'Support & Resources',
    faqs: [
      {
        question: 'What support options are available?',
        answer: 'All plans include email support and access to our documentation. Professional plans add priority support with faster response times. Enterprise plans include dedicated support engineers and custom SLAs. We also offer paid implementation and training services.'
      },
      {
        question: 'Do you offer training?',
        answer: 'Yes! We provide self-service tutorials and documentation for all users. Enterprise customers get access to live training sessions and can request custom training for their specific workflows. We also host regular webinars on best practices.'
      },
      {
        question: 'How do I contact support?',
        answer: 'You can reach our support team at support@lyceum.io or through the in-app chat. Professional and Enterprise customers can also access phone support during business hours.'
      }
    ]
  }
]

export default function FAQPage() {
  return (
    <StaticPageLayout
      title="Frequently Asked Questions"
      subtitle="Find answers to common questions about Lyceum."
      maxWidth="4xl"
    >
      <div className="space-y-12">
        {/* Search */}
        <div className="glass-card p-4">
          <div className="relative">
            <input
              type="text"
              placeholder="Search FAQs..."
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

        {/* FAQ sections */}
        {faqCategories.map((category) => (
          <section key={category.title}>
            <h2 className="text-2xl font-bold text-foreground mb-6">{category.title}</h2>
            <FAQAccordion items={category.faqs} />
          </section>
        ))}

        {/* Still have questions */}
        <section>
          <div className="glass-card p-8 text-center">
            <h2 className="text-xl font-bold text-foreground mb-2">Still Have Questions?</h2>
            <p className="text-foreground/60 mb-6">
              Can't find what you're looking for? Our team is here to help.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/contact"
                className="px-6 py-3 rounded-xl bg-cyan-500 text-black font-semibold hover:bg-cyan-400 transition-colors"
              >
                Contact Support
              </Link>
              <Link
                href="/docs"
                className="px-6 py-3 rounded-xl border border-foreground/20 text-foreground font-semibold hover:bg-foreground/5 transition-all"
              >
                Browse Documentation
              </Link>
            </div>
          </div>
        </section>
      </div>
    </StaticPageLayout>
  )
}
