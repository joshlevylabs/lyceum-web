export interface Feature {
  id: string
  name: string
  shortDescription: string
  description: string
  icon: string
  highlights: string[]
}

export const features: Feature[] = [
  {
    id: 'analytics-studio',
    name: 'Analytics Studio',
    shortDescription: 'Create, manage, and collaborate on analytics sessions',
    description: 'A powerful workspace for creating and managing analytics sessions with real-time data visualization, collaborative editing, and comprehensive session management tools.',
    icon: 'PresentationChartLineIcon',
    highlights: [
      'Real-time data visualization',
      'Collaborative session editing',
      'Version history and rollback',
      'Custom workspace layouts'
    ]
  },
  {
    id: 'test-data-management',
    name: 'Test Data Management',
    shortDescription: 'Organize and analyze measurement data',
    description: 'Comprehensive test data organization with advanced filtering, grouping, and search capabilities. Easily manage thousands of measurements with intelligent tagging.',
    icon: 'TableCellsIcon',
    highlights: [
      'Advanced filtering and search',
      'Intelligent data tagging',
      'Bulk operations support',
      'Data validation rules'
    ]
  },
  {
    id: 'data-visualization',
    name: 'Data Visualization',
    shortDescription: 'Interactive charts with measurement flagging',
    description: 'Create stunning interactive visualizations with measurement flagging, statistical overlays, and export-ready charts for reports and presentations.',
    icon: 'ChartBarIcon',
    highlights: [
      'Interactive chart controls',
      'Measurement flagging',
      'Statistical analysis overlays',
      'Export to multiple formats'
    ]
  },
  {
    id: 'cloud-collaboration',
    name: 'Cloud-Based Collaboration',
    shortDescription: 'Share sessions and data in real-time',
    description: 'Work together seamlessly with cloud-powered collaboration. Share sessions, leave comments, and work on the same data simultaneously from anywhere.',
    icon: 'CloudIcon',
    highlights: [
      'Real-time sync across devices',
      'Live commenting and feedback',
      'Shared team workspaces',
      'Activity tracking'
    ]
  },
  {
    id: 'enterprise-security',
    name: 'Enterprise Security',
    shortDescription: 'Role-based access control and encryption',
    description: 'Enterprise-grade security with role-based access control, end-to-end encryption, audit logs, and compliance certifications for sensitive industrial data.',
    icon: 'ShieldCheckIcon',
    highlights: [
      'Role-based access control',
      'End-to-end encryption',
      'Comprehensive audit logs',
      'Compliance certifications'
    ]
  },
  {
    id: 'team-management',
    name: 'Team Management',
    shortDescription: 'Organize teams and assign roles',
    description: 'Streamline team operations with organizational hierarchy support, role assignments, permission management, and team-wide settings.',
    icon: 'UserGroupIcon',
    highlights: [
      'Organization hierarchy',
      'Custom role definitions',
      'Permission templates',
      'Team analytics'
    ]
  }
]
