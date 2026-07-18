import { useState, useEffect } from "react";
import { supabase } from "../../libs/supabase";
import { useNavigate } from "react-router-dom";
import "./UpgradePlan.css";

const PLANS = [
  { id:0, name:"Basic",   price:5600,  rateVal:1250.00, rate:"1,250 CUBE/hr",  subscriptionCubes:20000,  color:"#86efac", daily:30000,  dailyNaira:1500 },
  { id:1, name:"Starter", price:10600, rateVal:2500.00, rate:"2,500 CUBE/hr",  subscriptionCubes:50000,  color:"#4ade80", daily:60000,  dailyNaira:3000 },
  { id:2, name:"Bronze",  price:16200, rateVal:3750.00, rate:"3,750 CUBE/hr",  subscriptionCubes:100000, color:"#fb923c", daily:90000,  dailyNaira:4500 },
  { id:3, name:"Silver",  price:22500, rateVal:5000.00, rate:"5,000 CUBE/hr",  subscriptionCubes:200000, color:"#94a3b8", daily:120000, dailyNaira:6000, featured:true },
  { id:4, name:"Gold",    price:30350, rateVal:6250.00, rate:"6,250 CUBE/hr",  subscriptionCubes:250000, color:"#fbbf24", daily:150000, dailyNaira:7500 },
  { id:5, name:"Diamond", price:50000, rateVal:8166.67, rate:"8,166 CUBE/hr",  subscriptionCubes:300000, color:"#60a5fa", daily:196000, dailyNaira:9800 },
];

const PLAN_ICONS = {
  Basic: "🟢", Starter: "⬡", Bronze: "🥉",
  Silver: "🥈", Gold: "🥇", Diamond: "💎",
};

const BANK = {
  bankName:      "Moniepoint Nigeria",
  accountName:   "Mara's Treat",
  accountNumber: "7077456282",
};

function fmtCubes(n) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000)     return (n / 1_000).toFixed(n % 1_000 === 0 ? 0 : 1) + "K";
  return n.toLocaleString();
}

// ── Step dots ─────────────────────────────────────────────────────────────────
function StepDots({ current }) {
  return (
    <div className="up-steps">
      {["Details","Payment","Confirm"].map((label, i) => {
        const n = i + 1;
        return (
          <div key={n} className="up-step-item">
            <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:3 }}>
              <div className={`up-step-dot ${current > n ? "done" : current === n ? "active" : ""}`}>
                {current > n ? "✓" : n}
              </div>
              <div className="up-step-label">{label}</div>
            </div>
            {i < 2 && <div className="up-step-line" />}
          </div>
        );
      })}
    </div>
  );
}

// ── Toast ─────────────────────────────────────────────────────────────────────
function Toast({ msg, type }) {
  if (!msg) return null;
  return (
    <div className={`up-toast ${type === "error" ? "error" : ""}`}>{msg}</div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function UpgradePlan() {
  const navigate = useNavigate();

  const [user,          setUser]          = useState(null);
  const [currentSub,    setCurrentSub]    = useState(null);
  const [currentPlanObj,setCurrentPlanObj]= useState(null);
  const [loading,       setLoading]       = useState(true);
  const [selected,      setSelected]      = useState(null);
  const [step,          setStep]          = useState(0); // 0=list, 1,2,3=sheet steps
  const [copied,        setCopied]        = useState(false);
  const [submitting,    setSubmitting]    = useState(false);
  const [success,       setSuccess]       = useState(false);
  const [toast,         setToast]         = useState(null);
  const [receipt,       setReceipt]       = useState(null);
  const [name,          setName]          = useState("");
  const [contact,       setContact]       = useState("");
  const [errors,        setErrors]        = useState({});
  const [txRef]                           = useState("UPG" + Date.now().toString().slice(-8));

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  // ── Load current subscription ─────────────────────────────────────────────
  useEffect(() => {
    const init = async () => {
      const { data: { user: u } } = await supabase.auth.getUser();
      if (!u) { navigate("/login"); return; }
      setUser(u);

      const { data: sub } = await supabase
        .from("subscriptions")
        .select("id, plan_name, mining_rate, subscription_cubes, payment_status, activated_at")
        .eq("user_id", u.id)
        .eq("payment_status", "approved")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (sub) {
        setCurrentSub(sub);
        const planObj = PLANS.find(p => p.name === sub.plan_name) || null;
        setCurrentPlanObj(planObj);
      }

      setLoading(false);
    };
    init();
  }, []);

  const upgradeCost = (plan) => {
    if (!currentPlanObj) return plan.price;
    return Math.max(0, plan.price - currentPlanObj.price);
  };

  const isUpgrade = (plan) => {
    if (!currentPlanObj) return true;
    return plan.id > currentPlanObj.id;
  };

  const openPlan = (plan) => {
    setSelected(plan);
    setStep(1);
    setSuccess(false);
    setName(""); setContact(""); setReceipt(null); setErrors({});
  };

  const closeSheet = () => {
    setSelected(null);
    setStep(0);
    setSuccess(false);
  };

  const copyAcct = () => {
    navigator.clipboard?.writeText(BANK.accountNumber).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const validateStep3 = () => {
    const errs = {};
    if (!name.trim())    errs.name    = true;
    if (!contact.trim()) errs.contact = true;
    if (!receipt)        errs.receipt = true;
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateStep3()) return;
    setSubmitting(true);

    try {
      // Upload receipt
      let receiptUrl = null;
      if (receipt) {
        const ext  = receipt.name.split(".").pop();
        const path = `receipts/${Date.now()}-${Math.random()}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from("payment-receipts").upload(path, receipt);
        if (upErr) { showToast(upErr.message, "error"); setSubmitting(false); return; }
        const { data: urlData } = supabase.storage.from("payment-receipts").getPublicUrl(path);
        receiptUrl = urlData.publicUrl;
      }

      const cost = upgradeCost(selected);

      // 1. Insert upgrade audit row
      await supabase.from("subscription_upgrades").insert([{
        user_id:        user.id,
        from_plan:      currentSub?.plan_name || null,
        to_plan:        selected.name,
        from_rate:      currentPlanObj?.rateVal || null,
        to_rate:        selected.rateVal,
        upgrade_amount: cost,
        tx_ref:         txRef,
        receipt_url:    receiptUrl,
        status:         "pending",
      }]);

      // 2. Insert new pending subscription for admin to approve
      const { error: subErr } = await supabase.from("subscriptions").insert([{
        user_id:            user.id,
        full_name:          name,
        contact,
        plan_name:          selected.name,
        amount:             cost,
        tx_ref:             txRef,
        payment_status:     "pending",
        plan_status:        "pending",
        mining_rate:        selected.rateVal,
        subscription_cubes: selected.subscriptionCubes,
        receipt_url:        receiptUrl,
      }]);

      if (subErr) { showToast(subErr.message, "error"); setSubmitting(false); return; }

      // 3. Mark profile as pending
      await supabase.from("profiles")
        .update({ subscription_status: "pending" })
        .eq("id", user.id);

      setSuccess(true);
      showToast("Upgrade submitted! Admin will verify within 1–3 hours ✅");

    } catch (err) {
      console.error(err);
      showToast("Something went wrong — try again", "error");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="up-page">
        <div className="up-loading">
          <div className="up-loading-icon">⬆️</div>
          Loading your plan…
        </div>
      </div>
    );
  }

  const cost = selected ? upgradeCost(selected) : 0;

  return (
    <div className="up-page">

      {/* ── Header ── */}
      <div className="up-header">
        <div className="up-header-left">
          <div className="up-back" onClick={() => navigate("/dashboard")}>← Back</div>
          <h1>Upgrade Plan</h1>
          <p>Unlock faster mining speeds and bigger rewards</p>
        </div>
      </div>

      {/* ── Current plan card ── */}
      {currentSub ? (
        <div className="up-current-card">
          <div className="up-current-left">
            <div className="up-current-dot" />
            <div>
              <div className="up-current-label">Your current plan</div>
              <div className="up-current-name">
                {PLAN_ICONS[currentSub.plan_name] || "⬡"} {currentSub.plan_name}
              </div>
            </div>
          </div>
          <div className="up-current-right">
            <div className="up-current-rate">{currentSub.mining_rate} CUBE/hr</div>
            <div className="up-current-status">Active</div>
          </div>
        </div>
      ) : (
        <div className="up-no-plan">
          <div>You don't have an active plan yet.</div>
          <button className="up-sub-btn" onClick={() => navigate("/subscription")}>
            Subscribe now
          </button>
        </div>
      )}

      {/* ── Plans list ── */}
      <div className="up-plans-title">Available upgrades</div>

      <div className="up-plans-list">
        {PLANS.map(plan => {
          const isCurrentPlan = currentPlanObj?.id === plan.id;
          const canUpgrade    = isUpgrade(plan);
          const isLower       = currentPlanObj && plan.id < currentPlanObj.id;
          const cost          = upgradeCost(plan);

          return (
            <div
              key={plan.id}
              className={`up-plan-row ${isCurrentPlan ? "current" : ""} ${isLower ? "lower" : ""} ${plan.featured ? "featured" : ""}`}
            >
              {/* Plan icon + name */}
              <div className="up-plan-icon" style={{ background:`${plan.color}18`, border:`1px solid ${plan.color}40` }}>
                <span style={{ fontSize:18 }}>{PLAN_ICONS[plan.name]}</span>
              </div>

              <div className="up-plan-info">
                <div className="up-plan-name-row">
                  <span className="up-plan-name" style={{ color: isCurrentPlan ? plan.color : "#fff" }}>
                    {plan.name}
                  </span>
                  {isCurrentPlan && <span className="up-current-badge">✓ Current</span>}
                  {plan.featured && !isCurrentPlan && <span className="up-popular-badge">Popular</span>}
                </div>
                <div className="up-plan-rate" style={{ color: plan.color }}>{plan.rate}</div>
                  <div className="up-plan-bonus">
  {plan.daily.toLocaleString()} CUBE/day · ₦{plan.dailyNaira?.toLocaleString()}/day value
</div>
              </div>

              <div className="up-plan-right">
                {isCurrentPlan ? (
                  <div className="up-plan-price-wrap">
                    <div className="up-plan-full-price">₦{plan.price.toLocaleString()}</div>
                    <button className="up-btn-current" disabled>Active</button>
                  </div>
                ) : isLower ? (
                  <div className="up-plan-price-wrap">
                    <div className="up-plan-full-price dim">₦{plan.price.toLocaleString()}</div>
                    <button className="up-btn-lower" disabled>Lower tier</button>
                  </div>
                ) : (
                  <div className="up-plan-price-wrap">
                    {currentPlanObj ? (
                      <>
                        <div className="up-upgrade-cost-label">You pay</div>
                        <div className="up-upgrade-cost-val">₦{cost.toLocaleString()}</div>
                        <div className="up-full-price-hint">Full: ₦{plan.price.toLocaleString()}</div>
                      </>
                    ) : (
                      <div className="up-upgrade-cost-val">₦{plan.price.toLocaleString()}</div>
                    )}
                    <button
                      className={`up-btn-upgrade ${plan.featured ? "featured" : ""}`}
                      onClick={() => openPlan(plan)}
                    >
                      ↑ Upgrade
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Bottom info ── */}
      <div className="up-info-box">
        <div className="up-info-row">
          <span>💡</span>
          <span>Upgrade cost = difference between your current plan price and the new plan price.</span>
        </div>
        <div className="up-info-row">
          <span>⚡</span>
          <span>Your new mining rate activates within 1–3 hours after payment is verified.</span>
        </div>
        <div className="up-info-row">
          <span>⬡</span>
          <span>You receive a fresh CUBE activation bonus on every upgrade.</span>
        </div>
      </div>

      {/* ── Sheet overlay ── */}
      {selected && (
        <div className="up-overlay" onClick={e => e.target === e.currentTarget && closeSheet()}>
          <div className="up-sheet">
            <button className="up-sheet-close" onClick={closeSheet}>×</button>

            {success ? (
              /* ── Success ── */
              <div className="up-success">
                <div className="up-success-icon">⬆️</div>
                <h3>Upgrade submitted!</h3>
                <p>
                  Your upgrade to <strong style={{ color:"#4ade80" }}>{selected.name}</strong> plan
                  is being verified. You'll receive{" "}
                  <strong style={{ color:"#4ade80" }}>{fmtCubes(selected.subscriptionCubes)} CUBE</strong>{" "}
                  once approved.
                </p>
                <div className="up-success-ref">
                  <div className="up-success-ref-label">Reference</div>
                  <div className="up-success-ref-val">{txRef}</div>
                </div>
                <button className="up-confirm-btn" onClick={() => navigate("/subscription-status")}>
                  Check status
                </button>
                <button className="up-cancel-btn" onClick={() => navigate("/dashboard")}>
                  Go to dashboard
                </button>
              </div>

            ) : step === 1 ? (
              /* ── Step 1: Details ── */
              <>
                <div className="up-sheet-plan-name">
                  {PLAN_ICONS[selected.name]} {selected.name} plan
                </div>
                <StepDots current={1} />

                {/* From → To */}
                {currentPlanObj && (
                  <div className="up-from-to">
                    <div className="up-from-to-row">
                      <span className="up-from-to-label">From</span>
                      <span className="up-from-to-val">
                        {PLAN_ICONS[currentPlanObj.name]} {currentPlanObj.name}
                        <span style={{ color:"rgba(255,255,255,.4)", marginLeft:8 }}>{currentPlanObj.rate}</span>
                      </span>
                    </div>
                    <div className="up-from-to-arrow">↓</div>
                    <div className="up-from-to-row highlight">
                      <span className="up-from-to-label">To</span>
                      <span className="up-from-to-val" style={{ color:"#4ade80" }}>
                        {PLAN_ICONS[selected.name]} {selected.name}
                        <span style={{ marginLeft:8 }}>{selected.rate}</span>
                      </span>
                    </div>
                  </div>
                )}

                {/* Cost breakdown */}
                <div className="up-cost-box">
                  {currentPlanObj && (
                    <>
                      <div className="up-cost-row">
                        <span>New plan price</span>
                        <span>₦{selected.price.toLocaleString()}</span>
                      </div>
                      <div className="up-cost-row">
                        <span>Current plan credit</span>
                        <span style={{ color:"#f87171" }}>− ₦{currentPlanObj.price.toLocaleString()}</span>
                      </div>
                      <div className="up-cost-row total">
                        <span>You pay</span>
                        <span style={{ color:"#4ade80" }}>₦{cost.toLocaleString()}</span>
                      </div>
                    </>
                  )}
                  {!currentPlanObj && (
                    <div className="up-cost-row total">
                      <span>You pay</span>
                      <span style={{ color:"#4ade80" }}>₦{selected.price.toLocaleString()}</span>
                    </div>
                  )}
                </div>

                {/* Cube bonus */}
                <div className="up-cube-badge">
                  <span style={{ fontSize:20 }}>⬡</span>
                  <div>
                    <div className="up-cube-val">{fmtCubes(selected.subscriptionCubes)} CUBE</div>
                    <div className="up-cube-sub">credited to your wallet on activation</div>
                  </div>
                </div>

                <button className="up-confirm-btn" onClick={() => setStep(2)}>
                  Proceed to payment →
                </button>
              </>

            ) : step === 2 ? (
              /* ── Step 2: Payment ── */
              <>
                <div className="up-sheet-plan-name">
                  {PLAN_ICONS[selected.name]} Upgrade to {selected.name}
                </div>
                <StepDots current={2} />

                <div className="up-amount-highlight">
                  <p>Transfer exactly this amount</p>
                  <h2>₦{cost.toLocaleString()}</h2>
                </div>

                <div className="up-bank-card">
                  {[
                    ["Bank",    BANK.bankName],
                    ["Name",    BANK.accountName],
                    ["Account", BANK.accountNumber],
                  ].map(([label, val]) => (
                    <div key={label} className="up-bank-row">
                      <span className="up-bank-label">{label}</span>
                      <span className="up-bank-val">
                        {val}
                        {label === "Account" && (
                          <button className="up-copy-mini" onClick={copyAcct}>
                            {copied ? "Copied!" : "Copy"}
                          </button>
                        )}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="up-notice">
                  ⚠ Use your phone number or email as the transfer narration.
                </div>

                <div className="up-ref-row">
                  <span className="up-ref-label">Reference</span>
                  <span className="up-ref-val">{txRef}</span>
                </div>

                <button className="up-confirm-btn" onClick={() => setStep(3)}>
                  I've made this payment ✓
                </button>
                <button className="up-cancel-btn" onClick={() => setStep(1)}>← Back</button>
              </>

            ) : (
              /* ── Step 3: Confirm ── */
              <>
                <div className="up-sheet-plan-name">
                  {PLAN_ICONS[selected.name]} Confirm upgrade
                </div>
                <StepDots current={3} />

                {/* Summary */}
                <div className="up-bank-card" style={{ marginBottom:14 }}>
                  {[
                    ["Upgrading to",  selected.name],
                    ["Amount",        `₦${cost.toLocaleString()}`],
                    ["Mining rate",   selected.rate],
                    ["CUBE bonus",    `${fmtCubes(selected.subscriptionCubes)} CUBE`],
                    ["Reference",     txRef],
                  ].map(([l, v]) => (
                    <div key={l} className="up-bank-row">
                      <span className="up-bank-label">{l}</span>
                      <span className="up-bank-val"
                        style={["Amount","Mining rate","CUBE bonus"].includes(l) ? { color:"#4ade80" } : {}}>
                        {v}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="up-field">
                  <label>Full name *</label>
                  <input
                    type="text"
                    placeholder="As used on your bank account"
                    value={name}
                    onChange={e => { setName(e.target.value); setErrors(p => ({...p, name:false})); }}
                    style={errors.name ? { borderColor:"rgba(239,68,68,.5)" } : {}}
                  />
                  {errors.name && <span className="up-err">Name is required</span>}
                </div>

                <div className="up-field">
                  <label>Phone / Email *</label>
                  <input
                    type="text"
                    placeholder="Used as transfer narration"
                    value={contact}
                    onChange={e => { setContact(e.target.value); setErrors(p => ({...p, contact:false})); }}
                    style={errors.contact ? { borderColor:"rgba(239,68,68,.5)" } : {}}
                  />
                  {errors.contact && <span className="up-err">Phone or email is required</span>}
                </div>

                <div className="up-field">
                  <label>Payment receipt *</label>
                  <input
                    type="file"
                    accept="image/*,.pdf"
                    onChange={e => { setReceipt(e.target.files[0]); setErrors(p => ({...p, receipt:false})); }}
                    style={errors.receipt ? { borderColor:"rgba(239,68,68,.5)" } : {}}
                  />
                  {errors.receipt && <span className="up-err">Please attach your receipt</span>}
                </div>

                <div className="up-notice" style={{ marginBottom:16 }}>
                  ⏱ Upgrade activates within 1–3 hours after payment is verified.
                </div>

                <button
                  className="up-confirm-btn"
                  onClick={handleSubmit}
                  disabled={submitting}
                >
                  {submitting
                    ? <><span className="up-spinner" /> Submitting…</>
                    : "Submit upgrade →"
                  }
                </button>
                <button className="up-cancel-btn" onClick={() => setStep(2)}>← Back</button>
              </>
            )}
          </div>
        </div>
      )}

      <Toast msg={toast?.msg} type={toast?.type} />
    </div>
  );
}