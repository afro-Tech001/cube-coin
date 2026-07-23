import "./DailyTasksPage.css";
import { useState, useEffect, useRef } from "react";
import { supabase } from "../../libs/supabase";
import { CheckCircle, Upload, Clock, AlertCircle, ExternalLink, RefreshCw } from "lucide-react";

// ── Constants ─────────────────────────────────────────────────────────────────
const CUBE_REWARD = 60000;
const WHATSAPP_TEXT  = encodeURIComponent(
  "🚀 I'm mining CUBE on CubeCoin and earning real Naira daily! " +
  "Join me and start earning — 100 CUBE = ₦5 💰\n\n" +
  "👉 Sign up: https://cube-coin.com"
);
const WHATSAPP_URL = `https://api.whatsapp.com/send?text=${WHATSAPP_TEXT}`;

// ── Helpers ───────────────────────────────────────────────────────────────────
function todayISO() {
  return new Date().toISOString().split("T")[0]; // "YYYY-MM-DD"
}
function fmtDate(iso) {
  return new Date(iso).toLocaleDateString("en-NG", {
    day: "2-digit", month: "short", year: "numeric",
  });
}

// ── Status display ────────────────────────────────────────────────────────────
function StatusBadge({ status }) {
  const map = {
    pending:  { label: "Under Review",  color: "#f59e0b", bg: "rgba(245,158,11,0.12)",  icon: <Clock size={12}/> },
    approved: { label: "Approved ✓",    color: "#4ade80", bg: "rgba(74,222,128,0.12)",  icon: <CheckCircle size={12}/> },
    rejected: { label: "Rejected",      color: "#f87171", bg: "rgba(248,113,113,0.12)", icon: <AlertCircle size={12}/> },
  };
  const s = map[status] || map.pending;
  return (
    <span className="dt-status-badge" style={{ color: s.color, background: s.bg, borderColor: `${s.color}40` }}>
      {s.icon} {s.label}
    </span>
  );
}

// ── Main ─────────────────────────────────────────────────────────────────────
export default function DailyTask() {
  const [userId,      setUserId]     = useState(null);
  const [todayTask,   setTodayTask]  = useState(null);   // today's submission row
  const [history,     setHistory]    = useState([]);      // past submissions
  const [screenshot,  setScreenshot] = useState(null);    // File object
  const [preview,     setPreview]    = useState(null);    // data URL preview
  const [uploading,   setUploading]  = useState(false);
  const [loading,     setLoading]    = useState(true);
  const [error,       setError]      = useState("");
  const [toast,       setToast]      = useState(null);
  const [step,        setStep]       = useState("share"); // share | upload | done
  const fileRef = useRef(null);
  const [sharedStatus,  setSharedStatus]  = useState(false);
const [sharedGroups,  setSharedGroups]  = useState(false);
const [sharedFriends, setSharedFriends] = useState(false);

const allSharesConfirmed = sharedStatus && sharedGroups && sharedFriends;

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  // ── Load user + today's task ─────────────────────────────────────────
  useEffect(() => {
    const init = async () => {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }
      setUserId(user.id);

      // Check if already submitted today
      const { data: todayRow } = await supabase
        .from("daily_tasks")
        .select("*")
        .eq("user_id", user.id)
        .eq("task_date", todayISO())
        .maybeSingle();

      setTodayTask(todayRow || null);
      if (todayRow) setStep("done");

      // Load history (last 14 days)
      const { data: hist } = await supabase
        .from("daily_tasks")
        .select("*")
        .eq("user_id", user.id)
        .order("task_date", { ascending: false })
        .limit(14);

      setHistory(hist || []);
      setLoading(false);
    };
    init();
  }, []);

  // ── Handle file pick ─────────────────────────────────────────────────
  const handleFilePick = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Please upload an image file (PNG, JPG, etc.)");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("File too large — max 5MB");
      return;
    }
    setError("");
    setScreenshot(file);
    const reader = new FileReader();
    reader.onload = (ev) => setPreview(ev.target.result);
    reader.readAsDataURL(file);
  };

  // ── Submit task ───────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!screenshot) { setError("Please upload your WhatsApp screenshot first"); return; }
    if (!userId)     { setError("Not logged in"); return; }
    setUploading(true); setError("");

    try {
      // 1. Upload screenshot to Supabase Storage
      const ext      = screenshot.name.split(".").pop();
      const filePath = `${userId}/${todayISO()}-${Date.now()}.${ext}`;

      const { error: upErr } = await supabase.storage
        .from("task-screenshots")
        .upload(filePath, screenshot, { upsert: true });

      if (upErr) throw new Error("Upload failed: " + upErr.message);

      const { data: urlData } = supabase.storage
        .from("task-screenshots")
        .getPublicUrl(filePath);

      // 2. Insert daily_task row
      const { data: inserted, error: dbErr } = await supabase
        .from("daily_tasks")
        .insert([{
          user_id:       userId,
          task_date:     todayISO(),
          task_type:     "whatsapp_share",
          screenshot_url: urlData.publicUrl,
          status:        "pending",
          cube_reward:   CUBE_REWARD,
        }])
        .select()
        .single();

      if (dbErr) throw new Error("Submission failed: " + dbErr.message);

      setTodayTask(inserted);
      setHistory(prev => [inserted, ...prev]);
      setStep("done");
      setSharedStatus(false);
      setSharedGroups(false);
      setSharedFriends(false);
      setScreenshot(null);
      setPreview(null);
      showToast(`Task submitted! ${CUBE_REWARD} CUBE will be credited after review ✓`);
    } catch (err) {
      console.error(err);
      setError(err.message || "Something went wrong");
    } finally {
      setUploading(false);
    }
  };

  // ── Approved cube balance update (re-check on load handled by admin) ──
  // When admin approves, a separate AdminDailyTasks panel credits the CUBE.

  if (loading) {
    return (
      <div className="dt-page">
        <div className="dt-loading"><RefreshCw size={20} className="dt-spin"/><span>Loading your task…</span></div>
      </div>
    );
  }

  return (
    <div className="dt-page">

      {/* ── Header ── */}
      <div className="dt-header">
        <div className="dt-eyebrow"><span className="dt-eyebrow-dot"/>Daily Task</div>
        <h1 className="dt-title">Share CubeCoin<br/><span>Earn {CUBE_REWARD} CUBE</span></h1>
          <p className="dt-sub">
          Post to your WhatsApp status, share to <strong>5 groups</strong>, and share to{" "}
          <strong>5 friends</strong>. Upload one screenshot as proof, and earn{" "}
          <strong>{CUBE_REWARD.toLocaleString()} CUBE</strong>{" "}
          <span style={{ color: "rgba(255,255,255,.5)" }}>(≈ ₦{(CUBE_REWARD * 0.05).toLocaleString()})</span> once reviewed.
        </p>
      </div>

      {/* ── Reward strip ── */}
      <div className="dt-reward-strip">
        <div className="dt-reward-item">
          <span className="dt-reward-label">Daily reward</span>
          <span className="dt-reward-val">⬡ {CUBE_REWARD.toLocaleString()} CUBE</span>
        </div>
        <div className="dt-reward-div"/>
        <div className="dt-reward-item">
          <span className="dt-reward-label">Value</span>
          <span className="dt-reward-val">₦{(CUBE_REWARD * 0.05).toLocaleString()}</span>
        </div>
        <div className="dt-reward-div"/>
        <div className="dt-reward-item">
          <span className="dt-reward-label">Monthly</span>
          <span className="dt-reward-val">~{(CUBE_REWARD * 30).toLocaleString()} CUBE</span>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════
          STEP 1 — SHARE on WhatsApp
      ═══════════════════════════════════════════════════════════════ */}
      {step !== "done" && (
        <div className="dt-card">

          {/* Step indicator */}
          <div className="dt-steps">
            <div className={`dt-step ${step === "share" || step === "upload" ? "active" : ""}`}>
              <div className={`dt-step-num ${step === "upload" ? "done" : step === "share" ? "current" : ""}`}>
                {step === "upload" ? "✓" : "1"}
              </div>
              <span>Share on WhatsApp</span>
            </div>
            <div className="dt-step-line"/>
            <div className={`dt-step ${step === "upload" ? "active" : ""}`}>
              <div className={`dt-step-num ${step === "upload" ? "current" : ""}`}>2</div>
              <span>Upload screenshot</span>
            </div>
            <div className="dt-step-line"/>
            <div className="dt-step">
              <div className="dt-step-num">3</div>
              <span>Get rewarded</span>
            </div>
          </div>

          {/* ── Step 1: Share ── */}
          {step === "share" && (
            <div className="dt-step-content">
              <div className="dt-whatsapp-section">
                <div className="dt-wa-icon">
                  <svg width="36" height="36" viewBox="0 0 24 24" fill="#25d366">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                  </svg>
                </div>
                <h3 className="dt-wa-title">Share CubeCoin on WhatsApp</h3>
                <p className="dt-wa-desc">
                  Tap the button below to open WhatsApp with a pre-written message about CubeCoin.
                  Complete all 3 shares below, then check them off and continue.
                </p>

                <a
                  href={WHATSAPP_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="dt-wa-btn"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                  </svg>
                  Open WhatsApp
                  <ExternalLink size={14}/>
                </a>

                {/* ── Share checklist ── */}
                <div className="dt-checklist">
                  <div className="dt-checklist-title">Confirm you've done all 3:</div>

                  <label className={`dt-check-row ${sharedStatus ? "checked" : ""}`}>
                    <input
                      type="checkbox"
                      checked={sharedStatus}
                      onChange={e => setSharedStatus(e.target.checked)}
                    />
                    <span className="dt-check-box">{sharedStatus && <CheckCircle size={14}/>}</span>
                    <span className="dt-check-label">
                      Posted to my <strong>WhatsApp Status</strong>
                    </span>
                  </label>

                  <label className={`dt-check-row ${sharedGroups ? "checked" : ""}`}>
                    <input
                      type="checkbox"
                      checked={sharedGroups}
                      onChange={e => setSharedGroups(e.target.checked)}
                    />
                    <span className="dt-check-box">{sharedGroups && <CheckCircle size={14}/>}</span>
                    <span className="dt-check-label">
                      Shared to <strong>5 WhatsApp groups</strong>
                    </span>
                  </label>

                  <label className={`dt-check-row ${sharedFriends ? "checked" : ""}`}>
                    <input
                      type="checkbox"
                      checked={sharedFriends}
                      onChange={e => setSharedFriends(e.target.checked)}
                    />
                    <span className="dt-check-box">{sharedFriends && <CheckCircle size={14}/>}</span>
                    <span className="dt-check-label">
                      Shared to <strong>5 friends</strong> individually
                    </span>
                  </label>
                </div>

                <button
                  className="dt-continue-btn"
                  disabled={!allSharesConfirmed}
                  onClick={() => setStep("upload")}
                >
                  {allSharesConfirmed
                    ? "Continue to upload →"
                    : `Complete all 3 to continue (${[sharedStatus, sharedGroups, sharedFriends].filter(Boolean).length}/3)`}
                </button>
              </div>
            </div>
          )}

          {/* ── Step 2: Upload screenshot ── */}
          {step === "upload" && (
            <div className="dt-step-content">
              <h3 className="dt-upload-title">Upload your screenshot</h3>
              <p className="dt-upload-desc">
                Take a screenshot showing your WhatsApp share and upload it below.
                Our admin team will review it and credit your <strong>{CUBE_REWARD} CUBE</strong> reward.
              </p>

              {/* Drop zone */}
              <div
                className={`dt-dropzone ${preview ? "has-preview" : ""}`}
                onClick={() => fileRef.current?.click()}
              >
                {preview ? (
                  <div className="dt-preview-wrap">
                    <img src={preview} alt="Screenshot preview" className="dt-preview-img"/>
                    <div className="dt-preview-overlay">
                      <Upload size={20}/>
                      <span>Change screenshot</span>
                    </div>
                  </div>
                ) : (
                  <div className="dt-dropzone-inner">
                    <div className="dt-dropzone-icon">
                      <Upload size={28}/>
                    </div>
                    <div className="dt-dropzone-title">Upload screenshot</div>
                    <div className="dt-dropzone-sub">
                      Tap to choose a file · PNG, JPG, WEBP · max 5MB
                    </div>
                  </div>
                )}
              </div>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                style={{ display: "none" }}
                onChange={handleFilePick}
              />

              {/* What the screenshot should show */}
              <div className="dt-proof-guide">
                <div className="dt-proof-guide-title">📋 What your screenshot must show:</div>
                <ul className="dt-proof-list">
                  <li>✓ Your WhatsApp Status with the CubeCoin post</li>
                  <li>✓ Evidence of sharing to at least 5 groups</li>
                  <li>✓ Evidence of sharing to at least 5 friends</li>
                  <li>✓ Today's date visible on the message</li>
                </ul>
                <div className="dt-proof-tip">
                  💡 Tip: take one combined screenshot or a short collage showing your status,
                  a group chat, and a friend chat — all in one image.
                </div>
              </div>

              {error && <div className="dt-error"><AlertCircle size={13}/> {error}</div>}

              <div className="dt-upload-actions">
                <button className="dt-back-btn" onClick={() => setStep("share")} disabled={uploading}>
                  ← Back
                </button>
                <button
                  className={`dt-submit-btn ${uploading ? "loading" : ""}`}
                  onClick={handleSubmit}
                  disabled={uploading || !screenshot}
                >
                  {uploading ? (
                    <><span className="dt-spin-ring"/>Submitting…</>
                  ) : (
                    <>Submit for review →</>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════
          DONE STATE — submitted today
      ═══════════════════════════════════════════════════════════════ */}
      {step === "done" && todayTask && (
        <div className="dt-card dt-done-card">
          <div className="dt-done-icon">
            {todayTask.status === "approved" ? "🎉" :
             todayTask.status === "rejected" ? "❌" : "⏳"}
          </div>

          <div className="dt-done-title">
            {todayTask.status === "approved" ? "Task approved!" :
             todayTask.status === "rejected" ? "Task rejected" :
             "Task submitted!"}
          </div>

           <div className="dt-done-sub">
            {todayTask.status === "approved"
              ? `${CUBE_REWARD.toLocaleString()} CUBE (₦${(CUBE_REWARD * 0.05).toLocaleString()}) has been credited to your wallet.`
              : todayTask.status === "rejected"
              ? todayTask.admin_note || "Your submission didn't meet the requirements. Try again tomorrow."
              : "Your screenshot is under review. CUBE will be credited once approved."}
          </div>

          <StatusBadge status={todayTask.status}/>

          {/* Screenshot preview */}
          {todayTask.screenshot_url && (
            <a
              href={todayTask.screenshot_url}
              target="_blank"
              rel="noopener noreferrer"
              className="dt-screenshot-thumb"
            >
              <img src={todayTask.screenshot_url} alt="Submitted screenshot"/>
              <span>View screenshot <ExternalLink size={11}/></span>
            </a>
          )}

          <div className="dt-done-date">
            Submitted on {fmtDate(todayTask.submitted_at)} · Come back tomorrow for another +{CUBE_REWARD.toLocaleString()} CUBE (₦{(CUBE_REWARD * 0.05).toLocaleString()})
          </div>

          {todayTask.status === "rejected" && (
            <div className="dt-rejection-note">
              <AlertCircle size={13}/>
              {todayTask.admin_note || "Screenshot did not match requirements."}
              <br/><small>You can try again tomorrow.</small>
            </div>
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════
          HISTORY
      ═══════════════════════════════════════════════════════════════ */}
      {history.length > 0 && (
        <div className="dt-history">
          <div className="dt-history-title">
            <span className="dt-eyebrow-dot"/>
            Your task history
          </div>
          <div className="dt-history-list">
            {history.map((row) => (
              <div key={row.id} className="dt-history-row">
                <div className="dt-history-icon">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill={row.status === "approved" ? "#25d366" : "#9ca3af"}>
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                  </svg>
                </div>
                <div className="dt-history-info">
                  <div className="dt-history-label">WhatsApp Share</div>
                  <div className="dt-history-date">{fmtDate(row.submitted_at)}</div>
                </div>
                  <div className="dt-history-right">
                  <StatusBadge status={row.status}/>
                  {row.status === "approved" && (
                    <div className="dt-history-cube">
                      +{Number(row.cube_reward).toLocaleString()} CUBE
                      <span className="dt-history-naira">₦{(Number(row.cube_reward) * 0.05).toLocaleString()}</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="dt-how-card">
        <div className="dt-how-title">How it works</div>
        <div className="dt-how-steps">
          {[
            { n:"1", icon:"📱", text:"Tap 'Open WhatsApp' — a pre-written message opens" },
            { n:"2", icon:"⭐", text:"Post the message to your WhatsApp Status" },
            { n:"3", icon:"👥", text:"Share it to 5 different WhatsApp groups" },
            { n:"4", icon:"🤝", text:"Share it to 5 friends individually" },
            { n:"5", icon:"📸", text:"Take a screenshot proving all 3 shares" },
            { n:"6", icon:"⬆",  text:"Upload the screenshot here as proof" },
            { n:"7", icon:"⬡",  text:`Admin reviews and credits ${CUBE_REWARD} CUBE to your wallet` },
          ].map(s => (
            <div key={s.n} className="dt-how-step">
              <div className="dt-how-num">{s.icon}</div>
              <div className="dt-how-text">{s.text}</div>
            </div>
          ))}
        </div>
        <div className="dt-how-note">
          ⚠️ Submissions missing any of the 3 shares (status, 5 groups, 5 friends) will be rejected.
          Make sure today's date is visible on the message.
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div className={`dt-toast ${toast.type === "error" ? "error" : ""}`}>
          {toast.msg}
        </div>
      )}
    </div>
  );
}

