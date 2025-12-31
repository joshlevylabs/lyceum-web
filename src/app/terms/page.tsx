import { StaticPageLayout, ContentSection } from '@/components/StaticPageLayout'

export const metadata = {
  title: 'Terms of Service | Lyceum',
  description: 'Read the terms and conditions for using the Lyceum platform.'
}

export default function TermsOfServicePage() {
  return (
    <StaticPageLayout
      title="Terms of Service"
      subtitle="Last updated: December 2024"
    >
      <div className="space-y-8 text-foreground/70 leading-relaxed">
        <ContentSection title="Agreement to Terms">
          <p>
            By accessing or using Lyceum's industrial analytics platform ("Service"), you agree to be
            bound by these Terms of Service ("Terms"). If you disagree with any part of these terms,
            you do not have permission to access the Service.
          </p>
        </ContentSection>

        <ContentSection title="Description of Service">
          <p>
            Lyceum provides a cloud-based industrial analytics platform that enables engineers and
            analysts to collect, analyze, and visualize measurement data from various test equipment.
            The Service includes:
          </p>
          <ul className="list-disc pl-6 mt-2 space-y-2">
            <li>Data ingestion from supported test equipment</li>
            <li>Cloud storage and data management</li>
            <li>Analytics and visualization tools</li>
            <li>Collaboration features</li>
            <li>API access for integrations</li>
          </ul>
        </ContentSection>

        <ContentSection title="Account Registration">
          <p>
            To use certain features of the Service, you must register for an account. You agree to:
          </p>
          <ul className="list-disc pl-6 mt-2 space-y-2">
            <li>Provide accurate and complete registration information</li>
            <li>Maintain the security of your account credentials</li>
            <li>Promptly update any changes to your information</li>
            <li>Accept responsibility for all activities under your account</li>
            <li>Notify us immediately of any unauthorized access</li>
          </ul>
        </ContentSection>

        <ContentSection title="Subscription and Payment">
          <h3 className="text-lg font-semibold text-foreground mt-6 mb-3">Billing</h3>
          <p>
            Paid subscriptions are billed in advance on a monthly or annual basis. You authorize us
            to charge your designated payment method for all fees incurred.
          </p>

          <h3 className="text-lg font-semibold text-foreground mt-6 mb-3">Free Trial</h3>
          <p>
            We may offer a free trial period. At the end of the trial, your account will automatically
            convert to a paid subscription unless you cancel before the trial ends.
          </p>

          <h3 className="text-lg font-semibold text-foreground mt-6 mb-3">Refunds</h3>
          <p>
            Subscription fees are non-refundable except as required by law or as explicitly stated
            in these Terms. If you believe you are entitled to a refund, please contact our support team.
          </p>
        </ContentSection>

        <ContentSection title="Your Data">
          <h3 className="text-lg font-semibold text-foreground mt-6 mb-3">Ownership</h3>
          <p>
            You retain all rights to the measurement data and content you upload to the Service
            ("Your Data"). We do not claim ownership of Your Data.
          </p>

          <h3 className="text-lg font-semibold text-foreground mt-6 mb-3">License to Lyceum</h3>
          <p>
            You grant Lyceum a limited license to host, store, and process Your Data solely to
            provide the Service to you. This license ends when you delete Your Data or terminate
            your account.
          </p>

          <h3 className="text-lg font-semibold text-foreground mt-6 mb-3">Data Export</h3>
          <p>
            You may export Your Data at any time during your subscription. We provide tools to
            facilitate data portability in standard formats.
          </p>
        </ContentSection>

        <ContentSection title="Acceptable Use">
          <p>You agree not to use the Service to:</p>
          <ul className="list-disc pl-6 mt-2 space-y-2">
            <li>Violate any applicable laws or regulations</li>
            <li>Infringe on the intellectual property rights of others</li>
            <li>Upload malicious code or attempt to compromise system security</li>
            <li>Interfere with or disrupt the Service or servers</li>
            <li>Access the Service through automated means without permission</li>
            <li>Share account credentials with unauthorized parties</li>
            <li>Resell or redistribute the Service without authorization</li>
          </ul>
        </ContentSection>

        <ContentSection title="Intellectual Property">
          <p>
            The Service, including its original content, features, and functionality, is owned by
            Lyceum and protected by international copyright, trademark, and other intellectual
            property laws. You may not copy, modify, or create derivative works based on the
            Service without our express written permission.
          </p>
        </ContentSection>

        <ContentSection title="Third-Party Integrations">
          <p>
            The Service may integrate with third-party equipment and software. We are not responsible
            for the availability, accuracy, or reliability of third-party services. Your use of
            third-party integrations is subject to their respective terms and conditions.
          </p>
        </ContentSection>

        <ContentSection title="Limitation of Liability">
          <p>
            TO THE MAXIMUM EXTENT PERMITTED BY LAW, LYCEUM SHALL NOT BE LIABLE FOR ANY INDIRECT,
            INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING BUT NOT LIMITED TO
            LOSS OF PROFITS, DATA, OR BUSINESS OPPORTUNITIES, ARISING FROM YOUR USE OF THE SERVICE.
          </p>
          <p className="mt-4">
            OUR TOTAL LIABILITY FOR ANY CLAIMS ARISING FROM THESE TERMS OR YOUR USE OF THE SERVICE
            SHALL NOT EXCEED THE AMOUNT YOU PAID US IN THE TWELVE MONTHS PRECEDING THE CLAIM.
          </p>
        </ContentSection>

        <ContentSection title="Disclaimer of Warranties">
          <p>
            THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND,
            EITHER EXPRESS OR IMPLIED. WE DO NOT WARRANT THAT THE SERVICE WILL BE UNINTERRUPTED,
            ERROR-FREE, OR COMPLETELY SECURE.
          </p>
        </ContentSection>

        <ContentSection title="Indemnification">
          <p>
            You agree to indemnify and hold harmless Lyceum and its officers, directors, employees,
            and agents from any claims, damages, losses, or expenses arising from your use of the
            Service or violation of these Terms.
          </p>
        </ContentSection>

        <ContentSection title="Termination">
          <p>
            We may terminate or suspend your account at any time for violation of these Terms.
            Upon termination, your right to use the Service will immediately cease. You may
            terminate your account at any time by contacting support.
          </p>
          <p className="mt-4">
            Upon termination, we will provide you with a reasonable opportunity to export Your Data.
            After 30 days, we may delete Your Data from our systems.
          </p>
        </ContentSection>

        <ContentSection title="Changes to Terms">
          <p>
            We reserve the right to modify these Terms at any time. We will notify you of material
            changes by email or through the Service. Your continued use of the Service after such
            changes constitutes acceptance of the new Terms.
          </p>
        </ContentSection>

        <ContentSection title="Governing Law">
          <p>
            These Terms shall be governed by and construed in accordance with the laws of the
            jurisdiction in which Lyceum is incorporated, without regard to its conflict of law
            provisions.
          </p>
        </ContentSection>

        <ContentSection title="Contact Us">
          <p>
            If you have questions about these Terms, please contact us at:
          </p>
          <div className="mt-4 p-6 glass-card">
            <p className="font-semibold text-foreground">Lyceum Legal Team</p>
            <p>Email: legal@lyceum.io</p>
            <p>Address: [Company Address]</p>
          </div>
        </ContentSection>
      </div>
    </StaticPageLayout>
  )
}
