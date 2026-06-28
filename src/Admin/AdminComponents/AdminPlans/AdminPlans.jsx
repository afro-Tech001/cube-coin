import { useState } from "react";
import {
  Pickaxe, Zap, Star, Edit3, Trash2, Plus,
  ChevronDown, ChevronUp, ToggleLeft, ToggleRight, Save, X
} from "lucide-react";
import "./AdminPlans.css";

// ── Default plan data (mirrors SubscriptionPage PLANS) ───────────────────────
const DEFAULT_PLANS = [
  {
    id: 1, name: "Starter", price: 10600,
    rate: "0.08 CUBE/hr", rateVal: 0.08,
    subscriptionCubes: 50000,
    sessionHrs: 2,
    features: ["Basic mining speed", "Daily rewards", "Mobile access", "Community support"],
    active: true, featured: false,
  },
  {
    id: 2, name: "Bronze", price: 16200,
    rate: "0.20 CUBE/hr", rateVal: 0.20,
    subscriptionCubes: 100000,
    sessionHrs: 1.5,
    features: ["2.5× mining speed", "Daily rewards", "Priority queue", "Email support", "Streak bonuses"],
    active: true, featured: false,
  },
  {
    id: 3, name: "Silver", price: 22500,
    rate: "0.40 CUBE/hr", rateVal: 0.40,
    subscriptionCubes: 200000,
    sessionHrs: 1,
    features: ["5× mining speed", "Daily + bonus rewards", "Referral boost +5%", "24/7 chat support", "Streak bonuses", "Early access"],
    active: true, featured: true, badge: "Most popular",
  },
  {
    id: 4, name: "Gold", price: 30350,
    rate: "0.72 CUBE/hr", rateVal: 0.72,
    subscriptionCubes: 250000,
    sessionHrs: 0.75,
    features: ["9× mining speed", "Double daily rewards", "Referral boost +10%", "VIP support", "Analytics dashboard", "Early access", "Custom avatar"],
    active: true, featured: false,
  },
  {
    id: 5, name: "Diamond", price: 50000,
    rate: "1.40 CUBE/hr", rateVal: 1.40,
    subscriptionCubes: 300000,
    sessionHrs: 0.5,
    features: ["17.5× mining speed", "Triple daily rewards", "Referral boost +20%", "Dedicated manager", "Full analytics", "NFT badge", "Priority withdrawals", "Lifetime perks"],
    active: true, featured: false,
  },
];

function fmtCubes(n) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000)     return (n / 1_000).toFixed(0) + "K";
  return n.toLocaleString();
}

const TIER_COLORS = {
  Starter: "#94a3b8",
  Bronze:  "#cd7f32",
  Silver:  "#94a3b8",
  Gold:    "#facc15",
  Diamond: "#a78bfa",
};

const TIER_GLOWS = {
  Starter: "rgba(148,163,184,0.15)",
  Bronze:  "rgba(205,127,50,0.15)",
  Silver:  "rgba(148,163,184,0.15)",
  Gold:    "rgba(250,204,21,0.15)",
  Diamond: "rgba(167,139,250,0.2)",
};

// ── Plan Editor Modal ─────────────────────────────────────────────────────────
function PlanEditor({ plan, onSave, onClose }) {
  const [form, setForm] = useState({
    name:              plan?.name || "",
    price:             plan?.price || "",
    rateVal:           plan?.rateVal || "",
    subscriptionCubes: plan?.subscriptionCubes || "",
    sessionHrs:        plan?.sessionHrs || "",
    badge:             plan?.badge || "",
    featured:          plan?.featured || false,
    features:          plan?.features?.join("\n") || "",
  });

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = () => {
    if (!form.name || !form.price || !form.rateVal) return;
    onSave({
      ...plan,
      name:              form.name,
      price:             Number(form.price),
      rateVal:           Number(form.rateVal),
      rate:              `${form.rateVal} CUBE/hr`,
      subscriptionCubes: Number(form.subscriptionCubes),
      sessionHrs:        Number(form.sessionHrs),
      badge:             form.badge,
      featured:          form.featured,
      features:          form.features.split("\n").map(f => f.trim()).filter(Boolean),
    });
  };

  return (
    <div className="ap-modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="ap-modal">
        <div className="ap-modal-header">
          <h3>{plan?.id ? `Edit ${plan.name}` : "New Plan"}</h3>
          <button className="ap-modal-close" onClick={onClose}><X size={18} /></button>
        </div>

        <div className="ap-modal-body">
          <div className="ap-field-row">
            <div className="ap-field">
              <label>Plan name</label>
              <input value={form.name} onChange={e => set("name", e.target.value)} placeholder="e.g. Silver" />
            </div>
            <div className="ap-field">
              <label>Price (₦)</label>
              <input type="number" value={form.price} onChange={e => set("price", e.target.value)} placeholder="22500" />
            </div>
          </div>

          <div className="ap-field-row">
            <div className="ap-field">
              <label>Mining rate (CUBE/hr)</label>
              <input type="number" step="0.01" value={form.rateVal} onChange={e => set("rateVal", e.target.value)} placeholder="0.40" />
            </div>
            <div className="ap-field">
              <label>Session duration (hrs)</label>
              <input type="number" step="0.25" value={form.sessionHrs} onChange={e => set("sessionHrs", e.target.value)} placeholder="1" />
            </div>
          </div>

          <div className="ap-field-row">
            <div className="ap-field">
              <label>Subscription CUBE grant</label>
              <input type="number" value={form.subscriptionCubes} onChange={e => set("subscriptionCubes", e.target.value)} placeholder="200000" />
            </div>
            <div className="ap-field">
              <label>Badge label (optional)</label>
              <input value={form.badge} onChange={e => set("badge", e.target.value)} placeholder="Most popular" />
            </div>
          </div>

          <div className="ap-field">
            <label>Features (one per line)</label>
            <textarea
              rows={6}
              value={form.features}
              onChange={e => set("features", e.target.value)}
              placeholder={"5× mining speed\nReferral boost +5%\n24/7 chat support"}
            />
          </div>

          <label className="ap-toggle-row">
            <span>Mark as featured</span>
            <button
              className={`ap-toggle ${form.featured ? "on" : "off"}`}
              onClick={() => set("featured", !form.featured)}
            >
              {form.featured ? <ToggleRight size={28} /> : <ToggleLeft size={28} />}
            </button>
          </label>
        </div>

        <div className="ap-modal-footer">
          <button className="ap-btn-ghost" onClick={onClose}>Cancel</button>
          <button className="ap-btn-save" onClick={handleSave}>
            <Save size={16} /> Save plan
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Plan Card ─────────────────────────────────────────────────────────────────
function PlanCard({ plan, onEdit, onDelete, onToggle }) {
  const [expanded, setExpanded] = useState(false);
  const color = TIER_COLORS[plan.name] || "#4ade80";
  const glow  = TIER_GLOWS[plan.name]  || "rgba(74,222,128,0.12)";

  return (
    <div
      className={`ap-plan-card ${plan.featured ? "ap-featured" : ""} ${!plan.active ? "ap-inactive" : ""}`}
      style={{ "--tier-color": color, "--tier-glow": glow }}
    >
      {plan.featured && plan.badge && (
        <div className="ap-plan-badge">{plan.badge}</div>
      )}

      {/* Header row */}
      <div className="ap-plan-top">
        <div className="ap-plan-identity">
          <div className="ap-plan-icon">
            <Pickaxe size={18} />
          </div>
          <div>
            <h3 className="ap-plan-name">{plan.name}</h3>
            <span className={`ap-status-pill ${plan.active ? "active" : "inactive"}`}>
              {plan.active ? "Active" : "Inactive"}
            </span>
          </div>
        </div>
        <div className="ap-plan-actions">
          <button className="ap-icon-btn edit"   onClick={() => onEdit(plan)}   title="Edit"><Edit3  size={15} /></button>
          <button className="ap-icon-btn toggle" onClick={() => onToggle(plan.id)} title={plan.active ? "Deactivate" : "Activate"}>
            {plan.active ? <ToggleRight size={15} /> : <ToggleLeft size={15} />}
          </button>
          <button className="ap-icon-btn delete" onClick={() => onDelete(plan.id)} title="Delete"><Trash2 size={15} /></button>
        </div>
      </div>

      {/* Key metrics */}
      <div className="ap-plan-metrics">
        <div className="ap-metric">
          <span className="ap-metric-label">Price</span>
          <span className="ap-metric-val">₦{plan.price.toLocaleString()}</span>
        </div>
        <div className="ap-metric">
          <span className="ap-metric-label">Rate</span>
          <span className="ap-metric-val" style={{ color }}>{plan.rate}</span>
        </div>
        <div className="ap-metric">
          <span className="ap-metric-label">Session</span>
          <span className="ap-metric-val">{plan.sessionHrs}h</span>
        </div>
        <div className="ap-metric">
          <span className="ap-metric-label">CUBE grant</span>
          <span className="ap-metric-val" style={{ color: "#4ade80" }}>{fmtCubes(plan.subscriptionCubes)}</span>
        </div>
      </div>

      {/* Toggle features */}
      <button className="ap-features-toggle" onClick={() => setExpanded(e => !e)}>
        {expanded ? <><ChevronUp size={14} /> Hide features</> : <><ChevronDown size={14} /> Show {plan.features.length} features</>}
      </button>

      {expanded && (
        <div className="ap-features-list">
          {plan.features.map((f, i) => (
            <div key={i} className="ap-feature-item">
              <span className="ap-feature-dot" style={{ background: color }} />
              {f}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Mining Tier Table ─────────────────────────────────────────────────────────
function MiningTiersTable({ plans }) {
  return (
    <div className="ap-section">
      <div className="ap-section-header">
        <div className="ap-section-title">
          <Zap size={18} />
          <h2>Mining tier overview</h2>
        </div>
        <p className="ap-section-sub">Session durations and earnings per full session</p>
      </div>

      <div className="ap-table-wrap">
        <table className="ap-table">
          <thead>
            <tr>
              <th>Plan</th>
              <th>Rate (CUBE/hr)</th>
              <th>Session</th>
              <th>CUBE / session</th>
              <th>CUBE grant</th>
              <th>Price (₦)</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {plans.map(p => {
              const earned = (p.rateVal * p.sessionHrs).toFixed(4);
              const color  = TIER_COLORS[p.name] || "#4ade80";
              return (
                <tr key={p.id} className={!p.active ? "ap-row-inactive" : ""}>
                  <td>
                    <span className="ap-tier-name" style={{ color }}>{p.name}</span>
                    {p.featured && <span className="ap-tier-star"><Star size={11} /></span>}
                  </td>
                  <td style={{ color }}>{p.rateVal}</td>
                  <td>{p.sessionHrs}h</td>
                  <td style={{ color: "#4ade80" }}>{earned}</td>
                  <td style={{ color: "#4ade80" }}>{fmtCubes(p.subscriptionCubes)}</td>
                  <td>₦{p.price.toLocaleString()}</td>
                  <td>
                    <span className={`ap-status-pill ${p.active ? "active" : "inactive"}`}>
                      {p.active ? "Active" : "Off"}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function AdminPlans() {
  const [plans,      setPlans]      = useState(DEFAULT_PLANS);
  const [editTarget, setEditTarget] = useState(null);   // plan obj or "new"
  const [showEditor, setShowEditor] = useState(false);

  const openNew  = () => { setEditTarget(null);  setShowEditor(true); };
  const openEdit = (plan) => { setEditTarget(plan); setShowEditor(true); };
  const closeEditor = () => { setShowEditor(false); setEditTarget(null); };

  const handleSave = (updated) => {
    if (updated.id) {
      setPlans(ps => ps.map(p => p.id === updated.id ? updated : p));
    } else {
      setPlans(ps => [...ps, { ...updated, id: Date.now(), active: true }]);
    }
    closeEditor();
  };

  const handleDelete = (id) => {
    if (!window.confirm("Remove this plan?")) return;
    setPlans(ps => ps.filter(p => p.id !== id));
  };

  const handleToggle = (id) => {
    setPlans(ps => ps.map(p => p.id === id ? { ...p, active: !p.active } : p));
  };

  const activePlans   = plans.filter(p => p.active).length;
  const totalRevPotential = plans.filter(p => p.active).reduce((a, p) => a + p.price, 0);

  return (
    <div className="admin-plans">

      {/* ── Page header ── */}
      <div className="ap-page-header">
        <div>
          <h1>Plans & Mining Tiers</h1>
          <p>Manage subscription plans shown to users</p>
        </div>
        <button className="ap-btn-new" onClick={openNew}>
          <Plus size={18} /> New plan
        </button>
      </div>

      {/* ── Summary stats ── */}
      <div className="ap-summary-row">
        <div className="ap-summary-card">
          <span className="ap-summary-icon">📦</span>
          <div>
            <div className="ap-summary-val">{plans.length}</div>
            <div className="ap-summary-label">Total plans</div>
          </div>
        </div>
        <div className="ap-summary-card">
          <span className="ap-summary-icon">✅</span>
          <div>
            <div className="ap-summary-val">{activePlans}</div>
            <div className="ap-summary-label">Active plans</div>
          </div>
        </div>
        <div className="ap-summary-card">
          <span className="ap-summary-icon">💰</span>
          <div>
            <div className="ap-summary-val">₦{totalRevPotential.toLocaleString()}</div>
            <div className="ap-summary-label">Combined plan value</div>
          </div>
        </div>
        <div className="ap-summary-card">
          <span className="ap-summary-icon">⚡</span>
          <div>
            <div className="ap-summary-val">
              {Math.max(...plans.filter(p => p.active).map(p => p.rateVal))} CUBE/hr
            </div>
            <div className="ap-summary-label">Highest rate</div>
          </div>
        </div>
      </div>

      {/* ── Plan cards ── */}
      <div className="ap-section">
        <div className="ap-section-header">
          <div className="ap-section-title">
            <Star size={18} />
            <h2>Subscription plans</h2>
          </div>
          <p className="ap-section-sub">These plans are displayed on the user subscription page</p>
        </div>

        <div className="ap-plans-grid">
          {plans.map(plan => (
            <PlanCard
              key={plan.id}
              plan={plan}
              onEdit={openEdit}
              onDelete={handleDelete}
              onToggle={handleToggle}
            />
          ))}

          {/* Add new card */}
          <button className="ap-add-card" onClick={openNew}>
            <Plus size={28} />
            <span>Add new plan</span>
          </button>
        </div>
      </div>

      {/* ── Mining tiers table ── */}
      <MiningTiersTable plans={plans} />

      {/* ── Editor modal ── */}
      {showEditor && (
        <PlanEditor
          plan={editTarget}
          onSave={handleSave}
          onClose={closeEditor}
        />
      )}
    </div>
  );
}