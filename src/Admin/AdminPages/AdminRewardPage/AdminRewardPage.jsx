import React from 'react'
import "./AdminRewardPage.css"
import AdminSidebar from '../../AdminComponents/Adminsidebar/Adminsidebar'
import AdminRewards from '../../AdminComponents/AdminRewards/AdminRewards';

const AdminRewardPage = () => {
  return (
      <div className="dashboard-layout">
        <AdminSidebar />
  
        <main className="dashboard-content">
            <AdminRewards />
        </main>
      </div>
    );
}

export default AdminRewardPage
