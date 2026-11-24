'use client';

import { useEffect, useState } from 'react';

// Animated launch splash that continues from the static iOS launch
// storyboard. The storyboard shows the flame on #030712 before React
// mounts; this component mounts immediately after and plays the ignite
// animation on the SAME background colour, so the handoff reads as one
// continuous transition rather than a cut. After ~1300ms it fades out,
// revealing whatever the app has rendered beneath it.
//
// Lives above everything (z-[100]) and starts with pointer-events-auto so
// nothing underneath can be tapped during the intro; drops to none during
// the fade-out so taps go through before it unmounts.

const TOTAL_MS = 1400;

export function AppSplash() {
  const [stage, setStage] = useState<'intro' | 'fading' | 'gone'>('intro');

  useEffect(() => {
    // Start fade at TOTAL_MS - 300 so the 300ms transition finishes right at TOTAL_MS.
    const fadeAt = window.setTimeout(() => setStage('fading'), TOTAL_MS - 300);
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
        transition: 'opacity 300ms ease-out',
        pointerEvents: stage === 'fading' ? 'none' : 'auto',
      }}
    >
      <style>{`
        @keyframes mt-ignite {
          0%   { transform: scale(0.35) translateY(28px); opacity: 0; filter: brightness(0.35); }
          55%  { transform: scale(1.08) translateY(0);    opacity: 1; filter: brightness(1.15); }
          75%  { transform: scale(0.96) translateY(0);    opacity: 1; filter: brightness(0.95); }
          100% { transform: scale(1)    translateY(0);    opacity: 1; filter: brightness(1); }
        }
        @keyframes mt-flicker {
          0%, 100% { filter: brightness(1) drop-shadow(0 0 8px rgba(255,120,40,0.35)); }
          50%      { filter: brightness(1.08) drop-shadow(0 0 14px rgba(255,160,60,0.55)); }
        }
        @keyframes mt-word {
          0%   { transform: translateY(8px); opacity: 0; letter-spacing: 0.15em; }
          100% { transform: translateY(0);   opacity: 1; letter-spacing: 0.02em; }
        }
        .mt-flame {
          width: 96px;
          height: auto;
          animation:
            mt-ignite 700ms cubic-bezier(0.34, 1.56, 0.64, 1) both,
            mt-flicker 1600ms ease-in-out 700ms infinite;
          transform-origin: 50% 85%;
        }
        .mt-word {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
          font-size: 1.125rem;
          font-weight: 600;
          color: #f3f4f6;
          animation: mt-word 500ms ease-out 550ms both;
        }
        .mt-word .mt-word-light { color: #9ca3af; font-weight: 400; }
      `}</style>

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

      <div className="mt-word">
        macro<span className="mt-word-light">trackr</span>
      </div>
    </div>
  );
}
