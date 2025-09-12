import crypto from 'crypto'
import { v4 as uuidv4 } from 'uuid'

const getSigningKey = () => {
  const key = process.env.CENTCOM_SIGNING_KEY
  if (!key) {
    console.warn('CENTCOM_SIGNING_KEY is not set. Using a default key for development. THIS IS INSECURE FOR PRODUCTION.')
    return 'insecure-development-key-please-change'
  }
  return key
}

export const signLicenseData = (data: string): string => {
  const signingKey = getSigningKey()
  const hmac = crypto.createHmac('sha256', signingKey)
  hmac.update(data)
  return hmac.digest('base64url')
}

export const verifyLicenseSignature = (data: string, signature: string): boolean => {
  try {
    const expectedSignature = signLicenseData(data)
    return crypto.timingSafeEqual(
      Buffer.from(signature, 'base64url'),
      Buffer.from(expectedSignature, 'base64url')
    )
  } catch (error) {
    console.error('License signature verification failed:', error)
    return false
  }
}

export const parseCentcomLicenseKey = (licenseKey: string) => {
  try {
    // Centcom license format: base64url(data).base64url(signature)
    const parts = licenseKey.split('.')
    if (parts.length !== 2) {
      throw new Error('Invalid license key format')
    }

    const [dataB64, signatureB64] = parts
    
    // Decode the data
    const dataJson = Buffer.from(dataB64, 'base64url').toString('utf-8')
    const data = JSON.parse(dataJson)
    
    // Verify signature
    const isValid = verifyLicenseSignature(dataJson, signatureB64)
    
    return {
      isValid,
      data: {
        key_id: data.key_id,
        plugin_id: data.plugin_id,
        user_id: data.user_id,
        issued_at: data.issued_at ? new Date(data.issued_at) : null,
        expires_at: data.expires_at ? new Date(data.expires_at) : null,
        permissions: data.permissions || [],
        metadata: data.metadata || {}
      },
      rawData: data
    }
  } catch (error) {
    console.error('Failed to parse Centcom license key:', error)
    return {
      isValid: false,
      data: null,
      error: error instanceof Error ? error.message : 'Unknown parsing error'
    }
  }
}

export const generateCentcomLicenseKey = (
  plugin_id: string,
  user_id: string | null,
  expiration: Date | null,
  permissions: string[] = [],
  metadata: Record<string, any> = {}
): { license_key: string; key_id: string } => {
  const key_id = uuidv4()
  const issued_at = new Date()
  
  const licenseData = {
    key_id,
    plugin_id,
    user_id,
    issued_at: issued_at.toISOString(),
    expires_at: expiration?.toISOString() || null,
    permissions,
    metadata
  }
  
  // Convert to JSON and encode
  const dataJson = JSON.stringify(licenseData)
  const dataB64 = Buffer.from(dataJson, 'utf-8').toString('base64url')
  
  // Sign the data
  const signature = signLicenseData(dataJson)
  
  // Combine into final license key
  const license_key = `${dataB64}.${signature}`
  
  return { license_key, key_id }
}

export const validateCentcomLicense = (licenseKey: string) => {
  const parsed = parseCentcomLicenseKey(licenseKey)
  
  if (!parsed.isValid || !parsed.data) {
    return {
      isValid: false,
      isExpired: false,
      error: parsed.error || 'Invalid license'
    }
  }
  
  // Check expiration
  const now = new Date()
  const isExpired = parsed.data.expires_at ? parsed.data.expires_at < now : false
  
  return {
    isValid: true,
    isExpired,
    data: parsed.data,
    error: isExpired ? 'License has expired' : null
  }
}

// Helper function to create a basic license for a plugin
export const createBasicLicense = (
  plugin_id: string,
  user_id: string | null = null,
  durationDays: number | null = null
) => {
  const expiration = durationDays ? new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000) : null
  const permissions = ['basic_access']
  
  return generateCentcomLicenseKey(plugin_id, user_id, expiration, permissions)
}

// Helper function to create a trial license
export const createTrialLicense = (
  plugin_id: string,
  user_id: string | null = null,
  trialDays: number = 30
) => {
  const expiration = new Date(Date.now() + trialDays * 24 * 60 * 60 * 1000)
  const permissions = ['trial_access', 'basic_features']
  const metadata = { license_type: 'trial', trial_days: trialDays }
  
  return generateCentcomLicenseKey(plugin_id, user_id, expiration, permissions, metadata)
}

// Helper function to create a professional license
export const createProfessionalLicense = (
  plugin_id: string,
  user_id: string | null = null,
  expiration: Date | null = null
) => {
  const permissions = ['professional_access', 'advanced_features', 'api_access']
  const metadata = { license_type: 'professional' }
  
  return generateCentcomLicenseKey(plugin_id, user_id, expiration, permissions, metadata)
}

