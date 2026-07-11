import "./Sidebar.css";
import {
  LayoutDashboard, Pickaxe, Gift, Users,
  Wallet, Settings, LogOut, Menu, X, Flame, ArrowUpCircle,
} from "lucide-react";
import { NavLink, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";

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

// ── Nav data ─────────────────────────────────────────────────────────────────
const NAV_ITEMS = [
  { icon: <LayoutDashboard size={19} />, label: "Dashboard", path: "/dashboard"        },
  { icon: <Pickaxe         size={19} />, label: "Mine",      path: "/mining"           },
  { icon: <Gift            size={19} />, label: "Rewards",   path: "/rewards"          },
  { icon: <Users           size={19} />, label: "Referrals", path: "/referrals"        },
  { icon: <Flame           size={19} />, label: "Streaks",   path: "/streaks"          },
  { icon: <Wallet          size={19} />, label: "Wallet",    path: "/wallet"           },
  { icon: <Settings        size={19} />, label: "Settings",  path: "/profilesettings"  },
  { icon: <ArrowUpCircle   size={19} />, label: "Upgrade",   path: "/upgrade"          }
];

// ── Main ─────────────────────────────────────────────────────────────────────
export default function Sidebar() {
  const [open, setOpen]               = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.clear();
    navigate("/");
  };

  // Lock body scroll while the mobile drawer is open
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "auto";
    return () => { document.body.style.overflow = "auto"; };
  }, [open]);

  // Close drawer automatically if viewport grows past mobile breakpoint
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth > 900 && open) setOpen(false);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [open]);

  return (
    <>
      {/* Mobile hamburger trigger */}
      <button
        className={`mobile-menu-btn ${open ? "hide" : ""}`}
        onClick={() => setOpen(true)}
        aria-label="Open menu"
      >
        <Menu size={22} />
      </button>

      {/* Backdrop (mobile only) */}
      <div
        className={`sidebar-overlay ${open ? "show" : ""}`}
        onClick={() => setOpen(false)}
      />

      {/* Sidebar drawer */}
      <aside className={`sidebar ${open ? "open" : ""}`}>

        <div className="sidebar-top">
          {/* Logo */}
          <div className="sb-logo">
            <CubeLogoSVG />
            <div className="sb-logo-text">
              <span>
                <span className="sb-logo-cube">CUBE</span>
                <span className="sb-logo-coin"> COIN</span>
              </span>
            </div>
          </div>

          {/* Mobile-only close button */}
          <button
            className="close-sidebar"
            onClick={() => setOpen(false)}
            aria-label="Close menu"
          >
            <X size={20} />
          </button>
        </div>

        {/* Nav links */}
        <nav className="sidebar-links">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.label}
              to={item.path}
              className={({ isActive }) =>
                isActive ? "sidebar-link active" : "sidebar-link"
              }
              onClick={() => setOpen(false)}
            >
              {item.icon}
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        {/* Bottom — logout */}
        <div className="sidebar-bottom">
          <button
            className="logout-btn"
            onClick={() => setShowLogoutModal(true)}
          >
            <LogOut size={18} />
            Logout
          </button>
        </div>

      </aside>

      {/* Logout confirmation modal */}
      {showLogoutModal && (
        <div
          className="logout-modal-overlay"
          onClick={() => setShowLogoutModal(false)}
        >
          <div className="logout-modal" onClick={(e) => e.stopPropagation()}>
            <div className="logout-icon">
              <LogOut size={32} />
            </div>

            <h3>Logout?</h3>
            <p>Are you sure you want to logout from your Cube Coin account?</p>

            <div className="logout-actions">
              <button
                className="cancel-logout-btn"
                onClick={() => setShowLogoutModal(false)}
              >
                Cancel
              </button>
              <button
                className="confirm-logout-btn"
                onClick={handleLogout}
              >
                Yes, Logout
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}