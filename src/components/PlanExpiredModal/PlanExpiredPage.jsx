import { useEffect, useState } from "react";
import PlanExpiredModal from "./PlanExpiredModal";

export default function PlanExpiredPage() {
  const [info, setInfo] = useState({ planName: null, expiredAt: null });

  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem("cubecoin_expired") || "{}");
      setInfo(stored);
    } catch {}
  }, []);

  // Modal is always open on this page — it's the whole page
  return (
    <div style={{ minHeight:"100vh", background:"#050b07" }}>
      <PlanExpiredModal
        planName={info.planName}
        expiredAt={info.expiredAt}
      />
    </div>
  );
}