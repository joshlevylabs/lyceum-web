export interface UseCase {
  id: string
  title: string
  subtitle: string
  description: string
  icon: string
  benefits: string[]
  relatedPlugins: string[]
  detailedStory?: string
  videoUrl?: string
  outcomes?: string[]
}

export const useCases: UseCase[] = [
  {
    id: 'quality-control',
    title: 'Quality Control & Manufacturing',
    subtitle: 'Ensure product excellence at scale',
    description: 'Monitor production quality in real-time with automated defect detection, statistical process control, and comprehensive quality reporting for manufacturing lines.',
    icon: 'BeakerIcon',
    benefits: [
      'Real-time defect detection',
      'Statistical process control (SPC)',
      'Automated quality reporting',
      'Production line integration'
    ],
    relatedPlugins: ['klippel-qc', 'advanced-analytics'],
    detailedStory: `Imagine running a high-volume speaker manufacturing line producing thousands of units per day. Before Lyceum, quality engineers spent hours manually reviewing test data from Klippel QC systems, often discovering defects only after products had already shipped.

With Lyceum, test data from every unit flows automatically into a centralized dashboard. Real-time alerts notify the team instantly when a speaker fails to meet specifications—whether it's a frequency response anomaly, elevated THD, or a Rub & Buzz detection. Engineers can drill down to identify the exact production batch, time window, and even correlate issues with specific assembly stations.

The result? One audio manufacturer reduced their defect escape rate by 73% and cut quality inspection time in half. Production managers now have complete visibility into yield trends, enabling proactive adjustments before minor issues become major quality events.`,
    outcomes: [
      '73% reduction in defect escape rate',
      '50% faster quality inspection cycles',
      'Real-time visibility across all production lines',
      'Proactive issue detection before shipping'
    ]
  },
  {
    id: 'audio-engineering',
    title: 'Audio Engineering',
    subtitle: 'Precision audio measurement and analysis',
    description: 'Complete solution for audio engineers with support for industry-standard measurement equipment, acoustic analysis, and speaker characterization.',
    icon: 'SignalIcon',
    benefits: [
      'APx500 integration',
      'Acoustic measurements',
      'Speaker characterization',
      'THD and frequency analysis'
    ],
    relatedPlugins: ['apx500', 'klippel-qc'],
    detailedStory: `Audio engineers developing next-generation speakers and headphones face a common challenge: measurement data scattered across multiple systems, making it nearly impossible to track design iterations and compare performance across prototypes.

Lyceum brings all your audio measurements into one unified platform. Connect your Audio Precision APx500 analyzer and Klippel systems, and every measurement—frequency response, impedance, THD+N, Rub & Buzz—is automatically ingested, tagged, and organized. Compare the current prototype against last week's revision, or benchmark against your golden reference sample with a few clicks.

A leading headphone manufacturer used Lyceum to accelerate their R&D cycle by 40%. Engineers could instantly pull up historical data, overlay measurements from different driver samples, and share findings with the team in Shanghai—all without leaving the platform. The days of emailing Excel files and manually aligning data are over.`,
    outcomes: [
      '40% faster R&D development cycles',
      'Unified measurement data across all equipment',
      'Easy comparison of prototypes and iterations',
      'Seamless global team collaboration'
    ]
  },
  {
    id: 'research-development',
    title: 'Research & Development',
    subtitle: 'Accelerate innovation with data',
    description: 'Empower R&D teams with advanced statistical analysis, machine learning insights, and comprehensive data visualization for experimental research.',
    icon: 'LightBulbIcon',
    benefits: [
      'Advanced statistical analysis',
      'ML-powered insights',
      'Experiment tracking',
      'Research collaboration'
    ],
    relatedPlugins: ['advanced-analytics', 'custom-dashboards'],
    detailedStory: `Research and development teams often struggle with the sheer volume of experimental data generated during product development. Test results from dozens of prototypes, multiple test conditions, and various measurement parameters create a maze of information that's difficult to navigate.

Lyceum transforms how R&D teams work with data. Every experiment is automatically tracked with full metadata—who ran it, when, under what conditions, and with which equipment settings. Advanced statistical tools help engineers identify trends, outliers, and correlations that would be invisible in spreadsheet analysis. Machine learning algorithms can even suggest which parameters most influence product performance.

A consumer electronics R&D team used Lyceum to analyze three years of historical test data and discovered a previously unknown correlation between ambient humidity and product failure rates. This insight led to a simple manufacturing process change that reduced field returns by 25%—all from data that was already sitting in their archives.`,
    outcomes: [
      '25% reduction in field return rates',
      'Discovery of hidden data correlations',
      'Complete experiment traceability',
      'Faster hypothesis testing and validation'
    ]
  },
  {
    id: 'enterprise-teams',
    title: 'Enterprise Teams',
    subtitle: 'Scale analytics across your organization',
    description: 'Built for large organizations with distributed teams requiring real-time collaboration, role-based access, and enterprise security compliance.',
    icon: 'BuildingOffice2Icon',
    benefits: [
      'Real-time collaboration',
      'Role-based access control',
      'Enterprise SSO support',
      'Compliance certifications'
    ],
    relatedPlugins: ['realtime-collab', 'custom-dashboards'],
    detailedStory: `Global enterprises face unique challenges when it comes to measurement data. Engineering teams spread across multiple continents, each with their own test equipment and data formats, struggle to maintain consistency and share insights effectively. IT and security teams worry about data governance and access control.

Lyceum was built from the ground up for enterprise scale. Role-based access control ensures engineers see only the projects they're authorized for, while executives get high-level dashboards showing cross-site quality metrics. Enterprise SSO integration means one less password to manage, and comprehensive audit logs satisfy even the most stringent compliance requirements.

A Fortune 500 electronics manufacturer deployed Lyceum across 12 manufacturing sites in 6 countries. Within three months, they had standardized quality metrics globally, enabled real-time knowledge sharing between sites, and reduced the time to investigate quality issues from days to hours. Their VP of Quality now reviews a single dashboard each morning instead of waiting for weekly reports from each facility.`,
    outcomes: [
      'Standardized quality metrics across 12 global sites',
      'Investigation time reduced from days to hours',
      'Real-time cross-site knowledge sharing',
      'Complete audit trail for compliance'
    ]
  }
]
