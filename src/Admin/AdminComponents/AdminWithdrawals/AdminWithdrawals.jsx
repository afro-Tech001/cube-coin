import { useState, useEffect } from "react";
import {
  Search, CheckCircle, XCircle, Clock3, Eye, X, Wallet,
} from "lucide-react";
import { supabase } from "../../../libs/supabase";
import "./AdminWithdrawals.css";

function fmtDate(iso) {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "2-digit", month: "short", year: "numeric",
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
    <div className="aw-toast-wrap">
      {toasts.map(t => (
        <div key={t.id} className={`aw-toast ${t.type}`}>
          {t.type === "success" ? <CheckCircle size={14} /> : <XCircle size={14} />}
          {t.msg}
        </div>
      ))}
    </div>
  );
}

function DetailModal({ item, open, onClose }) {
  if (!open || !item) return null;
  return (
    <div className="aw-modal-overlay open" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="aw-modal-sheet">
        <div className="aw-modal-header">
          <span className="aw-modal-title">Withdrawal {item.id}</span>
          <button className="aw-modal-close" onClick={onClose}><X size={15} /></button>
        </div>
        <div className="aw-modal-body">
          {[
            ["User",           item.user],
            ["CUBE",           item.cube],
            ["Amount",         `₦${Number(item.amount).toLocaleString()}`],
            ["Bank",           item.bank],
            ["Account Number", item.account],
            ["Account Name",   item.accountName],
            ["Reference",      item.txRef],
            ["Status",         item.status],
            ["Date",           item.date],
          ].map(([l, v]) => (
            <div key={l} className="aw-detail-row">
              <span>{l}</span>
              <span className={l === "Status" ? `withdraw-status ${String(v).toLowerCase()}` : ""}>
                {v}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function AdminWithdrawals() {
  const { toasts, addToast } = useToasts();
  const [search,      setSearch]      = useState("");
  const [withdrawals, setWithdrawals] = useState([]);
  const [stats,       setStats]       = useState({ pending: 0, approved: 0, rejected: 0, totalPaidOut: 0 });
  const [loading,     setLoading]     = useState(true);
  const [actingId,    setActingId]    = useState(null);
  const [detailItem,  setDetailItem]  = useState(null);

  const loadWithdrawals = async () => {
    // ── Fetch cashout requests ──
    const { data, error } = await supabase
      .from("cashout_requests")
      .select(`id, amount, naira_value, bank_name, account_number,
               account_name, tx_ref, status, created_at, user_id`)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error loading withdrawals:", error);
      addToast("Failed to load withdrawals", "error");
      setLoading(false);
      return;
    }

    // ── Fetch profile names separately ──
    const userIds = [...new Set((data || []).map(r => r.user_id))];
    let profilesById = {};
    if (userIds.length > 0) {
      const { data: profilesData } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .in("id", userIds);
      profilesById = Object.fromEntries(
        (profilesData || []).map(p => [p.id, p])
      );
    }

    const mapped = (data || []).map(row => {
      const profile = profilesById[row.user_id];
      return {
        id:          `#WD${String(row.id).padStart(3, "0")}`,
        rawId:       row.id,
        userId:      row.user_id,
        user:        profile?.full_name || profile?.email || "Unknown User",
        amount:      row.naira_value,
        cube:        row.amount,
        bank:        row.bank_name,
        account:     row.account_number,
        accountName: row.account_name,
        txRef:       row.tx_ref,
        status:      row.status.charAt(0).toUpperCase() + row.status.slice(1),
        date:        fmtDate(row.created_at),
      };
    });

    setWithdrawals(mapped);

    // ── Stats ──
    const pending   = mapped.filter(w => w.status === "Pending").length;
    const approved  = mapped.filter(w => w.status === "Approved").length;
    const rejected  = mapped.filter(w => w.status === "Rejected").length;

    // Total paid out = sum of naira_value for all approved requests
    const totalPaidOut = (data || [])
      .filter(r => r.status === "approved")
      .reduce((a, r) => a + Number(r.naira_value || 0), 0);

    setStats({ pending, approved, rejected, totalPaidOut });
    setLoading(false);
  };

  useEffect(() => { loadWithdrawals(); }, []);

  // ── Approve ───────────────────────────────────────────────────────────────
  const handleApprove = async (item) => {
    if (actingId) return;
    setActingId(item.rawId);

    const { error: updateErr } = await supabase
      .from("cashout_requests")
      .update({ status: "approved" })
      .eq("id", item.rawId);

    if (updateErr) {
      addToast("Failed to approve withdrawal", "error");
      setActingId(null);
      return;
    }

    // Flip the pending wallet transaction to a completed debit
    await supabase
      .from("wallet_transactions")
      .update({ type: "debit" })
      .eq("user_id", item.userId)
      .eq("title", "Cashout Request")
      .eq("type", "pending")
      .eq("amount", -item.cube);

    addToast(`${item.id} approved`, "success");
    await loadWithdrawals();
    setActingId(null);
  };

  // ── Reject ────────────────────────────────────────────────────────────────
  const handleReject = async (item) => {
    if (actingId) return;
    setActingId(item.rawId);

    const { error: updateErr } = await supabase
      .from("cashout_requests")
      .update({ status: "rejected" })
      .eq("id", item.rawId);

    if (updateErr) {
      addToast("Failed to reject withdrawal", "error");
      setActingId(null);
      return;
    }

    // Refund CUBE to user balance
    const { data: prof } = await supabase
      .from("profiles")
      .select("cube_balance")
      .eq("id", item.userId)
      .maybeSingle();

    if (prof) {
      await supabase
        .from("profiles")
        .update({ cube_balance: Number(prof.cube_balance) + Number(item.cube) })
        .eq("id", item.userId);
    }

    // Convert pending tx to a refund credit
    await supabase
      .from("wallet_transactions")
      .update({ title: "Cashout Refund", amount: item.cube, type: "credit" })
      .eq("user_id", item.userId)
      .eq("title", "Cashout Request")
      .eq("type", "pending")
      .eq("amount", -item.cube);

    addToast(`${item.id} rejected and CUBE refunded`, "success");
    await loadWithdrawals();
    setActingId(null);
  };

  const filtered = withdrawals.filter(item =>
    item.user.toLowerCase().includes(search.toLowerCase()) ||
    item.id.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="admin-withdrawals">

      <div className="withdrawals-header">
        <div>
          <h1>Withdrawals</h1>
          <p>Manage all withdrawal requests</p>
        </div>
      </div>

      {/* ── Stats — 4 cards ── */}
      <div className="withdrawals-stats">

        <div className="withdraw-card">
          <Clock3 size={20} />
          <div>
            <h2>{stats.pending}</h2>
            <p>Pending</p>
          </div>
        </div>

        <div className="withdraw-card">
          <CheckCircle size={20} />
          <div>
            <h2>{stats.approved}</h2>
            <p>Approved</p>
          </div>
        </div>

        <div className="withdraw-card">
          <XCircle size={20} />
          <div>
            <h2>{stats.rejected}</h2>
            <p>Rejected</p>
          </div>
        </div>

        <div className="withdraw-card">
          <Wallet size={20} />
          <div>
            <h2>₦{stats.totalPaidOut.toLocaleString()}</h2>
            <p>Total Paid Out</p>
          </div>
        </div>

      </div>

      {/* ── Search ── */}
      <div className="withdraw-search">
        <Search size={18} />
        <input
          type="text"
          placeholder="Search withdrawal..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {/* ── Table ── */}
      <div className="withdraw-table">
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>User</th>
              <th>CUBE</th>
              <th>Amount</th>
              <th>Bank</th>
              <th>Status</th>
              <th>Date</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={8} className="withdraw-empty">Loading withdrawals…</td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={8} className="withdraw-empty">No withdrawal requests found.</td>
              </tr>
            ) : filtered.map(item => {
              const isActing  = actingId === item.rawId;
              const isPending = item.status === "Pending";
              return (
                <tr key={item.id}>
                  <td>{item.id}</td>
                  <td>{item.user}</td>
                  <td>{item.cube}</td>
                  <td>₦{Number(item.amount).toLocaleString()}</td>
                  <td>{item.bank}</td>
                  <td>
                    <span className={`withdraw-status ${item.status.toLowerCase()}`}>
                      {item.status}
                    </span>
                  </td>
                  <td>{item.date}</td>
                  <td>
                    <div className="withdraw-actions">
                      <button className="view-btn" onClick={() => setDetailItem(item)}>
                        <Eye size={15} />
                      </button>
                      {isPending ? (
                        <>
                          <button
                            className="approve-btn"
                            onClick={() => handleApprove(item)}
                            disabled={isActing}
                          >
                            {isActing ? "…" : "Approve"}
                          </button>
                          <button
                            className="reject-btn"
                            onClick={() => handleReject(item)}
                            disabled={isActing}
                          >
                            {isActing ? "…" : "Reject"}
                          </button>
                        </>
                      ) : (
                        <span className="withdraw-resolved">
                          {item.status === "Approved" ? "Paid" : "Refunded"}
                        </span>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <DetailModal
        item={detailItem}
        open={!!detailItem}
        onClose={() => setDetailItem(null)}
      />
      <ToastStack toasts={toasts} />
    </div>
  );
}