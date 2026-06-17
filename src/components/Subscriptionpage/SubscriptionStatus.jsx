import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../libs/supabase";
import "./SubscriptionStatus.css";

export default function SubscriptionStatus() {
  const [status,   setStatus]   = useState("loading");
  const [planName, setPlanName] = useState("");
  const navigate    = useNavigate();
  const navigateRef = useRef(navigate);
  const pollRef     = useRef(null);
  const userIdRef   = useRef(null);

  useEffect(() => { navigateRef.current = navigate; }, [navigate]);

  const checkAndRedirect = (subStatus, plan) => {
    if (plan) setPlanName(plan);
    setStatus(subStatus);

    if (subStatus === "approved") {
      // Clear polling — no longer needed
      if (pollRef.current) clearInterval(pollRef.current);
      setTimeout(() => navigateRef.current("/profile-setup"), 1800);
    }
  };

  // Poll every 8 seconds as fallback
  const startPolling = (userId) => {
    pollRef.current = setInterval(async () => {
      const { data } = await supabase
        .from("profiles")
        .select("subscription_status, plan_name")
        .eq("id", userId)
        .maybeSingle();

      if (data) {
        console.log("Poll result:", data.subscription_status);
        checkAndRedirect(data.subscription_status, data.plan_name);
      }
    }, 8000);
  };

  useEffect(() => {
    let channel;

    const init = async () => {
      const { data: userData } = await supabase.auth.getUser();
      const user = userData?.user;

      if (!user) { navigateRef.current("/login"); return; }

      userIdRef.current = user.id;

      // Initial fetch
      const { data, error } = await supabase
        .from("profiles")
        .select("subscription_status, plan_name")
        .eq("id", user.id)
        .maybeSingle();

      if (error) { console.error(error); setStatus("pending"); }

      const currentStatus = data?.subscription_status || "pending";
      const currentPlan   = data?.plan_name || "";

      setStatus(currentStatus);
      if (currentPlan) setPlanName(currentPlan);

      // Already approved on load
      if (currentStatus === "approved") {
        navigateRef.current("/dashboard");
        return;
      }

      // ── Realtime listener ──────────────────────────────────────
      channel = supabase
        .channel(`profile-status-${user.id}`)
        .on(
          "postgres_changes",
          {
            event:  "UPDATE",
            schema: "public",
            table:  "profiles",
            filter: `id=eq.${user.id}`,
          },
          (payload) => {
            console.log("Realtime payload:", payload.new);
            checkAndRedirect(
              payload.new.subscription_status,
              payload.new.plan_name
            );
          }
        )
        .subscribe((realtimeStatus) => {
          console.log("Realtime channel:", realtimeStatus);
        });

      // ── Polling fallback ───────────────────────────────────────
      startPolling(user.id);
    };

    init();

    return () => {
      if (channel)        supabase.removeChannel(channel);
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  return (
    <div className="status-page">
      {status === "loading" && (
        <div className="status-card">
          <div className="status-spinner" />
          <h2>Checking your status…</h2>
          <p>Please wait a moment.</p>
        </div>
      )}

      {status === "pending" && (
        <div className="status-card pending">
          <div className="status-icon">⏳</div>
          <h2>Payment under review</h2>
          <p>
            Your payment has been received and is currently being verified
            by our team. This page updates automatically — no need to refresh.
          </p>
          <div className="status-pulse-bar">
            <div className="status-pulse-fill" />
          </div>
          <span className="status-hint">Typically verified within 1–3 hours</span>
        </div>
      )}

      {status === "approved" && (
        <div className="status-card approved">
          <div className="status-icon">✅</div>
          <h2>Payment approved!</h2>
          <p>
            Your <strong>{planName}</strong> plan is now active.
            Redirecting you to your dashboard…
          </p>
          <div className="status-redirect-bar" />
        </div>
      )}

      {status === "rejected" && (
        <div className="status-card rejected">
          <div className="status-icon">❌</div>
          <h2>Payment not verified</h2>
          <p>
            We could not verify your transfer. Please contact support or resubmit.
          </p>
          <button
            className="status-retry-btn"
            onClick={() => navigateRef.current("/subscription")}
          >
            Try again →
          </button>
        </div>
      )}
    </div>
  );
}