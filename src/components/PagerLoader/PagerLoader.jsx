/**
 * CubeCoin Loading Components
 * Import what you need:
 *
 *   import {
 *     PageLoader,      // full-screen overlay with 3D spinning cube
 *     Spinner,         // ring | dual | dots | pulse | bars
 *     SkeletonLoader,  // pulsing placeholder rows
 *     InlineLoader,    // subtle strip with spinner + message
 *     ProgressBar,     // determinate or indeterminate bar
 *     FetchState,      // loading / success / error / empty card
 *   } from "./Loader";
 */

import "./PagerLoader.css";

// ─────────────────────────────────────────────────────────────────────────────
// 1. PAGE LOADER  — full-screen overlay with 3D spinning cube
//    <PageLoader message="Fetching your data…" submessage="Please wait" />
// ─────────────────────────────────────────────────────────────────────────────
export function PageLoader({ message = "Loading…", submessage = null }) {
  return (
    <div className="ld-page-overlay" role="status" aria-label={message}>
      <div className="ld-page-inner">
        <div className="ld-cube-stage">
          <div className="ld-cube-glow-ring" />
          <div className="ld-cube-3d">
            <div className="ld-face ld-face-front" />
            <div className="ld-face ld-face-back" />
            <div className="ld-face ld-face-left" />
            <div className="ld-face ld-face-right" />
            <div className="ld-face ld-face-top" />
            <div className="ld-face ld-face-bottom" />
          </div>
        </div>
        <div className="ld-page-info">
          <div className="ld-page-brand"><span>CUBE</span> COIN</div>
          <div className="ld-page-msg">{message}</div>
          {submessage && (
            <div style={{ fontSize: 11, color: "var(--ld-muted2)", marginBottom: 6 }}>
              {submessage}
            </div>
          )}
          <div className="ld-progress-bar">
            <div className="ld-progress-fill" />
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. SPINNER  — animated indicator in 5 styles
//    variant  "ring" | "dual" | "dots" | "pulse" | "bars"  (default "ring")
//    size     "sm" | "md" | "lg"                           (default "md")
//    color    "green" | "blue" | "amber" | "red"           (default "green")
// ─────────────────────────────────────────────────────────────────────────────
export function Spinner({ variant = "ring", size = "md", color = "green", style = {} }) {
  const sizeClass  = `ld-spinner-${size}`;
  const colorClass = color !== "green" ? `ld-spinner-${color}` : "";

  if (variant === "dots") {
    const sz = { sm: 5, md: 8, lg: 11 }[size] ?? 8;
    return (
      <div className={`ld-spinner-dots ld-${size}`} role="status" aria-label="Loading" style={style}>
        <span style={{ width: sz, height: sz }} />
        <span style={{ width: sz, height: sz }} />
        <span style={{ width: sz, height: sz }} />
      </div>
    );
  }

  if (variant === "bars") {
    const w = { sm: 3, md: 4, lg: 5 }[size] ?? 4;
    return (
      <div className={`ld-spinner-bars ld-${size}`} role="status" aria-label="Loading" style={style}>
        {[40, 70, 100, 70, 40].map((h, i) => (
          <span key={i} style={{ width: w, height: `${h}%` }} />
        ))}
      </div>
    );
  }

  return (
    <div
      className={[`ld-spinner-${variant}`, sizeClass, colorClass].filter(Boolean).join(" ")}
      role="status"
      aria-label="Loading"
      style={style}
    />
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. SKELETON LOADER  — pulsing content placeholders
//    rows       number of text rows          (default 3)
//    showAvatar show avatar placeholder      (default false)
//    showCard   wrap rows in a card shell    (default false)
// ─────────────────────────────────────────────────────────────────────────────
export function SkeletonLoader({ rows = 3, showAvatar = false, showCard = false }) {
  const delays = ["", "ld-d1", "ld-d2", "ld-d3", "ld-d4"];

  const inner = (
    <div className="ld-skeleton-wrap" role="status" aria-label="Loading content">
      <div className="ld-skel-row">
        {showAvatar && <div className="ld-skel-block ld-skel-avatar" />}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 7 }}>
          <div className={`ld-skel-block ld-skel-line long ${delays[1]}`} />
          <div className={`ld-skel-block ld-skel-line short ${delays[2]}`} />
        </div>
      </div>
      {Array.from({ length: rows - 1 }).map((_, i) => (
        <div
          key={i}
          className={`ld-skel-block ld-skel-line ${i % 2 === 0 ? "full" : "long"} ${delays[(i + 2) % 5]}`}
          style={{ height: 9 }}
        />
      ))}
    </div>
  );

  return showCard ? <div className="ld-skel-card">{inner}</div> : inner;
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. INLINE LOADER  — strip with spinner + message, great inside cards/lists
//    message          string             (default "Loading…")
//    color            "green"|"blue"|"amber"  (default "green")
//    spinnerVariant   passed to <Spinner>     (default "ring")
// ─────────────────────────────────────────────────────────────────────────────
export function InlineLoader({ message = "Loading…", color = "green", spinnerVariant = "ring" }) {
  return (
    <div className={`ld-inline-strip ${color !== "green" ? color : ""}`} role="status" aria-label={message}>
      <Spinner variant={spinnerVariant} size="sm" color={color === "green" ? "green" : color} />
      <span className="ld-inline-text">{message}</span>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. PROGRESS BAR
//    percent   0–100 | null (null = indeterminate)   (default null)
//    label     text above left                       (default "")
//    showPct   show percentage label                 (default true)
//    height    bar thickness in px                   (default 4)
// ─────────────────────────────────────────────────────────────────────────────
export function ProgressBar({ percent = null, label = "", showPct = true, height = 4 }) {
  const isIndet = percent === null;
  const safe    = Math.min(100, Math.max(0, percent ?? 0));

  return (
    <div
      className="ld-prog-wrap"
      role="progressbar"
      aria-valuenow={isIndet ? undefined : safe}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      {(label || showPct) && (
        <div className="ld-prog-top">
          {label && <span className="ld-prog-label">{label}</span>}
          {showPct && <span className="ld-prog-pct">{isIndet ? "—" : `${safe}%`}</span>}
        </div>
      )}
      <div className="ld-prog-track" style={{ height }}>
        <div
          className={`ld-prog-fill${isIndet ? " indeterminate" : ""}`}
          style={isIndet ? {} : { width: `${safe}%` }}
        />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 6. FETCH STATE CARD  — contextual feedback for async data
//    status   "loading" | "success" | "error" | "empty"
//    message  main label text
//    sub      sub-label (optional)
//    onRetry  () => void — shows a Retry button when status === "error"
// ─────────────────────────────────────────────────────────────────────────────
const DEFAULT_MESSAGES = {
  loading: "Loading data…",
  success: "Data loaded",
  error:   "Failed to load",
  empty:   "Nothing here yet",
};
const DEFAULT_SUBS = {
  loading: "Please wait",
  success: "",
  error:   "Tap to retry",
  empty:   "",
};

export function FetchState({ status = "loading", message = "", sub = "", onRetry = null }) {
  const msg = message || DEFAULT_MESSAGES[status];
  const s   = sub     || DEFAULT_SUBS[status];

  const Icon = () => {
    if (status === "loading")
      return <Spinner variant="ring" size="sm" color="blue" />;
    if (status === "success") return <>✓</>;
    if (status === "error")   return <>✕</>;
    return <>○</>;
  };

  return (
    <div className={`ld-fetch-card ${status}`} role="status" aria-label={msg}>
      <div className="ld-fetch-icon"><Icon /></div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="ld-fetch-title">{msg}</div>
        {s && <div className="ld-fetch-sub">{s}</div>}
      </div>
      {status === "error" && onRetry && (
        <button
          onClick={onRetry}
          style={{
            background: "rgba(248,113,113,0.1)", border: "1px solid rgba(248,113,113,0.25)",
            borderRadius: 8, padding: "5px 10px", fontSize: 11, fontWeight: 700,
            color: "var(--ld-red)", cursor: "pointer", letterSpacing: "0.06em",
            flexShrink: 0, fontFamily: "'DM Sans', sans-serif",
          }}
        >
          Retry
        </button>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Default export — drop-in: <Loader /> renders the inline strip
// ─────────────────────────────────────────────────────────────────────────────
export default function PagerLoader({ message = "Loading…" }) {
  return <InlineLoader message={message} />;
}