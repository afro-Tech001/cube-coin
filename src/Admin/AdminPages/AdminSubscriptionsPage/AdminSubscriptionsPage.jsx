import React from 'react'
import "./AdminSubscriptionsPage.css"
import AdminSidebar from '../../AdminComponents/Adminsidebar/Adminsidebar'
import AdminSubscriptions from '../../AdminComponents/AdminSubscriptions/AdminSubscriptions';

const AdminSubscriptionsPage = () => {
  return (
      <div className="dashboard-layout">
        <AdminSidebar />
  
        <main className="dashboard-content">
            <AdminSubscriptions />
        </main>
      </div>
    );
}

export default AdminSubscriptionsPage
