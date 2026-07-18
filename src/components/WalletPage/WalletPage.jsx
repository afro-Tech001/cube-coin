import { useState, useEffect, useCallback } from "react";
import {
  Layers, ArrowUp, Clock, TrendingUp,
  Users, Gift, ArrowRight, X, AlertCircle,
  CheckCircle, Lock, Calendar, ShieldAlert,
} from "lucide-react";
import { supabase } from "../../libs/supabase";
import { useNavigate } from "react-router-dom";
import "./WalletPage.css";

// ── Constants ─────────────────────────────────────────────────────────────────
const CUBE_TO_NGN = 0.05;
const MIN_CASHOUT = 100;

const BANKS = [
  "First Bank Nigeria","GTBank","Access Bank","Zenith Bank",
  "UBA","Fidelity Bank","Opay","Kuda Bank","Palmpay","Other",
];

const DAY_NAMES = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];

// ── Plan rules: keyed by plan price ──────────────────────────────────────────
const PLAN_RULES = {
  5600:  { firstWithdrawalNaira: 2000,  requiredReferrals: 3, weeklyLimitNaira: 2400,  planName: "Basic"   },
  10600: { firstWithdrawalNaira: 5000,  requiredReferrals: 3, weeklyLimitNaira: 4800,  planName: "Starter" },
  16200: { firstWithdrawalNaira: 10000, requiredReferrals: 3, weeklyLimitNaira: 7500,  planName: "Bronze"  },
  22500: { firstWithdrawalNaira: 15000, requiredReferrals: 3, weeklyLimitNaira: 10500, planName: "Silver"  },
  30350: { firstWithdrawalNaira: 20000, requiredReferrals: 3, weeklyLimitNaira: 15000, planName: "Gold"    },
  50000: { firstWithdrawalNaira: 25000, requiredReferrals: 3, weeklyLimitNaira: 27000, planName: "Diamond" },
};

const MINING_TITLES   = ["Mining Reward"];
const REFERRAL_TITLES = ["Referral Bonus"];
const EXCLUDED_FROM_REWARDS = [
  ...MINING_TITLES, ...REFERRAL_TITLES,
  "Cashout Request", "Cashout Refund",
];

// ── Helpers ───────────────────────────────────────────────────────────────────
function cubeToNaira(cubes)  { return (cubes * CUBE_TO_NGN).toFixed(2); }
function nairaFromCube(cubes){ return cubes * CUBE_TO_NGN; }
function cubeFromNaira(ngn)  { return ngn / CUBE_TO_NGN; }

function fmtNaira(amount) {
  return "₦" + parseFloat(amount).toLocaleString("en-NG", {
    minimumFractionDigits: 2, maximumFractionDigits: 2,
  });
}

function genRef() { return "CO" + Date.now().toString().slice(-8); }

function fmtDate(iso) {
  const d = new Date(iso), now = new Date();
  const diff = Math.floor((now - d) / 86400000);
  const time = d.toLocaleTimeString("en-US", { hour:"2-digit", minute:"2-digit" });
  if (diff === 0) return `Today · ${time}`;
  if (diff === 1) return `Yesterday · ${time}`;
  return `${diff} days ago`;
}

function getWeekStart() {
  const d = new Date();
  const day = d.getDay();
  const diff = d.getDate() - day;
  const sun = new Date(d.setDate(diff));
  return sun.toISOString().split("T")[0];
}

function nextSunday() {
  const d = new Date();
  const daysUntilSunday = (7 - d.getDay()) % 7 || 7;
  d.setDate(d.getDate() + daysUntilSunday);
  return d.toLocaleDateString("en-NG", { weekday:"long", day:"numeric", month:"short" });
}

function isWithdrawalOpen(settings) {
  if (!settings || !settings.enabled) return false;
  const now     = new Date();
  const today   = now.getDay();
  const allowed = settings.allowed_days || [0];
  if (!allowed.includes(today)) return false;
  if (settings.open_time && settings.close_time) {
    const [oh, om] = settings.open_time.split(":").map(Number);
    const [ch, cm] = settings.close_time.split(":").map(Number);
    const nowMins  = now.getHours() * 60 + now.getMinutes();
    if (nowMins < oh*60+om || nowMins >= ch*60+cm) return false;
  }
  return true;
}

function nextAllowedDay(settings) {
  if (!settings) return "Sunday";
  const allowed = settings.allowed_days || [0];
  const today   = new Date().getDay();
  for (let i = 1; i <= 7; i++) {
    const d = (today + i) % 7;
    if (allowed.includes(d)) return DAY_NAMES[d];
  }
  return DAY_NAMES[allowed[0]] || "Sunday";
}

// ── Toast hook ────────────────────────────────────────────────────────────────
function useToasts() {
  const [toasts, setToasts] = useState([]);
  const addToast = useCallback((msg, type = "success") => {
    const id = Date.now();
    setToasts(p => [...p, { id, msg, type }]);
    setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 3500);
  }, []);
  return { toasts, addToast };
}

function ToastStack({ toasts }) {
  return (
    <div className="toast-wrap">
      {toasts.map(t => (
        <div key={t.id} className={`toast ${t.type}`}>
          {t.type === "success" ? <CheckCircle size={14}/> : <AlertCircle size={14}/>}
          {t.msg}
        </div>
      ))}
    </div>
  );
}

// ── Rejection notices ─────────────────────────────────────────────────────────
function RejectionNotices({ userId }) {
  const [rejected,  setRejected]  = useState([]);
  const [dismissed, setDismissed] = useState(() => {
    try { return JSON.parse(localStorage.getItem("dismissed_rejections") || "[]"); }
    catch { return []; }
  });

  useEffect(() => {
    if (!userId) return;
    supabase.from("cashout_requests")
      .select("id, amount, naira_value, rejection_reason, refunded_at, refund_amount, created_at")
      .eq("user_id", userId)
      .eq("status", "rejected")
      .not("rejection_reason", "is", null)
      .order("created_at", { ascending: false })
      .limit(5)
      .then(({ data }) => setRejected(data || []));
  }, [userId]);

  const dismiss = (id) => {
    const updated = [...dismissed, id];
    setDismissed(updated);
    localStorage.setItem("dismissed_rejections", JSON.stringify(updated));
  };

  const visible = rejected.filter(r => !dismissed.includes(r.id));
  if (visible.length === 0) return null;

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:10, marginBottom:8 }}>
      {visible.map(r => (
        <div key={r.id} style={{
          background:"rgba(248,113,113,.07)", border:"1px solid rgba(248,113,113,.25)",
          borderRadius:18, padding:"16px 18px", fontFamily:"'DM Sans',sans-serif",
          animation:"fadeIn .3s ease",
        }}>
          <style>{`@keyframes fadeIn{from{opacity:0;transform:translateY(-6px)}to{opacity:1;transform:none}}`}</style>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:12 }}>
            <div style={{ display:"flex", alignItems:"center", gap:10 }}>
              <div style={{
                width:36, height:36, borderRadius:"50%",
                background:"rgba(248,113,113,.12)", border:"1px solid rgba(248,113,113,.3)",
                display:"flex", alignItems:"center", justifyContent:"center", fontSize:"1.1rem",
              }}>❌</div>
              <div>
                <div style={{ fontWeight:800, color:"#fff", fontSize:14, marginBottom:2 }}>Withdrawal Rejected</div>
                <div style={{ fontSize:11, color:"rgba(255,255,255,.4)" }}>
                  {Number(r.amount||0).toLocaleString()} CUBE · {new Date(r.created_at).toLocaleDateString("en-NG",{day:"numeric",month:"short"})}
                </div>
              </div>
            </div>
            <button onClick={() => dismiss(r.id)} style={{
              background:"transparent", border:"none", color:"rgba(255,255,255,.3)",
              cursor:"pointer", fontSize:18, width:28, height:28,
              display:"flex", alignItems:"center", justifyContent:"center", borderRadius:"50%",
            }}>×</button>
          </div>
          <div style={{
            background:"rgba(0,0,0,.2)", border:"1px solid rgba(248,113,113,.15)",
            borderRadius:12, padding:"12px 14px", marginBottom:12,
          }}>
            <div style={{ fontSize:10, color:"rgba(248,113,113,.7)", fontWeight:700, textTransform:"uppercase", letterSpacing:".06em", marginBottom:6 }}>
              Reason from admin
            </div>
            <div style={{ fontSize:13, color:"rgba(255,255,255,.75)", lineHeight:1.6 }}>
              "{r.rejection_reason}"
            </div>
          </div>
          {r.refunded_at && (
            <div style={{
              display:"flex", alignItems:"center", gap:8,
              background:"rgba(74,222,128,.07)", border:"1px solid rgba(74,222,128,.18)",
              borderRadius:10, padding:"9px 12px",
            }}>
              <span style={{ color:"#4ade80", fontSize:14 }}>✓</span>
              <div style={{ fontSize:12, color:"rgba(255,255,255,.6)" }}>
                <strong style={{ color:"#4ade80" }}>{Number(r.refund_amount||0).toLocaleString()} CUBE</strong> refunded to your wallet.
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ── Withdrawal Window Modal ───────────────────────────────────────────────────
function WithdrawalWindowModal({ open, onClose, settings }) {
  if (!open || !settings) return null;
  const allowed   = (settings.allowed_days || [0]).map(d => DAY_NAMES[d]).join(", ");
  const nextDay   = nextAllowedDay(settings);
  const customMsg = settings.locked_msg || "Withdrawals are only available on Sundays.";
  const hasWindow = settings.open_time && settings.close_time;

  return (
    <div className="modal-overlay open" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-sheet">
        <div className="modal-handle" />
        <div style={{ padding:"28px 24px 32px", textAlign:"center" }}>
          <div style={{
            width:72, height:72, borderRadius:"50%",
            background:"rgba(96,165,250,.1)", border:"1.5px solid rgba(96,165,250,.35)",
            display:"flex", alignItems:"center", justifyContent:"center",
            margin:"0 auto 18px", fontSize:"2.2rem",
          }}>📅</div>
          <h3 style={{ color:"#fff", fontSize:"1.2rem", fontWeight:800, marginBottom:10 }}>
            Withdrawals Not Available
          </h3>
          <p style={{ color:"rgba(255,255,255,.55)", fontSize:"0.88rem", lineHeight:1.65, marginBottom:20 }}>
            {customMsg}
          </p>
          <div style={{
            background:"rgba(96,165,250,.06)", border:"1px solid rgba(96,165,250,.2)",
            borderRadius:14, padding:"16px 18px", marginBottom:22, textAlign:"left",
            display:"flex", flexDirection:"column", gap:10,
          }}>
            {[
              ["Available days", allowed],
              ...(hasWindow ? [["Time window", `${settings.open_time?.slice(0,5)} – ${settings.close_time?.slice(0,5)}`]] : []),
              ["Next available", nextDay],
              ["Today",         DAY_NAMES[new Date().getDay()]],
            ].map(([l, v]) => (
              <div key={l} style={{ display:"flex", justifyContent:"space-between", fontSize:13 }}>
                <span style={{ color:"rgba(255,255,255,.4)" }}>{l}</span>
                <span style={{ color: l==="Next available" ? "#4ade80" : "#60a5fa", fontWeight:700 }}>{v}</span>
              </div>
            ))}
          </div>
          <button className="modal-done-btn" onClick={onClose} style={{ width:"100%" }}>Got it</button>
        </div>
      </div>
    </div>
  );
}

// ── Withdrawal Limit Modal ────────────────────────────────────────────────────
function WithdrawalLimitModal({ open, onClose, planRule, withdrawnThisWeek, planName }) {
  if (!open || !planRule) return null;
  const limit     = planRule.weeklyLimitNaira;
  const remaining = Math.max(0, limit - withdrawnThisWeek);
  const pct       = Math.min(100, (withdrawnThisWeek / limit) * 100);

  return (
    <div className="modal-overlay open" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-sheet">
        <div className="modal-handle" />
        <div style={{ padding:"28px 24px 32px", textAlign:"center" }}>

          <div style={{
            width:72, height:72, borderRadius:"50%",
            background:"rgba(251,191,36,.1)", border:"1.5px solid rgba(251,191,36,.35)",
            display:"flex", alignItems:"center", justifyContent:"center",
            margin:"0 auto 18px", fontSize:"2.2rem",
          }}>⚠️</div>

          <h3 style={{ color:"#fff", fontSize:"1.2rem", fontWeight:800, marginBottom:10 }}>
            Weekly Withdrawal Limit Reached
          </h3>

          <p style={{ color:"rgba(255,255,255,.55)", fontSize:"0.88rem", lineHeight:1.65, marginBottom:20 }}>
            Your <strong style={{ color:"#fbbf24" }}>{planName}</strong> plan has a weekly withdrawal
            limit of <strong style={{ color:"#fbbf24" }}>{fmtNaira(limit)}</strong>.
            You have used up your limit for this week. Your limit resets every <strong style={{ color:"#4ade80" }}>Sunday</strong>.
          </p>

          <div style={{
            background:"rgba(251,191,36,.06)", border:"1px solid rgba(251,191,36,.2)",
            borderRadius:14, padding:"18px", marginBottom:22, textAlign:"left",
            display:"flex", flexDirection:"column", gap:12,
          }}>
            <div style={{ display:"flex", justifyContent:"space-between", fontSize:13 }}>
              <span style={{ color:"rgba(255,255,255,.4)" }}>Your plan</span>
              <span style={{ color:"#fff", fontWeight:700 }}>{planName}</span>
            </div>
            <div style={{ display:"flex", justifyContent:"space-between", fontSize:13 }}>
              <span style={{ color:"rgba(255,255,255,.4)" }}>Weekly limit</span>
              <span style={{ color:"#fbbf24", fontWeight:700 }}>{fmtNaira(limit)}</span>
            </div>
            <div style={{ display:"flex", justifyContent:"space-between", fontSize:13 }}>
              <span style={{ color:"rgba(255,255,255,.4)" }}>Used this week</span>
              <span style={{ color:"#f87171", fontWeight:700 }}>{fmtNaira(withdrawnThisWeek)}</span>
            </div>
            <div style={{ display:"flex", justifyContent:"space-between", fontSize:13 }}>
              <span style={{ color:"rgba(255,255,255,.4)" }}>Remaining</span>
              <span style={{ color: remaining > 0 ? "#4ade80" : "#f87171", fontWeight:700 }}>
                {fmtNaira(remaining)}
              </span>
            </div>

            {/* Progress bar */}
            <div>
              <div style={{ height:7, background:"rgba(255,255,255,.07)", borderRadius:4, overflow:"hidden" }}>
                <div style={{
                  height:"100%", width:`${pct}%`,
                  background: pct >= 100 ? "#f87171" : pct >= 75 ? "#fbbf24" : "#4ade80",
                  borderRadius:4, transition:"width .4s ease",
                }} />
              </div>
              <div style={{ display:"flex", justifyContent:"space-between", fontSize:10, color:"rgba(255,255,255,.3)", marginTop:4 }}>
                <span>₦0</span>
                <span>{fmtNaira(limit)}</span>
              </div>
            </div>

            <div style={{ display:"flex", justifyContent:"space-between", fontSize:13 }}>
              <span style={{ color:"rgba(255,255,255,.4)" }}>Resets on</span>
              <span style={{ color:"#4ade80", fontWeight:700 }}>{nextSunday()}</span>
            </div>
          </div>

          <div style={{
            background:"rgba(74,222,128,.05)", border:"1px solid rgba(74,222,128,.15)",
            borderRadius:12, padding:"12px 14px", marginBottom:20, fontSize:12,
            color:"rgba(255,255,255,.5)", lineHeight:1.6, textAlign:"left",
          }}>
            💡 Want a higher weekly limit? <strong style={{ color:"#4ade80" }}>Upgrade your plan</strong> to unlock
            larger withdrawal amounts per week.
          </div>

          <button className="modal-done-btn" onClick={onClose} style={{ width:"100%", marginBottom:10 }}>
            Got it
          </button>
          <button
            onClick={() => { onClose(); window.location.href = "/dashboard/upgrade"; }}
            style={{
              width:"100%", padding:"12px", borderRadius:14,
              border:"1px solid rgba(74,222,128,.25)", background:"rgba(74,222,128,.07)",
              color:"#4ade80", fontWeight:700, fontSize:"0.9rem", cursor:"pointer",
              fontFamily:"'DM Sans',sans-serif",
            }}
          >
            ↑ Upgrade Plan
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Referral Gate Modal ───────────────────────────────────────────────────────
function ReferralGateModal({ open, onClose, planRule, activeReferrals }) {
  if (!open || !planRule) return null;
  const needed    = planRule.requiredReferrals;
  const have      = activeReferrals;
  const remaining = Math.max(0, needed - have);

  return (
    <div className="modal-overlay open" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-sheet">
        <div className="modal-handle" />
        <div style={{ padding:"24px 24px 32px", textAlign:"center" }}>
          <div style={{
            width:72, height:72, borderRadius:"50%",
            background:"rgba(251,191,36,.1)", border:"1.5px solid rgba(251,191,36,.35)",
            display:"flex", alignItems:"center", justifyContent:"center",
            margin:"0 auto 18px", fontSize:"2rem",
          }}>🔒</div>
          <h3 style={{ color:"#fff", fontSize:"1.2rem", fontWeight:800, marginBottom:10 }}>
            Referral Requirement
          </h3>
          <p style={{ color:"rgba(255,255,255,.55)", fontSize:"0.88rem", lineHeight:1.65, marginBottom:22 }}>
            You've crossed your first withdrawal threshold. Further withdrawals require{" "}
            <strong style={{ color:"#4ade80" }}>{needed} subscribed referrals</strong>.
            <br /><br />
            <span style={{ color:"rgba(248,113,113,.8)", fontSize:"0.82rem" }}>
              ⚠ Sign-ups without a subscription do NOT count.
            </span>
          </p>
          <div style={{
            background:"rgba(74,222,128,.06)", border:"1px solid rgba(74,222,128,.18)",
            borderRadius:16, padding:"18px 20px", marginBottom:22, textAlign:"left",
          }}>
            <div style={{ display:"flex", justifyContent:"space-between", marginBottom:10 }}>
              <span style={{ fontSize:12, color:"rgba(255,255,255,.45)", fontWeight:600, textTransform:"uppercase", letterSpacing:".06em" }}>
                Active referrals
              </span>
              <span style={{ fontWeight:800, color: have >= needed ? "#4ade80" : "#fbbf24" }}>
                {have} / {needed}
              </span>
            </div>
            <div style={{ height:6, background:"rgba(255,255,255,.08)", borderRadius:3, overflow:"hidden", marginBottom:12 }}>
              <div style={{
                height:"100%", width:`${Math.min(100,(have/needed)*100)}%`,
                background: have >= needed ? "#4ade80" : "#fbbf24",
                borderRadius:3, transition:"width .4s ease",
              }} />
            </div>
            {have >= needed ? (
              <div style={{ display:"flex", alignItems:"center", gap:8, color:"#4ade80", fontSize:13, fontWeight:700 }}>
                <CheckCircle size={15} /> Requirement met!
              </div>
            ) : (
              <div style={{ color:"rgba(255,255,255,.45)", fontSize:12, lineHeight:1.55 }}>
                You need <strong style={{ color:"#fbbf24" }}>{remaining} more</strong> subscribed referral{remaining !== 1 ? "s" : ""}.
              </div>
            )}
          </div>
          <button className="modal-done-btn" onClick={onClose} style={{ width:"100%" }}>
            Got it — I'll invite friends
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Currency Converter ────────────────────────────────────────────────────────
function CurrencyConverter() {
  const [cubeVal, setCubeVal] = useState("");
  const nairaVal = cubeVal ? fmtNaira(cubeToNaira(parseFloat(cubeVal) || 0)) : "";
  return (
    <div className="converter-card">
      <div className="converter-header">
        <span className="converter-title">Currency Converter</span>
        <span className="converter-rate-tag">1 CUBE = ₦0.05</span>
      </div>
      <div className="converter-body">
        <div className="converter-field">
          <label>CUBE Amount</label>
          <input className="converter-input" type="number" min="0" placeholder="0"
            value={cubeVal} onChange={e => setCubeVal(e.target.value)} />
          <span className="conv-unit">cube</span>
        </div>
        <div className="converter-arrow"><ArrowRight size={14} /></div>
        <div className="converter-field">
          <label>Naira Value</label>
          <input className="converter-input naira-out" type="text" placeholder="₦0.00" value={nairaVal} readOnly />
          <span className="conv-unit">ngn</span>
        </div>
      </div>
    </div>
  );
}

// ── Cashout Modal ─────────────────────────────────────────────────────────────
function CashoutModal({ balance, userId, open, onClose, onSuccess, maxNaira, withdrawnThisWeek, weeklyLimit }) {
  const [amount, setAmount] = useState("");
  const [bank,   setBank]   = useState("");
  const [acct,   setAcct]   = useState("");
  const [name,   setName]   = useState("");
  const [errors, setErrors] = useState({});
  const [loading,setLoading]= useState(false);
  const [done,   setDone]   = useState(false);
  const [ref,    setRef]    = useState("");

  useEffect(() => {
    if (open) { setAmount(""); setBank(""); setAcct(""); setName(""); setErrors({}); setLoading(false); setDone(false); setRef(""); }
  }, [open]);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  const parsedCube  = parseFloat(amount) || 0;
  const nairaValue  = parsedCube > 0 ? Number(cubeToNaira(parsedCube)) : 0;
  const nairaFmt    = nairaValue > 0 ? fmtNaira(nairaValue) : "₦0.00";

  // Max cube the user can withdraw this week (based on naira limit)
  const maxCubeThisWeek = maxNaira > 0 ? cubeFromNaira(maxNaira) : 0;
  const remainingNaira  = Math.max(0, weeklyLimit - withdrawnThisWeek);

  const validate = () => {
    const errs = {};
    if (parsedCube < MIN_CASHOUT)       errs.amount = `Minimum cashout is ${MIN_CASHOUT} CUBE`;
    if (parsedCube > balance)           errs.amount = "Insufficient balance";
    if (maxNaira > 0 && nairaValue > maxNaira)
      errs.amount = `You can only withdraw ${fmtNaira(maxNaira)} more this week (plan limit)`;
    if (!bank)                          errs.bank   = "Select a bank";
    if (acct.length !== 10)             errs.acct   = "Enter a valid 10-digit account number";
    if (!name.trim())                   errs.name   = "Account name is required";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setLoading(true);
    const txRef    = genRef();
    const nairaVal = nairaValue;

    const { error: cashoutErr } = await supabase.from("cashout_requests").insert([{
      user_id: userId, amount: parsedCube, naira_value: nairaVal,
      bank_name: bank, account_number: acct, account_name: name,
      tx_ref: txRef, status: "pending",
    }]);
    if (cashoutErr) { setLoading(false); onSuccess(null, null, null, cashoutErr.message); return; }

    await supabase.from("profiles").update({ cube_balance: balance - parsedCube }).eq("id", userId);
    await supabase.from("wallet_transactions").insert([{
      user_id: userId, title: "Cashout Request", amount: -parsedCube, type: "pending",
    }]);

    // Update weekly withdrawal tracker
    const weekStart = getWeekStart();
    await supabase.from("withdrawal_limits").upsert([{
      user_id: userId,
      week_start: weekStart,
      withdrawn_this_week: withdrawnThisWeek + nairaVal,
      last_reset_at: new Date().toISOString(),
    }], { onConflict: "user_id" });

    setRef(txRef); setDone(true); setLoading(false);
    onSuccess(parsedCube, txRef, name, null, nairaVal);
  };

  return (
    <div className={`modal-overlay ${open ? "open" : ""}`} onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-sheet">
        <div className="modal-handle" />
        {done ? (
          <div className="modal-success">
            <div className="modal-success-icon"><CheckCircle size={28} /></div>
            <h3>Request Submitted!</h3>
            <p>
              Your cashout of <strong style={{ color:"#e8ffe6" }}>{parsedCube} CUBE</strong> →{" "}
              <strong style={{ color:"#4ade80" }}>{fmtNaira(nairaValue)}</strong> is being processed.
            </p>
            <div className="modal-success-ref">
              <div className="msr-label">Reference</div>
              <div className="msr-val">{ref}</div>
            </div>
            <button className="modal-done-btn" onClick={onClose}>Done</button>
          </div>
        ) : (
          <>
            <div className="modal-header">
              <span className="modal-title">Cash Out CUBE</span>
              <button className="modal-close" onClick={onClose}><X size={15} /></button>
            </div>
            <div className="modal-body">

              {/* Weekly limit info bar */}
              {weeklyLimit > 0 && (
                <div className="cashout-limit-bar">
                  <div className="clb-header">
                    <ShieldAlert size={13} />
                    <span>Weekly limit: <strong>{fmtNaira(weeklyLimit)}</strong></span>
                    <span className="clb-remaining">
                      {fmtNaira(remainingNaira)} remaining
                    </span>
                  </div>
                  <div className="clb-track">
                    <div className="clb-fill" style={{
                      width: `${Math.min(100, (withdrawnThisWeek / weeklyLimit) * 100)}%`,
                      background: remainingNaira <= 0 ? "#f87171" : remainingNaira < weeklyLimit * 0.25 ? "#fbbf24" : "#4ade80",
                    }} />
                  </div>
                  <div className="clb-labels">
                    <span>Used: {fmtNaira(withdrawnThisWeek)}</span>
                    <span>Limit: {fmtNaira(weeklyLimit)}</span>
                  </div>
                </div>
              )}

              <div className="cashout-cube-row">
                <div className="converter-field">
                  <label>CUBE to cash out</label>
                  <input
                    className={`converter-input ${errors.amount ? "error" : ""}`}
                    type="number" min={MIN_CASHOUT}
                    max={Math.min(balance, maxCubeThisWeek || balance)}
                    placeholder={`Min ${MIN_CASHOUT} CUBE`}
                    value={amount}
                    onChange={e => { setAmount(e.target.value); setErrors(p => ({ ...p, amount:null })); }}
                  />
                  <span className="conv-unit">cube</span>
                </div>
                <button className="cashout-max-btn" onClick={() => {
                  const maxCube = Math.min(Math.floor(balance), maxCubeThisWeek > 0 ? Math.floor(maxCubeThisWeek) : Math.floor(balance));
                  setAmount(String(maxCube));
                  setErrors(p => ({ ...p, amount:null }));
                }}>Max</button>
              </div>
              {errors.amount && (
                <p style={{ fontSize:11, color:"#f87171", marginTop:-10, marginBottom:10 }}>{errors.amount}</p>
              )}

              <div className="cashout-summary">
                {[
                  ["You cash out",      parsedCube > 0 ? `${parsedCube.toLocaleString()} CUBE` : "—", ""],
                  ["You receive",       nairaFmt,                                                      "green"],
                  ["Exchange rate",     "100 CUBE = ₦5.00",                                           ""],
                  ["Available balance", `${balance.toLocaleString()} CUBE`,                           "amber"],
                  ["This week limit",   weeklyLimit > 0 ? `${fmtNaira(remainingNaira)} left` : "—",  remainingNaira <= 0 ? "red" : ""],
                ].map(([l, v, c]) => (
                  <div className="cs-row" key={l}>
                    <span className="cs-label">{l}</span>
                    <span className={`cs-val ${c}`}>{v}</span>
                  </div>
                ))}
              </div>

              <div className="modal-field">
                <label>Bank Name</label>
                <select className="modal-select" value={bank}
                  style={errors.bank ? { borderColor:"rgba(248,113,113,0.5)" } : {}}
                  onChange={e => { setBank(e.target.value); setErrors(p => ({ ...p, bank:null })); }}>
                  <option value="">Select bank…</option>
                  {BANKS.map(b => <option key={b}>{b}</option>)}
                </select>
                {errors.bank && <p style={{ fontSize:11, color:"#f87171", marginTop:4 }}>{errors.bank}</p>}
              </div>

              <div className="modal-field">
                <label>Account Number</label>
                <input className={`modal-input ${errors.acct ? "error" : ""}`}
                  type="text" inputMode="numeric" maxLength={10}
                  placeholder="10-digit account number" value={acct}
                  onChange={e => { const v=e.target.value.replace(/[^0-9]/g,""); setAcct(v); setErrors(p=>({...p,acct:null})); }} />
                {errors.acct && <p style={{ fontSize:11, color:"#f87171", marginTop:4 }}>{errors.acct}</p>}
              </div>

              <div className="modal-field">
                <label>Account Name</label>
                <input className={`modal-input ${errors.name ? "error" : ""}`}
                  type="text" placeholder="Name on your bank account" value={name}
                  onChange={e => { setName(e.target.value); setErrors(p=>({...p,name:null})); }} />
                {errors.name && <p style={{ fontSize:11, color:"#f87171", marginTop:4 }}>{errors.name}</p>}
              </div>

              <div className="modal-notice">
                <AlertCircle size={15} />
                <p>Cashout requests are processed within 1–24 hours on withdrawal days.</p>
              </div>

              <button className="modal-submit" onClick={handleSubmit} disabled={loading}>
                {loading ? <><span className="btn-spinner" />Processing…</> : "Submit Cashout Request"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ── Main WalletPage ───────────────────────────────────────────────────────────
export default function WalletPage() {
  const { toasts, addToast } = useToasts();
  const navigate = useNavigate();

  const [modalOpen,          setModalOpen]          = useState(false);
  const [gateOpen,           setGateOpen]           = useState(false);
  const [windowModalOpen,    setWindowModalOpen]    = useState(false);
  const [limitModalOpen,     setLimitModalOpen]     = useState(false);
  const [user,               setUser]               = useState(null);
  const [profile,            setProfile]            = useState(null);
  const [transactions,       setTransactions]       = useState([]);
  const [stats,              setStats]              = useState({ mining:0, referral:0, rewards:0, cashedOut:0, pending:0 });
  const [loading,            setLoading]            = useState(true);
  const [planPrice,          setPlanPrice]          = useState(null);
  const [planRule,           setPlanRule]           = useState(null);
  const [activeReferrals,    setActiveReferrals]    = useState(0);
  const [totalCashedOutNgn,  setTotalCashedOutNgn]  = useState(0);
  const [withdrawalSettings, setWithdrawalSettings] = useState(null);
  const [withdrawnThisWeek,  setWithdrawnThisWeek]  = useState(0);

  const balance = Number(profile?.cube_balance || 0);

  const loadWallet = useCallback(async (uid) => {
    // 1. Profile
    const { data: prof } = await supabase
      .from("profiles")
      .select("cube_balance, total_mined, referral_code, first_withdrawal_done, first_withdrawal_amount")
      .eq("id", uid).maybeSingle();
    setProfile(prof);

    // 2. Withdrawal settings
    const { data: wSettings } = await supabase
      .from("withdrawal_settings")
      .select("*")
      .eq("id", "00000000-0000-0000-0000-000000000001")
      .maybeSingle();
    setWithdrawalSettings(wSettings);

    // 3. Active subscription
    const { data: sub } = await supabase
      .from("subscriptions")
      .select("amount, plan_name, mining_rate")
      .eq("user_id", uid).eq("payment_status", "approved")
      .order("created_at", { ascending: false }).limit(1).maybeSingle();

    if (sub) {
      const price = Number(sub.amount);
      setPlanPrice(price);
      setPlanRule(PLAN_RULES[price] || null);
    }

    // 4. Weekly withdrawal tracker
    const weekStart = getWeekStart();
    const { data: wLimit } = await supabase
      .from("withdrawal_limits")
      .select("week_start, withdrawn_this_week")
      .eq("user_id", uid)
      .maybeSingle();

    if (wLimit && wLimit.week_start === weekStart) {
      setWithdrawnThisWeek(Number(wLimit.withdrawn_this_week || 0));
    } else {
      // New week — reset
      setWithdrawnThisWeek(0);
      if (wLimit) {
        // Update to reset for new week
        await supabase.from("withdrawal_limits").update({
          week_start: weekStart,
          withdrawn_this_week: 0,
          last_reset_at: new Date().toISOString(),
        }).eq("user_id", uid);
      }
    }

    // 5. Active referrals
    let activeRefCount = 0;
    if (prof?.referral_code) {
      const { data: referredProfiles } = await supabase
        .from("profiles").select("id").eq("referred_by_code", prof.referral_code);
      if (referredProfiles?.length > 0) {
        const ids = referredProfiles.map(p => p.id);
        const { count } = await supabase.from("subscriptions")
          .select("*", { count:"exact", head:true })
          .in("user_id", ids).eq("payment_status", "approved");
        activeRefCount = count || 0;
      }
    }
    setActiveReferrals(activeRefCount);

    // 6. Transactions
    const { data: allTxs } = await supabase
      .from("wallet_transactions").select("*").eq("user_id", uid)
      .order("created_at", { ascending: false });
    const txs = allTxs || [];
    setTransactions(txs.slice(0, 10));

    const mining    = txs.filter(t => MINING_TITLES.includes(t.title)).reduce((a,t)=>a+Number(t.amount),0);
    const referral  = txs.filter(t => REFERRAL_TITLES.includes(t.title)).reduce((a,t)=>a+Number(t.amount),0);
    const rewards   = txs.filter(t => t.type==="credit" && !EXCLUDED_FROM_REWARDS.includes(t.title)).reduce((a,t)=>a+Number(t.amount),0);
    const cashedOut = txs.filter(t => t.title==="Cashout Request" && t.type!=="pending").reduce((a,t)=>a+Math.abs(Number(t.amount)),0);

    const { data: pendingCo } = await supabase.from("cashout_requests")
      .select("amount").eq("user_id", uid).eq("status", "pending");
    const pending = (pendingCo||[]).reduce((a,c)=>a+Number(c.amount),0);

    const { data: approvedCashouts } = await supabase.from("cashout_requests")
      .select("naira_value").eq("user_id", uid).eq("status", "approved");
    const totalNaira = (approvedCashouts||[]).reduce((a,c)=>a+Number(c.naira_value),0);
    setTotalCashedOutNgn(totalNaira);

    setStats({ mining, referral, rewards, cashedOut, pending });
  }, []);

  useEffect(() => {
    const init = async () => {
      const { data: { user: u } } = await supabase.auth.getUser();
      if (!u) { navigate("/login"); return; }
      setUser(u);
      await loadWallet(u.id);
      setLoading(false);
    };
    init();
  }, [loadWallet]);

  const handleCashoutClick = () => {
    // 1. Withdrawal window check
    if (!isWithdrawalOpen(withdrawalSettings)) { setWindowModalOpen(true); return; }

    // 2. Referral gate check
    if (planRule) {
      const crossedThreshold = totalCashedOutNgn >= planRule.firstWithdrawalNaira ||
        (profile?.first_withdrawal_done);
      if (crossedThreshold && activeReferrals < planRule.requiredReferrals) {
        setGateOpen(true); return;
      }
    }

    // 3. Weekly limit check
    if (planRule) {
      const remaining = planRule.weeklyLimitNaira - withdrawnThisWeek;
      if (remaining <= 0) { setLimitModalOpen(true); return; }
    }

    setModalOpen(true);
  };

  const handleCashoutSuccess = async (amount, ref, name, errMsg, nairaSpent) => {
    if (errMsg) { addToast(`Cashout failed: ${errMsg}`, "error"); return; }
    addToast("Cashout submitted successfully!", "success");
    setModalOpen(false);

    if (planRule && user && nairaSpent) {
      // Update first withdrawal flag
      if (!profile?.first_withdrawal_done) {
        const newTotalNaira = totalCashedOutNgn + nairaSpent;
        if (newTotalNaira >= planRule.firstWithdrawalNaira) {
          await supabase.from("profiles").update({
            first_withdrawal_done: true,
            first_withdrawal_amount: amount,
          }).eq("id", user.id);
        }
      }
      setWithdrawnThisWeek(prev => prev + nairaSpent);
    }

    if (user) await loadWallet(user.id);
  };

  const TxIcon = ({ type }) => {
    if (type === "credit") return (
      <div className={`tx-icon ${type}`}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
          <path d="M12 19V5"/><path d="M19 12l-7 7-7-7"/>
        </svg>
      </div>
    );
    if (type === "debit") return (
      <div className={`tx-icon ${type}`}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
          <path d="M12 5v14"/><path d="M5 12l7-7 7 7"/>
        </svg>
      </div>
    );
    return <div className={`tx-icon ${type}`}><Clock size={15} /></div>;
  };

  if (loading) return (
    <div className="wallet-page">
      <div className="wallet-inner">
        <div className="wallet-hero" style={{ textAlign:"center", padding:"60px 28px" }}>
          <div style={{ fontSize:"2rem", marginBottom:10 }}>💰</div>
          <p style={{ color:"rgba(255,255,255,.5)" }}>Loading your wallet…</p>
        </div>
      </div>
    </div>
  );

  const crossedThreshold   = planRule && (profile?.first_withdrawal_done || totalCashedOutNgn >= (planRule?.firstWithdrawalNaira || 0));
  const isGated            = crossedThreshold && activeReferrals < (planRule?.requiredReferrals || 0);
  const windowOpen         = isWithdrawalOpen(withdrawalSettings);
  const weeklyLimit        = planRule?.weeklyLimitNaira || 0;
  const remainingThisWeek  = Math.max(0, weeklyLimit - withdrawnThisWeek);
  const limitReached       = weeklyLimit > 0 && remainingThisWeek <= 0;
  const maxNairaThisWeek   = remainingThisWeek;
  const isLocked           = !windowOpen || isGated || limitReached;
  const allowedDays        = (withdrawalSettings?.allowed_days || [0]).map(d => DAY_NAMES[d]).join(", ");
  const limitPct           = weeklyLimit > 0 ? Math.min(100, (withdrawnThisWeek / weeklyLimit) * 100) : 0;

  return (
    <div className="wallet-page">
      <div className="wallet-inner">

        {/* Rejection notices */}
        <RejectionNotices userId={user?.id} />

        {/* Title */}
        <div className="wallet-title-row">
          <div className="wallet-title-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
              <rect x="2" y="5" width="20" height="14" rx="3"/>
              <path d="M2 10h20"/><circle cx="17" cy="15" r="1" fill="currentColor"/>
            </svg>
          </div>
          <div>
            <div className="wallet-title-text">My Wallet</div>
            <div className="wallet-title-sub">Manage your CUBE balance &amp; cashouts</div>
          </div>
        </div>

        {/* Hero */}
        <div className="wallet-hero">
          <div className="wallet-hero-eyebrow">
            <span className="hero-eyebrow-dot" /> Available Balance
          </div>
          <div className="wallet-balance-cube">
            <span>{balance.toLocaleString(undefined, { maximumFractionDigits:2 })}</span> CUBE
          </div>
          <div className="wallet-balance-naira">
            ≈ <strong>{fmtNaira(cubeToNaira(balance))}</strong> NGN
          </div>
          <div className="rate-pill">
            <span className="rate-pip" />100 CUBE = ₦5.00 NGN
          </div>

          {/* Status banners */}
          {!windowOpen && withdrawalSettings && (
            <div className="wallet-gate-hint info">
              <Calendar size={13} />
              <span>
                Withdrawals only on <strong>{allowedDays}</strong>.
                Next: <strong style={{ color:"#4ade80" }}>{nextAllowedDay(withdrawalSettings)}</strong>.
              </span>
            </div>
          )}
          {isGated && windowOpen && (
            <div className="wallet-gate-hint">
              <Lock size={13} />
              <span>
                Requires <strong>{planRule.requiredReferrals} subscribed referrals</strong>.
                You have <strong style={{ color: activeReferrals > 0 ? "#4ade80" : "#f87171" }}>{activeReferrals}</strong>.
              </span>
            </div>
          )}
          {limitReached && windowOpen && !isGated && (
            <div className="wallet-gate-hint limit">
              <ShieldAlert size={13} />
              <span>
                Weekly limit of <strong>{fmtNaira(weeklyLimit)}</strong> reached.
                Resets next <strong style={{ color:"#4ade80" }}>Sunday</strong>.
              </span>
            </div>
          )}
          {!limitReached && windowOpen && planRule && (
            <div className="wallet-gate-hint info">
              <ShieldAlert size={13} />
              <span>
                <strong>{fmtNaira(remainingThisWeek)}</strong> withdrawal limit remaining this week.
              </span>
            </div>
          )}

          <div className="wallet-hero-actions">
            <button
              className={`hero-btn cashout-btn ${isLocked ? "gated" : ""}`}
              onClick={handleCashoutClick}
            >
              {isLocked ? <Lock size={16} /> : <ArrowUp size={16} />}
              {!windowOpen ? "Closed" : limitReached ? "Limit Reached" : isGated ? "Locked" : "Cash Out"}
            </button>
            <button className="hero-btn history-btn">
              <Clock size={16} /> History
            </button>
          </div>
        </div>

        {/* Weekly limit card */}
        {planRule && (
          <div className="wallet-limit-card">
            <div className="wlc-header">
              <ShieldAlert size={14} />
              <span>Weekly Withdrawal Limit</span>
              <span className={`wlc-badge ${limitReached ? "reached" : remainingThisWeek < weeklyLimit * 0.25 ? "low" : "ok"}`}>
                {limitReached ? "Limit reached" : `${fmtNaira(remainingThisWeek)} left`}
              </span>
            </div>
            <div className="wlc-body">
              <div className="wlc-row">
                <span>Plan limit</span>
                <span style={{ color:"#fbbf24", fontWeight:700 }}>{fmtNaira(weeklyLimit)}</span>
              </div>
              <div className="wlc-row">
                <span>Used this week</span>
                <span style={{ color: limitPct >= 100 ? "#f87171" : "rgba(255,255,255,.6)", fontWeight:600 }}>
                  {fmtNaira(withdrawnThisWeek)}
                </span>
              </div>
              <div className="wlc-bar-wrap">
                <div className="wlc-bar" style={{
                  width:`${limitPct}%`,
                  background: limitPct >= 100 ? "#f87171" : limitPct >= 75 ? "#fbbf24" : "#4ade80",
                }} />
              </div>
              <div className="wlc-row" style={{ marginTop:2 }}>
                <span>Resets every Sunday</span>
                <span style={{ color:"rgba(255,255,255,.3)", fontSize:11 }}>{nextSunday()}</span>
              </div>
            </div>
          </div>
        )}

        {/* Withdrawal window status */}
        {withdrawalSettings && (
          <div className="wallet-referral-status">
            <div className="wrs-header">
              <Calendar size={14} />
              <span>Withdrawal Window</span>
              {windowOpen
                ? <span className="wrs-badge ok">✓ Open now</span>
                : <span className="wrs-badge warn">⏰ Closed</span>
              }
            </div>
            <div className="wrs-body">
              <div className="wrs-row">
                <span>Available days</span>
                <span style={{ color:"#60a5fa", fontWeight:600 }}>{allowedDays}</span>
              </div>
              <div className="wrs-row">
                <span>Today</span>
                <span style={{ color: windowOpen ? "#4ade80" : "#f87171", fontWeight:600 }}>
                  {DAY_NAMES[new Date().getDay()]} {windowOpen ? "✓" : "✗"}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Referral status */}
        {planRule && (
          <div className="wallet-referral-status">
            <div className="wrs-header">
              <Users size={14} />
              <span>Referral Status</span>
              {activeReferrals >= planRule.requiredReferrals
                ? <span className="wrs-badge ok">✓ Met</span>
                : crossedThreshold
                  ? <span className="wrs-badge warn">⚠ Required</span>
                  : <span className="wrs-badge info">ℹ After 1st cashout</span>
              }
            </div>
            <div className="wrs-body">
              <div className="wrs-row">
                <span>Subscribed referrals</span>
                <span style={{ color:"#4ade80", fontWeight:700 }}>{activeReferrals} / {planRule.requiredReferrals}</span>
              </div>
              <div className="wrs-bar-wrap">
                <div className="wrs-bar" style={{ width:`${Math.min(100,(activeReferrals/planRule.requiredReferrals)*100)}%` }} />
              </div>
            </div>
          </div>
        )}

        <CurrencyConverter />

        {/* Stats */}
        <div className="stats-row">
          <div className="stat-card">
            <div className="stat-icon green"><Layers size={14} /></div>
            <div className="stat-val">{stats.mining.toFixed(0)}</div>
            <div className="stat-label">Mining Earnings</div>
          </div>
          <div className="stat-card">
            <div className="stat-icon amber"><Users size={14} /></div>
            <div className="stat-val">{stats.referral.toFixed(0)}</div>
            <div className="stat-label">Referral Earnings</div>
          </div>
          <div className="stat-card">
            <div className="stat-icon purple"><Gift size={14} /></div>
            <div className="stat-val">{stats.rewards.toFixed(0)}</div>
            <div className="stat-label">Rewards Earned</div>
          </div>
        </div>

        {/* Earnings overview */}
        <div className="earnings-card">
          <div className="card-title"><TrendingUp size={15} />Earnings Overview</div>
          {[
            ["Total Earned",      `${Number(profile?.total_mined||0).toLocaleString(undefined,{maximumFractionDigits:2})} CUBE`, ""],
            ["Available Balance", `${balance.toLocaleString(undefined,{maximumFractionDigits:2})} CUBE`, "green"],
            ["Pending Cashouts",  `${stats.pending.toFixed(0)} CUBE`, "amber"],
            ["Total Cashed Out",  `${stats.cashedOut.toFixed(0)} CUBE`, ""],
            ["Naira Value",       fmtNaira(cubeToNaira(balance)), "green"],
          ].map(([l, v, c]) => (
            <div className="earning-row" key={l}>
              <span className="earning-label">{l}</span>
              <span className={`earning-val ${c}`}>{v}</span>
            </div>
          ))}
        </div>

        {/* Transactions */}
        <div className="transactions-card">
          <div className="card-title"><Clock size={15} />Recent Transactions</div>
          {transactions.length === 0 ? (
            <p style={{ color:"rgba(255,255,255,.35)", fontSize:"0.85rem", padding:"12px 0" }}>
              No transactions yet — start mining to earn CUBE!
            </p>
          ) : transactions.map(tx => {
            const absAmt = Math.abs(Number(tx.amount));
            const naira  = fmtNaira(cubeToNaira(absAmt));
            const prefix = Number(tx.amount) >= 0 ? "+" : "-";
            return (
              <div key={tx.id} className="tx-item">
                <TxIcon type={tx.type} />
                <div className="tx-info">
                  <div className="tx-title">{tx.title}</div>
                  <div className="tx-date">{fmtDate(tx.created_at)}</div>
                </div>
                <div className={`tx-amount ${tx.type}`}>
                  {prefix}{absAmt.toLocaleString(undefined,{maximumFractionDigits:2})} CUBE
                  <span className="tx-naira">{prefix}{naira}</span>
                </div>
              </div>
            );
          })}
        </div>

      </div>

      {/* Modals */}
      <CashoutModal
        balance={balance}
        userId={user?.id}
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSuccess={handleCashoutSuccess}
        maxNaira={maxNairaThisWeek}
        withdrawnThisWeek={withdrawnThisWeek}
        weeklyLimit={weeklyLimit}
      />
      <ReferralGateModal open={gateOpen} onClose={() => setGateOpen(false)}
        planRule={planRule} activeReferrals={activeReferrals} />
      <WithdrawalWindowModal open={windowModalOpen} onClose={() => setWindowModalOpen(false)}
        settings={withdrawalSettings} />
      <WithdrawalLimitModal
        open={limitModalOpen}
        onClose={() => setLimitModalOpen(false)}
        planRule={planRule}
        withdrawnThisWeek={withdrawnThisWeek}
        planName={planRule?.planName || "your plan"}
      />

      <ToastStack toasts={toasts} />
    </div>
  );
}