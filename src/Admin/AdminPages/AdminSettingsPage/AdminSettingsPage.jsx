import React from 'react'
import "./AdminSettingsPage.css"
import AdminSidebar from '../../AdminComponents/Adminsidebar/Adminsidebar'
import AdminSettings from '../../AdminComponents/AdminSettings/AdminSettings';

const AdminSettingsPage = () => {
  return (
      <div className="dashboard-layout">
        <AdminSidebar />
  
        <main className="dashboard-content">
            <AdminSettings />
        </main>
      </div>
    );
}

export default AdminSettingsPage
