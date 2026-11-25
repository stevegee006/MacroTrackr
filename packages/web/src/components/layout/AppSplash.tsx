'use client';

import { useEffect, useState } from 'react';

// Animated launch splash that continues from the native iOS launch screen.
//
// Boot sequence on iOS (what the user actually sees):
//   1. iOS launch storyboard (solid #030712, no flame — generated from
//      assets/splash.png) from tap to webview-ready. Reads as a brief dark
//      pause, not a static image of the brand.
//   2. Capacitor SplashScreen plugin covers the webview until we dismiss it.
//   3. We mount, call SplashScreen.hide() with no fade, and run our ignite
//      animation on top of the app for ~3200ms, then fade ourselves out.
//
// Because the native launch image has no flame on it, the first flame the
// user sees is the animated one — it feels like the app itself is igniting
// into existence rather than fading up from a pre-existing logo.

const TOTAL_MS = 3200;
const FADE_MS = 500;

export function AppSplash() {
  const [stage, setStage] = useState<'intro' | 'fading' | 'gone'>('intro');

  useEffect(() => {
    // Kill the Capacitor SplashScreen plugin immediately so the ignite
    // animation isn't hidden behind the static native cover. Safe on web —
    // SplashScreen.hide() is a no-op when Capacitor isn't native.
    (async () => {
      try {
        const { SplashScreen } = await import('@capacitor/splash-screen');
        await SplashScreen.hide({ fadeOutDuration: 0 });
      } catch {
        // Plugin not available on web, or already hidden — ignore.
      }
    })();

    const fadeAt = window.setTimeout(() => setStage('fading'), TOTAL_MS - FADE_MS);
    const removeAt = window.setTimeout(() => setStage('gone'), TOTAL_MS);
    return () => {
      window.clearTimeout(fadeAt);
      window.clearTimeout(removeAt);
    };
  }, []);

  if (stage === 'gone') return null;

  return (
    <div
      aria-hidden="true"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100,
        background: '#030712',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '2rem',
        opacity: stage === 'fading' ? 0 : 1,
        transition: `opacity ${FADE_MS}ms ease-out`,
        pointerEvents: stage === 'fading' ? 'none' : 'auto',
      }}
    >
      <style>{`
        /*
         * Ignite: flame starts tiny, dim, pushed down (like a spark catching),
         * overshoots full size at 60%, settles back. The cubic-bezier curve
         * gives a punchy "whoosh" feel. Duration 900ms so it's clearly
         * visible, not a subliminal flash.
         */
        @keyframes mt-ignite {
          0%   { transform: scale(0.15) translateY(40px); opacity: 0; filter: brightness(0.3); }
          40%  { transform: scale(0.9)  translateY(4px);  opacity: 1; filter: brightness(1.3); }
          65%  { transform: scale(1.18) translateY(-2px); opacity: 1; filter: brightness(1.2); }
          80%  { transform: scale(0.94) translateY(0);    opacity: 1; filter: brightness(0.95); }
          100% { transform: scale(1)    translateY(0);    opacity: 1; filter: brightness(1); }
        }
        /*
         * Flicker: continuous after the ignite. Combines a slight scale
         * breathing pattern with a brightness pulse + glow. The two cycles
         * (1100ms and 740ms) are co-prime enough to look irregular rather
         * than metronomic.
         */
        @keyframes mt-flicker-scale {
          0%, 100% { transform: scale(1)     translateY(0); }
          50%      { transform: scale(1.025) translateY(-1px); }
        }
        @keyframes mt-flicker-glow {
          0%, 100% { filter: brightness(1)   drop-shadow(0 0 10px rgba(255, 120, 40, 0.35)); }
          50%      { filter: brightness(1.1) drop-shadow(0 0 18px rgba(255, 170, 70, 0.55)); }
        }
        /*
         * Fade + rise only. We previously animated letter-spacing from 0.18em
         * down to 0.02em, which made every letter shift sideways during the
         * fade-in — the "o" sits dead center and so read most clearly as
         * drifting. Fixed spacing keeps the whole wordmark anchored.
         *
         * translateZ(0) is deliberate on BOTH keyframe stops — not for
         * motion, but to keep the wordmark on its own GPU compositor layer
         * for the entire animation. Without it, the flame's flicker
         * forces the whole splash region to re-composite each frame and
         * the wordmark text gets re-rasterized at sub-pixel offsets,
         * which reads as the round letters (notably the "o") jiggling.
         */
        @keyframes mt-word {
          0%   { transform: translateY(10px) translateZ(0); opacity: 0; }
          100% { transform: translateY(0)    translateZ(0); opacity: 1; }
        }

        .mt-flame-wrap {
          width: 112px;
          height: auto;
          transform-origin: 50% 90%;
          animation: mt-ignite 900ms cubic-bezier(0.34, 1.56, 0.64, 1) both;
        }
        /* Second wrapper so the flicker can run in parallel without
           fighting the ignite's transform. */
        .mt-flame {
          width: 100%;
          height: auto;
          transform-origin: 50% 90%;
          animation:
            mt-flicker-scale 1100ms ease-in-out 900ms infinite,
            mt-flicker-glow   740ms ease-in-out 900ms infinite;
        }
        .mt-word {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
          font-size: 1.25rem;
          font-weight: 600;
          letter-spacing: 0.02em;
          color: #f3f4f6;
          animation: mt-word 500ms ease-out 750ms both;
          /* Keep the wordmark on its own compositor layer even after the
             animation finishes — the flame's flicker loop runs forever
             and will keep jiggling text that isn't isolated. */
          will-change: transform, opacity;
          transform: translateZ(0);
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
          /* backface-visibility: hidden has no visual effect here but tells
             mobile Safari to keep the compositor layer around. */
          backface-visibility: hidden;
        }
        .mt-word .mt-word-light { color: #9ca3af; font-weight: 400; }
      `}</style>

      <div className="mt-flame-wrap">
        <svg
          className="mt-flame"
          viewBox="160 60 192 260"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <linearGradient id="splashFlameOuter" x1="40%" y1="0%" x2="60%" y2="100%">
              <stop offset="0%" stopColor="#ff7433" />
              <stop offset="55%" stopColor="#ff3800" />
              <stop offset="100%" stopColor="#c92b00" />
            </linearGradient>
            <linearGradient id="splashFlameInner" x1="40%" y1="0%" x2="60%" y2="100%">
              <stop offset="0%" stopColor="#fff0a0" />
              <stop offset="100%" stopColor="#ffbe00" />
            </linearGradient>
          </defs>
          <path
            d="M256 90 C256 90 224 148 216 192 C210 224 218 252 226 266 C218 240 220 214 230 202 C228 238 236 264 248 280 C244 256 244 232 252 220 C254 244 256 268 256 280 C256 268 258 244 260 220 C268 232 268 256 264 280 C276 264 284 238 282 202 C292 214 294 240 286 266 C294 252 302 224 296 192 C288 148 256 90 256 90Z"
            fill="url(#splashFlameOuter)"
          />
          <path
            d="M256 180 C256 180 240 208 238 228 C236 244 242 258 248 266 C244 252 244 238 250 230 C250 246 252 258 256 266 C260 258 262 246 262 230 C268 238 268 252 264 266 C270 258 276 244 274 228 C272 208 256 180 256 180Z"
            fill="url(#splashFlameInner)"
          />
        </svg>
      </div>

      <div className="mt-word">
        macro<span className="mt-word-light">trackr</span>
      </div>
    </div>
  );
}
