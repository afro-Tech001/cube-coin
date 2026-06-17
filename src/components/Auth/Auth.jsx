import { useState } from "react";
import "./Auth.css";
import { supabase } from "../../libs/supabase";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { useNavigate } from "react-router-dom";

function CubeSVG() {
  return (
    <svg className="cube-svg" viewBox="0 0 88 88" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="cubeTopFace" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#b9ffc1" />
          <stop offset="100%" stopColor="#4ade80" />
        </linearGradient>
        <linearGradient id="cubeLeftFace" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#4ade80" />
          <stop offset="100%" stopColor="#166534" />
        </linearGradient>
        <linearGradient id="cubeRightFace" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#22c55e" />
          <stop offset="100%" stopColor="#0d4a24" />
        </linearGradient>
      </defs>
      <g className="cube-top">
        <polygon points="44,4 57,11.5 57,26.5 44,34 31,26.5 31,11.5" fill="url(#cubeTopFace)" />
        <polygon points="44,4 57,11.5 44,19 31,11.5" fill="#d4ffda" opacity="0.7" />
        <polygon points="44,19 57,11.5 57,26.5 44,34" fill="url(#cubeRightFace)" />
        <polygon points="44,19 31,11.5 31,26.5 44,34" fill="url(#cubeLeftFace)" />
      </g>
      <g className="cube-left">
        <polygon points="27,40 40,47.5 40,62.5 27,70 14,62.5 14,47.5" fill="url(#cubeTopFace)" />
        <polygon points="27,40 40,47.5 27,55 14,47.5" fill="#d4ffda" opacity="0.7" />
        <polygon points="27,55 40,47.5 40,62.5 27,70" fill="url(#cubeRightFace)" />
        <polygon points="27,55 14,47.5 14,62.5 27,70" fill="url(#cubeLeftFace)" />
      </g>
      <g className="cube-right">
        <polygon points="61,40 74,47.5 74,62.5 61,70 48,62.5 48,47.5" fill="url(#cubeTopFace)" />
        <polygon points="61,40 74,47.5 61,55 48,47.5" fill="#d4ffda" opacity="0.7" />
        <polygon points="61,55 74,47.5 74,62.5 61,70" fill="url(#cubeRightFace)" />
        <polygon points="61,55 48,47.5 48,62.5 61,70" fill="url(#cubeLeftFace)" />
      </g>
    </svg>
  );
}

function GoogleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  );
}

function AppleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
    </svg>
  );
}

function getPwdStrength(pwd) {
  if (!pwd) return 0;
  let s = 0;
  if (pwd.length >= 8) s++;
  if (/[A-Z]/.test(pwd)) s++;
  if (/[0-9]/.test(pwd)) s++;
  if (/[^A-Za-z0-9]/.test(pwd)) s++;
  return s;
}

// ── Retry helper: polls until profile row exists, then writes referred_by_code ──
// ── Retry helper ──────────────────────────────────────────────────────────────
async function writeReferredByCode(userId, code, maxAttempts = 10) {
  for (let i = 0; i < maxAttempts; i++) {
    await new Promise(res => setTimeout(res, 600 * (i + 1)));

    const { data: existing } = await supabase
      .from("profiles")
      .select("id, referred_by_code")
      .eq("id", userId)
      .maybeSingle();

    if (!existing) {
      console.log(`Profile row not ready yet, attempt ${i + 1}/${maxAttempts}`);
      continue;
    }

    // Already set — nothing to do
    if (existing.referred_by_code) {
      console.log("referred_by_code already set:", existing.referred_by_code);
      return true;
    }

    const { error } = await supabase
      .from("profiles")
      .update({ referred_by_code: code })
      .eq("id", userId);

    if (error) {
      console.error("Update error:", error);
      continue; // retry
    }

    // Verify
    const { data: verify } = await supabase
      .from("profiles")
      .select("referred_by_code")
      .eq("id", userId)
      .maybeSingle();

    if (verify?.referred_by_code === code) {
      console.log("✅ referred_by_code written:", code);
      return true;
    }
  }
  console.error("❌ Could not write referred_by_code after all attempts");
  return false;
}

export default function Auth() {
  const [tab,      setTab]      = useState("login");
  const [loading,  setLoading]  = useState(false);
  const navigate = useNavigate();

  const [loginData, setLoginData] = useState({ email: "", password: "" });
  const [signupData, setSignupData] = useState({
    firstName: "", lastName: "", email: "",
    password: "", referralCode: "",
  });

  const pwdStrength = getPwdStrength(signupData.password);
  const switchTab = (t) => { if (t !== tab) setTab(t); };
  const handleLoginChange  = (e) => setLoginData(p  => ({ ...p, [e.target.name]: e.target.value }));
  const handleSignupChange = (e) => setSignupData(p => ({ ...p, [e.target.name]: e.target.value }));

  // ── Google OAuth ─────────────────────────────────────────────────────────────
  const handleGoogleLogin = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.origin + "/subscription" },
    });
    if (error) toast.error(error.message);
  };

  // ── Login ─────────────────────────────────────────────────────────────────────
  const handleLogin = async () => {
    if (!loginData.email || !loginData.password) {
      toast.error("Please fill in all fields");
      return;
    }
    try {
      setLoading(true);
      const { data, error } = await supabase.auth.signInWithPassword({
        email:    loginData.email.trim().toLowerCase(),
        password: loginData.password,
      });
      if (error) { toast.error(error.message); return; }

      localStorage.setItem("cubecoin_user", JSON.stringify(data.user));

      const { data: adminData } = await supabase
        .from("admins")
        .select("*")
        .eq("email", data.user.email)
        .maybeSingle();

      if (adminData) {
        toast.success(`Welcome Admin 🚀 (${adminData.role})`);
        localStorage.setItem("cubecoin_admin", JSON.stringify(adminData));
        setTimeout(() => navigate("/admin/dashboard"), 1500);
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", data.user.id)
        .maybeSingle();

      localStorage.setItem("cubecoin_profile", JSON.stringify(profile));
      toast.success(`Welcome back, ${profile?.full_name || data.user.email} 🚀`);

      const subStatus = profile?.subscription_status;
      if (subStatus === "approved") {
        setTimeout(() => navigate("/dashboard"), 1500);
      } else if (subStatus === "pending") {
        setTimeout(() => navigate("/subscription-status"), 1500);
      } else {
        setTimeout(() => navigate("/subscription"), 1500);
      }
    } catch (err) {
      console.error(err);
      toast.error("Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // ── Sign up ───────────────────────────────────────────────────────────────────
  const handleSignup = async () => {
    const { firstName, lastName, email, password, referralCode } = signupData;

    if (!firstName || !lastName || !email || !password) {
      toast.error("Please fill in all required fields");
      return;
    }
    if (password.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }
    if (getPwdStrength(password) < 2) {
      toast.error("Password is too weak — add numbers or symbols");
      return;
    }

    try {
      setLoading(true);

      const fullName        = `${firstName.trim()} ${lastName.trim()}`;
      const trimmedReferral = referralCode.trim().toUpperCase() || null;
   
      // ── Validate referral code against profiles.referral_code ──
let validReferral = null;
if (trimmedReferral) {
  const { data: referrerProfile, error: refErr } = await supabase
    .from("profiles")
    .select("id, referral_code")
    .eq("referral_code", trimmedReferral)
    .maybeSingle();

  if (refErr) {
    console.error("Referral lookup error:", refErr);
    toast.error("Could not verify referral code — try again");
    setLoading(false);
    return;
  }

  if (!referrerProfile) {
    toast.error("Invalid referral code — check and try again");
    setLoading(false);
    return;
  }

  validReferral = trimmedReferral;
  console.log("✅ Valid referral code, referrer id:", referrerProfile.id);
}

// ── Sign up ──
const { data, error } = await supabase.auth.signUp({
  email:    email.trim().toLowerCase(),
  password,
  options: { data: { full_name: fullName } },
});

if (error) { toast.error(error.message); return; }

const newUserId = data.user?.id;

// ── Record referral — fire and forget with retry ──
if (validReferral && newUserId) {
  writeReferredByCode(newUserId, validReferral).then(ok => {
    if (!ok) console.error("Failed to record referral for:", newUserId);
  });
}

if (!data.session) {
  toast.success("Account created! Check your email to confirm, then log in.", { autoClose: 6000 });
  setTab("login");
  return;
}

await new Promise(res => setTimeout(res, 1500));

const { data: profile } = await supabase
  .from("profiles")
  .select("*")
  .eq("id", newUserId)
  .maybeSingle();

localStorage.setItem("cubecoin_user",    JSON.stringify(data.user));
localStorage.setItem("cubecoin_profile", JSON.stringify(profile));
toast.success(`Welcome to CubeCoin, ${firstName}! 🎉`);
setTimeout(() => navigate("/subscription"), 1500);
      

    } catch (err) {
      console.error(err);
      toast.error("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-root">
      <div className="orb orb-1" />
      <div className="orb orb-2" />
      <div className="orb orb-3" />

      <div className="auth-card">
        <div className="logo-area">
          <div className="cube-logo"><CubeSVG /></div>
          <div className="logo-wordmark">
            <span className="logo-cube-text">CUBE</span>
            <span className="logo-coin-text">COIN</span>
          </div>
        </div>

        <div className="tab-switcher">
          <div className={`tab-track ${tab === "signup" ? "right" : "left"}`} />
          <button className={`tab-btn ${tab === "login"  ? "active" : "inactive"}`} onClick={() => switchTab("login")}>Sign In</button>
          <button className={`tab-btn ${tab === "signup" ? "active" : "inactive"}`} onClick={() => switchTab("signup")}>Sign Up</button>
        </div>

        <div className="social-row">
          <button className="social-btn" onClick={handleGoogleLogin}><GoogleIcon /> Google</button>
          <button className="social-btn"><AppleIcon /> Apple</button>
        </div>

        <div className="divider">
          <div className="divider-line" />
          <span className="divider-text">or continue</span>
          <div className="divider-line" />
        </div>

        <div className="panels-wrap">
          <div className={`panels-inner ${tab === "signup" ? "show-signup" : ""}`}>

            {/* ── LOGIN PANEL ── */}
            <div className="panel">
              <div className="field-group">
                <div className="field-wrap">
                  <label className="field-label">Email Address</label>
                  <svg className="field-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                    <polyline points="22,6 12,13 2,6"/>
                  </svg>
                  <input className="field-input" type="email" name="email" placeholder="you@example.com" autoComplete="email" value={loginData.email} onChange={handleLoginChange} />
                </div>
                <div className="field-wrap">
                  <label className="field-label">Password</label>
                  <svg className="field-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                    <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                  </svg>
                  <input className="field-input" type="password" name="password" placeholder="••••••••" autoComplete="current-password" value={loginData.password} onChange={handleLoginChange} />
                  <div className="forgot-row" style={{ marginTop: 8 }}>
                    <span className="forgot-link">Forgot password?</span>
                  </div>
                </div>
              </div>
              <button className={`submit-btn ${loading ? "loading" : ""}`} onClick={handleLogin} disabled={loading}>
                {loading ? <><span className="btn-spinner" />Authenticating…</> : "Sign In to CubeCoin"}
              </button>
              <div className="extra-link">No account yet? <a onClick={() => switchTab("signup")}>Create one free</a></div>
            </div>

            {/* ── SIGNUP PANEL ── */}
            <div className="panel">
              <div className="field-group">
                <div className="field-row">
                  <div className="field-wrap">
                    <label className="field-label">First Name</label>
                    <svg className="field-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                      <circle cx="12" cy="7" r="4"/>
                    </svg>
                    <input className="field-input" type="text" name="firstName" placeholder="John" value={signupData.firstName} onChange={handleSignupChange} />
                  </div>
                  <div className="field-wrap">
                    <label className="field-label">Last Name</label>
                    <svg className="field-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                      <circle cx="12" cy="7" r="4"/>
                    </svg>
                    <input className="field-input" type="text" name="lastName" placeholder="Doe" value={signupData.lastName} onChange={handleSignupChange} />
                  </div>
                </div>

                <div className="field-wrap">
                  <label className="field-label">Email Address</label>
                  <svg className="field-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                    <polyline points="22,6 12,13 2,6"/>
                  </svg>
                  <input className="field-input" type="email" name="email" placeholder="you@example.com" value={signupData.email} onChange={handleSignupChange} />
                </div>

                <div className="field-wrap">
                  <label className="field-label">Referral Code <span style={{ color: "rgba(255,255,255,.3)", fontWeight: 400 }}>(Optional)</span></label>
                  <svg className="field-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
                    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
                  </svg>
                  <input className="field-input" type="text" name="referralCode" placeholder="e.g. CUBE-AB12CD" value={signupData.referralCode} onChange={handleSignupChange} />
                </div>

                <div className="field-wrap">
                  <label className="field-label">Password</label>
                  <svg className="field-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                    <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                  </svg>
                  <input className="field-input" type="password" name="password" placeholder="Min. 8 characters" value={signupData.password} onChange={handleSignupChange} />
                  {signupData.password && (
                    <div className="pwd-strength">
                      {[1,2,3,4].map(i => (
                        <div key={i} className={`pwd-bar ${pwdStrength >= i ? pwdStrength <= 1 ? "weak" : pwdStrength <= 2 ? "medium" : "strong" : ""}`} />
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="checkbox-row" style={{ marginBottom: 16 }}>
                <input type="checkbox" className="custom-checkbox" id="terms" />
                <label className="checkbox-label" htmlFor="terms">
                  I agree to the <a>Terms of Service</a> &amp; <a>Privacy Policy</a>
                </label>
              </div>

              <button className={`submit-btn ${loading ? "loading" : ""}`} onClick={handleSignup} disabled={loading}>
                {loading ? <><span className="btn-spinner" />Creating Account…</> : "Create Account"}
              </button>
              <div className="extra-link">Already have an account? <a onClick={() => switchTab("login")}>Sign in</a></div>
            </div>

          </div>
        </div>

        <div className="security-badge">
          <div className="security-dot" />
          <span className="security-badge-text">256-bit SSL Encrypted · Secure Connection</span>
        </div>
      </div>

      <ToastContainer position="top-right" autoClose={3000} theme="dark" />
    </div>
  );
}