import { useEffect, useState, useCallback } from "react";
import { supabase } from "../../../libs/supabase";
import "./AdminRewards.css";

// ── helpers ───────────────────────────────────────────────────────────────────
const fmt   = (n)   => Number(n || 0).toLocaleString(undefined, { maximumFractionDigits: 2 });
const fdate = (iso) => {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
};
const ini = (name, email) => {
  const s = (name || email || "?").trim();
  const parts = s.split(" ");
  return parts.length >= 2 ? (parts[0][0] + parts[1][0]).toUpperCase() : s.slice(0, 2).toUpperCase();
};

const PRIZE_COLORS = {
  cube:    "#4ade80",
  airtime: "#fbbf24",
  data:    "#60a5fa",
};
const PRIZE_ICONS = { cube: "⬡", airtime: "📞", data: "📶" };
const REWARD_TYPES = [
  "Manual Bonus", "Referral Bonus", "Promo Reward",
  "Spin Override", "Support Credit", "Achievement Bonus", "Giveaway",
];

// ─────────────────────────────────────────────────────────────────────────────
// SEND REWARD MODAL
// ─────────────────────────────────────────────────────────────────────────────
function RewardModal({ user, onClose, onDone }) {
  const [amount,  setAmount]  = useState("");
  const [type,    setType]    = useState(REWARD_TYPES[0]);
  const [busy,    setBusy]    = useState(false);
  const [err,     setErr]     = useState("");

  const send = async () => {
    const cube = Number(amount);
    if (!cube || cube <= 0) { setErr("Enter a valid amount"); return; }
    setBusy(true); setErr("");
    try {
      // 1. read current balance
      const { data: prof, error: re } = await supabase
        .from("profiles").select("cube_balance").eq("id", user.id).single();
      if (re) throw re;

      // 2. write new balance
      const newBal = Number(prof.cube_balance || 0) + cube;
      const { error: we } = await supabase
        .from("profiles").update({ cube_balance: newBal }).eq("id", user.id);
      if (we) throw we;

      // 3. log the transaction
      const { error: te } = await supabase.from("wallet_transactions").insert({
        user_id: user.id,
        title:   `${type} — Admin`,
        amount:  cube,
        type:    "credit",
      });
      if (te) throw te;

      onDone(`+${fmt(cube)} CUBE sent to ${user.full_name || user.email}`);
      onClose();
    } catch (e) {
      setErr(e.message || "Failed — check console");
      console.error(e);
    } finally { setBusy(false); }
  };

  return (
    <div className="ar-modal-bg" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="ar-modal">
        <div className="ar-modal-head">
          <span>Send reward</span>
          <button className="ar-modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="ar-modal-user">
          <div className="ar-avatar">{ini(user.full_name, user.email)}</div>
          <div>
            <div className="ar-modal-name">{user.full_name || "—"}</div>
            <div className="ar-modal-email">{user.email || user.id}</div>
            <div className="ar-modal-bal">Balance: <b>{fmt(user.cube_balance)} CUBE</b></div>
          </div>
        </div>

        <div className="ar-presets">
          {[50, 100, 250, 500, 1000, 2000].map(p => (
            <button
              key={p}
              className={`ar-preset${amount === String(p) ? " active" : ""}`}
              onClick={() => setAmount(String(p))}
            >
              {p >= 1000 ? `${p / 1000}K` : p}
            </button>
          ))}
        </div>

        <div className="ar-field">
          <label>CUBE amount</label>
          <input
            type="number" min="1" placeholder="e.g. 500"
            value={amount} onChange={e => setAmount(e.target.value)}
          />
        </div>
        <div className="ar-field">
          <label>Reward type</label>
          <select value={type} onChange={e => setType(e.target.value)}>
            {REWARD_TYPES.map(t => <option key={t}>{t}</option>)}
          </select>
        </div>

        {err && <div className="ar-err">{err}</div>}

        <div className="ar-modal-foot">
          <button className="ar-btn-cancel" onClick={onClose} disabled={busy}>Cancel</button>
          <button className="ar-btn-send" onClick={send} disabled={busy || !amount}>
            {busy ? "Sending…" : `Send ${amount ? fmt(amount) : "?"} CUBE`}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// GIVEAWAY MODAL
// ─────────────────────────────────────────────────────────────────────────────
function GiveawayModal({ users, onClose, onDone }) {
  const [amount,   setAmount]   = useState("");
  const [target,   setTarget]   = useState("all");
  const [note,     setNote]     = useState("");
  const [busy,     setBusy]     = useState(false);
  const [progress, setProgress] = useState("");
  const [err,      setErr]      = useState("");

  const resolveTargets = () => {
    if (target === "all")    return users;
    if (target === "active") return users.filter(u => Number(u.cube_balance || 0) > 0);
    return [...users]
      .sort((a, b) => Number(b.cube_balance || 0) - Number(a.cube_balance || 0))
      .slice(0, Number(target) || 0);
  };

  const targets = resolveTargets();
  const cube    = Number(amount);
  const total   = cube * targets.length;

  const send = async () => {
    if (!cube || cube <= 0 || targets.length === 0) return;
    if (!window.confirm(
      `Send ${fmt(cube)} CUBE to ${targets.length} users?\nTotal: ${fmt(total)} CUBE — cannot be undone.`
    )) return;

    setBusy(true); setErr("");
    const title = note ? `Giveaway: ${note}` : "Admin Giveaway 🎉";

    try {
      let done = 0;
      // Process in batches of 50 to avoid timeout
      const CHUNK = 50;
      for (let i = 0; i < targets.length; i += CHUNK) {
        const batch = targets.slice(i, i + CHUNK);

        // Update balances
        await Promise.all(batch.map(async u => {
          const { data: prof } = await supabase
            .from("profiles").select("cube_balance").eq("id", u.id).single();
          const newBal = Number(prof?.cube_balance || 0) + cube;
          await supabase.from("profiles").update({ cube_balance: newBal }).eq("id", u.id);
        }));

        // Log transactions in one insert
        const { error: te } = await supabase.from("wallet_transactions").insert(
          batch.map(u => ({ user_id: u.id, title, amount: cube, type: "credit" }))
        );
        if (te) throw te;

        done += batch.length;
        setProgress(`${done} / ${targets.length} users…`);
      }

      onDone(`🎉 Sent ${fmt(cube)} CUBE × ${targets.length} users = ${fmt(total)} CUBE total`);
      onClose();
    } catch (e) {
      setErr(e.message || "Giveaway failed");
      console.error(e);
    } finally { setBusy(false); setProgress(""); }
  };

  return (
    <div className="ar-modal-bg" onClick={e => e.target === e.currentTarget && !busy && onClose()}>
      <div className="ar-modal">
        <div className="ar-modal-head">
          <span>🎉 Broadcast giveaway</span>
          <button className="ar-modal-close" onClick={onClose} disabled={busy}>✕</button>
        </div>

        <div className="ar-presets">
          {[50, 100, 250, 500, 1000].map(p => (
            <button
              key={p}
              className={`ar-preset${amount === String(p) ? " active" : ""}`}
              onClick={() => setAmount(String(p))} disabled={busy}
            >
              {p >= 1000 ? `${p / 1000}K` : p}
            </button>
          ))}
        </div>

        <div className="ar-field">
          <label>CUBE per user</label>
          <input type="number" min="1" placeholder="Amount per user"
            value={amount} onChange={e => setAmount(e.target.value)} disabled={busy} />
        </div>
        <div className="ar-field">
          <label>Send to</label>
          <select value={target} onChange={e => setTarget(e.target.value)} disabled={busy}>
            <option value="all">All users ({users.length})</option>
            <option value="active">Active only (balance &gt; 0) ({users.filter(u => Number(u.cube_balance || 0) > 0).length})</option>
            <option value="10">Top 10 by balance</option>
            <option value="50">Top 50 by balance</option>
            <option value="100">Top 100 by balance</option>
          </select>
        </div>
        <div className="ar-field">
          <label>Title (optional)</label>
          <input type="text" placeholder="e.g. Weekend bonus, Holiday reward…"
            value={note} onChange={e => setNote(e.target.value)} disabled={busy} />
        </div>

        {cube > 0 && (
          <div className="ar-giveaway-preview">
            <div className="ar-gw-row"><span>Recipients</span><b>{targets.length} users</b></div>
            <div className="ar-gw-row"><span>Per user</span><b style={{ color:"#4ade80" }}>{fmt(cube)} CUBE</b></div>
            <div className="ar-gw-row ar-gw-total"><span>Total</span><b style={{ color:"#7fff6e" }}>{fmt(total)} CUBE</b></div>
          </div>
        )}

        {progress && <div className="ar-progress">{progress}</div>}
        {err      && <div className="ar-err">{err}</div>}

        <div className="ar-modal-foot">
          <button className="ar-btn-cancel" onClick={onClose} disabled={busy}>Cancel</button>
          <button className="ar-btn-giveaway" onClick={send}
            disabled={busy || !cube || cube <= 0 || targets.length === 0}>
            {busy ? `Sending… ${progress}` : `Send to ${targets.length} users`}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────────────────────────────
export default function AdminRewards() {
  const [users,      setUsers]      = useState([]);
  const [txList,     setTxList]     = useState([]);
  const [spinList,   setSpinList]   = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [err,        setErr]        = useState("");
  const [search,     setSearch]     = useState("");
  const [tab,        setTab]        = useState("users");   // users | rewards | spins
  const [rewardUser, setRewardUser] = useState(null);
  const [showGA,     setShowGA]     = useState(false);
  const [toast,      setToast]      = useState("");

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(""), 4000); };

  // ── Fetch ─────────────────────────────────────────────────────────────────
  const load = useCallback(async () => {
    setLoading(true); setErr("");
    try {
      // --- profiles ---
      const { data: profData, error: profErr } = await supabase
        .from("profiles")
        .select("id, full_name, email, cube_balance, total_mined, streak, created_at")
        .order("created_at", { ascending: false });

      if (profErr) throw new Error("profiles — " + profErr.message + (profErr.hint ? " | hint: " + profErr.hint : ""));

      // --- wallet_transactions ---
      const { data: txData, error: txErr } = await supabase
        .from("wallet_transactions")
        .select("id, user_id, title, amount, type, created_at")
        .order("created_at", { ascending: false })
        .limit(300);

      if (txErr) throw new Error("wallet_transactions — " + txErr.message);

      // --- spin_results ---
      const { data: spinData, error: spinErr } = await supabase
        .from("spin_results")
        .select("id, user_id, prize_type, prize_label, cube_awarded, spun_at")
        .order("spun_at", { ascending: false })
        .limit(300);

      if (spinErr) throw new Error("spin_results — " + spinErr.message);

      setUsers(profData || []);
      setTxList(txData  || []);
      setSpinList(spinData || []);
    } catch (e) {
      console.error("AdminRewards load:", e);
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // ── Derived ───────────────────────────────────────────────────────────────
  const userMap = {};
  users.forEach(u => { userMap[u.id] = u.full_name || u.email || u.id.slice(0, 8); });

  const filteredUsers = users.filter(u => {
    const q = search.toLowerCase();
    return !q
      || (u.full_name || "").toLowerCase().includes(q)
      || (u.email    || "").toLowerCase().includes(q);
  });

  const creditTx = txList.filter(t => t.type === "credit");

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="ar-page">
      <div className="ar-header">
        <div>
          <h1 className="ar-title">Admin Rewards</h1>
          <p className="ar-sub">View user rewards · send CUBE · run giveaways</p>
        </div>
        <div className="ar-header-btns">
          <button className="ar-btn-ga" onClick={() => setShowGA(true)}>🎉 Giveaway</button>
          <button className="ar-btn-refresh" onClick={load}>↻ Refresh</button>
        </div>
      </div>

      {/* Stats row */}
      <div className="ar-stats">
        <div className="ar-stat">
          <div className="ar-stat-n">{users.length}</div>
          <div className="ar-stat-l">Total users</div>
        </div>
        <div className="ar-stat">
          <div className="ar-stat-n">{creditTx.length}</div>
          <div className="ar-stat-l">Credits issued</div>
        </div>
        <div className="ar-stat">
          <div className="ar-stat-n">{spinList.length}</div>
          <div className="ar-stat-l">Spin results</div>
        </div>
        <div className="ar-stat">
          <div className="ar-stat-n">
            {fmt(users.reduce((s, u) => s + Number(u.cube_balance || 0), 0))}
          </div>
          <div className="ar-stat-l">CUBE in wallets</div>
        </div>
      </div>

      {/* Error banner */}
      {err && (
        <div className="ar-err-banner">
          <b>Failed to load data:</b> {err}
          <br />
          <small>
            If this says "permission denied" or "0 rows" — run <code>fix_admin_rewards_rls.sql</code> in
            your Supabase SQL editor first, then refresh.
          </small>
          <button onClick={load} style={{ marginTop: 8, display: "block" }}>Try again</button>
        </div>
      )}

      {/* Tabs */}
      <div className="ar-tabs">
        <button className={tab === "users"   ? "ar-tab active" : "ar-tab"} onClick={() => setTab("users")}>
          Users ({users.length})
        </button>
        <button className={tab === "rewards" ? "ar-tab active" : "ar-tab"} onClick={() => setTab("rewards")}>
          Reward history ({creditTx.length})
        </button>
        <button className={tab === "spins"   ? "ar-tab active" : "ar-tab"} onClick={() => setTab("spins")}>
          Spin prizes ({spinList.length})
        </button>
      </div>

      {loading && <div className="ar-loading">Loading…</div>}

      {/* ── TAB: USERS ─────────────────────────────────────────────────────── */}
      {!loading && tab === "users" && (
        <>
          <div className="ar-toolbar">
            <input
              className="ar-search"
              placeholder="Search by name or email…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            <button className="ar-btn-ga-sm" onClick={() => setShowGA(true)}>🎉 Broadcast giveaway</button>
          </div>

          {filteredUsers.length === 0 ? (
            <div className="ar-empty">{search ? `No users match "${search}"` : "No users found"}</div>
          ) : (
            <div className="ar-table-wrap">
              <table className="ar-table">
                <thead>
                  <tr>
                    <th>User</th>
                    <th>Balance</th>
                    <th>Total mined</th>
                    <th>Streak</th>
                    <th>Joined</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map(u => (
                    <tr key={u.id}>
                      <td>
                        <div className="ar-user-cell">
                          <div className="ar-avatar">{ini(u.full_name, u.email)}</div>
                          <div>
                            <div className="ar-user-name">{u.full_name || "—"}</div>
                            <div className="ar-user-email">{u.email || u.id.slice(0, 18) + "…"}</div>
                          </div>
                        </div>
                      </td>
                      <td className="ar-cube">{fmt(u.cube_balance)} CUBE</td>
                      <td className="ar-muted">{fmt(u.total_mined)}</td>
                      <td className="ar-muted">
                        {Number(u.streak) > 0 ? `🔥 ${u.streak}d` : "—"}
                      </td>
                      <td className="ar-muted">{fdate(u.created_at)}</td>
                      <td>
                        <button className="ar-btn-reward" onClick={() => setRewardUser(u)}>
                          + Reward
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* ── TAB: REWARD HISTORY ─────────────────────────────────────────────── */}
      {!loading && tab === "rewards" && (
        <>
          {creditTx.length === 0 ? (
            <div className="ar-empty">No credit transactions found.</div>
          ) : (
            <div className="ar-table-wrap">
              <table className="ar-table">
                <thead>
                  <tr>
                    <th>User</th>
                    <th>Reward title</th>
                    <th>Amount</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {creditTx.map(tx => (
                    <tr key={tx.id}>
                      <td>
                        <div className="ar-user-name">{userMap[tx.user_id] || tx.user_id?.slice(0, 14) + "…"}</div>
                      </td>
                      <td className="ar-muted">{tx.title}</td>
                      <td className="ar-cube">+{fmt(Math.abs(Number(tx.amount)))} CUBE</td>
                      <td className="ar-muted">{fdate(tx.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* ── TAB: SPIN PRIZES ─────────────────────────────────────────────────── */}
      {!loading && tab === "spins" && (
        <>
          {spinList.length === 0 ? (
            <div className="ar-empty">No spin results found.</div>
          ) : (
            <div className="ar-table-wrap">
              <table className="ar-table">
                <thead>
                  <tr>
                    <th>User</th>
                    <th>Prize</th>
                    <th>Type</th>
                    <th>CUBE credited</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {spinList.map(s => (
                    <tr key={s.id}>
                      <td>
                        <div className="ar-user-name">{userMap[s.user_id] || s.user_id?.slice(0, 14) + "…"}</div>
                      </td>
                      <td>
                        <span style={{ color: PRIZE_COLORS[s.prize_type] || "#4ade80" }}>
                          {PRIZE_ICONS[s.prize_type] || "⬡"} {s.prize_label}
                        </span>
                      </td>
                      <td>
                        <span className="ar-type-chip" style={{
                          background: `${PRIZE_COLORS[s.prize_type] || "#4ade80"}18`,
                          color:       PRIZE_COLORS[s.prize_type] || "#4ade80",
                          borderColor:`${PRIZE_COLORS[s.prize_type] || "#4ade80"}40`,
                        }}>
                          {s.prize_type}
                        </span>
                      </td>
                      <td className="ar-cube">+{fmt(s.cube_awarded)} CUBE</td>
                      <td className="ar-muted">{fdate(s.spun_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* Modals */}
      {rewardUser && (
        <RewardModal
          user={rewardUser}
          onClose={() => setRewardUser(null)}
          onDone={(msg) => { showToast(msg); load(); }}
        />
      )}
      {showGA && (
        <GiveawayModal
          users={users}
          onClose={() => setShowGA(false)}
          onDone={(msg) => { showToast(msg); load(); }}
        />
      )}

      {toast && <div className="ar-toast">{toast}</div>}
    </div>
  );
}