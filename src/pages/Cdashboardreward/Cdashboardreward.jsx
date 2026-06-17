import React from "react";
import Sidebar from "../../components/Sidebar/Sidebar";
import "./Cdashboardreward.css";
import RewardsPage from "../../components/RewardPage/RewardsPage";

const Cdashboardreward = () => {
  return (
    <div className="dashboard-layout">
      <Sidebar />

      <main className="dashboard-content">
        <RewardsPage />
      </main>
    </div>
  );
};

export default Cdashboardreward;
