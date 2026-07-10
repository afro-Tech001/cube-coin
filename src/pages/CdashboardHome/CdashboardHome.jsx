import React from "react";
import Sidebar from "../../components/Sidebar/Sidebar";
import "./CdashboardHome.css";
import DashboardHome from "./DashboardHome";
import WhatsAppFAB from "../../components/Whatsappfab/Whatsappfab";

const CdashboardHome = () => {
  return (
    <div className="dashboard-layout">
      <Sidebar />

      <main className="dashboard-content">
        <DashboardHome />
        <WhatsAppFAB />
      </main>
    </div>
  );
};

export default CdashboardHome;
