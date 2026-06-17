import React from "react";
import Sidebar from "../../components/Sidebar/Sidebar";
import "./CdashboardStreak.css";
import StreakPage from "../../components/StreakPage/StreakPage";

const CdashboardStreak = () => {
  return (
    <div className="dashboard-layout">
      <Sidebar />

      <main className="dashboard-content">
        <StreakPage />
      </main>
    </div>
  );
};

export default CdashboardStreak;
