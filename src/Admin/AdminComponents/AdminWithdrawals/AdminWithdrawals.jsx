import { useState, useEffect, useCallback } from "react";
import {
  Search,
  CheckCircle,
  XCircle,
  Clock3,
  Eye,
  X,
} from "lucide-react";
import { supabase } from "../../../libs/supabase";
import "./AdminWithdrawals.css";

// ── Toast ─────────────────────────────────────────────────────────────────
function useToasts() {
  const [toasts, setToasts] = useState([]);
  const addToast = useCallback((msg, type = "success") => {
    const id = Date.now();
    setToasts((p) => [...p, { id, msg, type }]);
    setTimeout(() => setToasts((p) => p.filter((t) => t.id !== id)), 3500);
  }, []);
  return { toasts, addToast };
}

function ToastStack({ toasts }) {
  return (
    <div className="aw-toast-wrap">
      {toasts.map((t) => (
        <div key={t.id} className={`aw-toast ${t.type}`}>
          {t.type === "success" ? <CheckCircle size={14} /> : <XCircle size={14} />}
          {t.msg}
        </div>
      ))}
    </div>
  );
}

// ── Detail Modal ──────────────────────────────────────────────────────────
function DetailModal({ item, open, onClose }) {
  if (!open || !item) return null;

  return (
    <div className="aw-modal-overlay open" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="aw-modal-sheet">
        <div className="aw-modal-header">
          <span className="aw-modal-title">Withdrawal {item.id}</span>
          <button className="aw-modal-close" onClick={onClose} aria-label="Close"><X size={15} /></button>
        </div>
        <div className="aw-modal-body">
          <div className="aw-detail-row"><span>User</span><span>{item.user}</span></div>
          <div className="aw-detail-row"><span>CUBE</span><span>{item.cube}</span></div>
          <div className="aw-detail-row"><span>Amount</span><span>₦{Number(item.amount).toLocaleString()}</span></div>
          <div className="aw-detail-row"><span>Bank</span><span>{item.bank}</span></div>
          <div className="aw-detail-row"><span>Account Number</span><span>{item.account}</span></div>
          <div className="aw-detail-row"><span>Account Name</span><span>{item.accountName}</span></div>
          <div className="aw-detail-row"><span>Reference</span><span>{item.txRef}</span></div>
          <div className="aw-detail-row"><span>Status</span><span className={`withdraw-status ${item.status.toLowerCase()}`}>{item.status}</span></div>
          <div className="aw-detail-row"><span>Date</span><span>{item.date}</span></div>
        </div>
      </div>
    </div>
  );
}

export default function AdminWithdrawals() {
  const { toasts, addToast } = useToasts();

  const [search, setSearch] = useState("");
  const [withdrawals, setWithdrawals] = useState([]);
  const [stats, setStats] = useState({ pending: 0, approved: 0, rejected: 0 });
  const [loading, setLoading] = useState(true);
  const [actingId, setActingId] = useState(null); // id currently being approved/rejected
  const [detailItem, setDetailItem] = useState(null);

  const fmtDate = (iso) => {
    const d = new Date(iso);
    return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
  };

  const loadWithdrawals = async () => {
    const { data, error } = await supabase
      .from("cashout_requests")
      .select(`
        id,
        amount,
        naira_value,
        bank_name,
        account_number,
        account_name,
        tx_ref,
        status,
        created_at,
        user_id
      `)
      .order("created_at", { ascending: false });
      

    if (error) {
      console.error("Error loading withdrawals:", error);
      addToast("Failed to load withdrawals", "error");
      setLoading(false);
      return;
    }

    // Fetch profile names separately and map by user_id, since the FK
    // relationship isn't set up for an embedded join.
    const userIds = [...new Set((data || []).map((row) => row.user_id))];
    let profilesById = {};

    if (userIds.length > 0) {
      const { data: profilesData, error: profilesErr } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .in("id", userIds);

      if (profilesErr) {
        console.error("Error loading profiles:", profilesErr);
      } else {
        profilesById = Object.fromEntries(
          (profilesData || []).map((p) => [p.id, p])
        );
      }
    }

    const mapped = (data || []).map((row) => {
      const profile = profilesById[row.user_id];
      return {
        id: `#WD${String(row.id).padStart(3, "0")}`,
        rawId: row.id,
        userId: row.user_id,
        user: profile?.full_name || profile?.email || "Unknown User",
        amount: row.naira_value,
        cube: row.amount,
        bank: row.bank_name,
        account: row.account_number,
        accountName: row.account_name,
        txRef: row.tx_ref,
        status: row.status.charAt(0).toUpperCase() + row.status.slice(1),
        date: fmtDate(row.created_at),
      };
    });

    setWithdrawals(mapped);

    const pending = mapped.filter((w) => w.status === "Pending").length;
    const approved = mapped.filter((w) => w.status === "Approved").length;
    const rejected = mapped.filter((w) => w.status === "Rejected").length;
    setStats({ pending, approved, rejected });

    setLoading(false);
  };

  useEffect(() => {
    loadWithdrawals();
  }, []);

  // ── Approve: mark request approved AND log a completed debit transaction ──
  const handleApprove = async (item) => {
    if (actingId) return;
    setActingId(item.rawId);

    const { error: updateErr } = await supabase
      .from("cashout_requests")
      .update({ status: "approved" })
      .eq("id", item.rawId);

    if (updateErr) {
      console.error("Approve error:", updateErr);
      addToast("Failed to approve withdrawal", "error");
      setActingId(null);
      return;
    }

    // Update the pending wallet transaction to completed/debit so it flows
    // through on the user's Wallet page (Total Cashed Out, tx list, etc.)
    const { error: txErr } = await supabase
      .from("wallet_transactions")
      .update({ type: "debit" })
      .eq("user_id", item.userId)
      .eq("title", "Cashout Request")
      .eq("type", "pending")
      .eq("amount", -item.cube);

    if (txErr) {
      console.error("Transaction update error:", txErr);
    }

    addToast(`${item.id} approved`, "success");
    await loadWithdrawals();
    setActingId(null);
  };

  // ── Reject: mark rejected, refund balance, log a credit reversal ──────────
  const handleReject = async (item) => {
    if (actingId) return;
    setActingId(item.rawId);

    const { error: updateErr } = await supabase
      .from("cashout_requests")
      .update({ status: "rejected" })
      .eq("id", item.rawId);

    if (updateErr) {
      console.error("Reject error:", updateErr);
      addToast("Failed to reject withdrawal", "error");
      setActingId(null);
      return;
    }

    // Refund the CUBE back to the user's balance
    const { data: prof, error: profErr } = await supabase
      .from("profiles")
      .select("cube_balance")
      .eq("id", item.userId)
      .maybeSingle();

    if (!profErr && prof) {
      await supabase
        .from("profiles")
        .update({ cube_balance: Number(prof.cube_balance) + Number(item.cube) })
        .eq("id", item.userId);
    }

    // Flip the pending debit row into a refund credit, so it shows correctly
    // in the user's transaction history on the Wallet page
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

  const filtered = withdrawals.filter(
    (item) =>
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

      <div className="withdrawals-stats">

        <div className="withdraw-card">
          <Clock3 />
          <div>
            <h2>{stats.pending}</h2>
            <p>Pending</p>
          </div>
        </div>

        <div className="withdraw-card">
          <CheckCircle />
          <div>
            <h2>{stats.approved}</h2>
            <p>Approved</p>
          </div>
        </div>

        <div className="withdraw-card">
          <XCircle />
          <div>
            <h2>{stats.rejected}</h2>
            <p>Rejected</p>
          </div>
        </div>

      </div>

      <div className="withdraw-search">
        <Search size={18} />
        <input
          type="text"
          placeholder="Search withdrawal..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

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
            ) : filtered.map((item) => {
              const isActing = actingId === item.rawId;
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

      <DetailModal item={detailItem} open={!!detailItem} onClose={() => setDetailItem(null)} />
      <ToastStack toasts={toasts} />

    </div>
  );
}