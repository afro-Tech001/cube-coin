import React, { useState, useEffect } from "react";
import { supabase } from "../../../libs/supabase";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const T = {
  bg:         "#050b07",
  surface:    "rgba(10,28,14,0.9)",
  surfaceHi:  "rgba(16,38,18,0.95)",
  border:     "rgba(127,255,110,0.15)",
  borderHi:   "rgba(74,222,128,0.45)",
  green:      "#4ade80",
  greenDim:   "rgba(74,222,128,0.06)",
  greenBd:    "rgba(74,222,128,0.2)",
  accent:     "#22c55e",
  accentDark: "#041107",
  white:      "#fff",
  muted:      "rgba(255,255,255,0.45)",
  mutedLo:    "rgba(255,255,255,0.28)",
  warn:       "rgba(250,204,21,0.8)",
  warnBg:     "rgba(250,204,21,0.06)",
  warnBd:     "rgba(250,204,21,0.2)",
  red:        "rgba(239,68,68,0.85)",
  redBg:      "rgba(239,68,68,0.08)",
  redBd:      "rgba(239,68,68,0.25)",
  font:       "'DM Sans', sans-serif",
};

const PLAN_COLORS = {
  Starter: "#94a3b8",
  Bronze:  "#cd7f32",
  Silver:  "#a8b2c1",
  Gold:    "#facc15",
  Diamond: "#818cf8",
};

const STATUS_META = {
  pending:  { label: "Pending",  bg: T.warnBg,  bd: T.warnBd,  color: T.warn  },
  approved: { label: "Approved", bg: T.greenDim, bd: T.greenBd, color: T.green },
  rejected: { label: "Rejected", bg: T.redBg,    bd: T.redBd,   color: T.red   },
};

function Badge({ status }) {
  const m = STATUS_META[status] || STATUS_META.pending;
  return (
    <span style={{
      background: m.bg, border: `1px solid ${m.bd}`, color: m.color,
      fontSize: 10, fontWeight: 700, padding: "3px 10px",
      borderRadius: 100, letterSpacing: "0.06em", textTransform: "uppercase",
      whiteSpace: "nowrap",
    }}>{m.label}</span>
  );
}

function PlanPill({ name }) {
  const color = PLAN_COLORS[name] || T.green;
  return (
    <span style={{
      background: `${color}18`, border: `1px solid ${color}40`,
      color, fontSize: 11, fontWeight: 700, padding: "2px 10px",
      borderRadius: 8, letterSpacing: "0.06em",
    }}>{name}</span>
  );
}

function StatCard({ label, value, accent }) {
  return (
    <div style={{
      background: T.surface, border: `1px solid ${T.border}`,
      borderRadius: 16, padding: "16px 20px", flex: 1, minWidth: 120,
    }}>
      <div style={{ fontSize: 11, color: T.muted, fontWeight: 600,
        textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>
        {label}
      </div>
      <div style={{ fontSize: "1.6rem", fontWeight: 800,
        color: accent || T.white, lineHeight: 1 }}>
        {value}
      </div>
    </div>
  );
}

// ── Detail sheet ──────────────────────────────────────────────────────────────
function DetailSheet({ sub, onClose, onApprove, onReject, loading }) {
  if (!sub) return null;

  const rows = [
    ["Subscription ID", sub.id],
    ["User ID",         sub.user_id],
    ["Full name",       sub.full_name],
    ["Contact",         sub.contact],
    ["Plan",            sub.plan_name],
    ["Amount",          `₦${Number(sub.amount).toLocaleString()}`],
    ["Reference",       sub.tx_ref],
    ["Mining Rate",     sub.mining_rate || "Pending"],
    ["Plan Status",     sub.plan_status || "Pending"],
    ["Submitted",       new Date(sub.created_at).toLocaleString()],
    ["Approved At",     sub.approved_at ? new Date(sub.approved_at).toLocaleString() : "Not yet"],
  ];

  return (
    <div
      style={{
        position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)",
        display: "flex", alignItems: "flex-end", justifyContent: "center",
        zIndex: 999,
      }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div style={{
        background: "#0a1c0e", border: `1px solid ${T.border}`,
        borderRadius: "24px 24px 0 0", padding: "1.5rem",
        width: "100%", maxWidth: 480, maxHeight: "92vh", overflowY: "auto",
        animation: "sheetUp 0.28s cubic-bezier(0.34,1.56,0.64,1)",
        fontFamily: T.font,
      }}>
        <style>{`@keyframes sheetUp{from{transform:translateY(60px);opacity:0}to{transform:translateY(0);opacity:1}}`}</style>

        <div style={{ display: "flex", justifyContent: "space-between",
          alignItems: "flex-start", marginBottom: 20 }}>
          <div>
            <div style={{ fontSize: 11, color: T.muted, fontWeight: 600,
              textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 4 }}>
              Subscription request
            </div>
            <div style={{ fontSize: "1.4rem", fontWeight: 800, color: T.white,
              display: "flex", alignItems: "center", gap: 10 }}>
              {sub.full_name}
              <Badge status={sub.payment_status} />
            </div>
          </div>
          <button onClick={onClose} style={{
            background: "rgba(255,255,255,0.07)", border: "none",
            color: T.muted, width: 30, height: 30, borderRadius: "50%",
            fontSize: 18, cursor: "pointer", display: "flex",
            alignItems: "center", justifyContent: "center", fontFamily: T.font,
          }}>×</button>
        </div>

        <div style={{
          background: T.greenDim, border: `1px solid ${T.greenBd}`,
          borderRadius: 14, padding: "1rem 1.1rem",
          display: "flex", flexDirection: "column", gap: 10, marginBottom: 20,
        }}>
          {rows.map(([l, v]) => (
            <div key={l} style={{ display: "flex",
              justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 11, color: T.muted }}>{l}</span>
              <span style={{
                fontSize: 13, fontWeight: 600,
                color: l === "Amount" || l === "Plan" ? T.green : T.white,
              }}>
                {l === "Plan" ? <PlanPill name={v} /> : v}
              </span>
            </div>
          ))}
        </div>

        {sub.receipt_url && (
          <div style={{
            background: T.greenDim, border: `1px solid ${T.greenBd}`,
            borderRadius: 14, padding: "1rem", marginBottom: 20,
          }}>
            <div style={{ fontSize: 11, color: T.muted, textTransform: "uppercase",
              letterSpacing: "0.08em", marginBottom: 12 }}>
              Payment Receipt
            </div>
            {sub.receipt_url.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
              <>
                <img src={sub.receipt_url} alt="Receipt"
                  style={{ width: "100%", borderRadius: 10,
                    border: `1px solid ${T.border}`, marginBottom: 12 }} />
                <a href={sub.receipt_url} target="_blank" rel="noopener noreferrer"
                  style={{ display: "inline-block", padding: "10px 16px",
                    background: T.accent, color: T.accentDark, borderRadius: 10,
                    fontWeight: 700, textDecoration: "none" }}>
                  View Full Receipt
                </a>
              </>
            ) : (
              <a href={sub.receipt_url} target="_blank" rel="noopener noreferrer"
                style={{ display: "inline-block", padding: "10px 16px",
                  background: T.accent, color: T.accentDark, borderRadius: 10,
                  fontWeight: 700, textDecoration: "none" }}>
                Open Receipt PDF
              </a>
            )}
          </div>
        )}

        {sub.payment_status === "pending" && (
          <div style={{ display: "flex", gap: 10 }}>
            <button disabled={loading} onClick={() => onReject(sub.id)}
              style={{
                flex: 1, padding: 14, borderRadius: 14, border: `1px solid ${T.redBd}`,
                background: T.redBg, color: T.red, fontSize: "0.9rem",
                fontWeight: 800, cursor: loading ? "not-allowed" : "pointer",
                fontFamily: T.font, opacity: loading ? 0.6 : 1,
              }}>
              {loading ? "..." : "✕  Reject"}
            </button>
            <button disabled={loading} onClick={() => onApprove(sub.id)}
              style={{
                flex: 2, padding: 14, borderRadius: 14, border: "none",
                background: T.accent, color: T.accentDark, fontSize: "0.95rem",
                fontWeight: 800, cursor: loading ? "not-allowed" : "pointer",
                fontFamily: T.font, opacity: loading ? 0.6 : 1,
              }}>
              {loading ? "Processing..." : "✓  Approve payment"}
            </button>
          </div>
        )}

        {sub.payment_status !== "pending" && (
          <div style={{
            background: T.greenDim, border: `1px solid ${T.greenBd}`,
            borderRadius: 12, padding: "12px 16px",
            fontSize: 13, color: T.muted, textAlign: "center",
          }}>
            This subscription has already been{" "}
            <strong style={{ color: T.green }}>{sub.payment_status}</strong>.
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function AdminSubscription() {
  const [subs,       setSubs]       = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [actionLoad, setActionLoad] = useState(false);
  const [selected,   setSelected]   = useState(null);
  const [filter,     setFilter]     = useState("all");
  const [search,     setSearch]     = useState("");

  const fetchSubs = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("subscriptions")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) toast.error(error.message);
    else       setSubs(data || []);
    setLoading(false);
  };

  // Grab the logged-in admin's UUID so we can store it in approved_by
  const [adminId, setAdminId] = useState(null);

  useEffect(() => {
    fetchSubs();
    supabase.auth.getUser().then(({ data }) => {
      setAdminId(data?.user?.id ?? null);
    });
  }, []);

  // ── Core fix: updateStatus ────────────────────────────────────────────────
  const updateStatus = async (id, status) => {
    setActionLoad(true);

    try {
      const sub = subs.find(s => s.id === id);
      if (!sub) { toast.error("Subscription not found"); return; }

      const now = new Date().toISOString();

      // ── Step 1: Update subscriptions table ──────────────────────────────
      const { error: subErr } = await supabase
        .from("subscriptions")
        .update({
          payment_status: status,
          plan_status:    status === "approved" ? "active" : "rejected",
          approved_at:    status === "approved" ? now      : null,
          approved_by:    status === "approved" ? adminId  : null,  // UUID, not a string
          activated_at:   status === "approved" ? now      : null,
        })
        .eq("id", id);

      if (subErr) {
        console.error("[Step 1] subscriptions update failed:", subErr);
        throw new Error("Failed to update subscription: " + subErr.message);
      }

      // ── Step 2: Update profiles table via user_id ────────────────────────
      // THE FIX: use a service-role-level bypass by calling an RPC, or use
      // the admin client. Since we don't have that, we use the profiles.id
      // which equals auth.users.id = sub.user_id directly.
      const profilePayload = status === "approved"
        ? {
            subscription_status: "approved",
            plan_name:           sub.plan_name,
            plan_status:         "active",
          }
        : {
            subscription_status: "rejected",
            plan_status:         "rejected",
          };

      console.log("[Step 2] Updating profile:", sub.user_id, profilePayload);

      const { data: updatedProfiles, error: profErr } = await supabase
        .from("profiles")
        .update(profilePayload)
        .eq("id", sub.user_id)
        .select("id, subscription_status, plan_name, plan_status");

      if (profErr) {
        console.error("[Step 2] profiles update failed:", profErr);
        // Still show partial success so admin knows sub was updated
        toast.warning(`Subscription ${status}, but profile update failed: ${profErr.message}. Run the SQL fix below.`);
        fetchSubs();
        setSelected(null);
        return;
      }

      if (!updatedProfiles || updatedProfiles.length === 0) {
        // RLS is silently blocking the write — most common cause
        console.error("[Step 2] 0 rows updated — RLS is blocking profile update");
        toast.warning(
          `Subscription marked ${status}, but profile table was NOT updated (RLS blocked it). ` +
          `Run this SQL in Supabase: CREATE POLICY "Admin update profiles" ON public.profiles FOR UPDATE TO authenticated USING (true) WITH CHECK (true);`
        );
        fetchSubs();
        setSelected(null);
        return;
      }

      console.log("[Step 2] Profile updated:", updatedProfiles[0]);

      // ── Step 3: If approving, also grant subscription_cubes if not yet granted ──
      if (status === "approved" && sub.subscription_cubes) {
        const { data: prof } = await supabase
          .from("profiles")
          .select("cube_balance, cubes_granted")
          .eq("id", sub.user_id)
          .single();

        if (prof && !prof.cubes_granted) {
          const newBalance = Number(prof.cube_balance || 0) + Number(sub.subscription_cubes);
          await supabase
            .from("profiles")
            .update({ cube_balance: newBalance, cubes_granted: true })
            .eq("id", sub.user_id);
          console.log(`[Step 3] Granted ${sub.subscription_cubes} CUBE to user`);
        }
      }

      toast.success(`✅ Subscription ${status} — profile updated automatically`);
      fetchSubs();
      setSelected(null);

    } catch (err) {
      console.error("[updateStatus] Unexpected error:", err);
      toast.error(err.message);
    } finally {
      setActionLoad(false);
    }
  };

  const total    = subs.length;
  const pending  = subs.filter(s => s.payment_status === "pending").length;
  const approved = subs.filter(s => s.payment_status === "approved").length;
  const revenue  = subs
    .filter(s => s.payment_status === "approved")
    .reduce((acc, s) => acc + Number(s.amount), 0);

  const visible = subs.filter(s => {
    const matchFilter = filter === "all" || s.payment_status === filter;
    const q = search.toLowerCase();
    const matchSearch = !q ||
      s.full_name?.toLowerCase().includes(q) ||
      s.contact?.toLowerCase().includes(q)   ||
      s.plan_name?.toLowerCase().includes(q) ||
      s.tx_ref?.toLowerCase().includes(q);
    return matchFilter && matchSearch;
  });

  const tabs = [
    { key: "all",      label: "All",      count: total    },
    { key: "pending",  label: "Pending",  count: pending  },
    { key: "approved", label: "Approved", count: approved },
    { key: "rejected", label: "Rejected", count: subs.filter(s => s.payment_status === "rejected").length },
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
            Subscription requests
          </h1>
          <p style={{ color: T.muted, fontSize: "0.95rem", margin: 0 }}>
            Verify bank transfers and activate mining plans
          </p>
        </div>

        {/* Stats */}
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 24 }}>
          <StatCard label="Total"    value={total} />
          <StatCard label="Pending"  value={pending}  accent={T.warn}  />
          <StatCard label="Approved" value={approved} accent={T.green} />
          <StatCard label="Revenue"  value={`₦${revenue.toLocaleString()}`} accent={T.accent} />
        </div>

        {/* Toolbar */}
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center", marginBottom: 16 }}>
          <div style={{ position: "relative", flex: 1, minWidth: 200 }}>
            <span style={{ position: "absolute", left: 12, top: "50%",
              transform: "translateY(-50%)", color: T.muted, fontSize: 14 }}>🔍</span>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by name, contact, plan, ref…"
              style={{
                width: "100%", padding: "10px 12px 10px 36px",
                background: T.surface, border: `1px solid ${T.border}`,
                borderRadius: 10, color: T.white, fontSize: 13,
                fontFamily: T.font, outline: "none", boxSizing: "border-box",
              }}
            />
          </div>
          <button onClick={fetchSubs} style={{
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
            <button key={t.key} onClick={() => setFilter(t.key)}
              style={{
                padding: "7px 14px", borderRadius: 10, border: "1px solid",
                borderColor: filter === t.key ? T.green : T.border,
                background: filter === t.key ? T.greenDim : "transparent",
                color: filter === t.key ? T.green : T.muted,
                fontWeight: 700, fontSize: 12, cursor: "pointer",
                fontFamily: T.font, display: "flex", alignItems: "center", gap: 6,
              }}>
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
            <div style={{ fontSize: "2rem", marginBottom: 10 }}>⛏</div>
            Loading subscriptions...
          </div>
        ) : visible.length === 0 ? (
          <div style={{
            textAlign: "center", padding: "60px 0", color: T.muted,
            background: T.surface, border: `1px solid ${T.border}`, borderRadius: 16,
          }}>
            <div style={{ fontSize: "2rem", marginBottom: 10 }}>📭</div>
            No subscriptions found
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {visible.map(sub => (
              <div
                key={sub.id}
                onClick={() => setSelected(sub)}
                style={{
                  background: T.surface,
                  border: `1px solid ${sub.payment_status === "pending" ? T.warnBd : T.border}`,
                  borderRadius: 16, padding: "14px 18px",
                  cursor: "pointer", transition: "border-color 0.2s, transform 0.15s",
                  display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap",
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = T.borderHi; e.currentTarget.style.transform = "translateX(3px)"; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = sub.payment_status === "pending" ? T.warnBd : T.border; e.currentTarget.style.transform = "translateX(0)"; }}
              >
                <div style={{
                  width: 38, height: 38, borderRadius: "50%",
                  background: `${PLAN_COLORS[sub.plan_name] || T.green}22`,
                  border: `1px solid ${PLAN_COLORS[sub.plan_name] || T.green}44`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 15, fontWeight: 800,
                  color: PLAN_COLORS[sub.plan_name] || T.green, flexShrink: 0,
                }}>
                  {sub.full_name?.charAt(0).toUpperCase()}
                </div>

                <div style={{ flex: 1, minWidth: 140 }}>
                  <div style={{ fontWeight: 700, fontSize: 14, color: T.white, marginBottom: 3 }}>
                    {sub.full_name}
                  </div>
                  <div style={{ fontSize: 12, color: T.muted }}>{sub.contact}</div>
                  {sub.receipt_url && (
                    <a href={sub.receipt_url} target="_blank" rel="noopener noreferrer"
                      onClick={e => e.stopPropagation()}
                      style={{ color: T.green, fontSize: 11, textDecoration: "none",
                        display: "block", marginTop: 4, fontWeight: 600 }}>
                      📄 View Receipt
                    </a>
                  )}
                </div>

                <div style={{ minWidth: 70, textAlign: "center" }}>
                  <PlanPill name={sub.plan_name} />
                </div>

                <div style={{ minWidth: 100, textAlign: "right" }}>
                  <div style={{ fontWeight: 800, fontSize: 14, color: T.green }}>
                    ₦{Number(sub.amount).toLocaleString()}
                  </div>
                  <div style={{ fontSize: 11, color: T.mutedLo }}>
                    {new Date(sub.created_at).toLocaleDateString()}
                  </div>
                </div>

                <div style={{ minWidth: 80, textAlign: "right" }}>
                  <Badge status={sub.payment_status} />
                </div>

                <button
                  onClick={e => { e.stopPropagation(); setSelected(sub); }}
                  style={{
                    padding: "7px 14px", borderRadius: 10,
                    border: `1px solid ${T.greenBd}`, background: T.greenDim,
                    color: T.green, fontSize: 12, fontWeight: 700,
                    cursor: "pointer", fontFamily: T.font,
                  }}>
                  View
                </button>

                {sub.payment_status === "pending" && (
                  <button
                    onClick={e => { e.stopPropagation(); updateStatus(sub.id, "approved"); }}
                    disabled={actionLoad}
                    style={{
                      padding: "7px 14px", borderRadius: 10, border: "none",
                      background: T.accent, color: T.accentDark,
                      fontSize: 12, fontWeight: 800,
                      cursor: actionLoad ? "not-allowed" : "pointer",
                      fontFamily: T.font, flexShrink: 0,
                    }}>
                    {actionLoad ? "…" : "Approve"}
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <DetailSheet
        sub={selected}
        onClose={() => setSelected(null)}
        onApprove={id => updateStatus(id, "approved")}
        onReject={id  => updateStatus(id, "rejected")}
        loading={actionLoad}
      />

      <ToastContainer position="top-right" autoClose={4000} theme="dark" />
    </div>
  );
}