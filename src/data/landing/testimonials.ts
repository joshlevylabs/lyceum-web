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
    name: 'Jan Abildgaard Pedersen',
    title: 'AES Fellow & Past President',
    company: 'Audio Engineering Society',
    quote: "The Lyceum is simply a fantastic tool for any company working with audio - no matter if you are a seasoned and large audio company or you are just starting to learn about developing and manufacturing audio devices. We felt right away that this is a tool developed by audio engineers for audio engineers. The Lyceum comes with a wealth of audio know how. It structures, analyses and automates all your audio measurements and procedures. It also helps you in a dramatic way when you need to scale up your audio team since all your audio best practice is accumulated in The Lyceum ready for onboarding your new team members!",
    rating: 5
  }
]
