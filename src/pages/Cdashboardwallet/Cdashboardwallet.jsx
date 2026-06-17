import React from "react";
import Sidebar from "../../components/Sidebar/Sidebar";
import "./Cdashboardwallet.css";
import WalletPage from "../../components/WalletPage/WalletPage";

const Cdashboardwallet = () => {
  return (
    <div className="dashboard-layout">
      <Sidebar />

      <main className="dashboard-content">
        <WalletPage />
      </main>
    </div>
  );
};

export default Cdashboardwallet;
