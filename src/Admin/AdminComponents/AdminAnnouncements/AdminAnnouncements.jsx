import { useState } from "react";
import {
  Megaphone,
  Image,
  Send,
  Trash2,
} from "lucide-react";

import "./AdminAnnouncements.css";

export default function AdminAnnouncements() {
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [image, setImage] = useState(null);

  const [announcements, setAnnouncements] =
    useState([
      {
        id: 1,
        title: "Mining Boost Weekend",
        message:
          "All users receive 2x mining rewards this weekend.",
        date: "8 Jun 2026",
      },
    ]);

  const publishAnnouncement = () => {
    if (!title || !message) return;

    const newAnnouncement = {
      id: Date.now(),
      title,
      message,
      image,
      date: new Date().toLocaleDateString(),
    };

    setAnnouncements([
      newAnnouncement,
      ...announcements,
    ]);

    setTitle("");
    setMessage("");
    setImage(null);
  };

  return (
    <div className="admin-announcements">

      <div className="announcement-header">
        <h1>Announcements</h1>
        <p>
          Publish updates to all Cube Coin users
        </p>
      </div>

      {/* CREATE */}

      <div className="announcement-form">

        <div className="form-header">
          <Megaphone size={22} />
          <h2>Create Announcement</h2>
        </div>

        <input
          type="text"
          placeholder="Announcement title..."
          value={title}
          onChange={(e) =>
            setTitle(e.target.value)
          }
        />

        <textarea
          rows="6"
          placeholder="Write announcement..."
          value={message}
          onChange={(e) =>
            setMessage(e.target.value)
          }
        />

        <label className="upload-box">

          <Image size={20} />

          <span>
            Upload Banner Image
          </span>

          <input
            type="file"
            accept="image/*"
            hidden
            onChange={(e) =>
              setImage(
                e.target.files?.[0]?.name
              )
            }
          />

        </label>

        {image && (
          <div className="selected-image">
            {image}
          </div>
        )}

        <button
          className="publish-btn"
          onClick={publishAnnouncement}
        >
          <Send size={18} />
          Publish Announcement
        </button>

      </div>

      {/* HISTORY */}

      <div className="announcement-history">

        <h2>
          Published Announcements
        </h2>

        {announcements.map((item) => (
          <div
            className="announcement-card"
            key={item.id}
          >

            <div className="announcement-top">

              <div>
                <h3>{item.title}</h3>
                <span>{item.date}</span>
              </div>

              <button className="delete-btn">
                <Trash2 size={16} />
              </button>

            </div>

            <p>{item.message}</p>

            {item.image && (
              <div className="image-badge">
                📷 {item.image}
              </div>
            )}

          </div>
        ))}

      </div>

    </div>
  );
}