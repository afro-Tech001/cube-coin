import React, { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "../../libs/supabase";
import { useNavigate } from "react-router-dom";
import "./MiningPage.css";

// ── Cube logo ─────────────────────────────────────────────────────────────────
function CubeLogoSVG({ hit }) {
  return (
    <svg className={`cube-svg ${hit ? "hit" : ""}`} viewBox="0 0 54 54" fill="none" width="64" height="64">
      <defs>
        <linearGradient id="ltf" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#b9ffc1" /><stop offset="100%" stopColor="#4ade80" />
        </linearGradient>
        <linearGradient id="llf" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#4ade80" /><stop offset="100%" stopColor="#166534" />
        </linearGradient>
        <linearGradient id="lrf" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#22c55e" /><stop offset="100%" stopColor="#0d4a24" />
        </linearGradient>
        <filter id="cubeGlow">
          <feGaussianBlur stdDeviation="1.5" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>
      <g className="cube-logo-top" filter="url(#cubeGlow)">
        <polygon points="27,3 36,8 36,18 27,23 18,18 18,8" fill="url(#ltf)" />
        <polygon points="27,3 36,8 27,13 18,8" fill="#d4ffda" opacity="0.75" />
        <polygon points="27,13 36,8 36,18 27,23" fill="url(#lrf)" />
        <polygon points="27,13 18,8 18,18 27,23" fill="url(#llf)" />
      </g>
      <g className="cube-logo-left" filter="url(#cubeGlow)">
        <polygon points="16,27 25,32 25,42 16,47 7,42 7,32" fill="url(#ltf)" />
        <polygon points="16,27 25,32 16,37 7,32" fill="#d4ffda" opacity="0.75" />
        <polygon points="16,37 25,32 25,42 16,47" fill="url(#lrf)" />
        <polygon points="16,37 7,32 7,42 16,47" fill="url(#llf)" />
      </g>
      <g className="cube-logo-right" filter="url(#cubeGlow)">
        <polygon points="38,27 47,32 47,42 38,47 29,42 29,32" fill="url(#ltf)" />
        <polygon points="38,27 47,32 38,37 29,32" fill="#d4ffda" opacity="0.75" />
        <polygon points="38,37 47,32 47,42 38,47" fill="url(#lrf)" />
        <polygon points="38,37 29,32 29,42 38,47" fill="url(#llf)" />
      </g>
    </svg>
  );
}

// ── Green Pickaxe ─────────────────────────────────────────────────────────────
function PickaxeSVG() {
  return (
    <svg width="100" height="100" viewBox="0 0 100 100" fill="none">
      <defs>
        <linearGradient id="hndGrad" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#052e0f" /><stop offset="45%" stopColor="#14532d" /><stop offset="100%" stopColor="#052e0f" />
        </linearGradient>
        <linearGradient id="headMain" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#bbf7d0" /><stop offset="45%" stopColor="#4ade80" /><stop offset="100%" stopColor="#15803d" />
        </linearGradient>
        <linearGradient id="headDark" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#4ade80" /><stop offset="100%" stopColor="#052e0f" />
        </linearGradient>
        <linearGradient id="tipGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#d1fae5" /><stop offset="100%" stopColor="#22c55e" />
        </linearGradient>
        <filter id="glow"><feGaussianBlur stdDeviation="1.5" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
        <filter id="shadow"><feDropShadow dx="1" dy="2" stdDeviation="2" floodColor="#000" floodOpacity="0.5" /></filter>
      </defs>
      <g transform="rotate(-38, 50, 78)" filter="url(#shadow)">
        <rect x="44" y="32" width="11" height="56" rx="5.5" fill="url(#hndGrad)" />
        <line x1="47" y1="36" x2="47" y2="84" stroke="#166534" strokeWidth="1" strokeOpacity="0.6" />
        <line x1="51" y1="34" x2="51" y2="86" stroke="#4ade80" strokeWidth="0.5" strokeOpacity="0.25" />
        <rect x="43" y="62" width="13" height="3.5" rx="1.75" fill="#022c16" opacity="0.7" />
        <rect x="43" y="69" width="13" height="3.5" rx="1.75" fill="#022c16" opacity="0.7" />
        <rect x="43" y="76" width="13" height="3.5" rx="1.75" fill="#022c16" opacity="0.7" />
        <ellipse cx="49.5" cy="88" rx="5.5" ry="3" fill="#052e0f" />
      </g>
      <g transform="rotate(-38, 50, 78) translate(-3, -8)" filter="url(#shadow)">
        <path d="M22 24 Q34 17 48 21 L48 36 Q34 32 22 38 Z" fill="url(#headMain)" filter="url(#glow)" />
        <path d="M24 25 Q35 19 47 22 L47 27 Q35 23 24 29 Z" fill="white" opacity="0.25" />
        <path d="M22 24 Q13 19 5 14 Q6 21 9 28 Q15 30 22 38 Z" fill="url(#tipGrad)" filter="url(#glow)" />
        <path d="M22 24 Q14 19 7 15 Q8 19 9 22 Q15 23 22 30 Z" fill="white" opacity="0.35" />
        <ellipse cx="5.5" cy="20" rx="2.5" ry="1.2" fill="#d1fae5" opacity="0.9" transform="rotate(-15,5.5,20)" />
        <path d="M48 21 Q61 17 70 19 Q68 24 66 30 Q58 30 48 36 Z" fill="url(#headDark)" />
        <path d="M49 22 Q59 18 68 20 L66 25 Q57 22 49 27 Z" fill="white" opacity="0.2" />
        <rect x="43" y="20" width="11" height="17" rx="2" fill="#15803d" />
        <rect x="43" y="20" width="11" height="5" rx="2" fill="#4ade80" opacity="0.6" />
        <circle cx="48.5" cy="22.5" r="1.8" fill="#bbf7d0" opacity="0.8" />
        <circle cx="48.5" cy="35" r="1.8" fill="#14532d" />
        <path d="M22 24 L48 21" stroke="#d1fae5" strokeWidth="0.6" strokeOpacity="0.5" />
        <path d="M22 38 L48 36" stroke="#052e0f" strokeWidth="0.6" strokeOpacity="0.5" />
      </g>
    </svg>
  );
}

// ── Crack lines ───────────────────────────────────────────────────────────────
function CrackLines({ visible }) {
  if (!visible) return null;
  return (
    <svg className="crack-svg" viewBox="0 0 100 100"
      style={{ position:"absolute", inset:0, width:"100%", height:"100%", pointerEvents:"none" }}>
      <g className="crack-lines" stroke="#4ade80" strokeWidth="1" fill="none" opacity="0.7">
        <path d="M50 50 L35 30" strokeDasharray="2 1" />
        <path d="M50 50 L62 28" strokeDasharray="2 1" />
        <path d="M50 50 L70 55" strokeDasharray="2 1" />
        <path d="M50 50 L40 68" strokeDasharray="2 1" />
        <path d="M35 30 L28 20" /><path d="M62 28 L58 16" />
      </g>
    </svg>
  );
}

// ── Plan tiers ────────────────────────────────────────────────────────────────
const PLAN_TIERS = {
  0.08: { sessionSecs: 2    * 3600, swingEvery: 13, label: "Starter" },
  0.20: { sessionSecs: 1.5  * 3600, swingEvery: 11, label: "Bronze"  },
  0.40: { sessionSecs: 1    * 3600, swingEvery: 10, label: "Silver"  },
  0.72: { sessionSecs: 0.75 * 3600, swingEvery: 8,  label: "Gold"    },
  1.40: { sessionSecs: 0.5  * 3600, swingEvery: 7,  label: "Diamond" },
};
const getTier = (rate) => PLAN_TIERS[rate] || PLAN_TIERS[0.08];

// ── Helpers ───────────────────────────────────────────────────────────────────
const calcEarned = (startedAt, rate, totalPausedSecs = 0, currentlyPausedSince = null) => {
  let elapsedMs = Date.now() - new Date(startedAt).getTime();
  let pausedMs  = (totalPausedSecs || 0) * 1000;
  if (currentlyPausedSince) {
    pausedMs += Date.now() - new Date(currentlyPausedSince).getTime();
  }
  const activeMs = Math.max(0, elapsedMs - pausedMs);
  const hrs = activeMs / 3600000;
  return Math.max(0, hrs * rate);
};

const fmt = (t) => {
  const h = Math.floor(t / 3600);
  const m = Math.floor((t % 3600) / 60);
  const s = t % 60;
  return `${h}:${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}`;
};

// ── Main component ────────────────────────────────────────────────────────────
export default function MiningPage() {
  const navigate = useNavigate();

  const [user,       setUser]       = useState(null);
  const [profile,    setProfile]    = useState(null);
  const [sub,        setSub]        = useState(null);
  const [isMining,   setIsMining]   = useState(false);
  const [isPaused,   setIsPaused]   = useState(false);
  const [session,    setSession]    = useState(null);
  const [claimable,  setClaimable]  = useState(0);
  const [timeLeft,   setTimeLeft]   = useState(0);
  const [showClaim,  setShowClaim]  = useState(false);
  const [showInvite, setShowInvite] = useState(false);
  const [toast,      setToast]      = useState(null);
  const [swinging,   setSwinging]   = useState("idle");
  const [cubeHit,    setCubeHit]    = useState(false);
  const [showCracks, setShowCracks] = useState(false);
  const [chips,      setChips]      = useState([]);
  const [impactFlash,setImpactFlash]= useState(false);
  const [claiming,   setClaiming]   = useState(false);
  const [loading,    setLoading]    = useState(true);

  const frameRef = useRef(null);
  const timerRef = useRef(null);
  const tickRef  = useRef(0);
  const swingRef = useRef(false);

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(null), 3200); };

  const tier = sub ? getTier(sub.mining_rate) : getTier(0.08);

  // ── Initial load ──────────────────────────────────────────────────────────────
  useEffect(() => {
    const init = async () => {
      const { data: { user: u } } = await supabase.auth.getUser();
      if (!u) { navigate("/login"); return; }
      setUser(u);

      const { data: subData } = await supabase
        .from("subscriptions")
        .select("mining_rate, plan_name, subscription_cubes")
        .eq("user_id", u.id)
        .eq("payment_status", "approved")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!subData) { navigate("/subscription"); return; }
      setSub(subData);

      let { data: prof } = await supabase
        .from("profiles")
        .select("full_name, cube_balance, total_mined, streak, cubes_granted, referral_code")
        .eq("id", u.id)
        .maybeSingle();

      // One-time cube grant
      if (prof && !prof.cubes_granted && subData.subscription_cubes) {
        const newBalance = Number(prof.cube_balance || 0) + Number(subData.subscription_cubes);
        const { data: updated } = await supabase
          .from("profiles")
          .update({ cube_balance: newBalance, cubes_granted: true })
          .eq("id", u.id)
          .select()
          .single();
        if (updated) {
          prof = updated;
          showToast(`🎉 ${subData.subscription_cubes.toLocaleString()} CUBE credited to your wallet!`);
        }
      }

      setProfile({ ...prof, referral_code: prof?.referral_code || "" });

      const { data: active, error: sessErr } = await supabase
        .from("mining_sessions")
        .select("*")
        .eq("user_id", u.id)
        .eq("claimed", false)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (sessErr) console.error("Session fetch error:", sessErr);

      const tierInfo = getTier(subData.mining_rate);

      if (active) {
        setSession(active);
        const remaining = Math.floor((new Date(active.ends_at) - Date.now()) / 1000);
        const earned = calcEarned(
          active.started_at,
          active.mining_rate,
          active.total_paused_secs,
          active.is_paused ? active.paused_at : null
        );
        setClaimable(earned);

        if (active.is_paused) {
          setIsPaused(true);
          setIsMining(false);
          setTimeLeft(Math.max(0, remaining));
        } else if (active.is_mining && remaining > 0) {
          setTimeLeft(remaining);
          setIsMining(true);
        } else {
          setTimeLeft(0);
          setIsMining(false);
          if (active.is_mining && remaining <= 0) {
            await supabase.from("mining_sessions").update({ is_mining: false }).eq("id", active.id);
          }
        }
      } else {
        setTimeLeft(tierInfo.sessionSecs);
      }

      setLoading(false);
    };
    init();
  }, []);

  // ── Swing animation ───────────────────────────────────────────────────────────
  const doSwing = useCallback(() => {
    if (swingRef.current) return;
    swingRef.current = true;
    setSwinging("windup");
    setTimeout(() => {
      setSwinging("strike");
      setTimeout(() => {
        setCubeHit(true); setImpactFlash(true); setShowCracks(true);
        setChips(Array.from({ length: 8 }, (_, i) => {
          const angle = 0.2 * Math.PI + Math.random() * 0.9 * Math.PI;
          const dist  = 35 + Math.random() * 55;
          return {
            id: Date.now() + i,
            cx: 50 + Math.round(Math.cos(angle) * 18),
            cy: 60 + Math.round(Math.sin(angle) * 10),
            tx: Math.round(Math.cos(angle) * dist),
            ty: Math.round(Math.sin(angle) * dist),
            r:  2 + Math.random() * 4,
            col: Math.random() > 0.5 ? "#4ade80" : "#d4ffda",
          };
        }));
        setTimeout(() => setChips([]), 600);
        setTimeout(() => {
          setCubeHit(false); setImpactFlash(false); setShowCracks(false);
          setSwinging("return");
          setTimeout(() => { setSwinging("idle"); swingRef.current = false; }, 200);
        }, 130);
      }, 160);
    }, 180);
  }, []);

  // ── Mining loop ───────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isMining || !session || isPaused) return;
    const swingEvery = tier.swingEvery;

    const loop = () => {
      tickRef.current += 1;
      if (tickRef.current % swingEvery === 0) doSwing();
      frameRef.current = requestAnimationFrame(loop);
    };
    frameRef.current = requestAnimationFrame(loop);

    timerRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) {
          clearInterval(timerRef.current);
          cancelAnimationFrame(frameRef.current);
          setIsMining(false);
          setSwinging("idle");
          supabase.from("mining_sessions").update({ is_mining: false }).eq("id", session.id);
          return 0;
        }
        return t - 1;
      });
      setClaimable(calcEarned(session.started_at, session.mining_rate, session.total_paused_secs, null));
    }, 1000);

    return () => {
      cancelAnimationFrame(frameRef.current);
      clearInterval(timerRef.current);
    };
  }, [isMining, session, isPaused, doSwing, tier.swingEvery]);

  // ── Start mining ──────────────────────────────────────────────────────────────
  const startMining = async () => {
    if (!user || !sub) return;
    const start = new Date();
    const end   = new Date(start.getTime() + tier.sessionSecs * 1000);
    const { data, error } = await supabase
      .from("mining_sessions")
      .insert({
        user_id:           user.id,
        mining_rate:       sub.mining_rate,
        plan_name:         sub.plan_name,
        started_at:        start.toISOString(),
        ends_at:           end.toISOString(),
        is_mining:         true,
        is_paused:         false,
        total_paused_secs: 0,
        claimed:           false,
        mined_amount:      0,
      })
      .select()
      .single();
    if (error) { console.error("Start mining error:", error); showToast("Failed to start session"); return; }
    tickRef.current = 0;
    setSession(data);
    setTimeLeft(tier.sessionSecs);
    setClaimable(0);
    setIsMining(true);
    setIsPaused(false);
  };

  // ── Pause mining ──────────────────────────────────────────────────────────────
  const pauseMining = async () => {
    if (!session) return;
    cancelAnimationFrame(frameRef.current);
    clearInterval(timerRef.current);
    setSwinging("idle");
    swingRef.current = false;
    const pausedAt = new Date().toISOString();
    const { data, error } = await supabase
      .from("mining_sessions")
      .update({ is_paused: true, paused_at: pausedAt })
      .eq("id", session.id)
      .select()
      .single();
    if (error) { console.error("Pause error:", error); showToast("Failed to pause"); return; }
    setSession(data);
    setIsMining(false);
    setIsPaused(true);
    showToast("⏸ Mining paused — your progress is saved");
  };

  // ── Resume mining ─────────────────────────────────────────────────────────────
  const resumeMining = async () => {
    if (!session) return;
    const pausedDurationSecs = session.paused_at
      ? (Date.now() - new Date(session.paused_at).getTime()) / 1000 : 0;
    const newTotalPaused = (session.total_paused_secs || 0) + pausedDurationSecs;
    const newEndsAt = new Date(new Date(session.ends_at).getTime() + pausedDurationSecs * 1000);
    const { data, error } = await supabase
      .from("mining_sessions")
      .update({ is_paused: false, paused_at: null, total_paused_secs: newTotalPaused, ends_at: newEndsAt.toISOString(), is_mining: true })
      .eq("id", session.id)
      .select()
      .single();
    if (error) { console.error("Resume error:", error); showToast("Failed to resume"); return; }
    setSession(data);
    setTimeLeft(Math.max(0, Math.floor((new Date(data.ends_at) - Date.now()) / 1000)));
    setIsPaused(false);
    setIsMining(true);
    showToast("▶ Mining resumed");
  };

  // ── Stop mining ───────────────────────────────────────────────────────────────
  const stopMining = async () => {
    cancelAnimationFrame(frameRef.current);
    clearInterval(timerRef.current);
    setIsMining(false);
    setIsPaused(false);
    setSwinging("idle");
    swingRef.current = false;
    if (session) {
      const { error } = await supabase
        .from("mining_sessions")
        .update({ is_mining: false, is_paused: false })
        .eq("id", session.id);
      if (error) console.error("Stop error:", error);
    }
  };

  // ── Claim reward ──────────────────────────────────────────────────────────────
  const confirmClaim = async () => {
    if (!user || !session || claiming) return;
    setClaiming(true);

    try {
      // Step 1: Calculate exactly how much was earned from the session record
      const earned = calcEarned(
        session.started_at,
        session.mining_rate,
        session.total_paused_secs,
        session.is_paused ? session.paused_at : null
      );

      console.log("[Claim] earned:", earned);

      if (earned <= 0) {
        showToast("Nothing to claim yet — mine longer first");
        setClaiming(false);
        return;
      }

      // Step 2: Pull the LIVE balance from Supabase right now (never use stale state)
      const { data: liveProfile, error: fetchErr } = await supabase
        .from("profiles")
        .select("cube_balance, total_mined, streak")
        .eq("id", user.id)
        .single();

      if (fetchErr || !liveProfile) {
        console.error("[Claim] Profile fetch failed:", fetchErr);
        showToast("Could not load your balance — try again");
        setClaiming(false);
        return;
      }

      console.log("[Claim] live balance before:", liveProfile.cube_balance);

      const newBalance = Number(liveProfile.cube_balance) + earned;
      const newTotal   = Number(liveProfile.total_mined)  + earned;
      const newStreak  = Number(liveProfile.streak || 0)  + 1;

      console.log("[Claim] writing new balance:", newBalance);

      // Step 3: Write the new balance to DB
      const { error: updateErr } = await supabase
        .from("profiles")
        .update({
          cube_balance: newBalance,
          total_mined:  newTotal,
          streak:       newStreak,
        })
        .eq("id", user.id);

      if (updateErr) {
        console.error("[Claim] Profile update failed:", updateErr);
        showToast(`Claim failed: ${updateErr.message}`);
        setClaiming(false);
        return;
      }

      // Step 4: Re-fetch to confirm what was actually saved (source of truth)
      const { data: confirmedProfile, error: confirmErr } = await supabase
        .from("profiles")
        .select("cube_balance, total_mined, streak")
        .eq("id", user.id)
        .single();

      if (confirmErr || !confirmedProfile) {
        console.error("[Claim] Confirm re-fetch failed:", confirmErr);
        // Update failed or was blocked — don't show success
        showToast("Balance update may have failed — please refresh");
        setClaiming(false);
        return;
      }

      console.log("[Claim] confirmed balance after:", confirmedProfile.cube_balance);

      // Step 5: Verify the balance actually increased (catches silent RLS blocks)
      const balanceDiff = Number(confirmedProfile.cube_balance) - Number(liveProfile.cube_balance);
      if (balanceDiff <= 0) {
        console.error("[Claim] Balance did not increase! RLS may be blocking the update.");
        showToast("Claim failed — balance not updated. Check your permissions.");
        setClaiming(false);
        return;
      }

      // Step 6: Mark session as claimed
      await supabase
        .from("mining_sessions")
        .update({ claimed: true, is_mining: false, is_paused: false, mined_amount: earned })
        .eq("id", session.id);

      // Step 7: Log the transaction
      await supabase
        .from("wallet_transactions")
        .insert([{ user_id: user.id, title: "Mining Reward", amount: earned, type: "credit" }]);

      // Step 8: Update UI from the confirmed DB values
      setProfile(p => ({
        ...p,
        cube_balance: confirmedProfile.cube_balance,
        total_mined:  confirmedProfile.total_mined,
        streak:       confirmedProfile.streak,
      }));

      setClaimable(0);
      setSession(null);
      setIsMining(false);
      setIsPaused(false);
      setTimeLeft(tier.sessionSecs);
      setSwinging("idle");
      swingRef.current = false;
      setShowClaim(false);
      showToast(`🎉 ${earned.toFixed(4)} CUBE added to your wallet!`);

    } catch (err) {
      console.error("[Claim] Unexpected error:", err);
      showToast("Something went wrong — try again");
    } finally {
      setClaiming(false);
    }
  };

  // ── Copy referral ─────────────────────────────────────────────────────────────
  const copyCode = () => {
    navigator.clipboard?.writeText(profile?.referral_code || "").catch(() => {});
    showToast("Referral code copied!");
  };

  const copyInvite = () => {
    const code = profile?.referral_code || "";
    navigator.clipboard?.writeText(`${window.location.origin}/signup?ref=${code}`).catch(() => {});
    setShowInvite(false);
    showToast("Invite link copied!");
  };

  const pickRot = swinging==="windup" ? -65 : swinging==="strike" ? 15 : swinging==="return" ? -45 : -50;
  const pickTrans = swinging==="windup" ? "transform 0.18s ease-in"
    : swinging==="strike" ? "transform 0.16s cubic-bezier(0.4,0,0.2,1.8)"
    : swinging==="return" ? "transform 0.2s ease-out"
    : "transform 0.3s ease";

  if (loading) {
    return (
      <div className="mining-page">
        <div className="mining-hero" style={{ textAlign: "center", padding: "60px 30px" }}>
          <div style={{ fontSize: "2rem", marginBottom: 10 }}>⛏</div>
          <p style={{ color: "rgba(255,255,255,.5)" }}>Loading your mining dashboard…</p>
        </div>
      </div>
    );
  }

  const hasActiveSession = session && !session.claimed;

  return (
    <div className="mining-page">

      {/* ── Hero ── */}
      <div className="mining-hero">
        <div className="plan-badge">{sub?.plan_name} plan · {sub?.mining_rate} CUBE/hr</div>

        <div className="scene-wrap">
          {impactFlash && <div className="impact-flash" />}
          {isMining && !isPaused && (
            <div className="pickaxe-wrap" style={{ transform:`rotate(${pickRot}deg)`, transition: pickTrans }}>
              <PickaxeSVG />
            </div>
          )}
          <div className="circle-wrap">
            <div className={`ring-outer ${isMining && !isPaused ? "spinning" : ""}`} />
            <div className={`ring-mid   ${isMining && !isPaused ? "spinning" : ""}`} />
            <div className={`circle-inner ${isMining && !isPaused ? "pulse-ring" : ""}`}>
              <CrackLines visible={showCracks} />
              <CubeLogoSVG hit={cubeHit} />
              <div className="earn-num">{claimable.toFixed(4)}</div>
              <div className="earn-sub">CUBE</div>
            </div>
            <svg className="chips-svg" viewBox="-110 -110 220 220">
              {chips.map(c => (
                <circle key={c.id} cx={c.cx} cy={c.cy} r={c.r}
                  fill={c.col} className="chip fly"
                  style={{ "--tx":`${c.tx}px`, "--ty":`${c.ty}px` }} />
              ))}
            </svg>
          </div>
        </div>

        <h2>
          {isPaused ? "Mining paused"
            : isMining ? "Mining active"
            : claimable > 0 ? "Session complete"
            : "Ready to mine"}
        </h2>
        <p className="sub">
          {isPaused ? "Resume to continue earning"
            : isMining ? fmt(timeLeft)
            : claimable > 0 ? "Claim your earned CUBE"
            : `Start a ${tier.sessionSecs / 3600}h mining session`}
        </p>

        <div className="btn-row">
          {!hasActiveSession && (
            <button className="start-btn" onClick={startMining}>⛏ Start mining</button>
          )}
          {isMining && !isPaused && (
            <>
              <button className="claim-btn" onClick={() => setShowClaim(true)}>Claim reward</button>
              <button className="pause-btn" onClick={pauseMining}>⏸ Pause</button>
              <button className="stop-btn"  onClick={stopMining}>Stop</button>
            </>
          )}
          {isPaused && (
            <>
              <button className="claim-btn" onClick={() => setShowClaim(true)}>Claim reward</button>
              <button className="start-btn" onClick={resumeMining}>▶ Resume</button>
              <button className="stop-btn"  onClick={stopMining}>Stop</button>
            </>
          )}
          {!isMining && !isPaused && hasActiveSession && claimable > 0 && (
            <button className="claim-btn" onClick={() => setShowClaim(true)}>
              Claim {claimable.toFixed(4)} CUBE
            </button>
          )}
        </div>
      </div>

      {/* ── Stats ── */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon">💰</div>
          <h3>{Number(profile?.cube_balance || 0).toFixed(4)}</h3>
          <p>Total balance</p>
        </div>
        <div className="stat-card">
          <div className="stat-icon">⛏</div>
          <h3>{Number(profile?.total_mined || 0).toFixed(4)}</h3>
          <p>Total mined</p>
        </div>
        <div className="stat-card">
          <div className="stat-icon">🔥</div>
          <h3>{profile?.streak || 0}</h3>
          <p>Day streak</p>
        </div>
        <div className="stat-card">
          <div className="stat-icon">⚡</div>
          <h3>{sub?.mining_rate}</h3>
          <p>CUBE / hour</p>
        </div>
      </div>

      {/* ── Referral ── */}
      <div className="referral-card">
        <div className="referral-left">
          <p>Your referral code</p>
          <div className="ref-code">
            <h2>{profile?.referral_code || "—"}</h2>
            <button className="copy-btn" onClick={copyCode} disabled={!profile?.referral_code}>Copy</button>
          </div>
        </div>
        <button className="invite-btn" onClick={() => setShowInvite(true)}>Invite friends</button>
      </div>

      {/* ── Claim modal ── */}
      {showClaim && (
        <div className="modal-backdrop" onClick={e => e.target===e.currentTarget && setShowClaim(false)}>
          <div className="modal">
            <div className="modal-icon">🎉</div>
            <h3>Claim your reward</h3>
            <p className="modal-sub">Add your mined CUBE tokens to your wallet balance.</p>
            <div className="modal-amt">{claimable.toFixed(4)}</div>
            <div className="modal-amt-sub">CUBE tokens</div>
            <button className="modal-confirm" onClick={confirmClaim} disabled={claiming || claimable <= 0}>
              {claiming ? "Processing…" : "Claim & add to wallet"}
            </button>
            <button className="modal-cancel" onClick={() => setShowClaim(false)}>
              {isPaused ? "Close" : "Keep mining"}
            </button>
          </div>
        </div>
      )}

      {/* ── Invite modal ── */}
      {showInvite && (
        <div className="modal-backdrop" onClick={e => e.target===e.currentTarget && setShowInvite(false)}>
          <div className="modal">
            <div className="modal-icon">👥</div>
            <h3>Invite friends</h3>
            <p className="modal-sub">
              Share your code and earn <strong style={{color:"#4ade80"}}>+10%</strong> bonus on every friend's session.
            </p>
            <div className="invite-code-box">
              <div className="invite-code-label">Referral code</div>
              <div className="invite-code-val">{profile?.referral_code || "—"}</div>
            </div>
            <button className="modal-confirm" onClick={copyInvite}>Copy & share link</button>
            <button className="modal-cancel" onClick={() => setShowInvite(false)}>Close</button>
          </div>
        </div>
      )}

      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}