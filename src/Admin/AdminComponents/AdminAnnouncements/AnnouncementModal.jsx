import { useEffect, useState, useRef } from "react";
import { X, Megaphone } from "lucide-react";
import { supabase } from "../../../libs/supabase";
import "./AnnouncementModal.css";

export default function AnnouncementModal({ announcement, userId, onClose }) {
  const [current, setCurrent] = useState(announcement || null);
  const [visible, setVisible] = useState(!!announcement);
  const [exiting, setExiting] = useState(false);

  const didFetch   = useRef(false);  // prevent double fetch
  const isClosing  = useRef(false);  // prevent double close

  // ── Fetch oldest unseen announcement (user mode only) ────────────────────
  useEffect(() => {
    if (announcement || !userId || didFetch.current) return;
    didFetch.current = true;

    (async () => {
      const { data: seenRows } = await supabase
        .from("seen_announcements")
        .select("announcement_id")
        .eq("user_id", userId);

      const seenIds = (seenRows || []).map((r) => r.announcement_id);

      let query = supabase
        .from("announcements")
        .select("*")
        .eq("is_active", true)
        .order("created_at", { ascending: true })
        .limit(1);

      if (seenIds.length > 0) {
        query = query.not("id", "in", `(${seenIds.join(",")})`);
      }

      const { data } = await query;
      if (data && data.length > 0) {
        setCurrent(data[0]);
        setVisible(true);
      }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  // ── Close: animate out → mark seen → unmount ────────────────────────────
  const handleClose = async () => {
    if (isClosing.current) return;  // hard guard — ref never goes stale
    isClosing.current = true;

    setExiting(true);                             // start CSS exit animation
    await new Promise((r) => setTimeout(r, 280)); // wait for animation

    // Mark seen (user mode only)
    if (!announcement && userId && current?.id) {
      await supabase
        .from("seen_announcements")
        .upsert(
          { user_id: userId, announcement_id: current.id },
          { onConflict: "user_id,announcement_id" }
        );
    }

    setVisible(false);
    onClose?.();
  };

  if (!visible || !current) return null;

  const formatDate = (ts) =>
    new Date(ts).toLocaleDateString("en-GB", {
      day: "numeric", month: "short", year: "numeric",
    });

  return (
    <div className={`ann-overlay ${exiting ? "ann-overlay--out" : ""}`}>
      <div
        className={`ann-modal ${exiting ? "ann-modal--out" : ""}`}
        role="dialog"
        aria-modal="true"
      >
        {/* Close X */}
        <button className="ann-close" onClick={handleClose} aria-label="Close">
          <X size={18} />
        </button>

        {/* Banner */}
        {current.image_url && (
          <div className="ann-banner">
            <img src={current.image_url} alt={current.title} />
          </div>
        )}

        {/* Body */}
        <div className="ann-body">
          <div className="ann-tag-row">
            <span className="ann-tag-icon"><Megaphone size={16} /></span>
            <span className="ann-tag-label">Announcement</span>
          </div>

          <h2 className="ann-title">{current.title}</h2>
          <p className="ann-date">{formatDate(current.created_at)}</p>
          <p className="ann-message">{current.message}</p>

          <button className="ann-got-it" onClick={handleClose}>
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}