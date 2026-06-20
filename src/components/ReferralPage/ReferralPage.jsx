import "./ReferralPage.css";
import { useEffect, useState } from "react";
import { Users, Copy, Share2, Gift, Trophy, CheckCircle } from "lucide-react";
import { supabase } from "../../libs/supabase";
import { useNavigate } from "react-router-dom";

const MILESTONES = [
  { target: 5,  reward: 100  },
  { target: 10, reward: 250  },
  { target: 25, reward: 500  },
  { target: 50, reward: 1000 },
];

function Toast({ msg, show }) {
  if (!show) return null;
  return (
    <div style={{
      position:"fixed", bottom:28, left:"50%", transform:"translateX(-50%)",
      background:"#4ade80", color:"#041107", fontWeight:700,
      padding:"11px 20px", borderRadius:100, fontSize:"0.85rem",
      zIndex:9999, whiteSpace:"nowrap", fontFamily:"'DM Sans',sans-serif",
      animation:"toastIn .3s ease",
      maxWidth:"calc(100vw - 32px)", overflow:"hidden", textOverflow:"ellipsis",
      boxSizing:"border-box",
    }}>
      {msg}
      <style>{`@keyframes toastIn{from{opacity:0;transform:translateX(-50%) translateY(10px)}to{opacity:1;transform:translateX(-50%) translateY(0)}}`}</style>
    </div>
  );
}

export default function ReferralPage() {
  const navigate = useNavigate();

  const [referralCode,   setReferralCode]   = useState("");
  const [referrals,      setReferrals]      = useState([]);   // list of referred users
  const [cubeBalance,    setCubeBalance]    = useState(0);
  const [totalMined,     setTotalMined]     = useState(0);
  const [totalReferrals, setTotalReferrals] = useState(0);
  const [claimedTargets, setClaimedTargets] = useState([]);
  const [loading,        setLoading]        = useState(true);
  const [userId,         setUserId]         = useState(null);
  const [toast,          setToast]          = useState({ show:false, msg:"" });

  const showToast = (msg) => {
    setToast({ show:true, msg });
    setTimeout(() => setToast({ show:false, msg:"" }), 2800);
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
    // ── 1. Fetch profile ──────────────────────────────────────────────────────
    const { data: profile, error: profErr } = await supabase
      .from("profiles")
      .select("referral_code, cube_balance, total_mined")
      .eq("id", uid)
      .maybeSingle();

    if (profErr) console.error("Profile error:", profErr);

    const myCode        = profile?.referral_code || "";
    const currentBalance = Number(profile?.cube_balance || 0);

    setReferralCode(myCode);
    setCubeBalance(currentBalance);
    setTotalMined(Number(profile?.total_mined || 0));

    if (!myCode) return;

    // ── 2. Count how many profiles have referred_by_code = my referral_code ──
    const { count, error: countErr } = await supabase
      .from("profiles")
      .select("*", { count:"exact", head:true })
      .eq("referred_by_code", myCode);

    if (countErr) console.error("Count error:", countErr);
    const referralCount = count || 0;
    setTotalReferrals(referralCount);

    // ── 3. Fetch the actual referred users (for the list) ─────────────────────
    const { data: referredUsers, error: usersErr } = await supabase
      .from("profiles")
      .select("id, full_name, email, created_at, subscription_status")
      .eq("referred_by_code", myCode)
      .order("created_at", { ascending: false })
      .limit(20);

    if (usersErr) console.error("Users error:", usersErr);
    setReferrals(referredUsers || []);

    // ── 4. Load claimed milestones ────────────────────────────────────────────
    const { data: claims, error: claimsErr } = await supabase
      .from("claimed_milestones")
      .select("target")
      .eq("user_id", uid);

    if (claimsErr) console.error("Claims error:", claimsErr);
    const claimedSet = new Set((claims || []).map(c => c.target));
    setClaimedTargets([...claimedSet]);

    // ── 5. Auto-claim newly reached milestones ────────────────────────────────
    const newlyEarned = MILESTONES.filter(
      m => referralCount >= m.target && !claimedSet.has(m.target)
    );

    if (newlyEarned.length > 0) {
      let runningBalance = currentBalance;

      for (const m of newlyEarned) {
        const { error: claimErr } = await supabase
          .from("claimed_milestones")
          .insert([{ user_id: uid, target: m.target, reward: m.reward }]);

        if (claimErr) {
          // Already claimed — unique constraint fired, skip
          console.warn("Milestone already claimed:", m.target, claimErr.message);
          continue;
        }

        runningBalance += m.reward;
        claimedSet.add(m.target);

        // Log to wallet_transactions
        await supabase.from("wallet_transactions").insert([{
          user_id: uid,
          title:   "Referral Bonus",
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
          showToast(`🎉 Referral milestone bonus credited!`);
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
        text:  `Use my referral code ${referralCode} to join CubeCoin and start mining!`,
        url:   referralLink,
      }).catch(() => {});
    } else {
      await navigator.clipboard.writeText(referralLink).catch(() => {});
      showToast("Invite link copied!");
    }
  };

  // Progress to next milestone
  const nextMilestone = MILESTONES.find(m => totalReferrals < m.target);
  const prevTarget    = (() => {
    const reached = MILESTONES.filter(m => totalReferrals >= m.target);
    return reached.length ? reached[reached.length - 1].target : 0;
  })();
  const progPct = nextMilestone
    ? Math.round(((totalReferrals - prevTarget) / (nextMilestone.target - prevTarget)) * 100)
    : 100;

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
          <Gift size={22} />
          <h2>{cubeBalance.toFixed(2)}</h2>
          <p>CUBE Balance</p>
        </div>
        <div className="ref-stat-card">
          <Trophy size={22} />
          <h2>{totalMined.toFixed(2)}</h2>
          <p>Total Mined</p>
        </div>
      </div>

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
        <h3><Trophy size={16} style={{verticalAlign:"middle",marginRight:6}} />Referral Milestones</h3>
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
                  <CheckCircle size={13} style={{verticalAlign:"middle",marginRight:4}} />
                  Claimed
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
          <div style={{
            textAlign:"center", padding:"32px 0",
            color:"rgba(255,255,255,.35)", fontSize:"0.88rem",
          }}>
            No referrals yet — share your code to start earning!
          </div>
        ) : referrals.map(ref => (
          <div key={ref.id} className="referral-user">
            <div className="ref-user-avatar">
              {(ref.full_name || ref.email || "?").charAt(0).toUpperCase()}
            </div>
            <div style={{flex:1}}>
              <h4>{ref.full_name || ref.email?.split("@")[0] || "User"}</h4>
              <p>Joined {new Date(ref.created_at).toLocaleDateString("en-NG", {
                day:"numeric", month:"short", year:"numeric",
              })}</p>
            </div>
            <span className={`ref-status ${ref.subscription_status || "none"}`}>
              {ref.subscription_status === "approved"  ? "✓ Miner"
               : ref.subscription_status === "pending" ? "⏳ Pending"
               : "Signed up"}
            </span>
          </div>
        ))}
      </div>

      <Toast msg={toast.msg} show={toast.show} />
    </div>
  );
}