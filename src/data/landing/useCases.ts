export interface UseCase {
  id: string
  title: string
  subtitle: string
  description: string
  icon: string
  benefits: string[]
  relatedPlugins: string[]
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
    relatedPlugins: ['klippel-qc', 'advanced-analytics']
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
    relatedPlugins: ['apx500', 'klippel-qc']
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
    relatedPlugins: ['advanced-analytics', 'custom-dashboards']
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
    relatedPlugins: ['realtime-collab', 'custom-dashboards']
  }
]
