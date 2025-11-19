import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    // Allow production builds to complete even with ESLint errors
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Allow production builds to complete even with TypeScript errors (temporarily during deployment)
    ignoreBuildErrors: true,
  },
  webpack: (config, { isServer }) => {
    // Exclude scripts directory from webpack processing
    config.externals = config.externals || [];
    if (isServer) {
      config.externals.push(/^scripts\//);
    }
    return config;
  },
  async headers() {
    return [
      {
        // Apply CORS headers to all API routes
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET, POST, PATCH, PUT, DELETE, OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: 'Content-Type, Authorization' },
        ],
      },
      {
        // Add CSP headers to allow Stripe resources
        source: '/(.*)',
        headers: [
          {
            key: 'Content-Security-Policy-Report-Only',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com https://*.stripe.com",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://*.stripe.com",
              "font-src 'self' data: https://fonts.gstatic.com https://js.stripe.com https://*.stripe.com",
              "img-src 'self' data: https: blob:",
              "connect-src 'self' https://api.stripe.com https://*.stripe.com https://maps.googleapis.com https://*.supabase.co wss://*.supabase.co",
              "frame-src 'self' https://js.stripe.com https://*.stripe.com https://hooks.stripe.com",
              "object-src 'none'",
              "base-uri 'self'",
              "form-action 'self'"
            ].join('; ')
          }
        ],
      },
    ];
  },
};

export default nextConfig;
