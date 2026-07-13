import "./ReferralPage.css";
import { useEffect, useState } from "react";
import { Users, Copy, Share2, Gift, Trophy, CheckCircle, AlertCircle } from "lucide-react";
import { supabase } from "../../libs/supabase";
import { useNavigate } from "react-router-dom";

const MILESTONES = [
  { target: 5,  reward: 100  },
  { target: 10, reward: 250  },
  { target: 25, reward: 500  },
  { target: 50, reward: 1000 },
];

function Toast({ msg, show, type = "success" }) {
  if (!show) return null;
  return (
    <div style={{
      position:"fixed", bottom:28, left:"50%", transform:"translateX(-50%)",
      background: type === "error" ? "#f87171" : "#4ade80",
      color: type === "error" ? "#1a0000" : "#041107",
      fontWeight:700, padding:"11px 20px", borderRadius:100,
      fontSize:"0.85rem", zIndex:9999, whiteSpace:"nowrap",
      fontFamily:"'DM Sans',sans-serif",
      maxWidth:"calc(100vw - 32px)", overflow:"hidden", textOverflow:"ellipsis",
      boxSizing:"border-box",
    }}>
      {msg}
    </div>
  );
}

export default function ReferralPage() {
  const navigate = useNavigate();

  const [referralCode,    setReferralCode]    = useState("");
  const [referrals,       setReferrals]       = useState([]);   // all referred users
  const [cubeBalance,     setCubeBalance]     = useState(0);
  const [totalMined,      setTotalMined]      = useState(0);
  const [totalReferrals,  setTotalReferrals]  = useState(0);   // all signups
  const [activeReferrals, setActiveReferrals] = useState(0);   // subscribed only
  const [claimedTargets,  setClaimedTargets]  = useState([]);
  const [loading,         setLoading]         = useState(true);
  const [userId,          setUserId]          = useState(null);
  const [toast,           setToast]           = useState({ show:false, msg:"", type:"success" });

  const showToast = (msg, type = "success") => {
    setToast({ show:true, msg, type });
    setTimeout(() => setToast({ show:false, msg:"", type:"success" }), 2800);
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
      .select("referral_code, cube_balance, total_mined")
      .eq("id", uid)
      .maybeSingle();

    const myCode = profile?.referral_code || "";
    setCubeBalance(Number(profile?.cube_balance || 0));
    setTotalMined(Number(profile?.total_mined || 0));
    setReferralCode(myCode);

    if (!myCode) return;

    // ── 2. All referred users (signed up with this code) ──────────────────────
    const { data: referredUsers } = await supabase
      .from("profiles")
      .select("id, full_name, email, created_at, subscription_status, plan_name")
      .eq("referred_by_code", myCode)
      .order("created_at", { ascending: false });

    const allRefs = referredUsers || [];
    setReferrals(allRefs);
    setTotalReferrals(allRefs.length);

    // Active = those who have an approved subscription
    const activeCount = allRefs.filter(r => r.subscription_status === "approved").length;
    setActiveReferrals(activeCount);

    // ── 3. Claimed milestones ─────────────────────────────────────────────────
    const { data: claims } = await supabase
      .from("claimed_milestones")
      .select("target")
      .eq("user_id", uid);

    const claimedSet = new Set((claims || []).map(c => c.target));
    setClaimedTargets([...claimedSet]);

    // ── 4. Auto-claim milestones (based on ALL referrals, not just active) ────
    // Milestone rewards are for getting people to sign up.
    // Active referral requirement is only enforced at withdrawal time.
    const newlyEarned = MILESTONES.filter(
      m => allRefs.length >= m.target && !claimedSet.has(m.target)
    );

    if (newlyEarned.length > 0) {
      let runningBalance = Number(profile?.cube_balance || 0);

      for (const m of newlyEarned) {
        const { error: claimErr } = await supabase
          .from("claimed_milestones")
          .insert([{ user_id: uid, target: m.target, reward: m.reward }]);

        if (claimErr) continue; // already claimed

        runningBalance += m.reward;
        claimedSet.add(m.target);

        await supabase.from("wallet_transactions").insert([{
          user_id: uid,
          title: "Referral Bonus",
          amount: m.reward,
          type: "credit",
        }]);
      }

      if (runningBalance !== Number(profile?.cube_balance || 0)) {
        await supabase
          .from("profiles")
          .update({ cube_balance: runningBalance })
          .eq("id", uid);
        setCubeBalance(runningBalance);
        showToast("🎉 Referral milestone bonus credited!");
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
        text: `Use my referral code ${referralCode} to join CubeCoin and start mining!`,
        url: referralLink,
      }).catch(() => {});
    } else {
      await navigator.clipboard.writeText(referralLink).catch(() => {});
      showToast("Invite link copied!");
    }
  };

  // Progress to next milestone
  const nextMilestone     = MILESTONES.find(m => totalReferrals < m.target);
  const prevTarget        = (() => {
    const reached = MILESTONES.filter(m => totalReferrals >= m.target);
    return reached.length ? reached[reached.length - 1].target : 0;
  })();
  const progPct = nextMilestone
    ? Math.round(((totalReferrals - prevTarget) / (nextMilestone.target - prevTarget)) * 100)
    : 100;

  const inactiveCount = totalReferrals - activeReferrals;

  if (loading) {
    return (
      <div className="referral-page">
        <div style={{ textAlign:"center", padding:"80px 20px", color:"rgba(255,255,255,.45)", fontFamily:"'DM Sans',sans-serif" }}>
          <div style={{ fontSize:"2rem", marginBottom:10 }}>👥</div>
          Loading your referrals…
        </div>
      </div>
    );
  }

  return (
    <div className="referral-page">

      {/* ── Hero ── */}
      <div className="referral-hero">
        <div className="hero-icon"><Users size={42} /></div>
        <h1>Invite Friends</h1>
        <p>Earn CUBE rewards when your friends join and start mining.</p>
        <div className="referral-code-box">
          <span>{referralCode || "—"}</span>
          <button onClick={copyCode} disabled={!referralCode}>
            <Copy size={16} /> Copy
          </button>
        </div>
      </div>

      {/* ── Stats ── */}
      <div className="referral-stats">
        <div className="ref-stat-card">
          <Users size={22} />
          <h2>{totalReferrals}</h2>
          <p>Total Referrals</p>
        </div>
        <div className="ref-stat-card">
          <CheckCircle size={22} />
          <h2>{activeReferrals}</h2>
          <p>Active Miners</p>
        </div>
        <div className="ref-stat-card">
          <Gift size={22} />
          <h2>{cubeBalance.toFixed(2)}</h2>
          <p>CUBE Balance</p>
        </div>
      </div>

      {/* ── Inactive referrals warning ── */}
      {inactiveCount > 0 && (
        <div className="ref-inactive-banner">
          <AlertCircle size={16} />
          <div>
            <strong>{inactiveCount} referral{inactiveCount !== 1 ? "s" : ""} not yet subscribed</strong>
            <p>
              Encourage {inactiveCount === 1 ? "them" : "these friends"} to subscribe to a mining plan.
              Only active subscribers count toward your withdrawal referral requirement.
            </p>
          </div>
        </div>
      )}

      {/* ── Progress to next milestone ── */}
      {nextMilestone && (
        <div className="ref-progress-card">
          <div className="ref-progress-header">
            <span>Next milestone: <strong style={{color:"#4ade80"}}>{nextMilestone.target} referrals</strong></span>
            <span style={{color:"#4ade80",fontWeight:700}}>{nextMilestone.reward} CUBE</span>
          </div>
          <div className="ref-progress-bar-wrap">
            <div className="ref-progress-bar" style={{ width:`${progPct}%` }} />
          </div>
          <div className="ref-progress-labels">
            <span>{totalReferrals} referrals</span>
            <span>{nextMilestone.target - totalReferrals} to go</span>
          </div>
        </div>
      )}

      {/* ── Invite link ── */}
      <div className="invite-card">
        <h3>Referral Link</h3>
        <div className="invite-link">
          <input type="text" value={referralLink} readOnly />
          <button onClick={shareLink}>
            <Share2 size={16} /> Share
          </button>
        </div>
      </div>

      {/* ── Milestones ── */}
      <div className="milestone-card">
        <h3><Trophy size={16} style={{verticalAlign:"middle",marginRight:6}}/>Referral Milestones</h3>
        {MILESTONES.map(m => {
          const isDone    = claimedTargets.includes(m.target);
          const isReached = !isDone && totalReferrals >= m.target;
          return (
            <div key={m.target} className={`milestone ${isDone ? "done" : ""}`}>
              <div>
                <h4>Invite {m.target} Friends</h4>
                <p>Reward: <strong style={{color:"#4ade80"}}>{m.reward} CUBE</strong></p>
              </div>
              {isDone ? (
                <span className="completed">
                  <CheckCircle size={13} style={{verticalAlign:"middle",marginRight:4}}/>Claimed
                </span>
              ) : isReached ? (
                <span className="completed">Completed ✓</span>
              ) : (
                <span className="progress">{totalReferrals}/{m.target}</span>
              )}
            </div>
          );
        })}
      </div>

      {/* ── Referred users list ── */}
      <div className="referral-list">
        <h3>Your Referrals ({totalReferrals})</h3>

        {referrals.length === 0 ? (
          <div style={{ textAlign:"center", padding:"32px 0", color:"rgba(255,255,255,.35)", fontSize:"0.88rem" }}>
            No referrals yet — share your code to start earning!
          </div>
        ) : referrals.map(ref => {
          const isActive = ref.subscription_status === "approved";
          const isPending = ref.subscription_status === "pending";
          return (
            <div key={ref.id} className="referral-user">
              <div className="ref-user-avatar">
                {(ref.full_name || ref.email || "?").charAt(0).toUpperCase()}
              </div>
              <div style={{flex:1, minWidth:0}}>
                <h4>{ref.full_name || ref.email?.split("@")[0] || "User"}</h4>
                <p>Joined {new Date(ref.created_at).toLocaleDateString("en-NG", {
                  day:"numeric", month:"short", year:"numeric",
                })}</p>
              </div>
              <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:3,flexShrink:0}}>
                <span className={`ref-status ${isActive ? "approved" : isPending ? "pending" : "none"}`}>
                  {isActive ? "✓ Miner" : isPending ? "⏳ Pending" : "Signed up"}
                </span>
                {!isActive && (
                  <span style={{fontSize:"0.68rem",color:"rgba(255,255,255,.3)"}}>
                    Not subscribed
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <Toast msg={toast.msg} show={toast.show} type={toast.type} />
    </div>
  );
}