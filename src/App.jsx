import React, { useState, useEffect} from "react";
import { Route, Routes } from "react-router-dom";
import Auth from "./components/Auth/Auth";
import SubscriptionPage from "./components/Subscriptionpage/Subscriptionpage";
import CdashboardHome from "./pages/CdashboardHome/CdashboardHome";
import Cdashboardmining from "./pages/Cdashboardmining/Cdashboardmining";
import Cdashboardreward from "./pages/Cdashboardreward/Cdashboardreward";
import Cdashboardreferral from "./pages/Cdashboardreferral/Cdashboardreferral";
import CdashboardStreak from "./pages/CdashboardStreak/CdashboardStreak";
import Cdashboardwallet from "./pages/Cdashboardwallet/Cdashboardwallet";
import Cdashboardprofile from "./pages/Cdashboardprofile/Cdashboardprofile";
import Loader from "./components/Loader/Loader";
import Admindashboard from "./Admin/AdminPages/Admindashboard/Admindashboard";
import AdminUserPage from "./Admin/AdminPages/AdminUserPage/AdminUserPage";
import AdminMiningPage from "./Admin/AdminPages/AdminMiningPage/AdminMiningPage";
import AdminWithdrawalPage from "./Admin/AdminPages/AdminWithdrawalPage/AdminWithdrawalPage";
import AdminSettingsPage from "./Admin/AdminPages/AdminSettingsPage/AdminSettingsPage";
import AdminAnnouncePage from "./Admin/AdminPages/AdminAnnouncePage/AdminAnnouncePage";
import ProtectedRoute from "./components/ProtectedRoute/ProtectedRoute";
import AdminSubscriptionsPage from "./Admin/AdminPages/AdminSubscriptionsPage/AdminSubscriptionsPage";
import SubscriptionStatus from "./components/Subscriptionpage/SubscriptionStatus";
import ProfileSetup from "./components/Subscriptionpage/Profilesetup";
import AdminReferralPage from "./Admin/AdminPages/AdminReferralPage/AdminReferralPage";
import AdminPlanPage from "./Admin/AdminPages/AdminPlanPage/AdminPlanPage";
import CdashboardSpinWheel from "./pages/CdashboardSpinWheel/CdashboardSpinWheel";
import AdminRewardPage from "./Admin/AdminPages/AdminRewardPage/AdminRewardPage";
function App() {

  const [loading, setLoading] = useState(true);

  useEffect(() => {

    const timer = setTimeout(() => {
      setLoading(false);
    }, 3000);

    return () => clearTimeout(timer);

  }, []);

  if (loading) {
    return <Loader />;
  }

  return (
    <Routes>
      <Route path="/" element={<Auth />} />
      <Route path="/subscription" element={<ProtectedRoute><SubscriptionPage /></ProtectedRoute>} />
      <Route path="/subscription-status" element={<ProtectedRoute><SubscriptionStatus /></ProtectedRoute>} />
      <Route path="/profile-setup" element={<ProtectedRoute><ProfileSetup /></ProtectedRoute>} />
      <Route path="/dashboard" element={<ProtectedRoute><CdashboardHome /></ProtectedRoute>} />
      <Route path="/mining" element={<ProtectedRoute><Cdashboardmining /></ProtectedRoute>} />
      <Route path="/rewards" element={<ProtectedRoute><Cdashboardreward /></ProtectedRoute>} />
      <Route path="/referrals" element={<ProtectedRoute><Cdashboardreferral /></ProtectedRoute>} />
      <Route path="/streaks" element={<ProtectedRoute><CdashboardStreak /></ProtectedRoute>} />
      <Route path="/wallet" element={<ProtectedRoute><Cdashboardwallet /></ProtectedRoute>} />
      <Route path="/profilesettings" element={<ProtectedRoute><Cdashboardprofile /></ProtectedRoute>} />
      <Route path="/spinwheel" element={<ProtectedRoute><CdashboardSpinWheel /></ProtectedRoute>} />

      {/* Admin Routes */}
      <Route path="/admin/dashboard" element={<ProtectedRoute><Admindashboard /></ProtectedRoute>} />
      <Route path="/admin/users" element={<ProtectedRoute><AdminUserPage /></ProtectedRoute>} />
      <Route path="/admin/mining" element={<ProtectedRoute><AdminMiningPage /></ProtectedRoute>} />
      <Route path="/admin/subscription" element={<ProtectedRoute><AdminSubscriptionsPage /></ProtectedRoute>} />
      <Route path="/admin/referal" element={<ProtectedRoute><AdminReferralPage /></ProtectedRoute>} />
      <Route path="/admin/plans" element={<ProtectedRoute><AdminPlanPage /></ProtectedRoute>} />
      <Route path="/admin/withdrawals" element={<ProtectedRoute><AdminWithdrawalPage /></ProtectedRoute>} />
      <Route path="/admin/settings" element={<ProtectedRoute><AdminSettingsPage /></ProtectedRoute>} />
      <Route path="/admin/announcements" element={<ProtectedRoute><AdminAnnouncePage /></ProtectedRoute>} />
      <Route path="/admin/reward" element={<ProtectedRoute><AdminRewardPage /></ProtectedRoute>} />
    </Routes>
  );
}

export default App;

