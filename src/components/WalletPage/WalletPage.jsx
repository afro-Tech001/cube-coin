import { useState, useEffect, useCallback } from "react";
import {
  Layers, ArrowUp, Clock, TrendingUp,
  Users, Gift, ArrowRight, X, AlertCircle, CheckCircle, Lock,
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

// ── Plan withdrawal rules ─────────────────────────────────────────────────────
// key = plan price, value = { firstWithdrawalNaira, requiredReferrals }
// firstWithdrawalNaira: naira threshold that triggers the referral gate
// requiredReferrals: number of active miners they must have referred
const PLAN_RULES = {
  5600:  { firstWithdrawalNaira: 2000,  requiredReferrals: 3 },
  10600: { firstWithdrawalNaira: 5000,  requiredReferrals: 3 },
  16200: { firstWithdrawalNaira: 10000, requiredReferrals: 3 },
  22500: { firstWithdrawalNaira: 15000, requiredReferrals: 3 },
  30350: { firstWithdrawalNaira: 20000, requiredReferrals: 3 },
  50000: { firstWithdrawalNaira: 25000, requiredReferrals: 3 },
};

const MINING_TITLES   = ["Mining Reward"];
const REFERRAL_TITLES = ["Referral Bonus"];
const EXCLUDED_FROM_REWARDS = [
  ...MINING_TITLES, ...REFERRAL_TITLES,
  "Cashout Request", "Cashout Refund",
];

function cubeToNaira(cubes) { return (cubes * CUBE_TO_NGN).toFixed(2); }
function nairaFromCube(cubes) { return cubes * CUBE_TO_NGN; }

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
          {t.type === "success" ? <CheckCircle size={14} /> : <AlertCircle size={14} />}
          {t.msg}
        </div>
      ))}
    </div>
  );
}

// ── Referral Gate Modal ───────────────────────────────────────────────────────
function ReferralGateModal({ open, onClose, planRule, activeReferrals, planPrice }) {
  if (!open || !planRule) return null;

  const needed    = planRule.requiredReferrals;
  const have      = activeReferrals;
  const remaining = Math.max(0, needed - have);
  const threshold = fmtNaira(planRule.firstWithdrawalNaira);

  return (
    <div className="modal-overlay open" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-sheet" style={{ maxHeight:"80vh" }}>
        <div className="modal-handle" />

        <div style={{ padding:"24px 24px 32px", textAlign:"center" }}>
          {/* Icon */}
          <div style={{
            width:72, height:72, borderRadius:"50%",
            background:"rgba(251,191,36,.1)", border:"1.5px solid rgba(251,191,36,.35)",
            display:"flex", alignItems:"center", justifyContent:"center",
            margin:"0 auto 18px", fontSize:"2rem",
          }}>
            🔒
          </div>

          <h3 style={{ color:"#fff", fontSize:"1.2rem", fontWeight:800, marginBottom:10 }}>
            Referral Requirement
          </h3>

          <p style={{ color:"rgba(255,255,255,.55)", fontSize:"0.88rem", lineHeight:1.65, marginBottom:22 }}>
  You've crossed the{" "}
  <strong style={{ color:"#fbbf24" }}>{threshold}</strong> withdrawal threshold for your plan.
  To make further withdrawals, you need{" "}
  <strong style={{ color:"#4ade80" }}>{needed} active miners</strong> from your referrals.
  <br /><br />
  <span style={{ color:"rgba(248,113,113,.8)", fontSize:"0.82rem" }}>
    ⚠ Users who signed up using your code but <strong>haven't subscribed</strong> do NOT count —
    only those with an <strong>approved subscription</strong> qualify as active miners.
  </span>
</p>

          {/* Progress */}
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

            {/* Progress bar */}
            <div style={{ height:6, background:"rgba(255,255,255,.08)", borderRadius:3, overflow:"hidden", marginBottom:12 }}>
              <div style={{
                height:"100%",
                width:`${Math.min(100, (have / needed) * 100)}%`,
                background: have >= needed ? "#4ade80" : "#fbbf24",
                borderRadius:3, transition:"width .4s ease",
              }} />
            </div>

            {have >= needed ? (
              <div style={{ display:"flex", alignItems:"center", gap:8, color:"#4ade80", fontSize:13, fontWeight:700 }}>
                <CheckCircle size={15} /> You meet the referral requirement!
              </div>
            ) : (
              <div style={{ color:"rgba(255,255,255,.45)", fontSize:12, lineHeight:1.55 }}>
                You need <strong style={{ color:"#fbbf24" }}>{remaining} more active miner{remaining !== 1 ? "s" : ""}</strong> before
                you can make your next withdrawal. Share your referral code to invite friends.
              </div>
            )}
          </div>

          {/* What counts as active miner */}
          <div style={{
            background:"rgba(255,255,255,.04)", border:"1px solid rgba(255,255,255,.08)",
            borderRadius:12, padding:"12px 14px", marginBottom:22, textAlign:"left",
          }}>
            <div style={{ fontSize:11, color:"rgba(255,255,255,.35)", fontWeight:700, textTransform:"uppercase", letterSpacing:".06em", marginBottom:8 }}>
              What counts as an active miner?
            </div>
            <div style={{ fontSize:12, color:"rgba(255,255,255,.5)", lineHeight:1.6 }}>
              A person who signed up using <strong style={{ color:"rgba(255,255,255,.75)" }}>your referral code</strong> and has
              an <strong style={{ color:"#4ade80" }}>approved subscription</strong> on CubeCoin.
            </div>
          </div>

          <button
            className="modal-done-btn"
            onClick={onClose}
            style={{ width:"100%", marginBottom:0 }}
          >
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
          <input className="converter-input naira-out" type="text"
            placeholder="₦0.00" value={nairaVal} readOnly />
          <span className="conv-unit">ngn</span>
        </div>
      </div>
    </div>
  );
}

// ── Cashout Modal ─────────────────────────────────────────────────────────────
function CashoutModal({ balance, userId, open, onClose, onSuccess }) {
  const [amount,  setAmount]  = useState("");
  const [bank,    setBank]    = useState("");
  const [acct,    setAcct]    = useState("");
  const [name,    setName]    = useState("");
  const [errors,  setErrors]  = useState({});
  const [loading, setLoading] = useState(false);
  const [done,    setDone]    = useState(false);
  const [ref,     setRef]     = useState("");

  useEffect(() => {
    if (open) {
      setAmount(""); setBank(""); setAcct(""); setName("");
      setErrors({}); setLoading(false); setDone(false); setRef("");
    }
  }, [open]);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  const parsedAmount = parseFloat(amount) || 0;
  const nairaValue   = parsedAmount > 0 ? fmtNaira(cubeToNaira(parsedAmount)) : "₦0.00";

  const validate = () => {
    const errs = {};
    if (parsedAmount < MIN_CASHOUT) errs.amount = `Minimum cashout is ${MIN_CASHOUT} CUBE`;
    if (parsedAmount > balance)     errs.amount = "Insufficient balance";
    if (!bank)                      errs.bank   = "Select a bank";
    if (acct.length !== 10)         errs.acct   = "Enter a valid 10-digit account number";
    if (!name.trim())               errs.name   = "Account name is required";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setLoading(true);

    const txRef    = genRef();
    const nairaVal = parseFloat(cubeToNaira(parsedAmount));

    const { error: cashoutErr } = await supabase
      .from("cashout_requests")
      .insert([{
        user_id: userId, amount: parsedAmount,
        naira_value: nairaVal, bank_name: bank,
        account_number: acct, account_name: name,
        tx_ref: txRef, status: "pending",
      }]);

    if (cashoutErr) {
      setLoading(false);
      onSuccess(null, null, null, cashoutErr.message);
      return;
    }

    await supabase.from("profiles")
      .update({ cube_balance: balance - parsedAmount })
      .eq("id", userId);

    await supabase.from("wallet_transactions").insert([{
      user_id: userId, title: "Cashout Request",
      amount: -parsedAmount, type: "pending",
    }]);

    setRef(txRef);
    setDone(true);
    setLoading(false);
    onSuccess(parsedAmount, txRef, name, null);
  };

  return (
    <div className={`modal-overlay ${open ? "open" : ""}`}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-sheet">
        <div className="modal-handle" />

        {done ? (
          <div className="modal-success">
            <div className="modal-success-icon"><CheckCircle size={28} /></div>
            <h3>Request Submitted!</h3>
            <p>
              Your cashout of{" "}
              <strong style={{ color:"#e8ffe6" }}>{parsedAmount} CUBE</strong> →{" "}
              <strong style={{ color:"#4ade80" }}>{fmtNaira(cubeToNaira(parsedAmount))}</strong>{" "}
              is being processed. We'll pay to <strong style={{ color:"#e8ffe6" }}>{name}</strong>{" "}
              within 1–24 hours.
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
              <div className="cashout-cube-row">
                <div className="converter-field">
                  <label>CUBE to cash out</label>
                  <input
                    className={`converter-input ${errors.amount ? "error" : ""}`}
                    type="number" min={MIN_CASHOUT} max={balance}
                    placeholder={`Min ${MIN_CASHOUT} CUBE`}
                    value={amount}
                    onChange={e => { setAmount(e.target.value); setErrors(p => ({ ...p, amount:null })); }}
                  />
                  <span className="conv-unit">cube</span>
                </div>
                <button className="cashout-max-btn"
                  onClick={() => { setAmount(String(Math.floor(balance))); setErrors(p => ({ ...p, amount:null })); }}>
                  Max
                </button>
              </div>
              {errors.amount && (
                <p style={{ fontSize:11, color:"#f87171", marginTop:-10, marginBottom:10 }}>{errors.amount}</p>
              )}

              <div className="cashout-summary">
                {[
                  ["You cash out",     `${parsedAmount > 0 ? parsedAmount : "—"} CUBE`, ""],
                  ["You receive",       nairaValue,                                      "green"],
                  ["Exchange rate",    "100 CUBE = ₦5.00",                              ""],
                  ["Available balance",`${balance.toLocaleString()} CUBE`,              "amber"],
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
                <p>Cashout requests are processed within 1–24 hours. Your CUBE balance will be deducted immediately upon submission.</p>
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

  const [modalOpen,        setModalOpen]        = useState(false);
  const [gateOpen,         setGateOpen]         = useState(false);
  const [user,             setUser]             = useState(null);
  const [profile,          setProfile]          = useState(null);
  const [transactions,     setTransactions]     = useState([]);
  const [stats,            setStats]            = useState({ mining:0, referral:0, rewards:0, cashedOut:0, pending:0 });
  const [loading,          setLoading]          = useState(true);
  const [planPrice,        setPlanPrice]        = useState(null);
  const [planRule,         setPlanRule]         = useState(null);
  const [activeReferrals,  setActiveReferrals]  = useState(0);
  const [totalCashedOutNgn,setTotalCashedOutNgn]= useState(0);

  const balance = Number(profile?.cube_balance || 0);

  // ── Load wallet ─────────────────────────────────────────────────────────────
  const loadWallet = useCallback(async (uid) => {
    // 1. Profile
    const { data: prof } = await supabase
      .from("profiles")
      .select("cube_balance, total_mined, referral_code, first_withdrawal_done, first_withdrawal_amount")
      .eq("id", uid)
      .maybeSingle();
    setProfile(prof);

    // 2. Active subscription
    const { data: sub } = await supabase
      .from("subscriptions")
      .select("amount, plan_name, mining_rate")
      .eq("user_id", uid)
      .eq("payment_status", "approved")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (sub) {
      const price = Number(sub.amount);
      setPlanPrice(price);
      setPlanRule(PLAN_RULES[price] || null);
    }

    // 3. Active referrals (referred users with an approved subscription)
    let activeRefCount = 0;
    if (prof?.referral_code) {
      // Get all users referred by this user
      const { data: referredProfiles } = await supabase
        .from("profiles")
        .select("id")
        .eq("referred_by_code", prof.referral_code);

      if (referredProfiles && referredProfiles.length > 0) {
        const referredIds = referredProfiles.map(p => p.id);
        // Count how many have an approved subscription
        const { count } = await supabase
          .from("subscriptions")
          .select("*", { count:"exact", head:true })
          .in("user_id", referredIds)
          .eq("payment_status", "approved");
        activeRefCount = count || 0;
      }
    }
    setActiveReferrals(activeRefCount);

    // 4. Transactions
    const { data: allTxs } = await supabase
      .from("wallet_transactions")
      .select("*")
      .eq("user_id", uid)
      .order("created_at", { ascending: false });

    const txs = allTxs || [];
    setTransactions(txs.slice(0, 10));

    const mining   = txs.filter(t => MINING_TITLES.includes(t.title)).reduce((a,t)=>a+Number(t.amount),0);
    const referral = txs.filter(t => REFERRAL_TITLES.includes(t.title)).reduce((a,t)=>a+Number(t.amount),0);
    const rewards  = txs.filter(t => t.type==="credit" && !EXCLUDED_FROM_REWARDS.includes(t.title)).reduce((a,t)=>a+Number(t.amount),0);
    const cashedOut= txs.filter(t => t.title==="Cashout Request" && t.type!=="pending").reduce((a,t)=>a+Math.abs(Number(t.amount)),0);

    const { data: pendingCo } = await supabase
      .from("cashout_requests")
      .select("amount")
      .eq("user_id", uid)
      .eq("status", "pending");
    const pending = (pendingCo || []).reduce((a,c)=>a+Number(c.amount),0);

    // 5. Total cashed out in naira (from approved cashout_requests)
    const { data: approvedCashouts } = await supabase
      .from("cashout_requests")
      .select("naira_value")
      .eq("user_id", uid)
      .eq("status", "approved");

    const totalNaira = (approvedCashouts || []).reduce((a,c)=>a+Number(c.naira_value),0);
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

  // ── Check withdrawal eligibility ──────────────────────────────────────────
  const handleCashoutClick = () => {
    if (!planRule) {
      // No rule for this plan — allow freely
      setModalOpen(true);
      return;
    }

    const firstThresholdNaira = planRule.firstWithdrawalNaira;

    // Has the user already cashed out >= the first threshold?
    const crossedThreshold = totalCashedOutNgn >= firstThresholdNaira ||
      (profile?.first_withdrawal_done && Number(profile?.first_withdrawal_amount || 0) >= firstThresholdNaira);

    if (crossedThreshold) {
      // Check referral gate
      if (activeReferrals < planRule.requiredReferrals) {
        // Show the gate modal — block cashout
        setGateOpen(true);
        return;
      }
    }

    // All clear — open cashout modal
    setModalOpen(true);
  };

  const handleCashoutSuccess = async (amount, ref, name, errMsg) => {
    if (errMsg) {
      addToast(`Cashout failed: ${errMsg}`, "error");
      return;
    }
    addToast("Cashout submitted successfully!", "success");
    setModalOpen(false);

    // Mark first withdrawal done on the profile if rule exists and threshold crossed
    if (planRule && user) {
      const withdrawnNaira = nairaFromCube(amount);
      const newTotalNaira  = totalCashedOutNgn + withdrawnNaira;

      if (newTotalNaira >= planRule.firstWithdrawalNaira && !profile?.first_withdrawal_done) {
        await supabase.from("profiles").update({
          first_withdrawal_done:   true,
          first_withdrawal_amount: amount,
        }).eq("id", user.id);
      }
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

  // Compute gate status for the cashout button hint
  const crossedThreshold = planRule && (
    totalCashedOutNgn >= planRule.firstWithdrawalNaira ||
    (profile?.first_withdrawal_done && Number(profile?.first_withdrawal_amount||0) >= planRule.firstWithdrawalNaira)
  );
  const isGated = crossedThreshold && activeReferrals < (planRule?.requiredReferrals || 0);

  return (
    <div className="wallet-page">
      <div className="wallet-inner">

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
            <span className="hero-eyebrow-dot" />
            Available Balance
          </div>
          <div className="wallet-balance-cube">
            <span>{balance.toLocaleString(undefined, { maximumFractionDigits:2 })}</span> CUBE
          </div>
          <div className="wallet-balance-naira">
            ≈ <strong>{fmtNaira(cubeToNaira(balance))}</strong> NGN
          </div>
          <div className="rate-pill">
            <span className="rate-pip" />
            100 CUBE = ₦5.00 NGN
          </div>

          {/* Gate hint banner */}
          {isGated && (
            <div className="wallet-gate-hint">
              <Lock size={13} />
              <span>
                Next withdrawal requires <strong>{planRule.requiredReferrals} active referrals</strong>.
                You have <strong style={{ color: activeReferrals > 0 ? "#4ade80" : "#f87171" }}>{activeReferrals}</strong>.
              </span>
            </div>
          )}

          {/* Plan rule info (before threshold) */}
           {planRule &&
 profile?.first_withdrawal_done &&
 activeReferrals < planRule.requiredReferrals && (
  <div className="wallet-gate-hint info">
    <AlertCircle size={13} />
    <span>
      You've completed your first withdrawal.
      Future withdrawals now require{" "}
      <strong>{planRule.requiredReferrals} active referrals</strong>.
    </span>
  </div>
)}

          <div className="wallet-hero-actions">
            <button
              className={`hero-btn cashout-btn ${isGated ? "gated" : ""}`}
              onClick={handleCashoutClick}
            >
              {isGated ? <Lock size={16} /> : <ArrowUp size={16} />}
              {isGated ? "Locked" : "Cash Out"}
            </button>
            <button className="hero-btn history-btn" onClick={() => addToast("Full history coming soon", "success")}>
              <Clock size={16} />
              History
            </button>
          </div>
        </div>

        {/* Referral status card (only show when gated or approaching threshold) */}
        {planRule && (
          <div className="wallet-referral-status">
            <div className="wrs-header">
              <Users size={14} />
              <span>Referral Status</span>
              {activeReferrals >= (planRule?.requiredReferrals || 0)
                ? <span className="wrs-badge ok">✓ Requirement met</span>
                : crossedThreshold
                  ? <span className="wrs-badge warn">⚠ Required</span>
                  : <span className="wrs-badge info">ℹ Coming soon</span>
              }
            </div>
            <div className="wrs-body">
              <div className="wrs-row">
                <span>Active miners referred</span>
                <span style={{ color:"#4ade80", fontWeight:700 }}>{activeReferrals} / {planRule.requiredReferrals}</span>
              </div>
              <div className="wrs-bar-wrap">
                <div className="wrs-bar"
                  style={{ width:`${Math.min(100,(activeReferrals/planRule.requiredReferrals)*100)}%` }} />
              </div>
              <div className="wrs-row" style={{ marginTop:6 }}>
                <span>Withdrawal threshold</span>
                <span style={{ color: crossedThreshold ? "#f87171" : "rgba(255,255,255,.55)", fontWeight:600 }}>
                  {fmtNaira(totalCashedOutNgn)} / {fmtNaira(planRule.firstWithdrawalNaira)}
                </span>
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
            ["Total Earned",       `${Number(profile?.total_mined||0).toLocaleString(undefined,{maximumFractionDigits:2})} CUBE`, ""],
            ["Available Balance",  `${balance.toLocaleString(undefined,{maximumFractionDigits:2})} CUBE`, "green"],
            ["Pending Cashouts",   `${stats.pending.toFixed(0)} CUBE`, "amber"],
            ["Total Cashed Out",   `${stats.cashedOut.toFixed(0)} CUBE`, ""],
            ["Naira Value",        fmtNaira(cubeToNaira(balance)), "green"],
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
                  {prefix}{absAmt.toFixed(2)} CUBE
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
      />

      <ReferralGateModal
        open={gateOpen}
        onClose={() => setGateOpen(false)}
        planRule={planRule}
        activeReferrals={activeReferrals}
        planPrice={planPrice}
      />

      <ToastStack toasts={toasts} />
    </div>
  );
}