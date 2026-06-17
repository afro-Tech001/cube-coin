import React from 'react'
import "./AdminMiningPage.css"
import AdminSidebar from '../../AdminComponents/Adminsidebar/Adminsidebar'
import AdminMiningSessions from '../../AdminComponents/AdminMiningSessions/AdminMiningSessions';

const AdminMiningPage = () => {
  return (
      <div className="dashboard-layout">
        <AdminSidebar />
  
        <main className="dashboard-content">
            <AdminMiningSessions />
        </main>
      </div>
    );
}

export default AdminMiningPage
