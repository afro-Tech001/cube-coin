import React from "react";
import Sidebar from "../../components/Sidebar/Sidebar";
import "./CdashboardUpgrade.css";
import UpgradePlan from "../../components/UpgradePlan/UpgradePlan";

const CdashboardUpgrade = () => {
  return (
    <div className="dashboard-layout">
      <Sidebar />

      <main className="dashboard-content">
        <UpgradePlan />
      </main>
    </div>
  );
};

export default CdashboardUpgrade;
