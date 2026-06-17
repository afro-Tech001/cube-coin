import { useEffect, useRef, useState } from "react";
import "./Loader.css";

// ── Cube logo SVG rendered on the front face ─────────────────────────────────
function CubeLogoSVG() {
  return (
    <svg className="face-logo" viewBox="0 0 54 54" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="ltf" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#b9ffc1" />
          <stop offset="100%" stopColor="#4ade80" />
        </linearGradient>
        <linearGradient id="llf" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#4ade80" />
          <stop offset="100%" stopColor="#166534" />
        </linearGradient>
        <linearGradient id="lrf" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#22c55e" />
          <stop offset="100%" stopColor="#0d4a24" />
        </linearGradient>
      </defs>

      {/* top cube */}
      <g className="cube-logo-top">
        <polygon points="27,3 36,8 36,18 27,23 18,18 18,8" fill="url(#ltf)" />
        <polygon points="27,3 36,8 27,13 18,8" fill="#d4ffda" opacity="0.75" />
        <polygon points="27,13 36,8 36,18 27,23" fill="url(#lrf)" />
        <polygon points="27,13 18,8 18,18 27,23" fill="url(#llf)" />
      </g>

      {/* bottom-left cube */}
      <g className="cube-logo-left">
        <polygon points="16,27 25,32 25,42 16,47 7,42 7,32" fill="url(#ltf)" />
        <polygon points="16,27 25,32 16,37 7,32" fill="#d4ffda" opacity="0.75" />
        <polygon points="16,37 25,32 25,42 16,47" fill="url(#lrf)" />
        <polygon points="16,37 7,32 7,42 16,47" fill="url(#llf)" />
      </g>

      {/* bottom-right cube */}
      <g className="cube-logo-right">
        <polygon points="38,27 47,32 47,42 38,47 29,42 29,32" fill="url(#ltf)" />
        <polygon points="38,27 47,32 38,37 29,32" fill="#d4ffda" opacity="0.75" />
        <polygon points="38,37 47,32 47,42 38,47" fill="url(#lrf)" />
        <polygon points="38,37 29,32 29,42 38,47" fill="url(#llf)" />
      </g>
    </svg>
  );
}

// ── Animated percentage counter ───────────────────────────────────────────────
function useCounter(duration = 3000) {
  const [value, setValue] = useState(0);
  const raf = useRef(null);

  useEffect(() => {
    const start = performance.now();
    const tick = (now) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      // ease-out curve
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.floor(eased * 100));
      if (progress < 1) raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [duration]);

  return value;
}

// ── Loader ────────────────────────────────────────────────────────────────────
export default function Loader() {
  const pct = useCounter(3200);

  return (
    <div className="loader-page">
      {/* ambient orbs */}
      <div className="loader-orb loader-orb-1" />
      <div className="loader-orb loader-orb-2" />
      <div className="loader-orb loader-orb-3" />

      <div className="loader-content">

        {/* ── 3D spinning cube ── */}
        <div className="cube-stage">
          <div className="cube-3d">
            <div className="face face-front">
              <CubeLogoSVG />
            </div>
            <div className="face face-back" />
            <div className="face face-left" />
            <div className="face face-right" />
            <div className="face face-top" />
            <div className="face face-bottom" />
          </div>
        </div>

        {/* ── Wordmark ── */}
        <div className="loader-wordmark">
          <span className="loader-wm-cube">CUBE</span>
          <span className="loader-wm-coin">COIN</span>
        </div>

        {/* ── Tagline ── */}
        <p className="loader-tagline">Powering the Future of Digital Mining</p>

        {/* ── Loading bar ── */}
        <div className="loading-bar-wrap">
          <span
            className="load-pct"
            style={pct === 100 ? { color: "#7fff6e" } : undefined}
          >
            {pct}%
          </span>
          <div className="loading-bar">
            <div className="loading-fill" />
          </div>
        </div>

        {/* ── Status dots ── */}
        <div className="status-dots">
          {["Chain", "Node", "Sync"].map((label) => (
            <div key={label} className="status-dot">
              <div className="status-dot-pip" />
              {label}
            </div>
          ))}
        </div>

      </div>
    </div>
  );
}