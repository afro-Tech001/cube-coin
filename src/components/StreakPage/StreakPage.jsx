import { useEffect, useState } from "react";
import { supabase } from "../../libs/supabase";
import "./StreakPage.css";

const MILESTONES = [
  { days: 7,   reward: "100 CUBE",       bonus: "+10%", bonusPct: 10,  icon: "🌱" },
  { days: 14,  reward: "250 CUBE",       bonus: "+20%", bonusPct: 20,  icon: "🔥" },
  { days: 16,  reward: "250 CUBE",       bonus: "+25%", bonusPct: 25,  icon: "⚡" },
  { days: 30,  reward: "1,000 CUBE",     bonus: "+40%", bonusPct: 40,  icon: "💎" },
  { days: 60,  reward: "VIP Badge",      bonus: "+60%", bonusPct: 60,  icon: "👑" },
  { days: 100, reward: "Legendary Miner",bonus: "+100%",bonusPct: 100, icon: "🏆" },
];

const BONUS_CUBE = { 7: 100, 14: 250, 16: 250, 30: 1000 };

function getActiveBoost(streak) {
  const reached = MILESTONES.filter(m => m.days <= streak);
  return reached.length ? reached[reached.length - 1].bonus : "+0%";
}

function getNextMilestone(streak) {
  return MILESTONES.find(m => m.days > streak) || null;
}

function getBonusEarned(streak) {
  return Object.entries(BONUS_CUBE)
    .filter(([d]) => streak >= Number(d))
    .reduce((acc, [, v]) => acc + v, 0);
}

export default function StreakPage() {
  const [streakData,    setStreakData]    = useState(null);
  const [loading,       setLoading]       = useState(true);
  const [checkingIn,    setCheckingIn]    = useState(false);
  const [toast,         setToast]         = useState(null);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  // ── Load streak ──────────────────────────────────────────────────────────────
  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      let { data, error } = await supabase
        .from("streaks")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      // Auto-create row if trigger hasn't run yet
      if (!data) {
        const { data: created } = await supabase
          .from("streaks")
          .insert({ user_id: user.id })
          .select()
          .single();
        data = created;
      }

      setStreakData(data);
      setLoading(false);
    };
    load();
  }, []);

  // ── Check if already checked in today ───────────────────────────────────────
  const checkedToday = streakData?.last_checkin_at
    ? new Date(streakData.last_checkin_at).toDateString() === new Date().toDateString()
    : false;

  // ── Handle check-in ──────────────────────────────────────────────────────────
  const handleCheckin = async () => {
    if (checkedToday || checkingIn || !streakData) return;
    setCheckingIn(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const today     = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const lastDate  = streakData.last_checkin_at
      ? new Date(streakData.last_checkin_at)
      : null;

    // Check if last check-in was yesterday (continuing streak) or start fresh
    const isConsecutive = lastDate
      ? lastDate.toDateString() === yesterday.toDateString()
      : false;

    const newStreak  = isConsecutive ? streakData.current_streak + 1 : 1;
    const newLongest = Math.max(streakData.longest_streak || 0, newStreak);
    const newTotal   = (streakData.total_checkins || 0) + 1;

    // Check if a milestone was just hit
    const hitMilestone = MILESTONES.find(m => m.days === newStreak);
    const bonusToAdd   = hitMilestone ? (BONUS_CUBE[hitMilestone.days] || 0) : 0;
    const newBonus     = (streakData.bonus_earned || 0) + bonusToAdd;

    const updates = {
      current_streak:  newStreak,
      longest_streak:  newLongest,
      last_checkin_at: today.toISOString().split("T")[0],
      total_checkins:  newTotal,
      bonus_earned:    newBonus,
      updated_at:      new Date().toISOString(),
    };

    const { data: updated, error } = await supabase
      .from("streaks")
      .update(updates)
      .eq("user_id", user.id)
      .select()
      .single();

    if (error) {
      showToast("Check-in failed — try again");
      setCheckingIn(false);
      return;
    }

    // If bonus CUBE was earned, also add to profile balance
    if (bonusToAdd > 0) {
      await supabase.rpc("increment_cube_balance", {
        user_id_input: user.id,
        amount_input:  bonusToAdd,
      }).catch(() => null); // silent fail if RPC doesn't exist yet
      showToast(`🎉 ${hitMilestone.days}-day milestone! +${bonusToAdd} CUBE bonus!`);
    } else {
      showToast(`🔥 Day ${newStreak} checked in! Keep it up!`);
    }

    setStreakData(updated);
    setCheckingIn(false);
  };

  // ── Derived values ───────────────────────────────────────────────────────────
  const streak      = streakData?.current_streak || 0;
  const longest     = streakData?.longest_streak || 0;
  const boost       = getActiveBoost(streak);
  const bonusEarned = streakData?.bonus_earned || getBonusEarned(streak);
  const next        = getNextMilestone(streak);
  const prevMilestone = MILESTONES.filter(m => m.days <= streak);
  const prevDays    = prevMilestone.length ? prevMilestone[prevMilestone.length - 1].days : 0;
  const progPct     = next
    ? Math.round(((streak - prevDays) / (next.days - prevDays)) * 100)
    : 100;

  // Build 30-day calendar grid
  const today = new Date();
  const calDays = Array.from({ length: 30 }, (_, i) => {
    const dayNum    = i + 1;
    const isDone    = dayNum < streak;
    const isToday   = dayNum === streak && checkedToday;
    const isCurrent = dayNum === streak;
    return { dayNum, isDone, isToday, isCurrent };
  });

  if (loading) {
    return (
      <div className="streak-page">
        <div className="streak-loading">
          <div className="streak-spinner" />
          <p>Loading your streak…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="streak-page">

      {/* ── Hero ── */}
      <div className="streak-hero">
        <div className="streak-flame-wrap">🔥</div>
        <h1>{streak} Day Streak</h1>
        <p>Mine daily to unlock bigger rewards.<br />Don't break the chain!</p>
        <div className="streak-badges">
          <div className="streak-badge">🏆 Best: {longest} days</div>
          <div className="streak-badge">⚡ {boost} boost active</div>
        </div>
      </div>

      {/* ── Stats ── */}
      <div className="streak-stats">
        <div className="streak-stat-card">
          <div className="streak-stat-ico">🔥</div>
          <h2>{streak}</h2>
          <p>Current streak</p>
        </div>
        <div className="streak-stat-card">
          <div className="streak-stat-ico">💎</div>
          <h2>{bonusEarned || "—"}</h2>
          <p>Bonus CUBE</p>
        </div>
        <div className="streak-stat-card">
          <div className="streak-stat-ico">⚡</div>
          <h2>{boost}</h2>
          <p>Mining boost</p>
        </div>
      </div>

      {/* ── Calendar ── */}
      <div className="streak-card">
        <div className="streak-card-title">
          📅 Daily check-ins
        </div>
        <div className="streak-days-grid">
          {calDays.map(({ dayNum, isDone, isToday, isCurrent }) => (
            <div
              key={dayNum}
              className={`streak-day ${isDone ? "done" : ""} ${isToday ? "today" : ""} ${isCurrent && !checkedToday ? "current" : ""}`}
            >
              {isDone
                ? <span className="day-check">✓</span>
                : isToday
                ? <span className="day-flame">🔥</span>
                : <span className="day-num">{dayNum}</span>
              }
              <span className="day-label">Day {dayNum}</span>
            </div>
          ))}
        </div>

        <button
          className="streak-checkin-btn"
          onClick={handleCheckin}
          disabled={checkedToday || checkingIn}
        >
          {checkingIn
            ? "Checking in…"
            : checkedToday
            ? "✓ Already checked in today"
            : "🔥 Check in today"}
        </button>
      </div>

      {/* ── Next reward ── */}
      <div className="streak-card">
        <div className="streak-card-title">🎁 Next reward</div>
        {next ? (
          <>
            <div className="streak-next-row">
              <div className="streak-next-ico">🎁</div>
              <div className="streak-next-info">
                <h2>{next.reward}</h2>
                <p>Reach {next.days} day streak</p>
                <span>{next.days - streak} day{next.days - streak !== 1 ? "s" : ""} away</span>
              </div>
            </div>
            <div className="streak-progress-wrap">
              <div className="streak-progress-labels">
                <span>{streak} days</span>
                <span>{next.days} days</span>
              </div>
              <div className="streak-progress-bar">
                <div className="streak-progress-fill" style={{ width: `${progPct}%` }} />
              </div>
            </div>
          </>
        ) : (
          <div className="streak-next-row">
            <div className="streak-next-ico">🏆</div>
            <div className="streak-next-info">
              <h2>Max milestone reached!</h2>
              <p>You are a legendary miner</p>
            </div>
          </div>
        )}
      </div>

      {/* ── Milestones ── */}
      <div className="streak-card">
        <div className="streak-card-title">🏆 Streak milestones</div>
        <div className="streak-milestones">
          {MILESTONES.map((m) => {
            const isDone   = streak >= m.days;
            const isActive = !isDone && next?.days === m.days;
            const status   = isDone ? "done" : isActive ? "active" : "locked";
            return (
              <div key={m.days} className={`streak-ms streak-ms-${status}`}>
                <div className={`streak-ms-ico streak-ms-ico-${status}`}>{m.icon}</div>
                <div className="streak-ms-info">
                  <div className="streak-ms-days">{m.days} day streak</div>
                  <div className="streak-ms-reward">{m.reward} · {m.bonus} boost</div>
                </div>
                <span className={`streak-ms-badge streak-ms-badge-${status}`}>
                  {isDone ? "Completed" : isActive ? "In progress" : "Locked"}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {toast && <div className="streak-toast">{toast}</div>}
    </div>
  );
}