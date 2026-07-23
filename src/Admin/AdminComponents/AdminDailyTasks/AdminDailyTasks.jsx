import { useState, useEffect, useMemo } from "react";
import {
  Search, CheckCircle, XCircle, Clock3, Eye, X, Coins,
  ExternalLink, Calendar,
} from "lucide-react";
import { supabase } from "../../../libs/supabase";
import "./AdminDailyTasks.css";

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmtDate(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "2-digit", month: "short", year: "numeric",
  });
}

function fmtDateTime(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-GB", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function useToasts() {
  const [toasts, setToasts] = useState([]);
  const addToast = (msg, type = "success") => {
    const id = Date.now();
    setToasts(p => [...p, { id, msg, type }]);
    setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 3500);
  };
  return { toasts, addToast };
}

function ToastStack({ toasts }) {
  return (
    <div className="adt-toast-wrap">
      {toasts.map(t => (
        <div key={t.id} className={`adt-toast ${t.type}`}>
          {t.type === "success" ? <CheckCircle size={14} /> : <XCircle size={14} />}
          {t.msg}
        </div>
      ))}
    </div>
  );
}

// ── Review modal ──────────────────────────────────────────────────────────────
function ReviewModal({ item, open, onClose, onApprove, onReject, acting }) {
  const [rejectMode, setRejectMode] = useState(false);
  const [reason,     setReason]     = useState("");

  useEffect(() => {
    if (open) { setRejectMode(false); setReason(""); }
  }, [open, item?.id]);

  if (!open || !item) return null;
  const isPending = item.status === "pending";

  return (
    <div className="adt-modal-overlay open" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="adt-modal-sheet">
        <div className="adt-modal-header">
          <span className="adt-modal-title">Task Review</span>
          <button className="adt-modal-close" onClick={onClose}><X size={15} /></button>
        </div>

        <div className="adt-modal-body">
          {/* Screenshot */}
          <div className="adt-screenshot-wrap">
            {item.screenshot_url ? (
              <a href={item.screenshot_url} target="_blank" rel="noopener noreferrer" className="adt-screenshot-link">
                <img src={item.screenshot_url} alt="Task screenshot" className="adt-screenshot-img" />
                <span className="adt-screenshot-badge"><ExternalLink size={12} /> View full size</span>
              </a>
            ) : (
              <div className="adt-screenshot-empty">No screenshot attached</div>
            )}
          </div>

          {/* Info rows */}
          <div className="adt-detail-rows">
            <div className="adt-detail-row">
              <span>User</span>
              <span>{item.user}</span>
            </div>
            <div className="adt-detail-row">
              <span>Email</span>
              <span>{item.email}</span>
            </div>
            <div className="adt-detail-row">
              <span>Task Date</span>
              <span>{fmtDate(item.task_date)}</span>
            </div>
            <div className="adt-detail-row">
              <span>Submitted</span>
              <span>{fmtDateTime(item.submitted_at)}</span>
            </div>
            <div className="adt-detail-row">
              <span>Reward</span>
              <span className="adt-cube-highlight">+{item.cube_reward} CUBE</span>
            </div>
            <div className="adt-detail-row">
              <span>Status</span>
              <span className={`dt-admin-status ${item.status}`}>{item.status}</span>
            </div>
            {item.admin_note && (
              <div className="adt-detail-row">
                <span>Admin Note</span>
                <span style={{ color: "#f87171" }}>{item.admin_note}</span>
              </div>
            )}
          </div>

          {/* Requirement reminder */}
          <div className="adt-requirements">
            <div className="adt-req-title">✅ Screenshot must show:</div>
            <ul>
              <li>WhatsApp Status posted</li>
              <li>Shared to 5 groups</li>
              <li>Shared to 5 friends</li>
              <li>Today's date visible</li>
            </ul>
          </div>

          {/* Actions */}
          {isPending && !rejectMode && (
            <div className="adt-modal-actions">
              <button
                className="adt-approve-btn"
                onClick={() => onApprove(item)}
                disabled={acting}
              >
                {acting ? "Processing…" : <><CheckCircle size={15} /> Approve · +{item.cube_reward} CUBE</>}
              </button>
              <button
                className="adt-reject-btn"
                onClick={() => setRejectMode(true)}
                disabled={acting}
              >
                <XCircle size={15} /> Reject
              </button>
            </div>
          )}

          {isPending && rejectMode && (
            <div className="adt-reject-form">
              <label>Reason for rejection</label>
              <textarea
                value={reason}
                onChange={e => setReason(e.target.value)}
                placeholder="e.g. Screenshot doesn't show groups shared"
                rows={3}
              />
              <div className="adt-modal-actions">
                <button
                  className="adt-reject-btn"
                  onClick={() => onReject(item, reason)}
                  disabled={acting || !reason.trim()}
                >
                  {acting ? "Processing…" : "Confirm rejection"}
                </button>
                <button className="adt-cancel-btn" onClick={() => setRejectMode(false)} disabled={acting}>
                  Cancel
                </button>
              </div>
            </div>
          )}

          {!isPending && (
            <div className={`adt-resolved-banner ${item.status}`}>
              {item.status === "approved"
                ? <><CheckCircle size={15} /> Approved — {item.cube_reward} CUBE credited</>
                : <><XCircle size={15} /> Rejected</>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function AdminDailyTasks() {
  const { toasts, addToast } = useToasts();
  const [search,   setSearch]   = useState("");
  const [filter,   setFilter]   = useState("pending");
  const [tasks,    setTasks]    = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [actingId, setActingId] = useState(null);
  const [selected, setSelected] = useState(null);

  const loadTasks = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("daily_tasks")
      .select("*")
      .order("submitted_at", { ascending: false });

    if (error) {
      console.error("Error loading daily tasks:", error);
      addToast("Failed to load tasks", "error");
      setLoading(false);
      return;
    }

    const userIds = [...new Set((data || []).map(r => r.user_id))];
    let profilesById = {};
    if (userIds.length > 0) {
      const { data: profilesData } = await supabase
        .from("profiles")
        .select("id, full_name, email, cube_balance, total_mined")
        .in("id", userIds);
      profilesById = Object.fromEntries((profilesData || []).map(p => [p.id, p]));
    }

    const mapped = (data || []).map(row => {
      const profile = profilesById[row.user_id];
      return {
        ...row,
        user:  profile?.full_name || "Unknown User",
        email: profile?.email || "—",
      };
    });

    setTasks(mapped);
    setLoading(false);
  };

  useEffect(() => { loadTasks(); }, []);

  const stats = useMemo(() => {
    const pending    = tasks.filter(t => t.status === "pending").length;
    const approved   = tasks.filter(t => t.status === "approved").length;
    const rejected   = tasks.filter(t => t.status === "rejected").length;
    const totalPaid  = tasks
      .filter(t => t.status === "approved")
      .reduce((a, t) => a + Number(t.cube_reward || 0), 0);
    return { pending, approved, rejected, totalPaid };
  }, [tasks]);

  const filtered = useMemo(() => {
    return tasks.filter(t => {
      const matchFilter = filter === "all" ? true : t.status === filter;
      const q = search.toLowerCase().trim();
      const matchSearch = !q ||
        t.user.toLowerCase().includes(q) ||
        t.email.toLowerCase().includes(q);
      return matchFilter && matchSearch;
    });
  }, [tasks, filter, search]);

  // ── Approve ───────────────────────────────────────────────────────────────
  const handleApprove = async (item) => {
    if (actingId) return;
    setActingId(item.id);

    try {
      // 1. Mark task approved
      const { error: taskErr } = await supabase
        .from("daily_tasks")
        .update({ status: "approved" })
        .eq("id", item.id);

      if (taskErr) throw taskErr;

      // 2. Credit user's balance
      const { data: prof, error: profFetchErr } = await supabase
        .from("profiles")
        .select("cube_balance, total_mined")
        .eq("id", item.user_id)
        .maybeSingle();

      if (profFetchErr || !prof) throw profFetchErr || new Error("Profile not found");

      const newBalance = Number(prof.cube_balance || 0) + Number(item.cube_reward);
      const newTotal    = Number(prof.total_mined  || 0) + Number(item.cube_reward);

      const { error: updateErr } = await supabase
        .from("profiles")
        .update({ cube_balance: newBalance, total_mined: newTotal })
        .eq("id", item.user_id);

      if (updateErr) throw updateErr;

      // 3. Log wallet transaction
      await supabase.from("wallet_transactions").insert([{
        user_id: item.user_id,
        title:   "Daily Task Reward",
        amount:  Number(item.cube_reward),
        type:    "credit",
      }]);

      addToast(`Approved — ${item.cube_reward} CUBE credited to ${item.user}`, "success");
      setSelected(null);
      await loadTasks();
    } catch (err) {
      console.error("Approve error:", err);
      addToast("Failed to approve task", "error");
    } finally {
      setActingId(null);
    }
  };

  // ── Reject ────────────────────────────────────────────────────────────────
  const handleReject = async (item, reason) => {
    if (actingId) return;
    setActingId(item.id);

    try {
      const { error } = await supabase
        .from("daily_tasks")
        .update({ status: "rejected", admin_note: reason || "Did not meet requirements" })
        .eq("id", item.id);

      if (error) throw error;

      addToast(`Rejected task for ${item.user}`, "success");
      setSelected(null);
      await loadTasks();
    } catch (err) {
      console.error("Reject error:", err);
      addToast("Failed to reject task", "error");
    } finally {
      setActingId(null);
    }
  };

  const TABS = [
    { key: "pending",  label: "Pending",  count: stats.pending  },
    { key: "approved", label: "Approved", count: stats.approved },
    { key: "rejected", label: "Rejected", count: stats.rejected },
    { key: "all",      label: "All",      count: tasks.length   },
  ];

  return (
    <div className="admin-daily-tasks">

      <div className="adt-header-row">
        <div>
          <h1>Daily Tasks</h1>
          <p>Review WhatsApp share submissions and approve CUBE rewards</p>
        </div>
        <button className="adt-refresh-btn" onClick={loadTasks}>↻ Refresh</button>
      </div>

      {/* ── Stats ── */}
      <div className="adt-stats">
        <div className="adt-stat-card">
          <Clock3 size={20} />
          <div><h2>{stats.pending}</h2><p>Pending Review</p></div>
        </div>
        <div className="adt-stat-card">
          <CheckCircle size={20} />
          <div><h2>{stats.approved}</h2><p>Approved</p></div>
        </div>
        <div className="adt-stat-card">
          <XCircle size={20} />
          <div><h2>{stats.rejected}</h2><p>Rejected</p></div>
        </div>
        <div className="adt-stat-card">
          <Coins size={20} />
          <div><h2>{stats.totalPaid.toLocaleString()}</h2><p>CUBE Paid Out</p></div>
        </div>
      </div>

      {/* ── Search ── */}
      <div className="adt-search">
        <Search size={18} />
        <input
          type="text"
          placeholder="Search by user or email…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {/* ── Filter tabs ── */}
      <div className="adt-tabs">
        {TABS.map(t => (
          <button
            key={t.key}
            className={`adt-tab ${filter === t.key ? "active" : ""}`}
            onClick={() => setFilter(t.key)}
          >
            {t.label} <span className="adt-tab-count">{t.count}</span>
          </button>
        ))}
      </div>

      {/* ── Grid of submission cards ── */}
      {loading ? (
        <div className="adt-empty">Loading submissions…</div>
      ) : filtered.length === 0 ? (
        <div className="adt-empty">No submissions found.</div>
      ) : (
        <div className="adt-grid">
          {filtered.map(item => (
            <div key={item.id} className="adt-card" onClick={() => setSelected(item)}>
              <div className="adt-card-thumb">
                {item.screenshot_url ? (
                  <img src={item.screenshot_url} alt="" />
                ) : (
                  <div className="adt-card-thumb-empty">No image</div>
                )}
                <span className={`dt-admin-status floating ${item.status}`}>{item.status}</span>
              </div>
              <div className="adt-card-body">
                <div className="adt-card-user">{item.user}</div>
                <div className="adt-card-date">
                  <Calendar size={11} /> {fmtDate(item.task_date)}
                </div>
                <div className="adt-card-footer">
                  <span className="adt-cube-highlight">+{item.cube_reward} CUBE</span>
                  <button className="adt-view-btn" onClick={e => { e.stopPropagation(); setSelected(item); }}>
                    <Eye size={13} /> Review
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <ReviewModal
        item={selected}
        open={!!selected}
        onClose={() => setSelected(null)}
        onApprove={handleApprove}
        onReject={handleReject}
        acting={actingId === selected?.id}
      />
      <ToastStack toasts={toasts} />
    </div>
  );
}