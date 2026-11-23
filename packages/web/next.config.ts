import type { NextConfig } from 'next';
import path from 'path';
import withSerwistInit from '@serwist/next';

// NEXT_MOBILE=1 builds a static export for the Capacitor iOS/Android wrapper.
// Unset (the default) builds the standalone Node server for the Docker web container.
const isMobile = process.env.NEXT_MOBILE === '1';

const withSerwist = withSerwistInit({
  swSrc: 'src/sw.ts',
  swDest: 'public/sw.js',
  // Service worker is useless inside a Capacitor WKWebView and would conflict
  // with the native offline story. Disable it for the mobile build.
  disable: process.env.NODE_ENV === 'development' || isMobile,
});

const nextConfig: NextConfig = isMobile
  ? {
      output: 'export',
      images: { unoptimized: true },
      transpilePackages: ['@macrotracker/shared'],
      // Trailing slash keeps relative asset paths well-behaved inside file://
      // which is what Capacitor serves from in the production native build.
      trailingSlash: true,
    }
  : {
      output: 'standalone',
      outputFileTracingRoot: path.join(import.meta.dirname, '../../'),
      transpilePackages: ['@macrotracker/shared'],
    };

export default withSerwist(nextConfig);
