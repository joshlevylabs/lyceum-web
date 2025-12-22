export interface Plugin {
  id: string
  name: string
  slug: string
  shortDescription: string
  description: string
  icon: string
  tier: 'free' | 'premium' | 'enterprise'
  isFeatured: boolean
  isNew: boolean
  version: string
}

export const plugins: Plugin[] = [
  {
    id: 'klippel-qc',
    name: 'Klippel QC',
    slug: 'klippel-qc',
    shortDescription: 'Quality control analysis for speaker manufacturing',
    description: 'Complete integration with Klippel QC measurement systems for real-time quality control analysis in speaker and transducer manufacturing.',
    icon: 'BeakerIcon',
    tier: 'premium',
    isFeatured: true,
    isNew: false,
    version: '2.1.0'
  },
  {
    id: 'apx500',
    name: 'APx500 Integration',
    slug: 'apx500-integration',
    shortDescription: 'Audio Precision APx500 data import',
    description: 'Seamlessly import and analyze data from Audio Precision APx500 audio analyzers with full measurement support.',
    icon: 'SignalIcon',
    tier: 'enterprise',
    isFeatured: true,
    isNew: false,
    version: '1.8.5'
  },
  {
    id: 'keysight-daq',
    name: 'Keysight DAQ',
    slug: 'keysight-daq',
    shortDescription: 'Data acquisition from Keysight instruments',
    description: 'Direct integration with Keysight data acquisition systems for seamless measurement capture and real-time data streaming.',
    icon: 'CpuChipIcon',
    tier: 'premium',
    isFeatured: false,
    isNew: true,
    version: '1.0.0'
  },
  {
    id: 'preen-psu',
    name: 'Preen PSU',
    slug: 'preen-psu',
    shortDescription: 'Preen programmable power supply control',
    description: 'Control and monitor Preen programmable power supplies with automated test sequences and real-time voltage/current logging.',
    icon: 'BoltIcon',
    tier: 'premium',
    isFeatured: false,
    isNew: true,
    version: '1.0.0'
  },
  {
    id: 'kwikwai-k110',
    name: 'Kwikwai K110',
    slug: 'kwikwai-k110',
    shortDescription: 'HDMI test and measurement integration',
    description: 'Full integration with Kwikwai K110 HDMI analyzer for comprehensive video signal testing and compliance verification.',
    icon: 'TvIcon',
    tier: 'premium',
    isFeatured: false,
    isNew: true,
    version: '1.0.0'
  },
  {
    id: 'granite-river-labs-pd',
    name: 'Granite River Labs PD',
    slug: 'granite-river-labs-pd',
    shortDescription: 'USB Power Delivery compliance testing',
    description: 'USB-PD compliance testing integration with Granite River Labs analyzers for complete power delivery validation.',
    icon: 'BoltIcon',
    tier: 'enterprise',
    isFeatured: false,
    isNew: true,
    version: '1.0.0'
  },
  {
    id: 'sifos-poe',
    name: 'Sifos PoE',
    slug: 'sifos-poe',
    shortDescription: 'Power over Ethernet test automation',
    description: 'Automate PoE testing with Sifos analyzers including compliance testing, power measurements, and protocol analysis.',
    icon: 'ServerIcon',
    tier: 'premium',
    isFeatured: false,
    isNew: true,
    version: '1.0.0'
  },
  {
    id: 'time-machines-grandmaster',
    name: 'Time Machines Grandmaster',
    slug: 'time-machines-grandmaster',
    shortDescription: 'Precision timing and synchronization',
    description: 'GPS-synchronized precision timing integration with Time Machines Grandmaster for accurate timestamping and sync testing.',
    icon: 'ClockIcon',
    tier: 'enterprise',
    isFeatured: false,
    isNew: true,
    version: '1.0.0'
  }
]

export const pluginTierLabels: Record<Plugin['tier'], string> = {
  free: 'Free',
  premium: 'Premium',
  enterprise: 'Enterprise'
}

export const pluginTierColors: Record<Plugin['tier'], string> = {
  free: 'bg-gray-500',
  premium: 'bg-purple-500',
  enterprise: 'bg-amber-500'
}

// Flag to show "more coming" in the UI
export const morePluginsComingSoon = true
