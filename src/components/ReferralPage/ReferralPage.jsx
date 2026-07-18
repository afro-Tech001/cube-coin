import "./ReferralPage.css";
import { useEffect, useState } from "react";
import { Users, Copy, Share2, Gift, Trophy, CheckCircle, AlertCircle } from "lucide-react";
import { supabase } from "../../libs/supabase";
import { useNavigate } from "react-router-dom";

// Every 5 SUBSCRIBED referrals = 5,000 CUBE
const MILESTONES = [
  { target: 5,  reward: 5000,  label: "5 active miners"  },
  { target: 10, reward: 10000, label: "10 active miners" },
  { target: 25, reward: 25000, label: "25 active miners" },
  { target: 50, reward: 50000, label: "50 active miners" },
];

const PLAN_RULES = {
  5600:  { firstWithdrawalNaira: 2000,  requiredReferrals: 3 },
  10600: { firstWithdrawalNaira: 5000,  requiredReferrals: 3 },
  16200: { firstWithdrawalNaira: 10000, requiredReferrals: 3 },
  22500: { firstWithdrawalNaira: 15000, requiredReferrals: 3 },
  30350: { firstWithdrawalNaira: 20000, requiredReferrals: 3 },
  50000: { firstWithdrawalNaira: 25000, requiredReferrals: 3 },
};

function fmtCubes(n) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000)     return (n / 1_000).toFixed(n % 1_000 === 0 ? 0 : 1) + "K";
  return n.toLocaleString();
}

function Toast({ msg, show }) {
  if (!show) return null;
  return (
    <div style={{
      position:"fixed", bottom:28, left:"50%", transform:"translateX(-50%)",
      background:"#4ade80", color:"#041107", fontWeight:700,
      padding:"11px 20px", borderRadius:100, fontSize:"0.85rem",
      zIndex:9999, whiteSpace:"nowrap", fontFamily:"'DM Sans',sans-serif",
      animation:"toastIn .3s ease",
      maxWidth:"calc(100vw - 32px)",
    }}>
      {msg}
      <style>{`@keyframes toastIn{from{opacity:0;transform:translateX(-50%) translateY(10px)}to{opacity:1;transform:translateX(-50%) translateY(0)}}`}</style>
    </div>
  );
}

export default function ReferralPage() {
  const navigate = useNavigate();

  const [referralCode,     setReferralCode]     = useState("");
  const [referrals,        setReferrals]        = useState([]);
  const [cubeBalance,      setCubeBalance]      = useState(0);
  const [totalMined,       setTotalMined]       = useState(0);
  const [totalReferrals,   setTotalReferrals]   = useState(0);
  const [activeMiners,     setActiveMiners]     = useState(0);
  const [pendingReferrals, setPendingReferrals] = useState(0);
  const [claimedTargets,   setClaimedTargets]   = useState([]);
  const [loading,          setLoading]          = useState(true);
  const [userId,           setUserId]           = useState(null);
  const [toast,            setToast]            = useState({ show:false, msg:"" });
  const [planRule,         setPlanRule]         = useState(null);
  const [profile, setProfile] = useState(null);

  const showToast = (msg) => {
    setToast({ show:true, msg });
    setTimeout(() => setToast({ show:false, msg:"" }), 3000);
  };

  useEffect(() => { init(); }, []);

  const init = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { navigate("/login"); return; }
    setUserId(user.id);
    await loadAll(user.id);
    setLoading(false);
  };

  const loadAll = async (uid) => {
    // ── 1. Profile ────────────────────────────────────────────────────────────
    const { data: profile } = await supabase
      .from("profiles")
      .select("referral_code, cube_balance, total_mined, first_withdrawal_done")
      .eq("id", uid)
      .maybeSingle();
      setProfile(profile);

    const myCode         = profile?.referral_code || "";
    const currentBalance = Number(profile?.cube_balance || 0);
    setReferralCode(myCode);
    setCubeBalance(currentBalance);
    setTotalMined(Number(profile?.total_mined || 0));

    // ── 2. Active subscription for plan rule ──────────────────────────────────
    const { data: sub } = await supabase
      .from("subscriptions")
      .select("amount")
      .eq("user_id", uid)
      .eq("payment_status", "approved")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (sub) setPlanRule(PLAN_RULES[Number(sub.amount)] || null);

    if (!myCode) return;

    // ── 3. All referred users (signed up with code) ───────────────────────────
    const { data: referredUsers } = await supabase
      .from("profiles")
      .select("id, full_name, email, created_at, subscription_status")
      .eq("referred_by_code", myCode)
      .order("created_at", { ascending: false })
      .limit(100);

    const referred = referredUsers || [];
    setTotalReferrals(referred.length);
    setReferrals(referred);

    // ── 4. Count SUBSCRIBED referrals (have an approved subscription) ─────────
    // This is what counts toward milestones — not just sign-ups
    let activeMinerCount = 0;
    if (referred.length > 0) {
      const referredIds = referred.map(r => r.id);
      const { count } = await supabase
        .from("subscriptions")
        .select("*", { count:"exact", head:true })
        .in("user_id", referredIds)
        .eq("payment_status", "approved");
      activeMinerCount = count || 0;
    }

    setActiveMiners(activeMinerCount);
    setPendingReferrals(referred.length - activeMinerCount);

    // ── 5. Claimed milestones ─────────────────────────────────────────────────
    const { data: claims } = await supabase
      .from("claimed_milestones")
      .select("target, reward")
      .eq("user_id", uid);

    const claimedSet = new Set((claims || []).map(c => c.target));
    setClaimedTargets([...claimedSet]);

    // ── 6. Auto-claim newly reached milestones ────────────────────────────────
    // Based on activeMinerCount — SUBSCRIBED referrals only
    const newlyEarned = MILESTONES.filter(
      m => activeMinerCount >= m.target && !claimedSet.has(m.target)
    );

    if (newlyEarned.length > 0) {
      let runningBalance = currentBalance;

      for (const m of newlyEarned) {
        // Insert with upsert protection from unique constraint
        const { error: claimErr } = await supabase
          .from("claimed_milestones")
          .insert([{ user_id: uid, target: m.target, reward: m.reward }]);

        if (claimErr) {
          // Already claimed (unique constraint fired) — skip silently
          console.warn("Milestone already claimed:", m.target);
          claimedSet.add(m.target);
          continue;
        }

        runningBalance += m.reward;
        claimedSet.add(m.target);

        // Log to wallet_transactions
        await supabase.from("wallet_transactions").insert([{
          user_id: uid,
          title:   `Referral Milestone — ${m.label}`,
          amount:  m.reward,
          type:    "credit",
        }]);
      }

      if (runningBalance !== currentBalance) {
        const { error: balErr } = await supabase
          .from("profiles")
          .update({ cube_balance: runningBalance })
          .eq("id", uid);

        if (!balErr) {
          setCubeBalance(runningBalance);
          showToast(`🎉 Referral bonus credited! +${(runningBalance - currentBalance).toLocaleString()} CUBE`);
        }
      }

      setClaimedTargets([...claimedSet]);
    }
  };

  const referralLink = `${window.location.origin}/signup?ref=${referralCode}`;

  const copyCode = async () => {
    await navigator.clipboard.writeText(referralCode).catch(() => {});
    showToast("Referral code copied!");
  };

  const shareLink = async () => {
    if (navigator.share) {
      await navigator.share({
        title: "Join CubeCoin",
        text:  `Use my referral code ${referralCode} to join CubeCoin, subscribe and start mining!`,
        url:   referralLink,
      }).catch(() => {});
    } else {
      await navigator.clipboard.writeText(referralLink).catch(() => {});
      showToast("Invite link copied!");
    }
  };

  // Progress to next milestone — based on ACTIVE MINERS
  const nextMilestone = MILESTONES.find(m => activeMiners < m.target);
  const prevTarget = (() => {
    const reached = MILESTONES.filter(m => activeMiners >= m.target);
    return reached.length ? reached[reached.length - 1].target : 0;
  })();
  const progPct = nextMilestone
    ? Math.round(((activeMiners - prevTarget) / (nextMilestone.target - prevTarget)) * 100)
    : 100;

  // Total potential earnings
  const totalPotential = MILESTONES.reduce((a, m) => a + m.reward, 0);
  const totalEarned    = MILESTONES
    .filter(m => claimedTargets.includes(m.target))
    .reduce((a, m) => a + m.reward, 0);

  if (loading) return (
    <div className="referral-page">
      <div style={{ textAlign:"center", padding:"80px 20px", color:"rgba(255,255,255,.45)", fontFamily:"'DM Sans',sans-serif" }}>
        <div style={{ fontSize:"2rem", marginBottom:10 }}>👥</div>
        Loading your referrals…
      </div>
    </div>
  );

  return (
    <div className="referral-page">

      {/* ── Hero ── */}
      <div className="referral-hero">
        <div className="hero-icon"><Users size={42} /></div>
        <h1>Invite & Earn</h1>
        <p>
          Earn <strong style={{ color:"#4ade80" }}>5,000 CUBE</strong> for every{" "}
          <strong style={{ color:"#4ade80" }}>5 friends who subscribe</strong> — not just sign up!
        </p>
        <div className="referral-code-box">
          <span>{referralCode || "—"}</span>
          <button onClick={copyCode} disabled={!referralCode}>
            <Copy size={16} /> Copy
          </button>
        </div>
      </div>

      {/* ── How it works ── */}
      <div className="ref-how-it-works">
        <div className="ref-how-title">How referral bonuses work</div>
        <div className="ref-how-steps">
          <div className="ref-how-step">
            <div className="ref-how-num">1</div>
            <div className="ref-how-text">Share your referral code or link</div>
          </div>
          <div className="ref-how-arrow">→</div>
          <div className="ref-how-step">
            <div className="ref-how-num">2</div>
            <div className="ref-how-text">Friend signs up with your code</div>
          </div>
          <div className="ref-how-arrow">→</div>
          <div className="ref-how-step">
            <div className="ref-how-num">3</div>
            <div className="ref-how-text">Friend subscribes to any plan</div>
          </div>
          <div className="ref-how-arrow">→</div>
          <div className="ref-how-step">
            <div className="ref-how-num">4</div>
            <div className="ref-how-text">You earn 5,000 CUBE per 5 subscribers!</div>
          </div>
        </div>
      </div>

      {/* ── Alert: unsubscribed referrals ── */}
      {pendingReferrals > 0 && (
        <div className="ref-alert-banner">
          <AlertCircle size={15} style={{ flexShrink:0 }} />
          <div>
            <strong>{pendingReferrals} of your {totalReferrals} referral{totalReferrals !== 1 ? "s" : ""} {pendingReferrals === 1 ? "hasn't" : "haven't"} subscribed yet.</strong>
            {" "}Only <strong style={{ color:"#4ade80" }}>subscribed users</strong> count toward your milestones.
            Remind them to subscribe to unlock your bonus!
          </div>
        </div>
      )}

      {/* ── Stats ── */}
      <div className="referral-stats">
        <div className="ref-stat-card">
          <Users size={22} />
          <h2>{totalReferrals}</h2>
          <p>Total Referrals</p>
        </div>
        <div className="ref-stat-card active">
          <CheckCircle size={22} />
          <h2 style={{ color:"#4ade80" }}>{activeMiners}</h2>
          <p>Subscribed</p>
        </div>
        <div className="ref-stat-card">
          <Gift size={22} />
          <h2 style={{ color:"#4ade80" }}>{fmtCubes(totalEarned)}</h2>
          <p>CUBE Earned</p>
        </div>
      </div>

      {/* ── Earnings potential card ── */}
      <div className="ref-earnings-card">
        <div className="ref-earnings-header">
          <span>💰 Total earnings potential</span>
          <span style={{ color:"#4ade80", fontWeight:800 }}>
            {fmtCubes(totalPotential)} CUBE
          </span>
        </div>
        <div className="ref-earnings-sub">
          Bring in 50 subscribed users → earn {fmtCubes(totalPotential)} CUBE total
        </div>
        <div className="ref-earnings-progress">
          <div style={{ width:`${Math.min(100,(totalEarned/totalPotential)*100)}%` }} />
        </div>
        <div className="ref-earnings-labels">
          <span>{fmtCubes(totalEarned)} earned</span>
          <span>{fmtCubes(totalPotential - totalEarned)} remaining</span>
        </div>
      </div>

      {/* ── Withdrawal requirement — only show AFTER first withdrawal ── */}
{planRule && profile?.first_withdrawal_done && (
  <div className="ref-withdrawal-card">
    <div className="ref-withdrawal-header">
      <div className="ref-wr-title-row">
        <span className="ref-wr-icon">🔒</span>
        <span>Withdrawal Requirement</span>
      </div>
      <span className={`ref-wr-badge ${activeMiners >= planRule.requiredReferrals ? "met" : "unmet"}`}>
        {activeMiners >= planRule.requiredReferrals ? "✓ Requirement met" : "Not yet met"}
      </span>
    </div>

    <p className="ref-withdrawal-desc">
      You have made your first withdrawal. From now on, further cashouts
      require <strong style={{ color:"#4ade80" }}>{planRule.requiredReferrals} subscribed referrals</strong>.
      You currently have{" "}
      <strong style={{ color: activeMiners >= planRule.requiredReferrals ? "#4ade80" : "#f87171" }}>
        {activeMiners}
      </strong>.
    </p>

    <div className="ref-wr-progress-wrap">
      <div className="ref-wr-progress-row">
        <span>Subscribed referrals</span>
        <span className="ref-wr-count">
          {activeMiners} / {planRule.requiredReferrals}
        </span>
      </div>
      <div className="ref-wr-bar-wrap">
        <div
          className="ref-wr-bar"
          style={{ width:`${Math.min(100, (activeMiners / planRule.requiredReferrals) * 100)}%` }}
        />
      </div>
      {activeMiners < planRule.requiredReferrals ? (
        <p className="ref-wr-hint">
          You need{" "}
          <strong style={{ color:"#fbbf24" }}>
            {planRule.requiredReferrals - activeMiners} more subscribed referral{planRule.requiredReferrals - activeMiners !== 1 ? "s" : ""}
          </strong>{" "}
          to unlock your next withdrawal.
        </p>
      ) : (
        <p className="ref-wr-hint met">
          ✓ You meet the requirement — withdrawals are unlocked!
        </p>
      )}
    </div>
  </div>
)}

      {/* ── Progress to next milestone ── */}
      {nextMilestone && (
        <div className="ref-progress-card">
          <div className="ref-progress-header">
            <span>Next: <strong style={{color:"#4ade80"}}>{nextMilestone.target} subscribed users</strong></span>
            <span style={{color:"#4ade80",fontWeight:800}}>+{fmtCubes(nextMilestone.reward)} CUBE</span>
          </div>
          <div className="ref-progress-bar-wrap">
            <div className="ref-progress-bar" style={{ width:`${progPct}%` }} />
          </div>
          <div className="ref-progress-labels">
            <span>{activeMiners} subscribed</span>
            <span>{nextMilestone.target - activeMiners} more needed</span>
          </div>
        </div>
      )}

      {/* ── Invite link ── */}
      <div className="invite-card">
        <h3>Referral Link</h3>
        <div className="invite-link">
          <input type="text" value={referralLink} readOnly />
          <button onClick={shareLink}><Share2 size={16} /> Share</button>
        </div>
      </div>

      {/* ── Milestones ── */}
      <div className="milestone-card">
        <h3><Trophy size={16} style={{verticalAlign:"middle",marginRight:6}} />Milestone Rewards</h3>
        <p style={{ fontSize:11, color:"rgba(255,255,255,.35)", marginBottom:16, lineHeight:1.5 }}>
          Rewards are based on <strong style={{ color:"rgba(255,255,255,.55)" }}>subscribed referrals only</strong>.
          Auto-credited when milestone is reached.
        </p>
        {MILESTONES.map(m => {
          const isDone    = claimedTargets.includes(m.target);
          const isReached = !isDone && activeMiners >= m.target;
          return (
            <div key={m.target} className={`milestone ${isDone ? "done" : ""}`}>
              <div>
                <h4>{m.target} Subscribed Referrals</h4>
                <p>
                  Reward:{" "}
                  <strong style={{ color:"#4ade80", fontSize:"1rem" }}>
                    {fmtCubes(m.reward)} CUBE
                  </strong>
                </p>
              </div>
              {isDone ? (
                <span className="completed">
                  <CheckCircle size={13} style={{verticalAlign:"middle",marginRight:4}} />
                  Claimed
                </span>
              ) : isReached ? (
                <span className="completed">Completed ✓</span>
              ) : (
                <span className="progress">{activeMiners}/{m.target}</span>
              )}
            </div>
          );
        })}
      </div>

      {/* ── Referred users list ── */}
      <div className="referral-list">
        <h3>Your Referrals ({totalReferrals})</h3>

        {totalReferrals > 0 && (
          <div className="ref-list-summary">
            <span className="ref-list-sum-item active">
              <CheckCircle size={11} /> {activeMiners} subscribed
            </span>
            {pendingReferrals > 0 && (
              <span className="ref-list-sum-item pending">
                <AlertCircle size={11} /> {pendingReferrals} not subscribed
              </span>
            )}
          </div>
        )}

        {referrals.length === 0 ? (
          <div style={{ textAlign:"center", padding:"32px 0", color:"rgba(255,255,255,.35)", fontSize:"0.88rem" }}>
            No referrals yet — share your code to start earning!
          </div>
        ) : referrals.map(ref => {
          const isSubscribed = ref.subscription_status === "approved";
          const isPending    = ref.subscription_status === "pending";
          return (
            <div key={ref.id} className="referral-user">
              <div className={`ref-user-avatar ${isSubscribed ? "active" : isPending ? "pending" : "inactive"}`}>
                {(ref.full_name || ref.email || "?").charAt(0).toUpperCase()}
              </div>
              <div style={{flex:1, minWidth:0}}>
                <h4>{ref.full_name || ref.email?.split("@")[0] || "User"}</h4>
                <p>Joined {new Date(ref.created_at).toLocaleDateString("en-NG", {
                  day:"numeric", month:"short", year:"numeric",
                })}</p>
                {!isSubscribed && !isPending && (
                  <p style={{ fontSize:10, color:"#f87171", marginTop:2 }}>
                    ⚠ Not subscribed — doesn't count toward milestones
                  </p>
                )}
                {isPending && (
                  <p style={{ fontSize:10, color:"#fbbf24", marginTop:2 }}>
                    ⏳ Subscription pending approval
                  </p>
                )}
                {isSubscribed && (
                  <p style={{ fontSize:10, color:"#4ade80", marginTop:2 }}>
                    ✓ Counts toward your milestone
                  </p>
                )}
              </div>
              <span className={`ref-status ${isSubscribed ? "approved" : isPending ? "pending" : "none"}`}>
                {isSubscribed ? "✓ Subscribed" : isPending ? "⏳ Pending" : "Not subscribed"}
              </span>
            </div>
          );
        })}
      </div>

      <Toast msg={toast.msg} show={toast.show} />
    </div>
  );
}