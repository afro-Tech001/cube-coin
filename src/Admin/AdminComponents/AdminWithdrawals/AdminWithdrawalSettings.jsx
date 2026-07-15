import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "../../../libs/supabase";

const DAY_NAMES   = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
const SETTINGS_ID = "00000000-0000-0000-0000-000000000001";

const T = {
  bg:      "#050b07",
  surface: "rgba(10,28,14,.9)",
  surfaceHi:"rgba(14,34,16,.95)",
  border:  "rgba(74,222,128,.15)",
  borderHi:"rgba(74,222,128,.35)",
  green:   "#4ade80",
  accent:  "#22c55e",
  white:   "#fff",
  muted:   "rgba(255,255,255,.45)",
  mutedLo: "rgba(255,255,255,.25)",
  warn:    "#fbbf24",
  red:     "#f87171",
  font:    "'DM Sans', sans-serif",
};

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmtDate(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-NG", {
    day:"2-digit", month:"short", year:"numeric",
    hour:"2-digit", minute:"2-digit",
  });
}
function fmtNaira(n) {
  return "₦" + Number(n || 0).toLocaleString("en-NG", { minimumFractionDigits:2 });
}

// ── Toast ─────────────────────────────────────────────────────────────────────
function Toast({ msg, type }) {
  if (!msg) return null;
  return (
    <div style={{
      position:"fixed", bottom:28, left:"50%", transform:"translateX(-50%)",
      background: type === "error" ? T.red : T.green,
      color: type === "error" ? "#1a0000" : "#041107",
      fontWeight:700, padding:"11px 22px", borderRadius:100,
      fontSize:".85rem", zIndex:9999, fontFamily:T.font,
      animation:"toastUp .3s cubic-bezier(.34,1.4,.64,1)",
      whiteSpace:"nowrap", maxWidth:"calc(100vw - 32px)",
      boxShadow: type === "error"
        ? "0 8px 24px rgba(248,113,113,.35)"
        : "0 8px 24px rgba(74,222,128,.35)",
    }}>
      {msg}
      <style>{`@keyframes toastUp{from{opacity:0;transform:translateX(-50%) translateY(12px)}to{opacity:1;transform:translateX(-50%) translateY(0)}}`}</style>
    </div>
  );
}

// ── Status badge ──────────────────────────────────────────────────────────────
function StatusBadge({ status }) {
  const meta = {
    pending:  { color:T.warn,  bg:"rgba(251,191,36,.1)",  bd:"rgba(251,191,36,.25)",  label:"Pending"  },
    approved: { color:T.green, bg:"rgba(74,222,128,.1)",  bd:"rgba(74,222,128,.25)",  label:"Approved" },
    rejected: { color:T.red,   bg:"rgba(248,113,113,.1)", bd:"rgba(248,113,113,.25)", label:"Rejected" },
  }[status] || { color:T.muted, bg:"rgba(255,255,255,.06)", bd:"rgba(255,255,255,.1)", label:status };
  return (
    <span style={{
      background:meta.bg, border:`1px solid ${meta.bd}`, color:meta.color,
      fontSize:10, fontWeight:700, padding:"3px 10px",
      borderRadius:100, letterSpacing:".06em", textTransform:"uppercase", whiteSpace:"nowrap",
    }}>{meta.label}</span>
  );
}

// ── Reject Modal ──────────────────────────────────────────────────────────────
function RejectModal({ cashout, onClose, onConfirm, loading }) {
  const [reason, setReason] = useState("");
  const [selected, setSelected] = useState("");

  const QUICK_REASONS = [
  "Your withdrawal request has been declined. Our records indicate that you have already made two (2) withdrawals within the current week. As per our withdrawal policy, further cashouts are not permitted until the next designated withdrawal window. Please try again on Sunday. Your CUBE balance has been refunded in full. We appreciate your understanding.",
  "Payment receipt is unclear or unreadable",
  "Payment amount does not match the request",
  "Account details provided are incorrect",
  "Duplicate withdrawal request detected",
  "Suspicious activity detected on this account",
  "Receipt appears to be altered or fraudulent",
];

  const handleSelect = (r) => {
    setSelected(r);
    setReason(r);
  };

  if (!cashout) return null;

  return (
    <div style={{
      position:"fixed", inset:0, background:"rgba(0,0,0,.8)",
      display:"flex", alignItems:"flex-end", justifyContent:"center",
      zIndex:999, fontFamily:T.font,
    }} onClick={e => e.target === e.currentTarget && !loading && onClose()}>
      <div style={{
        background:"#0a1c0e", border:`1px solid rgba(248,113,113,.25)`,
        borderRadius:"24px 24px 0 0", padding:"24px 22px 36px",
        width:"100%", maxWidth:520, maxHeight:"92vh", overflowY:"auto",
        animation:"sheetUp .3s cubic-bezier(.34,1.4,.64,1)",
      }}>
        <style>{`@keyframes sheetUp{from{transform:translateY(60px);opacity:0}to{transform:translateY(0);opacity:1}}`}</style>

        {/* Handle */}
        <div style={{ width:36, height:4, borderRadius:2, background:"rgba(255,255,255,.12)", margin:"0 auto 20px" }} />

        {/* Header */}
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:20 }}>
          <div>
            <div style={{ fontSize:11, color:T.muted, fontWeight:600, textTransform:"uppercase", letterSpacing:".1em", marginBottom:5 }}>
              Reject withdrawal
            </div>
            <div style={{ fontSize:"1.2rem", fontWeight:800, color:T.white }}>
              {cashout.profiles?.full_name || "Unknown user"}
            </div>
            <div style={{ fontSize:12, color:T.muted, marginTop:3 }}>
              {cashout.profiles?.email || cashout.user_id?.slice(0,16)+"…"}
            </div>
          </div>
          <button onClick={onClose} disabled={loading} style={{
            background:"rgba(255,255,255,.07)", border:"none", color:T.muted,
            width:30, height:30, borderRadius:"50%", fontSize:18, cursor:"pointer",
            display:"flex", alignItems:"center", justifyContent:"center",
          }}>×</button>
        </div>

        {/* Cashout summary */}
        <div style={{
          background:"rgba(248,113,113,.06)", border:"1px solid rgba(248,113,113,.2)",
          borderRadius:14, padding:"14px 16px", marginBottom:20,
          display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:10,
        }}>
          <div>
            <div style={{ fontSize:11, color:T.muted, marginBottom:3 }}>Withdrawal amount</div>
            <div style={{ fontSize:"1.3rem", fontWeight:800, color:T.red }}>
              {Number(cashout.amount || 0).toLocaleString()} CUBE
            </div>
            <div style={{ fontSize:11, color:T.muted, marginTop:2 }}>
              = {fmtNaira(cashout.naira_value)}
            </div>
          </div>
          <div style={{ textAlign:"right" }}>
            <div style={{ fontSize:11, color:T.muted, marginBottom:3 }}>Will be refunded</div>
            <div style={{ fontSize:"1.3rem", fontWeight:800, color:T.green }}>
              {Number(cashout.amount || 0).toLocaleString()} CUBE
            </div>
            <div style={{ fontSize:11, color:"rgba(74,222,128,.6)", marginTop:2 }}>
              back to wallet
            </div>
          </div>
        </div>

        {/* Quick reason chips */}
        <div style={{ marginBottom:14 }}>
          <div style={{ fontSize:11, color:T.muted, fontWeight:600, textTransform:"uppercase", letterSpacing:".06em", marginBottom:10 }}>
            Quick reasons
          </div>
          <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
            {QUICK_REASONS.map(r => (
              <button key={r} onClick={() => handleSelect(r)} style={{
                padding:"6px 12px", borderRadius:100, border:"1px solid",
                borderColor: selected === r ? T.red : "rgba(255,255,255,.1)",
                background:  selected === r ? "rgba(248,113,113,.1)" : "transparent",
                color:       selected === r ? T.red : T.muted,
                fontSize:11, fontWeight:600, cursor:"pointer",
                fontFamily:T.font, transition:".15s",
                textAlign:"left",
              }}>{r}</button>
            ))}
          </div>
        </div>

        {/* Custom reason input */}
        <div style={{ marginBottom:20 }}>
          <div style={{ fontSize:11, color:T.muted, fontWeight:600, textTransform:"uppercase", letterSpacing:".06em", marginBottom:8 }}>
            Message to user *
          </div>
          <textarea
            value={reason}
            onChange={e => { setReason(e.target.value); setSelected(""); }}
            placeholder="Explain why this withdrawal is being rejected. The user will see this message in their wallet."
            rows={4}
            style={{
              width:"100%", background:"rgba(255,255,255,.05)",
              border:`1px solid ${reason.trim() ? "rgba(248,113,113,.3)" : "rgba(255,255,255,.1)"}`,
              borderRadius:12, padding:"12px 14px", color:T.white,
              fontFamily:T.font, fontSize:13, outline:"none", resize:"vertical",
              lineHeight:1.55, boxSizing:"border-box",
            }}
          />
          <div style={{ fontSize:11, color:T.muted, marginTop:5 }}>
            {reason.length}/300 characters
          </div>
        </div>

        {/* Warning */}
        <div style={{
          background:"rgba(251,191,36,.06)", border:"1px solid rgba(251,191,36,.18)",
          borderRadius:10, padding:"10px 14px", marginBottom:20,
          fontSize:12, color:"rgba(251,191,36,.8)", lineHeight:1.55,
        }}>
          ⚠ This will refund <strong>{Number(cashout.amount||0).toLocaleString()} CUBE</strong> back to the user's wallet
          and send them your rejection message. This action cannot be undone.
        </div>

        <div style={{ display:"flex", gap:10 }}>
          <button onClick={onClose} disabled={loading} style={{
            flex:1, padding:"12px", borderRadius:12, border:"1px solid rgba(255,255,255,.1)",
            background:"transparent", color:T.muted, fontWeight:700, fontSize:14,
            cursor:"pointer", fontFamily:T.font, opacity: loading ? .5 : 1,
          }}>Cancel</button>
          <button
            onClick={() => onConfirm(cashout, reason)}
            disabled={loading || !reason.trim()}
            style={{
              flex:2, padding:"12px", borderRadius:12, border:"none",
              background: reason.trim() ? "rgba(248,113,113,.15)" : "rgba(255,255,255,.05)",
              color: reason.trim() ? T.red : T.muted,
              border: `1px solid ${reason.trim() ? "rgba(248,113,113,.4)" : "rgba(255,255,255,.08)"}`,
              fontWeight:800, fontSize:14, cursor: reason.trim() ? "pointer" : "not-allowed",
              fontFamily:T.font, opacity: loading ? .6 : 1, transition:".15s",
            }}
          >
            {loading ? "Processing…" : "✕ Reject & Refund"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Cashout detail sheet ──────────────────────────────────────────────────────
function CashoutDetailSheet({ cashout, onClose, onApprove, onReject, loading }) {
  if (!cashout) return null;

  return (
    <div style={{
      position:"fixed", inset:0, background:"rgba(0,0,0,.75)",
      display:"flex", alignItems:"flex-end", justifyContent:"center",
      zIndex:998, fontFamily:T.font,
    }} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{
        background:"#0a1c0e", border:`1px solid ${T.border}`,
        borderRadius:"24px 24px 0 0", padding:"24px 22px 36px",
        width:"100%", maxWidth:520, maxHeight:"90vh", overflowY:"auto",
        animation:"sheetUp .28s cubic-bezier(.34,1.56,.64,1)",
      }}>
        <div style={{ width:36, height:4, borderRadius:2, background:"rgba(255,255,255,.12)", margin:"0 auto 20px" }} />

        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:20 }}>
          <div>
            <div style={{ fontSize:11, color:T.muted, fontWeight:600, textTransform:"uppercase", letterSpacing:".1em", marginBottom:5 }}>
              Cashout request
            </div>
            <div style={{ fontSize:"1.2rem", fontWeight:800, color:T.white, display:"flex", alignItems:"center", gap:10, flexWrap:"wrap" }}>
              {cashout.profiles?.full_name || "Unknown"}
              <StatusBadge status={cashout.status} />
            </div>
            <div style={{ fontSize:12, color:T.muted, marginTop:3 }}>{cashout.profiles?.email || "—"}</div>
          </div>
          <button onClick={onClose} style={{
            background:"rgba(255,255,255,.07)", border:"none", color:T.muted,
            width:30, height:30, borderRadius:"50%", fontSize:18, cursor:"pointer",
            display:"flex", alignItems:"center", justifyContent:"center",
          }}>×</button>
        </div>

        {/* Details grid */}
        <div style={{
          background:"rgba(74,222,128,.05)", border:`1px solid ${T.border}`,
          borderRadius:14, padding:"14px 16px", marginBottom:20,
          display:"flex", flexDirection:"column", gap:10,
        }}>
          {[
            ["Amount",         `${Number(cashout.amount||0).toLocaleString()} CUBE`],
            ["Naira value",    fmtNaira(cashout.naira_value)],
            ["Bank",           cashout.bank_name || "—"],
            ["Account number", cashout.account_number || "—"],
            ["Account name",   cashout.account_name || "—"],
            ["Reference",      cashout.tx_ref || "—"],
            ["Submitted",      fmtDate(cashout.created_at)],
          ].map(([l, v]) => (
            <div key={l} style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
              <span style={{ fontSize:11, color:T.muted }}>{l}</span>
              <span style={{ fontSize:13, fontWeight:600, color:T.white, textAlign:"right", maxWidth:"60%", wordBreak:"break-all" }}>{v}</span>
            </div>
          ))}
        </div>

        {/* Rejection message if already rejected */}
        {cashout.status === "rejected" && cashout.rejection_reason && (
          <div style={{
            background:"rgba(248,113,113,.07)", border:"1px solid rgba(248,113,113,.2)",
            borderRadius:12, padding:"14px 16px", marginBottom:20,
          }}>
            <div style={{ fontSize:11, color:T.red, fontWeight:700, textTransform:"uppercase", letterSpacing:".06em", marginBottom:8 }}>
              Rejection reason sent to user
            </div>
            <div style={{ fontSize:13, color:"rgba(255,255,255,.7)", lineHeight:1.6 }}>
              "{cashout.rejection_reason}"
            </div>
            {cashout.refunded_at && (
              <div style={{ fontSize:11, color:"rgba(74,222,128,.6)", marginTop:8 }}>
                ✓ {cashout.refund_amount?.toLocaleString()} CUBE refunded at {fmtDate(cashout.refunded_at)}
              </div>
            )}
          </div>
        )}

        {cashout.status === "pending" && (
          <div style={{ display:"flex", gap:10 }}>
            <button onClick={() => onReject(cashout)} disabled={loading} style={{
              flex:1, padding:"12px", borderRadius:12,
              background:"rgba(248,113,113,.08)", border:"1px solid rgba(248,113,113,.3)",
              color:T.red, fontWeight:700, fontSize:14, cursor:"pointer",
              fontFamily:T.font, opacity: loading ? .5 : 1,
            }}>✕ Reject</button>
            <button onClick={() => onApprove(cashout)} disabled={loading} style={{
              flex:2, padding:"12px", borderRadius:12,
              background:"linear-gradient(135deg,#4ade80,#22c55e)",
              border:"none", color:"#041107", fontWeight:800, fontSize:14,
              cursor:"pointer", fontFamily:T.font, opacity: loading ? .5 : 1,
            }}>{loading ? "Processing…" : "✓ Approve"}</button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function AdminWithdrawalSettings() {
  const [activeTab,   setActiveTab]   = useState("requests");
  const [toast,       setToast]       = useState(null);
  const [loading,     setLoading]     = useState(true);
  const [saving,      setSaving]      = useState(false);
  const [actionLoad,  setActionLoad]  = useState(false);

  // Settings state
  const [enabled,       setEnabled]       = useState(true);
  const [allowedDays,   setAllowedDays]   = useState([0]);
  const [openTime,      setOpenTime]      = useState("08:00");
  const [closeTime,     setCloseTime]     = useState("20:00");
  const [lockedMsg,     setLockedMsg]     = useState("");
  const [useTimeWindow, setUseTimeWindow] = useState(false);

  // Cashout state
  const [cashouts,       setCashouts]       = useState([]);
  const [profiles,       setProfiles]       = useState({});
  const [filterStatus,   setFilterStatus]   = useState("pending");
  const [selectedCashout,setSelectedCashout]= useState(null);
  const [rejectTarget,   setRejectTarget]   = useState(null);

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  // ── Load settings ─────────────────────────────────────────────────────────
  const loadSettings = useCallback(async () => {
    const { data } = await supabase
      .from("withdrawal_settings")
      .select("*")
      .eq("id", SETTINGS_ID)
      .maybeSingle();
    if (data) {
      setEnabled(data.enabled ?? true);
      setAllowedDays(data.allowed_days || [0]);
      setOpenTime(data.open_time?.slice(0,5) || "08:00");
      setCloseTime(data.close_time?.slice(0,5) || "20:00");
      setLockedMsg(data.locked_msg || "");
      setUseTimeWindow(!!(data.open_time && data.close_time));
    }
  }, []);

  // ── Load cashouts ─────────────────────────────────────────────────────────
  const loadCashouts = useCallback(async () => {
    const { data: co, error } = await supabase
      .from("cashout_requests")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) { console.error("Cashouts fetch:", error); return; }

    const rows = co || [];
    const userIds = [...new Set(rows.map(r => r.user_id).filter(Boolean))];
    let profileMap = {};

    if (userIds.length > 0) {
      const { data: profs } = await supabase
        .from("profiles")
        .select("id, full_name, email, cube_balance")
        .in("id", userIds);
      (profs || []).forEach(p => { profileMap[p.id] = p; });
    }

    setProfiles(profileMap);
    setCashouts(rows.map(r => ({ ...r, profiles: profileMap[r.user_id] || null })));
  }, []);

  useEffect(() => {
    Promise.all([loadSettings(), loadCashouts()]).finally(() => setLoading(false));
  }, [loadSettings, loadCashouts]);

  // ── Save settings ─────────────────────────────────────────────────────────
  const handleSaveSettings = async () => {
    if (allowedDays.length === 0) { showToast("Select at least one allowed day", "error"); return; }
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from("withdrawal_settings").update({
      enabled, allowed_days: allowedDays,
      open_time:  useTimeWindow ? openTime  : null,
      close_time: useTimeWindow ? closeTime : null,
      locked_msg: lockedMsg || "Withdrawals are only available on Sundays. Check back then!",
      updated_at: new Date().toISOString(),
      updated_by: user?.email || null,
    }).eq("id", SETTINGS_ID);
    setSaving(false);
    if (error) showToast("Failed: " + error.message, "error");
    else showToast("Settings saved ✓");
  };

  // ── Approve cashout ───────────────────────────────────────────────────────
  const handleApprove = async (cashout) => {
    setActionLoad(true);
    try {
      const { error } = await supabase
        .from("cashout_requests")
        .update({ status:"approved" })
        .eq("id", cashout.id);
      if (error) throw new Error(error.message);

      // Log approved transaction
      await supabase.from("wallet_transactions").insert([{
        user_id: cashout.user_id,
        title:   "Cashout Approved",
        amount:  -Number(cashout.amount),
        type:    "debit",
      }]);

      setCashouts(prev => prev.map(c =>
        c.id === cashout.id ? { ...c, status:"approved" } : c
      ));
      setSelectedCashout(null);
      showToast(`✓ Cashout approved for ${cashout.profiles?.full_name || "user"}`);
    } catch (err) {
      showToast("Failed: " + err.message, "error");
    } finally { setActionLoad(false); }
  };

  // ── Reject cashout (with reason + refund) ─────────────────────────────────
  const handleRejectConfirm = async (cashout, reason) => {
    setActionLoad(true);
    try {
      const now          = new Date().toISOString();
      const refundAmount = Number(cashout.amount || 0);

      // 1. Update cashout request with rejection reason
      const { error: coErr } = await supabase
        .from("cashout_requests")
        .update({
          status:           "rejected",
          rejection_reason: reason,
          refunded_at:      now,
          refund_amount:    refundAmount,
        })
        .eq("id", cashout.id);
      if (coErr) throw new Error(coErr.message);

      // 2. Refund CUBE to user's balance
      const { data: prof, error: profReadErr } = await supabase
        .from("profiles")
        .select("cube_balance")
        .eq("id", cashout.user_id)
        .single();
      if (profReadErr) throw new Error(profReadErr.message);

      const newBalance = Number(prof.cube_balance || 0) + refundAmount;
      const { error: profErr } = await supabase
        .from("profiles")
        .update({ cube_balance: newBalance })
        .eq("id", cashout.user_id);
      if (profErr) throw new Error(profErr.message);

      // 3. Log refund transaction
      await supabase.from("wallet_transactions").insert([{
        user_id: cashout.user_id,
        title:   "Cashout Refund",
        amount:  refundAmount,
        type:    "credit",
      }]);

      setCashouts(prev => prev.map(c =>
        c.id === cashout.id
          ? { ...c, status:"rejected", rejection_reason:reason, refunded_at:now, refund_amount:refundAmount }
          : c
      ));
      setRejectTarget(null);
      setSelectedCashout(null);
      showToast(`✕ Rejected & refunded ${refundAmount.toLocaleString()} CUBE to ${cashout.profiles?.full_name || "user"}`);
    } catch (err) {
      showToast("Failed: " + err.message, "error");
    } finally { setActionLoad(false); }
  };

  // ── Filtered cashouts ─────────────────────────────────────────────────────
  const filtered = useMemo(() =>
    cashouts.filter(c => filterStatus === "all" || c.status === filterStatus),
    [cashouts, filterStatus]
  );

  const counts = useMemo(() => ({
    all:      cashouts.length,
    pending:  cashouts.filter(c => c.status === "pending").length,
    approved: cashouts.filter(c => c.status === "approved").length,
    rejected: cashouts.filter(c => c.status === "rejected").length,
  }), [cashouts]);

  const toggleDay = (d) =>
    setAllowedDays(p => p.includes(d) ? p.filter(x => x !== d) : [...p, d].sort());

  const Toggle = ({ on, onChange }) => (
    <button onClick={onChange} style={{
      width:52, height:28, borderRadius:14, border:"none", cursor:"pointer",
      background: on ? T.accent : "rgba(255,255,255,.1)", transition:".2s", position:"relative",
    }}>
      <span style={{
        position:"absolute", top:4, left: on ? 26 : 4,
        width:20, height:20, borderRadius:"50%", background:T.white, transition:".2s",
      }} />
    </button>
  );

  const card = (children, extra = {}) => ({
    background:T.surface, border:`1px solid ${T.border}`,
    borderRadius:18, padding:"18px 20px", marginBottom:14, ...extra,
  });

  if (loading) return (
    <div style={{ padding:60, color:T.muted, fontFamily:T.font, textAlign:"center" }}>
      <div style={{ fontSize:"2rem", marginBottom:12 }}>⏳</div>
      Loading…
    </div>
  );

  return (
    <div style={{ minHeight:"100vh", background:T.bg, fontFamily:T.font, paddingBottom:80 }}>

      {/* ── Page header ── */}
      <div style={{
        padding:"24px 24px 0",
        borderBottom:`1px solid rgba(74,222,128,.08)`,
        marginBottom:0,
      }}>
        <div style={{ fontSize:11, color:T.muted, fontWeight:600, textTransform:"uppercase", letterSpacing:".1em", marginBottom:6 }}>
          Admin panel
        </div>
        <h1 style={{ fontSize:"1.55rem", fontWeight:800, color:T.white, margin:"0 0 4px" }}>
          Withdrawals
        </h1>
        <p style={{ color:T.muted, fontSize:".85rem", margin:"0 0 20px" }}>
          Manage cashout requests and withdrawal schedule
        </p>

        {/* Tabs */}
        <div style={{ display:"flex", gap:0, borderBottom:`1px solid rgba(74,222,128,.08)` }}>
          {[
            { key:"requests", label:`Cashout Requests`, count:counts.pending },
            { key:"settings", label:"Schedule Settings", count:null },
          ].map(t => (
            <button key={t.key} onClick={() => setActiveTab(t.key)} style={{
              padding:"10px 20px", border:"none", borderBottom:"2px solid",
              borderBottomColor: activeTab === t.key ? T.green : "transparent",
              background:"transparent", color: activeTab === t.key ? T.green : T.muted,
              fontWeight:700, fontSize:13, cursor:"pointer", fontFamily:T.font,
              display:"flex", alignItems:"center", gap:7, marginBottom:-1,
            }}>
              {t.label}
              {t.count > 0 && (
                <span style={{
                  background:"rgba(251,191,36,.15)", border:"1px solid rgba(251,191,36,.3)",
                  color:T.warn, fontSize:10, fontWeight:800,
                  padding:"1px 7px", borderRadius:100,
                }}>{t.count}</span>
              )}
            </button>
          ))}
        </div>
      </div>

      <div style={{ padding:"20px 24px" }}>

        {/* ══════════════ CASHOUT REQUESTS TAB ══════════════ */}
        {activeTab === "requests" && (
          <>
            {/* Stats */}
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(110px, 1fr))", gap:10, marginBottom:20 }}>
              {[
                { label:"Total",    val:counts.all,      color:T.white  },
                { label:"Pending",  val:counts.pending,  color:T.warn   },
                { label:"Approved", val:counts.approved, color:T.green  },
                { label:"Rejected", val:counts.rejected, color:T.red    },
              ].map(s => (
                <div key={s.label} style={{
                  background:T.surface, border:`1px solid ${T.border}`,
                  borderRadius:14, padding:"14px 16px",
                }}>
                  <div style={{ fontSize:10, color:T.muted, fontWeight:700, textTransform:"uppercase", letterSpacing:".08em", marginBottom:6 }}>
                    {s.label}
                  </div>
                  <div style={{ fontSize:"1.5rem", fontWeight:800, color:s.color }}>{s.val}</div>
                </div>
              ))}
            </div>

            {/* Filter tabs */}
            <div style={{ display:"flex", gap:6, marginBottom:16, flexWrap:"wrap" }}>
              {["all","pending","approved","rejected"].map(f => (
                <button key={f} onClick={() => setFilterStatus(f)} style={{
                  padding:"7px 14px", borderRadius:10, border:"1px solid",
                  borderColor: filterStatus === f ? T.green : T.border,
                  background:  filterStatus === f ? "rgba(74,222,128,.06)" : "transparent",
                  color:       filterStatus === f ? T.green : T.muted,
                  fontWeight:700, fontSize:12, cursor:"pointer", fontFamily:T.font,
                  display:"flex", alignItems:"center", gap:6,
                }}>
                  {f.charAt(0).toUpperCase()+f.slice(1)}
                  <span style={{
                    background: filterStatus === f ? T.green : "rgba(127,255,110,.12)",
                    color:      filterStatus === f ? "#041107" : T.muted,
                    fontSize:10, fontWeight:800, padding:"1px 6px", borderRadius:100,
                  }}>{counts[f]}</span>
                </button>
              ))}
              <button onClick={loadCashouts} style={{
                marginLeft:"auto", padding:"7px 14px", borderRadius:10,
                border:`1px solid ${T.border}`, background:"transparent",
                color:T.muted, fontWeight:700, fontSize:12, cursor:"pointer", fontFamily:T.font,
              }}>↻ Refresh</button>
            </div>

            {/* List */}
            {filtered.length === 0 ? (
              <div style={{ textAlign:"center", padding:"60px 0", color:T.muted }}>
                <div style={{ fontSize:"2rem", marginBottom:10 }}>📭</div>
                No {filterStatus !== "all" ? filterStatus : ""} requests found
              </div>
            ) : (
              <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                {filtered.map(c => (
                  <div key={c.id} style={{
                    background:T.surface,
                    border:`1px solid ${c.status === "pending" ? "rgba(251,191,36,.2)" : T.border}`,
                    borderRadius:16, padding:"14px 18px",
                    display:"flex", alignItems:"center", gap:14, flexWrap:"wrap",
                    cursor:"pointer", transition:"border-color .15s, transform .15s",
                  }}
                    onClick={() => setSelectedCashout(c)}
                    onMouseEnter={e => { e.currentTarget.style.borderColor="rgba(74,222,128,.3)"; e.currentTarget.style.transform="translateX(2px)"; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor=c.status==="pending"?"rgba(251,191,36,.2)":T.border; e.currentTarget.style.transform="translateX(0)"; }}
                  >
                    {/* Avatar */}
                    <div style={{
                      width:38, height:38, borderRadius:"50%", flexShrink:0,
                      background:"rgba(74,222,128,.1)", border:`1px solid rgba(74,222,128,.22)`,
                      display:"flex", alignItems:"center", justifyContent:"center",
                      fontSize:14, fontWeight:800, color:T.green,
                    }}>
                      {(c.profiles?.full_name || c.profiles?.email || "?").charAt(0).toUpperCase()}
                    </div>

                    {/* User info */}
                    <div style={{ flex:1, minWidth:130 }}>
                      <div style={{ fontWeight:700, fontSize:14, color:T.white }}>
                        {c.profiles?.full_name || "Unknown"}
                      </div>
                      <div style={{ fontSize:11, color:T.muted, marginTop:2 }}>
                        {c.profiles?.email || c.user_id?.slice(0,16)+"…"}
                      </div>
                    </div>

                    {/* Amount */}
                    <div style={{ minWidth:90, textAlign:"right" }}>
                      <div style={{ fontWeight:800, fontSize:14, color:T.green }}>
                        {Number(c.amount||0).toLocaleString()} CUBE
                      </div>
                      <div style={{ fontSize:11, color:T.muted }}>{fmtNaira(c.naira_value)}</div>
                    </div>

                    {/* Date */}
                    <div style={{ fontSize:11, color:T.mutedLo, minWidth:80, textAlign:"right" }}>
                      {fmtDate(c.created_at)}
                    </div>

                    {/* Status */}
                    <StatusBadge status={c.status} />

                    {/* Rejection indicator */}
                    {c.status === "rejected" && c.rejection_reason && (
                      <div title={c.rejection_reason} style={{
                        width:8, height:8, borderRadius:"50%", background:T.red,
                        flexShrink:0, boxShadow:`0 0 6px ${T.red}`,
                      }} />
                    )}

                    {/* Action button */}
                    <button
                      onClick={e => { e.stopPropagation(); setSelectedCashout(c); }}
                      style={{
                        padding:"6px 14px", borderRadius:9,
                        border:`1px solid ${c.status==="pending" ? "rgba(251,191,36,.3)" : T.border}`,
                        background: c.status==="pending" ? "rgba(251,191,36,.08)" : "rgba(74,222,128,.06)",
                        color: c.status==="pending" ? T.warn : T.green,
                        fontSize:11, fontWeight:700, cursor:"pointer", fontFamily:T.font,
                      }}
                    >
                      {c.status === "pending" ? "Review" : "View"}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* ══════════════ SETTINGS TAB ══════════════ */}
        {activeTab === "settings" && (
          <div style={{ maxWidth:520 }}>

            {/* Enable toggle */}
            <div style={card({})}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                <div>
                  <div style={{ fontWeight:700, color:T.white, marginBottom:3 }}>Withdrawals enabled</div>
                  <div style={{ fontSize:12, color:T.muted }}>Disable to block all withdrawals</div>
                </div>
                <Toggle on={enabled} onChange={() => setEnabled(v => !v)} />
              </div>
            </div>

            {/* Allowed days */}
            <div style={card({})}>
              <div style={{ fontWeight:700, color:T.white, marginBottom:4 }}>Allowed days</div>
              <div style={{ fontSize:12, color:T.muted, marginBottom:14 }}>Users can only withdraw on selected days</div>
              <div style={{ display:"flex", flexWrap:"wrap", gap:8 }}>
                {DAY_NAMES.map((day, i) => {
                  const isOn = allowedDays.includes(i);
                  return (
                    <button key={i} onClick={() => toggleDay(i)} style={{
                      padding:"8px 16px", borderRadius:10, border:"1px solid",
                      borderColor: isOn ? T.green : "rgba(255,255,255,.12)",
                      background:  isOn ? "rgba(74,222,128,.1)" : "transparent",
                      color:       isOn ? T.green : T.muted,
                      fontWeight:700, fontSize:13, cursor:"pointer", fontFamily:T.font, transition:".15s",
                    }}>{day.slice(0,3)}</button>
                  );
                })}
              </div>
            </div>

            {/* Time window */}
            <div style={card({})}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:4 }}>
                <div style={{ fontWeight:700, color:T.white }}>Time window</div>
                <Toggle on={useTimeWindow} onChange={() => setUseTimeWindow(v => !v)} />
              </div>
              <div style={{ fontSize:12, color:T.muted, marginBottom: useTimeWindow ? 14 : 0 }}>
                Restrict to a specific time range on allowed days
              </div>
              {useTimeWindow && (
                <div style={{ display:"flex", gap:12, marginTop:4 }}>
                  {[["Open", openTime, setOpenTime], ["Close", closeTime, setCloseTime]].map(([label, val, setter]) => (
                    <div key={label} style={{ flex:1 }}>
                      <label style={{ fontSize:11, color:T.muted, fontWeight:600, textTransform:"uppercase", letterSpacing:".06em", display:"block", marginBottom:6 }}>
                        {label} time
                      </label>
                      <input type="time" value={val} onChange={e => setter(e.target.value)}
                        style={{
                          width:"100%", background:"rgba(255,255,255,.05)", border:`1px solid rgba(255,255,255,.1)`,
                          borderRadius:10, padding:"10px 12px", color:T.white,
                          fontFamily:T.font, fontSize:14, outline:"none", boxSizing:"border-box",
                        }} />
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Locked message */}
            <div style={card({})}>
              <div style={{ fontWeight:700, color:T.white, marginBottom:4 }}>Locked message</div>
              <div style={{ fontSize:12, color:T.muted, marginBottom:12 }}>
                What users see when withdrawals are closed
              </div>
              <textarea
                value={lockedMsg}
                onChange={e => setLockedMsg(e.target.value)}
                placeholder="Withdrawals are only available on Sundays. Check back then!"
                rows={3}
                style={{
                  width:"100%", background:"rgba(255,255,255,.05)", border:"1px solid rgba(255,255,255,.1)",
                  borderRadius:12, padding:"10px 14px", color:T.white, fontFamily:T.font,
                  fontSize:13, outline:"none", resize:"vertical", boxSizing:"border-box",
                }}
              />
            </div>

            {/* Preview */}
            <div style={{ background:"rgba(74,222,128,.05)", border:`1px solid rgba(74,222,128,.18)`, borderRadius:14, padding:"14px 18px", marginBottom:20 }}>
              <div style={{ fontSize:11, color:T.muted, fontWeight:700, textTransform:"uppercase", letterSpacing:".06em", marginBottom:10 }}>Preview</div>
              {[
                ["Status",    enabled ? "✓ Enabled" : "✗ Disabled"],
                ["Open days", allowedDays.map(d => DAY_NAMES[d].slice(0,3)).join(", ") || "None"],
                ["Time",      useTimeWindow ? `${openTime} – ${closeTime}` : "All day"],
              ].map(([l, v]) => (
                <div key={l} style={{ display:"flex", justifyContent:"space-between", fontSize:12, color:T.muted, marginBottom:6 }}>
                  <span>{l}</span>
                  <span style={{ color:T.white, fontWeight:600 }}>{v}</span>
                </div>
              ))}
            </div>

            <button onClick={handleSaveSettings} disabled={saving} style={{
              width:"100%", padding:14, borderRadius:14, border:"none",
              background:"linear-gradient(135deg,#4ade80,#22c55e)", color:"#041107",
              fontSize:"1rem", fontWeight:800, cursor: saving ? "not-allowed" : "pointer",
              fontFamily:T.font, opacity: saving ? .7 : 1,
              display:"flex", alignItems:"center", justifyContent:"center", gap:8,
            }}>
              {saving ? "Saving…" : "Save Settings"}
            </button>
          </div>
        )}
      </div>

      {/* Modals */}
      <CashoutDetailSheet
        cashout={selectedCashout}
        onClose={() => setSelectedCashout(null)}
        onApprove={handleApprove}
        onReject={(c) => { setRejectTarget(c); setSelectedCashout(null); }}
        loading={actionLoad}
      />

      <RejectModal
        cashout={rejectTarget}
        onClose={() => setRejectTarget(null)}
        onConfirm={handleRejectConfirm}
        loading={actionLoad}
      />

      {toast && <Toast msg={toast.msg} type={toast.type} />}
    </div>
  );
}