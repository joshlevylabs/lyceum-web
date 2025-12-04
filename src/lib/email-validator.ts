/**
 * Email validation and throwaway/disposable email detection
 */

// Common disposable/throwaway email domains
// This is a curated list - you can expand it or use a service like block-temporary-email.com
const DISPOSABLE_DOMAINS = new Set([
  // Popular throwaway email services
  'guerrillamail.com',
  'guerrillamail.net',
  'guerrillamail.org',
  'guerrillamail.biz',
  'guerrillamail.de',
  'sharklasers.com',
  'guerrillamailblock.com',
  'pokemail.net',
  'spam4.me',
  'grr.la',
  'guerrillamail.info',
  'mailinator.com',
  'trashmail.com',
  'tempmail.com',
  '10minutemail.com',
  '10minutemail.net',
  'throwaway.email',
  'throwawaymail.com',
  'temp-mail.org',
  'temp-mail.io',
  'getnada.com',
  'maildrop.cc',
  'yopmail.com',
  'emailondeck.com',
  'fakeinbox.com',
  'dispostable.com',
  'mintemail.com',
  'mytemp.email',
  'mohmal.com',
  'anonbox.net',
  'wegwerfmail.de',
  'mailnesia.com',
  'mailcatch.com',
  'burnermail.io',
  'getairmail.com',
  'mailsac.com',
  'tempail.com',
  'maildrop.cf',
  'armyspy.com',
  'cuvox.de',
  'dayrep.com',
  'einrot.com',
  'fleckens.hu',
  'gustr.com',
  'jourrapide.com',
  'rhyta.com',
  'superrito.com',
  'teleworm.us',
  'bialode.com',
  // Add more as needed
])

// Pattern-based detection for common throwaway patterns
const THROWAWAY_PATTERNS = [
  /temp.*mail/i,
  /trash.*mail/i,
  /disposable/i,
  /throwaway/i,
  /burner/i,
  /fake.*mail/i,
  /spam.*mail/i,
  /\d{10,}@/, // emails like 1234567890@domain.com (lots of numbers)
]

export interface EmailValidationResult {
  valid: boolean
  isDisposable: boolean
  domain: string
  reason?: string
}

/**
 * Check if an email is valid and detect throwaway/disposable emails
 */
export function validateEmail(email: string): EmailValidationResult {
  // Basic email format validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(email)) {
    return {
      valid: false,
      isDisposable: false,
      domain: '',
      reason: 'Invalid email format'
    }
  }

  const normalizedEmail = email.toLowerCase().trim()
  const domain = normalizedEmail.split('@')[1]

  // Check against known disposable domains
  if (DISPOSABLE_DOMAINS.has(domain)) {
    return {
      valid: true,
      isDisposable: true,
      domain,
      reason: 'Known disposable email domain'
    }
  }

  // Check against patterns
  for (const pattern of THROWAWAY_PATTERNS) {
    if (pattern.test(normalizedEmail)) {
      return {
        valid: true,
        isDisposable: true,
        domain,
        reason: 'Matches throwaway email pattern'
      }
    }
  }

  return {
    valid: true,
    isDisposable: false,
    domain
  }
}

/**
 * Check if an email is from a disposable/throwaway service
 */
export function isDisposableEmail(email: string): boolean {
  return validateEmail(email).isDisposable
}

/**
 * Get a list of all known disposable domains (for reference)
 */
export function getDisposableDomains(): string[] {
  return Array.from(DISPOSABLE_DOMAINS).sort()
}

/**
 * Add a custom disposable domain to the blocklist
 */
export function addDisposableDomain(domain: string): void {
  DISPOSABLE_DOMAINS.add(domain.toLowerCase())
}

/**
 * Check multiple emails at once
 */
export function validateEmails(emails: string[]): Map<string, EmailValidationResult> {
  const results = new Map<string, EmailValidationResult>()
  for (const email of emails) {
    results.set(email, validateEmail(email))
  }
  return results
}
