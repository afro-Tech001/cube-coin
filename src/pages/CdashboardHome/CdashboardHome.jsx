import React from "react";
import Sidebar from "../../components/Sidebar/Sidebar";
import "./CdashboardHome.css";
import DashboardHome from "./DashboardHome";
import Whatsappfab from "../../components/Whatsappfab/Whatsappfab";

const CdashboardHome = () => {
  return (
    <div className="dashboard-layout">
      <Sidebar />

      <main className="dashboard-content">
        <DashboardHome />
        <Whatsappfab />
      </main>
    </div>
  );
};

export default CdashboardHome;
