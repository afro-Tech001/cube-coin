import { useState, useEffect, useRef } from "react";
import "./HelpButton.css";

const FAQS = [
  {
    category: "Mining",
    icon: "⛏️",
    items: [
      {
        q: "How do I start mining?",
        a: "Go to the Mine page from the sidebar and click 'Start Mining'. Your plan determines your mining rate. You earn CUBE automatically while mining is active.",
      },
      {
        q: "Why has my mining stopped?",
        a: "Mining sessions expire after your plan's session duration. Simply visit the Mine page and start a new session. Make sure your subscription is active.",
      },
      {
        q: "How fast do I earn CUBE?",
        a: "Rates depend on your plan — Starter earns 0.08 CUBE/hr up to Diamond at 1.40 CUBE/hr. The longer you mine without interruption, the more your streak bonus adds up.",
      },
      {
        q: "What is a mining streak?",
        a: "Mining every day builds your streak counter. Streak milestones unlock bonus CUBE rewards on the Rewards page.",
      },
    ],
  },
  {
    category: "Wallet & Cash Out",
    icon: "💰",
    items: [
      {
        q: "How do I cash out my CUBE?",
        a: "Go to the Wallet page, enter your bank details, select the amount, and submit. Admin reviews and pays out within 1–24 hours.",
      },
      {
        q: "What is the CUBE to Naira rate?",
        a: "100 CUBE = ₦5. So 1,000 CUBE = ₦50, and 10,000 CUBE = ₦500.",
      },
      {
        q: "Why is my cashout still pending?",
        a: "Cashouts are reviewed manually by the admin team. Approvals happen within 24 hours on business days. You'll see it update on the Wallet page.",
      },
      {
        q: "Is there a minimum cashout?",
        a: "Yes — the minimum cashout is 1,000 CUBE (₦50). Make sure your balance covers the amount before requesting.",
      },
    ],
  },
  {
    category: "Subscription",
    icon: "📋",
    items: [
      {
        q: "How do I subscribe to a plan?",
        a: "Go to the Subscription page, pick a plan, and follow the 3-step process — view plan details, make the bank transfer, then upload your payment receipt.",
      },
      {
        q: "My subscription shows Pending — what next?",
        a: "Admin manually verifies receipts. Approval usually takes 1–3 hours. You'll be redirected automatically once approved.",
      },
      {
        q: "Do I get CUBE when I subscribe?",
        a: "Yes! Each plan awards bonus CUBE on activation: Starter gets 50K, Bronze 100K, Silver 200K, Gold 400K, Diamond 1M CUBE.",
      },
      {
        q: "Can I upgrade my plan?",
        a: "Contact support via this help center. Upgrades are handled manually by the admin team.",
      },
    ],
  },
  {
    category: "Referrals & Rewards",
    icon: "🎁",
    items: [
      {
        q: "How do I earn from referrals?",
        a: "Share your unique referral code. You earn 50 CUBE when someone signs up using your code, plus milestone bonuses at 5, 10, 25, and 50 referrals.",
      },
      {
        q: "Where do I find my referral code?",
        a: "Go to the Referrals page in the sidebar. Your code is shown at the top with a copy button.",
      },
      {
        q: "How does the daily spin work?",
        a: "You get one free spin every day on the Rewards page. Prizes include CUBE, airtime, and data. Airtime/data prizes are fulfilled by the admin within 24 hours.",
      },
      {
        q: "My referral isn't showing — why?",
        a: "Make sure the person used your code during signup (not after). If you believe there's an error, contact support.",
      },
    ],
  },
];

const CONTACT_OPTIONS = [
  { icon: "📧", label: "Email support", value: "support@cubecoin.ng", href: "mailto:support@cubecoin.ng" },
  { icon: "💬", label: "WhatsApp", value: "Chat with us", href: "https://wa.me/2348000000000" },
];

export default function HelpButton() {
  const [open,       setOpen]       = useState(false);
  const [activeTab,  setActiveTab]  = useState("faq");     // faq | contact
  const [activeCat,  setActiveCat]  = useState(0);
  const [openItem,   setOpenItem]   = useState(null);       // "catIdx-itemIdx"
  const [search,     setSearch]     = useState("");
  const [visible,    setVisible]    = useState(false);      // controls animation state
  const modalRef = useRef(null);
  const inputRef = useRef(null);

  // Open / close animation
  useEffect(() => {
    if (open) {
      setTimeout(() => setVisible(true), 10);
      setTimeout(() => inputRef.current?.focus(), 120);
    } else {
      setVisible(false);
    }
  }, [open]);

  // Close on Escape
  useEffect(() => {
    const handler = (e) => { if (e.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  // Click outside to close
  useEffect(() => {
    const handler = (e) => {
      if (open && modalRef.current && !modalRef.current.contains(e.target)) {
        const btn = document.getElementById("hb-trigger");
        if (btn && btn.contains(e.target)) return;
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  // Flat search across all categories
  const searchResults = search.trim()
    ? FAQS.flatMap((cat, ci) =>
        cat.items
          .filter(
            (item) =>
              item.q.toLowerCase().includes(search.toLowerCase()) ||
              item.a.toLowerCase().includes(search.toLowerCase())
          )
          .map((item) => ({ ...item, catLabel: cat.category, catIcon: cat.icon, key: `${ci}` }))
      )
    : [];

  const toggleItem = (key) => setOpenItem((prev) => (prev === key ? null : key));

  return (
    <>
      {/* ── Floating trigger button ── */}
      <button
        id="hb-trigger"
        className={`hb-trigger ${open ? "hb-trigger-active" : ""}`}
        onClick={() => setOpen((o) => !o)}
        aria-label="Help & support"
        title="Help center"
      >
        {open ? (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
            <line x1="18" y1="6" x2="6" y2="18"/>
            <line x1="6"  y1="6" x2="18" y2="18"/>
          </svg>
        ) : (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/>
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="17" x2="12.01" y2="17"/>
          </svg>
        )}
        <span className="hb-trigger-label">Help</span>
      </button>

      {/* ── Modal panel ── */}
      {open && (
        <div className={`hb-modal ${visible ? "hb-modal-in" : "hb-modal-out"}`} ref={modalRef} role="dialog" aria-label="Help center">

          {/* Header */}
          <div className="hb-modal-header">
            <div className="hb-modal-title-row">
              <div className="hb-modal-cube-icon" aria-hidden="true">⬡</div>
              <div>
                <div className="hb-modal-title">CubeCoin Help Center</div>
                <div className="hb-modal-sub">How can we help you?</div>
              </div>
              <button className="hb-close-btn" onClick={() => setOpen(false)} aria-label="Close help">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                  <line x1="18" y1="6" x2="6" y2="18"/>
                  <line x1="6"  y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>

            {/* Search */}
            <div className="hb-search-wrap">
              <svg className="hb-search-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <circle cx="11" cy="11" r="8"/>
                <line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
              <input
                ref={inputRef}
                className="hb-search"
                placeholder="Search for answers…"
                value={search}
                onChange={(e) => { setSearch(e.target.value); setActiveTab("faq"); }}
              />
              {search && (
                <button className="hb-search-clear" onClick={() => setSearch("")} aria-label="Clear">✕</button>
              )}
            </div>

            {/* Tabs (hidden during search) */}
            {!search && (
              <div className="hb-tabs">
                <button className={`hb-tab ${activeTab === "faq" ? "active" : ""}`} onClick={() => setActiveTab("faq")}>
                  FAQs
                </button>
                <button className={`hb-tab ${activeTab === "contact" ? "active" : ""}`} onClick={() => setActiveTab("contact")}>
                  Contact us
                </button>
              </div>
            )}
          </div>

          {/* Body */}
          <div className="hb-modal-body">

            {/* ── Search results ── */}
            {search && (
              <div className="hb-search-results">
                {searchResults.length === 0 ? (
                  <div className="hb-empty">
                    <div className="hb-empty-icon">🔍</div>
                    <div className="hb-empty-title">No results for "{search}"</div>
                    <div className="hb-empty-sub">Try different keywords or browse the FAQ categories</div>
                    <button className="hb-empty-clear" onClick={() => setSearch("")}>Browse all FAQs</button>
                  </div>
                ) : (
                  <>
                    <div className="hb-results-label">{searchResults.length} result{searchResults.length !== 1 ? "s" : ""}</div>
                    {searchResults.map((item, i) => {
                      const key = `search-${i}`;
                      const isOpen = openItem === key;
                      return (
                        <div key={key} className="hb-faq-item">
                          <button className={`hb-faq-q ${isOpen ? "open" : ""}`} onClick={() => toggleItem(key)}>
                            <span className="hb-cat-badge">{item.catIcon} {item.catLabel}</span>
                            <span className="hb-faq-q-text">{item.q}</span>
                            <svg className={`hb-chevron ${isOpen ? "rotated" : ""}`} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                              <polyline points="6 9 12 15 18 9"/>
                            </svg>
                          </button>
                          {isOpen && <div className="hb-faq-a">{item.a}</div>}
                        </div>
                      );
                    })}
                  </>
                )}
              </div>
            )}

            {/* ── FAQ tab ── */}
            {!search && activeTab === "faq" && (
              <div className="hb-faq-layout">
                {/* Category sidebar */}
                <div className="hb-cat-sidebar">
                  {FAQS.map((cat, ci) => (
                    <button
                      key={ci}
                      className={`hb-cat-btn ${activeCat === ci ? "active" : ""}`}
                      onClick={() => { setActiveCat(ci); setOpenItem(null); }}
                    >
                      <span className="hb-cat-icon">{cat.icon}</span>
                      <span>{cat.category}</span>
                    </button>
                  ))}
                </div>

                {/* FAQ accordion */}
                <div className="hb-faq-list">
                  <div className="hb-faq-cat-label">
                    {FAQS[activeCat].icon} {FAQS[activeCat].category}
                  </div>
                  {FAQS[activeCat].items.map((item, ii) => {
                    const key = `${activeCat}-${ii}`;
                    const isOpen = openItem === key;
                    return (
                      <div key={key} className="hb-faq-item">
                        <button
                          className={`hb-faq-q ${isOpen ? "open" : ""}`}
                          onClick={() => toggleItem(key)}
                        >
                          <span className="hb-faq-q-text">{item.q}</span>
                          <svg className={`hb-chevron ${isOpen ? "rotated" : ""}`} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                            <polyline points="6 9 12 15 18 9"/>
                          </svg>
                        </button>
                        <div className={`hb-faq-a-wrap ${isOpen ? "open" : ""}`}>
                          <div className="hb-faq-a">{item.a}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ── Contact tab ── */}
            {!search && activeTab === "contact" && (
              <div className="hb-contact">
                <div className="hb-contact-header">
                  <div className="hb-contact-avatar">⬡</div>
                  <div className="hb-contact-title">Reach the CubeCoin team</div>
                  <div className="hb-contact-sub">We typically respond within a few hours</div>
                </div>

                <div className="hb-contact-options">
                  {CONTACT_OPTIONS.map((opt) => (
                    <a key={opt.label} href={opt.href} className="hb-contact-card" target="_blank" rel="noopener noreferrer">
                      <div className="hb-contact-card-icon">{opt.icon}</div>
                      <div>
                        <div className="hb-contact-card-label">{opt.label}</div>
                        <div className="hb-contact-card-val">{opt.value}</div>
                      </div>
                      <svg className="hb-contact-arr" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                        <line x1="5" y1="12" x2="19" y2="12"/>
                        <polyline points="12 5 19 12 12 19"/>
                      </svg>
                    </a>
                  ))}
                </div>

                <div className="hb-hours">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                  Support hours: Mon–Sat, 8 am – 8 pm WAT
                </div>
              </div>
            )}

          </div>

          {/* Footer */}
          <div className="hb-modal-footer">
            <span>CubeCoin Support</span>
            <button className="hb-footer-contact" onClick={() => { setActiveTab("contact"); setSearch(""); }}>
              Contact us →
            </button>
          </div>
        </div>
      )}
    </>
  );
}