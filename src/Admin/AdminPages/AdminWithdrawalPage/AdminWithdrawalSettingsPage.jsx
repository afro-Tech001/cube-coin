import React from 'react'
import "./AdminWithdrawalPage.css"
import AdminSidebar from '../../AdminComponents/Adminsidebar/Adminsidebar'
import AdminWithdrawalSettings from '../../AdminComponents/AdminWithdrawals/AdminWithdrawalSettings';

const AdminWithdrawalSettingsPage = () => {
  return (
      <div className="dashboard-layout">
        <AdminSidebar />
  
        <main className="dashboard-content">
            <AdminWithdrawalSettings />
        </main>
      </div>
    );
}

export default AdminWithdrawalSettingsPage
