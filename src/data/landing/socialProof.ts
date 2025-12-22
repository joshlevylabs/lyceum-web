export interface Stat {
  id: string
  value: number
  suffix: string
  label: string
}

export const stats: Stat[] = [
  {
    id: 'engineers',
    value: 10000,
    suffix: '+',
    label: 'Engineers'
  },
  {
    id: 'companies',
    value: 500,
    suffix: '+',
    label: 'Companies'
  },
  {
    id: 'uptime',
    value: 99.9,
    suffix: '%',
    label: 'Uptime'
  },
  {
    id: 'data-points',
    value: 5,
    suffix: 'M+',
    label: 'Data Points Analyzed'
  }
]

export interface CompanyLogo {
  id: string
  name: string
  // Logo will be placeholder for now
}

export const companyLogos: CompanyLogo[] = [
  { id: '1', name: 'TechCorp' },
  { id: '2', name: 'Aerospace Solutions' },
  { id: '3', name: 'Global Manufacturing' },
  { id: '4', name: 'Innovation Labs' },
  { id: '5', name: 'Industrial Systems' },
  { id: '6', name: 'Engineering Pro' }
]
