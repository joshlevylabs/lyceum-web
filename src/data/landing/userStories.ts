export interface UserStory {
  id: string
  role: string
  title: string
  scenario: string
  description: string
  workflow: string[]
  video?: string
}

export const userStories: UserStory[] = [
  {
    id: 'qc-frequency-validation',
    role: 'QC Engineer',
    title: 'Validate Speaker Frequency Response',
    scenario: 'As a QC Engineer, I need to validate that production speakers meet frequency response specifications before shipping.',
    description: 'Watch how Lyceum automatically ingests measurement data from your Audio Precision or Klippel analyzer, visualizes the frequency response curves, calculates statistical control limits from your golden samples, and produces real-time yield metrics—all in one seamless workflow.',
    workflow: [
      'Ingest frequency response data from test equipment',
      'Auto-generate visualization overlays',
      'Calculate 3σ control limits from reference samples',
      'Flag pass/fail units and calculate yield'
    ],
    video: '/landing/stories/qc-frequency-validation.mp4'
  },
  {
    id: 'production-yield-tracking',
    role: 'Production Manager',
    title: 'Track Daily Production Yield',
    scenario: 'As a Production Manager, I need to monitor daily yield trends across multiple production lines to identify issues early.',
    description: 'See how Lyceum aggregates test data from all your production stations, builds real-time yield dashboards by shift and line, automatically flags yield drops, and sends alerts when statistical process control limits are breached.',
    workflow: [
      'Aggregate data from multiple test stations',
      'Build real-time yield trend visualizations',
      'Apply SPC rules for early warning detection',
      'Generate shift reports with yield breakdown'
    ],
    video: '/landing/stories/production-yield-tracking.mp4'
  },
  {
    id: 'prototype-comparison',
    role: 'Design Engineer',
    title: 'Compare Prototype Performance',
    scenario: 'As a Design Engineer, I need to compare multiple prototype iterations to identify the best performer and understand design tradeoffs.',
    description: 'Follow along as Lyceum imports measurement data from prototype test runs, overlays curves from different design iterations, identifies golden samples and statistical outliers, and generates comparison reports highlighting key performance differences.',
    workflow: [
      'Import prototype measurement datasets',
      'Create multi-curve overlay visualizations',
      'Identify golden samples and outliers',
      'Generate delta analysis reports'
    ],
    video: '/landing/stories/prototype-comparison.mp4'
  },
  {
    id: 'automated-eol-testing',
    role: 'Test Engineer',
    title: 'Automate End-of-Line Testing',
    scenario: 'As a Test Engineer, I need to create automated test sequences that run consistently without manual intervention.',
    description: 'Watch the Sequencer in action as it controls test equipment, runs a complete end-of-line test sequence, ingests results in real-time, applies pass/fail criteria based on control limits, and logs everything for traceability.',
    workflow: [
      'Configure automated test sequence steps',
      'Execute equipment control commands',
      'Ingest and visualize results in real-time',
      'Apply limits and generate pass/fail verdict'
    ],
    video: '/landing/stories/automated-eol-testing.mp4'
  },
  {
    id: 'failure-root-cause',
    role: 'Quality Manager',
    title: 'Identify Failure Root Causes',
    scenario: 'As a Quality Manager, I need to investigate quality escapes and identify root causes to prevent recurrence.',
    description: 'See how Lyceum enables deep-dive analysis by correlating failed units across multiple test parameters, identifying common failure signatures, flagging units with similar characteristics, and generating root cause analysis reports.',
    workflow: [
      'Query and flag failed units by criteria',
      'Correlate failures across test parameters',
      'Identify statistical outlier patterns',
      'Generate root cause analysis summary'
    ],
    video: '/landing/stories/failure-root-cause.mp4'
  }
]
