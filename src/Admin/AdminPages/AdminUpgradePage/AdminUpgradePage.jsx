import React from 'react'
import "./AdminUpgradePage.css"
import AdminSidebar from '../../AdminComponents/Adminsidebar/Adminsidebar'
import AdminUpgrades from "../../AdminComponents/AdminUpgrades/AdminUpgrades";
const AdminUpgradePage = () => {
  return (
      <div className="dashboard-layout">
        <AdminSidebar />
  
        <main className="dashboard-content">
            <AdminUpgrades />
        </main>
      </div>
    );
}

export default AdminUpgradePage
