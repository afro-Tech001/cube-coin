import React from "react";
import Sidebar from "../../components/Sidebar/Sidebar";
import "./Cdashboardmining.css";
import MiningPage from "../../components/MiningPage/MiningPage";

const Cdashboardmining = () => {
  return (
    <div className="dashboard-layout">
      <Sidebar />

      <main className="dashboard-content">
        <MiningPage />
      </main>
    </div>
  );
};

export default Cdashboardmining;
