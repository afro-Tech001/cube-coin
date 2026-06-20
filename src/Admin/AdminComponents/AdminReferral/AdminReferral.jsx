import React, { useState, useEffect } from "react";
import { supabase } from "../../../libs/supabase";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

// ── Theme ─────────────────────────────────────────────────────────────────────
const T = {
  bg:        "#050b07",
  surface:   "rgba(10,28,14,.9)",
  border:    "rgba(127,255,110,.15)",
  borderHi:  "rgba(74,222,128,.45)",
  green:     "#4ade80",
  greenDim:  "rgba(74,222,128,.06)",
  greenBd:   "rgba(74,222,128,.2)",
  accent:    "#22c55e",
  accentDark:"#041107",
  white:     "#fff",
  muted:     "rgba(255,255,255,.45)",
  mutedLo:   "rgba(255,255,255,.28)",
  warn:      "rgba(250,204,21,.8)",
  warnBg:    "rgba(250,204,21,.06)",
  warnBd:    "rgba(250,204,21,.2)",
  purple:    "#a78bfa",
  purpleBg:  "rgba(167,139,250,.08)",
  purpleBd:  "rgba(167,139,250,.25)",
  font:      "'DM Sans', sans-serif",
};

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmtDate(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-NG", {
    day: "numeric", month: "short", year: "numeric",
  });
}

function StatusBadge({ status }) {
  const meta = {
    approved: { bg: T.greenDim, bd: T.greenBd, color: T.green, label: "Active miner" },
    pending:  { bg: T.warnBg,   bd: T.warnBd,   color: T.warn,  label: "Pending" },
  }[status] || { bg: "rgba(255,255,255,.05)", bd: "rgba(255,255,255,.1)", color: T.mutedLo, label: "Signed up" };

  return (
    <span style={{
      background: meta.bg, border: `1px solid ${meta.bd}`, color: meta.color,
      fontSize: 10, fontWeight: 700, padding: "3px 10px",
      borderRadius: 100, letterSpacing: "0.06em", textTransform: "uppercase",
      whiteSpace: "nowrap",
    }}>{meta.label}</span>
  );
}

function StatCard({ label, value, accent }) {
  return (
    <div style={{
      background: T.surface, border: `1px solid ${T.border}`,
      borderRadius: 16, padding: "16px 20px", flex: 1, minWidth: 130,
    }}>
      <div style={{ fontSize: 11, color: T.muted, fontWeight: 600,
        textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>
        {label}
      </div>
      <div style={{ fontSize: "1.6rem", fontWeight: 800, color: accent || T.white, lineHeight: 1 }}>
        {value}
      </div>
    </div>
  );
}

// ── Detail sheet — shows a referrer + everyone they referred ──────────────────
function DetailSheet({ referrer, referredList, onClose }) {
  if (!referrer) return null;

  return (
    <div
      style={{
        position: "fixed", inset: 0, background: "rgba(0,0,0,.75)",
        display: "flex", alignItems: "flex-end", justifyContent: "center", zIndex: 999,
      }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div style={{
        background: "#0a1c0e", border: `1px solid ${T.border}`,
        borderRadius: "24px 24px 0 0", padding: "1.5rem",
        width: "100%", maxWidth: 520, maxHeight: "90vh", overflowY: "auto",
        animation: "sheetUp .28s cubic-bezier(.34,1.56,.64,1)", fontFamily: T.font,
      }}>
        <style>{`@keyframes sheetUp{from{transform:translateY(60px);opacity:0}to{transform:translateY(0);opacity:1}}`}</style>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
          <div>
            <div style={{ fontSize: 11, color: T.muted, fontWeight: 600,
              textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 4 }}>
              Referrer
            </div>
            <div style={{ fontSize: "1.3rem", fontWeight: 800, color: T.white }}>
              {referrer.full_name || referrer.email || "Unknown"}
            </div>
            <div style={{ fontSize: 12, color: T.muted, marginTop: 4 }}>
              Code: <span style={{ color: T.green, fontWeight: 700, letterSpacing: 1 }}>{referrer.referral_code}</span>
            </div>
          </div>
          <button onClick={onClose} style={{
            background: "rgba(255,255,255,.07)", border: "none", color: T.muted,
            width: 30, height: 30, borderRadius: "50%", fontSize: 18, cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>×</button>
        </div>

        <div style={{
          background: T.greenDim, border: `1px solid ${T.greenBd}`,
          borderRadius: 14, padding: "1rem 1.1rem", marginBottom: 20,
          display: "flex", justifyContent: "space-between",
        }}>
          <div>
            <div style={{ fontSize: 11, color: T.muted, marginBottom: 3 }}>Total referrals</div>
            <div style={{ fontSize: "1.3rem", fontWeight: 800, color: T.green }}>{referredList.length}</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 11, color: T.muted, marginBottom: 3 }}>Wallet balance</div>
            <div style={{ fontSize: "1.3rem", fontWeight: 800, color: T.white }}>
              {Number(referrer.cube_balance || 0).toFixed(0)} CUBE
            </div>
          </div>
        </div>

        <div style={{ fontSize: 11, color: T.muted, fontWeight: 600,
          textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 12 }}>
          People they referred
        </div>

        {referredList.length === 0 ? (
          <div style={{ textAlign: "center", padding: "30px 0", color: T.mutedLo, fontSize: 13 }}>
            No referrals yet
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {referredList.map(u => (
              <div key={u.id} style={{
                display: "flex", alignItems: "center", gap: 12,
                background: T.surface, border: `1px solid ${T.border}`,
                borderRadius: 12, padding: "10px 14px",
              }}>
                <div style={{
                  width: 32, height: 32, borderRadius: "50%",
                  background: T.greenDim, border: `1px solid ${T.greenBd}`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  color: T.green, fontWeight: 800, fontSize: 13, flexShrink: 0,
                }}>
                  {(u.full_name || u.email || "?").charAt(0).toUpperCase()}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ color: T.white, fontWeight: 600, fontSize: 13 }}>
                    {u.full_name || u.email?.split("@")[0] || "User"}
                  </div>
                  <div style={{ color: T.mutedLo, fontSize: 11, marginTop: 1 }}>
                    Joined {fmtDate(u.created_at)}
                  </div>
                </div>
                <StatusBadge status={u.subscription_status} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function AdminReferrals() {
  const [profiles,   setProfiles]   = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [search,     setSearch]     = useState("");
  const [filter,     setFilter]     = useState("all"); // all | hasReferrals | noReferrals
  const [selected,   setSelected]   = useState(null);

  const fetchData = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("profiles")
      .select("id, full_name, email, referral_code, referred_by_code, cube_balance, subscription_status, created_at")
      .order("created_at", { ascending: false });

    if (error) { toast.error(error.message); setLoading(false); return; }
    setProfiles(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  // ── Build referrer → [referred users] map ──────────────────────────────────
  const referrers = profiles.filter(p => p.referral_code);

  const referralMap = {};
  profiles.forEach(p => {
    if (p.referred_by_code) {
      if (!referralMap[p.referred_by_code]) referralMap[p.referred_by_code] = [];
      referralMap[p.referred_by_code].push(p);
    }
  });

  const referrersWithCounts = referrers.map(r => ({
    ...r,
    referredCount: (referralMap[r.referral_code] || []).length,
  }));

  // ── Stats ──────────────────────────────────────────────────────────────────
  const totalReferrers   = referrersWithCounts.filter(r => r.referredCount > 0).length;
  const totalReferred    = profiles.filter(p => p.referred_by_code).length;
  const totalApprovedRef = profiles.filter(p => p.referred_by_code && p.subscription_status === "approved").length;
  const topReferrer      = [...referrersWithCounts].sort((a, b) => b.referredCount - a.referredCount)[0];

  // ── Filter + search ───────────────────────────────────────────────────────
  const visible = referrersWithCounts
    .filter(r => {
      if (filter === "hasReferrals") return r.referredCount > 0;
      if (filter === "noReferrals")  return r.referredCount === 0;
      return true;
    })
    .filter(r => {
      const q = search.toLowerCase();
      if (!q) return true;
      return (r.full_name || "").toLowerCase().includes(q) ||
             (r.email || "").toLowerCase().includes(q) ||
             (r.referral_code || "").toLowerCase().includes(q);
    })
    .sort((a, b) => b.referredCount - a.referredCount);

  const tabs = [
    { key: "all",          label: "All",            count: referrersWithCounts.length },
    { key: "hasReferrals", label: "Has referrals",  count: referrersWithCounts.filter(r => r.referredCount > 0).length },
    { key: "noReferrals",  label: "No referrals",   count: referrersWithCounts.filter(r => r.referredCount === 0).length },
  ];

  return (
    <div style={{ minHeight: "100vh", padding: "30px 20px", background: T.bg, fontFamily: T.font }}>
      <div style={{ maxWidth: 900, margin: "0 auto" }}>

        {/* Header */}
        <div style={{ marginBottom: 28 }}>
          <div style={{ fontSize: 11, color: T.muted, fontWeight: 600,
            textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 6 }}>
            Admin panel
          </div>
          <h1 style={{ fontSize: "1.9rem", fontWeight: 800, color: T.white, margin: 0, marginBottom: 6 }}>
            Referrals
          </h1>
          <p style={{ color: T.muted, fontSize: "0.95rem", margin: 0 }}>
            Track who referred who and reward top performers
          </p>
        </div>

        {/* Stats */}
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 24 }}>
          <StatCard label="Active referrers" value={totalReferrers} accent={T.green} />
          <StatCard label="Total referred"   value={totalReferred} />
          <StatCard label="Converted to miners" value={totalApprovedRef} accent={T.purple} />
          <StatCard label="Top referrer"
            value={topReferrer?.referredCount > 0 ? `${topReferrer.referredCount}` : "—"}
            accent={T.warn} />
        </div>

        {/* Toolbar */}
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center", marginBottom: 16 }}>
          <div style={{ position: "relative", flex: 1, minWidth: 200 }}>
            <span style={{ position: "absolute", left: 12, top: "50%",
              transform: "translateY(-50%)", color: T.muted, fontSize: 14 }}>🔍</span>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by name, email, referral code…"
              style={{
                width: "100%", padding: "10px 12px 10px 36px",
                background: T.surface, border: `1px solid ${T.border}`,
                borderRadius: 10, color: T.white, fontSize: 13,
                fontFamily: T.font, outline: "none", boxSizing: "border-box",
              }}
            />
          </div>
          <button onClick={fetchData} style={{
            padding: "10px 16px", borderRadius: 10,
            background: T.greenDim, border: `1px solid ${T.greenBd}`,
            color: T.green, fontWeight: 700, fontSize: 13,
            cursor: "pointer", fontFamily: T.font,
          }}>
            ↻ Refresh
          </button>
        </div>

        {/* Filter tabs */}
        <div style={{ display: "flex", gap: 6, marginBottom: 20, flexWrap: "wrap" }}>
          {tabs.map(t => (
            <button
              key={t.key}
              onClick={() => setFilter(t.key)}
              style={{
                padding: "7px 14px", borderRadius: 10, border: "1px solid",
                borderColor: filter === t.key ? T.green : T.border,
                background: filter === t.key ? T.greenDim : "transparent",
                color: filter === t.key ? T.green : T.muted,
                fontWeight: 700, fontSize: 12, cursor: "pointer",
                fontFamily: T.font, display: "flex", alignItems: "center", gap: 6,
              }}
            >
              {t.label}
              <span style={{
                background: filter === t.key ? T.green : T.border,
                color: filter === t.key ? T.accentDark : T.muted,
                fontSize: 10, fontWeight: 800, padding: "1px 6px", borderRadius: 100,
              }}>{t.count}</span>
            </button>
          ))}
        </div>

        {/* List */}
        {loading ? (
          <div style={{ textAlign: "center", padding: "60px 0", color: T.muted }}>
            <div style={{ fontSize: "2rem", marginBottom: 10 }}>👥</div>
            Loading referrals…
          </div>
        ) : visible.length === 0 ? (
          <div style={{
            textAlign: "center", padding: "60px 0", color: T.muted,
            background: T.surface, border: `1px solid ${T.border}`, borderRadius: 16,
          }}>
            <div style={{ fontSize: "2rem", marginBottom: 10 }}>📭</div>
            No referrers found
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {visible.map(r => (
              <div
                key={r.id}
                onClick={() => setSelected(r)}
                style={{
                  background: T.surface,
                  border: `1px solid ${r.referredCount > 0 ? T.greenBd : T.border}`,
                  borderRadius: 16, padding: "14px 18px",
                  cursor: "pointer", transition: "border-color 0.2s, transform 0.15s",
                  display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap",
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.borderColor = T.borderHi;
                  e.currentTarget.style.transform = "translateX(3px)";
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.borderColor = r.referredCount > 0 ? T.greenBd : T.border;
                  e.currentTarget.style.transform = "translateX(0)";
                }}
              >
                <div style={{
                  width: 38, height: 38, borderRadius: "50%",
                  background: T.greenDim, border: `1px solid ${T.greenBd}`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 15, fontWeight: 800, color: T.green, flexShrink: 0,
                }}>
                  {(r.full_name || r.email || "?").charAt(0).toUpperCase()}
                </div>

                <div style={{ flex: 1, minWidth: 160 }}>
                  <div style={{ fontWeight: 700, fontSize: 14, color: T.white, marginBottom: 3 }}>
                    {r.full_name || r.email?.split("@")[0] || "Unknown"}
                  </div>
                  <div style={{ fontSize: 12, color: T.muted }}>
                    Code: <span style={{ color: T.green, fontWeight: 600 }}>{r.referral_code}</span>
                  </div>
                </div>

                <div style={{ minWidth: 90, textAlign: "center" }}>
                  <div style={{ fontWeight: 800, fontSize: 16, color: r.referredCount > 0 ? T.green : T.mutedLo }}>
                    {r.referredCount}
                  </div>
                  <div style={{ fontSize: 10, color: T.muted, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                    Referred
                  </div>
                </div>

                <div style={{ minWidth: 100, textAlign: "right" }}>
                  <div style={{ fontWeight: 700, fontSize: 13, color: T.white }}>
                    {Number(r.cube_balance || 0).toFixed(0)} CUBE
                  </div>
                  <div style={{ fontSize: 11, color: T.mutedLo }}>
                    Joined {fmtDate(r.created_at)}
                  </div>
                </div>

                <button
                  onClick={(e) => { e.stopPropagation(); setSelected(r); }}
                  style={{
                    padding: "7px 14px", borderRadius: 10,
                    border: `1px solid ${T.greenBd}`, background: T.greenDim,
                    color: T.green, fontSize: 12, fontWeight: 700,
                    cursor: "pointer", fontFamily: T.font,
                  }}
                >
                  View
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Detail sheet */}
      <DetailSheet
        referrer={selected}
        referredList={selected ? (referralMap[selected.referral_code] || []) : []}
        onClose={() => setSelected(null)}
      />

      <ToastContainer position="top-right" autoClose={3000} theme="dark" />
    </div>
  );
}