import { useState, useEffect, useCallback } from "react";
import {
  Layers, ArrowUp, Clock, TrendingUp,
  Users, Gift, ArrowRight, X, AlertCircle, CheckCircle,
} from "lucide-react";
import { supabase } from "../../libs/supabase";
import { useNavigate } from "react-router-dom";
import "./WalletPage.css";

// ── Constants ─────────────────────────────────────────────────────────────────
const CUBE_TO_NGN  = 0.05;
const MIN_CASHOUT  = 100;

const BANKS = [
  "First Bank Nigeria","GTBank","Access Bank","Zenith Bank",
  "UBA","Fidelity Bank","Opay","Kuda Bank","Palmpay","Other",
];

// Titles that count as "Mining Earnings"
const MINING_TITLES = ["Mining Reward"];

// Titles that count as "Referral Earnings"
const REFERRAL_TITLES = ["Referral Bonus"];

// Everything else that's a credit and not mining/referral/cashout-related
// counts as "Rewards Earned" — daily check-ins, streak milestones,
// mining-amount achievements, subscription bonuses, etc.
const EXCLUDED_FROM_REWARDS = [
  ...MINING_TITLES,
  ...REFERRAL_TITLES,
  "Cashout Request",
  "Cashout Refund",
];

function cubeToNaira(cubes) {
  return (cubes * CUBE_TO_NGN).toFixed(2);
}
function fmtNaira(amount) {
  return "₦" + parseFloat(amount).toLocaleString("en-NG", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}
function genRef() {
  return "CO" + Date.now().toString().slice(-8);
}
function fmtDate(iso) {
  const d = new Date(iso);
  const now = new Date();
  const diffDays = Math.floor((now - d) / 86400000);
  const time = d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
  if (diffDays === 0) return `Today · ${time}`;
  if (diffDays === 1) return `Yesterday · ${time}`;
  return `${diffDays} days ago`;
}

// ── Toast ─────────────────────────────────────────────────────────────────────
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
    <div className="toast-wrap">
      {toasts.map((t) => (
        <div key={t.id} className={`toast ${t.type}`}>
          {t.type === "success" ? <CheckCircle size={14} /> : <AlertCircle size={14} />}
          {t.msg}
        </div>
      ))}
    </div>
  );
}

// ── CurrencyConverter ─────────────────────────────────────────────────────────
function CurrencyConverter() {
  const [cubeVal, setCubeVal] = useState("");
  const nairaVal = cubeVal ? fmtNaira(cubeToNaira(parseFloat(cubeVal) || 0)) : "";

  return (
    <div className="converter-card">
      <div className="converter-header">
        <span className="converter-title">Currency Converter</span>
        <span className="converter-rate-tag">1 CUBE = ₦0.05</span>
      </div>
      <div className="converter-body">
        <div className="converter-field">
          <label>CUBE Amount</label>
          <input
            className="converter-input"
            type="number"
            min="0"
            placeholder="0"
            value={cubeVal}
            onChange={(e) => setCubeVal(e.target.value)}
          />
          <span className="conv-unit">cube</span>
        </div>

        <div className="converter-arrow"><ArrowRight size={14} /></div>

        <div className="converter-field">
          <label>Naira Value</label>
          <input
            className="converter-input naira-out"
            type="text"
            placeholder="₦0.00"
            value={nairaVal}
            readOnly
          />
          <span className="conv-unit">ngn</span>
        </div>
      </div>
    </div>
  );
}

// ── CashoutModal ──────────────────────────────────────────────────────────────
function CashoutModal({ balance, userId, open, onClose, onSuccess }) {
  const [amount,  setAmount]  = useState("");
  const [bank,    setBank]    = useState("");
  const [acct,    setAcct]    = useState("");
  const [name,    setName]    = useState("");
  const [errors,  setErrors]  = useState({});
  const [loading, setLoading] = useState(false);
  const [done,    setDone]    = useState(false);
  const [ref,     setRef]     = useState("");

  useEffect(() => {
    if (open) {
      setAmount(""); setBank(""); setAcct(""); setName("");
      setErrors({}); setLoading(false); setDone(false); setRef("");
    }
  }, [open]);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  const parsedAmount = parseFloat(amount) || 0;
  const nairaValue   = parsedAmount > 0 ? fmtNaira(cubeToNaira(parsedAmount)) : "₦0.00";

  const validate = () => {
    const errs = {};
    if (parsedAmount < MIN_CASHOUT)  errs.amount = `Minimum cashout is ${MIN_CASHOUT} CUBE`;
    if (parsedAmount > balance)      errs.amount = "Insufficient balance";
    if (!bank)                       errs.bank   = "Select a bank";
    if (acct.length !== 10)          errs.acct   = "Enter a valid 10-digit account number";
    if (!name.trim())                errs.name   = "Account name is required";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setLoading(true);

    const txRef = genRef();
    const nairaVal = parseFloat(cubeToNaira(parsedAmount));

    // 1. Insert cashout request
    const { error: cashoutErr } = await supabase
      .from("cashout_requests")
      .insert([{
        user_id: userId,
        amount: parsedAmount,
        naira_value: nairaVal,
        bank_name: bank,
        account_number: acct,
        account_name: name,
        tx_ref: txRef,
        status: "pending",
      }]);

    if (cashoutErr) {
      console.error("Cashout insert error:", cashoutErr);
      setLoading(false);
      onSuccess(null, null, null, cashoutErr.message);
      return;
    }

    // 2. Deduct from profile balance immediately
    const { error: balanceErr } = await supabase
      .from("profiles")
      .update({ cube_balance: balance - parsedAmount })
      .eq("id", userId);

    if (balanceErr) {
      console.error("Balance deduction error:", balanceErr);
    }

    // 3. Log transaction
    await supabase.from("wallet_transactions").insert([{
      user_id: userId,
      title: "Cashout Request",
      amount: -parsedAmount,
      type: "pending",
    }]);

    setRef(txRef);
    setDone(true);
    setLoading(false);
    onSuccess(parsedAmount, txRef, name, null);
  };

  const handleOverlay = (e) => {
    if (e.target === e.currentTarget) onClose();
  };

  return (
    <div className={`modal-overlay ${open ? "open" : ""}`} onClick={handleOverlay}>
      <div className="modal-sheet">
        <div className="modal-handle" />

        {done ? (
          <div className="modal-success">
            <div className="modal-success-icon"><CheckCircle size={28} /></div>
            <h3>Request Submitted!</h3>
            <p>
              Your cashout of{" "}
              <strong style={{ color:"#e8ffe6" }}>{parsedAmount} CUBE</strong> →{" "}
              <strong style={{ color:"#4ade80" }}>{fmtNaira(cubeToNaira(parsedAmount))}</strong>{" "}
              is being processed. We'll pay to <strong style={{ color:"#e8ffe6" }}>{name}</strong>{" "}
              within 1–24 hours.
            </p>
            <div className="modal-success-ref">
              <div className="msr-label">Reference</div>
              <div className="msr-val">{ref}</div>
            </div>
            <button className="modal-done-btn" onClick={onClose}>Done</button>
          </div>
        ) : (
          <>
            <div className="modal-header">
              <span className="modal-title">Cash Out CUBE</span>
              <button className="modal-close" onClick={onClose} aria-label="Close"><X size={15} /></button>
            </div>

            <div className="modal-body">
              <div className="cashout-cube-row">
                <div className="converter-field">
                  <label>CUBE to cash out</label>
                  <input
                    className={`converter-input ${errors.amount ? "error" : ""}`}
                    type="number"
                    min={MIN_CASHOUT}
                    max={balance}
                    placeholder={`Min ${MIN_CASHOUT} CUBE`}
                    value={amount}
                    onChange={(e) => { setAmount(e.target.value); setErrors((p) => ({ ...p, amount: null })); }}
                  />
                  <span className="conv-unit">cube</span>
                </div>
                <button
                  className="cashout-max-btn"
                  onClick={() => { setAmount(String(Math.floor(balance))); setErrors((p) => ({ ...p, amount: null })); }}
                >
                  Max
                </button>
              </div>
              {errors.amount && (
                <p style={{ fontSize:11, color:"#f87171", marginTop:-10, marginBottom:10 }}>{errors.amount}</p>
              )}

              <div className="cashout-summary">
                <div className="cs-row">
                  <span className="cs-label">You cash out</span>
                  <span className="cs-val">{parsedAmount > 0 ? parsedAmount : "—"} CUBE</span>
                </div>
                <div className="cs-row">
                  <span className="cs-label">You receive</span>
                  <span className="cs-val green">{nairaValue}</span>
                </div>
                <div className="cs-row">
                  <span className="cs-label">Exchange rate</span>
                  <span className="cs-val">100 CUBE = ₦5.00</span>
                </div>
                <div className="cs-row">
                  <span className="cs-label">Available balance</span>
                  <span className="cs-val amber">{balance.toLocaleString()} CUBE</span>
                </div>
              </div>

              <div className="modal-field">
                <label>Bank Name</label>
                <select
                  className="modal-select"
                  value={bank}
                  style={errors.bank ? { borderColor:"rgba(248,113,113,0.5)" } : {}}
                  onChange={(e) => { setBank(e.target.value); setErrors((p) => ({ ...p, bank: null })); }}
                >
                  <option value="">Select bank…</option>
                  {BANKS.map((b) => <option key={b}>{b}</option>)}
                </select>
                {errors.bank && <p style={{ fontSize:11, color:"#f87171", marginTop:4 }}>{errors.bank}</p>}
              </div>

              <div className="modal-field">
                <label>Account Number</label>
                <input
                  className={`modal-input ${errors.acct ? "error" : ""}`}
                  type="text"
                  inputMode="numeric"
                  maxLength={10}
                  placeholder="10-digit account number"
                  value={acct}
                  onChange={(e) => {
                    const v = e.target.value.replace(/[^0-9]/g, "");
                    setAcct(v);
                    setErrors((p) => ({ ...p, acct: null }));
                  }}
                />
                {errors.acct && <p style={{ fontSize:11, color:"#f87171", marginTop:4 }}>{errors.acct}</p>}
              </div>

              <div className="modal-field">
                <label>Account Name</label>
                <input
                  className={`modal-input ${errors.name ? "error" : ""}`}
                  type="text"
                  placeholder="Name on your bank account"
                  value={name}
                  onChange={(e) => { setName(e.target.value); setErrors((p) => ({ ...p, name: null })); }}
                />
                {errors.name && <p style={{ fontSize:11, color:"#f87171", marginTop:4 }}>{errors.name}</p>}
              </div>

              <div className="modal-notice">
                <AlertCircle size={15} />
                <p>
                  Cashout requests are processed within 1–24 hours. Your CUBE balance
                  will be deducted immediately upon submission.
                </p>
              </div>

              <button className="modal-submit" onClick={handleSubmit} disabled={loading}>
                {loading ? <><span className="btn-spinner" />Processing…</> : "Submit Cashout Request"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ── WalletPage (main export) ──────────────────────────────────────────────────
export default function WalletPage() {
  const { toasts, addToast } = useToasts();
  const navigate = useNavigate();

  const [modalOpen, setModalOpen] = useState(false);
  const [user,    setUser]    = useState(null);
  const [profile, setProfile] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [stats, setStats] = useState({ mining: 0, referral: 0, rewards: 0, cashedOut: 0, pending: 0 });
  const [loading, setLoading] = useState(true);

  const balance = Number(profile?.cube_balance || 0);

  // ── Load wallet data ──────────────────────────────────────────────────────────
  const loadWallet = async (uid) => {
    const { data: prof } = await supabase
      .from("profiles")
      .select("cube_balance, total_mined")
      .eq("id", uid)
      .maybeSingle();
    setProfile(prof);

    // Fetch ALL transactions for accurate stat totals (not just the
    // most-recent 10), then separately keep a capped list for the
    // "Recent Transactions" display below.
    const { data: allTxs } = await supabase
      .from("wallet_transactions")
      .select("*")
      .eq("user_id", uid)
      .order("created_at", { ascending: false });

    const txs = allTxs || [];
    setTransactions(txs.slice(0, 10));

    // ── Mining Earnings ──
    const mining = txs
      .filter(t => MINING_TITLES.includes(t.title))
      .reduce((a, t) => a + Number(t.amount), 0);

    // ── Referral Earnings ──
    const referral = txs
      .filter(t => REFERRAL_TITLES.includes(t.title))
      .reduce((a, t) => a + Number(t.amount), 0);

    // ── Rewards Earned ── any credit that isn't mining/referral/cashout
    // (daily check-ins, streak milestones, mining-amount achievements, etc.)
    const rewards = txs
      .filter(t => t.type === "credit" && !EXCLUDED_FROM_REWARDS.includes(t.title))
      .reduce((a, t) => a + Number(t.amount), 0);

    // ── Cashed out (completed debits only, not pending) ──
    const cashedOut = txs
      .filter(t => t.title === "Cashout Request" && t.type !== "pending")
      .reduce((a, t) => a + Math.abs(Number(t.amount)), 0);

    // Pending cashouts
    const { data: pendingCo } = await supabase
      .from("cashout_requests")
      .select("amount")
      .eq("user_id", uid)
      .eq("status", "pending");
    const pending = (pendingCo || []).reduce((a, c) => a + Number(c.amount), 0);

    setStats({ mining, referral, rewards, cashedOut, pending });
  };

  useEffect(() => {
    const init = async () => {
      const { data: { user: u } } = await supabase.auth.getUser();
      if (!u) { navigate("/login"); return; }
      setUser(u);
      await loadWallet(u.id);
      setLoading(false);
    };
    init();
  }, []);

  const handleCashoutSuccess = async (amount, ref, name, errMsg) => {
    if (errMsg) {
      addToast(`Cashout failed: ${errMsg}`, "error");
      return;
    }
    addToast("Cashout submitted successfully!", "success");
    setModalOpen(false);
    // Refresh wallet data
    if (user) await loadWallet(user.id);
  };

  const TxIcon = ({ type }) => {
    if (type === "credit")
      return (
        <div className={`tx-icon ${type}`}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
            <path d="M12 19V5"/><path d="M19 12l-7 7-7-7"/>
          </svg>
        </div>
      );
    if (type === "debit")
      return (
        <div className={`tx-icon ${type}`}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
            <path d="M12 5v14"/><path d="M5 12l7-7 7 7"/>
          </svg>
        </div>
      );
    return (
      <div className={`tx-icon ${type}`}><Clock size={15} /></div>
    );
  };

  if (loading) {
    return (
      <div className="wallet-page">
        <div className="wallet-inner">
          <div className="wallet-hero" style={{ textAlign: "center", padding: "60px 28px" }}>
            <div style={{ fontSize: "2rem", marginBottom: 10 }}>💰</div>
            <p style={{ color: "rgba(255,255,255,.5)" }}>Loading your wallet…</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="wallet-page">
      <div className="wallet-inner">

        {/* Title */}
        <div className="wallet-title-row">
          <div className="wallet-title-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
              <rect x="2" y="5" width="20" height="14" rx="3"/>
              <path d="M2 10h20"/><circle cx="17" cy="15" r="1" fill="currentColor"/>
            </svg>
          </div>
          <div>
            <div className="wallet-title-text">My Wallet</div>
            <div className="wallet-title-sub">Manage your CUBE balance &amp; cashouts</div>
          </div>
        </div>

        {/* Hero */}
        <div className="wallet-hero">
          <div className="wallet-hero-eyebrow">
            <span className="hero-eyebrow-dot" />
            Available Balance
          </div>
          <div className="wallet-balance-cube">
            <span>{balance.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span> CUBE
          </div>
          <div className="wallet-balance-naira">
            ≈ <strong>{fmtNaira(cubeToNaira(balance))}</strong> NGN
          </div>
          <div className="rate-pill">
            <span className="rate-pip" />
            100 CUBE = ₦5.00 NGN
          </div>
          <div className="wallet-hero-actions">
            <button className="hero-btn cashout-btn" onClick={() => setModalOpen(true)}>
              <ArrowUp size={16} />
              Cash Out
            </button>
            <button className="hero-btn history-btn" onClick={() => addToast("Full history coming soon", "success")}>
              <Clock size={16} />
              History
            </button>
          </div>
        </div>

        {/* Currency converter */}
        <CurrencyConverter />

        {/* Stats */}
        <div className="stats-row">
          <div className="stat-card">
            <div className="stat-icon green"><Layers size={14} /></div>
            <div className="stat-val">{stats.mining.toFixed(0)}</div>
            <div className="stat-label">Mining Earnings</div>
          </div>
          <div className="stat-card">
            <div className="stat-icon amber"><Users size={14} /></div>
            <div className="stat-val">{stats.referral.toFixed(0)}</div>
            <div className="stat-label">Referral Earnings</div>
          </div>
          <div className="stat-card">
            <div className="stat-icon purple"><Gift size={14} /></div>
            <div className="stat-val">{stats.rewards.toFixed(0)}</div>
            <div className="stat-label">Rewards Earned</div>
          </div>
        </div>

        {/* Earnings overview */}
        <div className="earnings-card">
          <div className="card-title"><TrendingUp size={15} />Earnings Overview</div>
          <div className="earning-row">
            <span className="earning-label">Total Earned</span>
            <span className="earning-val">{Number(profile?.total_mined || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })} CUBE</span>
          </div>
          <div className="earning-row">
            <span className="earning-label">Available Balance</span>
            <span className="earning-val green">{balance.toLocaleString(undefined, { maximumFractionDigits: 2 })} CUBE</span>
          </div>
          <div className="earning-row">
            <span className="earning-label">Pending Cashouts</span>
            <span className="earning-val amber">{stats.pending.toFixed(0)} CUBE</span>
          </div>
          <div className="earning-row">
            <span className="earning-label">Total Cashed Out</span>
            <span className="earning-val">{stats.cashedOut.toFixed(0)} CUBE</span>
          </div>
          <div className="earning-row">
            <span className="earning-label">Naira Value</span>
            <span className="earning-val green">{fmtNaira(cubeToNaira(balance))}</span>
          </div>
        </div>

        {/* Transactions */}
        <div className="transactions-card">
          <div className="card-title"><Clock size={15} />Recent Transactions</div>
          {transactions.length === 0 ? (
            <p style={{ color: "rgba(255,255,255,.35)", fontSize: "0.85rem", padding: "12px 0" }}>
              No transactions yet — start mining to earn CUBE!
            </p>
          ) : transactions.map((tx) => {
            const absAmt = Math.abs(Number(tx.amount));
            const naira  = fmtNaira(cubeToNaira(absAmt));
            const prefix = Number(tx.amount) >= 0 ? "+" : "-";
            return (
              <div key={tx.id} className="tx-item">
                <TxIcon type={tx.type} />
                <div className="tx-info">
                  <div className="tx-title">{tx.title}</div>
                  <div className="tx-date">{fmtDate(tx.created_at)}</div>
                </div>
                <div className={`tx-amount ${tx.type}`}>
                  {prefix}{absAmt.toFixed(2)} CUBE
                  <span className="tx-naira">{prefix}{naira}</span>
                </div>
              </div>
            );
          })}
        </div>

      </div>

      <CashoutModal
        balance={balance}
        userId={user?.id}
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSuccess={handleCashoutSuccess}
      />

      <ToastStack toasts={toasts} />
    </div>
  );
}