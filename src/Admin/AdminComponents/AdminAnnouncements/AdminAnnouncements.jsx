import { useState, useEffect } from "react";
import { Megaphone, Image, Send, Trash2, AlertCircle, Loader2 } from "lucide-react";
import { supabase } from "../../../libs/supabase";
import AnnouncementModal from "./AnnouncementModal";
import "./AdminAnnouncements.css";

export default function AdminAnnouncements() {
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);

  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState(null);

  // Modal state
  const [modalAnnouncement, setModalAnnouncement] = useState(null);

  // ── Fetch all announcements (admin sees all, not just active) ──────────────
  const fetchAnnouncements = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: fetchError } = await supabase
        .from("announcements")
        .select("*")
        .order("created_at", { ascending: false });

      if (fetchError) throw fetchError;
      setAnnouncements(data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  // ── Upload image to Supabase Storage ──────────────────────────────────────
  const uploadImage = async (file) => {
    const ext = file.name.split(".").pop();
    const fileName = `${Date.now()}.${ext}`;
    const { error: uploadError } = await supabase.storage
      .from("announcements")
      .upload(fileName, file, { upsert: false });

    if (uploadError) throw uploadError;

    const { data } = supabase.storage
      .from("announcements")
      .getPublicUrl(fileName);

    return data.publicUrl;
  };

  // ── Handle image selection ─────────────────────────────────────────────────
  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  // ── Publish announcement ───────────────────────────────────────────────────
  const publishAnnouncement = async () => {
    if (!title.trim() || !message.trim()) return;
    setPublishing(true);
    setError(null);

    try {
      let image_url = null;

      if (imageFile) {
        image_url = await uploadImage(imageFile);
      }

      const { data: userData } = await supabase.auth.getUser();
      const adminEmail = userData?.user?.email || null;

      const { error: insertError } = await supabase
        .from("announcements")
        .insert({
          title: title.trim(),
          message: message.trim(),
          image_url,
          is_active: true,
          created_by: adminEmail,
        });

      if (insertError) throw insertError;

      setTitle("");
      setMessage("");
      setImageFile(null);
      setImagePreview(null);
      await fetchAnnouncements();
    } catch (err) {
      setError(err.message);
    } finally {
      setPublishing(false);
    }
  };

  // ── Toggle active/inactive ─────────────────────────────────────────────────
  const toggleActive = async (id, currentState) => {
    const { error: updateError } = await supabase
      .from("announcements")
      .update({ is_active: !currentState })
      .eq("id", id);

    if (updateError) {
      setError(updateError.message);
      return;
    }
    setAnnouncements((prev) =>
      prev.map((a) => (a.id === id ? { ...a, is_active: !currentState } : a))
    );
  };

  // ── Delete announcement ────────────────────────────────────────────────────
  const deleteAnnouncement = async (id) => {
    if (!window.confirm("Delete this announcement? This cannot be undone.")) return;
    const { error: deleteError } = await supabase
      .from("announcements")
      .delete()
      .eq("id", id);

    if (deleteError) {
      setError(deleteError.message);
      return;
    }
    setAnnouncements((prev) => prev.filter((a) => a.id !== id));
  };

  const formatDate = (ts) =>
    new Date(ts).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });

  return (
    <div className="admin-announcements">
      <div className="announcement-header">
        <h1>Announcements</h1>
        <p>Publish updates to all Cube Coin users</p>
      </div>

      {error && (
        <div className="error-banner">
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      {/* ── CREATE FORM ── */}
      <div className="announcement-form">
        <div className="form-header">
          <Megaphone size={22} />
          <h2>Create Announcement</h2>
        </div>

        <input
          type="text"
          placeholder="Announcement title..."
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />

        <textarea
          rows="6"
          placeholder="Write announcement..."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
        />

        <label className="upload-box">
          <Image size={20} />
          <span>Upload Banner Image</span>
          <input
            type="file"
            accept="image/*"
            hidden
            onChange={handleImageChange}
          />
        </label>

        {imagePreview && (
          <div className="image-preview-wrapper">
            <img src={imagePreview} alt="Preview" className="image-preview" />
            <button
              className="remove-image-btn"
              onClick={() => { setImageFile(null); setImagePreview(null); }}
            >
              Remove
            </button>
          </div>
        )}

        <button
          className="publish-btn"
          onClick={publishAnnouncement}
          disabled={publishing || !title.trim() || !message.trim()}
        >
          {publishing ? <Loader2 size={18} className="spin" /> : <Send size={18} />}
          {publishing ? "Publishing..." : "Publish Announcement"}
        </button>
      </div>

      {/* ── HISTORY ── */}
      <div className="announcement-history">
        <h2>Published Announcements</h2>

        {loading ? (
          <div className="loading-state">
            <Loader2 size={24} className="spin" />
            <span>Loading announcements…</span>
          </div>
        ) : announcements.length === 0 ? (
          <div className="empty-state">No announcements yet. Create one above.</div>
        ) : (
          announcements.map((item) => (
            <div
              className={`announcement-card ${!item.is_active ? "inactive" : ""}`}
              key={item.id}
            >
              <div className="announcement-top">
                <div className="announcement-meta">
                  <h3>{item.title}</h3>
                  <span>{formatDate(item.created_at)}</span>
                  {item.created_by && (
                    <span className="created-by">by {item.created_by}</span>
                  )}
                </div>
                <div className="announcement-actions">
                  <button
                    className={`toggle-btn ${item.is_active ? "active" : "inactive"}`}
                    onClick={() => toggleActive(item.id, item.is_active)}
                    title={item.is_active ? "Deactivate" : "Activate"}
                  >
                    {item.is_active ? "Active" : "Inactive"}
                  </button>
                  <button
                    className="preview-btn"
                    onClick={() => setModalAnnouncement(item)}
                    title="Preview"
                  >
                    Preview
                  </button>
                  <button
                    className="delete-btn"
                    onClick={() => deleteAnnouncement(item.id)}
                    title="Delete"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              <p className="announcement-message">{item.message}</p>

              {item.image_url && (
                <img
                  src={item.image_url}
                  alt="Banner"
                  className="announcement-banner"
                />
              )}
            </div>
          ))
        )}
      </div>

      {/* ── MODAL ── */}
      {modalAnnouncement && (
        <AnnouncementModal
          announcement={modalAnnouncement}
          onClose={() => setModalAnnouncement(null)}
        />
      )}
    </div>
  );
}