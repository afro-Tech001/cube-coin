import { useState, useEffect, useRef } from "react";
import { useNavigate }                  from "react-router-dom";
import { supabase }                     from "../../libs/supabase";
import { toast, ToastContainer }        from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import "./Profilesetup.css"

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────
const PLAN_PILL_CLASS = {
  Silver: "silver", Gold: "gold", Bronze: "bronze",
  Diamond: "diamond", Starter: "starter",
};

function formatNaira(n) {
  return "₦" + Number(n).toLocaleString();
}

// ─────────────────────────────────────────────────────────────────────────────
// Mini CubeCoin logo SVG (header)
// ─────────────────────────────────────────────────────────────────────────────
function CubeLogoSVG() {
  return (
    <svg className="ps-logo-svg" viewBox="0 0 28 28" fill="none">
      <defs>
        <linearGradient id="ps-tf" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#b9ffc1" /><stop offset="100%" stopColor="#4ade80" />
        </linearGradient>
        <linearGradient id="ps-lf" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#4ade80" /><stop offset="100%" stopColor="#166534" />
        </linearGradient>
        <linearGradient id="ps-rf" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#22c55e" /><stop offset="100%" stopColor="#0d4a24" />
        </linearGradient>
      </defs>
      <g className="ps-cl-top">
        <polygon points="14,2 18.5,4.5 18.5,9.5 14,12 9.5,9.5 9.5,4.5" fill="url(#ps-tf)" />
        <polygon points="14,2 18.5,4.5 14,7 9.5,4.5" fill="#d4ffda" opacity="0.7" />
        <polygon points="14,7 18.5,4.5 18.5,9.5 14,12" fill="url(#ps-rf)" />
        <polygon points="14,7 9.5,4.5 9.5,9.5 14,12" fill="url(#ps-lf)" />
      </g>
      <g className="ps-cl-left">
        <polygon points="8,15 12.5,17.5 12.5,22.5 8,25 3.5,22.5 3.5,17.5" fill="url(#ps-tf)" />
        <polygon points="8,15 12.5,17.5 8,20 3.5,17.5" fill="#d4ffda" opacity="0.7" />
        <polygon points="8,20 12.5,17.5 12.5,22.5 8,25" fill="url(#ps-rf)" />
        <polygon points="8,20 3.5,17.5 3.5,22.5 8,25" fill="url(#ps-lf)" />
      </g>
      <g className="ps-cl-right">
        <polygon points="20,15 24.5,17.5 24.5,22.5 20,25 15.5,22.5 15.5,17.5" fill="url(#ps-tf)" />
        <polygon points="20,15 24.5,17.5 20,20 15.5,17.5" fill="#d4ffda" opacity="0.7" />
        <polygon points="20,20 24.5,17.5 24.5,22.5 20,25" fill="url(#ps-rf)" />
        <polygon points="20,20 15.5,17.5 15.5,22.5 20,25" fill="url(#ps-lf)" />
      </g>
    </svg>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Spinning 3-D cube shown on the welcome screen
// ─────────────────────────────────────────────────────────────────────────────
function WelcomeCube() {
  const FaceLogo = () => (
    <svg className="ps-face-logo" viewBox="0 0 38 38" fill="none">
      <defs>
        <linearGradient id="wc-tf" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#b9ffc1" /><stop offset="100%" stopColor="#4ade80" />
        </linearGradient>
        <linearGradient id="wc-lf" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#4ade80" /><stop offset="100%" stopColor="#166534" />
        </linearGradient>
        <linearGradient id="wc-rf" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#22c55e" /><stop offset="100%" stopColor="#0d4a24" />
        </linearGradient>
      </defs>
      <g className="ps-face-cl-top">
        <polygon points="19,2 24.5,5 24.5,11 19,14 13.5,11 13.5,5" fill="url(#wc-tf)" />
        <polygon points="19,2 24.5,5 19,8 13.5,5" fill="#d4ffda" opacity="0.75" />
        <polygon points="19,8 24.5,5 24.5,11 19,14" fill="url(#wc-rf)" />
        <polygon points="19,8 13.5,5 13.5,11 19,14" fill="url(#wc-lf)" />
      </g>
      <g className="ps-face-cl-left">
        <polygon points="11,18 16.5,21 16.5,27 11,30 5.5,27 5.5,21" fill="url(#wc-tf)" />
        <polygon points="11,18 16.5,21 11,24 5.5,21" fill="#d4ffda" opacity="0.75" />
        <polygon points="11,24 16.5,21 16.5,27 11,30" fill="url(#wc-rf)" />
        <polygon points="11,24 5.5,21 5.5,27 11,30" fill="url(#wc-lf)" />
      </g>
      <g className="ps-face-cl-right">
        <polygon points="27,18 32.5,21 32.5,27 27,30 21.5,27 21.5,21" fill="url(#wc-tf)" />
        <polygon points="27,18 32.5,21 27,24 21.5,21" fill="#d4ffda" opacity="0.75" />
        <polygon points="27,24 32.5,21 32.5,27 27,30" fill="url(#wc-rf)" />
        <polygon points="27,24 21.5,21 21.5,27 27,30" fill="url(#wc-lf)" />
      </g>
    </svg>
  );

  return (
    <div className="ps-welcome-cube-wrap">
      <div className="ps-wc-glow" />
      <div className="ps-welcome-cube">
        <div className="ps-face ps-face-front" style={{ display:"flex", alignItems:"center", justifyContent:"center" }}>
          <FaceLogo />
        </div>
        <div className="ps-face ps-face-back" />
        <div className="ps-face ps-face-left" />
        <div className="ps-face ps-face-right" />
        <div className="ps-face ps-face-top" />
        <div className="ps-face ps-face-bottom" />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Progress header
// ─────────────────────────────────────────────────────────────────────────────
function StepHeader({ step }) {
  const FILLS = { 1: "0%", 2: "50%", 3: "100%" };
  const STEPS = [
    { n: 1, label: "Plan" },
    { n: 2, label: "Profile" },
    { n: 3, label: "Welcome" },
  ];
  return (
    <div className="ps-step-header">
      <div className="ps-logo-row">
        <CubeLogoSVG />
        <span className="ps-logo-name">
          <span className="ps-logo-cube">CUBE</span>
          <span className="ps-logo-coin"> COIN</span>
        </span>
      </div>

      <div className="ps-progress-track">
        <div className="ps-progress-line" />
        <div className="ps-progress-fill" style={{ width: FILLS[step] }} />
        {STEPS.map((s) => {
          const state = step > s.n ? "done" : step === s.n ? "active" : "";
          return (
            <div key={s.n} className={`ps-step-node ${state}`}>
              <div className={`ps-step-circle ${state}`}>
                {step > s.n ? "✓" : s.n}
              </div>
              <div className="ps-step-name">{s.label}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Step 1 — Plan summary
// ─────────────────────────────────────────────────────────────────────────────
function Step1({ sub, onNext, onSkip }) {
  const firstName = (sub.full_name || "Miner").split(" ")[0];
  const pillClass = PLAN_PILL_CLASS[sub.plan_name] || "starter";

  return (
    <div className="step-enter">
      <div className="ps-greeting">
        <div className="ps-greeting-eyebrow">
          <span className="ps-eyebrow-dot" />
          Account Approved
        </div>
        <div className="ps-greeting-title">
          Welcome back,<br />{firstName} 👋
        </div>
        <div className="ps-greeting-sub">
          Your subscription is active. Let's set up your miner profile before you dive in.
        </div>
      </div>

      <div className="ps-plan-summary">
        {/* Plan name row */}
        <div className="ps-plan-summary-full">
          <div className="ps-ps-label">Active Plan</div>
          <div style={{ display:"flex", alignItems:"center", gap:10, marginTop:4 }}>
            <span className={`plan-pill ${pillClass}`}>{sub.plan_name?.toUpperCase()}</span>
            <span className="ps-ps-val" style={{ fontSize:13 }}>{sub.plan_name} Mining Package</span>
          </div>
        </div>

        {/* Amount */}
        <div>
          <div className="ps-ps-label">Amount Paid</div>
          <div className="ps-ps-val amber">{formatNaira(sub.amount)}</div>
        </div>

        {/* Tx ref */}
        <div>
          <div className="ps-ps-label">Tx Reference</div>
          <div className="ps-ps-val green">{sub.tx_ref}</div>
        </div>

        {/* Payment status */}
        <div>
          <div className="ps-ps-label">Payment Status</div>
          <span className="status-active">
            <span className="status-active-pip" />
            {sub.payment_status?.toUpperCase()}
          </span>
        </div>

        {/* Plan status */}
        <div>
          <div className="ps-ps-label">Plan Status</div>
          <span className="status-active">
            <span className="status-active-pip" />
            {sub.plan_status?.toUpperCase()}
          </span>
        </div>

        {/* Mining rate — full width */}
        <div className="ps-plan-summary-full" style={{ borderTop:"1px solid rgba(74,222,128,0.12)", paddingTop:12 }}>
          <div className="ps-mining-rate-label">Your Mining Rate</div>
          <div className="ps-mining-rate-big">
            {Number(sub.mining_rate).toFixed(2)} CUBE/hr
          </div>
        </div>
      </div>

      <button className="ps-cta" onClick={onNext}>Set Up My Profile →</button>
      <button className="ps-skip"  onClick={onSkip}>Skip for now</button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Step 2 — Avatar + profile fields
// ─────────────────────────────────────────────────────────────────────────────
function Step2({ sub, onSave, onSkip }) {
  const [avatarFile,   setAvatarFile]   = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [name,     setName]     = useState(sub.full_name || "");
  const [username, setUsername] = useState("");
  const [phone,    setPhone]    = useState("");
  const [country,  setCountry]  = useState("NG");
  const [bio,      setBio]      = useState("");
  const [errors,   setErrors]   = useState({});
  const [saving,   setSaving]   = useState(false);
  const [copied, setCopied] = useState(false);

const handleCopy = async () => {
  try {
    await navigator.clipboard.writeText(sub.tx_ref);

    setCopied(true);

    setTimeout(() => {
      setCopied(false);
    }, 2000);
  } catch (err) {
    console.log(err);
  }
};
  const fileInputRef = useRef(null);

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setAvatarFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setAvatarPreview(ev.target.result);
    reader.readAsDataURL(file);
  };

  const validate = () => {
    const errs = {};
    if (!name.trim())     errs.name     = true;
    if (!username.trim()) errs.username = true;
    if (!phone.trim())    errs.phone    = true;
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    await onSave({ name, username, phone, country, bio, avatarFile });
    setSaving(false);
  };

  return (
    <div className="step-enter">
      {/* Avatar picker */}
      <div className="ps-avatar-section">
        <div className="ps-avatar-ring" onClick={() => fileInputRef.current?.click()} title="Upload photo">
          {avatarPreview
            ? <img src={avatarPreview} className="ps-avatar-img visible" alt="Profile" />
            : <div className="ps-avatar-placeholder">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
                <span>Photo</span>
              </div>
          }
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          style={{ display:"none" }}
          onChange={handleAvatarChange}
        />
        <div className="ps-avatar-hint">Tap to add a profile photo</div>
      </div>

      {/* Fields */}
      <div className="ps-field-group">
        <div className="ps-field">
          <label>Full Name</label>
          <input
            type="text"
            value={name}
            placeholder="Your full name"
            className={errors.name ? "error" : ""}
            onChange={(e) => { setName(e.target.value); setErrors((p) => ({ ...p, name: false })); }}
          />
        </div>

        <div className="ps-field-row">
          <div className="ps-field">
            <label>Username</label>
            <input
              type="text"
              value={username}
              placeholder="@minertag"
              className={errors.username ? "error" : ""}
              onChange={(e) => { setUsername(e.target.value); setErrors((p) => ({ ...p, username: false })); }}
            />
          </div>
          <div className="ps-field">
            <label>Country</label>
            <select value={country} onChange={(e) => setCountry(e.target.value)}>
              <option value="NG">Nigeria</option>
              <option value="GH">Ghana</option>
              <option value="KE">Kenya</option>
              <option value="ZA">South Africa</option>
              <option value="SG">Singapore</option>
              <option value="US">United States</option>
              <option value="UK">United Kingdom</option>
              <option value="OTHER">Other</option>
            </select>
          </div>
        </div>

        <div className="ps-field">
          <label>Phone Number</label>
          <input
            type="tel"
            value={phone}
            placeholder="+234 800 000 0000"
            className={errors.phone ? "error" : ""}
            onChange={(e) => { setPhone(e.target.value); setErrors((p) => ({ ...p, phone: false })); }}
          />
        </div>

        <div className="ps-field">
          <label>
            Short Bio <span className="optional">(optional)</span>
          </label>
          <textarea
            value={bio}
            placeholder="Tell the community a little about yourself…"
            onChange={(e) => setBio(e.target.value)}
          />
        </div>

        <div className="ps-field">
  <label>Referral / Tx Reference</label>

    <div className="ps-copy-wrapper">
  <input
    type="text"
    value={sub.tx_ref}
    readOnly
    className="ps-ref-readonly"
  />

  <button
    type="button"
    onClick={handleCopy}
    className={`ps-copy-btn ${copied ? "copied" : ""}`}
  >
    {copied ? "✓ Copied" : "Copy"}
  </button>
</div>
</div>
      </div>

      <button className="ps-cta" onClick={handleSave} disabled={saving}>
        {saving ? <><span className="ps-cta-spinner" />Saving…</> : "Save & Continue →"}
      </button>
      <button className="ps-skip" onClick={onSkip}>Skip profile setup</button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Step 3 — Welcome / launch screen
// ─────────────────────────────────────────────────────────────────────────────
function Step3({ sub, profileName, onEnter, cardRef }) {
  const displayName = profileName || sub.full_name || "Miner";
  const firstName   = displayName.split(" ")[0];
  const dailyEst    = (Number(sub.mining_rate) * 24).toFixed(2);

  // Spawn particles
  useEffect(() => {
    const card = cardRef?.current;
    if (!card) return;
    const particles = [];
    for (let i = 0; i < 14; i++) {
      const t = setTimeout(() => {
        const p = document.createElement("div");
        p.className = "ps-particle";
        p.style.cssText = [
          `left:${Math.random() * 100}%`,
          `bottom:${Math.random() * 20}%`,
          `width:${Math.random() * 4 + 2}px`,
          `height:${Math.random() * 4 + 2}px`,
          `animation-duration:${Math.random() * 6 + 5}s`,
          `animation-delay:${Math.random() * 3}s`,
        ].join(";");
        card.appendChild(p);
        particles.push(p);
      }, i * 200);
      particles.push({ isTimer: true, t });
    }
    return () => {
      particles.forEach((p) => {
        if (p.isTimer) clearTimeout(p.t);
        else p.remove?.();
      });
    };
  }, [cardRef]);

  return (
    <div className="step-enter ps-welcome">
      <WelcomeCube />

      <div className="ps-welcome-badge">
        <span className="ps-welcome-badge-dot" />
        <span className="ps-welcome-badge-text">Miner Online</span>
      </div>

      <div className="ps-welcome-title">
        You're live,<br />
        <span className="ps-welcome-name">{firstName}.</span>
      </div>

      <div className="ps-welcome-sub">
        Your <strong style={{ color:"#e8ffe6" }}>{sub.plan_name}</strong> rig is spinning up.
        Every hour you're active,{" "}
        <strong style={{ color:"#4ade80" }}>{Number(sub.mining_rate).toFixed(2)} CUBE</strong> lands in your wallet.
      </div>

      <div className="ps-welcome-stats">
        <div className="ps-ws-card">
          <div className="ps-ws-label">Mining Rate</div>
          <div className="ps-ws-val">{Number(sub.mining_rate).toFixed(2)}/hr</div>
          <div className="ps-ws-sub">CUBE earned</div>
        </div>
        <div className="ps-ws-card">
          <div className="ps-ws-label">Daily Est.</div>
          <div className="ps-ws-val">{dailyEst}</div>
          <div className="ps-ws-sub">CUBE / day</div>
        </div>
        <div className="ps-ws-card">
          <div className="ps-ws-label">Your Plan</div>
          <div className="ps-ws-val" style={{ fontSize:11 }}>{sub.plan_name?.toUpperCase()}</div>
          <div className="ps-ws-sub">Active now</div>
        </div>
      </div>

      <div className="ps-welcome-notice">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        </svg>
        <p>
          Your wallet is secured and mining rewards accrue automatically.
          Check your dashboard any time to track earnings, claim rewards, and level up your plan.
        </p>
      </div>

      <button className="ps-cta" onClick={onEnter}>Enter Dashboard →</button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main export
// ─────────────────────────────────────────────────────────────────────────────
export default function ProfileSetup() {
  const navigate = useNavigate();
  const cardRef  = useRef(null);

  const [step,        setStep]        = useState(1);
  const [sub,         setSub]         = useState(null);
  const [profileName, setProfileName] = useState("");
  const [loading,     setLoading]     = useState(true);

  // ── Fetch subscription data on mount ──────────────────────────────────────
  useEffect(() => {
    const fetchData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate("/login"); return; }

      // Pull the most recent approved subscription row
      const { data, error } = await supabase
        .from("subscriptions")
        .select("full_name,plan_name,amount,mining_rate,tx_ref,payment_status,plan_status,activated_at")
        .eq("user_id", user.id)
        .eq("payment_status", "approved")
        .order("activated_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error || !data) {
        toast.error("Could not load your subscription. Please contact support.");
        navigate("/subscription");
        return;
      }

      setSub(data);
      setLoading(false);
    };

    fetchData();
  }, [navigate]);

  // ── Save profile handler ──────────────────────────────────────────────────
  const handleSaveProfile = async ({ name, username, phone, country, bio, avatarFile }) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      let avatarUrl = null;

      // Upload avatar if provided
      if (avatarFile) {
        const ext      = avatarFile.name.split(".").pop();
        const filePath = `avatars/${user.id}.${ext}`;
        const { error: uploadErr } = await supabase.storage
          .from("profile-photos")
          .upload(filePath, avatarFile, { upsert: true });

        if (uploadErr) { toast.error(uploadErr.message); return; }

        const { data: urlData } = supabase.storage
          .from("profile-photos")
          .getPublicUrl(filePath);
        avatarUrl = urlData.publicUrl;
      }

      // Upsert profile row
      const { error: profileErr } = await supabase
        .from("profiles")
        .update({
          full_name:  name,
          username:   username.replace(/^@/, ""),
          phone,
          country,
          bio,
          avatar_url: avatarUrl,
          profile_completed: true,
        })
        .eq("id", user.id);

      if (profileErr) { toast.error(profileErr.message); return; }

      toast.success("Profile saved!");
      setProfileName(name);
      setStep(3);
    } catch (err) {
      console.error(err);
      toast.error("Something went wrong saving your profile.");
    }
  };

  const handleSkip = () => {
    setProfileName(sub?.full_name || "");
    setStep((s) => (s === 1 ? 3 : 3));
  };

  const handleEnterDashboard = () => navigate("/dashboard");

  // ── Loading skeleton ──────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="ps-page">
        <div className="ps-orb ps-orb-1" />
        <div className="ps-orb ps-orb-2" />
        <div className="ps-card" style={{ padding:40, textAlign:"center" }}>
          <span className="ps-cta-spinner" style={{ width:20, height:20, borderWidth:2.5 }} />
          <p style={{ color:"var(--muted)", marginTop:16, fontSize:13 }}>Loading your plan details…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="ps-page">
      <div className="ps-orb ps-orb-1" />
      <div className="ps-orb ps-orb-2" />

      <div className="ps-card" ref={cardRef}>
        <StepHeader step={step} />

        <div className="ps-body">
          {step === 1 && (
            <Step1
              sub={sub}
              onNext={() => setStep(2)}
              onSkip={handleSkip}
            />
          )}
          {step === 2 && (
            <Step2
              sub={sub}
              onSave={handleSaveProfile}
              onSkip={handleSkip}
            />
          )}
          {step === 3 && (
            <Step3
              sub={sub}
              profileName={profileName}
              onEnter={handleEnterDashboard}
              cardRef={cardRef}
            />
          )}
        </div>
      </div>

      <ToastContainer position="top-right" autoClose={3000} theme="dark" />
    </div>
  );
}