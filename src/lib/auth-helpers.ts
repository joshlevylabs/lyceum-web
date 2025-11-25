import { NextRequest } from 'next/server';
import { createClient as createServerClient } from '@/lib/supabase-server';
import { createClient } from '@supabase/supabase-js';

/**
 * Get authenticated user from either Authorization header (JWT) or cookies (session)
 * This supports both:
 * 1. External API access (Centcom native app) via Bearer token
 * 2. Web dashboard access via session cookies
 */
export async function getAuthenticatedUser(request: NextRequest) {
  // Check for Authorization header first (for external API access)
  const authHeader = request.headers.get('authorization');

  if (authHeader && authHeader.startsWith('Bearer ')) {
    // Extract token from "Bearer <token>"
    const token = authHeader.replace('Bearer ', '');

    // Use service role client to verify the JWT token
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
