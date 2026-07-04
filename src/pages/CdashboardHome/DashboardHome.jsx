import "./DashboardHome.css";
import { useEffect, useState, useRef, useCallback } from "react";
import { supabase } from "../../libs/supabase";
import { Bell, Flame, Users, Pickaxe, Gift, ArrowUpRight, X } from "lucide-react";
import PagerLoader from "../../components/PagerLoader/PagerLoader";
import AnnouncementModal from "../../Admin/AdminComponents/AdminAnnouncements/AnnouncementModal";
import CubeIcon from "../../assets/cubecoin-robot-green.png"


// ── Helpers ───────────────────────────────────────────────────────────────────
const calcEarned = (startedAt, rate, totalPausedSecs = 0, currentlyPausedSince = null) => {
  let elapsedMs = Date.now() - new Date(startedAt).getTime();
  let pausedMs  = (totalPausedSecs || 0) * 1000;
  if (currentlyPausedSince) pausedMs += Date.now() - new Date(currentlyPausedSince).getTime();
  const activeMs = Math.max(0, elapsedMs - pausedMs);
  return Math.max(0, (activeMs / 3600000) * rate);
};

const fmtDuration = (secs) => {
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
};

const fmtDate = (iso) => {
  const d = new Date(iso);
  const now = new Date();
  const diff = Math.floor((now - d) / 86400000);
  const time = d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
  if (diff === 0) return `Today · ${time}`;
  if (diff === 1) return `Yesterday · ${time}`;
  return `${diff}d ago · ${time}`;
};

const TX_ICON = { "Mining Reward": "⛏", "Referral Bonus": "👥", "Streak Bonus": "🔥",
  "Subscription Bonus": "🎁", "Cashout Request": "💸", "Cashout Refund": "↩️" };

export default function DashboardHome() {
  const [userData,     setUserData]     = useState(null);
  const [subscription, setSubscription] = useState(null);
  const [activeSession,setActiveSession]= useState(null);
  const [claimable,    setClaimable]    = useState(0);
  const [transactions, setTransactions] = useState([]);
  const [stats,        setStats]        = useState({ miningTime: 0, streak: 0, referrals: 0, bonusEarned: 0 });
  const [loading,      setLoading]      = useState(true);
  const [showClaim,    setShowClaim]    = useState(false);
  const [claiming,     setClaiming]     = useState(false);
  const [toast,        setToast]        = useState(null);
  const timerRef = useRef(null);

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(null), 3200); };
  const [userId, setUserId] = useState(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUserId(data?.user?.id ?? null);
    });
  }, []);

  // ── Live claimable counter ────────────────────────────────────────────────
  useEffect(() => {
    if (!activeSession || activeSession.is_paused || !activeSession.is_mining) return;
    timerRef.current = setInterval(() => {
      setClaimable(calcEarned(
        activeSession.started_at,
        activeSession.mining_rate,
        activeSession.total_paused_secs,
        null
      ));
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [activeSession]);

  // ── Load all data ─────────────────────────────────────────────────────────
  const loadAll = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Profile
      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();
      setUserData(profile);

      // Subscription
      const { data: sub } = await supabase
        .from("subscriptions")
        .select("plan_name, mining_rate, tx_ref, payment_status, plan_status, approved_at, activated_at, approved_by, amount")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      setSubscription(sub);

      // Active mining session
      const { data: session } = await supabase
        .from("mining_sessions")
        .select("*")
        .eq("user_id", user.id)
        .eq("claimed", false)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (session) {
        setActiveSession(session);
        const earned = calcEarned(
          session.started_at,
          session.mining_rate,
          session.total_paused_secs,
          session.is_paused ? session.paused_at : null
        );
        setClaimable(earned);
      }

      // Recent wallet transactions
      const { data: allTxs } = await supabase
  .from("wallet_transactions")
  .select("*")
  .eq("user_id", user.id)
  .order("created_at", { ascending: false });

const txs = allTxs || [];

// Only show 5 recent transactions
setTransactions(txs.slice(0, 5));

      // Stats: total mining session time (all sessions)
      const { data: sessions } = await supabase
        .from("mining_sessions")
        .select("started_at, ends_at, claimed, total_paused_secs, mined_amount")
        .eq("user_id", user.id)
        .eq("claimed", true);

      const totalMiningSecs = (sessions || []).reduce((acc, s) => {
        const dur = (new Date(s.ends_at) - new Date(s.started_at)) / 1000;
        return acc + Math.max(0, dur - (s.total_paused_secs || 0));
      }, 0);

      // Referral count — profiles where referred_by_code = my referral_code
      let referralCount = 0;
      if (profile?.referral_code) {
        const { count } = await supabase
          .from("profiles")
          .select("*", { count: "exact", head: true })
          .eq("referred_by_code", profile.referral_code);
        referralCount = count || 0;
      }

      // Bonus earned from transactions (referral + streak + subscription bonuses)
      const bonusEarned = (txs || [])
        .filter(t => ["Referral Bonus", "Streak Bonus", "Subscription Bonus"].includes(t.title))
        .reduce((a, t) => a + Math.abs(Number(t.amount)), 0);

      setStats({
        miningTime:  Math.floor(totalMiningSecs),
        streak:      profile?.streak || 0,
        referrals:   referralCount,
        bonusEarned: bonusEarned,
      });

    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadAll(); }, []);

  // ── Claim reward ──────────────────────────────────────────────────────────
  const confirmClaim = async () => {
    if (!activeSession || claiming) return;
    setClaiming(true);

    try {
      const earned = calcEarned(
        activeSession.started_at,
        activeSession.mining_rate,
        activeSession.total_paused_secs,
        activeSession.is_paused ? activeSession.paused_at : null
      );

      if (earned <= 0) { showToast("Nothing to claim yet"); setClaiming(false); return; }

      const currentBalance = Number(userData?.cube_balance ?? 0);
      const currentTotal   = Number(userData?.total_mined  ?? 0);
      const newBalance     = currentBalance + earned;
      const newTotal       = currentTotal + earned;

      // 1. Update profile balance
      const { data: profUpdate, error: profErr } = await supabase
        .from("profiles")
        .update({ cube_balance: newBalance, total_mined: newTotal, streak: (userData?.streak || 0) + 1 })
        .eq("id", userData.id)
        .select();

      if (profErr || !profUpdate?.length) {
        showToast("Claim failed — try again");
        setClaiming(false);
        return;
      }

      // 2. Mark session claimed
      await supabase
        .from("mining_sessions")
        .update({ claimed: true, is_mining: false, is_paused: false, mined_amount: earned })
        .eq("id", activeSession.id);

      // 3. Log transaction
      await supabase.from("wallet_transactions").insert([{
        user_id: userData.id,
        title:   "Mining Reward",
        amount:  earned,
        type:    "credit",
      }]);

      // 4. Update local state
      setUserData(p => ({ ...p, cube_balance: newBalance, total_mined: newTotal, streak: (p?.streak || 0) + 1 }));
      setClaimable(0);
      setActiveSession(null);
      clearInterval(timerRef.current);
      setShowClaim(false);
      showToast(`🎉 ${earned.toFixed(4)} CUBE added to wallet!`);
      // Refresh transactions
      const { data: freshTxs } = await supabase
        .from("wallet_transactions")
        .select("*")
        .eq("user_id", userData.id)
        .order("created_at", { ascending: false })
        .limit(5);
      setTransactions(freshTxs || []);

    } catch (err) {
      console.error("Claim error:", err);
      showToast("Something went wrong — try again");
    } finally {
      setClaiming(false);
    }
  };

  if (loading) return <PagerLoader />;

  const hasActiveSession  = activeSession && !activeSession.claimed;
  const isMiningActive    = hasActiveSession && activeSession.is_mining && !activeSession.is_paused;
  const isMiningPaused    = hasActiveSession && activeSession.is_paused;

  return (
    <div className="dashboard-home">
      {userId && <AnnouncementModal userId={userId} />}
      {/* TOP BAR */}
      <div className="dashboard-topbar">
        <div className="profile-section">
          <img
            src={userData?.avatar_url || CubeIcon}
            alt="profile"
            className="profile-image"
          />
          <div>
            <p className="welcome-text">Welcome Back 👋</p>
            <h2 className="profile-name">{userData?.full_name || "User"}</h2>
          </div>
        </div>
        <button className="notification-btn">
          <Bell size={22} />
          <span className="notification-dot" />
        </button>
      </div>

      {/* HERO CARD */}
      <div className="hero-card">
        <p className="hero-label">Total Earned</p>
        <h1 className="hero-balance">{Number(userData?.cube_balance || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}</h1>
        <span className="hero-unit">CUBE</span>

        <div className="mining-active">
          <span className={`active-dot ${isMiningActive ? "pulse" : ""}`} />
          {isMiningActive ? "Mining Active" : isMiningPaused ? "Mining Paused" : "Mining Idle"}
        </div>

        <p className="mining-rate">{subscription?.mining_rate || 0} CUBE / Hour</p>

        {/* Live claimable */}
        {hasActiveSession && claimable > 0 && (
          <p className="claimable-hint">
            ⛏ <strong style={{ color: "#4ade80" }}>{claimable.toFixed(4)} CUBE</strong> ready to claim
          </p>
        )}

        <button
          className="claim-btn"
          onClick={() => hasActiveSession && claimable > 0 ? setShowClaim(true) : null}
          style={{ opacity: hasActiveSession && claimable > 0 ? 1 : 0.45, cursor: hasActiveSession && claimable > 0 ? "pointer" : "not-allowed" }}
        >
          {hasActiveSession && claimable > 0 ? `Claim ${claimable.toFixed(4)} CUBE` : "Claim Reward"}
        </button>
      </div>

      {/* STATS GRID */}
      <div className="stats-grid">

        <div className="stat-card">
          <div className="stat-icon"><Pickaxe size={20} /></div>
          <p className="stat-title">Mining Time</p>
          <h3 className="stat-value">{fmtDuration(stats.miningTime)}</h3>
        </div>

        <div className="stat-card">
          <div className="stat-icon"><Flame size={20} /></div>
          <p className="stat-title">Day Streak</p>
          <h3 className="stat-value">{stats.streak} Days</h3>
        </div>

        <div className="stat-card">
          <div className="stat-icon"><Users size={20} /></div>
          <p className="stat-title">Referrals</p>
          <h3 className="stat-value">{stats.referrals} Friends</h3>
        </div>

        <div className="stat-card">
          <div className="stat-icon"><Gift size={20} /></div>
          <p className="stat-title">Bonus Earned</p>
          <h3 className="stat-value">{stats.bonusEarned.toFixed(0)} CUBE</h3>
        </div>

        <div className="stat-card">
          <div className="stat-icon">🚀</div>
          <p className="stat-title">Current Plan</p>
          <h3 className="stat-value">{subscription?.plan_name || "Starter"}</h3>
        </div>

        <div className="stat-card">
          <div className="stat-icon">📋</div>
          <p className="stat-title">Plan Status</p>
          <h3 className="stat-value" style={{
            color: subscription?.plan_status === "approved" ? "#4ade80"
                 : subscription?.plan_status === "pending"  ? "#fbbf24" : "#f87171",
            fontSize: "1rem",
          }}>
            {subscription?.plan_status || "Pending"}
          </h3>
        </div>

      </div>

      {/* RECENT REWARDS */}
      <div className="rewards-card">
        <div className="card-header"><h3>Recent Transactions</h3></div>

        {transactions.length === 0 ? (
          <p style={{ color: "rgba(255,255,255,.35)", fontSize: "0.85rem", padding: "12px 0" }}>
            No transactions yet — start mining to earn CUBE!
          </p>
        ) : transactions.map(tx => {
          const amt    = Math.abs(Number(tx.amount));
          const prefix = Number(tx.amount) >= 0 ? "+" : "-";
          const icon   = TX_ICON[tx.title] || "💠";
          return (
            <div key={tx.id} className="reward-item">
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: "1.2rem" }}>{icon}</span>
                <div>
                  <div style={{ color: "#fff", fontWeight: 600, fontSize: "0.88rem" }}>{tx.title}</div>
                  <div style={{ color: "rgba(255,255,255,.35)", fontSize: "0.72rem", marginTop: 2 }}>{fmtDate(tx.created_at)}</div>
                </div>
              </div>
              <span className="reward-amount" style={{ color: Number(tx.amount) >= 0 ? "#4ade80" : "#f87171" }}>
                {prefix}{amt.toFixed(2)} CUBE
              </span>
            </div>
          );
        })}
      </div>

      {/* REFERRAL CARD */}
      <div className="referral-card">
        <div>
          <p className="referral-label">Referral Code</p>
          <h2 className="referral-code">{userData?.referral_code || subscription?.tx_ref || "—"}</h2>
        </div>
        <button
          className="invite-btn"
          onClick={() => {
            const code = userData?.referral_code || "";
            navigator.clipboard?.writeText(`${window.location.origin}/signup?ref=${code}`).catch(() => {});
            showToast("Invite link copied!");
          }}
        >
          Invite Friends <ArrowUpRight size={18} />
        </button>
      </div>

      {/* CLAIM MODAL */}
      {showClaim && (
        <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && setShowClaim(false)}>
          <div className="dash-modal">
            <button className="dash-modal-close" onClick={() => setShowClaim(false)}><X size={16} /></button>
            <div className="dash-modal-icon">🎉</div>
            <h3>Claim your reward</h3>
            <p>Add your mined CUBE to your wallet balance.</p>
            <div className="dash-modal-amt">{claimable.toFixed(4)}</div>
            <div className="dash-modal-unit">CUBE tokens</div>
            {activeSession?.is_paused && (
              <div className="dash-modal-notice">⏸ Session is paused — you can still claim what you've earned</div>
            )}
            <button
              className="dash-modal-confirm"
              onClick={confirmClaim}
              disabled={claiming || claimable <= 0}
            >
              {claiming ? "Processing…" : "Claim & add to wallet"}
            </button>
            <button className="dash-modal-cancel" onClick={() => setShowClaim(false)}>Cancel</button>
          </div>
        </div>
      )}

      {toast && <div className="dash-toast">{toast}</div>}
    </div>
  );
}