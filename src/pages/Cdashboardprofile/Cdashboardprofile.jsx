import React from "react";
import Sidebar from "../../components/Sidebar/Sidebar";
import "./Cdashboardprofile.css";
import ProfileSettings from "../../components/ProfileSettings/ProfileSettings";

const Cdashboardprofile = () => {
  return (
    <div className="dashboard-layout">
      <Sidebar />

      <main className="dashboard-content">
        <ProfileSettings />
      </main>
    </div>
  );
};

export default Cdashboardprofile;
