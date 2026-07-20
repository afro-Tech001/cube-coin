import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "../../../libs/supabase";

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmtDate(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-NG", {
    day: "2-digit", month: "short", year: "numeric",
  });
}

function fmtNaira(n) {
  return "₦" + Number(n || 0).toLocaleString("en-NG");
}

const PLAN_COLORS = {
  Basic:   { color:"#86efac", bg:"rgba(134,239,172,.12)", bd:"rgba(134,239,172,.3)"  },
  Starter: { color:"#4ade80", bg:"rgba(74,222,128,.12)",  bd:"rgba(74,222,128,.3)"   },
  Bronze:  { color:"#fb923c", bg:"rgba(251,146,60,.12)",  bd:"rgba(251,146,60,.3)"   },
  Silver:  { color:"#94a3b8", bg:"rgba(148,163,184,.12)", bd:"rgba(148,163,184,.3)"  },
  Gold:    { color:"#fbbf24", bg:"rgba(251,191,36,.12)",  bd:"rgba(251,191,36,.3)"   },
  Diamond: { color:"#60a5fa", bg:"rgba(96,165,250,.12)",  bd:"rgba(96,165,250,.3)"   },
};

const PLAN_ICONS = {
  Basic:"🟢", Starter:"⬡", Bronze:"🥉",
  Silver:"🥈", Gold:"🥇", Diamond:"💎",
};

const STATUS_META = {
  approved: { color:"#4ade80", bg:"rgba(74,222,128,.1)",   bd:"rgba(74,222,128,.25)",   label:"Approved"     },
  pending:  { color:"#fbbf24", bg:"rgba(251,191,36,.1)",   bd:"rgba(251,191,36,.25)",   label:"Pending"      },
  rejected: { color:"#f87171", bg:"rgba(248,113,113,.1)",  bd:"rgba(248,113,113,.25)",  label:"Rejected"     },
  none:     { color:"rgba(255,255,255,.35)", bg:"rgba(255,255,255,.05)", bd:"rgba(255,255,255,.1)", label:"No plan" },
};

function Badge({ text, color, bg, bd }) {
  return (
    <span style={{
      background: bg, border:`1px solid ${bd}`, color,
      fontSize: 10, fontWeight: 700, padding:"3px 10px",
      borderRadius: 100, letterSpacing:".06em",
      textTransform:"uppercase", whiteSpace:"nowrap",
    }}>{text}</span>
  );
}

function PlanBadge({ planName }) {
  if (!planName) return <Badge text="No plan" {...STATUS_META.none} />;
  const meta = PLAN_COLORS[planName] || PLAN_COLORS.Basic;
  return (
    <span style={{
      background: meta.bg, border:`1px solid ${meta.bd}`, color: meta.color,
      fontSize: 10, fontWeight: 700, padding:"3px 10px",
      borderRadius: 100, letterSpacing:".06em",
      textTransform:"uppercase", whiteSpace:"nowrap",
      display:"inline-flex", alignItems:"center", gap:4,
    }}>
      {PLAN_ICONS[planName] || "⬡"} {planName}
    </span>
  );
}

// ── Detail sheet ──────────────────────────────────────────────────────────────
function DetailSheet({ user, onClose }) {
  if (!user) return null;

  const sub    = user.subscription;
  const subMeta = STATUS_META[sub?.payment_status || "none"];

  const rows = [
    ["User ID",           user.id],
    ["Full Name",         user.full_name || "—"],
    ["Email",             user.email || "—"],
    ["Phone",             user.phone || "—"],
    ["Country",           user.country || "—"],
    ["Joined",            fmtDate(user.created_at)],
    ["Referral Code",     user.referral_code || "—"],
    ["Referred By",       user.referred_by_code || "—"],
    ["Streak",            user.streak ? `${user.streak} days` : "—"],
    ["CUBE Balance",      Number(user.cube_balance || 0).toLocaleString() + " CUBE"],
    ["Total Mined",       Number(user.total_mined  || 0).toLocaleString() + " CUBE"],
  ];

  const subRows = sub ? [
    ["Plan",              sub.plan_name || "—"],
    ["Status",            sub.payment_status || "—"],
    ["Mining Rate",       sub.mining_rate ? `${sub.mining_rate} CUBE/hr` : "—"],
    ["Plan Amount",       sub.amount ? fmtNaira(sub.amount) : "—"],
    ["Activated At",      fmtDate(sub.activated_at)],
    ["Subscription CUBE", sub.subscription_cubes ? Number(sub.subscription_cubes).toLocaleString() : "—"],
  ] : [];

  return (
    <div style={{
      position:"fixed", inset:0, background:"rgba(0,0,0,.75)",
      display:"flex", alignItems:"flex-end", justifyContent:"center",
      zIndex:999, fontFamily:"'DM Sans',sans-serif",
    }} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{
        background:"#0a1c0e", border:"1px solid rgba(74,222,128,.22)",
        borderRadius:"24px 24px 0 0", padding:"24px 22px 40px",
        width:"100%", maxWidth:520, maxHeight:"92vh", overflowY:"auto",
        animation:"sheetUp .28s cubic-bezier(.34,1.56,.64,1)",
      }}>
        <style>{`@keyframes sheetUp{from{transform:translateY(60px);opacity:0}to{transform:translateY(0);opacity:1}}`}</style>

        {/* Handle */}
        <div style={{ width:36, height:4, borderRadius:2, background:"rgba(255,255,255,.12)", margin:"0 auto 20px" }} />

        {/* Header */}
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:22 }}>
          <div style={{ display:"flex", alignItems:"center", gap:12 }}>
              <Avatar user={user} size={48} fontSize={20} />
            <div>
              <div style={{ fontSize:"1.1rem", fontWeight:800, color:"#fff" }}>
                {user.full_name || "Unknown"}
              </div>
              <div style={{ fontSize:12, color:"rgba(255,255,255,.4)", marginTop:3 }}>{user.email}</div>
            </div>
          </div>
          <button onClick={onClose} style={{
            background:"rgba(255,255,255,.07)", border:"none", color:"rgba(255,255,255,.5)",
            width:30, height:30, borderRadius:"50%", fontSize:18, cursor:"pointer",
            display:"flex", alignItems:"center", justifyContent:"center",
          }}>×</button>
        </div>

        {/* Profile info */}
        <div style={{ fontSize:11, color:"rgba(255,255,255,.4)", fontWeight:700, textTransform:"uppercase", letterSpacing:".08em", marginBottom:10 }}>
          Profile
        </div>
        <div style={{
          background:"rgba(74,222,128,.04)", border:"1px solid rgba(74,222,128,.12)",
          borderRadius:14, padding:"12px 16px", marginBottom:18,
          display:"flex", flexDirection:"column", gap:9,
        }}>
          {rows.map(([l, v]) => (
            <div key={l} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", gap:10 }}>
              <span style={{ fontSize:11, color:"rgba(255,255,255,.4)", flexShrink:0 }}>{l}</span>
              <span style={{
                fontSize:12, fontWeight:600, color:
                  l === "CUBE Balance" || l === "Total Mined" ? "#4ade80" : "#fff",
                textAlign:"right", wordBreak:"break-all", maxWidth:"65%",
              }}>{v}</span>
            </div>
          ))}
        </div>

        {/* Subscription info */}
        <div style={{ fontSize:11, color:"rgba(255,255,255,.4)", fontWeight:700, textTransform:"uppercase", letterSpacing:".08em", marginBottom:10 }}>
          Subscription
        </div>

        {sub ? (
          <div style={{
            background: sub.payment_status === "approved"
              ? "rgba(74,222,128,.05)"
              : "rgba(251,191,36,.05)",
            border:`1px solid ${sub.payment_status === "approved"
              ? "rgba(74,222,128,.2)"
              : "rgba(251,191,36,.18)"}`,
            borderRadius:14, padding:"12px 16px",
            display:"flex", flexDirection:"column", gap:9,
          }}>
            {/* Plan header */}
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", paddingBottom:8, borderBottom:"1px solid rgba(255,255,255,.06)" }}>
              <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                <span style={{ fontSize:"1.4rem" }}>{PLAN_ICONS[sub.plan_name] || "⬡"}</span>
                <span style={{ fontSize:"1rem", fontWeight:800, color:"#fff" }}>{sub.plan_name}</span>
              </div>
              <Badge
                text={subMeta.label}
                color={subMeta.color}
                bg={subMeta.bg}
                bd={subMeta.bd}
              />
            </div>

            {subRows.map(([l, v]) => l !== "Plan" && (
              <div key={l} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", gap:10 }}>
                <span style={{ fontSize:11, color:"rgba(255,255,255,.4)", flexShrink:0 }}>{l}</span>
                <span style={{
                  fontSize:12, fontWeight:600,
                  color: l === "Mining Rate" || l === "Subscription CUBE" || l === "Plan Amount" ? "#4ade80" : "#fff",
                  textAlign:"right",
                }}>{v}</span>
              </div>
            ))}
          </div>
        ) : (
          <div style={{
            background:"rgba(255,255,255,.03)", border:"1px solid rgba(255,255,255,.08)",
            borderRadius:14, padding:"20px 16px", textAlign:"center",
          }}>
            <div style={{ fontSize:"1.5rem", marginBottom:8 }}>📭</div>
            <div style={{ fontSize:13, color:"rgba(255,255,255,.35)" }}>No active subscription</div>
          </div>
        )}
      </div>
    </div>
  );
}

function Avatar({ user, size = 40, fontSize = 15 }) {
  const [imgErr, setImgErr] = useState(false);
  const initial = (user.full_name || user.email || "?").charAt(0).toUpperCase();

  // Try avatar_url first, then dicebear fallback
  const seed      = encodeURIComponent(user.full_name || user.email || user.id || "user");
  const dicebear  = `https://api.dicebear.com/7.x/bottts/svg?seed=${seed}`;
  const imgSrc    = (!imgErr && user.avatar_url) ? user.avatar_url : dicebear;

  return (
    <div style={{
      width: size, height: size, borderRadius:"50%", flexShrink:0,
      background:"rgba(74,222,128,.1)", border:"1px solid rgba(74,222,128,.22)",
      overflow:"hidden", display:"flex", alignItems:"center", justifyContent:"center",
    }}>
      {user.avatar_url || true ? (
        <img
          src={imgSrc}
          alt={user.full_name || "user"}
          onError={() => setImgErr(true)}
          style={{ width:"100%", height:"100%", objectFit:"cover", display:"block" }}
        />
      ) : (
        <span style={{ fontSize, fontWeight:800, color:"#4ade80" }}>{initial}</span>
      )}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function AdminUserManagement() {
  const [users,    setUsers]    = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [search,   setSearch]   = useState("");
  const [filter,   setFilter]   = useState("all");
  const [selected, setSelected] = useState(null);
  const [errMsg,   setErrMsg]   = useState(null);

  // ── Stats ─────────────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const total    = users.length;
    const approved = users.filter(u => u.subscription?.payment_status === "approved").length;
    const pending  = users.filter(u => u.subscription?.payment_status === "pending").length;
    const noplan   = users.filter(u => !u.subscription).length;
    const plans    = {};
    users.forEach(u => {
      if (u.subscription?.plan_name && u.subscription?.payment_status === "approved") {
        plans[u.subscription.plan_name] = (plans[u.subscription.plan_name] || 0) + 1;
      }
    });
    return { total, approved, pending, noplan, plans };
  }, [users]);

  // ── Fetch users + subscriptions ───────────────────────────────────────────
  const fetchData = useCallback(async () => {
    setLoading(true);
    setErrMsg(null);

    // Step 1: fetch all profiles
    const { data: profiles, error: profErr } = await supabase
  .from("profiles")
  .select(`
    id, full_name, email, phone, country,
    referral_code, referred_by_code,
    cube_balance, total_mined, streak,
    subscription_status, plan_name,
    avatar_url,
    created_at, profile_completed
  `)
  .order("created_at", { ascending: false });

    if (profErr) {
      console.error("Profiles fetch error:", profErr);
      setErrMsg(profErr.message);
      setLoading(false);
      return;
    }

    const profileRows = profiles || [];

    // Step 2: fetch latest approved subscription per user
    const userIds = profileRows.map(p => p.id);

    let subMap = {};
    if (userIds.length > 0) {
      const { data: subs, error: subErr } = await supabase
        .from("subscriptions")
        .select(`
          user_id, plan_name, payment_status, plan_status,
          mining_rate, amount, subscription_cubes,
          activated_at, created_at
        `)
        .in("user_id", userIds)
        .order("created_at", { ascending: false });

      if (subErr) {
        console.error("Subscriptions fetch error:", subErr);
      } else {
        // Keep only the most recent subscription per user
        // Prioritise approved > pending > others
        (subs || []).forEach(s => {
          const existing = subMap[s.user_id];
          if (!existing) {
            subMap[s.user_id] = s;
          } else {
            // Prefer approved over others
            if (s.payment_status === "approved" && existing.payment_status !== "approved") {
              subMap[s.user_id] = s;
            }
          }
        });
      }
    }

    // Step 3: merge
    const merged = profileRows.map(p => ({
      ...p,
      subscription: subMap[p.id] || null,
    }));

    setUsers(merged);
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ── Filter + search ───────────────────────────────────────────────────────
  const visible = useMemo(() => {
    return users.filter(u => {
      const sub = u.subscription;

      const matchFilter =
        filter === "all"      ? true :
        filter === "approved" ? sub?.payment_status === "approved" :
        filter === "pending"  ? sub?.payment_status === "pending"  :
        filter === "noplan"   ? !sub : true;

      const q = search.toLowerCase().trim();
      const matchSearch = !q ||
        (u.full_name || "").toLowerCase().includes(q) ||
        (u.email     || "").toLowerCase().includes(q) ||
        (u.phone     || "").toLowerCase().includes(q) ||
        (sub?.plan_name || "").toLowerCase().includes(q) ||
        (u.referral_code || "").toLowerCase().includes(q);

      return matchFilter && matchSearch;
    });
  }, [users, filter, search]);

  const T = {
    bg:      "#050b07",
    surface: "rgba(10,28,14,.9)",
    border:  "rgba(74,222,128,.12)",
    green:   "#4ade80",
    white:   "#fff",
    muted:   "rgba(255,255,255,.45)",
    font:    "'DM Sans', sans-serif",
  };

  const TABS = [
    { key:"all",      label:"All users",   count: stats.total    },
    { key:"approved", label:"Subscribed",  count: stats.approved },
    { key:"pending",  label:"Pending",     count: stats.pending  },
    { key:"noplan",   label:"No plan",     count: stats.noplan   },
  ];

  if (loading) return (
    <div style={{ minHeight:"100vh", background:T.bg, display:"flex", alignItems:"center", justifyContent:"center", fontFamily:T.font }}>
      <div style={{ textAlign:"center", color:T.muted }}>
        <div style={{ fontSize:"2rem", marginBottom:12 }}>👥</div>
        Loading users…
      </div>
    </div>
  );

  return (
    <div style={{ minHeight:"100vh", background:T.bg, fontFamily:T.font, paddingBottom:80 }}>

      {/* ── Header ── */}
      <div style={{ padding:"24px 24px 0", borderBottom:`1px solid rgba(74,222,128,.08)`, marginBottom:0 }}>
        <div style={{ fontSize:11, color:T.muted, fontWeight:600, textTransform:"uppercase", letterSpacing:".1em", marginBottom:6 }}>
          Admin panel
        </div>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:20, flexWrap:"wrap", gap:12 }}>
          <div>
            <h1 style={{ fontSize:"1.6rem", fontWeight:800, color:T.white, margin:"0 0 4px" }}>
              👥 User Management
            </h1>
            <p style={{ color:T.muted, fontSize:".85rem", margin:0 }}>
              {stats.total} users · {stats.approved} subscribed · {stats.pending} pending
            </p>
          </div>
          <button onClick={fetchData} style={{
            padding:"9px 16px", borderRadius:10,
            border:`1px solid rgba(74,222,128,.2)`,
            background:"rgba(74,222,128,.06)", color:T.green,
            fontWeight:700, fontSize:13, cursor:"pointer", fontFamily:T.font,
          }}>↻ Refresh</button>
        </div>
      </div>

      <div style={{ padding:"20px 24px" }}>

        {errMsg && (
          <div style={{
            background:"rgba(248,113,113,.08)", border:"1px solid rgba(248,113,113,.25)",
            color:"#f87171", padding:"12px 16px", borderRadius:12,
            fontSize:13, marginBottom:20,
          }}>
            ⚠ {errMsg}
          </div>
        )}

        {/* ── Stats ── */}
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(130px, 1fr))", gap:10, marginBottom:20 }}>
          {[
            { label:"Total users",   value:stats.total,    color:T.white  },
            { label:"Subscribed",    value:stats.approved, color:T.green  },
            { label:"Pending",       value:stats.pending,  color:"#fbbf24"},
            { label:"No plan",       value:stats.noplan,   color:T.muted  },
          ].map(s => (
            <div key={s.label} style={{
              background:T.surface, border:`1px solid ${T.border}`,
              borderRadius:14, padding:"14px 16px",
            }}>
              <div style={{ fontSize:10, color:T.muted, fontWeight:700, textTransform:"uppercase", letterSpacing:".08em", marginBottom:6 }}>
                {s.label}
              </div>
              <div style={{ fontSize:"1.5rem", fontWeight:800, color:s.color }}>{s.value}</div>
            </div>
          ))}
        </div>

        {/* ── Plan breakdown ── */}
        {Object.keys(stats.plans).length > 0 && (
          <div style={{
            background:T.surface, border:`1px solid ${T.border}`,
            borderRadius:14, padding:"14px 16px", marginBottom:20,
          }}>
            <div style={{ fontSize:11, color:T.muted, fontWeight:700, textTransform:"uppercase", letterSpacing:".08em", marginBottom:12 }}>
              Subscribers by plan
            </div>
            <div style={{ display:"flex", flexWrap:"wrap", gap:8 }}>
              {Object.entries(stats.plans).sort((a,b) => b[1]-a[1]).map(([plan, count]) => {
                const meta = PLAN_COLORS[plan] || PLAN_COLORS.Basic;
                return (
                  <div key={plan} style={{
                    background:meta.bg, border:`1px solid ${meta.bd}`,
                    borderRadius:10, padding:"6px 14px",
                    display:"flex", alignItems:"center", gap:6,
                  }}>
                    <span>{PLAN_ICONS[plan] || "⬡"}</span>
                    <span style={{ color:meta.color, fontWeight:700, fontSize:12 }}>{plan}</span>
                    <span style={{
                      background:meta.color, color:"#041107",
                      fontSize:10, fontWeight:800,
                      padding:"1px 6px", borderRadius:100,
                    }}>{count}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Search ── */}
        <div style={{ position:"relative", marginBottom:14 }}>
          <span style={{ position:"absolute", left:12, top:"50%", transform:"translateY(-50%)", color:T.muted, fontSize:14 }}>🔍</span>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by name, email, phone, plan, referral code…"
            style={{
              width:"100%", padding:"10px 12px 10px 36px",
              background:T.surface, border:`1px solid ${T.border}`,
              borderRadius:10, color:T.white, fontSize:13,
              fontFamily:T.font, outline:"none", boxSizing:"border-box",
              transition:"border-color .15s",
            }}
            onFocus={e  => e.target.style.borderColor = "rgba(74,222,128,.35)"}
            onBlur={e   => e.target.style.borderColor = "rgba(74,222,128,.12)"}
          />
        </div>

        {/* ── Filter tabs ── */}
        <div style={{ display:"flex", gap:6, marginBottom:18, flexWrap:"wrap", borderBottom:`1px solid rgba(74,222,128,.08)`, paddingBottom:0 }}>
          {TABS.map(t => (
            <button key={t.key} onClick={() => setFilter(t.key)} style={{
              padding:"9px 16px", border:"none", borderBottom:"2px solid",
              borderBottomColor: filter === t.key ? T.green : "transparent",
              background:"transparent",
              color: filter === t.key ? T.green : T.muted,
              fontWeight:700, fontSize:12, cursor:"pointer",
              fontFamily:T.font, marginBottom:-1,
              display:"flex", alignItems:"center", gap:6, transition:".15s",
            }}>
              {t.label}
              <span style={{
                background: filter === t.key ? "rgba(74,222,128,.15)" : "rgba(255,255,255,.07)",
                color:       filter === t.key ? T.green : T.muted,
                fontSize:10, fontWeight:800, padding:"1px 7px", borderRadius:100,
              }}>{t.count}</span>
            </button>
          ))}
        </div>

        {/* ── User list ── */}
        {visible.length === 0 ? (
          <div style={{ textAlign:"center", padding:"70px 0", color:T.muted }}>
            <div style={{ fontSize:"2rem", marginBottom:10 }}>📭</div>
            <div>No users found</div>
          </div>
        ) : (
          <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
            {visible.map(u => {
              const sub     = u.subscription;
              const subMeta = STATUS_META[sub?.payment_status || "none"];

              return (
                <div
                  key={u.id}
                  onClick={() => setSelected(u)}
                  style={{
                    background: T.surface,
                    border:`1px solid ${sub?.payment_status === "approved"
                      ? "rgba(74,222,128,.15)"
                      : sub?.payment_status === "pending"
                      ? "rgba(251,191,36,.15)"
                      : T.border}`,
                    borderRadius:16, padding:"14px 18px",
                    cursor:"pointer", transition:"border-color .15s, transform .15s",
                    display:"flex", alignItems:"center", gap:14, flexWrap:"wrap",
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor="rgba(74,222,128,.3)"; e.currentTarget.style.transform="translateX(2px)"; }}
                  onMouseLeave={e => {
                    e.currentTarget.style.borderColor = sub?.payment_status === "approved"
                      ? "rgba(74,222,128,.15)"
                      : sub?.payment_status === "pending"
                      ? "rgba(251,191,36,.15)"
                      : T.border;
                    e.currentTarget.style.transform = "translateX(0)";
                  }}
                >
                  {/* Avatar */}
                  {/* Avatar */}
<Avatar user={u} size={40} fontSize={15} />

                  {/* User info */}
                  <div style={{ flex:1.5, minWidth:150 }}>
                    <div style={{ fontWeight:700, fontSize:14, color:T.white, marginBottom:3 }}>
                      {u.full_name || "—"}
                    </div>
                    <div style={{ fontSize:11, color:T.muted }}>
                      {u.email || u.id?.slice(0,16)+"…"}
                    </div>
                  </div>

                  {/* Plan */}
                  <div style={{ flex:1, minWidth:100 }}>
                    {sub ? (
                      <div style={{ display:"flex", flexDirection:"column", gap:5 }}>
                        <PlanBadge planName={sub.plan_name} />
                        <Badge
                          text={subMeta.label}
                          color={subMeta.color}
                          bg={subMeta.bg}
                          bd={subMeta.bd}
                        />
                      </div>
                    ) : (
                      <Badge text="No plan" {...STATUS_META.none} />
                    )}
                  </div>

                  {/* Mining rate */}
                  <div style={{ minWidth:90, textAlign:"right" }}>
                    {sub?.mining_rate ? (
                      <>
                        <div style={{ fontWeight:700, fontSize:13, color:T.green }}>
                          {Number(sub.mining_rate).toLocaleString()}
                        </div>
                        <div style={{ fontSize:10, color:T.muted }}>CUBE/hr</div>
                      </>
                    ) : (
                      <span style={{ fontSize:11, color:T.muted }}>—</span>
                    )}
                  </div>

                  {/* Balance */}
                  <div style={{ minWidth:90, textAlign:"right" }}>
                    <div style={{ fontWeight:700, fontSize:13, color:T.white }}>
                      {Number(u.cube_balance || 0).toLocaleString()}
                    </div>
                    <div style={{ fontSize:10, color:T.muted }}>CUBE</div>
                  </div>

                  {/* Joined */}
                  <div style={{ fontSize:11, color:T.muted, minWidth:70, textAlign:"right" }}>
                    {fmtDate(u.created_at)}
                  </div>

                  {/* View button */}
                  <button
                    onClick={e => { e.stopPropagation(); setSelected(u); }}
                    style={{
                      padding:"7px 14px", borderRadius:10,
                      border:`1px solid rgba(74,222,128,.2)`,
                      background:"rgba(74,222,128,.06)", color:T.green,
                      fontSize:11, fontWeight:700, cursor:"pointer",
                      fontFamily:T.font, flexShrink:0,
                    }}
                  >
                    View
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Detail sheet */}
      <DetailSheet user={selected} onClose={() => setSelected(null)} />
    </div>
  );
}