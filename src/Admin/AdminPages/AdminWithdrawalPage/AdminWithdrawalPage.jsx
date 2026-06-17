import React from 'react'
import "./AdminWithdrawalPage.css"
import AdminSidebar from '../../AdminComponents/Adminsidebar/Adminsidebar'
import AdminWithdrawals from '../../AdminComponents/AdminWithdrawals/AdminWithdrawals';

const AdminWithdrawalPage = () => {
  return (
      <div className="dashboard-layout">
        <AdminSidebar />
  
        <main className="dashboard-content">
            <AdminWithdrawals />
        </main>
      </div>
    );
}

export default AdminWithdrawalPage
