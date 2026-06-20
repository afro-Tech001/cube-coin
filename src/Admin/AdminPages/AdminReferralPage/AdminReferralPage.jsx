import React from 'react'
import "./AdminReferralPage.css"
import AdminSidebar from '../../AdminComponents/Adminsidebar/Adminsidebar'
import AdminReferrals from '../../AdminComponents/AdminReferral/AdminReferral';

const AdminReferralPage = () => {
  return (
      <div className="dashboard-layout">
        <AdminSidebar />
  
        <main className="dashboard-content">
            <AdminReferrals />
        </main>
      </div>
    );
}

export default AdminReferralPage
