import React from "react";
import Sidebar from "../../components/Sidebar/Sidebar";
import "./CdashboardDaily.css";
import DailyTasksPage from "../../components/DailyTasksPage/DailyTasksPage";

const CdashboardDaily = () => {
  return (
    <div className="dashboard-layout">
      <Sidebar />

      <main className="dashboard-content">
        <DailyTasksPage />
      </main>
    </div>
  );
};

export default CdashboardDaily;
