import type { Metadata, Viewport } from 'next';
import { AuthProvider } from '@/providers/AuthProvider';
import { QueryProvider } from '@/providers/QueryProvider';
import { ThemeProvider } from '@/providers/ThemeProvider';
import './globals.css';

export const metadata: Metadata = {
  title: 'MacroTrackr',
  description: 'Track your macros, scan barcodes, and get AI-powered nutrition plans',
  manifest: '/manifest.json',
  icons: {
    icon: '/favicon.svg',
    apple: '/apple-touch-icon.png',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'MacroTrackr',
  },
  formatDetection: {
    telephone: false,
  },
  other: {
    'color-scheme': 'light dark',
  },
};

export const viewport: Viewport = {
  themeColor: '#10b981',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  viewportFit: 'cover',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* iOS PWA Splash Screens — all iPhone/iPad sizes */}
        {/* iPhone 16/17 Pro Max (440x956@3x) */}
        <link rel="apple-touch-startup-image" href="/splash/iPhone_16_Pro_Max.png" media="(device-width: 440px) and (device-height: 956px) and (-webkit-device-pixel-ratio: 3)" />
        {/* iPhone 16/17 Pro (402x874@3x) */}
        <link rel="apple-touch-startup-image" href="/splash/iPhone_16_Pro.png" media="(device-width: 402px) and (device-height: 874px) and (-webkit-device-pixel-ratio: 3)" />
        {/* iPhone 15/16 Plus, 15 Pro Max, 17 Air (430x932@3x) */}
        <link rel="apple-touch-startup-image" href="/splash/iPhone_15_Pro_Max.png" media="(device-width: 430px) and (device-height: 932px) and (-webkit-device-pixel-ratio: 3)" />
        {/* iPhone 15/16/17, 15 Pro (393x852@3x) */}
        <link rel="apple-touch-startup-image" href="/splash/iPhone_15_Pro.png" media="(device-width: 393px) and (device-height: 852px) and (-webkit-device-pixel-ratio: 3)" />
        {/* iPhone 14/13/12, SE 4th gen (390x844@3x) */}
        <link rel="apple-touch-startup-image" href="/splash/iPhone_14.png" media="(device-width: 390px) and (device-height: 844px) and (-webkit-device-pixel-ratio: 3)" />
        {/* iPhone X/XS/11 Pro/12 mini/13 mini (375x812@3x) */}
        <link rel="apple-touch-startup-image" href="/splash/iPhone_X.png" media="(device-width: 375px) and (device-height: 812px) and (-webkit-device-pixel-ratio: 3)" />
        {/* iPhone 14/13/12 Pro Max, 11 Pro Max, XS Max (428x926@3x) */}
        <link rel="apple-touch-startup-image" href="/splash/iPhone_16_Plus.png" media="(device-width: 428px) and (device-height: 926px) and (-webkit-device-pixel-ratio: 3)" />
        {/* iPhone XR/11 (414x896@2x) */}
        <link rel="apple-touch-startup-image" href="/splash/iPhone_8_Plus.png" media="(device-width: 414px) and (device-height: 896px) and (-webkit-device-pixel-ratio: 2)" />
        {/* iPhone 8 Plus (414x736@3x) */}
        <link rel="apple-touch-startup-image" href="/splash/iPhone_8_Plus.png" media="(device-width: 414px) and (device-height: 736px) and (-webkit-device-pixel-ratio: 3)" />
        {/* iPhone 8/SE 2nd/3rd gen (375x667@2x) */}
        <link rel="apple-touch-startup-image" href="/splash/iPhone_8.png" media="(device-width: 375px) and (device-height: 667px) and (-webkit-device-pixel-ratio: 2)" />
        {/* iPad Pro 11" (834x1194@2x) */}
        <link rel="apple-touch-startup-image" href="/splash/iPad_Pro_11.png" media="(device-width: 834px) and (device-height: 1194px) and (-webkit-device-pixel-ratio: 2)" />
        {/* iPad Pro 12.9" (1024x1366@2x) */}
        <link rel="apple-touch-startup-image" href="/splash/iPad_Pro_12.png" media="(device-width: 1024px) and (device-height: 1366px) and (-webkit-device-pixel-ratio: 2)" />
        {/* iPad Air 11" (820x1180@2x) */}
        <link rel="apple-touch-startup-image" href="/splash/iPad_Air_11.png" media="(device-width: 820px) and (device-height: 1180px) and (-webkit-device-pixel-ratio: 2)" />
        {/* iPad mini 6th gen (744x1133@2x) */}
        <link rel="apple-touch-startup-image" href="/splash/iPad_mini_6.png" media="(device-width: 744px) and (device-height: 1133px) and (-webkit-device-pixel-ratio: 2)" />
      </head>
      <body className="bg-gradient-to-br from-gray-50 via-white to-gray-100 text-gray-900 dark:bg-none dark:bg-gray-950 dark:text-gray-100 antialiased">
        <div className="pointer-events-none fixed inset-0 z-0 hidden dark:block">
          <div className="absolute -top-40 left-1/2 h-96 w-96 -translate-x-1/2 rounded-full bg-emerald-500/5 blur-3xl" />
        </div>
        <ThemeProvider>
          <QueryProvider>
            <AuthProvider>{children}</AuthProvider>
          </QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
