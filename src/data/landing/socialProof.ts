export interface CompanyLogo {
  id: string
  name: string
}

// Real companies we've worked with
export const companyLogos: CompanyLogo[] = [
  { id: 'amazon', name: 'Amazon Lab126' },
  { id: 'meta', name: 'Meta' },
  { id: 'oculus', name: 'Oculus' },
  { id: 'sonance', name: 'Sonance' },
  { id: 'dolby', name: 'Dolby' },
  { id: 'hansong', name: 'Hansong' },
  { id: 'ggec', name: 'GGEC' },
  { id: 'dblabs', name: 'dB Labs' },
  { id: 'lizn', name: 'LIZN' },
  { id: 'klippel', name: 'Klippel' },
  { id: 'listeninc', name: 'Listen Inc' }
]

// Keeping stats interface for backwards compatibility, but removing fake data
export interface Stat {
  id: string
  value: number
  suffix: string
  label: string
}

// Empty stats - we don't want to show fake numbers
export const stats: Stat[] = []
