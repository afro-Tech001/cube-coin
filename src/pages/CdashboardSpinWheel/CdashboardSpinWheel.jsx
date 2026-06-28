import React from "react";
import Sidebar from "../../components/Sidebar/Sidebar";
import "./CdashboardSpinWheel.css";
import SpinWheelPage from "../../components/SpinWheelPage/SpinWheelPage";

const CdashboardSpinWheel= () => {
  return (
    <div className="dashboard-layout">
      <Sidebar />

      <main className="dashboard-content">
        <SpinWheelPage />
      </main>
    </div>
  );
};

export default CdashboardSpinWheel;
