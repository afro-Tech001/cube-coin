import React from 'react'
import "./AdminPlanPage.css"
import AdminSidebar from '../../AdminComponents/Adminsidebar/Adminsidebar'
import AdminPlans from '../../AdminComponents/AdminPlans/AdminPlans'

const AdminPlanPage = () => {
  return (
      <div className="dashboard-layout">
        <AdminSidebar />
  
        <main className="dashboard-content">
            <AdminPlans/>
        </main>
      </div>
    );
}

export default AdminPlanPage
