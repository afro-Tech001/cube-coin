import { useEffect, useState } from "react";
import { supabase } from "../../../libs/supabase";
import {
  Search,
  Eye,
  Wallet,
  UserX,
} from "lucide-react";
import CubeIcon from "../../../assets/cubecoin-robot-green.png"

import "./AdminUsers.css";

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  const [selectedUser, setSelectedUser] =
    useState(null);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", {
          ascending: false,
        });

      setUsers(data || []);
    } catch (err) {
      console.log(err);
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = users.filter(
    (user) =>
      user.full_name
        ?.toLowerCase()
        .includes(search.toLowerCase()) ||
      user.email
        ?.toLowerCase()
        .includes(search.toLowerCase())
  );

  const toggleStatus = async (user) => {
    const newStatus =
      user.subscription_status === "active"
        ? "suspended"
        : "active";

    await supabase
      .from("profiles")
      .update({
        subscription_status: newStatus,
      })
      .eq("id", user.id);

    fetchUsers();
  };

  if (loading) {
    return (
      <div className="users-loading">
        Loading Users...
      </div>
    );
  }

  return (
    <div className="admin-users">

      <div className="users-header">
        <div>
          <h1>Users Management</h1>
          <p>
            Manage all Cube Coin users
          </p>
        </div>

        <div className="users-count">
          {users.length} Users
        </div>
      </div>

      <div className="users-toolbar">
        <div className="search-box">
          <Search size={18} />

          <input
            type="text"
            placeholder="Search user..."
            value={search}
            onChange={(e) =>
              setSearch(e.target.value)
            }
          />
        </div>
      </div>

      <div className="users-table-card">

        <table>

          <thead>
            <tr>
              <th>User</th>
              <th>Balance</th>
              <th>Mined</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>

          <tbody>

            {filteredUsers.map((user) => (
              <tr key={user.id}>

                <td>
                  <div className="user-info">

                    <img
                      src={
                        user.avatar_url ||
                         CubeIcon
                      }
                      alt=""
                      className="user-avatar"
                    />

                    <div>
                      <h4>
                        {user.full_name}
                      </h4>

                      <p>
                        {user.email}
                      </p>
                    </div>

                  </div>
                </td>

                <td>
                  {Number(
                    user.cube_balance || 0
                  ).toFixed(2)}
                </td>

                <td>
                  {Number(
                    user.total_mined || 0
                  ).toFixed(2)}
                </td>

                <td>
                  <span
                    className={`status-badge ${
                      user.subscription_status ===
                      "active"
                        ? "active"
                        : "suspended"
                    }`}
                  >
                    {
                      user.subscription_status
                    }
                  </span>
                </td>

                <td>

                  <div className="action-buttons">

                    <button
                      className="view-btn"
                      onClick={() =>
                        setSelectedUser(user)
                      }
                    >
                      <Eye size={18} />
                    </button>

                    <button
                      className="wallet-btn"
                    >
                      <Wallet size={18} />
                    </button>

                    <button
                      className="suspend-btn"
                      onClick={() =>
                        toggleStatus(user)
                      }
                    >
                      <UserX size={18} />
                    </button>

                  </div>

                </td>

              </tr>
            ))}

          </tbody>

        </table>

      </div>

      {selectedUser && (
        <div
          className="admin-modal-overlay"
          onClick={() =>
            setSelectedUser(null)
          }
        >
          <div
            className="admin-modal"
            onClick={(e) =>
              e.stopPropagation()
            }
          >
            <h2>User Details</h2>

            <p>
              <strong>Name:</strong>{" "}
              {selectedUser.full_name}
            </p>

            <p>
              <strong>Email:</strong>{" "}
              {selectedUser.email}
            </p>

            <p>
              <strong>Balance:</strong>{" "}
              {
                selectedUser.cube_balance
              }{" "}
              CUBE
            </p>

            <p>
              <strong>Total Mined:</strong>{" "}
              {
                selectedUser.total_mined
              }
            </p>

            <p>
              <strong>Joined:</strong>{" "}
              {new Date(
                selectedUser.created_at
              ).toLocaleDateString()}
            </p>

            <button
              className="modal-close"
              onClick={() =>
                setSelectedUser(null)
              }
            >
              Close
            </button>
          </div>
        </div>
      )}

    </div>
  );
}