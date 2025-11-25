import { NextRequest } from 'next/server';
import { createClient as createServerClient } from '@/lib/supabase-server';
import { createClient } from '@supabase/supabase-js';
import { decodeLyceumToken, verifyLyceumToken } from '@/lib/auth';

/**
 * Get authenticated user from either Authorization header (JWT) or cookies (session)
 * This supports both:
 * 1. External API access (Centcom native app) via custom Lyceum JWT Bearer token
 * 2. External API access via Supabase JWT Bearer token
 * 3. Web dashboard access via session cookies
 */
export async function getAuthenticatedUser(request: NextRequest) {
  // Check for Authorization header first (for external API access)
  const authHeader = request.headers.get('authorization');

  if (authHeader && authHeader.startsWith('Bearer ')) {
    // Extract token from "Bearer <token>"
    const token = authHeader.replace('Bearer ', '');

    // Try to decode as a custom Lyceum token first (from /api/centcom/auth/login)
    const lyceumPayload = decodeLyceumToken(token);

    if (lyceumPayload) {
      // This is a custom Lyceum JWT token (issued by Centcom login)
      // Verify the token is valid
      const isValid = await verifyLyceumToken(token);

      if (!isValid) {
        return { user: null, error: 'Invalid or expired Lyceum token' };
      }

      // Extract user_id from the token and verify user exists
      const userId = lyceumPayload.sub;

      // Use service role to fetch user
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
      const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
      const supabase = createClient(supabaseUrl, serviceKey);

      // Verify user exists in auth.users
      const { data: { user }, error: userError } = await supabase.auth.admin.getUserById(userId);

      if (userError || !user) {
        return { user: null, error: 'User not found' };
      }

      return { user, error: null };
    }

    // Not a Lyceum token, try as a Supabase token
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return { user: null, error: 'Invalid or expired token' };
    }

    return { user, error: null };
  }

  // Fall back to cookie-based authentication (for web dashboard)
  const supabase = await createServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return { user: null, error: 'Unauthorized' };
  }

  return { user, error: null };
}
