import React from "react";
import Sidebar from "../../components/Sidebar/Sidebar";
import "./Cdashboardreferral.css";
import ReferralPage from "../../components/ReferralPage/ReferralPage";

const Cdashboardreferral = () => {
  return (
    <div className="dashboard-layout">
      <Sidebar />

      <main className="dashboard-content">
        <ReferralPage />
      </main>
    </div>
  );
};

export default Cdashboardreferral;
