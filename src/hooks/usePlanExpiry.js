import { useState, useEffect } from "react";
import { supabase } from "../libs/supabase";

export function usePlanExpiry(user) {
  const [expired,    setExpired]    = useState(false);
  const [expiredAt,  setExpiredAt]  = useState(null);
  const [planName,   setPlanName]   = useState(null);
  const [checked,    setChecked]    = useState(false);

  useEffect(() => {
    if (!user) return;

    const check = async () => {
      // Never apply to admins
      const { data: adminRow } = await supabase
        .from("admins")
        .select("id")
        .eq("email", user.email)
        .maybeSingle();

      if (adminRow) {
        // Admin — skip check entirely
        setChecked(true);
        return;
      }

      // Get most recent approved subscription
      const { data: sub } = await supabase
        .from("subscriptions")
        .select("plan_name, expires_at, payment_status")
        .eq("user_id", user.id)
        .eq("payment_status", "approved")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!sub) {
        // No approved subscription at all
        setChecked(true);
        return;
      }

      if (sub.expires_at && new Date(sub.expires_at) < new Date()) {
        // Expired — mark profile as expired
        setExpired(true);
        setExpiredAt(sub.expires_at);
        setPlanName(sub.plan_name);

        // Update profile subscription_status to expired
        await supabase
          .from("profiles")
          .update({ subscription_status: "expired" })
          .eq("id", user.id);
      }

      setChecked(true);
    };

    check();
  }, [user]);

  return { expired, expiredAt, planName, checked };
}