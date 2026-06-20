import "./Adminsidebar.css";
import {
  LayoutDashboard,
  Users,
  Coins,
  Wallet,
  Gift,
  BarChart3,
  Settings,
  User,
  LogOut,
  Menu,
  X,
  Megaphone,
} from "lucide-react";
import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { supabase } from "../../../libs/supabase";

// ── Mini Cube Logo ────────────────────────────────────────────────────────────
function CubeLogoSVG() {
  return (
    <svg className="sb-logo-icon" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="sb-tf" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#b9ffc1" />
          <stop offset="100%" stopColor="#4ade80" />
        </linearGradient>
        <linearGradient id="sb-lf" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#4ade80" />
          <stop offset="100%" stopColor="#166534" />
        </linearGradient>
        <linearGradient id="sb-rf" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#22c55e" />
          <stop offset="100%" stopColor="#0d4a24" />
        </linearGradient>
      </defs>
      <g className="cl-top">
        <polygon points="18,2 23.5,5 23.5,11 18,14 12.5,11 12.5,5" fill="url(#sb-tf)" />
        <polygon points="18,2 23.5,5 18,8 12.5,5" fill="#d4ffda" opacity="0.7" />
        <polygon points="18,8 23.5,5 23.5,11 18,14" fill="url(#sb-rf)" />
        <polygon points="18,8 12.5,5 12.5,11 18,14" fill="url(#sb-lf)" />
      </g>
      <g className="cl-left">
        <polygon points="11,17 16.5,20 16.5,26 11,29 5.5,26 5.5,20" fill="url(#sb-tf)" />
        <polygon points="11,17 16.5,20 11,23 5.5,20" fill="#d4ffda" opacity="0.7" />
        <polygon points="11,23 16.5,20 16.5,26 11,29" fill="url(#sb-rf)" />
        <polygon points="11,23 5.5,20 5.5,26 11,29" fill="url(#sb-lf)" />
      </g>
      <g className="cl-right">
        <polygon points="25,17 30.5,20 30.5,26 25,29 19.5,26 19.5,20" fill="url(#sb-tf)" />
        <polygon points="25,17 30.5,20 25,23 19.5,20" fill="#d4ffda" opacity="0.7" />
        <polygon points="25,23 30.5,20 30.5,26 25,29" fill="url(#sb-rf)" />
        <polygon points="25,23 19.5,20 19.5,26 25,29" fill="url(#sb-lf)" />
      </g>
    </svg>
  );
}

export default function AdminSidebar() {
  const [open, setOpen] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  // Close mobile sidebar automatically whenever the route changes
  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

  // Lock body scroll while mobile sidebar is open
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  const links = [
    {
      icon: <LayoutDashboard size={20} />,
      name: "Overview",
      path: "/admin/dashboard",
    },
    {
      icon: <Users size={20} />,
      name: "Users",
      path: "/admin/users",
    },
    {
      icon: <Coins size={20} />,
      name: "Mining",
      path: "/admin/mining",
    },
    {
      icon: <Gift size={20} />,
      name: "Subcription",
      path: "/admin/subscription",
    },
    {
      icon: <Wallet size={20} />,
      name: "Withdrawals",
      path: "/admin/withdrawals",
    },
    {
      icon: <User size={20} />,
      name: "Referrals",
      path: "/admin/referal",
    },
    {
      icon: <Settings size={20} />,
      name: "Settings",
      path: "/admin/settings",
    },
    {
      icon: <Megaphone size={20} />,
      name: "Announcements",
      path: "/admin/announcements",
    }
  ];

  // ── Real logout ────────────────────────────────────────────────────────────
  const handleLogout = async () => {
    if (loggingOut) return;
    setLoggingOut(true);

    try {
      const { error } = await supabase.auth.signOut();
      if (error) console.error("Logout error:", error);
    } catch (err) {
      console.error("Unexpected logout error:", err);
    }

    // Clear any locally cached admin/user data
    localStorage.removeItem("cubecoin_admin");
    localStorage.removeItem("cubecoin_user");
    localStorage.removeItem("cubecoin_profile");

    setShowLogoutModal(false);
    setLoggingOut(false);
    navigate("/login", { replace: true });
  };

  return (
    <>
      <button
        className="admin-mobile-btn"
        onClick={() => setOpen(true)}
        aria-label="Open menu"
      >
        <Menu size={22} />
      </button>

      <div
        className={`admin-overlay ${open ? "show" : ""}`}
        onClick={() => setOpen(false)}
      />

      <aside
        className={`admin-sidebar ${open ? "open" : ""}`}
      >
        <div className="admin-header">

          <div className="admin-logo">
              <CubeLogoSVG />
            <div>
              <h3>Cube Admin</h3>
              <span>Control Center</span>
            </div>
          </div>

          <button
            className="admin-close-btn"
            onClick={() => setOpen(false)}
            aria-label="Close menu"
          >
            <X size={20} />
          </button>

        </div>

        <div className="admin-links">
          {links.map((link) => (
            <a
              key={link.name}
              href={link.path}
              className={`admin-nav-link ${
                location.pathname === link.path ? "active" : ""
              }`}
            >
              {link.icon}
              <span>{link.name}</span>
            </a>
          ))}
        </div>

        <div className="admin-footer">
          <button
            className="admin-logout-btn"
            onClick={() => setShowLogoutModal(true)}
          >
            <LogOut size={18} />
            Logout
          </button>
        </div>
      </aside>

      {showLogoutModal && (
        <div className="logout-modal-overlay" onClick={(e) => e.target === e.currentTarget && !loggingOut && setShowLogoutModal(false)}>

          <div className="logout-modal">

            <div className="logout-icon">
              <LogOut size={28} />
            </div>

            <h3>Logout Admin?</h3>

            <p>
              Are you sure you want to logout from
              the Cube Admin Dashboard?
            </p>

            <div className="logout-actions">

              <button
                className="cancel-btn"
                onClick={() => setShowLogoutModal(false)}
                disabled={loggingOut}
              >
                Cancel
              </button>

              <button
                className="confirm-btn"
                onClick={handleLogout}
                disabled={loggingOut}
              >
                {loggingOut ? "Logging out…" : "Logout"}
              </button>

            </div>

          </div>

        </div>
      )}
    </>
  );
}