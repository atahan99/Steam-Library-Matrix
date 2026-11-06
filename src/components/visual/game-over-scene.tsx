/**
 * 404 illustration: a CRT monitor showing "404 / GG", wired to a game controller.
 * Animations live in globals.css (`.nf-*`) because the CSP blocks inline <style> tags.
 */
export const GameOverScene = ({ className }: { className?: string }) => (
  <svg
    viewBox="0 0 360 330"
    role="img"
    aria-label="A retro monitor showing 404 and GG, connected to a game controller"
    className={className}
  >
    <defs>
      <linearGradient id="nf-title" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#7dd3fc" />
        <stop offset="0.5" stopColor="#a5b4fc" />
        <stop offset="1" stopColor="#e879f9" />
      </linearGradient>
      <radialGradient id="nf-screen" cx="0.5" cy="0.45" r="0.75">
        <stop offset="0" stopColor="#241f3a" />
        <stop offset="1" stopColor="#0c0a16" />
      </radialGradient>
      <pattern id="nf-scanlines" width="4" height="4" patternUnits="userSpaceOnUse">
        <rect width="4" height="1.5" fill="#ffffff" fillOpacity="0.045" />
      </pattern>
      <clipPath id="nf-screen-clip">
        <rect x="60" y="30" width="240" height="140" rx="12" />
      </clipPath>
    </defs>

    {/* signal cable from the monitor stand to the controller */}
    <path
      d="M228 214 C 268 230, 262 250, 236 262"
      fill="none"
      stroke="#4c4569"
      strokeWidth="3"
      strokeLinecap="round"
    />
    <path
      className="nf-signal"
      d="M228 214 C 268 230, 262 250, 236 262"
      fill="none"
      stroke="#e879f9"
      strokeWidth="3"
      strokeLinecap="round"
    />

    {/* monitor */}
    <rect x="40" y="10" width="280" height="180" rx="20" fill="#1e1b2e" stroke="#4c4569" strokeWidth="2" />
    <rect x="60" y="30" width="240" height="140" rx="12" fill="url(#nf-screen)" />
    <g clipPath="url(#nf-screen-clip)" className="nf-flicker">
      <text
        className="nf-glitch"
        x="180"
        y="112"
        textAnchor="middle"
        fontSize="68"
        fontWeight="700"
        fill="url(#nf-title)"
      >
        404
      </text>
      <text
        className="nf-blink"
        x="180"
        y="150"
        textAnchor="middle"
        fontSize="20"
        fontWeight="600"
        letterSpacing="6"
        fill="#e879f9"
      >
        GG
      </text>
      <rect x="60" y="30" width="240" height="140" fill="url(#nf-scanlines)" />
      <rect className="nf-sweep" x="60" y="30" width="240" height="18" fill="#ffffff" fillOpacity="0.05" />
    </g>
    <circle cx="300" cy="180" r="3" className="nf-led" fill="#7dd3fc" />
    {/* stand */}
    <path d="M160 190 L200 190 L210 212 L150 212 Z" fill="#1e1b2e" stroke="#4c4569" strokeWidth="2" strokeLinejoin="round" />
    <rect x="128" y="210" width="104" height="8" rx="4" fill="#4c4569" />

    {/* controller */}
    <g className="nf-pad">
      <path
        d="M118 250 h124 a34 34 0 0 1 32 23 l10 30 a18 18 0 0 1 -30 18 l-18 -18 h-112 l-18 18 a18 18 0 0 1 -30 -18 l10 -30 a34 34 0 0 1 32 -23 z"
        fill="#2a2540"
        stroke="#4c4569"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      {/* d-pad */}
      <rect x="112" y="276" width="34" height="11" rx="3" fill="#7dd3fc" />
      <rect x="123.5" y="264.5" width="11" height="34" rx="3" fill="#7dd3fc" />
      {/* start / select */}
      <rect x="164" y="277" width="13" height="6" rx="3" fill="#4c4569" />
      <rect x="183" y="277" width="13" height="6" rx="3" fill="#4c4569" />
      {/* face buttons light up in turn */}
      <circle className="nf-btn" style={{ animationDelay: "0s" }} cx="234" cy="268" r="6.5" fill="#a5b4fc" />
      <circle className="nf-btn" style={{ animationDelay: "0.6s" }} cx="248" cy="281" r="6.5" fill="#e879f9" />
      <circle className="nf-btn" style={{ animationDelay: "1.2s" }} cx="234" cy="294" r="6.5" fill="#7dd3fc" />
      <circle className="nf-btn" style={{ animationDelay: "1.8s" }} cx="220" cy="281" r="6.5" fill="#c4b5fd" />
    </g>
  </svg>
)
