import { useEffect, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { supabase } from "../../libs/supabase";
import "./ProtectedRoute.css";

export default function ProtectedRoute({
  children,
  requireSubscription = false,
}) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [verification, setVerification] = useState({ userId: null, status: "loading" });
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    if (!requireSubscription || !user?.id) return;

    let active = true;

    const checkSubscription = async () => {
      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("subscription_status")
          .eq("id", user.id)
          .maybeSingle();

        if (error) throw error;

        if (active) {
          setVerification({
            userId: user.id,
            status: data?.subscription_status || "unapproved",
          });
        }
      } catch (error) {
        console.error("Could not verify subscription status:", error);
        if (active) setVerification({ userId: user.id, status: "error" });
      }
    };

    checkSubscription();

    return () => {
      active = false;
    };
  }, [requireSubscription, user?.id, retry]);

  if (!user) {
    return <Navigate to="/" />;
  }

  if (requireSubscription) {
    const status = verification.userId === user.id ? verification.status : "loading";

    if (status !== "approved" && status !== "expired") {
      return (
        <>
          {children}
          <div className="subscription-gate-overlay">
            <section className="subscription-gate-modal" role="dialog" aria-modal="true" aria-labelledby="subscription-gate-title">
              <div className="subscription-gate-icon" aria-hidden="true">🔒</div>
              {status === "loading" ? (
                <>
                  <h2 id="subscription-gate-title">Checking your account…</h2>
                  <p>Please wait while we verify your subscription.</p>
                </>
              ) : status === "error" ? (
                <>
                  <h2 id="subscription-gate-title">We couldn’t verify your subscription</h2>
                  <p>Please try again. Your account access has not been changed.</p>
                  <button className="subscription-gate-button" onClick={() => setRetry(value => value + 1)}>
                    Try again
                  </button>
                </>
              ) : (
                <>
                  <h2 id="subscription-gate-title">Subscription required</h2>
                  <p>
                    Your account isn’t eligible to use the dashboard yet. Choose a subscription
                    plan to unlock dashboard and mining access.
                  </p>
                  <button className="subscription-gate-button" onClick={() => navigate("/subscription")}>
                    View subscription plans
                  </button>
                </>
              )}
            </section>
          </div>
        </>
      );
    }
  }

  return children;
}