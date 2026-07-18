import React, { useState, useEffect } from "react";
import "./Subscriptionpage.css";
import { supabase } from "../../libs/supabase";
import { ToastContainer, toast } from "react-toastify";
import { useNavigate } from "react-router-dom";
import "react-toastify/dist/ReactToastify.css";

// ── Plans with subscription_cubes ─────────────────────────────────────────────

const PLANS = [
  {
    id: 0, name: "Basic", price: 5600,
    rate: "1,250 CUBE/hr", rateVal: 1250.00,
    subscriptionCubes: 20000,
    dailyEarning: 30000,
    dailyNaira: 1500,
    features: [
      "30,000 CUBE daily (₦1,500 value)",
      "Entry-level mining",
      "Daily rewards",
      "Mobile access",
      "Community support",
    ],
    badge: "New · Best entry",
  },
  {
    id: 1, name: "Starter", price: 10600,
    rate: "2,500 CUBE/hr", rateVal: 2500.00,
    subscriptionCubes: 50000,
    dailyEarning: 60000,
    dailyNaira: 3000,
    features: [
      "60,000 CUBE daily (₦3,000 value)",
      "Basic mining speed",
      "Daily rewards",
      "Mobile access",
      "Community support",
    ],
  },
  {
    id: 2, name: "Bronze", price: 16200,
    rate: "3,750 CUBE/hr", rateVal: 3750.00,
    subscriptionCubes: 100000,
    dailyEarning: 90000,
    dailyNaira: 4500,
    features: [
      "90,000 CUBE daily (₦4,500 value)",
      "2.5× mining speed",
      "Priority queue",
      "Email support",
      "Streak bonuses",
    ],
  },
  {
    id: 3, name: "Silver", price: 22500,
    rate: "5,000 CUBE/hr", rateVal: 5000.00,
    subscriptionCubes: 200000,
    dailyEarning: 120000,
    dailyNaira: 6000,
    features: [
      "120,000 CUBE daily (₦6,000 value)",
      "5× mining speed",
      "Daily + bonus rewards",
      "Referral boost +5%",
      "24/7 chat support",
      "Early access",
    ],
    featured: true, badge: "Most popular",
  },
  {
    id: 4, name: "Gold", price: 30350,
    rate: "6,250 CUBE/hr", rateVal: 6250.00,
    subscriptionCubes: 250000,
    dailyEarning: 150000,
    dailyNaira: 7500,
    features: [
      "150,000 CUBE daily (₦7,500 value)",
      "9× mining speed",
      "Double daily rewards",
      "Referral boost +10%",
      "VIP support",
      "Custom avatar",
    ],
  },
  {
    id: 5, name: "Diamond", price: 50000,
    rate: "8,166 CUBE/hr", rateVal: 8166.67,
    subscriptionCubes: 300000,
    dailyEarning: 196000,
    dailyNaira: 9800,
    features: [
      "196,000 CUBE daily (₦9,800 value)",
      "17.5× mining speed",
      "Triple daily rewards",
      "Referral boost +20%",
      "Dedicated manager",
      "Priority withdrawals",
      "Lifetime perks",
    ],
  },
];

const BANK = {
  bankName: "Moniepoint Nigeria",
  accountName: "Mara's Treat",
  accountNumber: "7077456282",
  sortCode: "011",
};

// ── Helper: format large cube numbers ─────────────────────────────────────────
function fmtCubes(n) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(n % 1_000_000 === 0 ? 0 : 1) + "M";
  if (n >= 1_000)     return (n / 1_000).toFixed(n % 1_000 === 0 ? 0 : 1) + "K";
  return n.toLocaleString();
}

// ── Cube award badge ──────────────────────────────────────────────────────────
function CubeAwardBadge({ cubes, size = "normal" }) {
  return (
    <div className={`sub-cube-award ${size}`}>
      <span className="sub-cube-award-icon">⬡</span>
      <div className="sub-cube-award-text">
        <span className="sub-cube-award-val">{fmtCubes(cubes)}</span>
        <span className="sub-cube-award-label">CUBE on activation</span>
      </div>
    </div>
  );
}

// ── Step dots ─────────────────────────────────────────────────────────────────
function StepDots({ current }) {
  const steps = [{ n: 1, label: "Details" }, { n: 2, label: "Payment" }, { n: 3, label: "Confirm" }];
  return (
    <div className="sub-steps">
      {steps.map((s, i) => (
        <div key={s.n} className="sub-step-item">
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
            <div className={`sub-step-dot ${current > s.n ? "done" : current === s.n ? "active" : ""}`}>
              {current > s.n ? "✓" : s.n}
            </div>
            <div className="sub-step-label">{s.label}</div>
          </div>
          {i < steps.length - 1 && <div className="sub-step-line" />}
        </div>
      ))}
    </div>
  );
}

// ── Plan card ─────────────────────────────────────────────────────────────────
function PlanCard({ plan, onSelect }) {
  return (
    <div className={`sub-plan ${plan.featured ? "featured" : ""}`}>
      {plan.badge   && <div className="sub-plan-badge">{plan.badge}</div>}
      {plan.current && <div className="sub-current-badge">Current</div>}

      <div className="sub-plan-name">{plan.name}</div>
      <div className="sub-plan-price">₦{plan.price.toLocaleString()} <span>/once</span></div>
      <div className="sub-plan-rate">{plan.rate}</div>

      {/* ── Cube award highlight ── */}
      <CubeAwardBadge cubes={plan.subscriptionCubes} />

      <hr className="sub-plan-divider" />

      <div className="sub-plan-features">
        {plan.features.slice(0, 4).map(f => (
          <div key={f} className="sub-feat">✓ {f}</div>
        ))}
        {plan.features.length > 4 && (
          <div className="sub-feat muted">+{plan.features.length - 4} more</div>
        )}
      </div>

      <button
        className={`sub-plan-btn ${plan.featured ? "featured-btn" : "default-btn"}`}
        onClick={() => onSelect(plan)}
      >
        Get {plan.name}
      </button>
    </div>
  );
}

// ── Step 1 ────────────────────────────────────────────────────────────────────
function Step1({ plan, onNext }) {
  return (
    <>
      <div className="sub-plan-label">{plan.name} plan</div>
      <div className="sub-sheet-price">₦{plan.price.toLocaleString()} <span>one-time</span></div>
      <StepDots current={1} />

      {/* Cube award — prominent on step 1 */}
      <CubeAwardBadge cubes={plan.subscriptionCubes} size="large" />

      <div className="sub-section-title">What you get</div>
      <div className="sub-features-full">
        {plan.features.map(f => <div key={f} className="sub-feat">✓ {f}</div>)}
      </div>

      <div className="sub-rate-box">
        <div>
          <div className="sub-rate-box-label">Mining rate</div>
          <div className="sub-rate-box-val">{plan.rate}</div>
        </div>
      </div>

      <button className="sub-confirm-btn" onClick={onNext}>
        Proceed to payment →
      </button>
    </>
  );
}

// ── Step 2 ────────────────────────────────────────────────────────────────────
function Step2({ plan, txRef, onNext }) {
  const [copied, setCopied] = useState(false);

  const copyAccNumber = () => {
    navigator.clipboard?.writeText(BANK.accountNumber).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <>
      <div className="sub-plan-label">{plan.name} plan</div>
      <div className="sub-sheet-price">₦{plan.price.toLocaleString()} <span>one-time</span></div>
      <StepDots current={2} />

      <div className="sub-amount-highlight">
        <p>Transfer exactly this amount</p>
        <h2>₦{plan.price.toLocaleString()}</h2>
      </div>

      {/* Compact cube reminder */}
      <div className="sub-cube-reminder">
        <span className="sub-cube-reminder-icon">⬡</span>
        You'll receive <strong>{fmtCubes(plan.subscriptionCubes)} CUBE</strong> once payment is verified
      </div>

      <div className="sub-section-title">Bank transfer details</div>
      <div className="sub-bank-card">
        {[
          ["Bank name",      BANK.bankName],
          ["Account name",   BANK.accountName],
          ["Account number", BANK.accountNumber],
          ["Sort code",      BANK.sortCode],
        ].map(([label, val]) => (
          <div key={label} className="sub-bank-row">
            <span className="sub-bank-label">{label}</span>
            <span className="sub-bank-val">
              {val}
              {label === "Account number" && (
                <button className="sub-copy-mini" onClick={copyAccNumber}>
                  {copied ? "Copied!" : "Copy"}
                </button>
              )}
            </span>
          </div>
        ))}
      </div>

      <div className="sub-notice">
        ⚠ Use your phone number or email as the transfer narration so we can identify your payment.
      </div>

      <div className="sub-ref-field">
        <label>Payment reference (auto-generated)</label>
        <input type="text" value={txRef} readOnly style={{ color: "#4ade80", letterSpacing: 1 }} />
      </div>

      <button className="sub-confirm-btn" onClick={onNext}>
        I have made this transfer ✓
      </button>
    </>
  );
}

// ── Step 3 ────────────────────────────────────────────────────────────────────
function Step3({ plan, txRef, onSubmit }) {
  const [name,    setName]    = useState("");
  const [contact, setContact] = useState("");
  const [errors,  setErrors]  = useState({});
  const [receipt, setReceipt] = useState(null);

  const handleSubmit = () => {
    const errs = {};
    if (!name.trim())    errs.name    = true;
    if (!contact.trim()) errs.contact = true;
    if (!receipt)        errs.receipt = true;
    if (Object.keys(errs).length) { setErrors(errs); return; }
    onSubmit(name, contact, receipt);
  };

  return (
    <>
      <div className="sub-plan-label">{plan.name} plan</div>
      <StepDots current={3} />

      <div className="sub-section-title">Confirm your payment</div>

      {/* Summary including cubes */}
      <div className="sub-bank-card" style={{ marginBottom: 14 }}>
        {[
          ["Plan",             plan.name],
          ["Amount",           `₦${plan.price.toLocaleString()}`],
          ["Reference",        txRef],
          ["Mining rate",      plan.rate],
          ["Subscription CUBE", `${fmtCubes(plan.subscriptionCubes)} CUBE`],
        ].map(([l, v]) => (
          <div key={l} className="sub-bank-row">
            <span className="sub-bank-label">{l}</span>
            <span
              className="sub-bank-val"
              style={
                l === "Amount" || l === "Mining rate" || l === "Subscription CUBE"
                  ? { color: "#4ade80" }
                  : {}
              }
            >
              {v}
            </span>
          </div>
        ))}
      </div>

      <div className="sub-ref-field">
        <label>Your full name *</label>
        <input
          type="text"
          placeholder="Name as used on bank account"
          value={name}
          onChange={e => setName(e.target.value)}
          style={errors.name ? { borderColor: "rgba(229,57,53,.6)" } : {}}
        />
      </div>

      <div className="sub-ref-field">
        <label>Your phone / email *</label>
        <input
          type="text"
          placeholder="Used as transfer narration"
          value={contact}
          onChange={e => setContact(e.target.value)}
          style={errors.contact ? { borderColor: "rgba(229,57,53,.6)" } : {}}
        />
      </div>

      <div className="sub-ref-field">
        <label>Payment Receipt *</label>
        <input
          type="file"
          accept="image/*,.pdf"
          onChange={e => setReceipt(e.target.files[0])}
          style={errors.receipt ? { borderColor: "rgba(229,57,53,.6)" } : {}}
        />
        {errors.receipt && (
          <span style={{ fontSize: 11, color: "rgba(229,57,53,.8)", marginTop: 4, display: "block" }}>
            Please attach your payment receipt
          </span>
        )}
      </div>

      <div className="sub-notice" style={{ marginBottom: 20 }}>
        ⏱ Your plan activates within 1–3 hours after payment is verified. You will receive a confirmation.
      </div>

      <button className="sub-confirm-btn" onClick={handleSubmit}>
        Submit confirmation →
      </button>
    </>
  );
}

// ── Success screen ────────────────────────────────────────────────────────────
function SuccessScreen({ plan, txRef, userName, onClose }) {
  return (
    <div className="sub-success-wrap">
      <div className="sub-success-icon">🎉</div>
      <h3>Payment submitted!</h3>
      <p>
        Thank you, <strong style={{ color: "#fff" }}>{userName}</strong>.
        Your <strong style={{ color: "#4ade80" }}>{plan.name}</strong> plan is being activated.
        We'll verify your transfer of <strong style={{ color: "#fff" }}>₦{plan.price.toLocaleString()}</strong> and notify you within 1–3 hours.
      </p>

      {/* Cube award reminder on success */}
      <div className="sub-success-cube-box">
        <div className="sub-success-cube-icon">⬡</div>
        <div>
          <div className="sub-success-cube-val">{fmtCubes(plan.subscriptionCubes)} CUBE</div>
          <div className="sub-success-cube-label">will be credited to your wallet on activation</div>
        </div>
      </div>

      <div className="sub-ref-box">
        <div className="sub-ref-box-label">Your reference</div>
        <div className="sub-ref-box-val">{txRef}</div>
      </div>

      <button className="sub-confirm-btn" onClick={onClose}>Done</button>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function SubscriptionPage() {
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [step,         setStep]         = useState(1);
  const [txRef]                         = useState("CUBE" + Date.now().toString().slice(-8));
  const [userName,     setUserName]     = useState("");
  const [success,      setSuccess]      = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const checkProfile = async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData?.user) { navigate("/login"); return; }

      const { data: profile } = await supabase
        .from("profiles")
        .select("subscription_status")
        .eq("id", userData.user.id)
        .maybeSingle();

      if (profile?.subscription_status === "approved") navigate("/dashboard");
    };
    checkProfile();
  }, []);

  const openPlan  = (plan) => { setSelectedPlan(plan); setStep(1); setSuccess(false); };
  const closeSheet = () => { setSelectedPlan(null); setSuccess(false); setStep(1); };

  const handleSubmit = async (name, contact, receipt) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { toast.error("Please login first"); return; }

      let receiptUrl = null;

      if (receipt) {
        const fileExt  = receipt.name.split(".").pop();
        const filePath = `receipts/${Date.now()}-${Math.random()}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from("payment-receipts")
          .upload(filePath, receipt);

        if (uploadError) { toast.error(uploadError.message); return; }

        const { data } = supabase.storage
          .from("payment-receipts")
          .getPublicUrl(filePath);

        receiptUrl = data.publicUrl;
      }

      const { error } = await supabase
        .from("subscriptions")
        .insert([{
          user_id:            user.id,
          full_name:          name,
          contact,
          plan_name:          selectedPlan.name,
          amount:             selectedPlan.price,
          tx_ref:             txRef,
          payment_status:     "pending",
          plan_status:        "pending",
          mining_rate:        selectedPlan.rateVal,
          // ── new column ──────────────────────────────
          subscription_cubes: selectedPlan.subscriptionCubes,
          // ────────────────────────────────────────────
          approved_by:        null,
          approved_at:        null,
          activated_at:       null,
          receipt_url:        receiptUrl,
        }]);

      if (error) { toast.error(error.message); return; }

      await supabase
        .from("profiles")
        .update({ subscription_status: "pending" })
        .eq("id", user.id);

      toast.success("Payment submitted! Waiting for admin verification 🚀");
      setUserName(name);
      setSuccess(true);

      setTimeout(() => navigate("/subscription-status"), 1500);

    } catch (err) {
      console.error(err);
      toast.error("Something went wrong");
    }
  };

  return (
    <div className="sub-page">
      <div className="sub-hdr">
        <h1>Choose your mining plan</h1>
        <p>Upgrade to mine faster and earn more CUBE daily</p>
      </div>

      <div className="sub-plans-grid">
        {PLANS.map(p => (
          <PlanCard key={p.id} plan={p} onSelect={openPlan} />
        ))}
      </div>

      {selectedPlan && (
        <div
          className="sub-overlay"
          onClick={e => e.target === e.currentTarget && closeSheet()}
        >
          <div className="sub-sheet">
            <button className="sub-sheet-close" onClick={closeSheet} aria-label="Close">×</button>

            {success ? (
              <SuccessScreen
                plan={selectedPlan}
                txRef={txRef}
                userName={userName}
                onClose={closeSheet}
              />
            ) : step === 1 ? (
              <Step1 plan={selectedPlan} onNext={() => setStep(2)} />
            ) : step === 2 ? (
              <Step2 plan={selectedPlan} txRef={txRef} onNext={() => setStep(3)} />
            ) : (
              <Step3 plan={selectedPlan} txRef={txRef} onSubmit={handleSubmit} />
            )}
          </div>
        </div>
      )}

      <ToastContainer position="top-right" autoClose={3000} theme="dark" />
    </div>
  );
}