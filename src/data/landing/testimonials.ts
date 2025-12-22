export interface Testimonial {
  id: string
  name: string
  title: string
  company: string
  quote: string
  avatar?: string
  rating: number
}

export const testimonials: Testimonial[] = [
  {
    id: '1',
    name: 'John Davidson',
    title: 'Lead Engineer',
    company: 'TechCorp Industries',
    quote: "Lyceum has transformed how we analyze test data. The speed and precision are unmatched. Our team's productivity increased by 40%.",
    rating: 5
  },
  {
    id: '2',
    name: 'Sarah Martinez',
    title: 'Director of QA',
    company: 'Aerospace Solutions',
    quote: "The most intuitive analytics platform we've used. Setup took minutes, not days. The ROI was immediate.",
    rating: 5
  },
  {
    id: '3',
    name: 'Michael Chen',
    title: 'Senior Analyst',
    company: 'Global Manufacturing Co.',
    quote: "The real-time collaboration features have revolutionized how our distributed teams work together. Essential for modern manufacturing.",
    rating: 5
  },
  {
    id: '4',
    name: 'Dr. Emily Watson',
    title: 'Research Director',
    company: 'Innovation Labs',
    quote: "Finally, an analytics platform that understands the needs of R&D teams. The data visualization capabilities are exceptional.",
    rating: 5
  },
  {
    id: '5',
    name: 'Robert Johnson',
    title: 'VP Engineering',
    company: 'Industrial Systems Inc.',
    quote: "We migrated from our legacy system in under a week. The Klippel QC integration alone saved us hundreds of hours annually.",
    rating: 5
  }
]
