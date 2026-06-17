import React from 'react'
import "./AdminUserPage.css"
import AdminSidebar from '../../AdminComponents/Adminsidebar/Adminsidebar'
import AdminUsers from '../../AdminComponents/AdminUsers/AdminUsers';

const AdminUserPage = () => {
  return (
      <div className="dashboard-layout">
        <AdminSidebar />
  
        <main className="dashboard-content">
            <AdminUsers />
        </main>
      </div>
    );
}

export default AdminUserPage
