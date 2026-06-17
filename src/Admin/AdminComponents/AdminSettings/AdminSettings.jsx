import { useState } from "react";
import "./AdminSettings.css";

export default function AdminSettings() {
  const [settings, setSettings] = useState({
    appName: "Cube Coin",
    miningRate: 0.02,
    cubeRate: 5,
    minWithdrawal: 1000,
    referralBonus: 10,
    supportEmail: "support@cubecoin.com",
    maintenanceMode: false,
    registrationOpen: true,
  });

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;

    setSettings({
      ...settings,
      [name]:
        type === "checkbox"
          ? checked
          : value,
    });
  };

  const saveSettings = () => {
    alert("Settings Saved Successfully");
  };

  return (
    <div className="admin-settings">

      <div className="settings-header">
        <h1>Admin Settings</h1>
        <p>
          Manage Cube Coin platform settings
        </p>
      </div>

      <div className="settings-card">

        <div className="setting-group">
          <label>App Name</label>
          <input
            type="text"
            name="appName"
            value={settings.appName}
            onChange={handleChange}
          />
        </div>

        <div className="setting-group">
          <label>
            Mining Rate (per sec)
          </label>
          <input
            type="number"
            name="miningRate"
            value={settings.miningRate}
            onChange={handleChange}
          />
        </div>

        <div className="setting-group">
          <label>
            Cube → Naira Rate
          </label>
          <input
            type="number"
            name="cubeRate"
            value={settings.cubeRate}
            onChange={handleChange}
          />
        </div>

        <div className="setting-group">
          <label>
            Minimum Withdrawal
          </label>
          <input
            type="number"
            name="minWithdrawal"
            value={settings.minWithdrawal}
            onChange={handleChange}
          />
        </div>

        <div className="setting-group">
          <label>
            Referral Bonus (%)
          </label>
          <input
            type="number"
            name="referralBonus"
            value={settings.referralBonus}
            onChange={handleChange}
          />
        </div>

        <div className="setting-group">
          <label>
            Support Email
          </label>
          <input
            type="email"
            name="supportEmail"
            value={settings.supportEmail}
            onChange={handleChange}
          />
        </div>

        <div className="toggle-row">

          <div className="toggle-item">
            <span>
              Maintenance Mode
            </span>

            <input
              type="checkbox"
              name="maintenanceMode"
              checked={settings.maintenanceMode}
              onChange={handleChange}
            />
          </div>

          <div className="toggle-item">
            <span>
              Registration Open
            </span>

            <input
              type="checkbox"
              name="registrationOpen"
              checked={settings.registrationOpen}
              onChange={handleChange}
            />
          </div>

        </div>

        <button
          className="save-settings-btn"
          onClick={saveSettings}
        >
          Save Settings
        </button>

      </div>

    </div>
  );
}