import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-utils';

/**
 * Diagnostic endpoint to check Stripe configuration
 * This endpoint is for debugging environment variable issues
 * It does NOT expose the actual secret keys
 */
export async function GET(request: NextRequest) {
  try {
    // Require admin authentication
    const { success, user, response } = await requireAuth(request);
    if (!success || user.role !== 'admin') {
      return response || NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const stripeMode = process.env.STRIPE_MODE || 'test';
    const isLiveMode = stripeMode === 'live';

    const testKey = process.env.STRIPE_SECRET_KEY;
    const liveKey = process.env.STRIPE_LIVE_SECRET_KEY;
    const activeKey = isLiveMode ? liveKey : testKey;

    // Get all Stripe-related environment variables (without values)
    const stripeEnvVars = Object.keys(process.env)
      .filter(key => key.includes('STRIPE'))
      .sort()
      .reduce((acc, key) => {
        const value = process.env[key];
        acc[key] = {
          exists: !!value,
          length: value?.length || 0,
          prefix: value?.substring(0, 12) || 'MISSING',
          isValidFormat: value ? (
            key.includes('SECRET') ?
              (value.startsWith('sk_test_') || value.startsWith('sk_live_')) :
            key.includes('PUBLISHABLE') ?
              (value.startsWith('pk_test_') || value.startsWith('pk_live_')) :
            key.includes('WEBHOOK') ?
              value.startsWith('whsec_') :
            true
          ) : false,
        };
        return acc;
      }, {} as Record<string, any>);

    return NextResponse.json({
      success: true,
      configuration: {
        mode: stripeMode,
        isLiveMode,
        activeKeyType: isLiveMode ? 'STRIPE_LIVE_SECRET_KEY' : 'STRIPE_SECRET_KEY',
        activeKeyExists: !!activeKey,
        activeKeyValid: activeKey ? (
          isLiveMode ? activeKey.startsWith('sk_live_') : activeKey.startsWith('sk_test_')
        ) : false,
        activeKeyLength: activeKey?.length || 0,
        activeKeyPrefix: activeKey?.substring(0, 12) || 'MISSING',
      },
      environmentVariables: stripeEnvVars,
      recommendations: [
        !activeKey ? '❌ Active Stripe secret key is missing!' : null,
        activeKey && !activeKey.startsWith(isLiveMode ? 'sk_live_' : 'sk_test_') ?
          '❌ Active Stripe secret key has invalid format!' : null,
        activeKey && activeKey.length < 50 ?
          '⚠️ Active Stripe secret key seems too short!' : null,
        activeKey && activeKey.startsWith(isLiveMode ? 'sk_live_' : 'sk_test_') && activeKey.length >= 50 ?
          '✅ Active Stripe secret key looks valid!' : null,
      ].filter(Boolean),
    });

  } catch (error: any) {
    console.error('Config check error:', error);
    return NextResponse.json(
      {
        error: 'Failed to check configuration',
        details: error.message,
        stack: error.stack
      },
      { status: 500 }
    );
  }
}
