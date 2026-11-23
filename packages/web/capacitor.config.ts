import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.geehive.macrotrackr',
  appName: 'MacroTrackr',
  // `NEXT_MOBILE=1 pnpm build` writes a static export to `out/`
  webDir: 'out',
  backgroundColor: '#030712',
  ios: {
    allowsLinkPreview: false,
    contentInset: 'always',
  },
  // Serve bundled web assets as if they came from the real web origin.
  // Changes only the Origin header the WKWebView sends when calling the
  // API; the bundle still loads from local files. This lets the Fastify
  // CORS allowlist (which already accepts https://macros.geehive.com)
  // accept requests from the native app without any server change.
  server: {
    hostname: 'macros.geehive.com',
    iosScheme: 'https',
    androidScheme: 'https',
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1500,
      launchAutoHide: true,
      launchFadeOutDuration: 200,
      backgroundColor: '#030712',
      showSpinner: false,
    },
  },
};

export default config;
