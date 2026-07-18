import { useState, useEffect } from "react";
import { supabase } from "../../../libs/supabase";
import "./AdminMiningSessions.css";

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmtDate(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-NG", {
    month: "short", day: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function fmtDuration(startedAt, endsAt) {
  if (!startedAt || !endsAt) return "—";
  const totalMs   = new Date(endsAt) - new Date(startedAt);
  const totalMins = Math.round(totalMs / 60000);
  if (totalMins >= 60) return `${Math.floor(totalMins / 60)}h ${totalMins % 60}m`;
  return `${totalMins}min`;
}

function fmtEarned(n) {
  if (!n && n !== 0) return "0";
  const num = Number(n);
  if (num >= 1000) {
    return num.toLocaleString(undefined, { maximumFractionDigits: 0 });
  }
  return num.toFixed(2);
}

function getStatus(session) {
  if (session.claimed)    return "Completed";
  if (session.is_paused)  return "Paused";
  if (session.is_mining)  return "Active";
  return "Stopped";
}

function calcLiveEarned(session) {
  if (session.claimed)   return session.mined_amount || 0;
  if (!session.started_at) return 0;
  const elapsedMs  = Date.now() - new Date(session.started_at).getTime();
  const pausedMs   = (session.total_paused_secs || 0) * 1000;
  const activeMs   = Math.max(0, elapsedMs - pausedMs);
  return (activeMs / 3600000) * Number(session.mining_rate);
}

// ── Detail sheet ──────────────────────────────────────────────────────────────
const T = {
  bg:       "#050b07",
  surface:  "rgba(10,28,14,.9)",
  border:   "rgba(127,255,110,.15)",
  green:    "#4ade80",
  greenDim: "rgba(74,222,128,.06)",
  greenBd:  "rgba(74,222,128,.2)",
  white:    "#fff",
  muted:    "rgba(255,255,255,.45)",
  font:     "'DM Sans', sans-serif",
};

function DetailSheet({ session, onClose }) {
  if (!session) return null;
  const status  = getStatus(session);
  const earned  = calcLiveEarned(session);

  const rows = [
    ["Session ID",   session.id],
    ["User ID",      session.user_id],
    ["Miner",        session.minerName || "—"],
    ["Plan",         session.plan_name || "—"],
    ["Mining Rate",  `${session.mining_rate} CUBE/hr`],
    ["Started At",   fmtDate(session.started_at)],
    ["Ends At",      fmtDate(session.ends_at)],
    ["Duration",     fmtDuration(session.started_at, session.ends_at)],
    ["Earned",       `${fmtEarned(earned)} CUBE`],
    ["Claimed",      session.claimed ? "Yes" : "No"],
    ["Is Paused",    session.is_paused ? "Yes" : "No"],
    ["Status",       status],
  ];

  const statusColor = {
    Active: T.green, Completed: "#a78bfa",
    Paused: "#fbbf24", Stopped: T.muted,
  }[status] || T.muted;

  return (
    <div
      style={{
        position:"fixed", inset:0, background:"rgba(0,0,0,.75)",
        display:"flex", alignItems:"flex-end", justifyContent:"center", zIndex:999,
      }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div style={{
        background:"#0a1c0e", border:`1px solid ${T.border}`,
        borderRadius:"24px 24px 0 0", padding:"1.5rem",
        width:"100%", maxWidth:480, maxHeight:"90vh", overflowY:"auto",
        animation:"sheetUp .28s cubic-bezier(.34,1.56,.64,1)",
        fontFamily: T.font,
      }}>
        <style>{`@keyframes sheetUp{from{transform:translateY(60px);opacity:0}to{transform:translateY(0);opacity:1}}`}</style>

        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:20 }}>
          <div>
            <div style={{ fontSize:11, color:T.muted, fontWeight:600, textTransform:"uppercase", letterSpacing:".1em", marginBottom:4 }}>
              Mining session
            </div>
            <div style={{ fontSize:"1.3rem", fontWeight:800, color:T.white, display:"flex", alignItems:"center", gap:10 }}>
              {session.minerName || "Unknown"}
              <span style={{
                background:`${statusColor}18`, border:`1px solid ${statusColor}40`,
                color:statusColor, fontSize:10, fontWeight:700,
                padding:"3px 10px", borderRadius:100, letterSpacing:".06em", textTransform:"uppercase",
              }}>{status}</span>
            </div>
          </div>
          <button onClick={onClose} style={{
            background:"rgba(255,255,255,.07)", border:"none", color:T.muted,
            width:30, height:30, borderRadius:"50%", fontSize:18, cursor:"pointer",
            display:"flex", alignItems:"center", justifyContent:"center",
          }}>×</button>
        </div>

        <div style={{
          background:T.greenDim, border:`1px solid ${T.greenBd}`,
          borderRadius:14, padding:"1rem 1.1rem",
          display:"flex", flexDirection:"column", gap:10,
        }}>
          {rows.map(([l, v]) => (
            <div key={l} style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
              <span style={{ fontSize:11, color:T.muted }}>{l}</span>
              <span style={{
                fontSize:13, fontWeight:600,
                color: l==="Earned" || l==="Mining Rate" ? T.green : T.white,
                wordBreak:"break-all", textAlign:"right", maxWidth:"60%",
              }}>
                {String(v)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function AdminMiningSessions() {
  const [sessions,  setSessions]  = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [search,    setSearch]    = useState("");
  const [filter,    setFilter]    = useState("all");
  const [selected,  setSelected]  = useState(null);
  const [errMsg,    setErrMsg]    = useState(null);

  const total       = sessions.length;
  const active      = sessions.filter(s => s.is_mining && !s.is_paused && !s.claimed).length;
  const paused      = sessions.filter(s => s.is_paused && !s.claimed).length;
  const completed   = sessions.filter(s => s.claimed).length;
  const totalCube   = sessions.reduce((a, s) => a + calcLiveEarned(s), 0);

  const fetchSessions = async () => {
    setLoading(true);
    setErrMsg(null);

    // ── Step 1: fetch sessions WITHOUT the join (this always works) ──────────
    const { data: sessionData, error: sessionErr } = await supabase
      .from("mining_sessions")
      .select("*")
      .order("created_at", { ascending: false });

    console.log("Mining sessions raw fetch:", sessionData, sessionErr);

    if (sessionErr) {
      console.error("Fetch error:", sessionErr);
      setErrMsg(sessionErr.message);
      setLoading(false);
      return;
    }

    if (!sessionData || sessionData.length === 0) {
      console.warn("No mining_sessions rows returned. Check RLS policies and table contents.");
      setSessions([]);
      setLoading(false);
      return;
    }

    // ── Step 2: fetch matching profiles separately ────────────────────────────
    const userIds = [...new Set(sessionData.map(s => s.user_id).filter(Boolean))];

    let profilesMap = {};
    if (userIds.length > 0) {
      const { data: profilesData, error: profilesErr } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .in("id", userIds);

      console.log("Profiles fetch:", profilesData, profilesErr);

      if (profilesErr) {
        console.error("Profiles fetch error:", profilesErr);
      } else {
        profilesMap = Object.fromEntries((profilesData || []).map(p => [p.id, p]));
      }
    }

    // ── Step 3: merge ──────────────────────────────────────────────────────────
    const merged = sessionData.map(s => ({
      ...s,
      minerName: profilesMap[s.user_id]?.full_name
        || profilesMap[s.user_id]?.email
        || "Unknown",
    }));

    setSessions(merged);
    setLoading(false);
  };

  useEffect(() => { fetchSessions(); }, []);

  const visible = sessions.filter(s => {
    const status = getStatus(s).toLowerCase();
    const matchFilter =
      filter === "all"       ? true :
      filter === "active"    ? status === "active" :
      filter === "paused"    ? status === "paused" :
      filter === "completed" ? status === "completed" :
      filter === "stopped"   ? status === "stopped" : true;

    const q = search.toLowerCase();
    const matchSearch = !q ||
      (s.minerName || "").toLowerCase().includes(q) ||
      (s.plan_name || "").toLowerCase().includes(q) ||
      (s.user_id || "").toLowerCase().includes(q);

    return matchFilter && matchSearch;
  });

  const STATUS_COLOR = {
    active:    { bg:"rgba(74,222,128,.12)",   bd:"rgba(74,222,128,.3)",   color:"#4ade80"  },
    paused:    { bg:"rgba(251,191,36,.12)",    bd:"rgba(251,191,36,.3)",   color:"#fbbf24"  },
    completed: { bg:"rgba(167,139,250,.12)",   bd:"rgba(167,139,250,.3)",  color:"#a78bfa"  },
    stopped:   { bg:"rgba(255,255,255,.07)",   bd:"rgba(255,255,255,.12)", color:"rgba(255,255,255,.45)" },
  };

  const FILTER_TABS = [
    { key:"all",       label:"All",       count: total },
    { key:"active",    label:"Active",    count: active },
    { key:"paused",    label:"Paused",    count: paused },
    { key:"completed", label:"Completed", count: completed },
    { key:"stopped",   label:"Stopped",   count: sessions.filter(s => getStatus(s) === "Stopped").length },
  ];

  return (
    <div className="admin-mining">

      <div className="mining-header">
        <h1>Mining Sessions</h1>
        <p>Monitor all active and historical mining activity</p>
      </div>

      {errMsg && (
        <div style={{
          background: "rgba(239,68,68,.08)", border: "1px solid rgba(239,68,68,.25)",
          color: "#f87171", padding: "12px 16px", borderRadius: 12,
          fontSize: 13, marginBottom: 20, fontFamily: "'DM Sans', sans-serif",
        }}>
          ⚠ Failed to load sessions: {errMsg}
        </div>
      )}

      <div className="mining-stats">
        <div className="mining-stat-card">
          <h2>{active}</h2>
          <p>Active Miners</p>
        </div>
        <div className="mining-stat-card">
          <h2>{total}</h2>
          <p>Total Sessions</p>
        </div>
        <div className="mining-stat-card">
          <h2>{totalCube >= 1000 ? (totalCube / 1000).toFixed(1) + "K" : totalCube.toFixed(0)}</h2>
          <p>CUBE Generated</p>
        </div>
        <div className="mining-stat-card">
          <h2>{completed}</h2>
          <p>Completed</p>
        </div>
      </div>

      <div style={{ display:"flex", gap:10, flexWrap:"wrap", alignItems:"center", marginBottom:16 }}>
        <div className="search-box" style={{ flex:1, margin:0 }}>
          <input
            type="text"
            placeholder="Search by name, plan, user ID…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <button
          onClick={fetchSessions}
          style={{
            padding:"10px 16px", borderRadius:10,
            background:"rgba(74,222,128,.06)", border:"1px solid rgba(74,222,128,.2)",
            color:"#4ade80", fontWeight:700, fontSize:13, cursor:"pointer",
            fontFamily:"'DM Sans', sans-serif",
          }}
        >
          ↻ Refresh
        </button>
      </div>

      <div style={{ display:"flex", gap:6, marginBottom:20, flexWrap:"wrap" }}>
        {FILTER_TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setFilter(t.key)}
            style={{
              padding:"7px 14px", borderRadius:10, border:"1px solid",
              borderColor: filter===t.key ? "#4ade80" : "rgba(127,255,110,.15)",
              background:  filter===t.key ? "rgba(74,222,128,.06)" : "transparent",
              color:       filter===t.key ? "#4ade80" : "rgba(255,255,255,.45)",
              fontWeight:700, fontSize:12, cursor:"pointer",
              fontFamily:"'DM Sans', sans-serif",
              display:"flex", alignItems:"center", gap:6,
            }}
          >
            {t.label}
            <span style={{
              background: filter===t.key ? "#4ade80" : "rgba(127,255,110,.15)",
              color:       filter===t.key ? "#041107" : "rgba(255,255,255,.45)",
              fontSize:10, fontWeight:800, padding:"1px 6px", borderRadius:100,
            }}>{t.count}</span>
          </button>
        ))}
      </div>

      <div className="mining-table-card">
        {loading ? (
          <div style={{ textAlign:"center", padding:"60px 0", color:"rgba(255,255,255,.4)" }}>
            <div style={{ fontSize:"2rem", marginBottom:10 }}>⛏</div>
            Loading sessions…
          </div>
        ) : visible.length === 0 ? (
          <div style={{ textAlign:"center", padding:"60px 0", color:"rgba(255,255,255,.4)" }}>
            <div style={{ fontSize:"2rem", marginBottom:10 }}>📭</div>
            No sessions found
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Miner</th>
                <th>Plan</th>
                <th>Started</th>
                <th>Duration</th>
                <th>Earned</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((s) => {
                const status   = getStatus(s);
                const sc       = STATUS_COLOR[status.toLowerCase()];
                const earned   = calcLiveEarned(s);

                return (
                  <tr key={s.id}>
                    <td>
                      <div style={{ fontWeight:700, color:"#fff", fontSize:14 }}>
                        {s.minerName || "Unknown"}
                      </div>
                      <div style={{ fontSize:11, color:"rgba(255,255,255,.35)", marginTop:2 }}>
                        {(s.user_id || "").slice(0, 8)}…
                      </div>
                    </td>

                    <td>
                      <span style={{
                        background:"rgba(74,222,128,.08)", border:"1px solid rgba(74,222,128,.2)",
                        color:"#4ade80", fontSize:11, fontWeight:700,
                        padding:"2px 10px", borderRadius:8,
                      }}>
                        {s.plan_name || "—"}
                      </span>
                    </td>

                    <td style={{ color:"rgba(255,255,255,.6)", fontSize:13 }}>
                      {fmtDate(s.started_at)}
                    </td>

                    <td style={{ color:"rgba(255,255,255,.6)", fontSize:13 }}>
                      {fmtDuration(s.started_at, s.ends_at)}
                    </td>

                    <td>
                      <span style={{ color:"#4ade80", fontWeight:700, fontSize:13 }}>
                        {fmtEarned(earned)}
                      </span>
                      <span style={{ color:"rgba(255,255,255,.35)", fontSize:11 }}> CUBE</span>
                    </td>

                    <td>
                      <span style={{
                        background: sc.bg, border:`1px solid ${sc.bd}`,
                        color: sc.color, fontSize:10, fontWeight:700,
                        padding:"3px 10px", borderRadius:100,
                        textTransform:"uppercase", letterSpacing:".06em",
                        whiteSpace:"nowrap",
                      }}>
                        {status}
                      </span>
                    </td>

                    <td>
                      <button
                        className="view-session-btn"
                        onClick={() => setSelected(s)}
                      >
                        View
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      <DetailSheet
        session={selected}
        onClose={() => setSelected(null)}
      />
    </div>
  );
}