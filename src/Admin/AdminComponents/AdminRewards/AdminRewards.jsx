import "./AdminRewards.css";
import { useEffect, useState, useCallback, useMemo, useRef, Fragment } from "react";
import {
  Search, Gift, RefreshCw, ChevronLeft, ChevronRight,
  CheckCircle, XCircle, Megaphone, Clock3, Users, Zap,
  ChevronDown, ChevronUp, AlertTriangle,
} from "lucide-react";
import { supabase } from "../../../libs/supabase";

// =============================================================================
// CONSTANTS
// =============================================================================
const REWARD_PRESETS = [50, 100, 250, 500, 1000, 2000];
const REWARD_TYPES   = [
  "Manual Bonus", "Referral Bonus", "Promo Reward",
  "Spin Override", "Support Credit", "Achievement Bonus", "Giveaway",
];
const PRIZE_META = {
  cube:    { label: "CUBE",    color: "#4ade80", bg: "rgba(74,222,128,0.12)", icon: "\u29e1" },
  airtime: { label: "Airtime", color: "#fbbf24", bg: "rgba(251,191,36,0.12)", icon: "\ud83d\udcde" },
  data:    { label: "Data",    color: "#60a5fa", bg: "rgba(96,165,250,0.12)", icon: "\ud83d\udcf6" },
};
const PAGE_SIZE    = 15;
const TX_PAGE_SIZE = 20;
const SPIN_PG_SIZE = 10;
const BATCH_SIZE   = 100; // rows per supabase insert batch

// =============================================================================
// HELPERS
// =============================================================================
const initials = (name, email) => {
  if (name) {
    const p = name.trim().split(" ");
    return (p.length >= 2 ? p[0][0] + p[1][0] : p[0].slice(0, 2)).toUpperCase();
  }
  return (email || "?").slice(0, 2).toUpperCase();
};
const fmtDate = (iso) => {
  if (!iso) return "\u2014";
  return new Date(iso).toLocaleDateString("en-GB", { day:"2-digit", month:"short", year:"numeric" });
};
const fmtTime = (iso) => {
  if (!iso) return "\u2014";
  return new Date(iso).toLocaleTimeString("en-GB", { hour:"2-digit", minute:"2-digit" });
};
const fmtNum = (n) => Number(n || 0).toLocaleString(undefined, { maximumFractionDigits: 2 });
const chunk  = (arr, size) => {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
};

// =============================================================================
// DATA LAYER  (\u2014 all Supabase calls are here, easy to update if schema changes)
// =============================================================================

/**
 * Fetch all profiles.
 * If your profiles table does NOT have an email column, remove it from the
 * select string and the code will fall back gracefully to showing the user id.
 */
async function fetchProfiles() {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, email, cube_balance, total_mined, streak, referral_code, created_at")
    .order("cube_balance", { ascending: false });
  if (error) throw new Error("profiles: " + error.message);
  return data || [];
}

/**
 * Count referrals per referral_code in one aggregated RPC call.
 *
 * Create this function once in the Supabase SQL editor:
 *
 *   create or replace function get_referral_counts()
 *   returns table(referral_code text, cnt bigint)
 *   language sql security definer as
 *   $$
 *     select referred_by_code as referral_code, count(*) as cnt
 *     from profiles
 *     where referred_by_code is not null
 *     group by referred_by_code;
 *   $$;
 *
 * If the RPC does not exist yet, this returns an empty map (no crash).
 */
async function fetchReferralCounts() {
  const { data, error } = await supabase.rpc("get_referral_counts");
  if (error) return {};   // RPC not set up yet \u2014 safe fallback
  const map = {};
  (data || []).forEach(r => { map[r.referral_code] = Number(r.cnt); });
  return map;
}

async function fetchTransactions() {
  const { data, error } = await supabase
    .from("wallet_transactions")
    .select("id, user_id, title, amount, type, created_at")
    // wallet_transactions columns: id, user_id, title, amount, type, created_at
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) throw new Error("wallet_transactions: " + error.message);
  return data || [];
}

async function fetchSpinResults() {
  const { data, error } = await supabase
    .from("spin_results")
    .select("id, user_id, prize_type, prize_label, prize_value, cube_awarded, spun_at, claimed")
    .order("spun_at", { ascending: false })
    .limit(300);
  if (error) throw new Error("spin_results: " + error.message);
  return data || [];
}

async function fetchUserTransactions(userId) {
  const { data, error } = await supabase
    .from("wallet_transactions")
    .select("id, title, amount, type, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(20);
  if (error) throw new Error(error.message);
  return data || [];
}

/**
 * Credit CUBE atomically.
 *
 * Create this RPC in the Supabase SQL editor for atomic balance updates:
 *
 *   create or replace function increment_cube(uid uuid, delta numeric)
 *   returns void language sql security definer as
 *   $$ update profiles set cube_balance = cube_balance + delta where id = uid; $$;
 *
 * Falls back to a read-then-write if the RPC doesn\u2019t exist yet.
 */
async function creditCube(userId, delta) {
  const { error: rpcErr } = await supabase.rpc("increment_cube", { uid: userId, delta });
  if (!rpcErr) return;

  // Non-atomic fallback
  const { data: prof, error: readErr } = await supabase
    .from("profiles").select("cube_balance").eq("id", userId).single();
  if (readErr) throw new Error(readErr.message);
  const { error: writeErr } = await supabase
    .from("profiles")
    .update({ cube_balance: Number(prof.cube_balance || 0) + delta })
    .eq("id", userId);
  if (writeErr) throw new Error(writeErr.message);
}

async function insertTx(row) {
  const { error } = await supabase.from("wallet_transactions").insert(row);
  if (error) throw new Error(error.message);
}

async function batchInsertTx(rows) {
  for (const c of chunk(rows, BATCH_SIZE)) {
    const { error } = await supabase.from("wallet_transactions").insert(c);
    if (error) throw new Error(error.message);
  }
}

// =============================================================================
// USER HISTORY DRAWER
// =============================================================================
function UserHistoryDrawer({ userId }) {
  const [rows,    setRows]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [err,     setErr]     = useState(null);

  useEffect(() => {
    let dead = false;
    setLoading(true); setErr(null);
    fetchUserTransactions(userId)
      .then(d  => { if (!dead) { setRows(d);         setLoading(false); } })
      .catch(e => { if (!dead) { setErr(e.message);  setLoading(false); } });
    return () => { dead = true; };
  }, [userId]);

  const cellStyle = { padding:"12px 20px", color:"rgba(200,255,195,0.30)", fontSize:12 };

  if (loading) return <tr><td colSpan={6} style={cellStyle}>Loading history\u2026</td></tr>;
  if (err)     return <tr><td colSpan={6} style={{...cellStyle,color:"#f87171"}}>Error: {err}</td></tr>;
  if (!rows?.length) return <tr><td colSpan={6} style={cellStyle}>No transactions yet for this user.</td></tr>;

  return rows.map(tx => (
    <tr key={tx.id} style={{ background:"rgba(0,0,0,0.20)" }}>
      <td colSpan={2} style={{ paddingLeft:48, fontSize:12, color:"rgba(200,255,195,0.65)", borderBottom:"1px solid rgba(74,222,128,0.04)" }}>{tx.title}</td>
      <td style={{ fontSize:12, borderBottom:"1px solid rgba(74,222,128,0.04)" }}>
        <span className={tx.type==="credit"?"tx-credit":"tx-debit"}>{tx.type==="credit"?"+":"\u2212"}{fmtNum(Math.abs(Number(tx.amount)))}</span>
      </td>
      <td style={{ fontSize:12, borderBottom:"1px solid rgba(74,222,128,0.04)" }}>
        <span className={"type-badge "+tx.type}>{tx.type}</span>
      </td>
      <td colSpan={2} style={{ fontSize:11, color:"rgba(200,255,195,0.28)", borderBottom:"1px solid rgba(74,222,128,0.04)" }}>
        {fmtDate(tx.created_at)} \u00b7 {fmtTime(tx.created_at)}
      </td>
    </tr>
  ));
}

// =============================================================================
// REWARD MODAL  (individual user)
// =============================================================================
function RewardModal({ user, onClose, onSuccess }) {
  const [amount,  setAmount]  = useState("");
  const [type,    setType]    = useState(REWARD_TYPES[0]);
  const [note,    setNote]    = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    const cube = Number(amount);
    if (!cube || cube <= 0) return;
    setLoading(true);
    try {
      await creditCube(user.id, cube);
      await insertTx({
        user_id: user.id,
        title:   type + " \u2014 Admin",
        amount:  cube,
        type:    "credit",
      });
      onSuccess("+" + fmtNum(cube) + " CUBE sent to " + (user.full_name || user.email || "user"));
      onClose();
    } catch(err) {
      console.error(err);
      onSuccess("Failed: " + err.message, "error");
    } finally { setLoading(false); }
  };

  return (
    <div className="modal-overlay" onClick={e => e.target===e.currentTarget && onClose()}>
      <div className="modal-card" onClick={e => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>✕</button>
        <div className="modal-title">Send reward</div>

        <div className="modal-target-user">
          <div className="user-avatar">{initials(user.full_name, user.email)}</div>
          <div>
            <div className="modal-target-name">{user.full_name || "—"}</div>
            <div className="modal-target-email">{user.email || user.id.slice(0,16)+"…"}</div>
            <div className="modal-target-bal">Balance: {fmtNum(user.cube_balance)} CUBE</div>
          </div>
        </div>

        <div className="preset-chips">
          {REWARD_PRESETS.map(p => (
            <button key={p} className={"preset-chip"+(amount===String(p)?" active":"")}
              onClick={() => setAmount(String(p))}>
              {p>=1000?p/1000+"K":p}
            </button>
          ))}
        </div>

        <div className="modal-form-grid">
          <div className="form-field">
            <label>CUBE amount</label>
            <input type="number" min="1" placeholder="e.g. 500"
              value={amount} onChange={e => setAmount(e.target.value)} />
          </div>
          <div className="form-field">
            <label>Reward type</label>
            <select value={type} onChange={e => setType(e.target.value)}>
              {REWARD_TYPES.map(t => <option key={t}>{t}</option>)}
            </select>
          </div>
          <div className="form-field full-width">
            <label>Note (optional)</label>
            <textarea placeholder="Internal reason\u2026" value={note}
              onChange={e => setNote(e.target.value)} style={{ minHeight:56 }} />
          </div>
        </div>

        <div className="modal-actions">
          <button className="btn-secondary" onClick={onClose} disabled={loading}>Cancel</button>
          <button className="btn-reward" onClick={handleSubmit}
            disabled={loading || !amount || Number(amount)<=0}>
            {loading ? "Sending\u2026" : "Send "+(amount?fmtNum(amount):"?")+" CUBE"}
          </button>
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// SPIN PRIZE DETAIL MODAL
// =============================================================================
function SpinPrizeModal({ spin, userName, userEmail, onClose, onApprove, onReject, loading }) {
  if (!spin) return null;
  const meta        = PRIZE_META[spin.prize_type] || PRIZE_META.cube;
  const needsAction = (spin.prize_type==="airtime"||spin.prize_type==="data") && !spin._adminStatus;

  return (
    <div className="modal-overlay" onClick={e => e.target===e.currentTarget && onClose()}>
      <div className="modal-card" onClick={e => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>✕</button>
        <div className="modal-title">Spin prize detail</div>

        <div className="spin-prize-hero" style={{ background:meta.bg, border:"1px solid "+meta.color+"30" }}>
          <div className="spin-prize-icon">{meta.icon}</div>
          <div style={{ flex:1, minWidth:0 }}>
            <div className="spin-prize-label" style={{ color:meta.color }}>{spin.prize_label}</div>
            <div className="spin-prize-user">{userName}</div>
            <div className="spin-prize-date">{userEmail}</div>
            <div className="spin-prize-date">{fmtDate(spin.spun_at)} at {fmtTime(spin.spun_at)}</div>
          </div>
          <span className={"spin-status-badge "+(spin._adminStatus||"pending")}>
            {spin._adminStatus||"pending"}
          </span>
        </div>

        <div className="spin-detail-rows">
          {[
            ["Prize type",    meta.label],
            ["Prize won",     spin.prize_label],
            ["CUBE credited", fmtNum(spin.cube_awarded)+" CUBE"],
            ["Spin ID",       "#"+spin.id],
            ["Spun at",       fmtDate(spin.spun_at)+" "+fmtTime(spin.spun_at)],
          ].map(([l,v]) => (
            <div className="spin-detail-row" key={l}>
              <span className="spin-detail-label">{l}</span>
              <span className="spin-detail-val">{v}</span>
            </div>
          ))}
        </div>

        {needsAction && (
          <>
            <div className="spin-action-hint">
              <AlertTriangle size={12} style={{ flexShrink:0 }} />
              This {meta.label} prize needs manual fulfilment. Mark it fulfilled once sent, or reject to reverse the CUBE bonus.
            </div>
            <div className="modal-actions" style={{ marginTop:14 }}>
              <button className="btn-reject" onClick={() => onReject(spin)} disabled={loading}>
                <XCircle size={13}/> Reject &amp; reverse
              </button>
              <button className="btn-reward" onClick={() => onApprove(spin)} disabled={loading}>
                <CheckCircle size={13}/> {loading?"Processing\u2026":"Mark fulfilled"}
              </button>
            </div>
          </>
        )}

        {spin._adminStatus && (
          <div className="spin-already-done">
            This prize was already <strong>{spin._adminStatus}</strong>.
            
          </div>
        )}
      </div>
    </div>
  );
}

// =============================================================================
// GIVEAWAY MODAL
// =============================================================================
function GiveawayModal({ users, onClose, onSuccess }) {
  const [amount,   setAmount]   = useState("");
  const [note,     setNote]     = useState("");
  const [target,   setTarget]   = useState("all");
  const [loading,  setLoading]  = useState(false);
  const [progress, setProgress] = useState(null);

  const resolveTargets = () => {
    if (target==="all")    return users;
    if (target==="active") return users.filter(u => Number(u.cube_balance||0)>0);
    return [...users].sort((a,b)=>Number(b.cube_balance||0)-Number(a.cube_balance||0)).slice(0, Number(target)||0);
  };

  const targets     = resolveTargets();
  const targetCount = targets.length;
  const cube        = Number(amount);

  const handleSend = async () => {
    if (!cube||cube<=0||targetCount===0) return;
    if (!window.confirm(
      "Send "+fmtNum(cube)+" CUBE to "+targetCount+" user"+(targetCount!==1?"s":"")+"?\n"+
      "Total: "+fmtNum(cube*targetCount)+" CUBE \u2014 this cannot be undone."
    )) return;

    setLoading(true);
    setProgress({ done:0, total:targetCount });

    try {
      const txRef  = "GIVEAWAY-"+Date.now();
      const title  = note ? "Giveaway: "+note : "Admin Giveaway \ud83c\udf89";
      const batches = chunk(targets, BATCH_SIZE);
      let done = 0;

      for (const batch of batches) {
        await Promise.all(batch.map(u => creditCube(u.id, cube)));
        await batchInsertTx(batch.map(u => ({
          user_id: u.id, title, amount: cube, type: "credit",
        })));
        done += batch.length;
        setProgress({ done, total: targetCount });
      }

      onSuccess("\ud83c\udf89 Giveaway done! "+fmtNum(cube)+" \u00d7 "+targetCount+" = "+fmtNum(cube*targetCount)+" CUBE total");
      onClose();
    } catch(err) {
      console.error(err);
      onSuccess("Giveaway failed: "+err.message, "error");
    } finally { setLoading(false); setProgress(null); }
  };

  const activeUsers = users.filter(u=>Number(u.cube_balance||0)>0).length;

  return (
    <div className="modal-overlay" onClick={e => e.target===e.currentTarget && !loading && onClose()}>
      <div className="modal-card giveaway-modal" onClick={e => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose} disabled={loading}>✕</button>

        <div className="giveaway-header">
          <div className="giveaway-icon">\ud83c\udf89</div>
          <div className="modal-title">Broadcast giveaway</div>
          <p className="giveaway-sub">Send CUBE to multiple users instantly</p>
        </div>

        <div className="giveaway-form">
          <div className="form-field">
            <label>CUBE per user</label>
            <div className="preset-chips">
              {[50,100,250,500,1000].map(p => (
                <button key={p} className={"preset-chip"+(amount===String(p)?" active":"")}
                  onClick={() => setAmount(String(p))} disabled={loading}>
                  {p>=1000?p/1000+"K":p}
                </button>
              ))}
            </div>
            <input type="number" min="1" placeholder="Or type a custom amount\u2026"
              value={amount} onChange={e => setAmount(e.target.value)}
              disabled={loading} style={{ marginTop:8 }} />
          </div>

          <div className="form-field">
            <label>Send to</label>
            <select value={target} onChange={e => setTarget(e.target.value)} disabled={loading}>
              <option value="all">All users ({users.length})</option>
              <option value="active">Active only \u2014 balance &gt; 0 ({activeUsers})</option>
              <option value="10">Top 10 by balance</option>
              <option value="50">Top 50 by balance</option>
              <option value="100">Top 100 by balance</option>
            </select>
          </div>

          <div className="form-field">
            <label>Message title (optional)</label>
            <input type="text" placeholder="e.g. Weekend bonus, Festive reward\u2026"
              value={note} onChange={e => setNote(e.target.value)} disabled={loading} />
          </div>
        </div>

        {cube > 0 && (
          <div className="giveaway-preview">
            <div className="giveaway-preview-row">
              <span>Recipients</span>
              <strong style={{ color:"#e8ffe6" }}>{targetCount.toLocaleString()} users</strong>
            </div>
            <div className="giveaway-preview-row">
              <span>Per user</span>
              <strong style={{ color:"#4ade80" }}>{fmtNum(cube)} CUBE</strong>
            </div>
            <div className="giveaway-preview-row" style={{ borderTop:"1px solid rgba(251,191,36,0.15)", paddingTop:8, marginTop:4 }}>
              <span>Total CUBE sent</span>
              <strong style={{ color:"#7fff6e", fontSize:15 }}>{fmtNum(cube*targetCount)} CUBE</strong>
            </div>
            <div className="giveaway-preview-row">
              <span>Transaction title</span>
              <strong style={{ color:"rgba(200,255,195,0.6)", fontSize:11 }}>{note?"Giveaway: "+note:"Admin Giveaway \ud83c\udf89"}</strong>
            </div>
          </div>
        )}

        {progress && (
          <div className="giveaway-progress">
            <div className="giveaway-progress-bar" style={{ width:Math.round((progress.done/progress.total)*100)+"%" }} />
            <div className="giveaway-progress-label">Sending\u2026 {progress.done} / {progress.total} users</div>
          </div>
        )}

        <div className="modal-actions">
          <button className="btn-secondary" onClick={onClose} disabled={loading}>Cancel</button>
          <button className="btn-giveaway" onClick={handleSend}
            disabled={loading||!cube||cube<=0||targetCount===0}>
            <Megaphone size={13}/>
            {loading
              ? ("Sending\u2026 "+(progress?.done||0)+"/"+(progress?.total||0))
              : "Send to "+targetCount.toLocaleString()+" user"+(targetCount!==1?"s":"")}
          </button>
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// PAGINATION
// =============================================================================
function Pagination({ page, total, onChange }) {
  if (total<=1) return null;
  const pages = Array.from({ length:Math.min(total,5) }, (_,i) => {
    return Math.max(1, Math.min(page-2, total-4)) + i;
  });
  return (
    <div className="pagination">
      <button className="page-btn" onClick={() => onChange(page-1)} disabled={page===1}><ChevronLeft size={13}/></button>
      {pages.map(p => (
        <button key={p} className={"page-btn"+(p===page?" active":"")} onClick={() => onChange(p)}>{p}</button>
      ))}
      <button className="page-btn" onClick={() => onChange(page+1)} disabled={page===total}><ChevronRight size={13}/></button>
    </div>
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================
export default function AdminRewards() {
  // data
  const [users,        setUsers]        = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [spinResults,  setSpinResults]  = useState([]);
  const [stats,        setStats]        = useState({ totalUsers:0, totalCube:0, totalTx:0, todayTx:0, pendingSpins:0 });
  // ui
  const [loading,      setLoading]      = useState(true);
  const [loadErr,      setLoadErr]      = useState(null);
  const [actionLoad,   setActionLoad]   = useState(false);
  const [search,       setSearch]       = useState("");
  const [txFilter,     setTxFilter]     = useState("all");
  const [spinFilter,   setSpinFilter]   = useState("all");
  const [activeTab,    setActiveTab]    = useState("users");
  const [userPage,     setUserPage]     = useState(1);
  const [txPage,       setTxPage]       = useState(1);
  const [spinPage,     setSpinPage]     = useState(1);
  const [expandedUser, setExpandedUser] = useState(null);
  const [modalUser,    setModalUser]    = useState(null);
  const [modalSpin,    setModalSpin]    = useState(null);
  const [showGiveaway, setShowGiveaway] = useState(false);
  const [toast,        setToast]        = useState(null);
  const toastTimer = useRef(null);

  const showToast = useCallback((msg, type="success") => {
    clearTimeout(toastTimer.current);
    setToast({ msg, type });
    toastTimer.current = setTimeout(() => setToast(null), 4500);
  }, []);

  // ── Load all data ──────────────────────────────────────────────────────────
  const loadData = useCallback(async () => {
    setLoading(true); setLoadErr(null);
    try {
      const [profiles, refCounts, txs, spins] = await Promise.all([
        fetchProfiles(), fetchReferralCounts(), fetchTransactions(), fetchSpinResults(),
      ]);

      const enriched = profiles.map(p => ({
        ...p,
        // referral_count = how many people signed up using this user's referral_code
        referral_count: p.referral_code ? (refCounts[p.referral_code] || 0) : 0,
      }));

      const today        = new Date(); today.setHours(0,0,0,0);
      const todayTx      = txs.filter(t => new Date(t.created_at)>=today).length;
      const totalCube    = enriched.reduce((s,u) => s+Number(u.cube_balance||0), 0);
      const pendingSpins = spins.filter(s => (s.prize_type==="airtime"||s.prize_type==="data")).length;

      setUsers(enriched); setTransactions(txs); setSpinResults(spins);
      setStats({ totalUsers:enriched.length, totalCube, totalTx:txs.length, todayTx, pendingSpins });
    } catch(err) {
      console.error("AdminRewards loadData:", err);
      setLoadErr(err.message||"Failed to load data");
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // ── userMap ────────────────────────────────────────────────────────────────
  const userMap = useMemo(() => {
    const m = {};
    users.forEach(u => { m[u.id] = { name: u.full_name||u.email||u.id.slice(0,8), email: u.email||"" }; });
    return m;
  }, [users]);

  // ── Approve spin ───────────────────────────────────────────────────────────
  // spin_results has no admin_status / admin_note columns in your schema.
  // We track admin actions locally (_adminStatus) + log an audit transaction.
  const approveSpin = useCallback(async (spin) => {
    setActionLoad(true);
    try {
      // Log an audit trail entry in wallet_transactions (amount 0 = no balance change)
      await insertTx({
        user_id: spin.user_id,
        title:   "Spin prize fulfilled \u2014 " + spin.prize_label,
        amount:  0,
        type:    "credit",
      });
      // Mark locally so the UI updates without a full reload
      setSpinResults(prev => prev.map(s => s.id === spin.id ? { ...s, _adminStatus: "fulfilled" } : s));
      setStats(prev => ({ ...prev, pendingSpins: Math.max(0, prev.pendingSpins - 1) }));
      setModalSpin(null);
      showToast("\u2713 Prize marked as fulfilled");
    } catch(err) { showToast("Failed: " + err.message, "error"); }
    finally { setActionLoad(false); }
  }, [showToast]);

  // ── Reject spin ────────────────────────────────────────────────────────────
  const rejectSpin = useCallback(async (spin) => {
    setActionLoad(true);
    try {
      const cubeRev = Number(spin.cube_awarded || 0);
      if (cubeRev > 0) {
        // Reverse the CUBE bonus that was auto-credited at spin time
        await creditCube(spin.user_id, -cubeRev);
        await insertTx({
          user_id: spin.user_id,
          title:   "Spin prize rejected \u2014 " + spin.prize_label + " reversed",
          amount:  -cubeRev,
          type:    "debit",
        });
      }
      // Mark locally (spin_results has no admin_status column)
      setSpinResults(prev => prev.map(s => s.id === spin.id ? { ...s, _adminStatus: "rejected" } : s));
      setStats(prev => ({ ...prev, pendingSpins: Math.max(0, prev.pendingSpins - 1) }));
      setModalSpin(null);
      showToast("\u2715 Prize rejected" + (cubeRev > 0 ? " \u2014 " + fmtNum(cubeRev) + " CUBE reversed" : ""), "error");
    } catch(err) { showToast("Failed: " + err.message, "error"); }
    finally { setActionLoad(false); }
  }, [showToast]);

  // ── Filtered & paginated ──────────────────────────────────────────────────
  const filteredUsers = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return users;
    return users.filter(u => (u.full_name||"").toLowerCase().includes(q)||(u.email||"").toLowerCase().includes(q));
  }, [users, search]);

  const userPages  = Math.max(1, Math.ceil(filteredUsers.length/PAGE_SIZE));
  const pagedUsers = filteredUsers.slice((userPage-1)*PAGE_SIZE, userPage*PAGE_SIZE);

  const filteredTx = useMemo(() => {
    if (txFilter==="credit") return transactions.filter(t=>t.type==="credit");
    if (txFilter==="debit")  return transactions.filter(t=>t.type==="debit");
    return transactions;
  }, [transactions, txFilter]);
  const txPages = Math.max(1, Math.ceil(filteredTx.length/TX_PAGE_SIZE));
  const pagedTx = filteredTx.slice((txPage-1)*TX_PAGE_SIZE, txPage*TX_PAGE_SIZE);

  const filteredSpins = useMemo(() => {
    switch(spinFilter) {
      case "pending": return spinResults.filter(s=>(s.prize_type==="airtime"||s.prize_type==="data")&&!s._adminStatus);
      case "airtime": return spinResults.filter(s=>s.prize_type==="airtime");
      case "data":    return spinResults.filter(s=>s.prize_type==="data");
      case "cube":    return spinResults.filter(s=>s.prize_type==="cube");
      default:        return spinResults;
    }
  }, [spinResults, spinFilter]);
  const spinPages  = Math.max(1, Math.ceil(filteredSpins.length/SPIN_PG_SIZE));
  const pagedSpins = filteredSpins.slice((spinPage-1)*SPIN_PG_SIZE, spinPage*SPIN_PG_SIZE);

  // ── Loading / error ────────────────────────────────────────────────────────
  if (loading) return (
    <div className="admin-page"><div className="admin-loading"><span className="admin-loading-icon">\ud83d\udee1\ufe0f</span>Loading admin data\u2026</div></div>
  );
  if (loadErr) return (
    <div className="admin-page">
      <div className="admin-loading">
        <span className="admin-loading-icon">\u26a0\ufe0f</span>
        <span style={{ color:"#f87171" }}>{loadErr}</span>
        <button onClick={loadData} style={{ marginTop:12, padding:"8px 20px", border:"1px solid rgba(248,113,113,0.3)", borderRadius:100, background:"transparent", color:"#f87171", fontSize:13, fontWeight:700, cursor:"pointer" }}>
          Retry
        </button>
      </div>
    </div>
  );

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="admin-page">

      <div className="admin-header">
        <div className="admin-header-left">
          <h1>\ud83d\udee1\ufe0f Admin \u2014 Rewards</h1>
          <p>View balances \u00b7 send rewards \u00b7 approve spin prizes \u00b7 run giveaways</p>
        </div>
        <div style={{ display:"flex", gap:8, alignItems:"center", flexWrap:"wrap" }}>
          <button className="btn-giveaway-trigger" onClick={() => setShowGiveaway(true)}>
            <Megaphone size={13}/> Giveaway
          </button>
          <span className="admin-badge">Admin Only</span>
          <button className="icon-btn" onClick={loadData} aria-label="Refresh"><RefreshCw size={14}/></button>
        </div>
      </div>

      <div className="admin-stats">
        <div className="stat-card">
          <div className="stat-card-label">Total Users</div>
          <div className="stat-card-value">{stats.totalUsers.toLocaleString()}</div>
          <div className="stat-card-sub">registered</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-label">CUBE in Wallets</div>
          <div className="stat-card-value">{stats.totalCube>=1000?(stats.totalCube/1000).toFixed(1)+"K":stats.totalCube.toLocaleString()}</div>
          <div className="stat-card-sub">across all users</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-label">Transactions</div>
          <div className="stat-card-value blue">{stats.totalTx.toLocaleString()}</div>
          <div className="stat-card-sub">last 200 shown</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-label">Today</div>
          <div className="stat-card-value amber">{stats.todayTx}</div>
          <div className="stat-card-sub">transactions today</div>
        </div>
        <div className={"stat-card"+(stats.pendingSpins>0?" stat-alert":"")}
          onClick={() => { if(stats.pendingSpins>0){setActiveTab("spins");setSpinFilter("pending");} }}
          style={{ cursor:stats.pendingSpins>0?"pointer":"default" }}>
          <div className="stat-card-label">Pending Prizes</div>
          <div className={"stat-card-value"+(stats.pendingSpins>0?" red":"")}>{stats.pendingSpins}</div>
          <div className="stat-card-sub">airtime &amp; data to fulfil</div>
        </div>
      </div>

      <div className="admin-tabs">
        {[
          { key:"users",   label:"Users ("+stats.totalUsers.toLocaleString()+")",         icon:<Users size={13}/> },
          { key:"spins",   label:"Spin prizes"+(stats.pendingSpins>0?" \u00b7 "+stats.pendingSpins+" pending":""), icon:<Zap size={13}/>, alert:stats.pendingSpins },
          { key:"history", label:"Transaction history",                                   icon:<Clock3 size={13}/> },
        ].map(t => (
          <button key={t.key} className={"admin-tab"+(activeTab===t.key?" active":"")} onClick={() => setActiveTab(t.key)}>
            {t.icon} {t.label}
            {t.alert>0 && <span className="tab-alert-dot">{t.alert}</span>}
          </button>
        ))}
      </div>

      {/* TAB: USERS */}
      {activeTab==="users" && (
        <>
          <div className="admin-toolbar">
            <div className="search-wrap">
              <Search size={14}/>
              <input placeholder="Search by name or email\u2026" value={search}
                onChange={e => { setSearch(e.target.value); setUserPage(1); setExpandedUser(null); }} />
            </div>
            <button className="btn-giveaway-sm" onClick={() => setShowGiveaway(true)}>
              <Megaphone size={12}/> Broadcast giveaway
            </button>
          </div>

          <div className="users-table-wrap">
            <table className="users-table">
              <thead>
                <tr>
                  <th className="col-user">User</th>
                  <th className="col-balance">Balance</th>
                  <th className="col-mined">Mined</th>
                  <th className="col-streak">Streak</th>
                  <th className="col-joined">Joined</th>
                  <th className="col-action">Action</th>
                </tr>
              </thead>
              <tbody>
                {pagedUsers.length===0 ? (
                  <tr><td colSpan={6} className="table-empty">{search?"No users match \""+search+"\"":"No users found"}</td></tr>
                ) : pagedUsers.map(u => {
                  const isExp = expandedUser===u.id;
                  return (
                    <Fragment key={u.id}>
                      <tr>
                        <td className="col-user">
                          <div className="user-cell">
                            <div className="user-avatar">{initials(u.full_name, u.email)}</div>
                            <div>
                              <div className="user-name">{u.full_name||"\u2014"}</div>
                              <div className="user-email">{u.email||u.id.slice(0,16)+"\u2026"}</div>
                            </div>
                          </div>
                        </td>
                        <td className="col-balance"><span className="cube-value">{fmtNum(u.cube_balance)}</span></td>
                        <td className="col-mined"><span className="cube-value dim">{fmtNum(u.total_mined)}</span></td>
                        <td className="col-streak">
                          {Number(u.streak) > 0
                            ? <span className="streak-badge">🔥 {u.streak}d</span>
                            : <span className="dash-muted">—</span>}
                        </td>
                        <td className="col-joined"><span className="date-muted">{fmtDate(u.created_at)}</span></td>
                        <td className="col-action">
                          <div style={{ display:"flex", gap:6, alignItems:"center" }}>
                            <button className="btn-reward-mini" onClick={(e) => { e.stopPropagation(); setModalUser(u); }}>
                              <Gift size={11}/> Reward
                            </button>
                            <button className={"drawer-toggle"+(isExp?" open":"")}
                              onClick={(e) => { e.stopPropagation(); setExpandedUser(isExp?null:u.id); }}
                              title={isExp?"Hide history":"Show reward history"}>
                              {isExp?<ChevronUp size={12}/>:<ChevronDown size={12}/>}
                            </button>
                          </div>
                        </td>
                      </tr>
                      {isExp && (
                        <>
                          <tr style={{ background:"rgba(0,0,0,0.28)" }}>
                            <td colSpan={6} className="drawer-section-label">
                              \u27f6 Reward history \u2014 {u.full_name||u.email||"this user"}
                            </td>
                          </tr>
                          <UserHistoryDrawer userId={u.id}/>
                          <tr style={{ background:"rgba(0,0,0,0.18)" }}>
                            <td colSpan={6} style={{ height:5, borderBottom:"1px solid rgba(74,222,128,0.08)" }}/>
                          </tr>
                        </>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div style={{ padding:"0 24px 4px" }}>
            <Pagination page={userPage} total={userPages}
              onChange={p => { setUserPage(p); setExpandedUser(null); window.scrollTo(0,0); }}/>
          </div>
        </>
      )}

      {/* TAB: SPIN PRIZES */}
      {activeTab==="spins" && (
        <>
          <div className="admin-toolbar">
            <div className="filter-chip-row">
              {[
                { key:"all",     label:"All ("+spinResults.length+")" },
                { key:"pending", label:"\u26a0 Pending ("+stats.pendingSpins+")" },
                { key:"airtime", label:"\ud83d\udcde Airtime" },
                { key:"data",    label:"\ud83d\udcf6 Data" },
                { key:"cube",    label:"\u29e1 CUBE" },
              ].map(f => (
                <button key={f.key} className={"filter-chip"+(spinFilter===f.key?" active":"")}
                  onClick={() => { setSpinFilter(f.key); setSpinPage(1); }}>{f.label}</button>
              ))}
            </div>
          </div>

          {filteredSpins.length===0 ? (
            <div className="empty-state"><div className="empty-icon">\ud83c\udfaa</div><div>No spin results match this filter</div></div>
          ) : (
            <div className="spin-table-wrap">
              <table className="spin-table">
                <thead>
                  <tr>
                    <th style={{ width:"22%" }}>User</th>
                    <th style={{ width:"18%" }}>Prize</th>
                    <th style={{ width:"10%" }}>Type</th>
                    <th style={{ width:"13%" }}>CUBE credited</th>
                    <th style={{ width:"14%" }}>Spun</th>
                    <th style={{ width:"12%" }}>Status</th>
                    <th style={{ width:"11%" }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {pagedSpins.map(s => {
                    const meta = PRIZE_META[s.prize_type]||PRIZE_META.cube;
                    const un   = userMap[s.user_id];
                    const needsAction = (s.prize_type==="airtime"||s.prize_type==="data")&&!s._adminStatus;
                    return (
                      <tr key={s.id} className={needsAction?"spin-row-alert":""}>
                        <td>
                          <div style={{ fontSize:12, fontWeight:600, color:"#e8ffe6", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                            {un?.name||s.user_id.slice(0,10)+"\u2026"}
                          </div>
                          <div style={{ fontSize:10, color:"rgba(200,255,195,0.28)", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{un?.email}</div>
                        </td>
                        <td><div className="prize-cell" style={{ color:meta.color }}>{meta.icon} {s.prize_label}</div></td>
                        <td><span className="type-chip" style={{ background:meta.bg, color:meta.color }}>{meta.label}</span></td>
                        <td><span className="cube-value">+{fmtNum(s.cube_awarded)}</span></td>
                        <td>
                          <div style={{ fontSize:12, color:"rgba(200,255,195,0.5)" }}>{fmtDate(s.spun_at)}</div>
                          <div style={{ fontSize:10, color:"rgba(200,255,195,0.3)" }}>{fmtTime(s.spun_at)}</div>
                        </td>
                        <td>
                          <span className={"spin-status-badge "+(s.prize_type==="cube"?"auto":(s._adminStatus||"pending"))}>
                            {s.prize_type==="cube"?"auto":(s._adminStatus||"pending")}
                          </span>
                        </td>
                        <td>
                          <button className="btn-view-spin" onClick={() => setModalSpin(s)}>
                            {needsAction?"Review":"View"}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          <div style={{ padding:"0 24px 4px" }}>
            <Pagination page={spinPage} total={spinPages} onChange={p => setSpinPage(p)}/>
          </div>
        </>
      )}

      {/* TAB: TRANSACTION HISTORY */}
      {activeTab==="history" && (
        <>
          <div className="admin-toolbar">
            <select className="filter-select" value={txFilter} onChange={e => { setTxFilter(e.target.value); setTxPage(1); }}>
              <option value="all">All types</option>
              <option value="credit">Credits only</option>
              <option value="debit">Debits only</option>
            </select>
            <span className="toolbar-note">Latest 200 transactions</span>
          </div>

          <div className="history-table-wrap">
            <table className="history-table">
              <thead>
                <tr>
                  <th className="h-col-user">User</th>
                  <th className="h-col-title">Title</th>
                  <th className="h-col-amt">Amount</th>
                  <th className="h-col-type">Type</th>
                  <th className="h-col-date">Date</th>
                </tr>
              </thead>
              <tbody>
                {pagedTx.length===0 ? (
                  <tr><td colSpan={5} className="table-empty">No transactions found</td></tr>
                ) : pagedTx.map(tx => (
                  <tr key={tx.id}>
                    <td className="h-col-user" style={{ overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                      {userMap[tx.user_id]?.name||tx.user_id?.slice(0,10)+"\u2026"}
                    </td>
                    <td className="h-col-title" style={{ overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{tx.title}</td>
                    <td className="h-col-amt">
                      <span className={tx.type==="credit"?"tx-credit":"tx-debit"}>
                        {tx.type==="credit"?"+":"\u2212"}{fmtNum(Math.abs(Number(tx.amount)))}
                      </span>
                    </td>
                    <td className="h-col-type"><span className={"type-badge "+tx.type}>{tx.type}</span></td>
                    <td className="h-col-date" style={{ fontSize:11, color:"rgba(200,255,195,0.40)" }}>{fmtDate(tx.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{ padding:"0 24px 4px" }}>
            <Pagination page={txPage} total={txPages} onChange={p => setTxPage(p)}/>
          </div>
        </>
      )}

      {/* Modals */}
      {modalUser && (
        <RewardModal user={modalUser} onClose={() => setModalUser(null)}
          onSuccess={(m,t) => { showToast(m,t); loadData(); }}/>
      )}
      {modalSpin && (
        <SpinPrizeModal spin={modalSpin}
          userName={userMap[modalSpin.user_id]?.name||"Unknown"}
          userEmail={userMap[modalSpin.user_id]?.email||""}
          onClose={() => setModalSpin(null)}
          onApprove={approveSpin} onReject={rejectSpin} loading={actionLoad}/>
      )}
      {showGiveaway && (
        <GiveawayModal users={users} onClose={() => setShowGiveaway(false)}
          onSuccess={(m,t) => { showToast(m,t); loadData(); }}/>
      )}

      {toast && <div className={"admin-toast"+(toast.type==="error"?" error":"")}>{toast.msg}</div>}
    </div>
  );
}