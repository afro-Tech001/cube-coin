import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../../../context/AuthContext";
import { useEffect, useState } from "react";
import { supabase } from "../../../libs/supabase";

/**
 * Protects admin-only routes.
 * First waits for AuthContext to resolve the session (same loading guard
 * as ProtectedRoute), then checks the admins table.
 */
export default function AdminRoute({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  const [adminChecked, setAdminChecked] = useState(false);
  const [isAdmin,      setIsAdmin]      = useState(false);

  useEffect(() => {
    if (loading) return; // wait for auth to resolve first
    if (!user) { setAdminChecked(true); return; }

    const checkAdmin = async () => {
      // Check localStorage cache first for speed
      const cached = localStorage.getItem("cubecoin_admin");
      if (cached) {
        try {
          const adminData = JSON.parse(cached);
          if (adminData?.email === user.email) {
            setIsAdmin(true);
            setAdminChecked(true);
            return;
          }
        } catch (_) {}
      }

      // Fall back to DB check
      const { data } = await supabase
        .from("admins")
        .select("id, email, role")
        .eq("email", user.email)
        .maybeSingle();

      if (data) {
        setIsAdmin(true);
        localStorage.setItem("cubecoin_admin", JSON.stringify(data));
      }
      setAdminChecked(true);
    };

    checkAdmin();
  }, [user, loading]);

  // Still resolving session
  if (loading || !adminChecked) {
    return (
      <div style={{
        minHeight: "100vh",
        background: "#050b07",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "column",
        gap: 16,
        fontFamily: "'DM Sans', sans-serif",
      }}>
        <svg width="48" height="48" viewBox="0 0 36 36" fill="none"
          style={{ animation: "cubeSpin 1.4s linear infinite" }}>
          <defs>
            <linearGradient id="ar-tf" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#b9ffc1" />
              <stop offset="100%" stopColor="#4ade80" />
            </linearGradient>
          </defs>
          <polygon points="18,2 30,9 30,23 18,30 6,23 6,9" fill="url(#ar-tf)" opacity="0.9" />
          <polygon points="18,2 30,9 18,16 6,9" fill="#d4ffda" opacity="0.6" />
          <polygon points="18,16 30,9 30,23 18,30" fill="#22c55e" />
          <polygon points="18,16 6,9 6,23 18,30" fill="#166534" />
        </svg>
        <style>{`@keyframes cubeSpin { from { transform: rotateY(0deg); } to { transform: rotateY(360deg); } }`}</style>
        <p style={{ color: "rgba(255,255,255,.4)", fontSize: "0.85rem" }}>Verifying access…</p>
      </div>
    );
  }

  if (!user)    return <Navigate to="/login"  state={{ from: location }} replace />;
  if (!isAdmin) return <Navigate to="/dashboard" replace />;

  return children;
}