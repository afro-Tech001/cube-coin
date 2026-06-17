import "./RewardsPage.css";
import { useEffect, useState } from "react";
import { Gift, Flame, Trophy, Users, CheckCircle, Lock } from "lucide-react";
import { supabase } from "../../libs/supabase";

const fmtDate = (iso) => {
  const d = new Date(iso);
  const now = new Date();
  const diff = Math.floor((now - d) / 86400000);
  if (diff === 0) return "Today";
  if (diff === 1) return "Yesterday";
  return `${diff}d ago`;
};

// Streak milestones — award CUBE at these streaks if not yet claimed
const STREAK_MILESTONES = [
  { days: 7,  reward: 50,  label: "7 Day Streak"  },
  { days: 14, reward: 100, label: "14 Day Streak" },
  { days: 30, reward: 250, label: "30 Day Streak" },
];

export default function RewardsPage() {
  const [profile,        setProfile]        = useState(null);
  const [transactions,   setTransactions]   = useState([]);
  const [claimedMilest,  setClaimedMilest]  = useState([]);   // claimed_milestones targets
  const [referralCount,  setReferralCount]  = useState(0);
  const [totalRewards,   setTotalRewards]   = useState(0);
  const [loading,        setLoading]        = useState(true);
  const [claiming,       setClaiming]       = useState(null); // key of card being claimed
  const [toast,          setToast]          = useState(null);
  const [userId,         setUserId]         = useState(null);

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => { loadAll(); }, []);

  const loadAll = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setUserId(user.id);

    // Profile
    const { data: prof } = await supabase
      .from("profiles")
      .select("cube_balance, total_mined, streak, referral_code")
      .eq("id", user.id)
      .maybeSingle();
    setProfile(prof);

    // Wallet transactions — recent reward types only
    const { data: txs } = await supabase
      .from("wallet_transactions")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(20);
    setTransactions(txs || []);

    // Total rewards = sum of all credit transactions
    const total = (txs || [])
      .filter(t => t.type === "credit")
      .reduce((a, t) => a + Math.abs(Number(t.amount)), 0);
    setTotalRewards(total);

    // Claimed milestones (referral)
    const { data: cms } = await supabase
      .from("claimed_milestones")
      .select("target")
      .eq("user_id", user.id);
    setClaimedMilest((cms || []).map(c => c.target));

    // Referral count
    if (prof?.referral_code) {
      const { count } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true })
        .eq("referred_by_code", prof.referral_code);
      setReferralCount(count || 0);
    }

    setLoading(false);
  };

  // ── Claim daily check-in ──────────────────────────────────────────────────
  const claimDailyCheckIn = async () => {
    if (claiming) return;
    setClaiming("daily");
    try {
      // Check if already claimed today
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      const { data: todayTx } = await supabase
        .from("wallet_transactions")
        .select("id")
        .eq("user_id", userId)
        .eq("title", "Daily Check-In")
        .gte("created_at", todayStart.toISOString())
        .maybeSingle();

      if (todayTx) {
        showToast("Already claimed today! Come back tomorrow.", "error");
        setClaiming(null);
        return;
      }

      const reward = 10;
      const newBalance = Number(profile?.cube_balance || 0) + reward;

      await supabase.from("profiles").update({ cube_balance: newBalance }).eq("id", userId);
      await supabase.from("wallet_transactions").insert([{
        user_id: userId, title: "Daily Check-In", amount: reward, type: "credit",
      }]);

      setProfile(p => ({ ...p, cube_balance: newBalance }));
      showToast(`+${reward} CUBE claimed! Come back tomorrow.`);
      await loadAll();
    } catch (e) {
      console.error(e);
      showToast("Claim failed — try again", "error");
    } finally {
      setClaiming(null);
    }
  };

  // ── Claim streak milestone ────────────────────────────────────────────────
  const claimStreakMilestone = async (milestone) => {
    if (claiming) return;
    setClaiming(`streak_${milestone.days}`);
    try {
      // Check not already claimed via wallet_transactions
      const { data: existing } = await supabase
        .from("wallet_transactions")
        .select("id")
        .eq("user_id", userId)
        .eq("title", milestone.label)
        .maybeSingle();

      if (existing) {
        showToast("Already claimed!", "error");
        setClaiming(null);
        return;
      }

      const newBalance = Number(profile?.cube_balance || 0) + milestone.reward;

      await supabase.from("profiles").update({ cube_balance: newBalance }).eq("id", userId);
      await supabase.from("wallet_transactions").insert([{
        user_id: userId, title: milestone.label, amount: milestone.reward, type: "credit",
      }]);

      setProfile(p => ({ ...p, cube_balance: newBalance }));
      showToast(`🔥 ${milestone.reward} CUBE claimed for ${milestone.label}!`);
      await loadAll();
    } catch (e) {
      console.error(e);
      showToast("Claim failed — try again", "error");
    } finally {
      setClaiming(null);
    }
  };

  // ── Derived state ─────────────────────────────────────────────────────────
  const streak = profile?.streak || 0;

  // Which streak milestones are ready to claim (reached + not yet in wallet_transactions)
  const claimedStreakTitles = transactions
    .filter(t => STREAK_MILESTONES.some(m => m.label === t.title))
    .map(t => t.title);

  // Daily check-in: available if not claimed today
  const todayStart = new Date(); todayStart.setHours(0,0,0,0);
  const claimedToday = transactions.some(
    t => t.title === "Daily Check-In" && new Date(t.created_at) >= todayStart
  );

  // Referral reward: show next unclaimed milestone
  const REFERRAL_MILESTONES = [
    { target: 5, reward: 100 }, { target: 10, reward: 250 },
    { target: 25, reward: 500 }, { target: 50, reward: 1000 },
  ];
  const nextReferralMilestone = REFERRAL_MILESTONES.find(
    m => referralCount >= m.target && !claimedMilest.includes(m.target)
  );
  const nextLockedReferral = REFERRAL_MILESTONES.find(m => referralCount < m.target);

  // Achievement: total mined milestone
  const totalMined = Number(profile?.total_mined || 0);
  const MINE_MILESTONES = [
    { amount: 1000, reward: 75, label: "Mine 1K CUBE" },
    { amount: 5000, reward: 200, label: "Mine 5K CUBE" },
    { amount: 10000, reward: 500, label: "Mine 10K CUBE" },
  ];
  const nextMineMilestone = MINE_MILESTONES.find(m => {
    const claimed = transactions.some(t => t.title === m.label);
    return totalMined >= m.amount && !claimed;
  });
  const nextLockedMine = MINE_MILESTONES.find(m => totalMined < m.amount);

  const claimMineMilestone = async (milestone) => {
    if (claiming) return;
    setClaiming(`mine_${milestone.amount}`);
    try {
      const existing = transactions.find(t => t.title === milestone.label);
      if (existing) { showToast("Already claimed!", "error"); setClaiming(null); return; }

      const newBalance = Number(profile?.cube_balance || 0) + milestone.reward;
      await supabase.from("profiles").update({ cube_balance: newBalance }).eq("id", userId);
      await supabase.from("wallet_transactions").insert([{
        user_id: userId, title: milestone.label, amount: milestone.reward, type: "credit",
      }]);
      setProfile(p => ({ ...p, cube_balance: newBalance }));
      showToast(`🏆 ${milestone.reward} CUBE claimed for ${milestone.label}!`);
      await loadAll();
    } catch (e) {
      showToast("Claim failed — try again", "error");
    } finally {
      setClaiming(null);
    }
  };

  // Reward history — only credit transactions with reward titles
  const rewardHistory = transactions.filter(t =>
    t.type === "credit" && t.title !== "Cashout Refund"
  ).slice(0, 8);

  if (loading) {
    return (
      <div className="rewards-page">
        <div style={{ textAlign: "center", padding: "80px 20px", color: "rgba(255,255,255,.45)" }}>
          <div style={{ fontSize: "2rem", marginBottom: 10 }}>🎁</div>
          Loading your rewards…
        </div>
      </div>
    );
  }

  return (
    <div className="rewards-page">

      {/* Header */}
      <div className="rewards-header">
        <h1>🎁 Rewards Center</h1>
        <p>Complete activities and earn more CUBE rewards.</p>
      </div>

      {/* Total Reward Card */}
      <div className="total-reward-card">
        <div className="total-reward-inner">
          <div>
            <p>Total Rewards Earned</p>
            <h2>{totalRewards.toLocaleString(undefined, { maximumFractionDigits: 2 })} CUBE</h2>
          </div>
          <div className="total-reward-stats">
            <div className="trs-item">
              <span className="trs-val">{streak}</span>
              <span className="trs-label">Day streak</span>
            </div>
            <div className="trs-item">
              <span className="trs-val">{referralCount}</span>
              <span className="trs-label">Referrals</span>
            </div>
            <div className="trs-item">
              <span className="trs-val">{totalMined.toFixed(0)}</span>
              <span className="trs-label">Total mined</span>
            </div>
          </div>
        </div>
      </div>

      {/* Rewards Grid */}
      <div className="rewards-grid">

        {/* Daily Check-In */}
        <div className={`reward-card ${claimedToday ? "dimmed" : ""}`}>
          <div className="reward-icon"><Gift size={22} /></div>
          <h3>Daily Check-In</h3>
          <span>+10 CUBE</span>
          <p className="reward-desc">{claimedToday ? "Come back tomorrow!" : "Claim your daily bonus"}</p>
          <button
            className={claimedToday ? "locked-btn" : "claim-btn"}
            onClick={claimedToday ? undefined : claimDailyCheckIn}
            disabled={claimedToday || claiming === "daily"}
          >
            {claiming === "daily" ? "Claiming…"
              : claimedToday ? <><CheckCircle size={14} /> Claimed</>
              : "Claim Reward"}
          </button>
        </div>

        {/* Streak Milestone */}
        {(() => {
          const nextStreak = STREAK_MILESTONES.find(
            m => streak >= m.days && !claimedStreakTitles.includes(m.label)
          );
          const lockedStreak = STREAK_MILESTONES.find(m => streak < m.days);
          const showMilestone = nextStreak || lockedStreak;
          if (!showMilestone) return null;
          const available = !!nextStreak;
          const m = nextStreak || lockedStreak;
          return (
            <div className={`reward-card ${!available ? "dimmed" : ""}`}>
              <div className="reward-icon"><Flame size={22} /></div>
              <h3>{m.label}</h3>
              <span>+{m.reward} CUBE</span>
              <p className="reward-desc">
                {available ? "Streak milestone reached!" : `${streak}/${m.days} days — keep going!`}
              </p>
              <button
                className={available ? "claim-btn" : "locked-btn"}
                onClick={available ? () => claimStreakMilestone(m) : undefined}
                disabled={!available || claiming === `streak_${m.days}`}
              >
                {claiming === `streak_${m.days}` ? "Claiming…"
                  : available ? "Claim Reward"
                  : <><Lock size={13} /> {streak}/{m.days} days</>}
              </button>
            </div>
          );
        })()}

        {/* Referral Milestone */}
        <div className={`reward-card ${!nextReferralMilestone ? "dimmed" : ""}`}>
          <div className="reward-icon"><Users size={22} /></div>
          <h3>
            {nextReferralMilestone
              ? `Invite ${nextReferralMilestone.target} Friends`
              : nextLockedReferral
              ? `Invite ${nextLockedReferral.target} Friends`
              : "Referral Master"}
          </h3>
          <span>
            +{nextReferralMilestone?.reward || nextLockedReferral?.reward || 1000} CUBE
          </span>
          <p className="reward-desc">
            {nextReferralMilestone
              ? `${referralCount} referrals — ready to claim!`
              : `${referralCount}/${nextLockedReferral?.target || 50} referrals`}
          </p>
          <button
            className={nextReferralMilestone ? "claim-btn" : "locked-btn"}
            disabled={!nextReferralMilestone}
            onClick={nextReferralMilestone ? undefined : undefined}
          >
            {nextReferralMilestone
              ? "Claim Reward"
              : <><Lock size={13} /> {referralCount}/{nextLockedReferral?.target || 50} referrals</>}
          </button>
        </div>

        {/* Mining Achievement */}
        <div className={`reward-card ${!nextMineMilestone ? "dimmed" : ""}`}>
          <div className="reward-icon"><Trophy size={22} /></div>
          <h3>
            {nextMineMilestone?.label || nextLockedMine?.label || "Mine 10K CUBE"}
          </h3>
          <span>
            +{nextMineMilestone?.reward || nextLockedMine?.reward || 500} CUBE
          </span>
          <p className="reward-desc">
            {nextMineMilestone
              ? "Achievement unlocked!"
              : `${totalMined.toFixed(0)}/${nextLockedMine?.amount || 10000} CUBE mined`}
          </p>
          <button
            className={nextMineMilestone ? "claim-btn" : "locked-btn"}
            onClick={nextMineMilestone ? () => claimMineMilestone(nextMineMilestone) : undefined}
            disabled={!nextMineMilestone || claiming?.startsWith("mine_")}
          >
            {claiming?.startsWith("mine_") ? "Claiming…"
              : nextMineMilestone ? "Claim Reward"
              : <><Lock size={13} /> {totalMined.toFixed(0)}/{nextLockedMine?.amount || 10000}</>}
          </button>
        </div>

      </div>

      {/* Reward History */}
      <div className="history-card">
        <div className="history-header">
          <CheckCircle size={20} />
          <h3>Reward History</h3>
        </div>

        {rewardHistory.length === 0 ? (
          <p style={{ color: "rgba(255,255,255,.35)", fontSize: "0.85rem", padding: "12px 0" }}>
            No rewards yet — start mining and claiming!
          </p>
        ) : rewardHistory.map(tx => (
          <div key={tx.id} className="history-item">
            <div>
              <span>{tx.title}</span>
              <div className="history-date">{fmtDate(tx.created_at)}</div>
            </div>
            <strong>+{Math.abs(Number(tx.amount)).toFixed(2)} CUBE</strong>
          </div>
        ))}
      </div>

      {/* Toast */}
      {toast && (
        <div className={`rw-toast ${toast.type === "error" ? "error" : ""}`}>
          {toast.msg}
        </div>
      )}
    </div>
  );
}