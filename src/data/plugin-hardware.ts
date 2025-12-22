// Plugin Hardware Information
// Maps plugin slugs to their compatible hardware devices

export interface HardwareDevice {
  name: string
  manufacturer: string
  model: string
  description: string
  imageUrl: string
  websiteUrl: string
  specifications?: Record<string, string>
  features?: string[]
}

export interface PluginHardware {
  pluginSlug: string
  devices: HardwareDevice[]
}

export const PLUGIN_HARDWARE: Record<string, HardwareDevice[]> = {
  'klippel-qc': [
    {
      name: 'Klippel QC System',
      manufacturer: 'Klippel GmbH',
      model: 'QC System',
      description: 'End-of-line quality control system for loudspeaker production. Performs fast, reliable measurements to detect defects and ensure consistent product quality.',
      imageUrl: '/images/hardware/klippel-qc-system.jpg',
      websiteUrl: 'https://www.klippel.de/products/qc-system.html',
      specifications: {
        'Measurement Speed': '< 1 second per test',
        'Defect Detection': 'Rub & Buzz, Air Leaks, Polarity',
        'Interface': 'USB / Ethernet',
        'Channels': 'Up to 8 simultaneous'
      },
      features: [
        'Fast end-of-line testing',
        'Automatic defect classification',
        'Statistical process control',
        'Customizable test sequences'
      ]
    }
  ],

  'apx500': [
    {
      name: 'APx500 Series Audio Analyzer',
      manufacturer: 'Audio Precision',
      model: 'APx515 / APx525 / APx555',
      description: 'Industry-standard audio analyzers for comprehensive audio testing. Features high-performance analog and digital I/O with exceptional measurement accuracy.',
      imageUrl: '/images/hardware/apx500-analyzer.jpg',
      websiteUrl: 'https://www.ap.com/analyzers-accessories/apx500-series/',
      specifications: {
        'THD+N': '< -120 dB',
        'Frequency Range': 'DC to 1 MHz',
        'Sample Rates': 'Up to 768 kHz',
        'Digital I/O': 'AES/EBU, S/PDIF, HDMI, Bluetooth'
      },
      features: [
        'Multi-channel analysis',
        'Automated test sequences',
        'FFT and swept sine measurements',
        'Comprehensive digital audio testing'
      ]
    }
  ],

  'preen-psu': [
    {
      name: 'Preen AFV-P Series',
      manufacturer: 'Preen',
      model: 'AFV-P Series',
      description: 'Programmable AC power sources with high precision output. Ideal for product testing, R&D, and production line applications.',
      imageUrl: '/images/hardware/preen-afv-p.jpg',
      websiteUrl: 'https://www.preen.com.tw/product/afv-p-series/',
      specifications: {
        'Output Power': '500VA to 6000VA',
        'Frequency Range': '45Hz to 500Hz',
        'Voltage Range': '0 to 300Vrms',
        'Interface': 'RS-232, USB, GPIB, Ethernet'
      },
      features: [
        'High precision AC output',
        'Programmable waveforms',
        'Built-in power meter',
        'Remote control capability'
      ]
    },
    {
      name: 'Preen ADG Series',
      manufacturer: 'Preen',
      model: 'ADG Series',
      description: 'Programmable DC power supplies with wide voltage and current ranges. Features fast transient response and low noise output.',
      imageUrl: '/images/hardware/preen-adg.jpg',
      websiteUrl: 'https://www.preen.com.tw/product/adg-series/',
      specifications: {
        'Output Power': 'Up to 15kW',
        'Voltage Range': '0 to 600V',
        'Current Range': '0 to 510A',
        'Interface': 'RS-232, USB, GPIB, Ethernet'
      },
      features: [
        'Fast transient response',
        'Low ripple and noise',
        'Parallel operation',
        'Programmable sequences'
      ]
    }
  ],

  'keysight-daq': [
    {
      name: 'Keysight DAQ970A',
      manufacturer: 'Keysight Technologies',
      model: 'DAQ970A',
      description: 'Data acquisition system with 6.5-digit DMM accuracy. Supports multiple plug-in modules for flexible measurement configurations.',
      imageUrl: '/images/hardware/keysight-daq970a.jpg',
      websiteUrl: 'https://www.keysight.com/us/en/product/DAQ970A/data-acquisition-system.html',
      specifications: {
        'DMM Accuracy': '6.5 digits',
        'Scan Rate': 'Up to 450 ch/sec',
        'Module Slots': '3 slots',
        'Interface': 'USB, LAN, GPIB'
      },
      features: [
        'High-precision measurements',
        'Multiple module options',
        'Built-in graphing',
        'Data logging capability'
      ]
    },
    {
      name: 'Keysight 34980A',
      manufacturer: 'Keysight Technologies',
      model: '34980A',
      description: 'Multifunction switch/measure mainframe with 8 module slots. Ideal for high-channel-count switching and data acquisition applications.',
      imageUrl: '/images/hardware/keysight-34980a.jpg',
      websiteUrl: 'https://www.keysight.com/us/en/product/34980A/multifunction-switch-measure-mainframe.html',
      specifications: {
        'Module Slots': '8 slots',
        'Max Channels': '560+ channels',
        'Switching Speed': 'Up to 2800 ch/sec',
        'Interface': 'USB, LAN, GPIB'
      },
      features: [
        'High channel density',
        'RF and microwave switching',
        'Digital I/O modules',
        'Counter/totalizer modules'
      ]
    }
  ],

  'kwikwai-k110': [
    {
      name: 'Kwikwai K110 HDMI Analyzer',
      manufacturer: 'Kwikwai',
      model: 'K110',
      description: 'Professional HDMI 2.1 protocol analyzer and generator. Supports up to 8K resolution and all HDMI features including VRR, ALLM, and eARC.',
      imageUrl: '/images/hardware/kwikwai-k110.jpg',
      websiteUrl: 'https://www.kwikwai.com/k110',
      specifications: {
        'Max Resolution': '8K @ 60Hz, 4K @ 120Hz',
        'HDMI Version': 'HDMI 2.1',
        'Bandwidth': '48 Gbps',
        'HDCP Support': 'HDCP 2.3'
      },
      features: [
        'Full HDMI 2.1 support',
        'Protocol analysis and logging',
        'EDID editing and emulation',
        'Compliance test patterns'
      ]
    }
  ],

  'granite-river-labs-pd': [
    {
      name: 'GRL-USB-PD-C2',
      manufacturer: 'Granite River Labs',
      model: 'USB-PD-C2',
      description: 'USB Power Delivery compliance test system. Provides complete USB-PD and USB Type-C testing per USB-IF specifications.',
      imageUrl: '/images/hardware/grl-usb-pd-c2.jpg',
      websiteUrl: 'https://www.graniteriverlabs.com/en-us/usb-pd-tester',
      specifications: {
        'PD Versions': 'PD 2.0, 3.0, 3.1, EPR',
        'Power Range': 'Up to 240W (EPR)',
        'Voltage Range': '5V to 48V',
        'Certification': 'USB-IF certified'
      },
      features: [
        'Full compliance testing',
        'Source and sink testing',
        'PPS and EPR support',
        'Automated test reports'
      ]
    },
    {
      name: 'GRL-A1 USB-C Tester',
      manufacturer: 'Granite River Labs',
      model: 'A1',
      description: 'Portable USB-C cable and connector tester. Quick verification of USB-C cables, adapters, and device ports.',
      imageUrl: '/images/hardware/grl-a1.jpg',
      websiteUrl: 'https://www.graniteriverlabs.com/en-us/usb-c-tester',
      specifications: {
        'Test Types': 'E-Marker, CC, VCONN',
        'Display': 'Built-in LCD',
        'Power': 'USB-C powered',
        'Size': 'Pocket-sized'
      },
      features: [
        'Quick cable testing',
        'E-Marker verification',
        'Pin continuity check',
        'Pass/fail indication'
      ]
    }
  ],

  'sifos-poe': [
    {
      name: 'Sifos PowerSync Analyzer',
      manufacturer: 'Sifos Technologies',
      model: 'PSA-3000 Series',
      description: 'Comprehensive PoE test solution for PSE and PD testing. Supports all IEEE 802.3 PoE standards including 802.3bt Type 4.',
      imageUrl: '/images/hardware/sifos-psa3000.jpg',
      websiteUrl: 'https://www.sifos.com/products/powersync-analyzer/',
      specifications: {
        'PoE Standards': '802.3af, at, bt (Type 1-4)',
        'Max Power': '90W (Type 4)',
        'Ports': 'Up to 48 ports',
        'Interface': 'Ethernet, USB'
      },
      features: [
        'Complete PSE/PD testing',
        'LLDP protocol analysis',
        'Interoperability testing',
        'Automated compliance reports'
      ]
    },
    {
      name: 'Sifos PoE Load Box',
      manufacturer: 'Sifos Technologies',
      model: 'PLB-400',
      description: 'Programmable PoE load for testing Power Sourcing Equipment. Simulates various PD signatures and power consumption profiles.',
      imageUrl: '/images/hardware/sifos-plb400.jpg',
      websiteUrl: 'https://www.sifos.com/products/poe-load-box/',
      specifications: {
        'Max Load': '90W',
        'Class Support': 'Class 0-8',
        'Signature Types': 'All IEEE signatures',
        'Control': 'Software programmable'
      },
      features: [
        'Programmable load profiles',
        'Signature emulation',
        'Fault injection',
        'Real-time monitoring'
      ]
    }
  ],

  'time-machines-grandmaster': [
    {
      name: 'Time Machines TM2000A',
      manufacturer: 'Time Machines Inc.',
      model: 'TM2000A',
      description: 'GPS-synchronized PTP/NTP grandmaster clock. Provides nanosecond-accurate timing for network synchronization applications.',
      imageUrl: '/images/hardware/tm2000a.jpg',
      websiteUrl: 'https://www.timemachinescorp.com/product/tm2000a/',
      specifications: {
        'GPS Accuracy': '< 15ns to UTC',
        'PTP Profiles': 'Default, Telecom, Power',
        'NTP Accuracy': '< 1ms',
        'Interfaces': '2x 1GbE, 2x SFP'
      },
      features: [
        'Multi-profile PTP support',
        'GNSS receiver (GPS/GLONASS)',
        'Holdover capability',
        'Web management interface'
      ]
    },
    {
      name: 'Time Machines TM1000A',
      manufacturer: 'Time Machines Inc.',
      model: 'TM1000A',
      description: 'Compact GPS-disciplined NTP server. Cost-effective solution for network time synchronization.',
      imageUrl: '/images/hardware/tm1000a.jpg',
      websiteUrl: 'https://www.timemachinescorp.com/product/tm1000a/',
      specifications: {
        'GPS Accuracy': '< 50ns to UTC',
        'NTP Clients': 'Unlimited',
        'Interfaces': '1x 1GbE',
        'Power': 'PoE or DC'
      },
      features: [
        'Stratum 1 NTP server',
        'GPS disciplined oscillator',
        'SNMP monitoring',
        'Compact form factor'
      ]
    }
  ]
}

export function getPluginHardware(pluginSlug: string): HardwareDevice[] {
  return PLUGIN_HARDWARE[pluginSlug] || []
}
