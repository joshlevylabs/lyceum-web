/**
 * Decode and verify Lyceum JWT tokens
 * These are custom JWTs issued by Lyceum's /api/centcom/auth/login endpoint
 */

interface LyceumJWTPayload {
  iss: string;      // "lyceum"
  aud: string;      // "centcom"
  sub: string;      // user_id
  email: string;
  roles: string[];
  license_type: string;
  exp: number;
  iat: number;
}

/**
 * Decode a Lyceum JWT token (without verification for now)
 * In production, you should verify the signature with CENTCOM_SIGNING_KEY
 */
export function decodeLyceumToken(token: string): LyceumJWTPayload | null {
  try {
    // JWT format: header.payload.signature
    const parts = token.split('.');
    if (parts.length !== 3) {
      return null;
    }

    // Decode the payload (base64url)
    const payload = parts[1];
    const decoded = Buffer.from(payload, 'base64url').toString('utf8');
    const data = JSON.parse(decoded) as LyceumJWTPayload;

    // Check if token is expired
    const now = Math.floor(Date.now() / 1000);
    if (data.exp && data.exp < now) {
      console.warn('Token expired:', new Date(data.exp * 1000));
      return null;
    }

    // Verify it's a Lyceum token
    if (data.iss !== 'lyceum' || data.aud !== 'centcom') {
      console.warn('Invalid token issuer/audience');
      return null;
    }

    return data;
  } catch (error) {
    console.error('Failed to decode token:', error);
    return null;
  }
}

/**
 * Get user ID from a Lyceum JWT token
 */
export function getUserIdFromToken(token: string): string | null {
  const payload = decodeLyceumToken(token);
  return payload?.sub || null;
}

/**
 * Verify a Lyceum JWT token signature (optional, for production)
 * Requires CENTCOM_SIGNING_KEY environment variable
 */
export async function verifyLyceumToken(token: string): Promise<boolean> {
  // For now, just decode and check expiry
  // In production, verify HMAC signature with CENTCOM_SIGNING_KEY
  const payload = decodeLyceumToken(token);
  return payload !== null;
}
