import React from "react";
import Sidebar from "../../components/Sidebar/Sidebar";
import "./CdashboardHome.css";
import DashboardHome from "./DashboardHome";

const CdashboardHome = () => {
  return (
    <div className="dashboard-layout">
      <Sidebar />

      <main className="dashboard-content">
        <DashboardHome />
      </main>
    </div>
  );
};

export default CdashboardHome;
