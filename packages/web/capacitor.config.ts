import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.geehive.macrotrackr',
  appName: 'MacroTrackr',
  // `NEXT_MOBILE=1 pnpm build` writes a static export to `out/`
  webDir: 'out',
  backgroundColor: '#030712',
  ios: {
    // Allow http localhost for dev-time live reload from the Mac host
    allowsLinkPreview: false,
    contentInset: 'always',
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
