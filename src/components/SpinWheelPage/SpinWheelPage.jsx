import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "../../libs/supabase";
import { useNavigate } from "react-router-dom";
import "./SpinWheelPage.css";

// ── Prize segments ─────────────────────────────────────────────────────────────
// 12 segments — keep count even for symmetry. Weights control probability.
// Total weight = 100. Cube prizes are most common.
const PRIZES = [
  { label: "250 CUBE",     type: "cube",    value: 250,   cubeAwarded: 250,   color: "#22c55e", weight: 18, icon: "⬡" },
  { label: "₦500 Airtime", type: "airtime", value: 500,   cubeAwarded: 200,   color: "#f59e0b", weight: 8,  icon: "📞" },
  { label: "500 CUBE",     type: "cube",    value: 500,   cubeAwarded: 500,   color: "#4ade80", weight: 14, icon: "⬡" },
  { label: "1GB Data",     type: "data",    value: 1,     cubeAwarded: 300,   color: "#60a5fa", weight: 10, icon: "📶" },
  { label: "100 CUBE",     type: "cube",    value: 100,   cubeAwarded: 100,   color: "#86efac", weight: 18, icon: "⬡" },
  { label: "₦200 Airtime", type: "airtime", value: 200,   cubeAwarded: 80,    color: "#fbbf24", weight: 8,  icon: "📞" },
  { label: "1000 CUBE",    type: "cube",    value: 1000,  cubeAwarded: 1000,  color: "#7fff6e", weight: 6,  icon: "⬡" },
  { label: "5GB Data",     type: "data",    value: 5,     cubeAwarded: 800,   color: "#38bdf8", weight: 6,  icon: "📶" },
  { label: "50 CUBE",      type: "cube",    value: 50,    cubeAwarded: 50,    color: "#bbf7d0", weight: 12, icon: "⬡" },
  { label: "10GB Data",    type: "data",    value: 10,    cubeAwarded: 1500,  color: "#7dd3fc", weight: 4,  icon: "📶" },
  { label: "2000 CUBE",    type: "cube",    value: 2000,  cubeAwarded: 2000,  color: "#4ade80", weight: 3,  icon: "⬡" },
  { label: "20GB Data",    type: "data",    value: 20,    cubeAwarded: 3000,  color: "#0ea5e9", weight: 3,  icon: "📶" },
];

const TOTAL_WEIGHT = PRIZES.reduce((s, p) => s + p.weight, 0);
const SEG_ANGLE    = 360 / PRIZES.length;          // 30° per segment
const R            = 160;                          // wheel radius (SVG units)
const CX           = 200;                          // SVG center X
const CY           = 200;                          // SVG center Y

// ── Weighted random picker ─────────────────────────────────────────────────────
function pickPrize() {
  let rand = Math.random() * TOTAL_WEIGHT;
  for (let i = 0; i < PRIZES.length; i++) {
    rand -= PRIZES[i].weight;
    if (rand <= 0) return { prize: PRIZES[i], index: i };
  }
  return { prize: PRIZES[0], index: 0 };
}

// ── Polar → Cartesian helper ───────────────────────────────────────────────────
function polar(angleDeg, r, cx = CX, cy = CY) {
  const a = (angleDeg - 90) * (Math.PI / 180);
  return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) };
}

// ── Draw one wedge path ────────────────────────────────────────────────────────
function wedgePath(startAngle, endAngle, r = R, cx = CX, cy = CY) {
  const s = polar(startAngle, r, cx, cy);
  const e = polar(endAngle,   r, cx, cy);
  const large = endAngle - startAngle > 180 ? 1 : 0;
  return [
    `M ${cx} ${cy}`,
    `L ${s.x} ${s.y}`,
    `A ${r} ${r} 0 ${large} 1 ${e.x} ${e.y}`,
    "Z",
  ].join(" ");
}

// ── Label position (midpoint of arc, slightly inset) ──────────────────────────
function labelPos(i) {
  const mid = i * SEG_ANGLE + SEG_ANGLE / 2;
  return polar(mid, R * 0.65);
}

// ── Midnight UTC helper — has user spun today? ────────────────────────────────
function isToday(isoString) {
  if (!isoString) return false;
  const d = new Date(isoString);
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth()    === now.getMonth()    &&
    d.getDate()     === now.getDate()
  );
}

// ── Time until midnight ───────────────────────────────────────────────────────
function msUntilMidnight() {
  const now  = new Date();
  const next = new Date(now);
  next.setHours(24, 0, 0, 0);
  return next - now;
}

function fmtCountdown(ms) {
  if (ms <= 0) return "00:00:00";
  const s  = Math.floor(ms / 1000);
  const h  = Math.floor(s / 3600);
  const m  = Math.floor((s % 3600) / 60);
  const sc = s % 60;
  return `${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}:${String(sc).padStart(2,"0")}`;
}

// ── Wheel SVG ─────────────────────────────────────────────────────────────────
function WheelSVG({ rotation, spinning }) {
  return (
    <svg
      viewBox="0 0 400 400"
      className={`wheel-svg ${spinning ? "wheel-spinning-class" : ""}`}
      style={{ transform: `rotate(${rotation}deg)`, transition: spinning ? "none" : "transform 0s" }}
    >
      <defs>
        <filter id="wglow">
          <feGaussianBlur stdDeviation="3" result="b"/>
          <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
        <filter id="wshadow">
          <feDropShadow dx="0" dy="4" stdDeviation="8" floodColor="#000" floodOpacity="0.5"/>
        </filter>
      </defs>

      {/* outer ring */}
      <circle cx={CX} cy={CY} r={R + 12} fill="none" stroke="rgba(74,222,128,0.25)" strokeWidth="1.5"/>
      <circle cx={CX} cy={CY} r={R + 6}  fill="none" stroke="rgba(74,222,128,0.15)" strokeWidth="1"/>

      {/* segments */}
      {PRIZES.map((prize, i) => {
        const start = i * SEG_ANGLE;
        const end   = start + SEG_ANGLE;
        const lp    = labelPos(i);
        const midAngle = start + SEG_ANGLE / 2;

        return (
          <g key={i}>
            <path
              d={wedgePath(start, end)}
              fill={prize.color}
              stroke="#050b07"
              strokeWidth="1.5"
              opacity="0.92"
            />
            {/* segment divider glow */}
            <path
              d={wedgePath(start, end)}
              fill="none"
              stroke="rgba(255,255,255,0.08)"
              strokeWidth="0.5"
            />
            {/* label — rotated to face outward */}
            <g transform={`translate(${lp.x}, ${lp.y}) rotate(${midAngle})`}>
              <text
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize="11"
                fontWeight="800"
                fontFamily="'DM Sans', sans-serif"
                fill="#041107"
                letterSpacing="-0.3"
              >
                {prize.icon}
              </text>
              <text
                y="13"
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize="9"
                fontWeight="700"
                fontFamily="'DM Sans', sans-serif"
                fill="#041107"
                letterSpacing="-0.2"
              >
                {prize.label}
              </text>
            </g>
          </g>
        );
      })}

      {/* center hub */}
      <circle cx={CX} cy={CY} r="28" fill="#07120a" stroke="rgba(74,222,128,0.4)" strokeWidth="2"/>
      <circle cx={CX} cy={CY} r="20" fill="rgba(74,222,128,0.08)"/>
      {/* cube mark */}
      <polygon points="200,183 208,187.5 208,195 200,199.5 192,195 192,187.5" fill="#4ade80" opacity="0.9"/>
      <polygon points="200,183 208,187.5 200,192 192,187.5" fill="#d4ffda" opacity="0.5"/>
      <polygon points="200,192 208,187.5 208,195 200,199.5" fill="#22c55e"/>
      <polygon points="200,192 192,187.5 192,195 200,199.5" fill="#166534"/>
    </svg>
  );
}

// ── Pointer SVG (fixed, outside wheel) ───────────────────────────────────────
function WheelPointer() {
  return (
    <svg viewBox="0 0 40 52" className="wheel-pointer" fill="none">
      <defs>
        <linearGradient id="ptrGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#7fff6e"/>
          <stop offset="100%" stopColor="#22c55e"/>
        </linearGradient>
      </defs>
      <polygon points="20,4 36,44 20,36 4,44" fill="url(#ptrGrad)" stroke="#041107" strokeWidth="1.5" strokeLinejoin="round"/>
      <circle cx="20" cy="4" r="5" fill="#7fff6e" stroke="#041107" strokeWidth="1.5"/>
    </svg>
  );
}

// ── Prize result card ─────────────────────────────────────────────────────────
function PrizeCard({ prize, onClose }) {
  const isCube = prize.type === "cube";
  return (
    <div className="prize-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="prize-card">
        <div className={`prize-card-glow ${prize.type}`} />

        <div className="prize-icon-wrap" style={{ background: `${prize.color}22`, border: `1.5px solid ${prize.color}55` }}>
          <span className="prize-big-icon">{prize.icon}</span>
        </div>

        <div className="prize-congrats">🎉 You won!</div>
        <div className="prize-label-big" style={{ color: prize.color }}>{prize.label}</div>

        <div className="prize-detail">
          {prize.type === "cube" && (
            <p><span style={{ color: "#4ade80", fontWeight: 800 }}>{prize.cubeAwarded.toLocaleString()} CUBE</span> added to your wallet</p>
          )}
          {prize.type === "airtime" && (
            <>
              <p><span style={{ color: "#fbbf24", fontWeight: 800 }}>{prize.label}</span> will be processed within 24 hours</p>
              <p style={{ marginTop: 6, color: "rgba(255,255,255,0.45)", fontSize: 12 }}>
                + <span style={{ color: "#4ade80" }}>{prize.cubeAwarded} CUBE</span> bonus credited to your wallet
              </p>
            </>
          )}
          {prize.type === "data" && (
            <>
              <p><span style={{ color: "#60a5fa", fontWeight: 800 }}>{prize.label}</span> will be processed within 24 hours</p>
              <p style={{ marginTop: 6, color: "rgba(255,255,255,0.45)", fontSize: 12 }}>
                + <span style={{ color: "#4ade80" }}>{prize.cubeAwarded} CUBE</span> bonus credited to your wallet
              </p>
            </>
          )}
        </div>

        <div className="prize-note">Come back tomorrow for another spin!</div>
        <button className="prize-close-btn" onClick={onClose}>Awesome, thanks! →</button>
      </div>
    </div>
  );
}

// ── History row ───────────────────────────────────────────────────────────────
function HistoryRow({ item }) {
  const prize = PRIZES.find(p => p.label === item.prize_label) || { color: "#4ade80", icon: "⬡" };
  return (
    <div className="history-row">
      <div className="history-icon" style={{ background: `${prize.color}18`, border: `1px solid ${prize.color}40`, color: prize.color }}>
        {prize.icon}
      </div>
      <div className="history-info">
        <div className="history-label">{item.prize_label}</div>
        <div className="history-date">{new Date(item.spun_at).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" })}</div>
      </div>
      <div className="history-cubes">
        +{item.cube_awarded.toLocaleString()} CUBE
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ══════════════════════════════════════════════════════════════════════
export default function SpinWheelPage() {
  const navigate    = useNavigate();
  const animFrameRef = useRef(null);
  const startTimeRef = useRef(null);
  const startRotRef  = useRef(0);
  const targetRotRef = useRef(0);
  const durationRef  = useRef(5000);

  const [user,        setUser]       = useState(null);
  const [profile,     setProfile]    = useState(null);
  const [loading,     setLoading]    = useState(true);
  const [spinning,    setSpinning]   = useState(false);
  const [rotation,    setRotation]   = useState(0);
  const [spunToday,   setSpunToday]  = useState(false);
  const [lastSpinAt,  setLastSpinAt] = useState(null);
  const [prize,       setPrize]      = useState(null);   // current result
  const [showPrize,   setShowPrize]  = useState(false);
  const [history,     setHistory]    = useState([]);
  const [countdown,   setCountdown]  = useState(0);
  const [toast,       setToast]      = useState(null);

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(null), 3000); };

  // ── Load user + spin history ─────────────────────────────────────────
  useEffect(() => {
    const init = async () => {
      const { data: { user: u } } = await supabase.auth.getUser();
      if (!u) { navigate("/login"); return; }
      setUser(u);

      const { data: prof } = await supabase
        .from("profiles")
        .select("full_name, cube_balance")
        .eq("id", u.id)
        .maybeSingle();
      setProfile(prof);

      const { data: hist } = await supabase
        .from("spin_results")
        .select("*")
        .eq("user_id", u.id)
        .order("spun_at", { ascending: false })
        .limit(30);

      const rows = hist || [];
      setHistory(rows);

      if (rows.length > 0 && isToday(rows[0].spun_at)) {
        setSpunToday(true);
        setLastSpinAt(rows[0].spun_at);
      }
      setLoading(false);
    };
    init();
  }, []);

  // ── Countdown tick ────────────────────────────────────────────────────
  useEffect(() => {
    if (!spunToday) return;
    const tick = () => setCountdown(msUntilMidnight());
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [spunToday]);

  // ── Easing function (ease-out quintic) ───────────────────────────────
  const easeOutQuint = (t) => 1 - Math.pow(1 - t, 5);

  // ── Animation loop ────────────────────────────────────────────────────
  const animate = useCallback((timestamp) => {
    if (!startTimeRef.current) startTimeRef.current = timestamp;
    const elapsed  = timestamp - startTimeRef.current;
    const progress = Math.min(elapsed / durationRef.current, 1);
    const eased    = easeOutQuint(progress);
    const current  = startRotRef.current + (targetRotRef.current - startRotRef.current) * eased;

    setRotation(current);

    if (progress < 1) {
      animFrameRef.current = requestAnimationFrame(animate);
    } else {
      setRotation(targetRotRef.current);
      setSpinning(false);
    }
  }, []);

  // ── Spin handler ──────────────────────────────────────────────────────
  const handleSpin = async () => {
    if (spinning || spunToday || !user) return;

    setSpinning(true);
    const { prize: won, index } = pickPrize();

    // Target angle: we want the winning segment to land at the TOP pointer.
    // Pointer is at top (0°). The wheel rotates clockwise.
    // Segment i starts at i*SEG_ANGLE. Its midpoint is at i*SEG_ANGLE + SEG_ANGLE/2.
    // We need that midpoint to end up at 0° (top), so we rotate by:
    //   -(midAngle) + 360*n   where n is enough full rotations to feel dramatic
    const midAngle       = index * SEG_ANGLE + SEG_ANGLE / 2;
    const fullRotations  = 8;  // full spins before landing
    const landingOffset  = 360 - midAngle;
    const currentNorm    = rotation % 360;
    const delta          = (landingOffset - currentNorm + 360) % 360;
    const targetRot      = rotation + fullRotations * 360 + delta;

    startTimeRef.current = null;
    startRotRef.current  = rotation;
    targetRotRef.current = targetRot;
    durationRef.current  = 5200 + Math.random() * 800; // 5.2–6s

    animFrameRef.current = requestAnimationFrame(animate);

    // Write result to Supabase in the background
    try {
      const { data: { user: u } } = await supabase.auth.getUser();

      // Double-check user hasn't spun today (race-condition guard)
      const { data: recent } = await supabase
        .from("spin_results")
        .select("spun_at")
        .eq("user_id", u.id)
        .order("spun_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (recent && isToday(recent.spun_at)) {
        // Already spun — cancel animation
        cancelAnimationFrame(animFrameRef.current);
        setSpinning(false);
        setSpunToday(true);
        showToast("You already spun today! Come back tomorrow.");
        return;
      }

      // Insert spin result
      const { error: insertErr } = await supabase
        .from("spin_results")
        .insert({
          user_id:      u.id,
          prize_type:   won.type,
          prize_label:  won.label,
          prize_value:  won.value,
          cube_awarded: won.cubeAwarded,
          claimed:      true,
        });

      if (insertErr) throw insertErr;

      // Credit CUBE to wallet
      const currentBalance = Number(profile?.cube_balance || 0);
      const newBalance     = currentBalance + won.cubeAwarded;

      await supabase
        .from("profiles")
        .update({ cube_balance: newBalance })
        .eq("id", u.id);

      await supabase
        .from("wallet_transactions")
        .insert({
          user_id: u.id,
          title:   `Spin Reward — ${won.label}`,
          amount:  won.cubeAwarded,
          type:    "credit",
          tx_ref:  `SPIN-${Date.now()}`,
        });

      // Update local profile balance
      setProfile(p => ({ ...p, cube_balance: newBalance }));

      // Wait for animation to finish, then show prize card
      setTimeout(() => {
        setPrize(won);
        setShowPrize(true);
        setSpunToday(true);
        setLastSpinAt(new Date().toISOString());
        setHistory(prev => [{
          prize_label:  won.label,
          prize_type:   won.type,
          cube_awarded: won.cubeAwarded,
          spun_at:      new Date().toISOString(),
        }, ...prev]);
      }, durationRef.current + 200);

    } catch (err) {
      console.error("Spin error:", err);
      cancelAnimationFrame(animFrameRef.current);
      setSpinning(false);
      showToast("Spin failed — please try again");
    }
  };

  // ── Prize card close ──────────────────────────────────────────────────
  const handlePrizeClose = () => {
    setShowPrize(false);
    setPrize(null);
  };

  // ── Render ────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="spin-page">
        <div className="spin-loading">
          <div className="spin-loading-icon">🎡</div>
          <p>Loading your wheel…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="spin-page">

      {/* ── Header ── */}
      <div className="spin-header">
        <div className="spin-eyebrow">
          <span className="spin-eyebrow-dot" />
          Daily Reward
        </div>
        <h1 className="spin-title">Spin the Wheel</h1>
        <p className="spin-sub">One free spin every day — win CUBE, airtime &amp; data!</p>
      </div>

      {/* ── Balance strip ── */}
      <div className="spin-balance-strip">
        <div className="spin-bal-item">
          <span className="spin-bal-label">Your balance</span>
          <span className="spin-bal-val">
            {Number(profile?.cube_balance || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })} CUBE
          </span>
        </div>
        <div className="spin-bal-divider" />
        <div className="spin-bal-item">
          <span className="spin-bal-label">Total spins</span>
          <span className="spin-bal-val">{history.length}</span>
        </div>
        <div className="spin-bal-divider" />
        <div className="spin-bal-item">
          <span className="spin-bal-label">Status</span>
          <span className={`spin-bal-val ${spunToday ? "used" : "ready"}`}>
            {spunToday ? "Used today" : "Ready!"}
          </span>
        </div>
      </div>

      {/* ── Wheel stage ── */}
      <div className="wheel-stage">
        <WheelPointer />
        <div className="wheel-wrap">
          <WheelSVG rotation={rotation} spinning={spinning} />
        </div>
      </div>

      {/* ── CTA ── */}
      <div className="spin-cta-wrap">
        {!spunToday ? (
          <button
            className={`spin-btn ${spinning ? "spinning" : ""}`}
            onClick={handleSpin}
            disabled={spinning}
          >
            {spinning ? (
              <><span className="spin-btn-spinner" /> Spinning…</>
            ) : (
              <><span className="spin-btn-icon">🎡</span> Spin Now — It's Free!</>
            )}
          </button>
        ) : (
          <div className="spin-used-wrap">
            <div className="spin-used-icon">✓</div>
            <div className="spin-used-label">You've spun today</div>
            <div className="spin-used-sub">Next spin available in</div>
            <div className="spin-countdown">{fmtCountdown(countdown)}</div>
          </div>
        )}
      </div>

      {/* ── Prizes legend ── */}
      <div className="prizes-section">
        <div className="prizes-section-title">What you can win</div>
        <div className="prizes-grid">
          {PRIZES.map((p, i) => (
            <div className="prize-pill" key={i} style={{ borderColor: `${p.color}40`, background: `${p.color}10` }}>
              <span className="prize-pill-icon" style={{ color: p.color }}>{p.icon}</span>
              <span className="prize-pill-label" style={{ color: p.color }}>{p.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── History ── */}
      {history.length > 0 && (
        <div className="spin-history">
          <div className="spin-history-title">Your spin history</div>
          <div className="spin-history-list">
            {history.map((item, i) => (
              <HistoryRow key={i} item={item} />
            ))}
          </div>
        </div>
      )}

      {/* ── Prize modal ── */}
      {showPrize && prize && (
        <PrizeCard prize={prize} onClose={handlePrizeClose} />
      )}

      {/* ── Toast ── */}
      {toast && <div className="spin-toast">{toast}</div>}
    </div>
  );
}
