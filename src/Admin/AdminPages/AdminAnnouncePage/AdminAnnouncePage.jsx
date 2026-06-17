import React from 'react'
import "./AdminAnnouncePage.css"
import AdminSidebar from '../../AdminComponents/Adminsidebar/Adminsidebar' 
import AdminAnnouncements from '../../AdminComponents/AdminAnnouncements/AdminAnnouncements';

const AdminAnnouncePage = () => {
  return (
      <div className="dashboard-layout">
        <AdminSidebar />
  
        <main className="dashboard-content">
            <AdminAnnouncements />
        </main>
      </div>
    );
}

export default AdminAnnouncePage
