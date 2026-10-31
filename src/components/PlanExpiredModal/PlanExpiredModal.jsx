import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../libs/supabase";
import "./PlanExpiredModal.css";

export default function PlanExpiredModal({ planName, expiredAt }) {
  const navigate = useNavigate();

  // Lock scroll when modal is open
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  const handleResubscribe = async () => {
    // Sign out then redirect to subscription page
    await supabase.auth.signOut();
    localStorage.removeItem("cubecoin_user");
    localStorage.removeItem("cubecoin_profile");
    localStorage.removeItem("cubecoin_admin");
    navigate("/subscription");
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    localStorage.removeItem("cubecoin_user");
    localStorage.removeItem("cubecoin_profile");
    localStorage.removeItem("cubecoin_admin");
    navigate("/login");
  };

  const expiredDateStr = expiredAt
    ? new Date(expiredAt).toLocaleDateString("en-NG", {
        day: "numeric", month: "long", year: "numeric",
      })
    : null;

  return (
    <div className="pem-overlay">
      <div className="pem-card">

        {/* Top glow */}
        <div className="pem-glow" />

        {/* Icon */}
        <div className="pem-icon-wrap">
          <div className="pem-icon">⏰</div>
        </div>

        {/* Title */}
        <h2 className="pem-title">Plan Expired</h2>
        <p className="pem-subtitle">
          Your <strong style={{ color:"#fff" }}>{planName || "CubeCoin"}</strong> plan
          {expiredDateStr ? ` expired on ${expiredDateStr}` : " has expired"}.
        </p>

        {/* Info box */}
        <div className="pem-info-box">
          <div className="pem-info-row">
            <span className="pem-info-icon">⛏</span>
            <span>Mining has been paused on your account</span>
          </div>
          <div className="pem-info-row">
            <span className="pem-info-icon">💰</span>
            <span>Your balance is safe and waiting for you</span>
          </div>
          <div className="pem-info-row">
            <span className="pem-info-icon">🔄</span>
            <span>Resubscribe to continue mining and earning</span>
          </div>
        </div>

        {/* Plan options hint */}
        <div className="pem-plans-hint">
          <div className="pem-plans-title">Plans start from</div>
          <div className="pem-plans-row">
            {[
              { name:"Basic",   price:"₦5,600" },
              { name:"Silver",  price:"₦22,500" },
              { name:"Diamond", price:"₦50,000" },
            ].map(p => (
              <div key={p.name} className="pem-plan-chip">
                <span className="pem-plan-name">{p.name}</span>
                <span className="pem-plan-price">{p.price}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Actions */}
        <button className="pem-resubscribe-btn" onClick={handleResubscribe}>
          🚀 Resubscribe Now
        </button>

        <button className="pem-signout-btn" onClick={handleSignOut}>
          Sign out
        </button>

        <p className="pem-footer">
          Questions? Contact our support team.
        </p>
      </div>
    </div>
  );
}