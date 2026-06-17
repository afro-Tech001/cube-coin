import React from 'react'
import "./Admindashboard.css"
import AdminSidebar from '../../AdminComponents/Adminsidebar/Adminsidebar'
import AdminDashboard from '../../AdminComponents/AdminDashboard/AdminDashboard';

const Admindashboard = () => {
  return (
      <div className="dashboard-layout">
        <AdminSidebar />
  
        <main className="dashboard-content">
            <AdminDashboard />
        </main>
      </div>
    );
}

export default Admindashboard
