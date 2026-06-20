import "./AdminDashboard.css";
import { useEffect, useState } from "react";
import { supabase } from "../../../libs/supabase";

export default function AdminDashboard() {
  const [loading, setLoading] = useState(true);

  const [stats, setStats] = useState({
    totalUsers: 0,
    activeMiners: 0,
    totalCube: 0,
    revenue: 0,
    referrals: 0,
  });

  const [newUsers, setNewUsers] = useState([]);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);

      // TOTAL USERS
      const { count: totalUsers } = await supabase
        .from("profiles")
        .select("*", {
          count: "exact",
          head: true,
        });

      // ACTIVE MINERS
      const { count: activeMiners } = await supabase
        .from("mining_sessions")
        .select("*", {
          count: "exact",
          head: true,
        })
        .eq("is_mining", true);

      // TOTAL REFERRALS — count profiles that were referred by someone
      // (referred_by_code is the column that's actually populated at signup)
      const { count: referrals } = await supabase
        .from("profiles")
        .select("*", {
          count: "exact",
          head: true,
        })
        .not("referred_by_code", "is", null);

      // TOTAL CUBE MINED
      const { data: minedData } = await supabase
        .from("profiles")
        .select("total_mined");

      const totalCube =
        minedData?.reduce(
          (sum, user) =>
            sum + Number(user.total_mined || 0),
          0
        ) || 0;

      // TOTAL REVENUE
      const { data: revenueData } = await supabase
        .from("subscriptions")
        .select("amount")
        .eq("payment_status", "approved");

      const revenue =
        revenueData?.reduce(
          (sum, item) =>
            sum + Number(item.amount || 0),
          0
        ) || 0;

      // NEWEST USERS — referral_code lives directly on profiles now,
      // no need for a per-user subscriptions lookup
      const { data: users } = await supabase
        .from("profiles")
        .select(`
          id,
          full_name,
          referral_code,
          created_at
        `)
        .order("created_at", { ascending: false })
        .limit(10);

      if (users) {
        setNewUsers(
          users.map((user) => ({
            ...user,
            referralCode: user.referral_code || "No Code",
          }))
        );
      }

      setStats({
        totalUsers,
        activeMiners,
        totalCube,
        revenue,
        referrals,
      });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="admin-loading">
        Loading Dashboard...
      </div>
    );
  }

  const statCards = [
    {
      title: "Total Users",
      value: stats.totalUsers,
      icon: "👥",
    },
    {
      title: "Active Miners",
      value: stats.activeMiners,
      icon: "⛏️",
    },
    {
      title: "Total CUBE",
      value: stats.totalCube.toFixed(2),
      icon: "🪙",
    },
    {
      title: "Revenue",
      value: `₦${stats.revenue.toLocaleString()}`,
      icon: "📈",
    },
    {
      title: "Referrals",
      value: stats.referrals,
      icon: "🎁",
    },
  ];

  return (
    <div className="admin-dashboard">

      <div className="admin-header">
        <h1>Cube Coin Command Center</h1>
        <p>
          Monitor users, mining activity
          and platform growth.
        </p>
      </div>

      <div className="admin-stats-grid">
        {statCards.map((item) => (
          <div
            key={item.title}
            className="admin-stat-card"
          >
            <div className="admin-stat-icon">
              {item.icon}
            </div>

            <h2>{item.value}</h2>

            <span>{item.title}</span>
          </div>
        ))}
      </div>

      <div className="admin-table-card">
        <h3>Newest Users</h3>

        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Referral Code</th>
              <th>Date</th>
            </tr>
          </thead>

          <tbody>
            {newUsers.map((user) => (
              <tr key={user.id}>
                <td>
                  {user.full_name ||
                    "Unknown User"}
                </td>

                <td>
                  {user.referralCode}
                </td>

                <td>
                  {new Date(
                    user.created_at
                  ).toLocaleDateString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

    </div>
  );
}