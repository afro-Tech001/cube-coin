import React from 'react'
import "./AdminDailyTasksPage.css"
import AdminSidebar from '../../AdminComponents/Adminsidebar/Adminsidebar' 
import AdminDailyTasks from '../../AdminComponents/AdminDailyTasks/AdminDailyTasks';

const AdminDailyTasksPage = () => {
  return (
      <div className="dashboard-layout">
        <AdminSidebar />
  
        <main className="dashboard-content">
            <AdminDailyTasks />
        </main>
      </div>
    );
}

export default AdminDailyTasksPage
