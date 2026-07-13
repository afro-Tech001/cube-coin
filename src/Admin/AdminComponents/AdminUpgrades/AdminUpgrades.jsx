import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "../../../libs/supabase";
import "./AdminUpgrades.css";

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmtDate(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-NG", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function fmtNaira(n) {
  return "₦" + Number(n || 0).toLocaleString("en-NG", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

const STATUS_META = {
  pending:   { color:"#fbbf24", bg:"rgba(251,191,36,.1)",   bd:"rgba(251,191,36,.25)",  label:"Pending"   },
  approved:  { color:"#4ade80", bg:"rgba(74,222,128,.1)",   bd:"rgba(74,222,128,.25)",  label:"Approved"  },
  rejected:  { color:"#f87171", bg:"rgba(248,113,113,.1)",  bd:"rgba(248,113,113,.25)", label:"Rejected"  },
};

const PLAN_ICONS = {
  Basic:"🟢", Starter:"⬡", Bronze:"🥉",
  Silver:"🥈", Gold:"🥇", Diamond:"💎",
};

function StatusBadge({ status }) {
  const m = STATUS_META[status] || STATUS_META.pending;
  return (
    <span style={{
      background: m.bg, border:`1px solid ${m.bd}`, color: m.color,
      fontSize: 10, fontWeight: 700, padding:"3px 10px",
      borderRadius: 100, letterSpacing:".06em", textTransform:"uppercase",
      whiteSpace: "nowrap",
    }}>{m.label}</span>
  );
}

// ── Detail sheet ──────────────────────────────────────────────────────────────
function DetailSheet({ upgrade, onClose, onApprove, onReject, loading }) {
  const [note, setNote] = useState("");
  if (!upgrade) return null;

  const isPending = upgrade.status === "pending";

  return (
    <div
      style={{
        position:"fixed", inset:0, background:"rgba(0,0,0,.78)",
        display:"flex", alignItems:"flex-end", justifyContent:"center",
        zIndex:999,
      }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div style={{
        background:"#0a1c0e", border:"1px solid rgba(74,222,128,.22)",
        borderRadius:"24px 24px 0 0", padding:"24px 22px 36px",
        width:"100%", maxWidth:520, maxHeight:"92vh", overflowY:"auto",
        fontFamily:"'DM Sans',sans-serif",
        animation:"sheetUp .28s cubic-bezier(.34,1.56,.64,1)",
      }}>
        <style>{`@keyframes sheetUp{from{transform:translateY(60px);opacity:0}to{transform:translateY(0);opacity:1}}`}</style>

        {/* Header */}
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:20 }}>
          <div>
            <div style={{ fontSize:11, color:"rgba(255,255,255,.4)", fontWeight:600, textTransform:"uppercase", letterSpacing:".1em", marginBottom:5 }}>
              Upgrade request
            </div>
            <div style={{ fontSize:"1.3rem", fontWeight:800, color:"#fff", display:"flex", alignItems:"center", gap:10 }}>
              {upgrade.profiles?.full_name || "Unknown user"}
              <StatusBadge status={upgrade.status} />
            </div>
            <div style={{ fontSize:12, color:"rgba(255,255,255,.4)", marginTop:4 }}>
              {upgrade.profiles?.email || "—"}
            </div>
          </div>
          <button onClick={onClose} style={{
            background:"rgba(255,255,255,.07)", border:"none", color:"rgba(255,255,255,.5)",
            width:30, height:30, borderRadius:"50%", fontSize:18, cursor:"pointer",
            display:"flex", alignItems:"center", justifyContent:"center",
          }}>×</button>
        </div>

        {/* Upgrade summary */}
        <div style={{
          background:"rgba(74,222,128,.05)", border:"1px solid rgba(74,222,128,.18)",
          borderRadius:14, padding:"14px 16px", marginBottom:18,
          display:"flex", flexDirection:"column", gap:8,
        }}>
          {/* From → To */}
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            <div style={{
              flex:1, background:"rgba(255,255,255,.05)", borderRadius:10,
              padding:"10px 14px", textAlign:"center",
            }}>
              <div style={{ fontSize:10, color:"rgba(255,255,255,.35)", marginBottom:4, textTransform:"uppercase", letterSpacing:".06em" }}>From</div>
              <div style={{ fontSize:"1.2rem" }}>{PLAN_ICONS[upgrade.from_plan] || "⬡"}</div>
              <div style={{ fontWeight:700, color:"rgba(255,255,255,.7)", fontSize:14 }}>{upgrade.from_plan || "—"}</div>
              <div style={{ fontSize:11, color:"rgba(255,255,255,.35)", marginTop:2 }}>{upgrade.from_rate} CUBE/hr</div>
            </div>

            <div style={{ fontSize:"1.4rem", color:"#4ade80" }}>→</div>

            <div style={{
              flex:1, background:"rgba(74,222,128,.08)", border:"1px solid rgba(74,222,128,.2)",
              borderRadius:10, padding:"10px 14px", textAlign:"center",
            }}>
              <div style={{ fontSize:10, color:"rgba(74,222,128,.6)", marginBottom:4, textTransform:"uppercase", letterSpacing:".06em" }}>To</div>
              <div style={{ fontSize:"1.2rem" }}>{PLAN_ICONS[upgrade.to_plan] || "⬡"}</div>
              <div style={{ fontWeight:800, color:"#4ade80", fontSize:14 }}>{upgrade.to_plan || "—"}</div>
              <div style={{ fontSize:11, color:"rgba(74,222,128,.6)", marginTop:2 }}>{upgrade.to_rate} CUBE/hr</div>
            </div>
          </div>

          {/* Details grid */}
          {[
            ["Amount paid",   fmtNaira(upgrade.upgrade_amount)],
            ["Reference",     upgrade.tx_ref || "—"],
            ["Submitted",     fmtDate(upgrade.created_at)],
            ["Processed",     fmtDate(upgrade.processed_at)],
          ].map(([l, v]) => (
            <div key={l} style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
              <span style={{ fontSize:11, color:"rgba(255,255,255,.4)" }}>{l}</span>
              <span style={{ fontSize:13, fontWeight:600, color: l==="Amount paid" ? "#4ade80" : "#fff" }}>{v}</span>
            </div>
          ))}
        </div>

        {/* Receipt */}
        {upgrade.receipt_url && (
          <div style={{ marginBottom:16 }}>
            <div style={{ fontSize:11, color:"rgba(255,255,255,.4)", fontWeight:600, textTransform:"uppercase", letterSpacing:".06em", marginBottom:8 }}>
              Payment receipt
            </div>
            {upgrade.receipt_url.toLowerCase().endsWith(".pdf") ? (
              <a href={upgrade.receipt_url} target="_blank" rel="noreferrer" style={{
                display:"inline-flex", alignItems:"center", gap:8,
                padding:"10px 16px", borderRadius:10,
                background:"rgba(96,165,250,.1)", border:"1px solid rgba(96,165,250,.25)",
                color:"#60a5fa", fontSize:13, fontWeight:700, textDecoration:"none",
              }}>
                📄 View PDF receipt
              </a>
            ) : (
              <a href={upgrade.receipt_url} target="_blank" rel="noreferrer">
                <img
                  src={upgrade.receipt_url}
                  alt="receipt"
                  style={{ width:"100%", borderRadius:12, border:"1px solid rgba(74,222,128,.15)", maxHeight:280, objectFit:"cover" }}
                />
              </a>
            )}
          </div>
        )}

        {/* Admin note */}
        {isPending && (
          <div style={{ marginBottom:16 }}>
            <div style={{ fontSize:11, color:"rgba(255,255,255,.4)", fontWeight:600, textTransform:"uppercase", letterSpacing:".06em", marginBottom:6 }}>
              Admin note (optional)
            </div>
            <textarea
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="Add a note for this upgrade…"
              style={{
                width:"100%", background:"rgba(255,255,255,.05)",
                border:"1px solid rgba(255,255,255,.1)", borderRadius:12,
                padding:"10px 14px", color:"#fff", fontFamily:"'DM Sans',sans-serif",
                fontSize:13, outline:"none", resize:"vertical", minHeight:72,
                boxSizing:"border-box",
              }}
            />
          </div>
        )}

        {/* Actions */}
        {isPending && (
          <div style={{ display:"flex", gap:10, marginTop:4 }}>
            <button
              onClick={() => onReject(upgrade, note)}
              disabled={loading}
              style={{
                flex:1, padding:"12px 16px", borderRadius:12,
                background:"rgba(248,113,113,.08)", border:"1px solid rgba(248,113,113,.3)",
                color:"#f87171", fontWeight:700, fontSize:14, cursor:"pointer",
                fontFamily:"'DM Sans',sans-serif", transition:".15s",
                opacity: loading ? .5 : 1,
              }}
            >
              ✕ Reject
            </button>
            <button
              onClick={() => onApprove(upgrade, note)}
              disabled={loading}
              style={{
                flex:2, padding:"12px 16px", borderRadius:12,
                background:"linear-gradient(135deg,#4ade80,#22c55e)",
                border:"none", color:"#041107", fontWeight:800, fontSize:14,
                cursor:"pointer", fontFamily:"'DM Sans',sans-serif",
                opacity: loading ? .5 : 1,
              }}
            >
              {loading ? "Processing…" : "✓ Approve upgrade"}
            </button>
          </div>
        )}

        {!isPending && (
          <div style={{
            textAlign:"center", padding:"10px", fontSize:12,
            color:"rgba(255,255,255,.35)", background:"rgba(0,0,0,.2)",
            borderRadius:10,
          }}>
            This upgrade was <strong style={{ color:"#fff" }}>{upgrade.status}</strong> on {fmtDate(upgrade.processed_at)}
            {upgrade.admin_note && (
              <div style={{ marginTop:8, color:"rgba(255,255,255,.5)" }}>Note: {upgrade.admin_note}</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function AdminUpgrades() {
  const [upgrades,   setUpgrades]   = useState([]);
  const [profiles,   setProfiles]   = useState({});
  const [loading,    setLoading]    = useState(true);
  const [actionLoad, setActionLoad] = useState(false);
  const [search,     setSearch]     = useState("");
  const [filter,     setFilter]     = useState("all");
  const [selected,   setSelected]   = useState(null);
  const [toast,      setToast]      = useState(null);
  const [errMsg,     setErrMsg]     = useState(null);

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  // ── Stats ─────────────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const pending  = upgrades.filter(u => u.status === "pending").length;
    const approved = upgrades.filter(u => u.status === "approved").length;
    const rejected = upgrades.filter(u => u.status === "rejected").length;
    const revenue  = upgrades.filter(u => u.status === "approved")
                             .reduce((a, u) => a + Number(u.upgrade_amount || 0), 0);
    return { total: upgrades.length, pending, approved, rejected, revenue };
  }, [upgrades]);

  // ── Fetch ─────────────────────────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    setLoading(true);
    setErrMsg(null);

    const { data: upData, error: upErr } = await supabase
      .from("subscription_upgrades")
      .select("*")
      .order("created_at", { ascending: false });

    if (upErr) {
      console.error("Upgrades fetch error:", upErr);
      setErrMsg(upErr.message);
      setLoading(false);
      return;
    }

    const rows = upData || [];

    // Fetch matching profiles
    const userIds = [...new Set(rows.map(r => r.user_id).filter(Boolean))];
    let profileMap = {};

    if (userIds.length > 0) {
      const { data: profData } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .in("id", userIds);

      (profData || []).forEach(p => { profileMap[p.id] = p; });
    }

    // Enrich upgrades with profile data
    const enriched = rows.map(u => ({
      ...u,
      profiles: profileMap[u.user_id] || null,
    }));

    setUpgrades(enriched);
    setProfiles(profileMap);
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ── Approve ───────────────────────────────────────────────────────────────
  const handleApprove = async (upgrade, note) => {
    setActionLoad(true);
    try {
      const now = new Date().toISOString();

      // 1. Update upgrade record
      const { error: upErr } = await supabase
        .from("subscription_upgrades")
        .update({ status:"approved", admin_note:note||null, processed_at:now })
        .eq("id", upgrade.id);

      if (upErr) throw new Error(upErr.message);

      // 2. Update the pending subscription row to approved
      const { error: subErr } = await supabase
        .from("subscriptions")
        .update({
          payment_status: "approved",
          plan_status:    "active",
          approved_at:    now,
          activated_at:   now,
        })
        .eq("tx_ref",   upgrade.tx_ref)
        .eq("user_id",  upgrade.user_id);

      if (subErr) throw new Error(subErr.message);

      // 3. Update profile — new plan name + subscription_status + mining rate
      const { error: profErr } = await supabase
        .from("profiles")
        .update({
          subscription_status: "approved",
          plan_name:           upgrade.to_plan,
          cubes_granted:       false, // reset so new plan bonus is granted
        })
        .eq("id", upgrade.user_id);

      if (profErr) throw new Error(profErr.message);

      // 4. Refresh local state
      setUpgrades(prev => prev.map(u =>
        u.id === upgrade.id
          ? { ...u, status:"approved", admin_note:note||null, processed_at:now }
          : u
      ));
      setSelected(null);
      showToast(`✅ Upgrade approved — ${upgrade.profiles?.full_name || "user"} is now on ${upgrade.to_plan}`);

    } catch (err) {
      console.error("Approve error:", err);
      showToast("Failed: " + err.message, "error");
    } finally {
      setActionLoad(false);
    }
  };

  // ── Reject ────────────────────────────────────────────────────────────────
  const handleReject = async (upgrade, note) => {
    setActionLoad(true);
    try {
      const now = new Date().toISOString();

      // 1. Update upgrade record
      const { error: upErr } = await supabase
        .from("subscription_upgrades")
        .update({ status:"rejected", admin_note:note||null, processed_at:now })
        .eq("id", upgrade.id);

      if (upErr) throw new Error(upErr.message);

      // 2. Update subscription row to rejected
      await supabase
        .from("subscriptions")
        .update({ payment_status:"rejected", plan_status:"rejected" })
        .eq("tx_ref",  upgrade.tx_ref)
        .eq("user_id", upgrade.user_id);

      // 3. Restore profile subscription_status to approved (they still have old plan)
      await supabase
        .from("profiles")
        .update({ subscription_status:"approved" })
        .eq("id", upgrade.user_id);

      setUpgrades(prev => prev.map(u =>
        u.id === upgrade.id
          ? { ...u, status:"rejected", admin_note:note||null, processed_at:now }
          : u
      ));
      setSelected(null);
      showToast(`Upgrade rejected — user kept on ${upgrade.from_plan}`, "error");

    } catch (err) {
      console.error("Reject error:", err);
      showToast("Failed: " + err.message, "error");
    } finally {
      setActionLoad(false);
    }
  };

  // ── Filter + search ───────────────────────────────────────────────────────
  const visible = useMemo(() => {
    return upgrades
      .filter(u => {
        if (filter !== "all" && u.status !== filter) return false;
        const q = search.toLowerCase().trim();
        if (!q) return true;
        return (
          (u.profiles?.full_name || "").toLowerCase().includes(q) ||
          (u.profiles?.email     || "").toLowerCase().includes(q) ||
          (u.from_plan           || "").toLowerCase().includes(q) ||
          (u.to_plan             || "").toLowerCase().includes(q) ||
          (u.tx_ref              || "").toLowerCase().includes(q)
        );
      });
  }, [upgrades, filter, search]);

  const TABS = [
    { key:"all",      label:"All",      count: stats.total    },
    { key:"pending",  label:"Pending",  count: stats.pending  },
    { key:"approved", label:"Approved", count: stats.approved },
    { key:"rejected", label:"Rejected", count: stats.rejected },
  ];

  // ── Loading / error ───────────────────────────────────────────────────────
  if (loading) return (
    <div className="au-page">
      <div className="au-loading">
        <div style={{ fontSize:"2rem" }}>⬆️</div>
        Loading upgrade requests…
      </div>
    </div>
  );

  if (errMsg) return (
    <div className="au-page">
      <div className="au-loading">
        <div style={{ fontSize:"2rem" }}>⚠️</div>
        <div style={{ color:"#f87171", fontWeight:700 }}>Error loading upgrades</div>
        <div style={{ fontSize:12, color:"rgba(255,255,255,.4)", maxWidth:400, textAlign:"center" }}>{errMsg}</div>
        <button onClick={fetchData} className="au-retry-btn">↻ Retry</button>
      </div>
    </div>
  );

  return (
    <div className="au-page">

      {/* ── Header ── */}
      <div className="au-header">
        <div>
          <h1>⬆️ Plan Upgrades</h1>
          <p>Review and approve user subscription upgrade requests</p>
        </div>
        <div style={{ display:"flex", gap:8, alignItems:"center" }}>
          {stats.pending > 0 && (
            <div className="au-pending-alert">
              🔔 {stats.pending} pending
            </div>
          )}
          <button className="au-refresh-btn" onClick={fetchData}>↻ Refresh</button>
        </div>
      </div>

      {/* ── Stats ── */}
      <div className="au-stats">
        {[
          { label:"Total",    value: stats.total,                            color:"#fff"    },
          { label:"Pending",  value: stats.pending,                          color:"#fbbf24" },
          { label:"Approved", value: stats.approved,                         color:"#4ade80" },
          { label:"Rejected", value: stats.rejected,                         color:"#f87171" },
          { label:"Revenue",  value: fmtNaira(stats.revenue),                color:"#4ade80" },
        ].map(s => (
          <div key={s.label} className="au-stat-card">
            <div className="au-stat-label">{s.label}</div>
            <div className="au-stat-value" style={{ color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* ── Toolbar ── */}
      <div className="au-toolbar">
        <div className="au-search">
          <span>🔍</span>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by name, email, plan, reference…"
          />
        </div>
      </div>

      {/* ── Filter tabs ── */}
      <div className="au-tabs">
        {TABS.map(t => (
          <button
            key={t.key}
            className={`au-tab ${filter === t.key ? "active" : ""}`}
            onClick={() => setFilter(t.key)}
          >
            {t.label}
            <span className={`au-tab-count ${filter === t.key ? "active" : ""}`}>{t.count}</span>
          </button>
        ))}
      </div>

      {/* ── List ── */}
      {visible.length === 0 ? (
        <div className="au-empty">
          <div style={{ fontSize:"2rem", marginBottom:10 }}>📭</div>
          <div>No upgrade requests found</div>
        </div>
      ) : (
        <div className="au-list">
          {visible.map(u => (
            <div
              key={u.id}
              className={`au-row ${u.status === "pending" ? "pending" : ""}`}
              onClick={() => setSelected(u)}
            >
              {/* User info */}
              <div className="au-row-user">
                <div className="au-avatar">
                  {(u.profiles?.full_name || u.profiles?.email || "?").charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="au-row-name">
                    {u.profiles?.full_name || "Unknown"}
                  </div>
                  <div className="au-row-email">{u.profiles?.email || u.user_id?.slice(0,14)+"…"}</div>
                </div>
              </div>

              {/* Upgrade arrow */}
              <div className="au-row-upgrade">
                <div className="au-plan-pill from">
                  {PLAN_ICONS[u.from_plan] || "⬡"} {u.from_plan || "—"}
                </div>
                <div className="au-upgrade-arrow">→</div>
                <div className="au-plan-pill to">
                  {PLAN_ICONS[u.to_plan] || "⬡"} {u.to_plan || "—"}
                </div>
              </div>

              {/* Amount */}
              <div className="au-row-amount">{fmtNaira(u.upgrade_amount)}</div>

              {/* Date */}
              <div className="au-row-date">{fmtDate(u.created_at)}</div>

              {/* Status */}
              <div><StatusBadge status={u.status} /></div>

              {/* Action */}
              <button
                className={`au-row-btn ${u.status === "pending" ? "review" : "view"}`}
                onClick={e => { e.stopPropagation(); setSelected(u); }}
              >
                {u.status === "pending" ? "Review" : "View"}
              </button>
            </div>
          ))}
        </div>
      )}

      {/* ── Detail sheet ── */}
      <DetailSheet
        upgrade={selected}
        onClose={() => setSelected(null)}
        onApprove={handleApprove}
        onReject={handleReject}
        loading={actionLoad}
      />

      {/* ── Toast ── */}
      {toast && (
        <div className={`au-toast ${toast.type === "error" ? "error" : ""}`}>
          {toast.msg}
        </div>
      )}
    </div>
  );
}