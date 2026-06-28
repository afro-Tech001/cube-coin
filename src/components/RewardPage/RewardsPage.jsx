import "./RewardsPage.css";
import { useEffect, useState, useRef, useCallback } from "react";
import { Gift, Flame, Trophy, Users, CheckCircle, Lock } from "lucide-react";
import { supabase } from "../../libs/supabase";

// ─────────────────────────────────────────────────────────────────────────────
// SPIN WHEEL CONFIG
// ─────────────────────────────────────────────────────────────────────────────
const PRIZES = [
  { label: "250 CUBE",     type: "cube",    cubeAwarded: 250,  color: "#22c55e", weight: 18, icon: "⬡" },
  { label: "₦500 Airtime", type: "airtime", cubeAwarded: 200,  color: "#f59e0b", weight: 8,  icon: "📞" },
  { label: "500 CUBE",     type: "cube",    cubeAwarded: 500,  color: "#4ade80", weight: 14, icon: "⬡" },
  { label: "1GB Data",     type: "data",    cubeAwarded: 300,  color: "#60a5fa", weight: 10, icon: "📶" },
  { label: "100 CUBE",     type: "cube",    cubeAwarded: 100,  color: "#86efac", weight: 18, icon: "⬡" },
  { label: "₦200 Airtime", type: "airtime", cubeAwarded: 80,   color: "#fbbf24", weight: 8,  icon: "📞" },
  { label: "1000 CUBE",    type: "cube",    cubeAwarded: 1000, color: "#7fff6e", weight: 6,  icon: "⬡" },
  { label: "5GB Data",     type: "data",    cubeAwarded: 800,  color: "#38bdf8", weight: 6,  icon: "📶" },
  { label: "50 CUBE",      type: "cube",    cubeAwarded: 50,   color: "#bbf7d0", weight: 12, icon: "⬡" },
  { label: "10GB Data",    type: "data",    cubeAwarded: 1500, color: "#7dd3fc", weight: 4,  icon: "📶" },
  { label: "2000 CUBE",    type: "cube",    cubeAwarded: 2000, color: "#4ade80", weight: 3,  icon: "⬡" },
  { label: "20GB Data",    type: "data",    cubeAwarded: 3000, color: "#0ea5e9", weight: 3,  icon: "📶" },
];

const TOTAL_WEIGHT = PRIZES.reduce((s, p) => s + p.weight, 0);
const SEG = 360 / PRIZES.length;
const R = 150, CX = 190, CY = 190;

function polar(deg, r) {
  const a = (deg - 90) * (Math.PI / 180);
  return { x: CX + r * Math.cos(a), y: CY + r * Math.sin(a) };
}

function wedge(s, e) {
  const p1 = polar(s, R), p2 = polar(e, R);
  const lg = e - s > 180 ? 1 : 0;
  return `M${CX} ${CY}L${p1.x} ${p1.y}A${R} ${R} 0 ${lg} 1 ${p2.x} ${p2.y}Z`;
}

function pickPrize() {
  let r = Math.random() * TOTAL_WEIGHT;
  for (let i = 0; i < PRIZES.length; i++) {
    r -= PRIZES[i].weight;
    if (r <= 0) return { prize: PRIZES[i], index: i };
  }
  return { prize: PRIZES[0], index: 0 };
}

function isToday(iso) {
  if (!iso) return false;
  const d = new Date(iso), n = new Date();
  return (
    d.getFullYear() === n.getFullYear() &&
    d.getMonth() === n.getMonth() &&
    d.getDate() === n.getDate()
  );
}

function msUntilMidnight() {
  const n = new Date(), t = new Date(n);
  t.setHours(24, 0, 0, 0);
  return t - n;
}

function fmtCountdown(ms) {
  if (ms <= 0) return "00:00:00";
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sc = s % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(sc).padStart(2, "0")}`;
}

// ── Wheel SVG ─────────────────────────────────────────────────────────────────
function MiniWheel({ rotation }) {
  return (
    <svg
      viewBox="0 0 380 380"
      className="rw-wheel-svg"
      style={{ transform: `rotate(${rotation}deg)` }}
    >
      <circle cx={CX} cy={CY} r={R + 10} fill="none" stroke="rgba(74,222,128,0.15)" strokeWidth="1.5" />
      {PRIZES.map((p, i) => {
        const s = i * SEG, e = s + SEG, mid = s + SEG / 2;
        const lp = polar(mid, R * 0.66);
        return (
          <g key={i}>
            <path d={wedge(s, e)} fill={p.color} stroke="#040c06" strokeWidth="1.2" opacity="0.94" />
            <g transform={`translate(${lp.x},${lp.y}) rotate(${mid})`}>
              <text textAnchor="middle" dominantBaseline="middle" fontSize="10" fontWeight="800"
                fontFamily="'DM Sans',sans-serif" fill="#041107">{p.icon}</text>
              <text y="12" textAnchor="middle" dominantBaseline="middle" fontSize="7.5" fontWeight="700"
                fontFamily="'DM Sans',sans-serif" fill="#041107">{p.label}</text>
            </g>
          </g>
        );
      })}
      {/* hub */}
      <circle cx={CX} cy={CY} r="24" fill="#07120a" stroke="rgba(74,222,128,0.35)" strokeWidth="2" />
      <circle cx={CX} cy={CY} r="16" fill="rgba(74,222,128,0.07)" />
      <polygon
        points={`${CX},${CY - 8} ${CX + 6},${CY - 2} ${CX + 6},${CY + 6} ${CX},${CY + 10} ${CX - 6},${CY + 6} ${CX - 6},${CY - 2}`}
        fill="#4ade80" opacity="0.9"
      />
      <polygon points={`${CX},${CY - 8} ${CX + 6},${CY - 2} ${CX},${CY + 2} ${CX - 6},${CY - 2}`}
        fill="#d4ffda" opacity="0.5" />
      <polygon points={`${CX},${CY + 2} ${CX + 6},${CY - 2} ${CX + 6},${CY + 6} ${CX},${CY + 10}`} fill="#22c55e" />
      <polygon points={`${CX},${CY + 2} ${CX - 6},${CY - 2} ${CX - 6},${CY + 6} ${CX},${CY + 10}`} fill="#166534" />
    </svg>
  );
}

// ── Prize modal ───────────────────────────────────────────────────────────────
function PrizeModal({ prize, onClose }) {
  if (!prize) return null;
  return (
    <div className="rw-prize-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="rw-prize-card">
        <div className="rw-prize-glow" style={{ background: `linear-gradient(90deg,transparent,${prize.color}55,transparent)` }} />
        <div className="rw-prize-icon-box" style={{ background: `${prize.color}15`, border: `1.5px solid ${prize.color}45` }}>
          <span style={{ fontSize: 30 }}>{prize.icon}</span>
        </div>
        <div className="rw-prize-congrats">🎉 You won!</div>
        <div className="rw-prize-name" style={{ color: prize.color }}>{prize.label}</div>
        <div className="rw-prize-detail">
          {prize.type === "cube" ? (
            <p>
              <span style={{ color: "#4ade80", fontWeight: 800 }}>{prize.cubeAwarded.toLocaleString()} CUBE</span>
              {" "}added to your wallet
            </p>
          ) : (
            <>
              <p>
                <span style={{ color: prize.color, fontWeight: 800 }}>{prize.label}</span>
                {" "}will be processed within 24 hours
              </p>
              <p style={{ marginTop: 6, color: "rgba(255,255,255,.4)", fontSize: 12 }}>
                + <span style={{ color: "#4ade80" }}>{prize.cubeAwarded} CUBE</span> bonus credited
              </p>
            </>
          )}
        </div>
        <p className="rw-prize-note">Come back tomorrow for another spin!</p>
        <button className="rw-prize-btn" onClick={onClose}>Awesome, thanks! →</button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────
const fmtDate = (iso) => {
  const d = new Date(iso), now = new Date();
  const diff = Math.floor((now - d) / 86400000);
  if (diff === 0) return "Today";
  if (diff === 1) return "Yesterday";
  return `${diff}d ago`;
};

const STREAK_MILESTONES = [
  { days: 7,  reward: 50,  label: "7 Day Streak"  },
  { days: 14, reward: 100, label: "14 Day Streak" },
  { days: 30, reward: 250, label: "30 Day Streak" },
];
const REFERRAL_MILESTONES = [
  { target: 5,  reward: 100  },
  { target: 10, reward: 250  },
  { target: 25, reward: 500  },
  { target: 50, reward: 1000 },
];
const MINE_MILESTONES = [
  { amount: 1000,  reward: 75,  label: "Mine 1K CUBE"  },
  { amount: 5000,  reward: 200, label: "Mine 5K CUBE"  },
  { amount: 10000, reward: 500, label: "Mine 10K CUBE" },
];

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
export default function RewardsPage() {
  // ── Core state ──────────────────────────────────────────────────────────────
  const [profile,       setProfile]       = useState(null);
  const [transactions,  setTransactions]  = useState([]);
  const [claimedMilest, setClaimedMilest] = useState([]);
  const [referralCount, setReferralCount] = useState(0);
  const [totalRewards,  setTotalRewards]  = useState(0);
  const [loading,       setLoading]       = useState(true);
  const [claiming,      setClaiming]      = useState(null);
  const [toast,         setToast]         = useState(null);
  const [userId,        setUserId]        = useState(null);

  // ── Spin wheel state ────────────────────────────────────────────────────────
  const [rotation,    setRotation]    = useState(0);
  const [spinning,    setSpinning]    = useState(false);
  const [spunToday,   setSpunToday]   = useState(false);
  const [wonPrize,    setWonPrize]    = useState(null);
  const [showPrize,   setShowPrize]   = useState(false);
  const [countdown,   setCountdown]   = useState(0);
  const [spinHistory, setSpinHistory] = useState([]);

  const animRef      = useRef(null);
  const startTimeRef = useRef(null);
  const startRotRef  = useRef(0);
  const targetRotRef = useRef(0);
  const durRef       = useRef(5500);

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  // ── Load all data ────────────────────────────────────────────────────────────
  const loadAll = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setUserId(user.id);

    const { data: prof } = await supabase
      .from("profiles")
      .select("cube_balance, total_mined, streak, referral_code")
      .eq("id", user.id)
      .maybeSingle();
    setProfile(prof);

    const { data: txs } = await supabase
      .from("wallet_transactions")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(30);
    setTransactions(txs || []);
    setTotalRewards(
      (txs || []).filter(t => t.type === "credit").reduce((a, t) => a + Math.abs(Number(t.amount)), 0)
    );

    const { data: cms } = await supabase
      .from("claimed_milestones")
      .select("target")
      .eq("user_id", user.id);
    setClaimedMilest((cms || []).map(c => c.target));

    if (prof?.referral_code) {
      const { count } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true })
        .eq("referred_by_code", prof.referral_code);
      setReferralCount(count || 0);
    }

    const { data: spins } = await supabase
      .from("spin_results")
      .select("*")
      .eq("user_id", user.id)
      .order("spun_at", { ascending: false })
      .limit(10);
    setSpinHistory(spins || []);
    if ((spins || []).length > 0 && isToday(spins[0].spun_at)) setSpunToday(true);

    setLoading(false);
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  // ── Countdown ticker ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!spunToday) return;
    const tick = () => setCountdown(msUntilMidnight());
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [spunToday]);

  // ── Spin animation ──────────────────────────────────────────────────────────
  const easeOut = (t) => 1 - Math.pow(1 - t, 5);

  const animate = useCallback((ts) => {
    if (!startTimeRef.current) startTimeRef.current = ts;
    const prog = Math.min((ts - startTimeRef.current) / durRef.current, 1);
    const cur = startRotRef.current + (targetRotRef.current - startRotRef.current) * easeOut(prog);
    setRotation(cur);
    if (prog < 1) {
      animRef.current = requestAnimationFrame(animate);
    } else {
      setRotation(targetRotRef.current);
      setSpinning(false);
    }
  }, []);

  // ── Do the spin ─────────────────────────────────────────────────────────────
  const handleSpin = async () => {
    if (spinning || spunToday || !userId) return;
    setSpinning(true);

    const { prize, index } = pickPrize();
    const midAngle = index * SEG + SEG / 2;
    const fullRots = 8;
    const norm = rotation % 360;
    const delta = ((360 - midAngle) - norm + 360) % 360;
    const target = rotation + fullRots * 360 + delta;

    startTimeRef.current = null;
    startRotRef.current = rotation;
    targetRotRef.current = target;
    durRef.current = 5200 + Math.random() * 800;

    animRef.current = requestAnimationFrame(animate);

    try {
      const { data: recent } = await supabase
        .from("spin_results")
        .select("spun_at")
        .eq("user_id", userId)
        .order("spun_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (recent && isToday(recent.spun_at)) {
        cancelAnimationFrame(animRef.current);
        setSpinning(false);
        setSpunToday(true);
        showToast("Already spun today!", "error");
        return;
      }

      await supabase.from("spin_results").insert({
        user_id: userId, prize_type: prize.type, prize_label: prize.label,
        prize_value: prize.cubeAwarded, cube_awarded: prize.cubeAwarded, claimed: true,
      });

      const newBal = Number(profile?.cube_balance || 0) + prize.cubeAwarded;
      await supabase.from("profiles").update({ cube_balance: newBal }).eq("id", userId);
      await supabase.from("wallet_transactions").insert({
        user_id: userId, title: `Spin Reward — ${prize.label}`,
        amount: prize.cubeAwarded, type: "credit", tx_ref: `SPIN-${Date.now()}`,
      });

      setProfile(p => ({ ...p, cube_balance: newBal }));

      setTimeout(() => {
        setWonPrize(prize);
        setShowPrize(true);
        setSpunToday(true);
        setSpinHistory(prev => [{
          prize_label: prize.label, prize_type: prize.type,
          cube_awarded: prize.cubeAwarded, spun_at: new Date().toISOString(),
        }, ...prev]);
        loadAll();
      }, durRef.current + 300);

    } catch (err) {
      console.error("Spin error:", err);
      cancelAnimationFrame(animRef.current);
      setSpinning(false);
      showToast("Spin failed — try again", "error");
    }
  };

  // ── Reward claim handlers ───────────────────────────────────────────────────
  const claimDailyCheckIn = async () => {
    if (claiming) return;
    setClaiming("daily");
    try {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const { data: todayTx } = await supabase
        .from("wallet_transactions").select("id")
        .eq("user_id", userId).eq("title", "Daily Check-In")
        .gte("created_at", todayStart.toISOString()).maybeSingle();
      if (todayTx) { showToast("Already claimed today!", "error"); setClaiming(null); return; }
      const reward = 10, newBalance = Number(profile?.cube_balance || 0) + reward;
      await supabase.from("profiles").update({ cube_balance: newBalance }).eq("id", userId);
      await supabase.from("wallet_transactions").insert([{ user_id: userId, title: "Daily Check-In", amount: reward, type: "credit" }]);
      setProfile(p => ({ ...p, cube_balance: newBalance }));
      showToast(`+${reward} CUBE claimed! Come back tomorrow.`);
      await loadAll();
    } catch (e) {
      showToast("Claim failed — try again", "error");
    } finally {
      setClaiming(null);
    }
  };

  const claimStreakMilestone = async (milestone) => {
    if (claiming) return;
    setClaiming(`streak_${milestone.days}`);
    try {
      const { data: existing } = await supabase
        .from("wallet_transactions").select("id")
        .eq("user_id", userId).eq("title", milestone.label).maybeSingle();
      if (existing) { showToast("Already claimed!", "error"); setClaiming(null); return; }
      const newBalance = Number(profile?.cube_balance || 0) + milestone.reward;
      await supabase.from("profiles").update({ cube_balance: newBalance }).eq("id", userId);
      await supabase.from("wallet_transactions").insert([{ user_id: userId, title: milestone.label, amount: milestone.reward, type: "credit" }]);
      setProfile(p => ({ ...p, cube_balance: newBalance }));
      showToast(`🔥 ${milestone.reward} CUBE claimed for ${milestone.label}!`);
      await loadAll();
    } catch (e) {
      showToast("Claim failed — try again", "error");
    } finally {
      setClaiming(null);
    }
  };

  const claimMineMilestone = async (milestone) => {
    if (claiming) return;
    setClaiming(`mine_${milestone.amount}`);
    try {
      const existing = transactions.find(t => t.title === milestone.label);
      if (existing) { showToast("Already claimed!", "error"); setClaiming(null); return; }
      const newBalance = Number(profile?.cube_balance || 0) + milestone.reward;
      await supabase.from("profiles").update({ cube_balance: newBalance }).eq("id", userId);
      await supabase.from("wallet_transactions").insert([{ user_id: userId, title: milestone.label, amount: milestone.reward, type: "credit" }]);
      setProfile(p => ({ ...p, cube_balance: newBalance }));
      showToast(`🏆 ${milestone.reward} CUBE claimed for ${milestone.label}!`);
      await loadAll();
    } catch (e) {
      showToast("Claim failed — try again", "error");
    } finally {
      setClaiming(null);
    }
  };

  // ── Derived state ────────────────────────────────────────────────────────────
  const streak = profile?.streak || 0;
  const totalMined = Number(profile?.total_mined || 0);
  const claimedStreakTitles = transactions
    .filter(t => STREAK_MILESTONES.some(m => m.label === t.title))
    .map(t => t.title);
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const claimedToday = transactions.some(
    t => t.title === "Daily Check-In" && new Date(t.created_at) >= todayStart
  );
  const nextReferralMilestone = REFERRAL_MILESTONES.find(
    m => referralCount >= m.target && !claimedMilest.includes(m.target)
  );
  const nextLockedReferral = REFERRAL_MILESTONES.find(m => referralCount < m.target);
  const nextMineMilestone = MINE_MILESTONES.find(m => {
    const claimed = transactions.some(t => t.title === m.label);
    return totalMined >= m.amount && !claimed;
  });
  const nextLockedMine = MINE_MILESTONES.find(m => totalMined < m.amount);
  const rewardHistory = transactions
    .filter(t => t.type === "credit" && t.title !== "Cashout Refund")
    .slice(0, 8);

  // ── Loading screen ───────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="rewards-page">
        <div className="rw-loading">
          <span className="rw-loading-icon">🎁</span>
          Loading your rewards…
        </div>
      </div>
    );
  }

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="rewards-page">

      {/* Header */}
      <div className="rewards-header">
        <h1>🎁 Rewards Center</h1>
        <p>Complete activities and earn more CUBE rewards.</p>
      </div>

      {/* Total reward card */}
      <div className="total-reward-card">
        <div className="total-reward-inner">
          <div>
            <p>Total rewards earned</p>
            <h2>{totalRewards.toLocaleString(undefined, { maximumFractionDigits: 2 })} CUBE</h2>
          </div>
          <div className="total-reward-stats">
            <div className="trs-item">
              <span className="trs-val">{streak}</span>
              <span className="trs-label">Streak</span>
            </div>
            <div className="trs-item">
              <span className="trs-val">{referralCount}</span>
              <span className="trs-label">Refs</span>
            </div>
            <div className="trs-item">
              <span className="trs-val">{totalMined.toFixed(0)}</span>
              <span className="trs-label">Mined</span>
            </div>
          </div>
        </div>
      </div>

      {/* Spin wheel */}
      <div className="rw-spin-section">
        <div className="rw-spin-label">
          <span className="rw-spin-label-dot" />
          Daily Spin
          {!spunToday && <span className="rw-spin-available-badge">Available!</span>}
        </div>

        <div className="rw-spin-layout">
          <div className="rw-wheel-col">
            <div className="rw-pointer">▼</div>
            <div className="rw-wheel-frame">
              <MiniWheel rotation={rotation} />
            </div>
          </div>

          <div className="rw-spin-right">
            {!spunToday ? (
              <>
                <div className="rw-spin-heading">Spin &amp; win daily!</div>
                <p className="rw-spin-desc">
                  One free spin every day. Win CUBE, airtime, or data instantly.
                </p>

                <div className="rw-prizes-mini">
                  {PRIZES.slice(0, 6).map((p, i) => (
                    <span
                      key={i}
                      className="rw-prize-chip"
                      style={{ borderColor: `${p.color}40`, background: `${p.color}10`, color: p.color }}
                    >
                      {p.icon} {p.label}
                    </span>
                  ))}
                  <span className="rw-prize-chip" style={{ borderColor: "rgba(200,255,195,0.15)", color: "rgba(200,255,195,0.4)" }}>
                    +6 more
                  </span>
                </div>

                <button
                  className={`rw-spin-btn${spinning ? " loading" : ""}`}
                  onClick={handleSpin}
                  disabled={spinning}
                >
                  {spinning
                    ? <><span className="rw-spin-ring" />Spinning…</>
                    : <>🎡 Spin the Wheel!</>
                  }
                </button>

                {spinHistory.length > 0 && (
                  <div className="rw-last-win">
                    Last win: <strong style={{ color: "#4ade80" }}>{spinHistory[0].prize_label}</strong>
                  </div>
                )}
              </>
            ) : (
              <div className="rw-spun-state">
                <div className="rw-spun-check">✓</div>
                <div className="rw-spun-title">Spun today!</div>
                {spinHistory.length > 0 && (
                  <div className="rw-spun-prize">
                    You won: <strong style={{ color: "#4ade80" }}>{spinHistory[0].prize_label}</strong>
                  </div>
                )}
                <div className="rw-spun-next">Next spin in</div>
                <div className="rw-countdown">{fmtCountdown(countdown)}</div>
                <div className="rw-spun-hint">Total spins: {spinHistory.length}</div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Reward cards grid */}
      <div className="rewards-grid">

        {/* Daily check-in */}
        <div className={`reward-card${claimedToday ? " dimmed" : ""}`}>
          <div className="reward-icon"><Gift size={18} /></div>
          <h3>Daily Check-In</h3>
          <span>+10 CUBE</span>
          <p className="reward-desc">
            {claimedToday ? "Come back tomorrow!" : "Claim your daily bonus"}
          </p>
          <button
            className={claimedToday ? "locked-btn" : "claim-btn"}
            onClick={claimedToday ? undefined : claimDailyCheckIn}
            disabled={claimedToday || claiming === "daily"}
          >
            {claiming === "daily"
              ? "Claiming…"
              : claimedToday
                ? <><CheckCircle size={13} /> Claimed</>
                : "Claim Reward"
            }
          </button>
        </div>

        {/* Streak milestone */}
        {(() => {
          const nextStreak   = STREAK_MILESTONES.find(m => streak >= m.days && !claimedStreakTitles.includes(m.label));
          const lockedStreak = STREAK_MILESTONES.find(m => streak < m.days);
          const m = nextStreak || lockedStreak;
          if (!m) return null;
          return (
            <div className={`reward-card${!nextStreak ? " dimmed" : ""}`}>
              <div className="reward-icon"><Flame size={18} /></div>
              <h3>{m.label}</h3>
              <span>+{m.reward} CUBE</span>
              <p className="reward-desc">
                {nextStreak ? "Milestone reached!" : `${streak}/${m.days} days — keep going!`}
              </p>
              <button
                className={nextStreak ? "claim-btn" : "locked-btn"}
                onClick={nextStreak ? () => claimStreakMilestone(m) : undefined}
                disabled={!nextStreak || claiming === `streak_${m.days}`}
              >
                {claiming === `streak_${m.days}`
                  ? "Claiming…"
                  : nextStreak
                    ? "Claim Reward"
                    : <><Lock size={12} /> {streak}/{m.days} days</>
                }
              </button>
            </div>
          );
        })()}

        {/* Referral milestone */}
        <div className={`reward-card${!nextReferralMilestone ? " dimmed" : ""}`}>
          <div className="reward-icon"><Users size={18} /></div>
          <h3>
            {nextReferralMilestone
              ? `Invite ${nextReferralMilestone.target} Friends`
              : nextLockedReferral
                ? `Invite ${nextLockedReferral.target} Friends`
                : "Referral Master"
            }
          </h3>
          <span>+{nextReferralMilestone?.reward || nextLockedReferral?.reward || 1000} CUBE</span>
          <p className="reward-desc">
            {nextReferralMilestone
              ? `${referralCount} referrals — ready!`
              : `${referralCount}/${nextLockedReferral?.target || 50} referrals`
            }
          </p>
          <button
            className={nextReferralMilestone ? "claim-btn" : "locked-btn"}
            disabled={!nextReferralMilestone}
          >
            {nextReferralMilestone
              ? "Claim Reward"
              : <><Lock size={12} /> {referralCount}/{nextLockedReferral?.target || 50}</>
            }
          </button>
        </div>

        {/* Mining achievement */}
        <div className={`reward-card${!nextMineMilestone ? " dimmed" : ""}`}>
          <div className="reward-icon"><Trophy size={18} /></div>
          <h3>{nextMineMilestone?.label || nextLockedMine?.label || "Mine 10K CUBE"}</h3>
          <span>+{nextMineMilestone?.reward || nextLockedMine?.reward || 500} CUBE</span>
          <p className="reward-desc">
            {nextMineMilestone
              ? "Achievement unlocked!"
              : `${totalMined.toFixed(0)}/${nextLockedMine?.amount || 10000} mined`
            }
          </p>
          <button
            className={nextMineMilestone ? "claim-btn" : "locked-btn"}
            onClick={nextMineMilestone ? () => claimMineMilestone(nextMineMilestone) : undefined}
            disabled={!nextMineMilestone || claiming?.startsWith("mine_")}
          >
            {claiming?.startsWith("mine_")
              ? "Claiming…"
              : nextMineMilestone
                ? "Claim Reward"
                : <><Lock size={12} /> {totalMined.toFixed(0)}/{nextLockedMine?.amount || 10000}</>
            }
          </button>
        </div>

      </div>

      {/* Reward history */}
      <div className="history-card">
        <div className="history-header">
          <CheckCircle size={18} />
          <h3>Reward History</h3>
        </div>
        {rewardHistory.length === 0 ? (
          <p style={{ color: "rgba(200,255,195,0.3)", fontSize: "0.85rem", padding: "8px 0" }}>
            No rewards yet — start mining and claiming!
          </p>
        ) : (
          rewardHistory.map(tx => (
            <div key={tx.id} className="history-item">
              <div>
                <span>{tx.title}</span>
                <div className="history-date">{fmtDate(tx.created_at)}</div>
              </div>
              <strong>+{Math.abs(Number(tx.amount)).toFixed(2)} CUBE</strong>
            </div>
          ))
        )}
      </div>

      {/* Prize modal */}
      {showPrize && wonPrize && (
        <PrizeModal
          prize={wonPrize}
          onClose={() => { setShowPrize(false); setWonPrize(null); }}
        />
      )}

      {/* Toast */}
      {toast && (
        <div className={`rw-toast${toast.type === "error" ? " error" : ""}`}>
          {toast.msg}
        </div>
      )}

    </div>
  );
}