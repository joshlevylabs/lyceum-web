export interface Feature {
  id: string
  name: string
  shortDescription: string
  description: string
  icon: string
  highlights: string[]
  video?: string
}

export const features: Feature[] = [
  {
    id: 'equipment-control',
    name: 'Test Equipment Control & Data Ingestion',
    shortDescription: 'Control, automate, and centralize all your test data',
    description: 'Control and automate all of your test equipment while ingesting data from each source. Store everything centrally in one location—locally or on the web.',
    icon: 'PresentationChartLineIcon',
    highlights: [
      'Automate test equipment workflows',
      'Ingest data from multiple sources',
      'Centralized local or cloud storage',
      'Unified data pipeline'
    ],
    video: '/landing/Test Equipment Control & Data Ingestion.mp4'
  },
  {
    id: 'smart-flagging',
    name: 'Smart Data Flagging & Search',
    shortDescription: 'Find exactly the data you need, instantly',
    description: 'Flag and find data specific to your needs with powerful multi-parameter queries. Example: "Flag all frequency response curves for units with 4 ohms, 2V drive level, belonging to Project Condor."',
    icon: 'TableCellsIcon',
    highlights: [
      'Multi-parameter data queries',
      'Custom flagging rules',
      'Project-based organization',
      'Instant search across all data'
    ],
    video: '/landing/Smart Data Flagging & Search.mp4'
  },
  {
    id: 'control-limits',
    name: 'Advanced Control Limits',
    shortDescription: 'Generate sophisticated limits from your data',
    description: 'Generate advanced control limits using configurable sigma-distributed levels, axis constraints, jitter compensation, floating limit levels, and more.',
    icon: 'ChartBarIcon',
    highlights: [
      'Sigma-distributed limit levels',
      'Configurable axis constraints',
      'Jitter compensation',
      'Floating limit levels'
    ],
    video: '/landing/Advanced Control Limits.mp4'
  },
  {
    id: 'yield-analysis',
    name: 'Golden Samples & Real-Time Yield',
    shortDescription: 'Track quality metrics from factory builds',
    description: 'Find golden samples, identify max/min samples, and calculate real-time yield directly from your factory production builds.',
    icon: 'CloudIcon',
    highlights: [
      'Golden sample identification',
      'Max/min sample detection',
      'Real-time yield calculation',
      'Factory build analytics'
    ],
    video: '/landing/Golden Samples & Real-Time Yield.mp4'
  },
  {
    id: 'team-enterprise',
    name: 'Team Management & Enterprise Security',
    shortDescription: 'Secure collaboration for your entire organization',
    description: 'Enterprise-grade security with role-based access control, team organization, and comprehensive audit logging for sensitive measurement data.',
    icon: 'ShieldCheckIcon',
    highlights: [
      'Role-based access control',
      'Team organization hierarchy',
      'End-to-end encryption',
      'Comprehensive audit logs'
    ],
    video: '/landing/Team Management & Enterprise Security.mp4'
  }
]
